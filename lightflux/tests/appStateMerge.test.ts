import { describe, expect, it } from 'vitest';

import {
  deriveStateUpdatedAt,
  mergeConcurrentAppStates,
  selectLatestAppState,
} from '../services/appStateMerge';
import { PersistedAppState, Todo } from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';

const state = (updatedAt: number): PersistedAppState => ({
  schemaVersion: 12,
  updatedAt,
  analyticsStartedAt: 1,
  projects: [
    {
      id: 'inbox',
      name: 'Inbox',
      color: '#8B7EFF',
      createdAt: 1,
      kind: 'inbox',
      sortOrder: 0,
    },
  ],
  language: 'zh',
  navigationOrder: [
    'today',
    'completed',
    'calendar',
    'projects',
    'trash',
  ],
  hiddenNavigationItems: [],
  todos: [],
  milestones: [],
  taskEvents: [],
});

describe('app-state version selection', () => {
  it('keeps newer local state instead of stale cloud state', () => {
    const local = state(20);
    const remote = state(10);

    expect(selectLatestAppState(local, remote)).toBe(local);
  });

  it('uses cloud state only when it is strictly newer', () => {
    const local = state(20);
    const remote = state(30);

    expect(selectLatestAppState(local, remote)).toBe(remote);
    expect(selectLatestAppState(local, state(20))).toBe(local);
  });

  it('derives a migration timestamp from legacy task data', () => {
    const legacyTodo: Todo = {
      id: 'task',
      title: 'task',
      completed: false,
      completedAt: null,
      content: emptyRichTextDocument(),
      createdAt: 10,
      projectId: 'inbox',
      milestoneId: null,
      parentId: null,
      priority: 'none',
      scheduledDate: '2026-08-10',
      sortOrder: 0,
      trashedAt: null,
      updatedAt: 42,
    };

    expect(deriveStateUpdatedAt([legacyTodo], [], [], undefined)).toBe(42);
  });
});

describe('three-way app-state merge', () => {
  const task = (id: string, title: string, updatedAt: number): Todo => ({
    id,
    title,
    completed: false,
    completedAt: null,
    content: emptyRichTextDocument(),
    createdAt: 1,
    projectId: 'inbox',
    milestoneId: null,
    parentId: null,
    priority: 'none',
    scheduledDate: '2026-08-20',
    sortOrder: 0,
    trashedAt: null,
    updatedAt,
  });

  it('preserves independent local and remote edits', () => {
    const base = {
      ...state(10),
      todos: [task('local', 'Local base', 10), task('remote', 'Remote base', 10)],
    };
    const local = {
      ...base,
      updatedAt: 20,
      todos: [task('local', 'Local edit', 20), task('remote', 'Remote base', 10)],
    };
    const remote = {
      ...base,
      updatedAt: 30,
      todos: [task('local', 'Local base', 10), task('remote', 'Remote edit', 30)],
    };

    const merged = mergeConcurrentAppStates(base, local, remote, 40);
    expect(merged.todos).toEqual([
      expect.objectContaining({ id: 'local', title: 'Local edit' }),
      expect.objectContaining({ id: 'remote', title: 'Remote edit' }),
    ]);
    expect(merged.updatedAt).toBe(40);
  });

  it('keeps a one-sided deletion and a remote addition', () => {
    const base = {
      ...state(10),
      todos: [task('deleted', 'Delete me', 10)],
    };
    const local = { ...base, updatedAt: 20, todos: [] };
    const remote = {
      ...base,
      updatedAt: 30,
      todos: [
        task('deleted', 'Delete me', 10),
        task('remote-new', 'Remote new', 30),
      ],
    };

    expect(
      mergeConcurrentAppStates(base, local, remote, 40).todos,
    ).toEqual([expect.objectContaining({ id: 'remote-new' })]);
  });

  it('uses the newer record when both devices edit the same task', () => {
    const base = { ...state(10), todos: [task('task', 'Base', 10)] };
    const local = {
      ...base,
      updatedAt: 40,
      todos: [task('task', 'Local', 40)],
    };
    const remote = {
      ...base,
      updatedAt: 30,
      todos: [task('task', 'Remote', 30)],
    };

    expect(
      mergeConcurrentAppStates(base, local, remote, 50).todos[0].title,
    ).toBe('Local');
  });

  it('repairs references to records removed by the merge', () => {
    const base = state(10);
    const local = {
      ...base,
      updatedAt: 20,
      todos: [
        {
          ...task('task', 'Task', 20),
          projectId: 'missing-project',
          milestoneId: 'missing-milestone',
          parentId: 'missing-parent',
        },
      ],
    };
    const remote = state(30);

    expect(
      mergeConcurrentAppStates(base, local, remote, 40).todos[0],
    ).toMatchObject({
      projectId: 'inbox',
      milestoneId: null,
      parentId: null,
    });
  });

  it('restores Inbox when one side removes the reserved Project', () => {
    const base = {
      ...state(10),
      todos: [task('task', 'Task', 10)],
    };
    const local = { ...base, updatedAt: 20, projects: [] };
    const remote = { ...base, updatedAt: 30 };

    const merged = mergeConcurrentAppStates(base, local, remote, 40);

    expect(merged.projects).toContainEqual(
      expect.objectContaining({ id: 'inbox', kind: 'inbox' }),
    );
    expect(merged.todos[0].projectId).toBe('inbox');
  });

  it('breaks parent cycles created by independent device moves', () => {
    const base = {
      ...state(10),
      todos: [task('a', 'A', 10), task('b', 'B', 10)],
    };
    const local = {
      ...base,
      updatedAt: 20,
      todos: [
        { ...task('a', 'A', 20), parentId: 'b' },
        task('b', 'B', 10),
      ],
    };
    const remote = {
      ...base,
      updatedAt: 30,
      todos: [
        task('a', 'A', 10),
        { ...task('b', 'B', 30), parentId: 'a' },
      ],
    };

    const merged = mergeConcurrentAppStates(base, local, remote, 40);
    const a = merged.todos.find((todo) => todo.id === 'a');
    const b = merged.todos.find((todo) => todo.id === 'b');
    expect(a?.parentId).toBe('b');
    expect(b?.parentId).toBeNull();
  });
});
