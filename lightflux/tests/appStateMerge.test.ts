import { describe, expect, it } from 'vitest';

import {
  deriveStateUpdatedAt,
  selectLatestAppState,
} from '../services/appStateMerge';
import { PersistedAppState, Todo } from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';

const state = (updatedAt: number): PersistedAppState => ({
  schemaVersion: 10,
  updatedAt,
  analyticsStartedAt: 1,
  groups: [],
  language: 'zh',
  navigationOrder: [
    'today',
    'completed',
    'calendar',
    'groups',
    'trash',
  ],
  hiddenNavigationItems: [],
  todos: [],
  milestones: [],
  taskEvents: [],
  ungroupedName: null,
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
      groupId: null,
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
