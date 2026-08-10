import {
  TaskEvent,
  TaskEventMetadata,
  TaskEventType,
  Todo,
} from '../types/todo';

const eventId = (timestamp: number): string =>
  `event-${timestamp}-${Math.random().toString(36).slice(2, 9)}`;

export const createTaskEvent = (
  taskId: string,
  type: TaskEventType,
  occurredAt: number,
  metadata?: TaskEventMetadata,
): TaskEvent => ({
  id: eventId(occurredAt),
  taskId,
  type,
  occurredAt,
  ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
});

export const migrateTaskEvents = (todos: Todo[]): TaskEvent[] =>
  todos.flatMap((todo) => {
    const metadata: TaskEventMetadata = {
      migrated: true,
      scheduledDate: todo.scheduledDate,
    };
    const events: TaskEvent[] = [
      {
        id: `migration-${todo.id}-created`,
        taskId: todo.id,
        type: 'created',
        occurredAt: todo.createdAt,
        metadata,
      },
    ];
    if (todo.completedAt !== null) {
      events.push({
        id: `migration-${todo.id}-completed`,
        taskId: todo.id,
        type: 'completed',
        occurredAt: todo.completedAt,
        metadata: { migrated: true },
      });
    }
    if (todo.trashedAt !== null) {
      events.push({
        id: `migration-${todo.id}-trashed`,
        taskId: todo.id,
        type: 'trashed',
        occurredAt: todo.trashedAt,
        metadata: { migrated: true },
      });
    }
    return events;
  });

export const deriveTaskEventsFromTodoDiff = (
  beforeTodos: Todo[],
  afterTodos: Todo[],
  timestamp: number,
): TaskEvent[] => {
  const beforeById = new Map(beforeTodos.map((todo) => [todo.id, todo]));
  const result: TaskEvent[] = [];

  afterTodos.forEach((after) => {
    const before = beforeById.get(after.id);
    if (!before) {
      result.push(
        createTaskEvent(after.id, 'created', timestamp, {
          scheduledDate: after.scheduledDate,
        }),
      );
      if (after.completed) {
        result.push(createTaskEvent(after.id, 'completed', timestamp));
      }
      if (after.trashedAt !== null) {
        result.push(createTaskEvent(after.id, 'trashed', timestamp));
      }
      return;
    }

    if (before.scheduledDate !== after.scheduledDate) {
      result.push(
        createTaskEvent(after.id, 'rescheduled', timestamp, {
          previousScheduledDate: before.scheduledDate,
          scheduledDate: after.scheduledDate,
        }),
      );
    }
    if (before.completed !== after.completed) {
      result.push(
        createTaskEvent(
          after.id,
          after.completed ? 'completed' : 'reopened',
          timestamp,
        ),
      );
    }
    if (before.trashedAt === null && after.trashedAt !== null) {
      result.push(createTaskEvent(after.id, 'trashed', timestamp));
    } else if (before.trashedAt !== null && after.trashedAt === null) {
      result.push(createTaskEvent(after.id, 'restored', timestamp));
    }
  });

  return result;
};
