import { create } from 'zustand';

import {
  ChatConfig, ChatConversation, ChatError, ChatState, ChatToolRecord, chatId,
  conversationTitle, emptyChatState, normalizeChatConfig, requestMessages,
} from '../agent/chat';
import { hasChatKey, loadChatState, removeChatKey, saveChatState, storeChatKey } from '../services/chatStorage';
import { chatErrorCode, streamChatTurn } from '../services/chatTransport';
import type { ToolPreview } from '../agent/chatTools';
import { assertToolCancellable, executeChatTool, previewChatTool, undoChatTool } from '../services/chatTools';

interface ChatStore {
  data: ChatState;
  hydrated: boolean;
  loadError: string | null;
  saveError: boolean;
  hasKey: boolean;
  busyId: string | null;
  drafts: Record<string, string>;
  hydrate: () => Promise<void>;
  createConversation: (draft?: string) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setDraft: (id: string, draft: string) => void;
  saveConfig: (config: ChatConfig, key?: string) => Promise<void>;
  removeKey: () => Promise<void>;
  refreshKey: () => Promise<void>;
  send: (id: string, text: string, language: 'zh' | 'en', retry?: boolean, continueTool?: boolean) => Promise<void>;
  resolveTool: (id: string, messageId: string, language: 'zh' | 'en', preview?: ToolPreview) => Promise<void>;
  undoTool: (id: string, messageId: string) => Promise<void>;
  stop: () => void;
}

let hydration: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
let request: AbortController | null = null;

// Serialize edits using the latest state, keeping optimistic data on disk errors
// so that a subsequent retry/quit can persist it instead of discarding it.
function commit(update: (data: ChatState) => ChatState): Promise<void> {
  const write = writes.catch(() => undefined).then(async () => {
    const store = useChatStore.getState();
    if (!store.hydrated || store.loadError) throw new ChatError('history-invalid');
    const data = update(store.data);
    useChatStore.setState({ data });
    try {
      await saveChatState(data);
      useChatStore.setState({ saveError: false });
    } catch {
      useChatStore.setState({ saveError: true });
      throw new ChatError('save-failed');
    }
  });
  writes = write;
  return write;
}

const editConversation = (data: ChatState, id: string, edit: (conversation: ChatConversation) => ChatConversation) => ({
  ...data,
  conversations: data.conversations.map((c) => c.id === id ? edit(c) : c),
});

const editTool = (data: ChatState, id: string, messageId: string, tool: ChatToolRecord) =>
  editConversation(data, id, (c) => ({
    ...c, updatedAt: Date.now(), messages: c.messages.map((m) => m.id === messageId
      ? { ...m, tool, status: 'complete', error: undefined } : m),
  }));
const findTool = (data: ChatState, id: string, messageId: string) => {
  const tool = data.conversations.find((c) => c.id === id)?.messages.find((m) => m.id === messageId)?.tool;
  if (!tool) throw new ChatError('tool-not-found');
  return tool;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  data: emptyChatState(),
  hydrated: false,
  loadError: null,
  saveError: false,
  hasKey: false,
  busyId: null,
  drafts: {},
  hydrate: async () => {
    if (get().hydrated) return;
    if (!hydration) hydration = (async () => {
      try {
        const data = await loadChatState();
        set({ data, hydrated: true, loadError: null });
        await get().refreshKey();
      } catch (error) {
        set({ hydrated: true, loadError: chatErrorCode(error) });
      }
    })().finally(() => { hydration = null; });
    return hydration;
  },
  refreshKey: async () => {
    // A locked/unavailable credential vault must not prevent reading history.
    try { set({ hasKey: await hasChatKey(get().data.config.baseUrl) }); }
    catch { set({ hasKey: false }); }
  },
  createConversation: async (draft = '') => {
    const id = chatId();
    const now = Date.now();
    if (draft) get().setDraft(id, draft);
    await commit((data) => ({
      ...data,
      activeId: id,
      conversations: [{ id, title: '', createdAt: now, updatedAt: now, messages: [] }, ...data.conversations],
    }));
    return id;
  },
  selectConversation: (id) => commit((data) => {
    if (!data.conversations.some((c) => c.id === id)) throw new ChatError('conversation-missing');
    return { ...data, activeId: id };
  }),
  renameConversation: (id, title) => commit((data) =>
    editConversation(data, id, (c) => ({ ...c, title: title.trim().slice(0, 100) || c.title }))),
  deleteConversation: async (id) => {
    if (get().busyId === id) throw new ChatError('busy');
    if (get().data.conversations.find((c) => c.id === id)?.messages.some((m) => m.tool?.status === 'confirmed')) {
      throw new ChatError('tool-unfinished');
    }
    await commit((data) => {
      const conversations = data.conversations.filter((c) => c.id !== id);
      return { ...data, conversations, activeId: data.activeId === id ? conversations[0]?.id ?? null : data.activeId };
    });
    const drafts = { ...get().drafts };
    delete drafts[id];
    set({ drafts });
  },
  setDraft: (id, draft) => set((state) => ({ drafts: { ...state.drafts, [id]: draft } })),
  saveConfig: async (config, key) => {
    if (get().busyId) throw new ChatError('busy');
    const normalized = normalizeChatConfig(config);
    if (key?.trim()) await storeChatKey(normalized.baseUrl, key);
    if (!await hasChatKey(normalized.baseUrl)) throw new ChatError('missing-key');
    try {
      await commit((data) => ({ ...data, config: normalized }));
    } finally {
      // A failed file write keeps the optimistic config. Its already-stored
      // credential must remain usable after the user retries persistence.
      await get().refreshKey();
    }
  },
  removeKey: async () => {
    if (get().busyId) throw new ChatError('busy');
    await removeChatKey(get().data.config.baseUrl);
    set({ hasKey: false });
  },
  send: async (id, text, language, retry = false, continueTool = false) => {
    if (get().busyId) throw new ChatError('busy');
    if (!get().hasKey) throw new ChatError('missing-key');
    const normalized = text.trim();
    if (!retry && !continueTool && (!normalized || normalized.length > 12_000)) throw new ChatError('message-too-long');
    const controller = new AbortController();
    request = controller;
    set({ busyId: id });
    let assistantId: string | null = null;
    try {
      await commit((data) => {
        const conversation = data.conversations.find((c) => c.id === id);
        if (!conversation) throw new ChatError('conversation-missing');
        const now = Date.now();
        let messages = [...conversation.messages];
        if (messages.some((m) => m.tool?.status === 'confirmed')) throw new ChatError('tool-unfinished');
        if (retry) {
          const last = messages.at(-1);
          if (last?.role !== 'assistant' || last.status === 'complete') throw new ChatError('invalid-retry');
          messages = messages.slice(0, -1);
          if (messages.at(-1)?.role !== 'user' && !messages.at(-1)?.tool?.output) throw new ChatError('invalid-retry');
        } else if (continueTool) {
          if (!messages.at(-1)?.tool?.output) throw new ChatError('invalid-retry');
        } else {
          messages = messages.map((m) => m.tool?.status === 'pending'
            ? { ...m, tool: { ...m.tool, status: 'cancelled', output: '{"ok":false,"reason":"superseded_by_user"}' } } : m);
          messages.push({ id: chatId(), role: 'user', content: normalized, createdAt: now, status: 'complete' });
        }
        requestMessages(messages, language);
        assistantId = chatId();
        messages.push({ id: assistantId, role: 'assistant', content: '', createdAt: now, status: 'streaming' });
        return editConversation(data, id, (c) => ({
          ...c, messages, updatedAt: now, title: c.title || conversationTitle(normalized),
        }));
      });
      if (!retry && !continueTool) get().setDraft(id, '');
      const conversation = get().data.conversations.find((c) => c.id === id)!;
      const { content, toolCall } = await streamChatTurn({
        config: get().data.config,
        tools: true,
        messages: requestMessages(conversation.messages, language),
        signal: controller.signal,
        onText: (content) => set((state) => ({
          data: editConversation(state.data, id, (c) => ({
            ...c,
            messages: c.messages.map((m) => m.id === assistantId ? { ...m, content } : m),
          })),
        })),
      });
      await commit((data) => editConversation(data, id, (c) => ({
        ...c, updatedAt: Date.now(),
        messages: c.messages.map((m) => m.id === assistantId ? {
          ...m, content, status: 'complete', ...(toolCall ? { tool: { call: toolCall, status: 'pending' } as ChatToolRecord } : {}),
        } : m),
      })));
    } catch (error) {
      if (!assistantId) throw error;
      const code = chatErrorCode(error);
      await commit((data) => editConversation(data, id, (c) => ({
        ...c, updatedAt: Date.now(),
        messages: c.messages.map((m) => m.id === assistantId
          ? { ...m, status: controller.signal.aborted ? 'stopped' : 'error', error: code } : m),
      })));
    } finally {
      if (request === controller) { request = null; set({ busyId: null }); }
    }
  },
  resolveTool: async (id, messageId, language, preview) => {
    if (get().busyId) throw new ChatError('busy');
    const tool = findTool(get().data, id, messageId);
    if (!['pending', 'confirmed'].includes(tool.status)) throw new ChatError('tool-unfinished');
    set({ busyId: id });
    try {
      let resolved: ChatToolRecord;
      if (!preview) {
        assertToolCancellable(tool);
        resolved = { ...tool, status: 'cancelled', output: '{"ok":false,"reason":"user_cancelled"}' };
      } else if (preview.kind === 'read') {
        const current = previewChatTool(tool);
        if (current.basis !== preview.basis || current.output !== preview.output) throw new ChatError('tool-conflict');
        resolved = { ...tool, status: 'done', output: current.output };
      } else {
        const confirmed: ChatToolRecord = { ...tool, status: 'confirmed', request: tool.request ?? preview.request };
        await commit((data) => editTool(data, id, messageId, confirmed));
        const result = await executeChatTool(confirmed, preview);
        resolved = { ...confirmed, ...result, status: 'done' };
      }
      await commit((data) => editTool(data, id, messageId, resolved));
    } finally { set({ busyId: null }); }
    if (get().hasKey) await get().send(id, '', language, false, true);
  },
  undoTool: async (id, messageId) => {
    if (get().busyId) throw new ChatError('busy');
    const tool = findTool(get().data, id, messageId);
    if (tool.status !== 'done' || !tool.mutationId) throw new ChatError('tool-undo-conflict');
    set({ busyId: id });
    try {
      await undoChatTool(tool.mutationId);
      await commit((data) => editTool(data, id, messageId, {
        ...tool, status: 'undone', output: '{"ok":true,"undone":true}',
      }));
    } finally { set({ busyId: null }); }
  },
  stop: () => request?.abort(),
}));

export async function flushChatState(): Promise<void> {
  if (!useChatStore.getState().hydrated || useChatStore.getState().loadError) return;
  await commit((data) => data);
}
