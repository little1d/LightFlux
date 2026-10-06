import { Channel, invoke, isTauri } from '@tauri-apps/api/core';

import { ChatConfig, ChatError, ChatRequestMessage, ChatToolCall, chatId, normalizeChatConfig } from '../agent/chat';
import { CHAT_TOOLS, toolArguments } from '../agent/chatTools';
import { webChatKey } from './chatStorage';

export interface ChatRequest {
  config: ChatConfig;
  messages: ChatRequestMessage[];
  tools?: boolean;
  signal: AbortSignal;
  onText: (text: string) => void;
}

/** SSE events can straddle network chunks, including inside UTF-8 characters. */
export function createChatStream(onText: (text: string) => void) {
  let buffer = '';
  let content = '';
  let done = false;
  let toolFinished = false;
  let call: ChatToolCall | undefined;
  const event = (raw: string) => {
    const data = raw.split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart()).join('\n').trim();
    if (!data || done) return;
    if (data === '[DONE]') { done = true; return; }
    let value;
    try { value = JSON.parse(data); } catch { throw new ChatError('invalid-response'); }
    if (value.error) throw new ChatError('provider-error');
    const choice = value.choices?.[0];
    const text = choice?.delta?.content;
    const calls = choice?.delta?.tool_calls;
    if (calls !== undefined) {
      if (!Array.isArray(calls) || calls.length > 1) throw new ChatError('tool-multiple');
      for (const delta of calls) {
        if (delta.index !== 0) throw new ChatError('tool-multiple');
        call ??= { id: '', name: '', arguments: '' };
        if (delta.type !== undefined && delta.type !== 'function') throw new ChatError('tool-unsupported');
        for (const [field, value] of [
          ['id', delta.id], ['name', delta.function?.name], ['arguments', delta.function?.arguments],
        ] as const) {
          if (value !== undefined) {
            if (typeof value === 'string') {
              call[field] += value;
            } else if (
              field === 'arguments' && !call.arguments &&
              value && typeof value === 'object' && !Array.isArray(value)
            ) {
              call.arguments = JSON.stringify(value);
            } else {
              throw new ChatError('invalid-response');
            }
          }
        }
        if (call.arguments.length > 16_000 || call.id.length > 200 || call.name.length > 100) throw new ChatError('tool-arguments');
      }
    }
    if (typeof text === 'string') {
      content += text;
      if (content.length > 200_000) throw new ChatError('response-too-long');
      onText(content);
    }
    if (choice?.finish_reason === 'length') throw new ChatError('response-truncated');
    if (choice?.finish_reason === 'content_filter') throw new ChatError('content-filter');
    if (choice?.finish_reason === 'tool_calls') toolFinished = true;
    if (choice?.finish_reason) done = true;
  };
  const finishTurn = (): ChatTurn => {
    if (buffer.trim()) { event(buffer); buffer = ''; }
    if (call) {
      if (!done || !toolFinished) throw new ChatError('interrupted');
      if (!/^[\w-]{1,200}$/.test(call.id)) throw new ChatError('tool-arguments');
      toolArguments(call);
    } else if (!content.trim()) throw new ChatError('empty-response');
    if (!done) throw new ChatError('interrupted');
    return { content, ...(call ? { toolCall: call } : {}) };
  };
  return {
    push(chunk: string) {
      buffer += chunk;
      buffer = buffer.replace(/\r\n/g, '\n');
      if (buffer.length > 1_000_000) throw new ChatError('invalid-response');
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        event(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
      }
    },
    finish() {
      return finishTurn().content;
    },
    finishTurn,
  };
}

export const chatErrorCode = (error: unknown): string => {
  if (error instanceof ChatError) return error.code;
  if (typeof error === 'string' && /^[a-z][a-z0-9-]*$/.test(error)) return error;
  return 'network';
};

export interface ChatTurn { content: string; toolCall?: ChatToolCall }

export async function streamChat(input: ChatRequest): Promise<string> {
  return (await streamChatTurn(input)).content;
}

export async function streamChatTurn({ config, messages, signal, onText, tools }: ChatRequest): Promise<ChatTurn> {
  const normalized = normalizeChatConfig(config);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const parser = createChatStream(onText);
  const decoder = new TextDecoder();
  const body = { model: normalized.model, messages, stream: true, ...(tools ? { tools: CHAT_TOOLS, parallel_tool_calls: false } : {}) };
  if (isTauri()) {
    const id = chatId();
    const channel = new Channel<number[]>();
    let parseError: unknown;
    channel.onmessage = (bytes) => {
      if (signal.aborted || parseError) return;
      try {
        parser.push(decoder.decode(new Uint8Array(bytes), { stream: true }));
      } catch (error) {
        parseError = error;
        void invoke('cancel_chat_request', { id }).catch(() => undefined);
      }
    };
    const cancel = () => { void invoke('cancel_chat_request', { id }).catch(() => undefined); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      await invoke('stream_chat', { id, baseUrl: normalized.baseUrl, urlMode: normalized.urlMode, body, onChunk: channel });
      if (parseError) throw parseError;
    } catch (error) {
      throw parseError ?? error;
    } finally {
      signal.removeEventListener('abort', cancel);
    }
  } else {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 120_000);
    try {
      const url = normalized.urlMode === 'endpoint' ? normalized.baseUrl : `${normalized.baseUrl}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${webChatKey(normalized.baseUrl)}` },
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok) throw new ChatError(`http-${response.status}`);
      if (!response.body) throw new ChatError('empty-response');
      const reader = response.body.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          parser.push(decoder.decode(value, { stream: true }));
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    } catch (error) {
      if (controller.signal.aborted && !signal.aborted) throw new ChatError('timeout');
      // Browsers deliberately hide CORS/TLS/DNS details from fetch callers.
      if (error instanceof TypeError) throw new ChatError('browser-network');
      throw error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
  }
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  parser.push(decoder.decode());
  return parser.finishTurn();
}
