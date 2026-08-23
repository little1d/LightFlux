import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system', () => ({
  File: class {},
  Paths: { document: '' },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('../services/authApi', () => ({
  isRemoteAuthConfigured: false,
  loadRemoteAppState: vi.fn(),
  saveRemoteAppState: vi.fn(),
}));

vi.mock('../services/indexedDbStorage', () => ({
  deleteWebState: vi.fn(),
  loadWebState: vi.fn(),
  saveWebState: vi.fn(),
}));

import { parsePersistedAppState } from '../services/todoStorage';

const inboxProject = {
  id: 'inbox',
  name: '收件箱',
  color: '#8B7EFF',
  createdAt: 1,
  kind: 'inbox',
  sortOrder: 0,
};

const todo = {
  id: 'task',
  title: 'Task',
  completed: false,
  completedAt: null,
  createdAt: 10,
  updatedAt: 20,
  scheduledDate: '2026-08-10',
  projectId: 'inbox',
  milestoneId: null,
  parentId: null,
  priority: 'none',
  sortOrder: 0,
  trashedAt: null,
};

const state = {
  schemaVersion: 12,
  updatedAt: 20,
  analyticsStartedAt: 15,
  language: 'zh',
  navigationOrder: [
    'today',
    'completed',
    'calendar',
    'milestones',
    'projects',
    'trash',
  ],
  hiddenNavigationItems: [
    'completed',
    'calendar',
    'milestones',
    'trash',
  ],
  todos: [todo],
  projects: [inboxProject],
  milestones: [],
  taskEvents: [],
};

describe('persisted state V12 validation', () => {
  it('rejects every pre-V12 aggregate instead of migrating Group data', () => {
    for (const schemaVersion of [7, 8, 9, 10, 11]) {
      expect(
        parsePersistedAppState(
          JSON.stringify({
            ...state,
            schemaVersion,
            projects: undefined,
            groups: [],
          }),
        ),
      ).toBeNull();
    }
  });

  it('accepts V12 Projects and normalizes navigation preferences', () => {
    const result = parsePersistedAppState(
      JSON.stringify({
        ...state,
        navigationOrder: ['projects', 'today', 'unknown', 'projects'],
        hiddenNavigationItems: [
          'completed',
          'today',
          'trash',
          'unknown',
          'trash',
        ],
      }),
      100,
    );

    expect(result).toMatchObject({
      schemaVersion: 12,
      hiddenNavigationItems: ['completed', 'trash'],
      projects: [expect.objectContaining({ id: 'inbox', kind: 'inbox' })],
      todos: [expect.objectContaining({ id: 'task', projectId: 'inbox' })],
    });
    expect(result?.navigationOrder.slice(0, 2)).toEqual([
      'projects',
      'today',
    ]);
    expect(result?.navigationOrder).toHaveLength(6);
  });

  it('restores Inbox and repairs invalid Project references in V12', () => {
    const result = parsePersistedAppState(
      JSON.stringify({
        ...state,
        projects: [
          {
            id: 'work',
            name: '工作',
            color: '#55B9A5',
            createdAt: 5,
            kind: 'standard',
            sortOrder: 1,
          },
        ],
        todos: [{ ...todo, projectId: 'missing' }],
      }),
      100,
    );

    expect(result?.projects).toEqual([
      expect.objectContaining({
        id: 'inbox',
        kind: 'inbox',
        name: '收件箱',
      }),
      expect.objectContaining({ id: 'work', kind: 'standard' }),
    ]);
    expect(result?.todos[0]).toMatchObject({ projectId: 'inbox' });
  });

  it('normalizes current task events and filters invalid references', () => {
    const result = parsePersistedAppState(
      JSON.stringify({
        ...state,
        taskEvents: [
          {
            id: 'created',
            taskId: 'task',
            type: 'created',
            occurredAt: 10,
          },
          {
            id: 'missing-task',
            taskId: 'missing',
            type: 'completed',
            occurredAt: 11,
          },
          {
            id: 'invalid-type',
            taskId: 'task',
            type: 'deleted',
            occurredAt: 12,
          },
        ],
      }),
    );

    expect(result?.taskEvents).toEqual([
      expect.objectContaining({ id: 'created', taskId: 'task' }),
    ]);
  });

  it('rejects malformed JSON and V12 aggregates without Projects', () => {
    expect(parsePersistedAppState('{')).toBeNull();
    expect(
      parsePersistedAppState(
        JSON.stringify({ ...state, projects: undefined }),
      ),
    ).toBeNull();
  });
});
