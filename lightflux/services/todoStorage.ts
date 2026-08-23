import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  DEFAULT_HIDDEN_NAVIGATION_ITEM_IDS,
  INBOX_PROJECT_ID,
  NAVIGATION_ITEM_IDS,
  OPTIONAL_NAVIGATION_ITEM_IDS,
  Language,
  Milestone,
  MilestoneDateRule,
  MilestoneType,
  NavigationItemId,
  OptionalNavigationItemId,
  PersistedAppState,
  Project,
  TaskEvent,
  TaskEventType,
  Todo,
  SolarMilestoneDateRule,
} from '../types/todo';
import { todayKey } from '../utils/date';
import {
  isValidMilestoneDateRule,
  isValidMilestoneStartYear,
  normalizeReminderOffsets,
} from '../utils/milestoneDate';
import {
  emptyRichTextDocument,
  isRichTextDocument,
} from '../utils/richText';
import {
  appStatesEqual,
  deriveStateUpdatedAt,
  mergeConcurrentAppStates,
} from './appStateMerge';
import {
  isRemoteAuthConfigured,
  loadRemoteAppState,
  RemoteAppStateConflictError,
  RemoteAppStateSnapshot,
  saveRemoteAppState,
} from './authApi';
import {
  deleteWebState,
  loadWebState,
  saveWebState,
} from './indexedDbStorage';

const STORAGE_KEY = 'lightflux.app-state.v12';
const SYNC_METADATA_KEY = 'lightflux.sync-metadata.v12';
const stateFile = () =>
  new File(Paths.document, 'lightflux-state-v12.json');
const syncMetadataFile = () =>
  new File(Paths.document, 'lightflux-sync-metadata-v12.json');
const legacyStateFile = () =>
  new File(Paths.document, 'lightflux-state.json');
const legacySyncMetadataFile = () =>
  new File(Paths.document, 'lightflux-sync-metadata.json');

const normalizeNavigationOrder = (value: unknown): NavigationItemId[] => {
  const saved = Array.isArray(value)
    ? value.filter(
        (item): item is NavigationItemId =>
          typeof item === 'string' &&
          NAVIGATION_ITEM_IDS.includes(item as NavigationItemId),
      )
    : [];
  const unique = [...new Set(saved)];
  return [
    ...unique,
    ...NAVIGATION_ITEM_IDS.filter((item) => !unique.includes(item)),
  ];
};

const normalizeHiddenNavigationItems = (
  value: unknown,
): OptionalNavigationItemId[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (item): item is OptionalNavigationItemId =>
              typeof item === 'string' &&
              OPTIONAL_NAVIGATION_ITEM_IDS.includes(
                item as OptionalNavigationItemId,
              ),
          ),
        ),
      ]
    : [];

const normalizeTodo = (value: unknown, fallbackOrder: number): Todo | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const todo = value as Partial<Todo>;
  if (
    typeof todo.id !== 'string' ||
    typeof todo.title !== 'string' ||
    typeof todo.completed !== 'boolean' ||
    typeof todo.createdAt !== 'number'
  ) {
    return null;
  }

  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    completedAt:
      typeof todo.completedAt === 'number'
        ? todo.completedAt
        : todo.completed
          ? typeof todo.updatedAt === 'number'
            ? todo.updatedAt
            : todo.createdAt
          : null,
    createdAt: todo.createdAt,
    updatedAt:
      typeof todo.updatedAt === 'number' ? todo.updatedAt : todo.createdAt,
    scheduledDate:
      typeof todo.scheduledDate === 'string'
        ? todo.scheduledDate
        : todayKey(),
    projectId:
      typeof todo.projectId === 'string'
        ? todo.projectId
        : INBOX_PROJECT_ID,
    milestoneId:
      typeof todo.milestoneId === 'string' ? todo.milestoneId : null,
    parentId: typeof todo.parentId === 'string' ? todo.parentId : null,
    priority:
      todo.priority === 'high' ||
      todo.priority === 'medium' ||
      todo.priority === 'low'
        ? todo.priority
        : 'none',
    sortOrder:
      typeof todo.sortOrder === 'number' ? todo.sortOrder : fallbackOrder,
    trashedAt:
      typeof todo.trashedAt === 'number' ? todo.trashedAt : null,
    content: isRichTextDocument(todo.content)
      ? todo.content
      : emptyRichTextDocument(),
  };
};

const MILESTONE_TYPES = new Set<MilestoneType>([
  'anniversary',
  'countdown',
  'birthday',
  'holiday',
  'custom',
]);
const TASK_EVENT_TYPES = new Set<TaskEventType>([
  'created',
  'completed',
  'reopened',
  'rescheduled',
  'trashed',
  'restored',
]);
const TASK_EVENT_ORDER: Record<TaskEventType, number> = {
  created: 0,
  rescheduled: 1,
  completed: 2,
  reopened: 2,
  trashed: 3,
  restored: 3,
};

const normalizeTaskEvent = (value: unknown): TaskEvent | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const event = value as Partial<TaskEvent>;
  if (
    typeof event.id !== 'string' ||
    typeof event.taskId !== 'string' ||
    !TASK_EVENT_TYPES.has(event.type as TaskEventType) ||
    typeof event.occurredAt !== 'number' ||
    !Number.isFinite(event.occurredAt) ||
    event.occurredAt < 0
  ) {
    return null;
  }
  const metadata =
    event.metadata && typeof event.metadata === 'object'
      ? {
          ...(typeof event.metadata.scheduledDate === 'string'
            ? { scheduledDate: event.metadata.scheduledDate }
            : {}),
          ...(typeof event.metadata.previousScheduledDate === 'string'
            ? {
                previousScheduledDate:
                  event.metadata.previousScheduledDate,
              }
            : {}),
          ...(event.metadata.migrated === true ? { migrated: true } : {}),
        }
      : undefined;
  return {
    id: event.id,
    taskId: event.taskId,
    type: event.type as TaskEventType,
    occurredAt: event.occurredAt,
    ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
};

const normalizeDateRule = (value: unknown): MilestoneDateRule | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const rule = value as Partial<MilestoneDateRule>;
  if (rule.calendar !== 'solar' && rule.calendar !== 'lunar') {
    return null;
  }
  const year =
    rule.year === null
      ? null
      : typeof rule.year === 'number'
        ? rule.year
        : null;
  const month = typeof rule.month === 'number' ? rule.month : 1;
  const day = typeof rule.day === 'number' ? rule.day : 1;
  const normalized: MilestoneDateRule =
    rule.calendar === 'lunar'
      ? {
          calendar: 'lunar',
          year,
          month,
          day,
          isLeapMonth: rule.isLeapMonth === true,
          missingLeapMonthPolicy:
            rule.missingLeapMonthPolicy === 'skip-year'
              ? 'skip-year'
              : 'regular-month',
        }
      : {
          calendar: 'solar',
          year,
          month,
          day,
          leapDayPolicy:
            (rule as Partial<SolarMilestoneDateRule>).leapDayPolicy ===
            'mar-1'
              ? 'mar-1'
              : 'feb-28',
        };
  return isValidMilestoneDateRule(normalized) ? normalized : null;
};

const normalizeMilestone = (value: unknown): Milestone | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const milestone = value as Partial<Milestone>;
  const dateRule = normalizeDateRule(milestone.dateRule);
  if (
    typeof milestone.id !== 'string' ||
    typeof milestone.title !== 'string' ||
    !milestone.title.trim() ||
    !dateRule ||
    typeof milestone.createdAt !== 'number'
  ) {
    return null;
  }
  return {
    id: milestone.id,
    title: milestone.title.trim(),
    type: MILESTONE_TYPES.has(milestone.type as MilestoneType)
      ? (milestone.type as MilestoneType)
      : 'custom',
    dateRule,
    startYear:
      typeof milestone.startYear === 'number' &&
      isValidMilestoneStartYear(milestone.startYear)
        ? milestone.startYear
        : null,
    reminderOffsets: normalizeReminderOffsets(
      Array.isArray(milestone.reminderOffsets)
        ? milestone.reminderOffsets
        : [],
    ),
    notes: typeof milestone.notes === 'string' ? milestone.notes : '',
    icon:
      typeof milestone.icon === 'string'
        ? milestone.icon
        : 'sparkles-outline',
    color:
      typeof milestone.color === 'string' &&
      /^#[0-9a-f]{6}$/i.test(milestone.color)
        ? milestone.color
        : '#8B7EFF',
    pinned: milestone.pinned === true,
    archivedAt:
      typeof milestone.archivedAt === 'number'
        ? milestone.archivedAt
        : null,
    trashedAt:
      typeof milestone.trashedAt === 'number' ? milestone.trashedAt : null,
    createdAt: milestone.createdAt,
    updatedAt:
      typeof milestone.updatedAt === 'number'
        ? milestone.updatedAt
        : milestone.createdAt,
    revision:
      typeof milestone.revision === 'number' &&
      Number.isInteger(milestone.revision) &&
      milestone.revision > 0
        ? milestone.revision
        : 1,
  };
};

const normalizeProject = (
  value: unknown,
  fallbackOrder: number,
): Project | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const project = value as Partial<Project>;
  if (
    typeof project.id === 'string' &&
    typeof project.name === 'string' &&
    typeof project.color === 'string' &&
    typeof project.createdAt === 'number'
  ) {
    return {
      id: project.id,
      name: project.name,
      color: project.color,
      createdAt: project.createdAt,
      kind:
        project.kind === 'inbox' || project.id === INBOX_PROJECT_ID
          ? 'inbox'
          : 'standard',
      sortOrder:
        typeof project.sortOrder === 'number'
          ? project.sortOrder
          : fallbackOrder,
    };
  }

  return null;
};

export const parsePersistedAppState = (
  rawState: string,
  now = Date.now(),
): PersistedAppState | null => {
  try {
    const parsed = JSON.parse(rawState) as Partial<PersistedAppState>;
    if (
      parsed.schemaVersion !== 12 ||
      !Array.isArray(parsed.todos) ||
      !Array.isArray(parsed.projects)
    ) {
      return null;
    }

    const language = parsed.language === 'en' ? 'en' : 'zh';
    const migrationTimestamp =
      typeof parsed.updatedAt === 'number' &&
      Number.isFinite(parsed.updatedAt) &&
      parsed.updatedAt >= 0
        ? parsed.updatedAt
        : now;
    const normalizedProjects = parsed.projects
      .map((project, index) => normalizeProject(project, index + 1))
      .filter((project): project is Project => project !== null);
    const inboxProject =
      normalizedProjects.find((project) => project.kind === 'inbox') ?? {
        id: INBOX_PROJECT_ID,
        name: language === 'en' ? 'Inbox' : '收件箱',
        color: '#8B7EFF',
        createdAt: migrationTimestamp,
        kind: 'inbox' as const,
        sortOrder: 0,
      };
    const projects = [
      inboxProject,
      ...normalizedProjects
        .filter((project) => project.id !== inboxProject.id)
        .map((project) => ({ ...project, kind: 'standard' as const })),
    ];
    const projectIds = new Set(projects.map((project) => project.id));
    const todos = parsed.todos
      .map((todo, index) => normalizeTodo(todo, index))
      .filter((todo): todo is Todo => todo !== null)
      .map((todo) =>
        projectIds.has(todo.projectId)
          ? todo
          : { ...todo, projectId: inboxProject.id },
      );
    const milestones = Array.isArray(parsed.milestones)
      ? parsed.milestones
          .map(normalizeMilestone)
          .filter(
            (milestone): milestone is Milestone => milestone !== null,
          )
      : [];
    const milestoneIds = new Set(
      milestones.map((milestone) => milestone.id),
    );
    const todosWithMilestones = todos.map((todo) =>
      todo.milestoneId !== null && !milestoneIds.has(todo.milestoneId)
        ? { ...todo, milestoneId: null }
        : todo,
    );
    const taskIds = new Set(todosWithMilestones.map((todo) => todo.id));
    const normalizedEvents = Array.isArray(parsed.taskEvents)
      ? parsed.taskEvents
          .map(normalizeTaskEvent)
          .filter(
            (event): event is TaskEvent =>
              event !== null && taskIds.has(event.taskId),
          )
      : [];
    const taskEvents = Array.from(
      new Map(
        normalizedEvents.map((event) => [event.id, event]),
      ).values(),
    ).sort(
      (a, b) =>
        a.occurredAt - b.occurredAt ||
        TASK_EVENT_ORDER[a.type] - TASK_EVENT_ORDER[b.type] ||
        a.id.localeCompare(b.id),
    );
    const analyticsStartedAt =
      typeof parsed.analyticsStartedAt === 'number' &&
      Number.isFinite(parsed.analyticsStartedAt) &&
      parsed.analyticsStartedAt >= 0
        ? parsed.analyticsStartedAt
        : now;
    const hiddenNavigationItems = Array.isArray(
      parsed.hiddenNavigationItems,
    )
      ? normalizeHiddenNavigationItems(parsed.hiddenNavigationItems)
      : [...DEFAULT_HIDDEN_NAVIGATION_ITEM_IDS];

    return {
      schemaVersion: 12,
      updatedAt: deriveStateUpdatedAt(
        todosWithMilestones,
        projects,
        milestones,
        parsed.updatedAt,
      ),
      language,
      analyticsStartedAt,
      navigationOrder: normalizeNavigationOrder(parsed.navigationOrder),
      hiddenNavigationItems,
      todos: todosWithMilestones,
      projects,
      milestones,
      taskEvents,
    };
  } catch {
    return null;
  }
};

interface SyncMetadata {
  baseState: PersistedAppState | null;
  ownerId: string;
  revision: number;
}

let syncMetadataCache: SyncMetadata | null | undefined;
let activeRemoteOwnerId: string | null = null;
let remoteSyncEnabled = false;
let remoteSaveQueue: Promise<void> = Promise.resolve();
let deviceWriteGeneration = 0;

const emptyAppState = (language: Language = 'zh'): PersistedAppState => {
  const timestamp = Date.now();
  return {
    schemaVersion: 12,
    updatedAt: timestamp,
    analyticsStartedAt: timestamp,
    language,
    navigationOrder: [...NAVIGATION_ITEM_IDS],
    hiddenNavigationItems: [...DEFAULT_HIDDEN_NAVIGATION_ITEM_IDS],
    todos: [],
    projects: [
      {
        id: INBOX_PROJECT_ID,
        name: language === 'en' ? 'Inbox' : '收件箱',
        color: '#8B7EFF',
        createdAt: timestamp,
        kind: 'inbox',
        sortOrder: 0,
      },
    ],
    milestones: [],
    taskEvents: [],
  };
};

const loadDeviceState = async (): Promise<PersistedAppState | null> => {
  if (Platform.OS === 'web') {
    await Promise.all([
      deleteWebState('current'),
      deleteWebState('lightflux.app-state.v1'),
      deleteWebState('lightflux.sync-metadata.v1'),
    ]);
    const rawState = await loadWebState(STORAGE_KEY);
    return rawState ? parsePersistedAppState(rawState) : null;
  }

  const oldFile = legacyStateFile();
  if (oldFile.exists) {
    oldFile.delete();
  }
  const oldSyncFile = legacySyncMetadataFile();
  if (oldSyncFile.exists) {
    oldSyncFile.delete();
  }
  const file = stateFile();
  if (!file.exists) {
    return null;
  }

  return parsePersistedAppState(await file.text());
};

const saveDeviceState = async (
  state: PersistedAppState,
): Promise<void> => {
  const serializedState = JSON.stringify(state);

  if (Platform.OS === 'web') {
    await saveWebState(STORAGE_KEY, serializedState);
    return;
  }

  stateFile().write(serializedState);
};

const parseSyncMetadata = (rawValue: string): SyncMetadata | null => {
  try {
    const value = JSON.parse(rawValue) as Partial<SyncMetadata>;
    const baseState =
      value.baseState === null
        ? null
        : parsePersistedAppState(JSON.stringify(value.baseState));
    if (
      typeof value.ownerId !== 'string' ||
      !value.ownerId ||
      !Number.isSafeInteger(value.revision) ||
      (value.revision ?? -1) < 0 ||
      (value.baseState !== null && !baseState)
    ) {
      return null;
    }
    return {
      baseState,
      ownerId: value.ownerId,
      revision: value.revision as number,
    };
  } catch {
    return null;
  }
};

const loadSyncMetadata = async (): Promise<SyncMetadata | null> => {
  if (syncMetadataCache !== undefined) {
    return syncMetadataCache;
  }
  let rawValue: string | null = null;
  if (Platform.OS === 'web') {
    await deleteWebState('lightflux.sync-metadata.v1');
    rawValue = await loadWebState(SYNC_METADATA_KEY);
  } else {
    const oldFile = legacySyncMetadataFile();
    if (oldFile.exists) {
      oldFile.delete();
    }
    const file = syncMetadataFile();
    rawValue = file.exists ? await file.text() : null;
  }
  syncMetadataCache = rawValue ? parseSyncMetadata(rawValue) : null;
  return syncMetadataCache;
};

const saveSyncMetadata = async (
  metadata: SyncMetadata,
): Promise<void> => {
  syncMetadataCache = metadata;
  const serializedMetadata = JSON.stringify(metadata);
  if (Platform.OS === 'web') {
    await saveWebState(SYNC_METADATA_KEY, serializedMetadata);
    return;
  }
  syncMetadataFile().write(serializedMetadata);
};

const normalizedRemoteState = (
  snapshot: RemoteAppStateSnapshot,
): PersistedAppState | null => {
  if (snapshot.state === null) {
    return null;
  }
  const state = parsePersistedAppState(JSON.stringify(snapshot.state));
  if (!state) {
    throw new Error('The cloud returned an invalid app state.');
  }
  return state;
};

const candidateForSnapshot = (
  localState: PersistedAppState | null,
  snapshot: RemoteAppStateSnapshot,
  metadata: SyncMetadata | null,
): PersistedAppState => {
  const remoteState = normalizedRemoteState(snapshot);
  if (metadata?.ownerId && metadata.ownerId !== snapshot.ownerId) {
    return remoteState ?? emptyAppState(localState?.language);
  }
  if (!localState) {
    return remoteState ?? emptyAppState();
  }
  if (!remoteState) {
    return localState;
  }
  if (appStatesEqual(localState, remoteState)) {
    return remoteState;
  }
  const baseState =
    metadata?.ownerId === snapshot.ownerId ? metadata.baseState : null;
  if (baseState && appStatesEqual(localState, baseState)) {
    return remoteState;
  }
  if (baseState && appStatesEqual(remoteState, baseState)) {
    return localState;
  }
  return mergeConcurrentAppStates(baseState, localState, remoteState);
};

const commitCandidate = async (
  candidate: PersistedAppState,
  initialSnapshot: RemoteAppStateSnapshot,
  initialBaseState: PersistedAppState | null,
): Promise<PersistedAppState> => {
  let snapshot = initialSnapshot;
  let baseState = initialBaseState;
  let nextState = candidate;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const remoteState = normalizedRemoteState(snapshot);
    if (remoteState && appStatesEqual(nextState, remoteState)) {
      await saveSyncMetadata({
        baseState: remoteState,
        ownerId: snapshot.ownerId,
        revision: snapshot.revision,
      });
      return remoteState;
    }
    try {
      const revision = await saveRemoteAppState(
        nextState,
        snapshot.revision,
      );
      await saveSyncMetadata({
        baseState: nextState,
        ownerId: snapshot.ownerId,
        revision,
      });
      return nextState;
    } catch (error) {
      if (!(error instanceof RemoteAppStateConflictError)) {
        throw error;
      }
      const conflictSnapshot = {
        ...error.snapshot,
        ownerId: error.snapshot.ownerId || snapshot.ownerId,
      };
      const conflictState = normalizedRemoteState(conflictSnapshot);
      if (conflictSnapshot.ownerId !== snapshot.ownerId) {
        nextState =
          conflictState ?? emptyAppState(nextState.language);
        baseState = null;
      } else if (conflictState) {
        nextState = mergeConcurrentAppStates(
          remoteState ?? baseState,
          nextState,
          conflictState,
        );
        baseState = conflictState;
      }
      snapshot = conflictSnapshot;
    }
  }

  throw new Error('Unable to synchronize after repeated cloud conflicts.');
};

export const synchronizeAppState = async (
  localState: PersistedAppState | null,
  options: { requireRemoteSession?: boolean } = {},
): Promise<PersistedAppState | null> => {
  if (!isRemoteAuthConfigured) {
    return localState;
  }
  const snapshot = await loadRemoteAppState();
  if (!snapshot) {
    activeRemoteOwnerId = null;
    if (options.requireRemoteSession) {
      throw new Error('An authenticated cloud session is required.');
    }
    return localState;
  }
  activeRemoteOwnerId = snapshot.ownerId;
  remoteSyncEnabled = true;
  const metadata = await loadSyncMetadata();
  const candidate = candidateForSnapshot(localState, snapshot, metadata);
  const baseState =
    metadata?.ownerId === snapshot.ownerId ? metadata.baseState : null;
  const synchronized = await commitCandidate(
    candidate,
    snapshot,
    baseState,
  );
  await saveDeviceState(synchronized);
  return synchronized;
};

const saveRemoteKnownState = async (
  state: PersistedAppState,
): Promise<PersistedAppState> => {
  if (!activeRemoteOwnerId) {
    return state;
  }
  const metadata = await loadSyncMetadata();
  if (
    !metadata ||
    metadata.ownerId !== activeRemoteOwnerId
  ) {
    return (await synchronizeAppState(state)) ?? state;
  }

  try {
    const revision = await saveRemoteAppState(state, metadata.revision);
    await saveSyncMetadata({
      baseState: state,
      ownerId: metadata.ownerId,
      revision,
    });
    return state;
  } catch (error) {
    if (!(error instanceof RemoteAppStateConflictError)) {
      throw error;
    }
    const snapshot = {
      ...error.snapshot,
      ownerId: error.snapshot.ownerId || metadata.ownerId,
    };
    const remoteState = normalizedRemoteState(snapshot);
    const candidate = remoteState
      ? mergeConcurrentAppStates(metadata.baseState, state, remoteState)
      : state;
    return commitCandidate(candidate, snapshot, metadata.baseState);
  }
};

export const resetRemoteSyncContext = (): void => {
  activeRemoteOwnerId = null;
  remoteSyncEnabled = false;
};

export const loadAppState = async (): Promise<PersistedAppState | null> => {
  const deviceState = await loadDeviceState();
  if (!isRemoteAuthConfigured || !remoteSyncEnabled) {
    return deviceState;
  }

  try {
    return await synchronizeAppState(deviceState);
  } catch (error) {
    console.warn('Unable to load cloud data; using the local cache.', error);
    return deviceState;
  }
};

export const saveAppState = async (
  state: PersistedAppState,
): Promise<PersistedAppState> => {
  const writeGeneration = ++deviceWriteGeneration;
  await saveDeviceState(state);
  if (!isRemoteAuthConfigured || !remoteSyncEnabled) {
    return state;
  }

  const queuedSave = remoteSaveQueue.then(() => saveRemoteKnownState(state));
  remoteSaveQueue = queuedSave.then(
    () => undefined,
    () => undefined,
  );
  const synchronized = await queuedSave;
  if (writeGeneration === deviceWriteGeneration) {
    await saveDeviceState(synchronized);
  }
  return synchronized;
};
