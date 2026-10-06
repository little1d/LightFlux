import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyChatState } from '../agent/chat';

const mocks = vi.hoisted(() => ({
  desktop: false, invoke: vi.fn(), records: new Map<string, string>(), session: new Map<string, string>(),
}));
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => mocks.desktop, invoke: mocks.invoke,
}));
vi.mock('../services/indexedDbStorage', () => ({
  loadWebState: async (key: string) => mocks.records.get(key) ?? null,
  saveWebState: async (key: string, value: string) => { mocks.records.set(key, value); },
}));
import { hasChatKey, loadChatState, removeChatKey, storeChatKey } from '../services/chatStorage';

describe('chat storage boundaries', () => {
  beforeEach(() => {
    mocks.desktop = false;
    mocks.invoke.mockReset();
    mocks.records.clear();
    mocks.session.clear();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => mocks.session.get(key) ?? null,
      setItem: (key: string, value: string) => mocks.session.set(key, value),
      removeItem: (key: string) => mocks.session.delete(key),
    });
  });

  it('keeps desktop history authoritative and fails closed on corruption', async () => {
    mocks.desktop = true;
    mocks.invoke.mockResolvedValue('broken');
    mocks.records.set('lightflux.chat.v1', JSON.stringify(emptyChatState()));
    await expect(loadChatState()).rejects.toThrow('history-invalid');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('migrates WebView history to a desktop file without removing the source', async () => {
    mocks.desktop = true;
    mocks.invoke.mockResolvedValue(null);
    const raw = JSON.stringify(emptyChatState());
    mocks.records.set('lightflux.chat.v1', raw);
    expect(await loadChatState()).toEqual(emptyChatState());
    expect(mocks.invoke).toHaveBeenCalledWith('save_chat_state', { content: raw });
    expect(mocks.records.get('lightflux.chat.v1')).toBe(raw);
  });

  it('keeps preview keys out of durable history and isolates keys by endpoint', async () => {
    await storeChatKey('https://one.example', 'synthetic-test-key');
    expect(await hasChatKey('https://one.example')).toBe(true);
    expect(await hasChatKey('https://two.example')).toBe(false);
    expect(mocks.records.size).toBe(0);
    await removeChatKey('https://one.example');
    expect(await hasChatKey('https://one.example')).toBe(false);
  });
});
