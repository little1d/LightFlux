import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  AgentAuditRecord,
  AgentConversationTurn,
  AgentUndoToken,
  PersistedAgentRuntime,
} from '../agent/types';
import { TaskEvent } from '../types/todo';
import { loadWebState, saveWebState } from './indexedDbStorage';

const STORAGE_KEY = 'lightflux.agent-runtime.v1';
const MAX_TURNS = 100;
const MAX_AUDIT_RECORDS = 100;
const runtimeFile = () =>
  new File(Paths.document, 'lightflux-agent-runtime.json');

const emptyRuntime = (): PersistedAgentRuntime => ({
  schemaVersion: 1,
  conversationId: null,
  turns: [],
  auditRecords: [],
  undoToken: null,
  undoTaskEvents: null,
});

const normalizeTurns = (value: unknown): AgentConversationTurn[] =>
  (Array.isArray(value) ? value : [])
    .filter(
      (turn): turn is AgentConversationTurn =>
        Boolean(
          turn &&
            typeof turn === 'object' &&
            typeof turn.id === 'string' &&
            (turn.role === 'user' || turn.role === 'assistant') &&
            typeof turn.message === 'string' &&
            turn.message.length <= 12_000 &&
            typeof turn.createdAt === 'number' &&
            Number.isFinite(turn.createdAt),
        ),
    )
    .slice(-MAX_TURNS);

const normalizeAuditRecords = (value: unknown): AgentAuditRecord[] =>
  (Array.isArray(value) ? value : [])
    .filter(
      (record): record is AgentAuditRecord =>
        Boolean(
          record &&
            typeof record === 'object' &&
            typeof record.proposalId === 'string' &&
            typeof record.summary === 'string' &&
            (record.risk === 'low' ||
              record.risk === 'medium' ||
              record.risk === 'high') &&
            typeof record.executedAt === 'number' &&
            typeof record.beforeRevision === 'number' &&
            typeof record.afterRevision === 'number' &&
            record.proposal &&
            typeof record.proposal === 'object' &&
            Array.isArray(record.operations),
        ),
    )
    .slice(-MAX_AUDIT_RECORDS);

const normalizeUndoToken = (value: unknown): AgentUndoToken | null => {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as AgentUndoToken).proposalId !== 'string' ||
    typeof (value as AgentUndoToken).beforeRevision !== 'number' ||
    typeof (value as AgentUndoToken).afterRevision !== 'number' ||
    !(value as AgentUndoToken).snapshot ||
    !Array.isArray((value as AgentUndoToken).snapshot.todos) ||
    !Array.isArray((value as AgentUndoToken).snapshot.projects) ||
    !Array.isArray((value as AgentUndoToken).snapshot.milestones)
  ) {
    return null;
  }
  return value as AgentUndoToken;
};

const normalizeTaskEvents = (value: unknown): TaskEvent[] | null =>
  Array.isArray(value) ? (value as TaskEvent[]) : null;

export const parseAgentRuntime = (raw: string): PersistedAgentRuntime => {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedAgentRuntime>;
    return {
      schemaVersion: 1,
      conversationId:
        typeof parsed.conversationId === 'string'
          ? parsed.conversationId
          : null,
      turns: normalizeTurns(parsed.turns),
      auditRecords: normalizeAuditRecords(parsed.auditRecords),
      undoToken: normalizeUndoToken(parsed.undoToken),
      undoTaskEvents: normalizeTaskEvents(parsed.undoTaskEvents),
    };
  } catch {
    return emptyRuntime();
  }
};

export const loadAgentRuntime = async (): Promise<PersistedAgentRuntime> => {
  if (Platform.OS === 'web') {
    const raw = await loadWebState(STORAGE_KEY);
    return raw ? parseAgentRuntime(raw) : emptyRuntime();
  }
  const file = runtimeFile();
  return file.exists ? parseAgentRuntime(await file.text()) : emptyRuntime();
};

export const saveAgentRuntime = async (
  runtime: PersistedAgentRuntime,
): Promise<void> => {
  const raw = JSON.stringify(runtime);
  if (Platform.OS === 'web') {
    await saveWebState(STORAGE_KEY, raw);
    return;
  }
  runtimeFile().write(raw);
};
