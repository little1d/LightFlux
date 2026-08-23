import {
  createTodoCommandState,
  deriveTodoCommandCollections,
  executeAgentProposal,
  undoAgentExecution,
} from './todoCommandExecutor';
import {
  AgentAuditRecord,
  AgentConversationTurn,
  AgentExecutionResult,
  AgentOperationPreview,
  AgentProposal,
  AgentProposalPreview,
  AgentUndoToken,
  PersistedAgentRuntime,
} from './types';
import { useTodoStore } from '../store/todoStore';
import {
  MilestoneDateRule,
  MilestoneType,
  TaskEvent,
  TodoPriority,
} from '../types/todo';
import { milestoneState } from '../store/milestoneDomain';
import { deriveTaskEventsFromTodoDiff } from '../store/taskEventDomain';
import { toDateKey } from '../utils/date';
import {
  loadAgentRuntime,
  saveAgentRuntime,
} from '../services/agentRuntimeStorage';

const MAX_AUDIT_RECORDS = 100;
const MAX_REMOTE_TASKS = 160;
const MAX_REMOTE_PROJECTS = 80;
const MAX_REMOTE_MILESTONES = 80;

export interface AgentTaskContext {
  id: string;
  title: string;
  completed: boolean;
  scheduledDate: string;
  projectId: string;
  parentId: string | null;
  priority: TodoPriority;
  trashed: boolean;
}

export interface AgentProjectContext {
  id: string;
  name: string;
}

export interface AgentMilestoneContext {
  id: string;
  title: string;
  type: MilestoneType;
  dateRule: MilestoneDateRule;
  startYear: number | null;
  reminderOffsets: number[];
  notes: string;
  icon: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  revision: number;
}

export interface AgentContextSnapshot {
  revision: number;
  language: 'zh' | 'en';
  tasks: AgentTaskContext[];
  projects: AgentProjectContext[];
  milestones: AgentMilestoneContext[];
  scope: {
    totalTasks: number;
    includedTasks: number;
    tasksTruncated: boolean;
    totalProjects: number;
    includedProjects: number;
    projectsTruncated: boolean;
    totalMilestones: number;
    includedMilestones: number;
    milestonesTruncated: boolean;
    includesTrashed: boolean;
    milestoneNotesIncluded: boolean;
  };
}

export interface AgentTaskSearchInput {
  query?: string;
  projectId?: string;
  parentId?: string | null;
  scheduledFrom?: string;
  scheduledTo?: string;
  priority?: TodoPriority;
  completed?: boolean;
  trashed?: boolean;
  limit?: number;
}

export interface AgentMilestoneSearchInput {
  query?: string;
  type?: MilestoneType;
  calendar?: 'solar' | 'lunar';
  archived?: boolean;
  trashed?: boolean;
  limit?: number;
}

let lastUndoToken: AgentUndoToken | null = null;
let lastUndoTaskEvents: TaskEvent[] | null = null;
let auditRecords: AgentAuditRecord[] = [];
let conversationId: string | null = null;
let conversationTurns: AgentConversationTurn[] = [];
let runtimeHydrated = false;
let runtimeHydration: Promise<void> | null = null;
let runtimeSaveQueue = Promise.resolve();

const cloneJson = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const runtimeSnapshot = (): PersistedAgentRuntime => ({
  schemaVersion: 1,
  conversationId,
  turns: cloneJson(conversationTurns),
  auditRecords: cloneJson(auditRecords),
  undoToken: lastUndoToken ? cloneJson(lastUndoToken) : null,
  undoTaskEvents: lastUndoTaskEvents
    ? cloneJson(lastUndoTaskEvents)
    : null,
});

const persistRuntime = () => {
  const snapshot = runtimeSnapshot();
  runtimeSaveQueue = runtimeSaveQueue.then(
    () => saveAgentRuntime(snapshot),
    () => saveAgentRuntime(snapshot),
  );
  void runtimeSaveQueue.catch((error: unknown) => {
    console.warn('Unable to persist AI Agent history.', error);
  });
};

export const hydrateAgentRuntime = async (): Promise<void> => {
  if (runtimeHydrated) {
    return;
  }
  if (!runtimeHydration) {
    runtimeHydration = loadAgentRuntime()
      .then((runtime) => {
        conversationId = runtime.conversationId;
        conversationTurns = cloneJson(runtime.turns);
        auditRecords = cloneJson(runtime.auditRecords);
        lastUndoToken = runtime.undoToken
          ? cloneJson(runtime.undoToken)
          : null;
        lastUndoTaskEvents = runtime.undoTaskEvents
          ? cloneJson(runtime.undoTaskEvents)
          : null;
        runtimeHydrated = true;
      })
      .catch((error: unknown) => {
        console.warn('Unable to load AI Agent history.', error);
        runtimeHydrated = true;
      })
      .finally(() => {
        runtimeHydration = null;
      });
  }
  await runtimeHydration;
};

export const getAgentConversationState = () => ({
  conversationId,
  turns: cloneJson(conversationTurns),
});

export const setAgentConversationId = (value: string) => {
  conversationId = value;
  persistRuntime();
};

export const appendAgentConversationTurn = (
  turn: AgentConversationTurn,
) => {
  conversationTurns = [...conversationTurns, cloneJson(turn)].slice(-100);
  persistRuntime();
};

export const updateAgentProposalStatus = (
  proposalId: string,
  status: NonNullable<AgentConversationTurn['proposalStatus']>,
) => {
  conversationTurns = conversationTurns.map((turn) =>
    turn.proposal?.id === proposalId
      ? { ...turn, proposalStatus: status }
      : turn,
  );
  persistRuntime();
};

const currentCommandState = () => {
  const state = useTodoStore.getState();
  return createTodoCommandState(
    state.allTodos,
    state.projects,
    state.allMilestones,
  );
};

const applyCommandState = (
  state: ReturnType<typeof currentCommandState>,
  taskEvents?: TaskEvent[],
) => {
  useTodoStore.setState({
    ...deriveTodoCommandCollections(state.todos),
    projects: state.projects,
    ...milestoneState(state.milestones),
    ...(taskEvents ? { taskEvents } : {}),
  });
};

const previewText = (value: string) =>
  value.length > 120 ? `${value.slice(0, 117)}...` : value;

const dateRulePreview = (rule: MilestoneDateRule) =>
  rule.calendar === 'solar'
    ? `solar:${rule.year ?? '*'}-${rule.month}-${rule.day}:${rule.leapDayPolicy}`
    : `lunar:${rule.year ?? '*'}-${rule.month}-${rule.day}:${rule.isLeapMonth ? 'leap' : 'regular'}:${rule.missingLeapMonthPolicy}`;

const remindersPreview = (offsets: number[]) => offsets.join(',');

const projectPreview = (
  state: ReturnType<typeof currentCommandState>,
  projectId: string | undefined,
) =>
  projectId
    ? (state.projects.find((project) => project.id === projectId)?.name ??
      projectId)
    : null;

const parentPreview = (
  state: ReturnType<typeof currentCommandState>,
  parentId: string | null,
) =>
  parentId === null
    ? null
    : (state.todos.find((todo) => todo.id === parentId)?.title ?? parentId);

const operationPreview = (
  source: ReturnType<typeof currentCommandState>,
  result: AgentExecutionResult,
  operation: AgentProposal['operations'][number],
  index: number,
): AgentOperationPreview => {
  const operationResult = result.operations[index];
  const beforeTask =
    'taskId' in operation
      ? source.todos.find((todo) => todo.id === operation.taskId)
      : undefined;
  const afterTask =
    'taskId' in operation
      ? result.state.todos.find((todo) => todo.id === operation.taskId)
      : undefined;
  const beforeMilestone =
    'milestoneId' in operation
      ? source.milestones.find(
          (milestone) => milestone.id === operation.milestoneId,
        )
      : undefined;
  const afterMilestone =
    'milestoneId' in operation
      ? result.state.milestones.find(
          (milestone) => milestone.id === operation.milestoneId,
        )
      : undefined;
  const changes: AgentOperationPreview['changes'] = [];
  const addChange = (
    field: AgentOperationPreview['changes'][number]['field'],
    before: AgentOperationPreview['changes'][number]['before'],
    after: AgentOperationPreview['changes'][number]['after'],
  ) => {
    if (before !== after) {
      changes.push({ field, before, after });
    }
  };

  switch (operation.type) {
    case 'task.create':
      addChange('title', null, operation.title);
      addChange('scheduledDate', null, operation.scheduledDate);
      addChange('priority', null, operation.priority ?? 'none');
      addChange(
        'project',
        null,
        projectPreview(result.state, afterTask?.projectId),
      );
      addChange(
        'parent',
        null,
        parentPreview(result.state, afterTask?.parentId ?? null),
      );
      break;
    case 'task.update':
      if (operation.changes.title !== undefined) {
        addChange('title', beforeTask?.title ?? null, operation.changes.title);
      }
      if (operation.changes.scheduledDate !== undefined) {
        addChange(
          'scheduledDate',
          beforeTask?.scheduledDate ?? null,
          operation.changes.scheduledDate,
        );
      }
      if (operation.changes.priority !== undefined) {
        addChange(
          'priority',
          beforeTask?.priority ?? null,
          operation.changes.priority,
        );
      }
      break;
    case 'task.set_completion':
      addChange(
        'completed',
        beforeTask?.completed ?? null,
        operation.completed,
      );
      break;
    case 'task.move':
      addChange(
        'scheduledDate',
        beforeTask?.scheduledDate ?? null,
        afterTask?.scheduledDate ?? null,
      );
      addChange(
        'project',
        projectPreview(source, beforeTask?.projectId),
        projectPreview(result.state, afterTask?.projectId),
      );
      addChange(
        'parent',
        parentPreview(source, beforeTask?.parentId ?? null),
        parentPreview(result.state, afterTask?.parentId ?? null),
      );
      if (operation.beforeTaskId || operation.afterTaskId) {
        const anchorId = operation.beforeTaskId ?? operation.afterTaskId ?? '';
        const anchor =
          result.state.todos.find((todo) => todo.id === anchorId)?.title ??
          anchorId;
        addChange(
          'position',
          null,
          `${operation.beforeTaskId ? 'before' : 'after'}:${anchor}`,
        );
      }
      break;
    case 'task.trash':
      addChange('trashed', false, true);
      break;
    case 'task.restore':
      addChange('trashed', true, false);
      break;
    case 'project.create': {
      const project = result.state.projects.find(
        (item) => item.id === operation.projectId,
      );
      addChange('title', null, project?.name ?? operation.name);
      addChange('color', null, project?.color ?? operation.color ?? null);
      break;
    }
    case 'project.update': {
      const before = source.projects.find(
        (project) => project.id === operation.projectId,
      )?.name;
      addChange('title', before ?? null, operation.name);
      break;
    }
    case 'milestone.create':
      addChange('title', null, operation.title);
      addChange('type', null, operation.milestoneType);
      addChange('dateRule', null, dateRulePreview(operation.dateRule));
      addChange('startYear', null, operation.startYear ?? null);
      addChange(
        'reminders',
        null,
        remindersPreview(operation.reminderOffsets ?? []),
      );
      if (operation.notes) {
        addChange('notes', null, previewText(operation.notes));
      }
      addChange('pinned', null, operation.pinned ?? false);
      break;
    case 'milestone.update':
      if (operation.changes.title !== undefined) {
        addChange(
          'title',
          beforeMilestone?.title ?? null,
          operation.changes.title,
        );
      }
      if (operation.changes.type !== undefined) {
        addChange(
          'type',
          beforeMilestone?.type ?? null,
          operation.changes.type,
        );
      }
      if (operation.changes.dateRule !== undefined) {
        addChange(
          'dateRule',
          beforeMilestone
            ? dateRulePreview(beforeMilestone.dateRule)
            : null,
          dateRulePreview(operation.changes.dateRule),
        );
      }
      if (operation.changes.startYear !== undefined) {
        addChange(
          'startYear',
          beforeMilestone?.startYear ?? null,
          operation.changes.startYear,
        );
      }
      if (operation.changes.reminderOffsets !== undefined) {
        addChange(
          'reminders',
          remindersPreview(beforeMilestone?.reminderOffsets ?? []),
          remindersPreview(operation.changes.reminderOffsets),
        );
      }
      if (operation.changes.notes !== undefined) {
        addChange(
          'notes',
          previewText(beforeMilestone?.notes ?? ''),
          previewText(operation.changes.notes),
        );
      }
      if (operation.changes.icon !== undefined) {
        addChange(
          'icon',
          beforeMilestone?.icon ?? null,
          operation.changes.icon,
        );
      }
      if (operation.changes.color !== undefined) {
        addChange(
          'color',
          beforeMilestone?.color ?? null,
          operation.changes.color,
        );
      }
      if (operation.changes.pinned !== undefined) {
        addChange(
          'pinned',
          beforeMilestone?.pinned ?? null,
          operation.changes.pinned,
        );
      }
      break;
    case 'milestone.archive':
      addChange(
        'archived',
        (beforeMilestone?.archivedAt ?? null) !== null,
        true,
      );
      break;
    case 'milestone.unarchive':
      addChange(
        'archived',
        (beforeMilestone?.archivedAt ?? null) !== null,
        false,
      );
      break;
    case 'milestone.restore':
      addChange('trashed', true, false);
      break;
    case 'milestone.trash':
      addChange('trashed', false, true);
      break;
  }

  return {
    operationId: operation.operationId,
    type: operation.type,
    target:
      afterTask?.title ??
      beforeTask?.title ??
      afterMilestone?.title ??
      beforeMilestone?.title ??
      ('name' in operation ? operation.name : ''),
    changes,
    affectedIds: [...operationResult.affectedIds],
  };
};

export const previewAgentProposal = (
  proposal: AgentProposal,
  now = Date.now(),
): AgentProposalPreview => {
  const source = currentCommandState();
  const result = executeAgentProposal(source, proposal, {
    confirmed: true,
    now,
  });
  return {
    proposalId: proposal.id,
    operations: proposal.operations.map((operation, index) =>
      operationPreview(source, result, operation, index),
    ),
  };
};

export const getAgentContextSnapshot = (): AgentContextSnapshot => {
  const state = useTodoStore.getState();
  const commandState = currentCommandState();
  const tasks = state.allTodos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    scheduledDate: todo.scheduledDate,
    projectId: todo.projectId,
    parentId: todo.parentId,
    priority: todo.priority,
    trashed: todo.trashedAt !== null,
  }));
  const projects = state.projects.map((project) => ({
    id: project.id,
    name: project.name,
  }));
  const milestones = state.allMilestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    type: milestone.type,
    dateRule: { ...milestone.dateRule },
    startYear: milestone.startYear,
    reminderOffsets: [...milestone.reminderOffsets],
    notes: milestone.notes,
    icon: milestone.icon,
    color: milestone.color,
    pinned: milestone.pinned,
    archived: milestone.archivedAt !== null,
    trashed: milestone.trashedAt !== null,
    revision: milestone.revision,
  }));
  return {
    revision: commandState.revision,
    language: state.language,
    tasks,
    projects,
    milestones,
    scope: {
      totalTasks: tasks.length,
      includedTasks: tasks.length,
      tasksTruncated: false,
      totalProjects: projects.length,
      includedProjects: projects.length,
      projectsTruncated: false,
      totalMilestones: milestones.length,
      includedMilestones: milestones.length,
      milestonesTruncated: false,
      includesTrashed: true,
      milestoneNotesIncluded: true,
    },
  };
};

const messageIncludes = (message: string, values: string[]) =>
  values.some((value) => message.includes(value));

const textMatchScore = (message: string, rawValue: string) => {
  const value = rawValue.trim().toLocaleLowerCase();
  if (!value) {
    return 0;
  }
  if (message.includes(value)) {
    return 100;
  }
  const compact = value.replace(/[^\p{L}\p{N}]/gu, '');
  if (compact.length < 2) {
    return 0;
  }
  const parts = new Set<string>();
  for (let index = 0; index < compact.length - 1; index += 1) {
    parts.add(compact.slice(index, index + 2));
  }
  return Math.min(
    60,
    [...parts].filter((part) => message.includes(part)).length * 12,
  );
};

const taskPriorityFromMessage = (message: string): TodoPriority | null => {
  if (messageIncludes(message, ['高优先级', 'high priority'])) {
    return 'high';
  }
  if (messageIncludes(message, ['中优先级', 'medium priority'])) {
    return 'medium';
  }
  if (messageIncludes(message, ['低优先级', 'low priority'])) {
    return 'low';
  }
  if (messageIncludes(message, ['无优先级', 'no priority'])) {
    return 'none';
  }
  return null;
};

const selectedDateFromMessage = (message: string, now: Date) => {
  const explicitDate = /\b\d{4}-\d{2}-\d{2}\b/.exec(message)?.[0];
  if (explicitDate) {
    return explicitDate;
  }
  const target = new Date(now);
  if (messageIncludes(message, ['明天', 'tomorrow'])) {
    target.setDate(target.getDate() + 1);
    return toDateKey(target);
  }
  if (messageIncludes(message, ['后天', 'day after tomorrow'])) {
    target.setDate(target.getDate() + 2);
    return toDateKey(target);
  }
  return messageIncludes(message, ['今天', '今日', 'today'])
    ? toDateKey(target)
    : null;
};

const taskContextScore = (
  task: AgentTaskContext,
  message: string,
  projectNames: Map<string, string>,
  requestedDate: string | null,
  requestedPriority: TodoPriority | null,
  overdueRequested: boolean,
  completedRequested: boolean | null,
  today: string,
) => {
  let score = 0;
  score += textMatchScore(message, task.title);
  const projectName = task.projectId
    ? projectNames.get(task.projectId)?.toLocaleLowerCase()
    : undefined;
  if (projectName && message.includes(projectName)) {
    score += 40;
  }
  if (requestedDate) {
    if (task.scheduledDate !== requestedDate) {
      return -1;
    }
    score += 30;
  }
  if (overdueRequested) {
    if (task.completed || task.scheduledDate >= today) {
      return -1;
    }
    score += 30;
  }
  if (requestedPriority) {
    if (task.priority !== requestedPriority) {
      return -1;
    }
    score += 20;
  }
  if (completedRequested !== null) {
    if (task.completed !== completedRequested) {
      return -1;
    }
    score += 20;
  }
  return score;
};

export const getAgentContextForMessage = (
  rawMessage: string,
  now = new Date(),
): AgentContextSnapshot => {
  const context = getAgentContextSnapshot();
  const message = rawMessage.trim().toLocaleLowerCase();
  const requestedDate = selectedDateFromMessage(message, now);
  const requestedPriority = taskPriorityFromMessage(message);
  const overdueRequested = messageIncludes(message, [
    '逾期',
    '过期',
    'overdue',
  ]);
  const trashedOnly = messageIncludes(message, [
    '恢复',
    '还原',
    '垃圾桶里',
    '垃圾桶中',
    'restore',
    'in trash',
  ]);
  const completedRequested = messageIncludes(message, [
    '未完成',
    '待办',
    'incomplete',
    'pending',
  ])
    ? false
    : messageIncludes(message, ['已完成', '完成的', 'completed'])
      ? true
      : null;
  const broadTaskRequest = messageIncludes(message, [
    '所有任务',
    '全部任务',
    'all tasks',
    '每个任务',
  ]);
  const existingTaskIntent = messageIncludes(message, [
    '完成',
    '改期',
    '移动',
    '优先级',
    '删除',
    '垃圾桶',
    '恢复',
    '还原',
    '查找',
    '哪些任务',
    '什么任务',
    'complete',
    'reschedule',
    'move',
    'priority',
    'trash',
    'restore',
    'find',
    'which task',
  ]);
  const projectNames = new Map(
    context.projects.map((project) => [project.id, project.name]),
  );
  const today = toDateKey(now);
  const scoredTasks = context.tasks
    .filter((task) => (trashedOnly ? task.trashed : !task.trashed))
    .map((task) => ({
      task,
      score: taskContextScore(
        task,
        message,
        projectNames,
        requestedDate,
        requestedPriority,
        overdueRequested,
        completedRequested,
        today,
      ),
    }))
    .filter(({ score }) => score >= 0);
  const hasTaskFilter =
    requestedDate !== null ||
    requestedPriority !== null ||
    overdueRequested ||
    completedRequested !== null ||
    trashedOnly;
  let taskCandidates = scoredTasks.filter(({ score }) => score > 0);
  if (
    taskCandidates.length === 0 &&
    (hasTaskFilter || broadTaskRequest || existingTaskIntent)
  ) {
    taskCandidates = scoredTasks;
  }
  taskCandidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.task.scheduledDate.localeCompare(b.task.scheduledDate) ||
      a.task.title.localeCompare(b.task.title),
  );
  const selectedTaskIds = new Set(
    taskCandidates
      .slice(0, MAX_REMOTE_TASKS)
      .map(({ task }) => task.id),
  );
  context.tasks.forEach((task) => {
    if (
      task.parentId &&
      selectedTaskIds.has(task.id) &&
      selectedTaskIds.size < MAX_REMOTE_TASKS
    ) {
      selectedTaskIds.add(task.parentId);
    }
  });
  const tasks = context.tasks
    .filter((task) => selectedTaskIds.has(task.id))
    .slice(0, MAX_REMOTE_TASKS);

  const selectedProjectIds = new Set(
    tasks
      .map((task) => task.projectId)
      .filter((id): id is string => id !== null),
  );
  const projectIntent = messageIncludes(message, [
    '项目',
    '清单',
    'project',
    'list',
  ]);
  const projects = context.projects
    .filter(
      (project) =>
        selectedProjectIds.has(project.id) ||
        message.includes(project.name.toLocaleLowerCase()) ||
        projectIntent,
    )
    .sort((a, b) => {
      const aScore =
        (selectedProjectIds.has(a.id) ? 2 : 0) +
        (message.includes(a.name.toLocaleLowerCase()) ? 1 : 0);
      const bScore =
        (selectedProjectIds.has(b.id) ? 2 : 0) +
        (message.includes(b.name.toLocaleLowerCase()) ? 1 : 0);
      return bScore - aScore || a.name.localeCompare(b.name);
    })
    .slice(0, MAX_REMOTE_PROJECTS);

  const milestoneIntent = messageIncludes(message, [
    '纪念日',
    '倒数日',
    '生日',
    '节日',
    '节点',
    'milestone',
    'anniversary',
    'countdown',
    'birthday',
    'holiday',
  ]);
  const milestoneCandidates = context.milestones
    .filter((milestone) => (trashedOnly ? milestone.trashed : !milestone.trashed))
    .map((milestone) => {
      return {
        milestone,
        score:
          textMatchScore(message, milestone.title) +
          Math.min(30, textMatchScore(message, milestone.notes)) +
          (message.includes(milestone.type) ? 20 : 0),
      };
    })
    .filter(({ score }) => score > 0 || milestoneIntent)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.milestone.title.localeCompare(b.milestone.title),
    );
  const milestones = milestoneCandidates
    .slice(0, MAX_REMOTE_MILESTONES)
    .map(({ milestone }) => ({ ...milestone, notes: '' }));

  return {
    ...context,
    tasks,
    projects,
    milestones,
    scope: {
      totalTasks: context.tasks.length,
      includedTasks: tasks.length,
      tasksTruncated: taskCandidates.length > tasks.length,
      totalProjects: context.projects.length,
      includedProjects: projects.length,
      projectsTruncated: context.projects.length > projects.length,
      totalMilestones: context.milestones.length,
      includedMilestones: milestones.length,
      milestonesTruncated: milestoneCandidates.length > milestones.length,
      includesTrashed: trashedOnly,
      milestoneNotesIncluded: false,
    },
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
      if (hasOwn(input, 'projectId') && task.projectId !== input.projectId) {
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

export const searchAgentProjects = (query: string): AgentProjectContext[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return getAgentContextSnapshot().projects.filter(
    (project) =>
      !normalizedQuery ||
      project.name.toLocaleLowerCase().includes(normalizedQuery),
  );
};

export const searchAgentMilestones = (
  input: AgentMilestoneSearchInput,
): AgentMilestoneContext[] => {
  const query = input.query?.trim().toLocaleLowerCase() ?? '';
  const limit = Math.max(1, Math.min(input.limit ?? 20, 50));
  return getAgentContextSnapshot()
    .milestones.filter((milestone) => {
      if (!input.trashed && milestone.trashed) {
        return false;
      }
      if (input.trashed === true && !milestone.trashed) {
        return false;
      }
      if (
        input.archived !== undefined &&
        milestone.archived !== input.archived
      ) {
        return false;
      }
      if (
        query &&
        !milestone.title.toLocaleLowerCase().includes(query) &&
        !milestone.notes.toLocaleLowerCase().includes(query)
      ) {
        return false;
      }
      if (input.type && milestone.type !== input.type) {
        return false;
      }
      if (
        input.calendar &&
        milestone.dateRule.calendar !== input.calendar
      ) {
        return false;
      }
      return true;
    })
    .slice(0, limit);
};

export const executeConfirmedAgentProposal = (
  proposal: AgentProposal,
  now = Date.now(),
): AgentExecutionResult => {
  const storeState = useTodoStore.getState();
  const sourceState = currentCommandState();
  const previousTaskEvents = storeState.taskEvents ?? [];
  const result = executeAgentProposal(sourceState, proposal, {
    confirmed: true,
    now,
  });
  const taskEvents = [
    ...previousTaskEvents,
    ...deriveTaskEventsFromTodoDiff(
      sourceState.todos,
      result.state.todos,
      now,
    ),
  ];
  applyCommandState(result.state, taskEvents);
  lastUndoToken = result.undoToken;
  lastUndoTaskEvents = previousTaskEvents.map((event) => ({
    ...event,
    ...(event.metadata ? { metadata: { ...event.metadata } } : {}),
  }));
  auditRecords = [
    ...auditRecords,
    {
      proposalId: proposal.id,
      summary: proposal.summary,
      risk: proposal.risk,
      executedAt: now,
      beforeRevision: result.beforeRevision,
      afterRevision: result.afterRevision,
      proposal: cloneJson(proposal),
      operations: result.operations.map((operation) => ({
        ...operation,
        affectedIds: [...operation.affectedIds],
      })),
      undoneAt: null,
    },
  ].slice(-MAX_AUDIT_RECORDS);
  conversationTurns = conversationTurns.map((turn) =>
    turn.proposal?.id === proposal.id
      ? { ...turn, proposalStatus: 'executed' }
      : turn,
  );
  persistRuntime();
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
  applyCommandState(restoredState, lastUndoTaskEvents ?? undefined);
  auditRecords = auditRecords.map((record) =>
    record.proposalId === token.proposalId && record.undoneAt === null
      ? { ...record, undoneAt: now }
      : record,
  );
  conversationTurns = conversationTurns.map((turn) =>
    turn.proposal?.id === token.proposalId
      ? { ...turn, proposalStatus: 'undone' }
      : turn,
  );
  lastUndoToken = null;
  lastUndoTaskEvents = null;
  persistRuntime();
  return true;
};

export const canUndoLastAgentProposal = (): boolean =>
  lastUndoToken !== null;

export const getAgentAuditRecords = (): AgentAuditRecord[] =>
  cloneJson(auditRecords);

export const clearAgentRuntimeHistory = () => {
  lastUndoToken = null;
  lastUndoTaskEvents = null;
  auditRecords = [];
  conversationId = null;
  conversationTurns = [];
  runtimeHydrated = true;
};

const hasOwn = <T extends object>(value: T, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);
