import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system', () => ({
  File: class {},
  Paths: { document: '' },
}));

vi.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  Platform: { OS: 'web' },
}));

vi.mock('../services/milestoneNotifications', () => ({
  clearRuntimeMilestoneNotifications: vi.fn(),
  reconcileMilestoneNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/todoStorage', () => ({
  createAppStateBackup: vi.fn(),
  loadAppState: vi.fn().mockResolvedValue(null),
  parseAppStateBackup: vi.fn(),
  saveAppState: vi.fn().mockResolvedValue(undefined),
  saveLocalAppState: vi.fn().mockResolvedValue(undefined),
}));

import { mutateTaskState } from '@lightflux/domain';
import { useTodoStore } from '../store/todoStore';
import type { NewTodo, PersistedAppState } from '../types/todo';

const TODAY = '2026-11-17';

const reset = () => {
  const state = useTodoStore.getState();
  useTodoStore.setState({
    allTodos: [],
    todos: [],
    trashedTodos: [],
    projects: state.projects,
    taskEvents: [],
  });
};

// `scheduledDate` is required by NewTodo; the tests do not depend on its value.
const add = (todo: Omit<NewTodo, 'scheduledDate'> & { scheduledDate?: string }) => {
  const id = useTodoStore
    .getState()
    .addTodo({ scheduledDate: TODAY, ...todo });
  if (!id) throw new Error('addTodo returned no id');
  return id;
};

const titles = () =>
  [...useTodoStore.getState().allTodos]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((todo) => todo.title);

const sortOrders = () =>
  [...useTodoStore.getState().allTodos]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((todo) => todo.sortOrder);

describe('task creation order', () => {
  it('appends new tasks to the end of the list', () => {
    reset();
    add({ title: 'first', projectId: 'inbox' });
    add({ title: 'second', projectId: 'inbox' });
    add({ title: 'third', projectId: 'inbox' });
    expect(titles()).toEqual(['first', 'second', 'third']);
    expect(sortOrders()).toEqual([0, 1, 2]);
  });

  it('still honours an explicit insertAfterId anchor', () => {
    reset();
    const first = add({ title: 'first', projectId: 'inbox' });
    add({ title: 'third', projectId: 'inbox' });
    add({ title: 'second', projectId: 'inbox', insertAfterId: first });
    expect(titles()).toEqual(['first', 'second', 'third']);
    expect(sortOrders()).toEqual([0, 1, 2]);
  });

  it('falls back to the end when the anchor no longer exists', () => {
    reset();
    add({ title: 'first', projectId: 'inbox' });
    add({ title: 'second', projectId: 'inbox', insertAfterId: 'deleted-id' });
    expect(titles()).toEqual(['first', 'second']);
  });

  it('appends subtasks within their own parent, not the top-level list', () => {
    reset();
    const parent = add({ title: 'parent', projectId: 'inbox' });
    add({ title: 'sibling', projectId: 'inbox' });
    const childA = add({ title: 'child a', projectId: 'inbox', parentId: parent });
    add({ title: 'child b', projectId: 'inbox', parentId: parent });
    const children = useTodoStore
      .getState()
      .allTodos.filter((todo) => todo.parentId === parent)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((todo) => todo.title);
    expect(children).toEqual(['child a', 'child b']);
    expect(
      useTodoStore.getState().allTodos.find((todo) => todo.id === childA)
        ?.sortOrder,
    ).toBe(0);
  });

  it('matches the shared workspace append semantics', () => {
    reset();
    const state: PersistedAppState = {
      schemaVersion: 12,
      todos: [],
      projects: useTodoStore.getState().projects,
      milestones: [],
      taskEvents: [],
      analyticsStartedAt: 0,
      navigationOrder: [],
      hiddenNavigationItems: [],
      language: 'en',
      updatedAt: 0,
    };
    for (const title of ['alpha', 'beta', 'gamma']) {
      add({ title, projectId: 'inbox' });
      mutateTaskState({
        action: 'task.create',
        state,
        body: {
          title,
          projectId: 'inbox',
          scheduledDate: TODAY,
          generatedTaskId: title,
        },
        now: Date.now(),
      });
    }
    const shared = [...state.todos]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((todo) => todo.title);
    expect(titles()).toEqual(shared);
  });
});
