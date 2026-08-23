import { describe, expect, it } from 'vitest';

import {
  deriveTaskEventsFromTodoDiff,
  migrateTaskEvents,
} from '../store/taskEventDomain';
import { Todo } from '../types/todo';
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
  createdAt: 10,
  projectId: 'inbox',
  milestoneId: null,
  parentId: null,
  priority: 'none',
  scheduledDate: '2026-08-10',
  sortOrder: 0,
  trashedAt: null,
  updatedAt: 10,
  ...overrides,
});

describe('task event domain', () => {
  it('builds the minimum migration history from authoritative timestamps', () => {
    const events = migrateTaskEvents([
      todo('legacy', {
        completed: true,
        completedAt: 20,
        trashedAt: 30,
      }),
    ]);

    expect(events).toEqual([
      expect.objectContaining({
        taskId: 'legacy',
        type: 'created',
        occurredAt: 10,
        metadata: expect.objectContaining({
          migrated: true,
          scheduledDate: '2026-08-10',
        }),
      }),
      expect.objectContaining({
        taskId: 'legacy',
        type: 'completed',
        occurredAt: 20,
      }),
      expect.objectContaining({
        taskId: 'legacy',
        type: 'trashed',
        occurredAt: 30,
      }),
    ]);
  });

  it('derives completion, schedule, and trash changes from atomic commands', () => {
    const before = [todo('task')];
    const after = [
      todo('task', {
        completed: true,
        completedAt: 100,
        scheduledDate: '2026-08-11',
        trashedAt: 100,
      }),
    ];

    expect(
      deriveTaskEventsFromTodoDiff(before, after, 100).map((event) => ({
        type: event.type,
        metadata: event.metadata,
      })),
    ).toEqual([
      {
        type: 'rescheduled',
        metadata: {
          previousScheduledDate: '2026-08-10',
          scheduledDate: '2026-08-11',
        },
      },
      { type: 'completed', metadata: undefined },
      { type: 'trashed', metadata: undefined },
    ]);
  });

  it('records task creation and its final state in one proposal', () => {
    const events = deriveTaskEventsFromTodoDiff(
      [],
      [
        todo('created', {
          completed: true,
          completedAt: 100,
        }),
      ],
      100,
    );

    expect(events.map((event) => event.type)).toEqual([
      'created',
      'completed',
    ]);
  });
});
