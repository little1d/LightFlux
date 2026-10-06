import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PersistedAppState } from '../types/todo';
import { NAVIGATION_ITEM_IDS } from '../types/todo';

const mocks = vi.hoisted(() => ({
  state: {} as PersistedAppState,
  flush: vi.fn(),
}));

vi.mock('../store/todoStore', () => ({
  useTodoStore: {
    getState: () => ({
      ...mocks.state,
      isHydrated: true,
      persistenceReady: true,
    }),
    setState: (update: Partial<PersistedAppState>) => {
      mocks.state = { ...mocks.state, ...update };
    },
  },
  persistedState: () => mocks.state,
  persistedStoreSlice: (state: PersistedAppState) => state,
  flushAppState: mocks.flush,
}));

import type { ChatToolRecord } from '../agent/chat';
import { prepareChatTool } from '../agent/chatTools';
import { executeChatTool, undoChatTool } from '../services/chatTools';

const initial = (): PersistedAppState => ({
  schemaVersion: 12,
  updatedAt: 1,
  analyticsStartedAt: 1,
  language: 'zh',
  navigationOrder: [...NAVIGATION_ITEM_IDS],
  hiddenNavigationItems: [],
  todos: [],
  projects: [{ id: 'inbox', name: '收件箱', color: '#8B7EFF', createdAt: 1, kind: 'inbox', sortOrder: 0 }],
  milestones: [],
  taskEvents: [],
});

describe('confirmed Xiaoguang task transactions', () => {
  beforeEach(() => {
    mocks.state = initial();
    mocks.flush.mockReset().mockResolvedValue(undefined);
  });

  it('persists before success, replays without duplicates, and uses latest-only undo', async () => {
    const pending: ChatToolRecord = {
      call: { id: 'call_1', name: 'create_task', arguments: '{"title":"test"}' },
      status: 'pending',
    };
    const preview = prepareChatTool(mocks.state, pending);
    const confirmed: ChatToolRecord = { ...pending, status: 'confirmed', request: preview.request };
    const first = await executeChatTool(confirmed, preview);
    const replay = await executeChatTool(confirmed, preview);
    expect(mocks.flush).toHaveBeenCalledTimes(2);
    expect(mocks.state.todos).toHaveLength(1);
    expect(replay.mutationId).toBe(first.mutationId);
    expect(mocks.state.localAutomation?.mutations[0].actorId).toBe('xiaoguang');

    await undoChatTool(first.mutationId);
    expect(mocks.state.todos).toHaveLength(0);
    expect(mocks.state.localAutomation?.mutations[0].undoneAt).not.toBeNull();
  });

  it('recovers a durable idempotency key after a save failure without creating twice', async () => {
    const pending: ChatToolRecord = {
      call: { id: 'call_2', name: 'create_task', arguments: '{"title":"recover"}' },
      status: 'pending',
    };
    const preview = prepareChatTool(mocks.state, pending);
    const confirmed: ChatToolRecord = { ...pending, status: 'confirmed', request: preview.request };
    mocks.flush.mockRejectedValueOnce(new Error('disk full'));
    await expect(executeChatTool(confirmed, preview)).rejects.toThrow('tool-save-failed');
    expect(mocks.state.todos).toHaveLength(1);

    const result = await executeChatTool(confirmed, preview);
    expect(mocks.state.todos).toHaveLength(1);
    expect(JSON.parse(result.output)).toMatchObject({ ok: true, task: { title: 'recover' } });
  });

  it('rejects a stale preview before publishing a mutation', async () => {
    const pending: ChatToolRecord = {
      call: { id: 'call_3', name: 'create_task', arguments: '{"title":"stale"}' },
      status: 'pending',
    };
    const preview = prepareChatTool(mocks.state, pending);
    const confirmed: ChatToolRecord = { ...pending, status: 'confirmed', request: preview.request };
    mocks.state.projects = [
      ...mocks.state.projects,
      { id: 'later', name: 'Later', color: '#55B9A5', createdAt: 2, kind: 'standard', sortOrder: 1 },
    ];
    await expect(executeChatTool(confirmed, preview)).rejects.toThrow('tool-conflict');
    expect(mocks.state.todos).toEqual([]);
    expect(mocks.flush).not.toHaveBeenCalled();
  });

  it('executes and restores a confirmed permanent deletion', async () => {
    const createPending: ChatToolRecord = {
      call: { id: 'call_create', name: 'create_task', arguments: '{"title":"remove"}' },
      status: 'pending',
    };
    const createPreview = prepareChatTool(mocks.state, createPending);
    await executeChatTool({
      ...createPending, status: 'confirmed', request: createPreview.request,
    }, createPreview);
    expect(mocks.state.todos).toHaveLength(1);

    const deletePending: ChatToolRecord = {
      call: {
        id: 'call_delete',
        name: 'change_task',
        arguments: '{"task":"remove","action":"delete"}',
      },
      status: 'pending',
    };
    const deletePreview = prepareChatTool(mocks.state, deletePending);
    const removed = await executeChatTool({
      ...deletePending, status: 'confirmed', request: deletePreview.request,
    }, deletePreview);
    expect(mocks.state.todos).toEqual([]);
    expect(JSON.parse(removed.output)).toMatchObject({
      ok: true,
      task: { title: 'remove' },
    });

    await undoChatTool(removed.mutationId);
    expect(mocks.state.todos[0].title).toBe('remove');
  });
});
