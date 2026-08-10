import { describe, expect, it } from 'vitest';

import {
  TaskEvent,
  Todo,
  TodoGroup,
} from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';
import { buildTaskAnalytics } from '../utils/taskAnalytics';

const timestamp = (day: number, hour = 9) =>
  new Date(2026, 7, day, hour).getTime();

const todo = (
  id: string,
  scheduledDate: string,
  overrides: Partial<Todo> = {},
): Todo => ({
  id,
  title: id,
  completed: false,
  completedAt: null,
  content: emptyRichTextDocument(),
  createdAt: timestamp(1),
  groupId: null,
  milestoneId: null,
  parentId: null,
  priority: 'none',
  scheduledDate,
  sortOrder: 0,
  trashedAt: null,
  updatedAt: timestamp(1),
  ...overrides,
});

const event = (
  id: string,
  taskId: string,
  type: TaskEvent['type'],
  occurredAt: number,
  scheduledDate?: string,
): TaskEvent => ({
  id,
  taskId,
  type,
  occurredAt,
  ...(scheduledDate
    ? { metadata: { scheduledDate } }
    : {}),
});

const groups: TodoGroup[] = [
  {
    id: 'work',
    name: '工作',
    color: '#8B7EFF',
    createdAt: 1,
    sortOrder: 1,
  },
  {
    id: 'personal',
    name: '个人',
    color: '#55B9A5',
    createdAt: 2,
    sortOrder: 2,
  },
];

describe('task analytics', () => {
  it('calculates completion, pending change, pressure, and overdue tasks', () => {
    const todos = [
      todo('done-work', '2026-08-04', {
        completed: true,
        completedAt: timestamp(4, 18),
        groupId: 'work',
      }),
      todo('pending-work', '2026-08-05', {
        groupId: 'work',
        priority: 'high',
      }),
      todo('done-personal', '2026-08-10', {
        completed: true,
        completedAt: timestamp(9, 18),
        groupId: 'personal',
      }),
      todo('trashed', '2026-08-06', {
        completed: true,
        completedAt: timestamp(6, 18),
        groupId: 'work',
        trashedAt: timestamp(7),
      }),
    ];
    const events = [
      event('a1', 'done-work', 'created', timestamp(4), '2026-08-04'),
      event('a2', 'done-work', 'completed', timestamp(4, 18)),
      event(
        'b1',
        'pending-work',
        'created',
        timestamp(5),
        '2026-08-05',
      ),
      event(
        'c1',
        'done-personal',
        'created',
        timestamp(8),
        '2026-08-10',
      ),
      event('c2', 'done-personal', 'completed', timestamp(9, 18)),
      event('d1', 'trashed', 'created', timestamp(6), '2026-08-06'),
      event('d2', 'trashed', 'completed', timestamp(6, 18)),
      event('d3', 'trashed', 'trashed', timestamp(7)),
    ];

    const result = buildTaskAnalytics({
      todos,
      groups,
      taskEvents: events,
      analyticsStartedAt: timestamp(1),
      range: '7d',
      now: new Date(2026, 7, 10, 12),
      ungroupedName: '未分组',
    });

    expect(result.completedCount).toBe(2);
    expect(result.plannedCount).toBe(3);
    expect(result.completionRate).toBe(67);
    expect(result.pendingDelta).toBe(1);
    expect(result.createdCount).toBe(3);
    expect(result.currentOverdue).toBe(1);
    expect(result.highPriorityOverdue).toBe(1);
    expect(result.estimated).toBe(false);
    expect(result.pressure).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groupId: 'work',
          completed: 1,
          pending: 1,
          overdue: 1,
        }),
        expect.objectContaining({
          groupId: 'personal',
          completed: 1,
          pending: 0,
        }),
      ]),
    );
  });

  it('counts a task once when it is completed and reopened in one period', () => {
    const source = todo('repeat', '2026-08-09');
    const events = [
      event('created', 'repeat', 'created', timestamp(1), '2026-08-08'),
      {
        ...event(
          'rescheduled',
          'repeat',
          'rescheduled',
          timestamp(8),
          '2026-08-09',
        ),
        metadata: {
          previousScheduledDate: '2026-08-08',
          scheduledDate: '2026-08-09',
        },
      },
      event('completed', 'repeat', 'completed', timestamp(9)),
      event('reopened', 'repeat', 'reopened', timestamp(10)),
    ];

    const result = buildTaskAnalytics({
      todos: [source],
      groups: [],
      taskEvents: events,
      analyticsStartedAt: timestamp(1),
      range: '7d',
      now: new Date(2026, 7, 10, 12),
      ungroupedName: '未分组',
    });

    expect(result.completedCount).toBe(1);
    expect(result.plannedCount).toBe(1);
    expect(result.completionRate).toBe(0);
    expect(result.pendingDelta).toBe(0);
  });

  it('marks ranges crossing migration time as estimated', () => {
    const migrated = event(
      'migration',
      'legacy',
      'created',
      timestamp(4),
      '2026-08-04',
    );
    migrated.metadata = {
      ...migrated.metadata,
      migrated: true,
    };

    const result = buildTaskAnalytics({
      todos: [todo('legacy', '2026-08-04')],
      groups: [],
      taskEvents: [migrated],
      analyticsStartedAt: timestamp(10),
      range: '7d',
      now: new Date(2026, 7, 10, 12),
      ungroupedName: '未分组',
    });

    expect(result.estimated).toBe(true);

    const completeHistory = buildTaskAnalytics({
      todos: [todo('legacy', '2026-08-04')],
      groups: [],
      taskEvents: [migrated],
      analyticsStartedAt: timestamp(1),
      range: '7d',
      now: new Date(2026, 7, 10, 12),
      ungroupedName: '未分组',
    });

    expect(completeHistory.estimated).toBe(false);
  });
});
