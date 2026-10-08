import { ChatError } from './chatError';
import type { ChatToolCall, ChatToolRecord } from './chat';
import { executeLocalRequest, stateFingerprint } from '../services/localWorkspace';
import type { LocalRequest } from '../services/localWorkspace';
import type { PersistedAppState, Todo } from '../types/todo';
import { todayKey } from '../utils/date';

const string = (description: string) => ({ type: 'string', description });
const fields = {
  title: string('Task title, 1–500 characters.'),
  scheduledDate: string('Local date YYYY-MM-DD. Omit on creation to use today.'),
  scheduledTime: {
    anyOf: [
      { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
      { type: 'null' },
    ],
    description: 'Local time HH:mm, or null to make the task all-day.',
  },
  priority: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
  project: string('Exact project ID or name. Omit on creation for Inbox.'),
};
const taskActions = ['update', 'complete', 'reopen', 'trash', 'restore', 'delete'] as const;
const tool = (name: string, description: string, properties: object, required: string[] = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } },
});
export const CHAT_TOOLS = [
  tool('search_tasks', 'Find local tasks. Results are shown locally; the user must allow sharing before you receive them. Never assume unseen tasks.', {
    query: string('Title substring. Omit to list tasks.'),
    project: fields.project,
    scheduledDate: fields.scheduledDate,
    status: { type: 'string', enum: ['active', 'completed', 'trash', 'all'] },
  }),
  tool('list_projects', 'List local project names and IDs, with user approval before sharing.', {
    query: string('Project name substring. Omit for all projects.'),
  }),
  tool('create_task', 'Propose one task. Does not execute until the user confirms the preview. Defaults: Inbox, today, no priority.', fields, ['title']),
  tool('change_task', 'Propose a task change. Exact ID or unique exact title required; ask the user to disambiguate duplicate titles. Project moves, trash, restore, and permanent deletion also affect descendants as shown in preview. Permanent deletion always requires explicit user confirmation.', {
    task: string('Exact task ID or title.'),
    action: { type: 'string', enum: taskActions },
    ...fields,
  }, ['task', 'action']),
];

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: string[]) => {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new ChatError('tool-arguments');
};
const text = (value: unknown, max = 500): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ChatError('tool-arguments');
  return value.trim();
};
function validateFields(args: Record<string, unknown>) {
  for (const key of ['title', 'project', 'task', 'query']) {
    if (args[key] !== undefined) text(args[key]);
  }
  if (args.scheduledDate !== undefined) {
    const date = text(args.scheduledDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new ChatError('tool-arguments');
  }
  if (
    args.scheduledTime !== undefined &&
    args.scheduledTime !== null &&
    (typeof args.scheduledTime !== 'string' ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(args.scheduledTime))
  ) {
    throw new ChatError('tool-arguments');
  }
  if (args.priority !== undefined && !['none', 'low', 'medium', 'high'].includes(String(args.priority))) {
    throw new ChatError('tool-arguments');
  }
}
export function toolArguments(call: ChatToolCall): Record<string, unknown> {
  try {
    if (call.arguments.length > 16_000) throw new Error();
    const args: unknown = JSON.parse(call.arguments);
    if (!object(args)) throw new Error();
    const allowed: Record<string, string[]> = {
      search_tasks: ['query', 'project', 'scheduledDate', 'status'],
      list_projects: ['query'],
      create_task: Object.keys(fields),
      change_task: ['task', 'action', ...Object.keys(fields)],
    };
    if (!allowed[call.name]) throw new ChatError('tool-unsupported');
    keys(args, allowed[call.name]);
    validateFields(args);
    if (call.name === 'create_task') text(args.title);
    if (call.name === 'change_task') {
      text(args.task);
      if (!taskActions.includes(String(args.action) as (typeof taskActions)[number])) throw new Error();
      const changes = Object.keys(args).filter((key) => key !== 'task' && key !== 'action');
      if (args.action === 'update' ? !changes.length : changes.length) throw new Error();
    }
    if (args.status !== undefined && !['active', 'completed', 'trash', 'all'].includes(String(args.status))) throw new Error();
    return args;
  } catch (error) {
    if (error instanceof ChatError) throw error;
    throw new ChatError('tool-arguments');
  }
}

/** Persisted confirmations still cross the same narrow allowlist as model calls. */
export function validToolRequest(value: unknown): value is LocalRequest {
  try {
    if (!object(value)) return false;
    keys(value, ['method', 'path', 'body', 'idempotencyKey']);
    if (value.method !== 'POST' || !object(value.body)) return false;
    text(value.idempotencyKey, 200);
    const path = text(value.path);
    const body = value.body;
    if (/^\/api\/v1\/projects\/[^/]+\/tasks$/.test(path)) {
      keys(body, ['title', 'scheduledDate', 'scheduledTime', 'priority']);
      text(body.title);
      text(body.scheduledDate);
      validateFields(body);
    } else if (/^\/api\/v1\/tasks\/[^/]+\/mutations$/.test(path)) {
      keys(body, ['action', 'expectedVersion', 'changes']);
      if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 1) return false;
      if (body.action === 'task.update') {
        if (!object(body.changes) || !Object.keys(body.changes).length) return false;
        keys(body.changes, ['title', 'scheduledDate', 'scheduledTime', 'priority', 'projectId']);
        validateFields(body.changes);
        if (body.changes.projectId !== undefined) text(body.changes.projectId);
      } else if (!['task.complete', 'task.reopen', 'task.trash', 'task.restore', 'task.delete'].includes(String(body.action)) || body.changes !== undefined) return false;
    } else return false;
    return true;
  } catch { return false; }
}

export interface ToolRow {
  id: string;
  title: string;
  project?: string;
  scheduledDate?: string;
  scheduledTime?: string | null;
  priority?: string;
  completed?: boolean;
  trashed?: boolean;
}
export interface ToolPreview {
  kind: 'read' | 'write';
  action: string;
  rows: ToolRow[];
  before?: ToolRow[];
  total: number;
  basis: string;
  request?: LocalRequest;
  output?: string;
}

export const taskRow = (task: Todo, state: PersistedAppState): ToolRow => ({
  id: task.id, title: task.title, project: state.projects.find((p) => p.id === task.projectId)?.name ?? task.projectId,
  scheduledDate: task.scheduledDate, scheduledTime: task.scheduledTime, priority: task.priority, completed: task.completed, trashed: task.trashedAt !== null,
});
const resolve = <T extends { id: string }>(items: T[], value: unknown, label: (item: T) => string): T => {
  const name = text(value);
  const byId = items.find((item) => item.id === name);
  if (byId) return byId;
  const matches = items.filter((item) => label(item).toLocaleLowerCase() === name.toLocaleLowerCase());
  if (matches.length !== 1) throw new ChatError(matches.length ? 'tool-ambiguous' : 'tool-not-found');
  return matches[0];
};

export function prepareChatTool(state: PersistedAppState, record: ChatToolRecord): ToolPreview {
  const args = toolArguments(record.call);
  const basis = stateFingerprint(state);
  const projectId = args.project === undefined || record.request ? undefined : resolve(state.projects, args.project, (p) => p.name).id;
  if (record.call.name === 'list_projects') {
    const projects = state.projects.filter((p) => !args.query || p.name.toLocaleLowerCase().includes(String(args.query).toLocaleLowerCase()));
    const rows = projects.slice(0, 30).map((p) => ({ id: p.id, title: p.name }));
    return { kind: 'read', action: 'list_projects', basis, rows, total: projects.length, output: JSON.stringify({ projects: rows, total: projects.length }) };
  }
  if (record.call.name === 'search_tasks') {
    const status = args.status ?? 'active';
    const tasks = state.todos.filter((t) =>
      (status === 'all' || (status === 'trash' ? t.trashedAt !== null : t.trashedAt === null && t.completed === (status === 'completed'))) &&
      (!args.query || t.title.toLocaleLowerCase().includes(String(args.query).toLocaleLowerCase())) &&
      (!projectId || t.projectId === projectId) && (!args.scheduledDate || t.scheduledDate === args.scheduledDate));
    const rows = tasks.slice(0, 20).map((t) => taskRow(t, state));
    return { kind: 'read', action: 'search_tasks', basis, rows, total: tasks.length, output: JSON.stringify({ tasks: rows, total: tasks.length }) };
  }
  let request = record.request;
  if (!request) {
    const changes: Record<string, unknown> = {};
    for (const key of ['title', 'scheduledDate', 'priority']) {
      if (args[key] !== undefined) changes[key] = String(args[key]).trim();
    }
    if (args.scheduledTime !== undefined) {
      changes.scheduledTime = args.scheduledTime;
    }
    if (record.call.name === 'create_task') {
      request = {
        method: 'POST', path: `/api/v1/projects/${encodeURIComponent(projectId ?? 'inbox')}/tasks`,
        idempotencyKey: `xiaoguang-${crypto.randomUUID()}`,
        body: { ...changes, scheduledDate: args.scheduledDate ?? todayKey(), scheduledTime: args.scheduledTime ?? null, priority: args.priority ?? 'none' },
      };
    } else {
      const task = resolve(state.todos.filter((t) =>
        args.action === 'restore' ? t.trashedAt !== null
          : args.action === 'delete' ? true : t.trashedAt === null), args.task, (t) => t.title);
      if (projectId) changes.projectId = projectId;
      request = {
        method: 'POST', path: `/api/v1/tasks/${encodeURIComponent(task.id)}/mutations`,
        idempotencyKey: `xiaoguang-${crypto.randomUUID()}`,
        body: { action: `task.${args.action}`, expectedVersion: task.updatedAt, ...(args.action === 'update' ? { changes } : {}) },
      };
    }
  }
  if (!validToolRequest(request)) throw new ChatError('tool-arguments');
  try {
    const proposed = executeLocalRequest(state, request, { actorId: 'xiaoguang' });
    const action = String(request.body?.action ?? 'task.create');
    const affected = action === 'task.delete'
      ? state.todos.filter((old) => !proposed.state.todos.some((t) => t.id === old.id))
      : proposed.state.todos.filter((t) => {
        const before = state.todos.find((old) => old.id === t.id);
        return !before || JSON.stringify(before) !== JSON.stringify(t);
      });
    return {
      kind: 'write', action, request, basis,
      rows: affected.slice(0, 20).map((t) => taskRow(t, action === 'task.delete' ? state : proposed.state)),
      before: action === 'task.delete' ? undefined : affected.slice(0, 20).flatMap((t) => {
        const before = state.todos.find((old) => old.id === t.id);
        return before ? [taskRow(before, state)] : [];
      }),
      total: affected.length,
    };
  } catch { throw new ChatError('tool-conflict'); }
}
