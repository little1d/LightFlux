import { describe, expect, it } from 'vitest';
import { emptyChatState, migrateLegacyChat, normalizeChatConfig, parseChatState, requestMessages } from '../agent/chat';
import type { ChatMessage } from '../agent/chat';
import { createChatStream } from '../services/chatTransport';

describe('chat persistence and compatibility', () => {
  it('imports every legacy turn, including errors, without executing old proposals', () => {
    const turns = Array.from({ length: 120 }, (_, i) => ({
      id: `turn-${i}`, role: i % 2 ? 'assistant' : 'user',
      message: `message ${i}`, createdAt: i, error: i === 119,
      proposal: { operations: [{ type: 'task.trash' }] },
    }));
    const migrated = migrateLegacyChat(JSON.stringify({ schemaVersion: 1, turns }));
    expect(migrated.conversations[0].messages).toHaveLength(120);
    expect(migrated.conversations[0].messages.at(-1)?.status).toBe('error');
    expect(migrated.conversations[0].messages[0]).not.toHaveProperty('proposal');
    expect(migrated.activeId).toBe('legacy-conversation');
  });

  it('blocks corrupt or future history instead of dropping messages', () => {
    expect(() => parseChatState('broken')).toThrow('history-invalid');
    expect(() => parseChatState(JSON.stringify({ ...emptyChatState(), schemaVersion: 2 }))).toThrow();
    expect(() => migrateLegacyChat('{"schemaVersion":1,"turns":[{"id":"a"}]}')).toThrow();
    const state = emptyChatState();
    state.conversations = [{ id: 'a', title: '', createdAt: 1, updatedAt: 1, messages: [] }];
    state.activeId = 'missing';
    expect(() => parseChatState(JSON.stringify(state))).toThrow();
  });

  it('preserves partial replies and recovers in-flight responses as interrupted', () => {
    const state = emptyChatState();
    state.conversations = [{
      id: 'a', title: 'Plan', createdAt: 1, updatedAt: 2,
      messages: [{ id: 'm', role: 'assistant', createdAt: 2, content: 'partial', status: 'streaming' }],
    }];
    const parsed = parseChatState(JSON.stringify(state));
    expect(parsed.conversations[0].messages[0]).toMatchObject({ content: 'partial', status: 'interrupted' });
  });

  it('validates optional tool state and sends only approved tool output', () => {
    const state = emptyChatState();
    const tool = {
      call: { id: 'call_1', name: 'search_tasks', arguments: '{"query":"Plan"}' },
      status: 'pending' as const,
    };
    state.conversations = [{
      id: 'a', title: 'Plan', createdAt: 1, updatedAt: 2,
      messages: [
        { id: 'u', role: 'user', content: 'Find Plan', createdAt: 1, status: 'complete' },
        { id: 'm', role: 'assistant', content: '', createdAt: 2, status: 'complete', tool },
      ],
    }];
    state.activeId = 'a';
    expect(parseChatState(JSON.stringify(state)).conversations[0].messages[1].tool?.status).toBe('pending');
    expect(JSON.stringify(requestMessages(state.conversations[0].messages, 'en'))).not.toContain('call_1');

    state.conversations[0].messages[1].tool = {
      ...tool, status: 'done', output: '{"tasks":[{"id":"one","title":"Plan"}],"total":1}',
    };
    const sent = requestMessages(state.conversations[0].messages, 'en');
    expect(sent.at(-2)).toMatchObject({ role: 'assistant', tool_calls: [{ id: 'call_1' }] });
    expect(sent.at(-1)).toEqual({
      role: 'tool', tool_call_id: 'call_1',
      content: '{"tasks":[{"id":"one","title":"Plan"}],"total":1}',
    });
    const invalid = structuredClone(state);
    invalid.conversations[0].messages[1].tool!.status = 'confirmed';
    expect(() => parseChatState(JSON.stringify(invalid))).toThrow('history-invalid');
  });
});

describe('provider configuration and request scope', () => {
  it('preserves explicit completion endpoints and their trailing slash', () => {
    expect(normalizeChatConfig({
      baseUrl: ' https://example.com/api/crawl/ ', model: ' model ', urlMode: 'endpoint',
    })).toEqual({ baseUrl: 'https://example.com/api/crawl/', model: 'model', urlMode: 'endpoint' });
    expect(normalizeChatConfig({
      baseUrl: 'https://example.com/v1/chat/completions', model: 'model', urlMode: 'endpoint',
    }).baseUrl).toBe('https://example.com/v1/chat/completions');
  });

  it('reads older configs as base URLs and rejects unsupported URL modes without losing history', () => {
    const old = emptyChatState();
    expect(parseChatState(JSON.stringify(old)).config).not.toHaveProperty('urlMode');
    const full = { ...old, config: { ...old.config, urlMode: 'endpoint' } };
    expect(parseChatState(JSON.stringify(full)).config.urlMode).toBe('endpoint');
    const unsupported = { ...old, config: { ...old.config, urlMode: 'unknown' } };
    expect(() => parseChatState(JSON.stringify(unsupported))).toThrow('history-invalid');
  });

  it('normalizes pasted completion URLs and permits only TLS or loopback', () => {
    expect(normalizeChatConfig({ baseUrl: ' https://example.com/v1/chat/completions/ ', model: ' model ' }))
      .toEqual({ baseUrl: 'https://example.com/v1', model: 'model' });
    expect(normalizeChatConfig({ baseUrl: 'http://localhost:1234/v1', model: 'local' }).baseUrl)
      .toBe('http://localhost:1234/v1');
    for (const baseUrl of ['http://example.com', 'https://u:p@example.com', 'https://example.com?k=secret', 'file:///tmp/a']) {
      expect(() => normalizeChatConfig({ baseUrl, model: 'model' })).toThrow('invalid-url');
    }
  });

  it('only sends recent successful conversation turns; never errors or other sessions', () => {
    const messages: ChatMessage[] = Array.from({ length: 44 }, (_, i) => ({
      id: `${i}`, role: i % 2 ? 'assistant' : 'user', content: `turn ${i}`, status: 'complete', createdAt: i,
    }));
    messages.push({ id: 'failed', role: 'assistant', content: 'private network error', status: 'error', createdAt: 99 });
    const sent = requestMessages(messages, 'zh');
    expect(sent).toHaveLength(41);
    expect(sent[1].content).toBe('turn 4');
    expect(JSON.stringify(sent)).not.toContain('private network error');
    expect(sent[0].content).toContain('explicitly approved tool results');
  });
});

describe('stream parser', () => {
  it('parses fragmented CRLF frames, comments, and multiple events', () => {
    const output: string[] = [];
    const parser = createChatStream((text) => output.push(text));
    const raw = ': keepalive\r\n\r\ndata: {"choices":[{"delta":{"content":"你好"}}]}\r\n\r\n' +
      'data: {"choices":[{"delta":{"content":"世界"},"finish_reason":"stop"}]}\r\n\r\ndata: [DONE]\r\n\r\n';
    for (const char of raw) parser.push(char);
    expect(parser.finish()).toBe('你好世界');
    expect(output).toEqual(['你好', '你好世界']);
  });

  it('does not present truncated, malformed, or empty replies as complete', () => {
    const partial = createChatStream(() => {});
    partial.push('data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n');
    expect(() => partial.finish()).toThrow('interrupted');
    const malformed = createChatStream(() => {});
    expect(() => malformed.push('data: broken\n\n')).toThrow('invalid-response');
    const empty = createChatStream(() => {});
    empty.push('data: [DONE]\n\n');
    expect(() => empty.finish()).toThrow('empty-response');
    const limit = createChatStream(() => {});
    expect(() => limit.push('data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n')).toThrow('response-truncated');
  });
});
