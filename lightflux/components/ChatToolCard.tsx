import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useMemo, useState } from 'react';
import type { ChatToolRecord } from '../agent/chat';
import type { ToolPreview, ToolRow } from '../agent/chatTools';
import { chatErrorText, chatToolContent } from '../content/chat';
import { previewChatTool } from '../services/chatTools';
import { chatErrorCode } from '../services/chatTransport';
import { useChatStore } from '../store/chatStore';
import { useTodoStore } from '../store/todoStore';
import type { Language } from '../types/todo';

const Icon = ({ name }: { name: ComponentProps<typeof Ionicons>['name'] }) =>
  <span aria-hidden="true" style={{ display: 'inline-flex' }}>
    <Ionicons name={name} size={16} color="currentColor" />
  </span>;

export default function ChatToolCard({ tool, conversationId, messageId, language }: {
  tool: ChatToolRecord; conversationId: string; messageId: string; language: Language;
}) {
  const t = chatToolContent[language];
  const store = useChatStore();
  const todos = useTodoStore((s) => s.allTodos);
  const projects = useTodoStore((s) => s.projects);
  const ready = useTodoStore((s) => s.persistenceReady);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const pending = tool.status === 'pending' || tool.status === 'confirmed';
  const prepared = useMemo(() => {
    if (!pending) return {};
    try { return { preview: previewChatTool(tool) }; }
    catch (error) { return { error: chatErrorCode(error) }; }
  }, [tool, pending, todos, projects, ready]);
  const preview = prepared.preview;
  const action = preview?.action ?? (tool.request?.body?.action as string) ?? tool.call.name;
  const run = async (operation: () => Promise<void>) => {
    if (working) return;
    setWorking(true); setError(null);
    try { await operation(); } catch (error) { setError(chatErrorCode(error)); }
    finally { setWorking(false); }
  };
  const detail = (row: ToolRow) => [
    row.project, row.scheduledDate, row.priority ? t[row.priority as 'none' | 'low' | 'medium' | 'high'] : '',
    row.completed === undefined ? '' : row.completed ? t.completed : t.active,
    row.trashed ? t.trash : '',
  ].filter(Boolean).join(' · ');
  let receipt: ToolRow | undefined;
  let storedRows: ToolRow[] = [];
  let storedTotal = 0;
  let storedRead = false;
  if (tool.output && ['done', 'undone'].includes(tool.status)) {
    try {
      const output = JSON.parse(tool.output);
      if (output.task && typeof output.task.id === 'string' && typeof output.task.title === 'string') {
        receipt = output.task;
      }
      const rows = output.tasks ?? output.projects;
      if (Array.isArray(rows) && Number.isSafeInteger(output.total) && output.total >= 0) {
        storedRows = rows.filter((row): row is ToolRow =>
          !!row && typeof row.id === 'string' && typeof row.title === 'string').slice(0, 30);
        storedTotal = output.total;
        storedRead = true;
      }
    } catch { /* Validated history; tolerate non-result output. */ }
  }
  const rows = (preview: ToolPreview) => preview.rows.map((row) => {
    const before = preview.before?.find((old) => old.id === row.id);
    return <li key={row.id}>
      {before && <div className="lf-tool-before">{before.title}<small>{detail(before)}</small><span aria-hidden="true">↓</span></div>}
      <strong>{row.title}</strong><small>{detail(row)}</small>
    </li>;
  });
  const disabled = working || !!store.busyId;
  const destructive = action === 'task.delete';
  return <section className="lf-tool-card" aria-label={t.preview}>
    <div className="lf-tool-heading">
      <strong>{t.actions[action] ?? t.preview}</strong>
      <span>{pending ? t.pending : t[tool.status as 'done' | 'cancelled' | 'undone']}</span>
    </div>
    {(preview || storedRead) && <>
      <ul>{preview ? rows(preview) : storedRows.map((row) =>
        <li key={row.id}><strong>{row.title}</strong><small>{detail(row)}</small></li>)}</ul>
      {!(preview?.total ?? storedTotal) && <p className="lf-muted">{tool.status === 'confirmed' ? t.recover : t.empty}</p>}
      {(preview?.total ?? storedTotal) > (preview?.rows.length ?? storedRows.length) &&
        <p className="lf-muted">{t.more.replace('{n}', String(preview?.total ?? storedTotal))}</p>}
      {preview?.kind === 'read' && <p className="lf-muted">{t.shareHint}</p>}
    </>}
    {receipt && <p>{receipt.title}<small className="lf-tool-receipt">{detail(receipt)}</small></p>}
    {pending && destructive && <p className="lf-tool-warning">{t.deleteWarning}</p>}
    {(error || prepared.error) && <p className="lf-notice lf-error" role="alert">{chatErrorText(error ?? prepared.error!, language)}</p>}
    <div className="lf-tool-actions" aria-live="polite">
      {pending && <>
        <button className={destructive ? 'lf-destructive' : 'lf-primary'} disabled={disabled || !preview} onClick={() => void run(() =>
          store.resolveTool(conversationId, messageId, language, preview))}>
          <Icon name={destructive ? 'trash-outline' : preview?.kind === 'read' ? 'eye-outline' : 'checkmark-outline'} />
          {working ? t.working : tool.status === 'confirmed' ? t.retry
            : destructive ? t.confirmDelete : preview?.kind === 'read' ? t.share : t.confirm}
        </button>
        <button className="lf-secondary" disabled={disabled} onClick={() => void run(() =>
          store.resolveTool(conversationId, messageId, language))}><Icon name="close-outline" />{t.cancel}</button>
      </>}
      {tool.status === 'done' && tool.mutationId && <button className="lf-secondary" disabled={disabled}
        onClick={() => void run(() => store.undoTool(conversationId, messageId))}>
        <Icon name="arrow-undo-outline" />{working ? t.working : t.undo}
      </button>}
    </div>
  </section>;
}
