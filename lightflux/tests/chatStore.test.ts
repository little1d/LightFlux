import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyChatState } from '../agent/chat';

const mocks = vi.hoisted(() => ({
  save: vi.fn(), load: vi.fn(), stream: vi.fn(), key: vi.fn(), storeKey: vi.fn(),
  preview: vi.fn(), executeTool: vi.fn(), undoTool: vi.fn(), cancellable: vi.fn(),
}));
vi.mock('../services/chatStorage', () => ({
  loadChatState: mocks.load, saveChatState: mocks.save, hasChatKey: mocks.key,
  storeChatKey: mocks.storeKey, removeChatKey: vi.fn(),
}));
vi.mock('../services/chatTransport', () => ({
  streamChatTurn: mocks.stream,
  chatErrorCode: (error: unknown) => error instanceof Error ? error.message : 'network',
}));
vi.mock('../services/chatTools', () => ({
  previewChatTool: mocks.preview, executeChatTool: mocks.executeTool,
  undoChatTool: mocks.undoTool, assertToolCancellable: mocks.cancellable,
}));

async function store() {
  const { useChatStore } = await import('../store/chatStore');
  await useChatStore.getState().hydrate();
  return useChatStore;
}

describe('multi-session chat lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.load.mockResolvedValue(emptyChatState());
    mocks.save.mockResolvedValue(undefined);
    mocks.key.mockResolvedValue(true);
    mocks.stream.mockResolvedValue({ content: 'Reply' });
  });

  it('keeps a pending response in its source conversation after selection changes', async () => {
    const chat = await store();
    const first = await chat.getState().createConversation();
    let resolve!: (text: string) => void;
    let onText!: (text: string) => void;
    mocks.stream.mockImplementation((input) => {
      onText = input.onText;
      return new Promise<{ content: string }>((done) => { resolve = (text) => done({ content: text }); });
    });
    const send = chat.getState().send(first, 'First topic', 'en');
    await vi.waitFor(() => expect(mocks.stream).toHaveBeenCalledOnce());
    const second = await chat.getState().createConversation();
    onText('Partial');
    resolve('Finished');
    await send;
    expect(chat.getState().data.activeId).toBe(second);
    expect(chat.getState().data.conversations.find((c) => c.id === second)?.messages).toEqual([]);
    expect(chat.getState().data.conversations.find((c) => c.id === first)?.messages.at(-1))
      .toMatchObject({ content: 'Finished', status: 'complete' });
  });

  it('renames and deletes an inactive conversation without changing the active one', async () => {
    const chat = await store();
    const first = await chat.getState().createConversation();
    chat.getState().setDraft(first, 'Private draft');
    const second = await chat.getState().createConversation();

    await chat.getState().renameConversation(first, 'Renamed in place');
    expect(chat.getState().data.activeId).toBe(second);
    expect(chat.getState().data.conversations.find((item) => item.id === first)?.title)
      .toBe('Renamed in place');

    await chat.getState().deleteConversation(first);
    expect(chat.getState().data.activeId).toBe(second);
    expect(chat.getState().data.conversations.some((item) => item.id === first)).toBe(false);
    expect(chat.getState().drafts[first]).toBeUndefined();
  });

  it('stops generation and retries without duplicating the user turn', async () => {
    const chat = await store();
    const id = await chat.getState().createConversation();
    mocks.stream.mockImplementation(({ signal, onText }) => {
      onText('Partial');
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('abort')));
      });
    });
    const send = chat.getState().send(id, 'Hello', 'en');
    await vi.waitFor(() => expect(mocks.stream).toHaveBeenCalledOnce());
    chat.getState().stop();
    await send;
    expect(chat.getState().data.conversations[0].messages.at(-1))
      .toMatchObject({ content: 'Partial', status: 'stopped' });
    mocks.stream.mockResolvedValue({ content: 'Retry succeeded' });
    await chat.getState().send(id, '', 'en', true);
    expect(chat.getState().data.conversations[0].messages).toHaveLength(2);
    expect(chat.getState().data.conversations[0].messages.at(-1)?.content).toBe('Retry succeeded');
    expect(mocks.stream.mock.calls.at(-1)?.[0].messages).toHaveLength(2); // system + user
  });

  it('retains unsaved messages and blocks quit until persistence can succeed', async () => {
    const chat = await store();
    const id = await chat.getState().createConversation();
    mocks.save.mockRejectedValue(new Error('disk full'));
    await expect(chat.getState().send(id, 'Keep this', 'en')).rejects.toThrow('save-failed');
    expect(mocks.stream).not.toHaveBeenCalled();
    expect(chat.getState().saveError).toBe(true);
    expect(chat.getState().data.conversations[0].messages[0].content).toBe('Keep this');
    const { flushChatState } = await import('../store/chatStore');
    await expect(flushChatState()).rejects.toThrow();
    mocks.save.mockResolvedValue(undefined);
    await flushChatState();
    expect(chat.getState().saveError).toBe(false);
  });

  it('keeps the first draft attached to the optimistic conversation if creation cannot persist', async () => {
    const chat = await store();
    mocks.save.mockRejectedValue(new Error('disk full'));
    await expect(chat.getState().createConversation('Do not lose this draft')).rejects.toThrow('save-failed');
    const activeId = chat.getState().data.activeId!;
    expect(chat.getState().drafts[activeId]).toBe('Do not lose this draft');
    expect(chat.getState().saveError).toBe(true);
  });

  it('rejects writes after corrupt history, including attempts to create a new session', async () => {
    mocks.load.mockRejectedValue(new Error('history-invalid'));
    const chat = await store();
    await expect(chat.getState().createConversation()).rejects.toThrow('history-invalid');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('requires a key for a changed endpoint and never serializes keys with history', async () => {
    const chat = await store();
    mocks.key.mockResolvedValue(false);
    await expect(chat.getState().saveConfig({ baseUrl: 'https://other.example/v1', model: 'test' }))
      .rejects.toThrow('missing-key');
    mocks.key.mockResolvedValue(true);
    await chat.getState().saveConfig({ baseUrl: 'https://other.example/v1', model: 'test' }, 'synthetic-test-key');
    expect(mocks.storeKey).toHaveBeenCalledWith('https://other.example/v1', 'synthetic-test-key');
    expect(JSON.stringify(mocks.save.mock.calls)).not.toContain('synthetic-test-key');
  });

  it('refreshes credential status even when persisting a new configuration fails', async () => {
    mocks.key.mockResolvedValue(false);
    const chat = await store();
    mocks.key.mockResolvedValue(true);
    mocks.save.mockRejectedValue(new Error('disk full'));
    await expect(chat.getState().saveConfig({ baseUrl: 'https://other.example/v1', model: 'test' }, 'synthetic-test-key'))
      .rejects.toThrow('save-failed');
    expect(chat.getState().saveError).toBe(true);
    expect(chat.getState().hasKey).toBe(true);
  });

  it('keeps local query results private until approval, then resumes with a tool result', async () => {
    const chat = await store();
    const id = await chat.getState().createConversation();
    const call = { id: 'call_search', name: 'search_tasks', arguments: '{"query":"Plan"}' };
    mocks.stream.mockResolvedValueOnce({ content: '', toolCall: call });
    await chat.getState().send(id, 'Find Plan', 'en');
    const message = chat.getState().data.conversations[0].messages.at(-1)!;
    expect(message.tool).toMatchObject({ call, status: 'pending' });
    expect(JSON.stringify(mocks.stream.mock.calls[0][0].messages)).not.toContain('"tasks"');

    const preview = {
      kind: 'read' as const, action: 'search_tasks', basis: 'current', rows: [],
      total: 1, output: '{"tasks":[{"id":"one","title":"Plan"}],"total":1}',
    };
    mocks.preview.mockReturnValue(preview);
    mocks.stream.mockResolvedValueOnce({ content: 'I found Plan.' });
    await chat.getState().resolveTool(id, message.id, 'en', preview);
    expect(mocks.stream).toHaveBeenCalledTimes(2);
    expect(mocks.stream.mock.calls[1][0].messages.at(-1)).toEqual({
      role: 'tool', tool_call_id: 'call_search', content: preview.output,
    });
    expect(chat.getState().data.conversations[0].messages.at(-1))
      .toMatchObject({ content: 'I found Plan.', status: 'complete' });
  });

  it('persists a confirmed mutation before execution and records undo state', async () => {
    const chat = await store();
    const id = await chat.getState().createConversation();
    const call = { id: 'call_create', name: 'create_task', arguments: '{"title":"test"}' };
    mocks.stream.mockResolvedValueOnce({ content: '', toolCall: call });
    await chat.getState().send(id, 'Create test', 'en');
    const message = chat.getState().data.conversations[0].messages.at(-1)!;
    const request = {
      method: 'POST', path: '/api/v1/projects/inbox/tasks', idempotencyKey: 'fixed',
      body: { title: 'test', scheduledDate: '2026-10-06', priority: 'none' },
    };
    const preview = {
      kind: 'write' as const, action: 'task.create', basis: 'current', rows: [],
      total: 1, request,
    };
    mocks.executeTool.mockResolvedValue({
      mutationId: 'mutation-1', output: '{"ok":true,"mutationId":"mutation-1"}',
    });
    mocks.stream.mockResolvedValueOnce({ content: 'Created.' });
    await chat.getState().resolveTool(id, message.id, 'en', preview);
    expect(mocks.executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed', request }), preview,
    );
    const savedConfirmed = mocks.save.mock.calls
      .map(([data]) => data.conversations[0]?.messages.find((item: { id: string }) => item.id === message.id)?.tool)
      .find((tool) => tool?.status === 'confirmed');
    expect(savedConfirmed?.request.idempotencyKey).toBe('fixed');
    expect(chat.getState().data.conversations[0].messages.find((item) => item.id === message.id)?.tool)
      .toMatchObject({ status: 'done', mutationId: 'mutation-1' });

    mocks.undoTool.mockResolvedValue(undefined);
    await chat.getState().undoTool(id, message.id);
    expect(mocks.undoTool).toHaveBeenCalledWith('mutation-1');
    expect(chat.getState().data.conversations[0].messages.find((item) => item.id === message.id)?.tool?.status)
      .toBe('undone');
  });
});
