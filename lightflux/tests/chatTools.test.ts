import { describe, expect, it } from 'vitest';

import type { ChatToolRecord } from '../agent/chat';
import { prepareChatTool, validToolRequest } from '../agent/chatTools';
import { executeLocalRequest } from '../services/localWorkspace';
import type { PersistedAppState, Todo } from '../types/todo';
import { NAVIGATION_ITEM_IDS } from '../types/todo';
import { todayKey } from '../utils/date';

const baseState = (): PersistedAppState => ({
  schemaVersion: 12,
  updatedAt: 1,
  analyticsStartedAt: 1,
  language: 'zh',
  navigationOrder: [...NAVIGATION_ITEM_IDS],
  hiddenNavigationItems: [],
  todos: [],
  projects: [
    { id: 'inbox', name: '收件箱', color: '#8B7EFF', createdAt: 1, kind: 'inbox', sortOrder: 0 },
    { id: 'work', name: '工作', color: '#55B9A5', createdAt: 2, kind: 'standard', sortOrder: 1 },
  ],
  milestones: [],
  taskEvents: [],
});
const record = (name: string, args: object): ChatToolRecord => ({
  call: { id: `call-${name}`, name, arguments: JSON.stringify(args) },
  status: 'pending',
});
const task = (id: string, title: string, projectId = 'inbox'): Todo => ({
  id, title, projectId, completed: false, completedAt: null, createdAt: 10, updatedAt: 10,
  scheduledDate: '2026-10-06', milestoneId: null, parentId: null, priority: 'none',
  sortOrder: 0, trashedAt: null, content: { type: 'doc', content: [{ type: 'paragraph' }] },
});

describe('Xiaoguang task tool preparation', () => {
  it('previews creation without writing and applies explicit Inbox/today defaults', () => {
    const state = baseState();
    const preview = prepareChatTool(state, record('create_task', { title: 'test' }));
    expect(state.todos).toEqual([]);
    expect(preview).toMatchObject({
      kind: 'write', action: 'task.create', total: 1,
      rows: [{ title: 'test', project: '收件箱', scheduledDate: todayKey(), priority: 'none' }],
    });
    expect(preview.request).toMatchObject({
      method: 'POST', path: '/api/v1/projects/inbox/tasks',
      body: { title: 'test', scheduledDate: todayKey(), priority: 'none' },
    });

    const result = executeLocalRequest(state, preview.request!, { actorId: 'xiaoguang' });
    expect(result.state.todos).toHaveLength(1);
    expect(result.state.localAutomation?.mutations[0].actorId).toBe('xiaoguang');
  });

  it('requires disambiguation for duplicate titles and accepts exact IDs', () => {
    const state = baseState();
    state.todos = [task('one', 'Same'), task('two', 'Same')];
    expect(() => prepareChatTool(state, record('change_task', {
      task: 'Same', action: 'complete',
    }))).toThrow('tool-ambiguous');
    expect(prepareChatTool(state, record('change_task', {
      task: 'two', action: 'complete',
    })).rows[0]).toMatchObject({ id: 'two', completed: true });
  });

  it('resolves project names and includes before/after values for updates', () => {
    const state = baseState();
    state.todos = [task('one', 'Plan')];
    const preview = prepareChatTool(state, record('change_task', {
      task: 'Plan', action: 'update', title: 'Ship', project: '工作', priority: 'high',
    }));
    expect(preview.before?.[0]).toMatchObject({ title: 'Plan', project: '收件箱', priority: 'none' });
    expect(preview.rows[0]).toMatchObject({ title: 'Ship', project: '工作', priority: 'high' });
  });

  it('previews direct permanent deletion of the selected task branch', () => {
    const state = baseState();
    state.todos = [
      task('parent', 'Remove'),
      { ...task('child', 'Nested'), parentId: 'parent', trashedAt: 20 },
    ];
    const preview = prepareChatTool(state, record('change_task', {
      task: 'Remove', action: 'delete',
    }));
    expect(state.todos).toHaveLength(2);
    expect(preview).toMatchObject({
      kind: 'write',
      action: 'task.delete',
      total: 2,
      rows: [
        { id: 'parent', title: 'Remove' },
        { id: 'child', title: 'Nested' },
      ],
      request: {
        body: { action: 'task.delete', expectedVersion: 10 },
      },
    });
  });

  it('returns bounded local query results and rejects forged persisted requests', () => {
    const state = baseState();
    state.todos = [task('one', 'Plan'), { ...task('two', 'Done'), completed: true }];
    const preview = prepareChatTool(state, record('search_tasks', { query: 'Plan' }));
    expect(JSON.parse(preview.output!)).toEqual({
      tasks: [expect.objectContaining({ id: 'one', title: 'Plan' })], total: 1,
    });
    expect(validToolRequest({
      method: 'POST', path: '/api/v1/tasks/one/mutations', idempotencyKey: 'safe',
      body: { action: 'task.complete', expectedVersion: 10 },
    })).toBe(true);
    expect(validToolRequest({
      method: 'POST', path: '/api/v1/workspaces/local/projects', idempotencyKey: 'forged',
      body: { name: 'Unexpected' },
    })).toBe(false);
  });
});
