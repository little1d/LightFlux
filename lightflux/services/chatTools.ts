import { ChatError } from '../agent/chat';
import type { ChatToolRecord } from '../agent/chat';
import { prepareChatTool, taskRow, validToolRequest } from '../agent/chatTools';
import type { ToolPreview } from '../agent/chatTools';
import { flushAppState, persistedState, persistedStoreSlice, useTodoStore } from '../store/todoStore';
import type { Todo } from '../types/todo';
import { executeLocalRequest, stateFingerprint } from './localWorkspace';

function workspace() {
  const store = useTodoStore.getState();
  if (!store.isHydrated || !store.persistenceReady) throw new ChatError('tool-workspace');
  return persistedState(store);
}

export function previewChatTool(record: ChatToolRecord): ToolPreview {
  return prepareChatTool(workspace(), record);
}

export function assertToolCancellable(record: ChatToolRecord) {
  if (record.request && workspace().localAutomation?.replays[record.request.idempotencyKey!]) {
    throw new ChatError('tool-unfinished');
  }
}

/** A confirmation is persisted before this function publishes a transaction. */
export async function executeChatTool(record: ChatToolRecord, preview: ToolPreview) {
  if (record.status !== 'confirmed' || !validToolRequest(record.request) ||
    JSON.stringify(record.request) !== JSON.stringify(preview.request)) throw new ChatError('tool-unconfirmed');
  const state = workspace();
  const replay = state.localAutomation?.replays[record.request.idempotencyKey!];
  if (!replay && stateFingerprint(state) !== preview.basis) throw new ChatError('tool-conflict');
  let transaction;
  try { transaction = executeLocalRequest(state, record.request, { actorId: 'xiaoguang' }); }
  catch { throw new ChatError('tool-conflict'); }
  useTodoStore.setState(persistedStoreSlice(transaction.state));
  try { await flushAppState(); }
  catch { throw new ChatError('tool-save-failed'); }
  const mutationId = String(transaction.result.mutationId);
  const undone = !!transaction.state.localAutomation?.mutations.find((m) => m.id === mutationId)?.undoneAt;
  const task = transaction.result.task as Todo;
  return {
    mutationId,
    output: JSON.stringify({ ok: true, undone, task: taskRow(task, transaction.state), mutationId }),
  };
}

export async function undoChatTool(mutationId: string) {
  const state = workspace();
  // Retry after a disk or chat-save failure must not undo a different operation.
  const alreadyUndone = state.localAutomation?.mutations.some((m) => m.id === mutationId && m.undoneAt !== null);
  if (!alreadyUndone) {
    let transaction;
    try {
      transaction = executeLocalRequest(state, {
        method: 'POST', path: `/api/v1/mutations/${encodeURIComponent(mutationId)}/undo`,
      }, { actorId: 'xiaoguang' });
    } catch { throw new ChatError('tool-undo-conflict'); }
    useTodoStore.setState(persistedStoreSlice(transaction.state));
  }
  try { await flushAppState(); }
  catch { throw new ChatError('tool-save-failed'); }
}
