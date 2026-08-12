import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system', () => ({
  File: class {},
  Paths: { document: '' },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('../services/indexedDbStorage', () => ({
  loadWebState: vi.fn().mockResolvedValue(null),
  saveWebState: vi.fn().mockResolvedValue(undefined),
}));

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
  appendAgentConversationTurn,
  clearAgentRuntimeHistory,
  executeConfirmedAgentProposal,
  getAgentAuditRecords,
  getAgentContextSnapshot,
  getAgentContextForMessage,
  getAgentConversationState,
  previewAgentProposal,
  searchAgentMilestones,
  searchAgentTasks,
  undoLastAgentProposal,
} from '../agent/todoCommandStoreAdapter';
import { deriveTodoCommandCollections } from '../agent/todoCommandExecutor';
import { AgentProposal } from '../agent/types';
import { Milestone, TaskEvent, Todo } from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';
import { milestoneState } from '../store/milestoneDomain';
import { saveWebState } from '../services/indexedDbStorage';
import { parseAgentRuntime } from '../services/agentRuntimeStorage';

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
  milestoneId: null,
  parentId: null,
  priority: 'none',
  scheduledDate: '2026-08-10',
  sortOrder: 0,
  trashedAt: null,
  updatedAt: 1,
});

const milestone = (id: string): Milestone => ({
  id,
  title: id,
  type: 'anniversary',
  dateRule: {
    calendar: 'solar',
    year: null,
    month: 8,
    day: 10,
    leapDayPolicy: 'feb-28',
  },
  startYear: 2020,
  reminderOffsets: [0, 7],
  notes: 'private milestone note',
  icon: 'heart-outline',
  color: '#F28B82',
  pinned: false,
  archivedAt: null,
  trashedAt: null,
  createdAt: 1,
  updatedAt: 1,
  revision: 1,
});

beforeEach(() => {
  mockStore.state = {
    ...deriveTodoCommandCollections([todo('existing')]),
    ...milestoneState([]),
    groups: [],
    taskEvents: [],
    analyticsStartedAt: 1,
    language: 'zh',
    navigationOrder: [
      'today',
      'completed',
      'calendar',
      'milestones',
      'groups',
      'trash',
    ],
    ungroupedName: null,
  };
  clearAgentRuntimeHistory();
  vi.mocked(saveWebState).mockClear();
});

describe('agent Zustand adapter', () => {
  it('normalizes persisted Agent runtime records', () => {
    const parsed = parseAgentRuntime(
      JSON.stringify({
        conversationId: 'conversation',
        turns: [
          {
            id: 'turn',
            role: 'user',
            message: 'Create a task',
            createdAt: 10,
          },
          { id: 'invalid', role: 'system', message: 'Ignore this' },
        ],
        auditRecords: [],
        undoToken: null,
        undoTaskEvents: null,
      }),
    );

    expect(parsed).toMatchObject({
      schemaVersion: 1,
      conversationId: 'conversation',
      turns: [{ id: 'turn', role: 'user' }],
    });
  });

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

  it('searches milestone metadata and excludes trashed milestones by default', () => {
    mockStore.state = {
      ...mockStore.state,
      ...milestoneState([
        milestone('anniversary'),
        {
          ...milestone('trashed'),
          notes: 'find this note',
          trashedAt: 10,
        },
      ]),
    };

    expect(searchAgentMilestones({ query: 'anniversary' })).toEqual([
      expect.objectContaining({
        id: 'anniversary',
        archived: false,
        trashed: false,
      }),
    ]);
    expect(searchAgentMilestones({ query: 'find this' })).toEqual([]);
    expect(
      searchAgentMilestones({ query: 'find this', trashed: true }),
    ).toEqual([
      expect.objectContaining({ id: 'trashed', trashed: true }),
    ]);
  });

  it('sends only locally selected task candidates and omits milestone notes', () => {
    const tasks = Array.from({ length: 200 }, (_, index) => ({
      ...todo(`task-${index}`),
      priority: 'high' as const,
      scheduledDate: '2026-08-11',
    }));
    mockStore.state = {
      ...mockStore.state,
      ...deriveTodoCommandCollections(tasks),
      ...milestoneState([milestone('private-anniversary')]),
    };

    const taskContext = getAgentContextForMessage(
      '明天所有高优先级任务',
      new Date(2026, 7, 10),
    );
    expect(taskContext.tasks).toHaveLength(160);
    expect(taskContext.tasks.every((task) => !task.trashed)).toBe(true);
    expect(taskContext.scope.tasksTruncated).toBe(true);

    const milestoneContext = getAgentContextForMessage(
      '查看纪念日',
      new Date(2026, 7, 10),
    );
    expect(milestoneContext.milestones[0]).toMatchObject({
      id: 'private-anniversary',
      notes: '',
    });
    expect(milestoneContext.scope.milestoneNotesIncluded).toBe(false);

    const greetingContext = getAgentContextForMessage(
      '你好',
      new Date(2026, 7, 10),
    );
    expect(greetingContext.tasks).toEqual([]);
    expect(greetingContext.groups).toEqual([]);
    expect(greetingContext.milestones).toEqual([]);
  });

  it('dry-runs proposals and exposes full task-branch impact', () => {
    mockStore.state = {
      ...mockStore.state,
      ...deriveTodoCommandCollections([
        todo('parent'),
        { ...todo('child'), parentId: 'parent' },
      ]),
    };
    const context = getAgentContextSnapshot();
    const proposal: AgentProposal = {
      id: 'trash-preview',
      assumptions: [],
      baseRevision: context.revision,
      operations: [
        {
          idempotencyKey: 'trash-preview-key',
          operationId: 'trash-preview-operation',
          type: 'task.trash',
          taskId: 'parent',
        },
      ],
      requiresConfirmation: true,
      risk: 'high',
      summary: 'Trash a task branch',
    };

    expect(previewAgentProposal(proposal, 100).operations[0]).toMatchObject({
      target: 'parent',
      affectedIds: expect.arrayContaining(['parent', 'child']),
      changes: [
        expect.objectContaining({
          field: 'trashed',
          before: false,
          after: true,
        }),
      ],
    });
    expect(mockStore.state.trashedTodos).toEqual([]);
  });

  it('applies a confirmed proposal, audits it, persists it, and supports undo', async () => {
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

    appendAgentConversationTurn({
      id: 'assistant-turn',
      role: 'assistant',
      message: 'Create one task',
      createdAt: 90,
      proposal,
      proposalStatus: 'pending',
    });
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
        proposal: expect.objectContaining({ id: 'proposal' }),
        undoneAt: null,
      }),
    ]);
    expect(getAgentConversationState().turns[0].proposalStatus).toBe(
      'executed',
    );
    await vi.waitFor(() => {
      expect(saveWebState).toHaveBeenCalled();
      expect(String(vi.mocked(saveWebState).mock.calls.at(-1)?.[1])).toContain(
        '"proposalId":"proposal"',
      );
    });
    expect(mockStore.state.taskEvents).toEqual([
      expect.objectContaining({
        taskId: 'created',
        type: 'created',
        occurredAt: 100,
      }),
    ]);

    expect(undoLastAgentProposal(200)).toBe(true);
    expect(
      (mockStore.state.allTodos as Todo[]).some((item) => item.id === 'created'),
    ).toBe(false);
    expect(mockStore.state.taskEvents as TaskEvent[]).toEqual([]);
    expect(getAgentAuditRecords()[0].undoneAt).toBe(200);
    expect(getAgentConversationState().turns[0].proposalStatus).toBe('undone');
    expect(undoLastAgentProposal()).toBe(false);
  });

  it('applies and undoes milestone proposals through the shared state', () => {
    const context = getAgentContextSnapshot();
    const proposal: AgentProposal = {
      id: 'milestone-proposal',
      assumptions: [],
      baseRevision: context.revision,
      operations: [
        {
          idempotencyKey: 'milestone-create-key',
          operationId: 'milestone-create',
          type: 'milestone.create',
          milestoneId: 'launch',
          title: '产品上线',
          milestoneType: 'countdown',
          dateRule: {
            calendar: 'solar',
            year: 2026,
            month: 9,
            day: 7,
            leapDayPolicy: 'feb-28',
          },
        },
      ],
      requiresConfirmation: true,
      risk: 'low',
      summary: 'Create one milestone',
    };

    executeConfirmedAgentProposal(proposal, 100);
    expect(mockStore.state.allMilestones).toEqual([
      expect.objectContaining({ id: 'launch', title: '产品上线' }),
    ]);

    expect(undoLastAgentProposal(200)).toBe(true);
    expect(mockStore.state.allMilestones).toEqual([]);
  });
});
