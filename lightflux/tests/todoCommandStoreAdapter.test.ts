import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStore = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
}));

vi.mock('../store/todoStore', () => ({
  useTodoStore: {
    getState: () => mockStore.state,
    setState: (changes: Record<string, unknown>) => {
      mockStore.state = { ...mockStore.state, ...changes };
    },
  },
}));

import {
  clearAgentRuntimeHistory,
  executeConfirmedAgentProposal,
  getAgentAuditRecords,
  getAgentContextSnapshot,
  searchAgentTasks,
  undoLastAgentProposal,
} from '../agent/todoCommandStoreAdapter';
import { deriveTodoCommandCollections } from '../agent/todoCommandExecutor';
import { AgentProposal } from '../agent/types';
import { Todo } from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';

const todo = (id: string): Todo => ({
  id,
  title: id,
  completed: false,
  completedAt: null,
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'private task body' }],
      },
    ],
  },
  createdAt: 1,
  groupId: null,
  parentId: null,
  priority: 'none',
  scheduledDate: '2026-08-10',
  sortOrder: 0,
  trashedAt: null,
  updatedAt: 1,
});

beforeEach(() => {
  mockStore.state = {
    ...deriveTodoCommandCollections([todo('existing')]),
    groups: [],
    language: 'zh',
    navigationOrder: [
      'search',
      'today',
      'completed',
      'calendar',
      'groups',
      'trash',
    ],
    ungroupedName: null,
  };
  clearAgentRuntimeHistory();
});

describe('agent Zustand adapter', () => {
  it('exposes task metadata without rich-text content', () => {
    const context = getAgentContextSnapshot();

    expect(context.tasks).toEqual([
      expect.objectContaining({ id: 'existing', title: 'existing' }),
    ]);
    expect(context.tasks[0]).not.toHaveProperty('content');
  });

  it('searches active task metadata without exposing trashed tasks by default', () => {
    mockStore.state = {
      ...mockStore.state,
      ...deriveTodoCommandCollections([
        todo('active'),
        { ...todo('trashed'), trashedAt: 10 },
      ]),
    };

    expect(searchAgentTasks({ query: 'active' })).toEqual([
      expect.objectContaining({ id: 'active', trashed: false }),
    ]);
    expect(searchAgentTasks({ query: 'trashed' })).toEqual([]);
    expect(searchAgentTasks({ query: 'trashed', trashed: true })).toEqual([
      expect.objectContaining({ id: 'trashed', trashed: true }),
    ]);
  });

  it('applies a confirmed proposal, audits it, and supports undo', () => {
    const context = getAgentContextSnapshot();
    const proposal: AgentProposal = {
      id: 'proposal',
      assumptions: [],
      baseRevision: context.revision,
      operations: [
        {
          idempotencyKey: 'create-key',
          operationId: 'create',
          type: 'task.create',
          taskId: 'created',
          title: 'Created by agent',
          scheduledDate: '2026-08-11',
        },
      ],
      requiresConfirmation: true,
      risk: 'low',
      summary: 'Create one task',
    };

    executeConfirmedAgentProposal(proposal, 100);
    expect(
      (mockStore.state.allTodos as Todo[]).find((item) => item.id === 'created'),
    ).toMatchObject({
      title: 'Created by agent',
      content: emptyRichTextDocument(),
    });
    expect(getAgentAuditRecords()).toEqual([
      expect.objectContaining({
        proposalId: 'proposal',
        undoneAt: null,
      }),
    ]);

    expect(undoLastAgentProposal(200)).toBe(true);
    expect(
      (mockStore.state.allTodos as Todo[]).some((item) => item.id === 'created'),
    ).toBe(false);
    expect(getAgentAuditRecords()[0].undoneAt).toBe(200);
    expect(undoLastAgentProposal()).toBe(false);
  });
});
