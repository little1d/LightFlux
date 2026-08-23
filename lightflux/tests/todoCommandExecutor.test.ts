import { describe, expect, it } from 'vitest';

import {
  calculateTodoCommandRevision,
  createTodoCommandState,
  executeAgentProposal,
  undoAgentExecution,
} from '../agent/todoCommandExecutor';
import {
  AgentCommandError,
  AgentOperation,
  AgentProposal,
} from '../agent/types';
import { Milestone, Todo, Project } from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';

const todo = (
  id: string,
  overrides: Partial<Todo> = {},
): Todo => ({
  id,
  title: id,
  completed: false,
  completedAt: null,
  content: emptyRichTextDocument(),
  createdAt: 1,
  projectId: 'inbox',
  parentId: null,
  priority: 'none',
  scheduledDate: '2026-08-10',
  sortOrder: 0,
  trashedAt: null,
  updatedAt: 1,
  ...overrides,
  milestoneId: overrides.milestoneId ?? null,
});

const project = (id: string): Project => ({
  id,
  name: id,
  color: '#8B7EFF',
  createdAt: 1,
  kind: id === 'inbox' ? 'inbox' : 'standard',
  sortOrder: 1,
});

const milestone = (
  id: string,
  overrides: Partial<Milestone> = {},
): Milestone => ({
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
  startYear: null,
  reminderOffsets: [],
  notes: '',
  icon: 'heart-outline',
  color: '#F28B82',
  pinned: false,
  archivedAt: null,
  trashedAt: null,
  createdAt: 1,
  updatedAt: 1,
  revision: 1,
  ...overrides,
});

const proposal = (
  operations: AgentOperation[],
  baseRevision: number,
  overrides: Partial<AgentProposal> = {},
): AgentProposal => ({
  id: 'proposal-1',
  assumptions: [],
  baseRevision,
  operations,
  requiresConfirmation: true,
  risk: operations.some((operation) => operation.type === 'task.trash')
    ? 'high'
    : operations.length > 1
      ? 'medium'
      : 'low',
  summary: 'Apply task changes',
  ...overrides,
});

const operationBase = (id: string) => ({
  idempotencyKey: `key-${id}`,
  operationId: id,
});

const expectCommandError = (
  callback: () => unknown,
  code: AgentCommandError['code'],
) => {
  try {
    callback();
    throw new Error('Expected command execution to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(AgentCommandError);
    expect((error as AgentCommandError).code).toBe(code);
  }
};

describe('agent task commands', () => {
  it('creates a project, parent task, and subtask atomically', () => {
    const source = createTodoCommandState([], []);
    const result = executeAgentProposal(
      source,
      proposal(
        [
          {
            ...operationBase('project'),
            type: 'project.create',
            projectId: 'work',
            name: '工作',
          },
          {
            ...operationBase('parent'),
            type: 'task.create',
            taskId: 'expense',
            title: '处理报销',
            scheduledDate: '2026-08-11',
            projectId: 'work',
            priority: 'high',
          },
          {
            ...operationBase('child'),
            type: 'task.create',
            taskId: 'receipts',
            title: '整理发票',
            scheduledDate: '2026-08-11',
            parentId: 'expense',
          },
        ],
        source.revision,
      ),
      { confirmed: true, now: 100 },
    );

    expect(result.state.projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'inbox', kind: 'inbox' }),
        expect.objectContaining({ id: 'work', name: '工作' }),
      ]),
    );
    expect(result.state.todos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'expense',
          projectId: 'work',
          parentId: null,
          priority: 'high',
        }),
        expect.objectContaining({
          id: 'receipts',
          projectId: 'work',
          parentId: 'expense',
        }),
      ]),
    );
    expect(source.todos).toEqual([]);
    expect(result.afterRevision).not.toBe(source.revision);
  });

  it('creates tasks in Inbox when no Project is specified', () => {
    const source = createTodoCommandState([], []);
    const result = executeAgentProposal(
      source,
      proposal(
        [
          {
            ...operationBase('inbox-task'),
            type: 'task.create',
            taskId: 'inbox-task',
            title: 'Capture this',
            scheduledDate: '2026-08-11',
          },
        ],
        source.revision,
      ),
      { confirmed: true, now: 100 },
    );

    expect(result.state.todos[0]).toMatchObject({
      id: 'inbox-task',
      projectId: 'inbox',
    });
  });

  it('requires explicit confirmation for every mutation', () => {
    const source = createTodoCommandState([], []);
    expectCommandError(
      () =>
        executeAgentProposal(
          source,
          proposal(
            [
              {
                ...operationBase('create'),
                type: 'task.create',
                taskId: 'task',
                title: 'Task',
                scheduledDate: '2026-08-10',
              },
            ],
            source.revision,
          ),
          { confirmed: false },
        ),
      'confirmation-required',
    );
  });

  it('rejects stale revisions and understated risk', () => {
    const source = createTodoCommandState([todo('task')], []);
    const trashOperation: AgentOperation = {
      ...operationBase('trash'),
      type: 'task.trash',
      taskId: 'task',
    };

    expectCommandError(
      () =>
        executeAgentProposal(
          source,
          proposal([trashOperation], source.revision + 1, { risk: 'high' }),
          { confirmed: true },
        ),
      'stale-revision',
    );
    expectCommandError(
      () =>
        executeAgentProposal(
          source,
          proposal([trashOperation], source.revision, { risk: 'low' }),
          { confirmed: true },
        ),
      'risk-understated',
    );
  });

  it('requires medium risk for task rescheduling through update', () => {
    const source = createTodoCommandState([todo('task')], []);
    const operation: AgentOperation = {
      ...operationBase('reschedule'),
      type: 'task.update',
      taskId: 'task',
      changes: { scheduledDate: '2026-08-11' },
    };

    expectCommandError(
      () =>
        executeAgentProposal(
          source,
          proposal([operation], source.revision, { risk: 'low' }),
          { confirmed: true, now: 100 },
        ),
      'risk-understated',
    );
    expect(
      executeAgentProposal(
        source,
        proposal([operation], source.revision, { risk: 'medium' }),
        { confirmed: true, now: 100 },
      ).state.todos[0].scheduledDate,
    ).toBe('2026-08-11');
  });

  it('keeps the source unchanged when a later operation fails', () => {
    const source = createTodoCommandState([todo('existing')], []);
    const snapshot = JSON.stringify(source);
    expectCommandError(
      () =>
        executeAgentProposal(
          source,
          proposal(
            [
              {
                ...operationBase('valid'),
                type: 'task.update',
                taskId: 'existing',
                changes: { title: 'Changed' },
              },
              {
                ...operationBase('invalid'),
                type: 'task.update',
                taskId: 'missing',
                changes: { title: 'Missing' },
              },
            ],
            source.revision,
          ),
          { confirmed: true, now: 100 },
        ),
      'target-not-found',
    );
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it('rejects duplicate idempotency keys', () => {
    const source = createTodoCommandState([todo('task')], []);
    expectCommandError(
      () =>
        executeAgentProposal(
          source,
          proposal(
            [
              {
                ...operationBase('one'),
                idempotencyKey: 'same-key',
                type: 'task.update',
                taskId: 'task',
                changes: { title: 'One' },
              },
              {
                ...operationBase('two'),
                idempotencyKey: 'same-key',
                type: 'task.update',
                taskId: 'task',
                changes: { priority: 'high' },
              },
            ],
            source.revision,
          ),
          { confirmed: true },
        ),
      'duplicate-operation',
    );
  });

  it('prevents moving a task beneath its descendant', () => {
    const source = createTodoCommandState(
      [todo('parent'), todo('child', { parentId: 'parent' })],
      [],
    );
    expectCommandError(
      () =>
        executeAgentProposal(
          source,
          proposal(
            [
              {
                ...operationBase('move'),
                type: 'task.move',
                taskId: 'parent',
                parentId: 'child',
              },
            ],
            source.revision,
            { risk: 'medium' },
          ),
          { confirmed: true },
        ),
      'invalid-operation',
    );
  });

  it('preserves sibling order when only the scheduled date changes', () => {
    const source = createTodoCommandState(
      [
        todo('first', { sortOrder: 0 }),
        todo('second', { sortOrder: 1 }),
        todo('third', { sortOrder: 2 }),
      ],
      [],
    );
    const result = executeAgentProposal(
      source,
      proposal(
        [
          {
            ...operationBase('move-date'),
            type: 'task.move',
            taskId: 'second',
            scheduledDate: '2026-08-11',
          },
        ],
        source.revision,
        { risk: 'medium' },
      ),
      { confirmed: true, now: 100 },
    );

    expect(
      result.state.todos.map(({ id, sortOrder }) => ({ id, sortOrder })),
    ).toEqual([
      { id: 'first', sortOrder: 0 },
      { id: 'second', sortOrder: 1 },
      { id: 'third', sortOrder: 2 },
    ]);
  });

  it('trashes a full task branch and can undo it', () => {
    const source = createTodoCommandState(
      [todo('parent'), todo('child', { parentId: 'parent' })],
      [],
    );
    const result = executeAgentProposal(
      source,
      proposal(
        [
          {
            ...operationBase('trash'),
            type: 'task.trash',
            taskId: 'parent',
          },
        ],
        source.revision,
        { risk: 'high' },
      ),
      { confirmed: true, now: 100 },
    );

    expect(result.state.todos.every((item) => item.trashedAt === 100)).toBe(
      true,
    );
    expect(undoAgentExecution(result.state, result.undoToken)).toEqual(source);
  });

  it('refuses undo after another task change', () => {
    const source = createTodoCommandState([todo('task')], []);
    const result = executeAgentProposal(
      source,
      proposal(
        [
          {
            ...operationBase('complete'),
            type: 'task.set_completion',
            taskId: 'task',
            completed: true,
          },
        ],
        source.revision,
        { risk: 'medium' },
      ),
      { confirmed: true, now: 100 },
    );
    const changedTodos = result.state.todos.map((item) => ({
      ...item,
      title: 'Changed elsewhere',
      updatedAt: 200,
    }));
    const changedState = {
      ...result.state,
      revision: calculateTodoCommandRevision(
        changedTodos,
        result.state.projects,
      ),
      todos: changedTodos,
    };

    expectCommandError(
      () => undoAgentExecution(changedState, result.undoToken),
      'undo-conflict',
    );
  });

  it('rejects runtime attempts to update rich text', () => {
    const source = createTodoCommandState(
      [todo('task')],
      [project('work')],
    );
    const invalidOperation = {
      ...operationBase('content'),
      type: 'task.update',
      taskId: 'task',
      changes: { content: emptyRichTextDocument() },
    } as unknown as AgentOperation;

    expectCommandError(
      () =>
        executeAgentProposal(
          source,
          proposal([invalidOperation], source.revision),
          { confirmed: true },
        ),
      'invalid-operation',
    );
  });

  it('creates and updates a lunar milestone atomically with task changes', () => {
    const source = createTodoCommandState([todo('task')], [], []);
    const result = executeAgentProposal(
      source,
      proposal(
        [
          {
            ...operationBase('milestone'),
            type: 'milestone.create',
            milestoneId: 'lunar-birthday',
            title: '生日',
            milestoneType: 'birthday',
            dateRule: {
              calendar: 'lunar',
              year: null,
              month: 6,
              day: 1,
              isLeapMonth: true,
              missingLeapMonthPolicy: 'skip-year',
            },
            reminderOffsets: [7, 0, 7],
            startYear: 2000,
          },
          {
            ...operationBase('task-update'),
            type: 'task.update',
            taskId: 'task',
            changes: { priority: 'high' },
          },
        ],
        source.revision,
      ),
      { confirmed: true, now: 100 },
    );

    expect(result.state.milestones).toEqual([
      expect.objectContaining({
        id: 'lunar-birthday',
        reminderOffsets: [0, 7],
        revision: 1,
      }),
    ]);
    expect(result.state.todos[0].priority).toBe('high');
    expect(undoAgentExecution(result.state, result.undoToken)).toEqual(source);
  });

  it('archives, unarchives, and trashes milestones with enforced risk', () => {
    const source = createTodoCommandState(
      [],
      [],
      [milestone('launch')],
    );
    const archived = executeAgentProposal(
      source,
      proposal(
        [
          {
            ...operationBase('archive'),
            type: 'milestone.archive',
            milestoneId: 'launch',
          },
        ],
        source.revision,
        { risk: 'medium' },
      ),
      { confirmed: true, now: 100 },
    );
    expect(archived.state.milestones[0].archivedAt).toBe(100);

    const unarchived = executeAgentProposal(
      archived.state,
      proposal(
        [
          {
            ...operationBase('unarchive'),
            type: 'milestone.unarchive',
            milestoneId: 'launch',
          },
        ],
        archived.state.revision,
        { risk: 'medium' },
      ),
      { confirmed: true, now: 200 },
    );
    expect(unarchived.state.milestones[0].archivedAt).toBeNull();

    const trashOperation: AgentOperation = {
      ...operationBase('milestone-trash'),
      type: 'milestone.trash',
      milestoneId: 'launch',
    };
    expectCommandError(
      () =>
        executeAgentProposal(
          unarchived.state,
          proposal([trashOperation], unarchived.state.revision, {
            risk: 'low',
          }),
          { confirmed: true, now: 300 },
        ),
      'risk-understated',
    );
    const trashed = executeAgentProposal(
      unarchived.state,
      proposal([trashOperation], unarchived.state.revision, {
        risk: 'high',
      }),
      { confirmed: true, now: 300 },
    );
    expect(trashed.state.milestones[0].trashedAt).toBe(300);
  });

  it('restores a trashed milestone without changing its archive state', () => {
    const source = createTodoCommandState(
      [],
      [],
      [milestone('launch', { archivedAt: 50, trashedAt: 60 })],
    );
    const restored = executeAgentProposal(
      source,
      proposal(
        [
          {
            ...operationBase('restore'),
            type: 'milestone.restore',
            milestoneId: 'launch',
          },
        ],
        source.revision,
        { risk: 'medium' },
      ),
      { confirmed: true, now: 100 },
    );

    expect(restored.state.milestones[0]).toMatchObject({
      archivedAt: 50,
      trashedAt: null,
    });
  });

  it('rejects malformed milestone dates without changing task state', () => {
    const source = createTodoCommandState([todo('task')], [], []);
    const snapshot = JSON.stringify(source);
    const invalid = {
      ...operationBase('invalid-milestone'),
      type: 'milestone.create',
      milestoneId: 'invalid',
      title: 'Invalid',
      milestoneType: 'custom',
      dateRule: {
        calendar: 'solar',
        year: 2026,
        month: 2,
        day: 31,
        leapDayPolicy: 'feb-28',
      },
    } as AgentOperation;

    expectCommandError(
      () =>
        executeAgentProposal(
          source,
          proposal([invalid], source.revision),
          { confirmed: true, now: 100 },
        ),
      'invalid-operation',
    );
    expect(JSON.stringify(source)).toBe(snapshot);
  });
});
