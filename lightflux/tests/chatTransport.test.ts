import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ desktop: false, invoke: vi.fn(), key: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => mocks.desktop,
  invoke: mocks.invoke,
  Channel: class { onmessage?: (bytes: number[]) => void; },
}));
vi.mock('../services/chatStorage', () => ({ webChatKey: mocks.key }));

import { ChatError, type ChatConfig } from '../agent/chat';
import { chatErrorText } from '../content/chat';
import { chatErrorCode, createChatStream, streamChat, streamChatTurn } from '../services/chatTransport';

const sse = 'data: {"choices":[{"delta":{"content":"OK"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';
const request = (config: ChatConfig) => streamChat({
  config, messages: [{ role: 'user', content: 'Reply with only OK.' }],
  signal: new AbortController().signal, onText: () => {},
});

beforeEach(() => {
  mocks.desktop = false;
  mocks.invoke.mockReset();
  mocks.key.mockReset().mockReturnValue('synthetic-test-key');
});
afterEach(() => vi.unstubAllGlobals());

describe('custom provider transport', () => {
  it.each([
    [{ baseUrl: 'https://example.com/v1', model: 'test' }, 'https://example.com/v1/chat/completions'],
    [{ baseUrl: 'https://example.com/api/crawl', model: 'test', urlMode: 'endpoint' }, 'https://example.com/api/crawl'],
    [{ baseUrl: 'https://example.com/api/crawl/', model: 'test', urlMode: 'endpoint' }, 'https://example.com/api/crawl/'],
  ] satisfies [ChatConfig, string][])('uses the configured URL and sends standard Bearer/SSE requests (%j)', async (config, url) => {
    const fetch = vi.fn().mockResolvedValue(new Response(sse));
    vi.stubGlobal('fetch', fetch);
    expect(await request(config)).toBe('OK');
    expect(fetch).toHaveBeenCalledExactlyOnceWith(url, expect.objectContaining({
      method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-test-key' },
      body: JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'Reply with only OK.' }], stream: true }),
    }));
    expect(mocks.key).toHaveBeenCalledWith(config.baseUrl);
  });

  it('gives an actionable browser error when fetch cannot expose a CORS/network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await request({ baseUrl: 'https://example.com/v1', model: 'test' }).catch(e => e);
    expect(error).toBeInstanceOf(ChatError);
    expect(chatErrorCode(error)).toBe('browser-network');
    expect(chatErrorText(chatErrorCode(error), 'zh')).toContain('跨域');
    expect(chatErrorText(chatErrorCode(error), 'en')).toContain('desktop');
  });

  it('retains HTTP status and never exposes provider response bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('sensitive provider body', { status: 400 })));
    const error = await request({ baseUrl: 'https://example.com/v1', model: 'test' }).catch(e => e);
    expect(chatErrorCode(error)).toBe('http-400');
    expect(chatErrorText(chatErrorCode(error), 'zh')).toContain('400');
    expect(chatErrorText(chatErrorCode(error), 'zh')).not.toContain('sensitive');
  });

  it('passes endpoint mode to the desktop transport without exposing the credential', async () => {
    mocks.desktop = true;
    mocks.invoke.mockImplementation(async (_command, { onChunk }) => {
      onChunk.onmessage([...new TextEncoder().encode(sse)]);
    });
    expect(await request({ baseUrl: 'https://example.com/api/crawl', model: 'test', urlMode: 'endpoint' })).toBe('OK');
    expect(mocks.invoke).toHaveBeenCalledWith('stream_chat', expect.objectContaining({
      baseUrl: 'https://example.com/api/crawl', urlMode: 'endpoint',
    }));
    expect(mocks.key).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.invoke.mock.calls)).not.toContain('synthetic-test-key');
  });

  it('sends standard function tools only when task capabilities are requested', async () => {
    const toolSse = 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"create_task","arguments":"{\\"title\\":\\"test\\"}"}}]},"finish_reason":"tool_calls"}]}\n\ndata: [DONE]\n\n';
    const fetch = vi.fn().mockResolvedValue(new Response(toolSse));
    vi.stubGlobal('fetch', fetch);
    const turn = await streamChatTurn({
      config: { baseUrl: 'https://example.com/v1', model: 'test' },
      messages: [{ role: 'user', content: 'Create test' }],
      signal: new AbortController().signal, onText: () => {}, tools: true,
    });
    expect(turn.toolCall).toEqual({ id: 'call_1', name: 'create_task', arguments: '{"title":"test"}' });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.parallel_tool_calls).toBe(false);
    expect(body.tools.map((item: { function: { name: string } }) => item.function.name))
      .toEqual(['search_tasks', 'list_projects', 'create_task', 'change_task']);
    expect(body.tools.at(-1).function.parameters.properties.action.enum).toContain('delete');
  });
});

describe('tool call stream parser', () => {
  it('reassembles fragmented tool call fields without exposing a partial call', () => {
    const parser = createChatStream(() => {});
    parser.push('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_","function":{"name":"create_","arguments":"{\\"title\\":"}}]}}]}\n\n');
    parser.push('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"1","function":{"name":"task","arguments":"\\"test\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n');
    parser.push('data: [DONE]\n\n');
    expect(parser.finishTurn()).toEqual({
      content: '', toolCall: { id: 'call_1', name: 'create_task', arguments: '{"title":"test"}' },
    });
  });

  it('accepts providers that return complete function arguments as an object', () => {
    const parser = createChatStream(() => {});
    parser.push('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"delete_1","type":"function","function":{"name":"change_task","arguments":{"task":"test","action":"delete"}}}]},"finish_reason":"tool_calls"}]}\n\n');
    parser.push('data: [DONE]\n\n');
    expect(parser.finishTurn()).toEqual({
      content: '',
      toolCall: {
        id: 'delete_1',
        name: 'change_task',
        arguments: '{"task":"test","action":"delete"}',
      },
    });
  });

  it('rejects multiple, truncated, and unsupported tool calls', () => {
    const multiple = createChatStream(() => {});
    expect(() => multiple.push('data: {"choices":[{"delta":{"tool_calls":[{"index":1,"id":"b","function":{"name":"create_task","arguments":"{}"}}]}}]}\n\n'))
      .toThrow('tool-multiple');
    const truncated = createChatStream(() => {});
    truncated.push('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"a","function":{"name":"create_task","arguments":"{}"}}]}}]}\n\n');
    expect(() => truncated.finishTurn()).toThrow('interrupted');
    const unknown = createChatStream(() => {});
    unknown.push('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"a","function":{"name":"run_shell","arguments":"{}"}}]},"finish_reason":"tool_calls"}]}\n\n');
    expect(() => unknown.finishTurn()).toThrow('tool-unsupported');
  });
});
