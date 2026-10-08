import { File, Paths } from 'expo-file-system';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { Platform } from 'react-native';

import {
  DEFAULT_HIDDEN_NAVIGATION_ITEM_IDS,
  INBOX_PROJECT_ID,
  NAVIGATION_ITEM_IDS,
  OPTIONAL_NAVIGATION_ITEM_IDS,
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
import { isTaskTime, normalizeTaskTime } from '../utils/taskTime';
import { deriveStateUpdatedAt } from './appStateMerge';
import { isLocalAutomation } from './localWorkspace';
import {
  loadWebState,
  saveWebState,
} from './indexedDbStorage';

const STORAGE_KEY = 'lightflux.app-state.v12';
const stateFile = () =>
  new File(Paths.document, 'lightflux-state-v12.json');

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
    scheduledTime: normalizeTaskTime(todo.scheduledTime),
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
          ...(event.metadata.scheduledTime === null ||
          isTaskTime(event.metadata.scheduledTime)
            ? { scheduledTime: event.metadata.scheduledTime }
            : {}),
          ...(event.metadata.previousScheduledTime === null ||
          isTaskTime(event.metadata.previousScheduledTime)
            ? {
                previousScheduledTime:
                  event.metadata.previousScheduledTime,
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

interface AppStateBackup {
  createdAt: number;
  format: 'lightflux-app-state';
  state: PersistedAppState;
  version: 1;
}

export const parsePersistedAppState = (
  rawState: string,
  now = Date.now(),
): PersistedAppState | null => {
  try {
    const parsed = JSON.parse(rawState) as Partial<PersistedAppState>;
    if (
      parsed.schemaVersion !== 12 ||
      !Array.isArray(parsed.todos) ||
      !Array.isArray(parsed.projects) ||
      (parsed.localAutomation !== undefined && !isLocalAutomation(parsed.localAutomation))
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
      ...(parsed.localAutomation ? { localAutomation: parsed.localAutomation } : {}),
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

export const createAppStateBackup = (
  state: PersistedAppState,
  createdAt = Date.now(),
): string =>
  JSON.stringify(
    {
      createdAt,
      format: 'lightflux-app-state',
      state,
      version: 1,
    } satisfies AppStateBackup,
    null,
    2,
  );

export const parseAppStateBackup = (
  rawBackup: string,
): PersistedAppState | null => {
  try {
    const backup = JSON.parse(rawBackup) as Partial<AppStateBackup>;
    if (
      backup.format !== 'lightflux-app-state' ||
      backup.version !== 1 ||
      typeof backup.createdAt !== 'number' ||
      !Number.isFinite(backup.createdAt) ||
      !backup.state
    ) {
      return null;
    }
    return requireLocalState(JSON.stringify(backup.state));
  } catch {
    return null;
  }
};

const requireLocalState = (raw: string): PersistedAppState => {
  const state = parsePersistedAppState(raw);
  if (!state) {
    throw new Error('Unrecognized local data. Original data has been preserved.');
  }
  const original = JSON.parse(raw);
  for (const key of ['todos', 'projects', 'milestones'] as const) {
    if (Array.isArray(original[key]) && original[key].some(
      (item: { id?: unknown } | null) => !item || !state[key].some((saved) => saved.id === item.id),
    )) {
      throw new Error('Local data contains invalid records. Original data has been preserved.');
    }
  }
  return state;
};

export const loadAppState = async (): Promise<PersistedAppState | null> => {
  if (Platform.OS === 'web') {
    if (isTauri()) {
      const saved = await invoke<string | null>('load_local_app_state');
      if (saved !== null) return requireLocalState(saved);
    }
    const raw = await loadWebState(STORAGE_KEY);
    if (raw !== null) {
      const state = requireLocalState(raw);
      if (isTauri()) {
        // Keep the WebView copy untouched as the migration recovery source.
        await invoke('save_local_app_state', { content: raw });
      }
      return state;
    }
    for (const key of ['current', 'lightflux.app-state.v1']) {
      if (await loadWebState(key) !== null) {
        throw new Error('Legacy local data requires recovery; it has not been deleted.');
      }
    }
    return null;
  }
  const file = stateFile();
  return file.exists ? requireLocalState(await file.text()) : null;
};

let writeQueue: Promise<unknown> = Promise.resolve();

export const saveAppState = (
  state: PersistedAppState,
  restore = false,
): Promise<PersistedAppState> => {
  const content = JSON.stringify(state);
  const write = writeQueue.then(async () => {
    if (Platform.OS === 'web') {
      if (isTauri()) {
        await invoke('save_local_app_state', { content, restore });
      } else {
        await saveWebState(STORAGE_KEY, content);
      }
    } else {
      stateFile().write(content);
    }
    return state;
  });
  writeQueue = write.catch(() => undefined);
  return write;
};

export const saveLocalAppState = (state: PersistedAppState) => saveAppState(state, true);
