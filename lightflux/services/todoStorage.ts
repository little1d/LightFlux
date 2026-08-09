import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import { PersistedAppState, Todo, TodoGroup } from '../types/todo';
import { todayKey } from '../utils/date';
import {
  emptyRichTextDocument,
  isRichTextDocument,
} from '../utils/richText';
import {
  isRemoteAuthConfigured,
  loadRemoteAppState,
  saveRemoteAppState,
} from './authApi';

const STORAGE_KEY = 'lightflux.app-state.v1';
const FILE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}lightflux-state.json`
  : null;

interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const getWebStorage = (): WebStorage | null => {
  const runtime = globalThis as typeof globalThis & {
    localStorage?: WebStorage;
  };

  return runtime.localStorage ?? null;
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

    return {
      schemaVersion: 3,
      language: parsed.language === 'en' ? 'en' : 'zh',
      todos,
      groups: Array.isArray(parsed.groups)
        ? parsed.groups
            .map((group, index) => normalizeGroup(group, index + 1))
            .filter((group): group is TodoGroup => group !== null)
        : [],
    };
  } catch {
    return null;
  }
};

export const loadAppState = async (): Promise<PersistedAppState | null> => {
  if (isRemoteAuthConfigured) {
    const remoteState = await loadRemoteAppState();
    return remoteState ? parseState(JSON.stringify(remoteState)) : null;
  }

  if (Platform.OS === 'web') {
    const rawState = getWebStorage()?.getItem(STORAGE_KEY);
    return rawState ? parseState(rawState) : null;
  }

  if (!FILE_URI) {
    return null;
  }

  const file = await FileSystem.getInfoAsync(FILE_URI);
  if (!file.exists) {
    return null;
  }

  return parseState(await FileSystem.readAsStringAsync(FILE_URI));
};

export const saveAppState = async (
  state: PersistedAppState,
): Promise<void> => {
  if (isRemoteAuthConfigured) {
    await saveRemoteAppState(state);
    return;
  }

  const serializedState = JSON.stringify(state);

  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(STORAGE_KEY, serializedState);
    return;
  }

  if (FILE_URI) {
    await FileSystem.writeAsStringAsync(FILE_URI, serializedState);
  }
};
