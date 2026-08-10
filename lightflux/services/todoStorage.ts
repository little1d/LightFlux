import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  NAVIGATION_ITEM_IDS,
  NavigationItemId,
  PersistedAppState,
  Todo,
  TodoGroup,
} from '../types/todo';
import { todayKey } from '../utils/date';
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

const parseState = (rawState: string): PersistedAppState | null => {
  try {
    const parsed = JSON.parse(rawState) as Partial<PersistedAppState>;
    if (!Array.isArray(parsed.todos)) {
      return null;
    }

    const todos = parsed.todos
      .map((todo, index) => normalizeTodo(todo, index))
      .filter((todo): todo is Todo => todo !== null);
    const groups = Array.isArray(parsed.groups)
      ? parsed.groups
          .map((group, index) => normalizeGroup(group, index + 1))
          .filter((group): group is TodoGroup => group !== null)
      : [];

    return {
      schemaVersion: 7,
      updatedAt: deriveStateUpdatedAt(todos, groups, parsed.updatedAt),
      language: parsed.language === 'en' ? 'en' : 'zh',
      navigationOrder: normalizeNavigationOrder(parsed.navigationOrder),
      ungroupedName:
        typeof parsed.ungroupedName === 'string' &&
        parsed.ungroupedName.trim().length > 0
          ? parsed.ungroupedName.trim()
          : null,
      todos,
      groups,
    };
  } catch {
    return null;
  }
};

const loadDeviceState = async (): Promise<PersistedAppState | null> => {
  if (Platform.OS === 'web') {
    const rawState = await loadWebState(STORAGE_KEY);
    return rawState ? parseState(rawState) : null;
  }

  const file = stateFile();
  if (!file.exists) {
    return null;
  }

  return parseState(await file.text());
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

    const normalizedRemoteState = parseState(JSON.stringify(remoteState));
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
