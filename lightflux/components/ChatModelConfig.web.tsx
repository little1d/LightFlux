import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';

import { DEFAULT_CHAT_CONFIG, type ChatConfig } from '../agent/chat';
import { chatContent, chatErrorText } from '../content/chat';
import { chatErrorCode, streamChat } from '../services/chatTransport';
import { useChatStore } from '../store/chatStore';
import { useTodoStore } from '../store/todoStore';
import { useConfirmation } from './ui/ConfirmationProvider';

export default function ChatModelConfig() {
  const language = useTodoStore((s) => s.language);
  const t = chatContent[language];
  const store = useChatStore();
  const confirm = useConfirmation();
  const [baseUrl, setBaseUrl] = useState(store.data.config.baseUrl);
  const [model, setModel] = useState(store.data.config.model);
  const [urlMode, setUrlMode] = useState<NonNullable<ChatConfig['urlMode']>>(store.data.config.urlMode ?? 'base');
  const [key, setKey] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState<'saving' | 'testing' | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const hasSavedKey = store.hasKey && baseUrl === store.data.config.baseUrl;
  const dirty = baseUrl !== store.data.config.baseUrl || model !== store.data.config.model ||
    urlMode !== (store.data.config.urlMode ?? 'base') || !!key;
  const disabled = !!busy || !!store.busyId || !store.hydrated || !!store.loadError;
  const provider = urlMode === 'endpoint' ? 'custom' : baseUrl === DEFAULT_CHAT_CONFIG.baseUrl ? 'openai'
    : baseUrl === 'https://api.deepseek.com/v1' ? 'deepseek' : 'custom';

  useEffect(() => {
    setBaseUrl(store.data.config.baseUrl);
    setModel(store.data.config.model);
    setUrlMode(store.data.config.urlMode ?? 'base');
  }, [store.data.config.baseUrl, store.data.config.model, store.data.config.urlMode]);
  useEffect(() => () => request.current?.abort(), []);

  const resetStatus = () => { setStatus(''); setError(''); };
  const save = async () => {
    resetStatus();
    setBusy('saving');
    try {
      await store.saveConfig({ baseUrl, model, urlMode }, key || undefined);
      setKey(''); setVisible(false); setStatus(t.saved);
    } catch (cause) { setError(chatErrorText(chatErrorCode(cause), language)); }
    finally { setBusy(null); }
  };
  const test = async () => {
    resetStatus();
    setBusy('testing');
    const controller = new AbortController();
    request.current = controller;
    try {
      await streamChat({
        config: store.data.config, signal: controller.signal, onText: () => undefined,
        messages: [{ role: 'user', content: 'Reply with only OK.' }],
      });
      setStatus(t.connected);
    } catch (cause) {
      if (!controller.signal.aborted) setError(chatErrorText(chatErrorCode(cause), language));
    } finally { request.current = null; setBusy(null); }
  };

  return (
    <section className="lf-chat-config" aria-label={t.settings}>
      <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="lf-ai-fields">
          <label className="lf-ai-field">
            <span>{t.provider}</span>
            <select autoFocus value={provider} disabled={disabled} onChange={(e) => {
              resetStatus(); setKey(''); setUrlMode('base');
              if (e.target.value === 'openai') { setBaseUrl(DEFAULT_CHAT_CONFIG.baseUrl); setModel(DEFAULT_CHAT_CONFIG.model); }
              else if (e.target.value === 'deepseek') { setBaseUrl('https://api.deepseek.com/v1'); setModel('deepseek-chat'); }
              else { setBaseUrl(''); setModel(''); }
            }}>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="custom">{t.custom}</option>
            </select>
          </label>
          <label className="lf-ai-field">
            <span>{t.model}</span>
            <input value={model} disabled={disabled} required maxLength={200} placeholder="gpt-4o-mini" autoCapitalize="none" spellCheck={false}
              onChange={(e) => { setModel(e.target.value); resetStatus(); }} />
          </label>
          <div className="lf-ai-field lf-ai-field-wide">
            <div className="lf-ai-url-heading">
              <label htmlFor="ai-base-url">{t.baseUrl}</label>
              {provider === 'custom' && <select aria-label={t.urlMode} value={urlMode} disabled={disabled}
                onChange={(e) => { setUrlMode(e.target.value === 'endpoint' ? 'endpoint' : 'base'); resetStatus(); }}>
                <option value="base">{t.baseUrlMode}</option>
                <option value="endpoint">{t.endpointMode}</option>
              </select>}
            </div>
            <input id="ai-base-url" value={baseUrl} disabled={disabled} required type="url"
              placeholder={urlMode === 'endpoint' ? 'https://api.example.com/v1/chat/completions' : 'https://api.example.com/v1'} autoCapitalize="none" spellCheck={false}
              onChange={(e) => { setBaseUrl(e.target.value); resetStatus(); }} />
          </div>
          <div className="lf-ai-field lf-ai-field-wide">
            <label htmlFor="ai-api-key">{t.apiKey} <span className="lf-muted">· {hasSavedKey ? t.keySaved : t.keyMissing}</span></label>
            <div className="lf-ai-key">
              <input id="ai-api-key" type={visible ? 'text' : 'password'} value={key} disabled={disabled} maxLength={4096}
                placeholder={hasSavedKey ? t.keyReplacePlaceholder : t.keyPlaceholder} autoComplete="off" autoCapitalize="none" spellCheck={false}
                onChange={(e) => { setKey(e.target.value); resetStatus(); }} />
              <button type="button" className="lf-icon" aria-label={visible ? t.hideKey : t.showKey} title={visible ? t.hideKey : t.showKey}
                onClick={() => setVisible(!visible)}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} color="currentColor" size={18} /></button>
            </div>
          </div>
        </div>
        <div className="lf-ai-settings-actions">
          <button type="submit" className="lf-primary" disabled={disabled}>{busy === 'saving' ? t.saving : t.saveSettings}</button>
          <button type="button" className="lf-secondary" disabled={disabled || dirty || !store.hasKey} onClick={() => void test()}>{busy === 'testing' ? t.testing : t.test}</button>
          {hasSavedKey && <button type="button" className="lf-danger" disabled={disabled} onClick={() => confirm({
            title: t.removeKeyTitle, message: t.removeKeyHint, cancelText: t.cancel, confirmText: t.removeKey,
            onConfirm: () => {
              resetStatus();
              void store.removeKey().then(() => { setKey(''); setStatus(t.keyMissing); })
                .catch((cause) => setError(chatErrorText(chatErrorCode(cause), language)));
            },
          })}>{t.removeKey}</button>}
        </div>
        {error && <p className="lf-notice lf-error lf-ai-settings-status" role="alert">{error}</p>}
        {status && <p className="lf-ai-settings-status" role="status">{status}</p>}
      </form>
    </section>
  );
}
