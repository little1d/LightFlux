import {
  Milestone,
  MilestoneDateRule,
  MilestoneType,
  Todo,
  TodoGroup,
  TodoPriority,
} from '../types/todo';

export type AgentRisk = 'low' | 'medium' | 'high';

interface AgentOperationBase {
  operationId: string;
  idempotencyKey: string;
}

export interface AgentTaskCreateOperation extends AgentOperationBase {
  type: 'task.create';
  taskId: string;
  title: string;
  scheduledDate: string;
  groupId?: string | null;
  parentId?: string | null;
  priority?: TodoPriority;
  beforeTaskId?: string;
  afterTaskId?: string;
}

export interface AgentTaskUpdateOperation extends AgentOperationBase {
  type: 'task.update';
  taskId: string;
  changes: {
    title?: string;
    scheduledDate?: string;
    priority?: TodoPriority;
  };
}

export interface AgentTaskCompletionOperation extends AgentOperationBase {
  type: 'task.set_completion';
  taskId: string;
  completed: boolean;
}

export interface AgentTaskMoveOperation extends AgentOperationBase {
  type: 'task.move';
  taskId: string;
  scheduledDate?: string;
  groupId?: string | null;
  parentId?: string | null;
  beforeTaskId?: string;
  afterTaskId?: string;
}

export interface AgentTaskTrashOperation extends AgentOperationBase {
  type: 'task.trash';
  taskId: string;
}

export interface AgentTaskRestoreOperation extends AgentOperationBase {
  type: 'task.restore';
  taskId: string;
}

export interface AgentGroupCreateOperation extends AgentOperationBase {
  type: 'group.create';
  groupId: string;
  name: string;
  color?: string;
}

export interface AgentGroupUpdateOperation extends AgentOperationBase {
  type: 'group.update';
  groupId: string | null;
  name: string;
}

export interface AgentMilestoneCreateOperation extends AgentOperationBase {
  type: 'milestone.create';
  milestoneId: string;
  title: string;
  milestoneType: MilestoneType;
  dateRule: MilestoneDateRule;
  startYear?: number | null;
  reminderOffsets?: number[];
  notes?: string;
  icon?: string;
  color?: string;
  pinned?: boolean;
}

export interface AgentMilestoneUpdateOperation extends AgentOperationBase {
  type: 'milestone.update';
  milestoneId: string;
  changes: {
    title?: string;
    type?: MilestoneType;
    dateRule?: MilestoneDateRule;
    startYear?: number | null;
    reminderOffsets?: number[];
    notes?: string;
    icon?: string;
    color?: string;
    pinned?: boolean;
  };
}

export interface AgentMilestoneArchiveOperation extends AgentOperationBase {
  type: 'milestone.archive';
  milestoneId: string;
}

export interface AgentMilestoneRestoreOperation extends AgentOperationBase {
  type: 'milestone.restore';
  milestoneId: string;
}

export interface AgentMilestoneTrashOperation extends AgentOperationBase {
  type: 'milestone.trash';
  milestoneId: string;
}

export type AgentOperation =
  | AgentTaskCreateOperation
  | AgentTaskUpdateOperation
  | AgentTaskCompletionOperation
  | AgentTaskMoveOperation
  | AgentTaskTrashOperation
  | AgentTaskRestoreOperation
  | AgentGroupCreateOperation
  | AgentGroupUpdateOperation
  | AgentMilestoneCreateOperation
  | AgentMilestoneUpdateOperation
  | AgentMilestoneArchiveOperation
  | AgentMilestoneRestoreOperation
  | AgentMilestoneTrashOperation;

export interface AgentProposal {
  id: string;
  baseRevision: number;
  summary: string;
  operations: AgentOperation[];
  assumptions: string[];
  risk: AgentRisk;
  requiresConfirmation: boolean;
}

export interface TodoCommandState {
  revision: number;
  todos: Todo[];
  groups: TodoGroup[];
  milestones: Milestone[];
  ungroupedName: string | null;
}

export interface AgentOperationResult {
  operationId: string;
  idempotencyKey: string;
  type: AgentOperation['type'];
  affectedIds: string[];
}

export interface AgentUndoToken {
  proposalId: string;
  beforeRevision: number;
  afterRevision: number;
  snapshot: TodoCommandState;
}

export interface AgentExecutionResult {
  proposalId: string;
  beforeRevision: number;
  afterRevision: number;
  state: TodoCommandState;
  operations: AgentOperationResult[];
  undoToken: AgentUndoToken;
}

export type AgentCommandErrorCode =
  | 'confirmation-required'
  | 'duplicate-operation'
  | 'invalid-operation'
  | 'invalid-proposal'
  | 'risk-understated'
  | 'stale-revision'
  | 'target-not-found'
  | 'undo-conflict';

export class AgentCommandError extends Error {
  code: AgentCommandErrorCode;
  operationId?: string;

  constructor(
    code: AgentCommandErrorCode,
    message: string,
    operationId?: string,
  ) {
    super(message);
    this.code = code;
    this.operationId = operationId;
  }
}
