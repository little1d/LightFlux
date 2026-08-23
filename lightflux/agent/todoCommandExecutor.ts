import {
  AgentCommandError,
  AgentExecutionResult,
  AgentOperation,
  AgentOperationResult,
  AgentProposal,
  AgentRisk,
  AgentUndoToken,
  TodoCommandState,
} from './types';
import {
  INBOX_PROJECT_ID,
  Project,
  Todo,
  TodoPriority,
} from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';
import {
  byTodoOrder,
  collectTodoFamily,
  restoreTodoBranch,
  todoState,
} from '../store/todoDomain';
import {
  applyMilestoneOperation,
  isMilestoneOperation,
  milestoneOperationRisk,
} from './milestoneCommandExecutor';

const MAX_OPERATIONS = 50;
const MAX_TITLE_LENGTH = 160;
const PROJECT_COLORS = [
  '#8B7EFF',
  '#55B9A5',
  '#EEA45E',
  '#6EA7E8',
  '#DD7C91',
];
const PRIORITIES = new Set<TodoPriority>([
  'none',
  'high',
  'medium',
  'low',
]);
const RISK_RANK: Record<AgentRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export const deriveTodoCommandCollections = todoState;

const hasOwn = <T extends object>(value: T, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);

const fail = (
  code: ConstructorParameters<typeof AgentCommandError>[0],
  message: string,
  operationId?: string,
): never => {
  throw new AgentCommandError(code, message, operationId);
};

const validIdentifier = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= 160;

const normalizedTitle = (value: unknown, operationId: string): string => {
  if (typeof value !== 'string') {
    return fail('invalid-operation', 'Task title must be a string.', operationId);
  }
  const title = value.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    return fail(
      'invalid-operation',
      `Task title must contain 1-${MAX_TITLE_LENGTH} characters.`,
      operationId,
    );
  }
  return title;
};

const validDateKey = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
};

const assertDateKey = (value: unknown, operationId: string): string => {
  if (!validDateKey(value)) {
    return fail(
      'invalid-operation',
      'Scheduled date must use a valid YYYY-MM-DD value.',
      operationId,
    );
  }
  return value;
};

const assertPriority = (
  value: unknown,
  operationId: string,
): TodoPriority => {
  if (!PRIORITIES.has(value as TodoPriority)) {
    return fail('invalid-operation', 'Invalid task priority.', operationId);
  }
  return value as TodoPriority;
};

const cloneCommandState = (state: TodoCommandState): TodoCommandState => ({
  revision: state.revision,
  todos: state.todos.map((todo) => ({ ...todo })),
  projects: state.projects.map((project) => ({ ...project })),
  milestones: state.milestones.map((milestone) => ({
    ...milestone,
    dateRule: { ...milestone.dateRule },
    reminderOffsets: [...milestone.reminderOffsets],
  })),
});

export const calculateTodoCommandRevision = (
  todos: Todo[],
  projects: Project[],
  milestones: TodoCommandState['milestones'] = [],
): number => {
  const value = JSON.stringify({
    todos: [...todos]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((todo) => [
        todo.id,
        todo.updatedAt,
        todo.parentId,
        todo.projectId,
        todo.sortOrder,
        todo.trashedAt,
      ]),
    projects: [...projects]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((project) => [
        project.id,
        project.name,
        project.color,
        project.sortOrder,
      ]),
    milestones: [...milestones]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((milestone) => [
        milestone.id,
        milestone.updatedAt,
        milestone.revision,
        milestone.archivedAt,
        milestone.trashedAt,
      ]),
  });
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const withInboxProject = (projects: Project[]): Project[] =>
  projects.some((project) => project.kind === 'inbox')
    ? projects
    : [
        {
          id: INBOX_PROJECT_ID,
          name: 'Inbox',
          color: '#8B7EFF',
          createdAt: 0,
          kind: 'inbox',
          sortOrder: 0,
        },
        ...projects,
      ];

export const createTodoCommandState = (
  todos: Todo[],
  projects: Project[],
  milestones: TodoCommandState['milestones'] = [],
): TodoCommandState => {
  const normalizedProjects = withInboxProject(projects);
  return {
    revision: calculateTodoCommandRevision(
      todos,
      normalizedProjects,
      milestones,
    ),
    todos,
    projects: normalizedProjects,
    milestones,
  };
};

const operationRisk = (operation: AgentOperation): AgentRisk => {
  if (isMilestoneOperation(operation)) {
    return milestoneOperationRisk(operation);
  }
  switch (operation.type) {
    case 'task.trash':
      return 'high';
    case 'task.update':
      return hasOwn(operation.changes, 'scheduledDate') ? 'medium' : 'low';
    case 'task.move':
    case 'task.restore':
    case 'task.set_completion':
      return 'medium';
    default:
      return 'low';
  }
};

export const riskForOperations = (
  operations: AgentOperation[],
): AgentRisk => {
  const highest = operations.reduce<AgentRisk>(
    (risk, operation) =>
      RISK_RANK[operationRisk(operation)] > RISK_RANK[risk]
        ? operationRisk(operation)
        : risk,
    'low',
  );
  return operations.length > 1 && highest === 'low' ? 'medium' : highest;
};

const activeTask = (
  todos: Todo[],
  taskId: string,
  operationId: string,
): Todo => {
  const todo = todos.find(
    (item) => item.id === taskId && item.trashedAt === null,
  );
  if (!todo) {
    return fail('target-not-found', 'Active task was not found.', operationId);
  }
  return todo;
};

const trashedTask = (
  todos: Todo[],
  taskId: string,
  operationId: string,
): Todo => {
  const todo = todos.find(
    (item) => item.id === taskId && item.trashedAt !== null,
  );
  if (!todo) {
    return fail('target-not-found', 'Trashed task was not found.', operationId);
  }
  return todo;
};

const assertProject = (
  projects: Project[],
  projectId: string,
  operationId: string,
) => {
  if (!projects.some((project) => project.id === projectId)) {
    fail('target-not-found', 'Task project was not found.', operationId);
  }
};

const sameScope = (
  todo: Pick<Todo, 'projectId' | 'parentId'>,
  projectId: string,
  parentId: string | null,
) => todo.projectId === projectId && todo.parentId === parentId;

const reorderScope = (
  todos: Todo[],
  projectId: string,
  parentId: string | null,
  orderedIds: string[],
  timestamp: number,
): Todo[] => {
  const orderById = new Map(orderedIds.map((id, index) => [id, index]));
  return todos.map((todo) => {
    if (
      todo.trashedAt !== null ||
      !sameScope(todo, projectId, parentId) ||
      !orderById.has(todo.id)
    ) {
      return todo;
    }
    const sortOrder = orderById.get(todo.id) ?? todo.sortOrder;
    return sortOrder === todo.sortOrder
      ? todo
      : { ...todo, sortOrder, updatedAt: timestamp };
  });
};

const insertionIndex = (
  siblings: Todo[],
  beforeTaskId: string | undefined,
  afterTaskId: string | undefined,
  operationId: string,
): number => {
  if (beforeTaskId && afterTaskId) {
    return fail(
      'invalid-operation',
      'Use either beforeTaskId or afterTaskId, not both.',
      operationId,
    );
  }
  const anchorId = beforeTaskId ?? afterTaskId;
  if (!anchorId) {
    return siblings.length;
  }
  const anchorIndex = siblings.findIndex((todo) => todo.id === anchorId);
  if (anchorIndex < 0) {
    return fail(
      'target-not-found',
      'Ordering anchor was not found in the target scope.',
      operationId,
    );
  }
  return anchorIndex + (afterTaskId ? 1 : 0);
};

const applyCreate = (
  state: TodoCommandState,
  operation: Extract<AgentOperation, { type: 'task.create' }>,
  timestamp: number,
): AgentOperationResult => {
  if (!validIdentifier(operation.taskId)) {
    fail('invalid-operation', 'Invalid task ID.', operation.operationId);
  }
  if (state.todos.some((todo) => todo.id === operation.taskId)) {
    fail('invalid-operation', 'Task ID already exists.', operation.operationId);
  }

  const parent = operation.parentId
    ? activeTask(state.todos, operation.parentId, operation.operationId)
    : null;
  const projectId = parent
    ? parent.projectId
    : operation.projectId === undefined
      ? INBOX_PROJECT_ID
      : operation.projectId;
  assertProject(state.projects, projectId, operation.operationId);
  if (
    parent &&
    operation.projectId !== undefined &&
    operation.projectId !== parent.projectId
  ) {
    fail(
      'invalid-operation',
      'A subtask must use the same project as its parent.',
      operation.operationId,
    );
  }

  const newTodo: Todo = {
    id: operation.taskId,
    title: normalizedTitle(operation.title, operation.operationId),
    completed: false,
    completedAt: null,
    content: emptyRichTextDocument(),
    createdAt: timestamp,
    updatedAt: timestamp,
    scheduledDate: assertDateKey(
      operation.scheduledDate,
      operation.operationId,
    ),
    projectId,
    milestoneId: null,
    parentId: parent?.id ?? null,
    priority: assertPriority(
      operation.priority ?? 'none',
      operation.operationId,
    ),
    sortOrder: 0,
    trashedAt: null,
  };
  const siblings = state.todos
    .filter(
      (todo) =>
        todo.trashedAt === null &&
        sameScope(todo, newTodo.projectId, newTodo.parentId),
    )
    .sort(byTodoOrder);
  const targetIndex = insertionIndex(
    siblings,
    operation.beforeTaskId,
    operation.afterTaskId,
    operation.operationId,
  );
  const orderedIds = siblings.map((todo) => todo.id);
  orderedIds.splice(targetIndex, 0, newTodo.id);
  state.todos.push({ ...newTodo, sortOrder: targetIndex });
  state.todos = reorderScope(
    state.todos,
    newTodo.projectId,
    newTodo.parentId,
    orderedIds,
    timestamp,
  );

  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    type: operation.type,
    affectedIds: [newTodo.id],
  };
};

const applyUpdate = (
  state: TodoCommandState,
  operation: Extract<AgentOperation, { type: 'task.update' }>,
  timestamp: number,
): AgentOperationResult => {
  const allowedFields = new Set(['title', 'scheduledDate', 'priority']);
  if (
    Object.keys(operation.changes).some((field) => !allowedFields.has(field)) ||
    Object.keys(operation.changes).length === 0
  ) {
    fail(
      'invalid-operation',
      'Task update contains unsupported or empty changes.',
      operation.operationId,
    );
  }
  const todo = activeTask(state.todos, operation.taskId, operation.operationId);
  const changes: Partial<Todo> = {};
  if (hasOwn(operation.changes, 'title')) {
    changes.title = normalizedTitle(
      operation.changes.title,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'scheduledDate')) {
    changes.scheduledDate = assertDateKey(
      operation.changes.scheduledDate,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'priority')) {
    changes.priority = assertPriority(
      operation.changes.priority,
      operation.operationId,
    );
  }
  state.todos = state.todos.map((item) =>
    item.id === todo.id ? { ...item, ...changes, updatedAt: timestamp } : item,
  );
  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    type: operation.type,
    affectedIds: [todo.id],
  };
};

const applyCompletion = (
  state: TodoCommandState,
  operation: Extract<AgentOperation, { type: 'task.set_completion' }>,
  timestamp: number,
): AgentOperationResult => {
  const todo = activeTask(state.todos, operation.taskId, operation.operationId);
  if (typeof operation.completed !== 'boolean') {
    fail(
      'invalid-operation',
      'Completion value must be boolean.',
      operation.operationId,
    );
  }
  if (todo.completed !== operation.completed) {
    state.todos = state.todos.map((item) =>
      item.id === todo.id
        ? {
            ...item,
            completed: operation.completed,
            completedAt: operation.completed ? timestamp : null,
            updatedAt: timestamp,
          }
        : item,
    );
  }
  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    type: operation.type,
    affectedIds: [todo.id],
  };
};

const applyMove = (
  state: TodoCommandState,
  operation: Extract<AgentOperation, { type: 'task.move' }>,
  timestamp: number,
): AgentOperationResult => {
  const todo = activeTask(state.todos, operation.taskId, operation.operationId);
  const activeTodos = state.todos.filter((item) => item.trashedAt === null);
  const familyIds = collectTodoFamily(activeTodos, [todo.id]);
  const parentWasProvided = hasOwn(operation, 'parentId');
  const projectWasProvided = hasOwn(operation, 'projectId');
  const finalParentId = parentWasProvided
    ? (operation.parentId ?? null)
    : todo.parentId;
  if (finalParentId && familyIds.has(finalParentId)) {
    fail(
      'invalid-operation',
      'A task cannot be moved beneath its own descendant.',
      operation.operationId,
    );
  }
  const parent = finalParentId
    ? activeTask(state.todos, finalParentId, operation.operationId)
    : null;
  let finalProjectId = projectWasProvided
    ? (operation.projectId ?? INBOX_PROJECT_ID)
    : todo.projectId;
  if (parent) {
    if (projectWasProvided && finalProjectId !== parent.projectId) {
      fail(
        'invalid-operation',
        'A subtask must use the same project as its parent.',
        operation.operationId,
      );
    }
    finalProjectId = parent.projectId;
  } else if (todo.parentId && projectWasProvided && !parentWasProvided) {
    fail(
      'invalid-operation',
      'Detach the task before moving it to another project.',
      operation.operationId,
    );
  }
  assertProject(state.projects, finalProjectId, operation.operationId);
  const finalDate = hasOwn(operation, 'scheduledDate')
    ? assertDateKey(operation.scheduledDate, operation.operationId)
    : todo.scheduledDate;

  const sourceProjectId = todo.projectId;
  const sourceParentId = todo.parentId;
  const scopeChanged =
    sourceProjectId !== finalProjectId || sourceParentId !== finalParentId;
  const hasAnchor = Boolean(operation.beforeTaskId || operation.afterTaskId);
  let nextTodos = state.todos.map((item) => {
    if (!familyIds.has(item.id)) {
      return item;
    }
    if (item.id === todo.id) {
      return {
        ...item,
        projectId: finalProjectId,
        parentId: finalParentId,
        scheduledDate: finalDate,
        updatedAt: timestamp,
      };
    }
    return item.projectId === finalProjectId
      ? item
      : { ...item, projectId: finalProjectId, updatedAt: timestamp };
  });

  if (scopeChanged) {
    const sourceIds = nextTodos
      .filter(
        (item) =>
          item.trashedAt === null &&
          item.id !== todo.id &&
          sameScope(item, sourceProjectId, sourceParentId),
      )
      .sort(byTodoOrder)
      .map((item) => item.id);
    nextTodos = reorderScope(
      nextTodos,
      sourceProjectId,
      sourceParentId,
      sourceIds,
      timestamp,
    );
  }

  if (scopeChanged || hasAnchor) {
    const targetSiblings = nextTodos
      .filter(
        (item) =>
          item.trashedAt === null &&
          item.id !== todo.id &&
          !familyIds.has(item.id) &&
          sameScope(item, finalProjectId, finalParentId),
      )
      .sort(byTodoOrder);
    const targetIndex = insertionIndex(
      targetSiblings,
      operation.beforeTaskId,
      operation.afterTaskId,
      operation.operationId,
    );
    const orderedIds = targetSiblings.map((item) => item.id);
    orderedIds.splice(targetIndex, 0, todo.id);
    nextTodos = reorderScope(
      nextTodos,
      finalProjectId,
      finalParentId,
      orderedIds,
      timestamp,
    );
  }
  state.todos = nextTodos;
  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    type: operation.type,
    affectedIds: [...familyIds],
  };
};

const applyTrash = (
  state: TodoCommandState,
  operation: Extract<AgentOperation, { type: 'task.trash' }>,
  timestamp: number,
): AgentOperationResult => {
  activeTask(state.todos, operation.taskId, operation.operationId);
  const activeTodos = state.todos.filter((todo) => todo.trashedAt === null);
  const affectedIds = collectTodoFamily(activeTodos, [operation.taskId]);
  state.todos = state.todos.map((todo) =>
    affectedIds.has(todo.id)
      ? { ...todo, trashedAt: timestamp, updatedAt: timestamp }
      : todo,
  );
  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    type: operation.type,
    affectedIds: [...affectedIds],
  };
};

const applyRestore = (
  state: TodoCommandState,
  operation: Extract<AgentOperation, { type: 'task.restore' }>,
  timestamp: number,
): AgentOperationResult => {
  trashedTask(state.todos, operation.taskId, operation.operationId);
  const before = new Map(state.todos.map((todo) => [todo.id, todo]));
  state.todos = restoreTodoBranch(state.todos, operation.taskId, timestamp);
  const affectedIds = state.todos
    .filter((todo) => before.get(todo.id) !== todo)
    .map((todo) => todo.id);
  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    type: operation.type,
    affectedIds,
  };
};

const applyProjectCreate = (
  state: TodoCommandState,
  operation: Extract<AgentOperation, { type: 'project.create' }>,
  timestamp: number,
): AgentOperationResult => {
  if (!validIdentifier(operation.projectId)) {
    fail('invalid-operation', 'Invalid project ID.', operation.operationId);
  }
  if (state.projects.some((project) => project.id === operation.projectId)) {
    fail('invalid-operation', 'Project ID already exists.', operation.operationId);
  }
  const name = normalizedTitle(operation.name, operation.operationId);
  const color = operation.color ?? PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length];
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    fail('invalid-operation', 'Invalid project color.', operation.operationId);
  }
  const project: Project = {
    id: operation.projectId,
    name,
    color,
    createdAt: timestamp,
    kind: 'standard',
    sortOrder: Math.max(0, ...state.projects.map((item) => item.sortOrder)) + 1,
  };
  state.projects.push(project);
  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    type: operation.type,
    affectedIds: [project.id],
  };
};

const applyProjectUpdate = (
  state: TodoCommandState,
  operation: Extract<AgentOperation, { type: 'project.update' }>,
): AgentOperationResult => {
  const name = normalizedTitle(operation.name, operation.operationId);
  if (!state.projects.some((project) => project.id === operation.projectId)) {
    fail('target-not-found', 'Task project was not found.', operation.operationId);
  }
  state.projects = state.projects.map((project) =>
    project.id === operation.projectId ? { ...project, name } : project,
  );
  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    type: operation.type,
    affectedIds: [operation.projectId],
  };
};

const applyOperation = (
  state: TodoCommandState,
  operation: AgentOperation,
  timestamp: number,
): AgentOperationResult => {
  if (isMilestoneOperation(operation)) {
    return applyMilestoneOperation(state, operation, timestamp);
  }
  switch (operation.type) {
    case 'task.create':
      return applyCreate(state, operation, timestamp);
    case 'task.update':
      return applyUpdate(state, operation, timestamp);
    case 'task.set_completion':
      return applyCompletion(state, operation, timestamp);
    case 'task.move':
      return applyMove(state, operation, timestamp);
    case 'task.trash':
      return applyTrash(state, operation, timestamp);
    case 'task.restore':
      return applyRestore(state, operation, timestamp);
    case 'project.create':
      return applyProjectCreate(state, operation, timestamp);
    case 'project.update':
      return applyProjectUpdate(state, operation);
    default:
      return fail('invalid-operation', 'Unsupported agent operation.');
  }
};

const validateProposal = (
  state: TodoCommandState,
  proposal: AgentProposal,
  confirmed: boolean,
) => {
  if (
    !validIdentifier(proposal.id) ||
    typeof proposal.summary !== 'string' ||
    !Array.isArray(proposal.assumptions) ||
    !Array.isArray(proposal.operations) ||
    proposal.operations.length === 0 ||
    proposal.operations.length > MAX_OPERATIONS
  ) {
    fail('invalid-proposal', 'Invalid agent proposal.');
  }
  const currentRevision = calculateTodoCommandRevision(
    state.todos,
    state.projects,
    state.milestones,
  );
  if (
    state.revision !== currentRevision ||
    proposal.baseRevision !== currentRevision
  ) {
    fail('stale-revision', 'Task data changed after the proposal was created.');
  }
  const operationIds = new Set<string>();
  const idempotencyKeys = new Set<string>();
  proposal.operations.forEach((operation) => {
    if (
      !validIdentifier(operation.operationId) ||
      !validIdentifier(operation.idempotencyKey)
    ) {
      fail('invalid-operation', 'Invalid operation metadata.');
    }
    if (
      operationIds.has(operation.operationId) ||
      idempotencyKeys.has(operation.idempotencyKey)
    ) {
      fail(
        'duplicate-operation',
        'Operation IDs and idempotency keys must be unique.',
        operation.operationId,
      );
    }
    operationIds.add(operation.operationId);
    idempotencyKeys.add(operation.idempotencyKey);
  });

  const requiredRisk = riskForOperations(proposal.operations);
  if (
    !hasOwn(RISK_RANK, proposal.risk) ||
    RISK_RANK[proposal.risk] < RISK_RANK[requiredRisk]
  ) {
    fail('risk-understated', 'Proposal risk is understated.');
  }
  if (!proposal.requiresConfirmation) {
    fail('invalid-proposal', 'Agent mutations must require confirmation.');
  }
  if (!confirmed) {
    fail('confirmation-required', 'Confirm the proposal before execution.');
  }
};

export const executeAgentProposal = (
  sourceState: TodoCommandState,
  proposal: AgentProposal,
  options: { confirmed: boolean; now?: number },
): AgentExecutionResult => {
  validateProposal(sourceState, proposal, options.confirmed);
  const before = cloneCommandState(sourceState);
  const working = cloneCommandState(sourceState);
  const timestamp = options.now ?? Date.now();
  const operations = proposal.operations.map((operation) =>
    applyOperation(working, operation, timestamp),
  );
  working.revision = calculateTodoCommandRevision(
    working.todos,
    working.projects,
    working.milestones,
  );
  const undoToken: AgentUndoToken = {
    proposalId: proposal.id,
    beforeRevision: before.revision,
    afterRevision: working.revision,
    snapshot: before,
  };

  return {
    proposalId: proposal.id,
    beforeRevision: before.revision,
    afterRevision: working.revision,
    state: working,
    operations,
    undoToken,
  };
};

export const undoAgentExecution = (
  currentState: TodoCommandState,
  undoToken: AgentUndoToken,
): TodoCommandState => {
  const currentRevision = calculateTodoCommandRevision(
    currentState.todos,
    currentState.projects,
    currentState.milestones,
  );
  if (
    currentState.revision !== currentRevision ||
    currentRevision !== undoToken.afterRevision
  ) {
    fail(
      'undo-conflict',
      'Task data changed after the agent operation; undo was not applied.',
    );
  }
  return cloneCommandState(undoToken.snapshot);
};
