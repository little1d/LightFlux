import { invoke, isTauri } from '@tauri-apps/api/core';

import { ChatError, ChatState, migrateLegacyChat, parseChatState } from '../agent/chat';
import { loadWebState, saveWebState } from './indexedDbStorage';

const STORAGE_KEY = 'lightflux.chat.v1';
const LEGACY_KEY = 'lightflux.agent-runtime.v1';

export async function loadChatState(): Promise<ChatState> {
  if (isTauri()) {
    const raw = await invoke<string | null>('load_chat_state');
    if (raw !== null) return parseChatState(raw);
  }
  // Fail closed: falling back after an IndexedDB error could make an older
  // snapshot authoritative on the next launch and silently lose a conversation.
  const web = await loadWebState(STORAGE_KEY, { strict: true });
  const state = web !== null
    ? parseChatState(web)
    : migrateLegacyChat(await loadWebState(LEGACY_KEY, { strict: true }));
  // Keep the WebView source and legacy runtime intact for recovery.
  if (isTauri()) await saveChatState(state);
  return state;
}

export async function saveChatState(state: ChatState): Promise<void> {
  const content = JSON.stringify(state);
  if (isTauri()) await invoke('save_chat_state', { content });
  else await saveWebState(STORAGE_KEY, content, { strict: true });
}

const sessionKey = (baseUrl: string) => `lightflux.chat-key:${baseUrl}`;

export async function hasChatKey(baseUrl: string): Promise<boolean> {
  if (isTauri()) return invoke<boolean>('has_chat_key', { baseUrl });
  return !!sessionStorage.getItem(sessionKey(baseUrl));
}

export async function storeChatKey(baseUrl: string, key: string): Promise<void> {
  const normalized = key.trim();
  if (!normalized || normalized.length > 4096 || /[^\x21-\x7e]/.test(normalized)) {
    throw new ChatError('invalid-key');
  }
  if (isTauri()) await invoke('store_chat_key', { baseUrl, key: normalized });
  else sessionStorage.setItem(sessionKey(baseUrl), normalized);
}

export async function removeChatKey(baseUrl: string): Promise<void> {
  if (isTauri()) await invoke('remove_chat_key', { baseUrl });
  else sessionStorage.removeItem(sessionKey(baseUrl));
}

export function webChatKey(baseUrl: string): string {
  const key = sessionStorage.getItem(sessionKey(baseUrl));
  if (!key) throw new ChatError('missing-key');
  return key;
}
