import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  NAVIGATION_ITEM_IDS,
  Milestone,
  MilestoneDateRule,
  MilestoneType,
  NavigationItemId,
  PersistedAppState,
  TaskEvent,
  TaskEventType,
  Todo,
  TodoGroup,
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
  deriveStateUpdatedAt,
  selectLatestAppState,
} from './appStateMerge';
import {
  isRemoteAuthConfigured,
  loadRemoteAppState,
  saveRemoteAppState,
} from './authApi';
import { loadWebState, saveWebState } from './indexedDbStorage';
import { migrateTaskEvents } from '../store/taskEventDomain';

const STORAGE_KEY = 'lightflux.app-state.v1';
const stateFile = () => new File(Paths.document, 'lightflux-state.json');

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
    groupId: typeof todo.groupId === 'string' ? todo.groupId : null,
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

const normalizeGroup = (
  value: unknown,
  fallbackOrder: number,
): TodoGroup | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const group = value as Partial<TodoGroup>;
  if (
    typeof group.id === 'string' &&
    typeof group.name === 'string' &&
    typeof group.color === 'string' &&
    typeof group.createdAt === 'number'
  ) {
    return {
      id: group.id,
      name: group.name,
      color: group.color,
      createdAt: group.createdAt,
      sortOrder:
        typeof group.sortOrder === 'number'
          ? group.sortOrder
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
    if (!Array.isArray(parsed.todos)) {
      return null;
    }

    const normalizedTodos = parsed.todos
      .map((todo, index) => normalizeTodo(todo, index))
      .filter((todo): todo is Todo => todo !== null);
    const groups = Array.isArray(parsed.groups)
      ? parsed.groups
          .map((group, index) => normalizeGroup(group, index + 1))
          .filter((group): group is TodoGroup => group !== null)
      : [];
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
    const todos = normalizedTodos.map((todo) =>
      todo.milestoneId !== null && !milestoneIds.has(todo.milestoneId)
        ? { ...todo, milestoneId: null }
        : todo,
    );
    const taskIds = new Set(todos.map((todo) => todo.id));
    const normalizedEvents = Array.isArray(parsed.taskEvents)
      ? parsed.taskEvents
          .map(normalizeTaskEvent)
          .filter(
            (event): event is TaskEvent =>
              event !== null && taskIds.has(event.taskId),
          )
      : [];
    const taskEvents =
      parsed.schemaVersion === 9 && Array.isArray(parsed.taskEvents)
        ? Array.from(
            new Map(
              normalizedEvents.map((event) => [event.id, event]),
            ).values(),
          ).sort(
            (a, b) =>
              a.occurredAt - b.occurredAt ||
              TASK_EVENT_ORDER[a.type] - TASK_EVENT_ORDER[b.type] ||
              a.id.localeCompare(b.id),
          )
        : migrateTaskEvents(todos);
    const analyticsStartedAt =
      typeof parsed.analyticsStartedAt === 'number' &&
      Number.isFinite(parsed.analyticsStartedAt) &&
      parsed.analyticsStartedAt >= 0
        ? parsed.analyticsStartedAt
        : now;

    return {
      schemaVersion: 9,
      updatedAt: deriveStateUpdatedAt(
        todos,
        groups,
        milestones,
        parsed.updatedAt,
      ),
      language: parsed.language === 'en' ? 'en' : 'zh',
      analyticsStartedAt,
      navigationOrder: normalizeNavigationOrder(parsed.navigationOrder),
      ungroupedName:
        typeof parsed.ungroupedName === 'string' &&
        parsed.ungroupedName.trim().length > 0
          ? parsed.ungroupedName.trim()
          : null,
      todos,
      groups,
      milestones,
      taskEvents,
    };
  } catch {
    return null;
  }
};

const loadDeviceState = async (): Promise<PersistedAppState | null> => {
  if (Platform.OS === 'web') {
    const rawState = await loadWebState(STORAGE_KEY);
    return rawState ? parsePersistedAppState(rawState) : null;
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

export const loadAppState = async (): Promise<PersistedAppState | null> => {
  const deviceState = await loadDeviceState();
  if (!isRemoteAuthConfigured) {
    return deviceState;
  }

  try {
    const remoteState = await loadRemoteAppState();
    if (!remoteState) {
      return deviceState;
    }

    const normalizedRemoteState = parsePersistedAppState(
      JSON.stringify(remoteState),
    );
    if (normalizedRemoteState) {
      const latestState = selectLatestAppState(
        deviceState,
        normalizedRemoteState,
      );
      if (latestState === normalizedRemoteState) {
        await saveDeviceState(normalizedRemoteState);
      } else if (
        latestState &&
        latestState.updatedAt > normalizedRemoteState.updatedAt
      ) {
        await saveRemoteAppState(latestState);
      }
      return latestState;
    }
    return deviceState;
  } catch (error) {
    if (deviceState) {
      console.warn('Unable to load cloud data; using the local cache.', error);
      return deviceState;
    }
    throw error;
  }
};

export const saveAppState = async (
  state: PersistedAppState,
): Promise<void> => {
  await saveDeviceState(state);
  if (isRemoteAuthConfigured) {
    await saveRemoteAppState(state);
  }
};
