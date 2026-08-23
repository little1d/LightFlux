import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PersistedAppState, Todo } from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';

const storage = new Map<string, string>();
const loadRemoteAppState = vi.fn();
const saveRemoteAppState = vi.fn();

class RemoteAppStateConflictError extends Error {
  snapshot: {
    ownerId: string;
    revision: number;
    state: unknown | null;
  };

  constructor(snapshot: RemoteAppStateConflictError['snapshot']) {
    super('Conflict');
    this.snapshot = snapshot;
  }
}

vi.mock('expo-file-system', () => ({
  File: class {},
  Paths: { document: '' },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('../services/indexedDbStorage', () => ({
  deleteWebState: vi.fn(async (key: string) => {
    storage.delete(key);
  }),
  loadWebState: vi.fn(async (key: string) => storage.get(key) ?? null),
  saveWebState: vi.fn(async (key: string, value: string) => {
    storage.set(key, value);
  }),
}));

vi.mock('../services/authApi', () => ({
  isRemoteAuthConfigured: true,
  loadRemoteAppState,
  RemoteAppStateConflictError,
  saveRemoteAppState,
}));

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

const state = (
  updatedAt: number,
  firstTitle: string,
  secondTitle: string,
): PersistedAppState => ({
  schemaVersion: 12,
  updatedAt,
  analyticsStartedAt: 1,
  language: 'zh',
  navigationOrder: [
    'today',
    'completed',
    'calendar',
    'milestones',
    'projects',
    'trash',
  ],
  hiddenNavigationItems: [],
  todos: [
    task('first', firstTitle, firstTitle === 'First' ? 1 : updatedAt),
    task('second', secondTitle, secondTitle === 'Second' ? 1 : updatedAt),
  ],
  projects: [
    {
      id: 'inbox',
      name: '收件箱',
      color: '#8B7EFF',
      createdAt: 1,
      kind: 'inbox',
      sortOrder: 0,
    },
  ],
  milestones: [],
  taskEvents: [],
});

describe('revision conflict recovery', () => {
  beforeEach(() => {
    storage.clear();
    loadRemoteAppState.mockReset();
    saveRemoteAppState.mockReset();
  });

  it('keeps local saves local until a remote owner is established', async () => {
    vi.resetModules();
    const local = state(20, 'Local edit', 'Second');
    loadRemoteAppState.mockRejectedValue(new Error('offline'));
    const { saveAppState } = await import('../services/todoStorage');

    await expect(saveAppState(local)).resolves.toEqual(local);

    expect(loadRemoteAppState).not.toHaveBeenCalled();
    expect(saveRemoteAppState).not.toHaveBeenCalled();
    expect(
      JSON.parse(storage.get('lightflux.app-state.v12') ?? '{}'),
    ).toMatchObject({
      projects: [
        expect.objectContaining({ id: 'inbox', kind: 'inbox' }),
      ],
      todos: [
        expect.objectContaining({
          projectId: 'inbox',
          title: 'Local edit',
        }),
        expect.objectContaining({
          projectId: 'inbox',
          title: 'Second',
        }),
      ],
    });
  });

  it('three-way merges a 409 snapshot and retries with its revision', async () => {
    vi.resetModules();
    const base = state(10, 'First', 'Second');
    const local = state(20, 'Local edit', 'Second');
    const remote = state(30, 'First', 'Remote edit');
    loadRemoteAppState.mockResolvedValue({
      ownerId: 'owner',
      revision: 1,
      state: base,
    });
    saveRemoteAppState
      .mockRejectedValueOnce(
        new RemoteAppStateConflictError({
          ownerId: 'owner',
          revision: 2,
          state: remote,
        }),
      )
      .mockResolvedValueOnce(3);

    const { saveAppState, synchronizeAppState } = await import(
      '../services/todoStorage'
    );
    const { parsePersistedAppState } = await import(
      '../services/todoStorage'
    );
    expect(parsePersistedAppState(JSON.stringify(base))).toEqual(base);
    await synchronizeAppState(base);
    expect(saveRemoteAppState).not.toHaveBeenCalled();
    const result = await saveAppState(local);

    expect(result.todos).toEqual([
      expect.objectContaining({ id: 'first', title: 'Local edit' }),
      expect.objectContaining({ id: 'second', title: 'Remote edit' }),
    ]);
    expect(saveRemoteAppState).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        projects: local.projects,
        todos: expect.arrayContaining([
          expect.objectContaining({
            projectId: 'inbox',
          }),
        ]),
      }),
      1,
    );
    expect(saveRemoteAppState).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        todos: expect.arrayContaining([
          expect.objectContaining({ title: 'Local edit' }),
          expect.objectContaining({ title: 'Remote edit' }),
        ]),
      }),
      2,
    );
    expect(
      JSON.parse(storage.get('lightflux.sync-metadata.v12') ?? '{}'),
    ).toMatchObject({ ownerId: 'owner', revision: 3 });
  });

  it('does not upload a previous account local cache to a new account', async () => {
    vi.resetModules();
    const previousAccountState = state(20, 'Private task', 'Second');
    storage.set(
      'lightflux.sync-metadata.v12',
      JSON.stringify({
        ownerId: 'previous-owner',
        revision: 4,
        baseState: previousAccountState,
      }),
    );
    loadRemoteAppState.mockResolvedValue({
      ownerId: 'new-owner',
      revision: 0,
      state: null,
    });
    saveRemoteAppState.mockResolvedValue(1);

    const { synchronizeAppState } = await import('../services/todoStorage');
    const result = await synchronizeAppState(previousAccountState);

    expect(result?.todos).toEqual([]);
    expect(saveRemoteAppState).toHaveBeenCalledWith(
      expect.objectContaining({ todos: [] }),
      0,
    );
    expect(
      JSON.parse(storage.get('lightflux.sync-metadata.v12') ?? '{}'),
    ).toMatchObject({ ownerId: 'new-owner', revision: 1 });
  });

  it('does not let an earlier cloud result overwrite a newer device save', async () => {
    vi.resetModules();
    const base = state(10, 'First', 'Second');
    const firstSave = state(20, 'First save', 'Second');
    const secondSave = state(30, 'Second save', 'Second');
    loadRemoteAppState.mockResolvedValue({
      ownerId: 'owner',
      revision: 1,
      state: base,
    });
    saveRemoteAppState
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    const { saveAppState, synchronizeAppState } = await import(
      '../services/todoStorage'
    );
    await synchronizeAppState(base);
    await Promise.all([
      saveAppState(firstSave),
      saveAppState(secondSave),
    ]);

    expect(
      JSON.parse(storage.get('lightflux.app-state.v12') ?? '{}'),
    ).toMatchObject({
      todos: [
        expect.objectContaining({ title: 'Second save' }),
        expect.objectContaining({ title: 'Second' }),
      ],
    });
  });

  it('requires an authenticated snapshot after native sign-in', async () => {
    vi.resetModules();
    loadRemoteAppState.mockResolvedValue(null);
    const { synchronizeAppState } = await import('../services/todoStorage');

    await expect(
      synchronizeAppState(state(10, 'First', 'Second'), {
        requireRemoteSession: true,
      }),
    ).rejects.toThrow('authenticated cloud session');
  });
});
