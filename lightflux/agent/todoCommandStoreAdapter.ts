import {
  createTodoCommandState,
  deriveTodoCommandCollections,
  executeAgentProposal,
  undoAgentExecution,
} from './todoCommandExecutor';
import {
  AgentExecutionResult,
  AgentOperationResult,
  AgentProposal,
  AgentRisk,
  AgentUndoToken,
} from './types';
import { useTodoStore } from '../store/todoStore';
import { TodoPriority } from '../types/todo';

const MAX_AUDIT_RECORDS = 100;

export interface AgentTaskContext {
  id: string;
  title: string;
  completed: boolean;
  scheduledDate: string;
  groupId: string | null;
  parentId: string | null;
  priority: TodoPriority;
  trashed: boolean;
}

export interface AgentGroupContext {
  id: string;
  name: string;
}

export interface AgentContextSnapshot {
  revision: number;
  language: 'zh' | 'en';
  ungroupedName: string | null;
  tasks: AgentTaskContext[];
  groups: AgentGroupContext[];
}

export interface AgentTaskSearchInput {
  query?: string;
  groupId?: string | null;
  parentId?: string | null;
  scheduledFrom?: string;
  scheduledTo?: string;
  priority?: TodoPriority;
  completed?: boolean;
  trashed?: boolean;
  limit?: number;
}

export interface AgentAuditRecord {
  proposalId: string;
  summary: string;
  risk: AgentRisk;
  executedAt: number;
  beforeRevision: number;
  afterRevision: number;
  operations: AgentOperationResult[];
  undoneAt: number | null;
}

let lastUndoToken: AgentUndoToken | null = null;
let auditRecords: AgentAuditRecord[] = [];

const currentCommandState = () => {
  const state = useTodoStore.getState();
  return createTodoCommandState(
    state.allTodos,
    state.groups,
    state.ungroupedName,
  );
};

const applyCommandState = (
  state: ReturnType<typeof currentCommandState>,
) => {
  useTodoStore.setState({
    ...deriveTodoCommandCollections(state.todos),
    groups: state.groups,
    ungroupedName: state.ungroupedName,
  });
};

export const getAgentContextSnapshot = (): AgentContextSnapshot => {
  const state = useTodoStore.getState();
  const commandState = currentCommandState();
  return {
    revision: commandState.revision,
    language: state.language,
    ungroupedName: state.ungroupedName,
    tasks: state.allTodos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      completed: todo.completed,
      scheduledDate: todo.scheduledDate,
      groupId: todo.groupId,
      parentId: todo.parentId,
      priority: todo.priority,
      trashed: todo.trashedAt !== null,
    })),
    groups: state.groups.map((group) => ({
      id: group.id,
      name: group.name,
    })),
  };
};

export const searchAgentTasks = (
  input: AgentTaskSearchInput,
): AgentTaskContext[] => {
  const query = input.query?.trim().toLocaleLowerCase() ?? '';
  const limit = Math.max(1, Math.min(input.limit ?? 20, 50));
  return getAgentContextSnapshot()
    .tasks.filter((task) => {
      if (!input.trashed && task.trashed) {
        return false;
      }
      if (input.trashed === true && !task.trashed) {
        return false;
      }
      if (query && !task.title.toLocaleLowerCase().includes(query)) {
        return false;
      }
      if (hasOwn(input, 'groupId') && task.groupId !== input.groupId) {
        return false;
      }
      if (hasOwn(input, 'parentId') && task.parentId !== input.parentId) {
        return false;
      }
      if (input.priority && task.priority !== input.priority) {
        return false;
      }
      if (
        typeof input.completed === 'boolean' &&
        task.completed !== input.completed
      ) {
        return false;
      }
      if (
        input.scheduledFrom &&
        task.scheduledDate < input.scheduledFrom
      ) {
        return false;
      }
      if (input.scheduledTo && task.scheduledDate > input.scheduledTo) {
        return false;
      }
      return true;
    })
    .slice(0, limit);
};

export const searchAgentGroups = (query: string): AgentGroupContext[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return getAgentContextSnapshot().groups.filter(
    (group) =>
      !normalizedQuery ||
      group.name.toLocaleLowerCase().includes(normalizedQuery),
  );
};

export const executeConfirmedAgentProposal = (
  proposal: AgentProposal,
  now = Date.now(),
): AgentExecutionResult => {
  const result = executeAgentProposal(currentCommandState(), proposal, {
    confirmed: true,
    now,
  });
  applyCommandState(result.state);
  lastUndoToken = result.undoToken;
  auditRecords = [
    ...auditRecords,
    {
      proposalId: proposal.id,
      summary: proposal.summary,
      risk: proposal.risk,
      executedAt: now,
      beforeRevision: result.beforeRevision,
      afterRevision: result.afterRevision,
      operations: result.operations.map((operation) => ({
        ...operation,
        affectedIds: [...operation.affectedIds],
      })),
      undoneAt: null,
    },
  ].slice(-MAX_AUDIT_RECORDS);
  return result;
};

export const undoLastAgentProposal = (
  now = Date.now(),
): boolean => {
  if (!lastUndoToken) {
    return false;
  }
  const token = lastUndoToken;
  const restoredState = undoAgentExecution(currentCommandState(), token);
  applyCommandState(restoredState);
  auditRecords = auditRecords.map((record) =>
    record.proposalId === token.proposalId && record.undoneAt === null
      ? { ...record, undoneAt: now }
      : record,
  );
  lastUndoToken = null;
  return true;
};

export const canUndoLastAgentProposal = (): boolean =>
  lastUndoToken !== null;

export const getAgentAuditRecords = (): AgentAuditRecord[] =>
  auditRecords.map((record) => ({
    ...record,
    operations: record.operations.map((operation) => ({
      ...operation,
      affectedIds: [...operation.affectedIds],
    })),
  }));

export const clearAgentRuntimeHistory = () => {
  lastUndoToken = null;
  auditRecords = [];
};

const hasOwn = <T extends object>(value: T, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);
