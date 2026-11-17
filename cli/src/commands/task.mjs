import {
  changes,
  enabled,
  integer,
  parseArgs,
  rejectConflict,
  rejectPair,
  requireText,
  value,
} from '../args.mjs';
import { loadTaskContent, richTextPreview } from '../content.mjs';
import { emit, rows } from '../format.mjs';
import {
  confirmDestructive,
  newIdempotencyKey,
  projectIdFor,
} from '../session.mjs';

const SHARED = {
  '--idempotency-key': 'value',
  '--json': 'boolean',
};

const CONTENT = {
  '--content': 'value',
  '--content-file': 'value',
  '--content-json': 'value',
};

export const specs = {
  comment: {
    flags: { ...SHARED, '--message': 'value' },
    usage: 'lightflux task comment <id> --message <text>',
  },
  complete: {
    flags: { ...SHARED, '--expected-version': 'value' },
    usage: 'lightflux task complete <id> --expected-version <n>',
  },
  create: {
    flags: {
      ...SHARED,
      ...CONTENT,
      '--date': 'value',
      '--milestone': 'value',
      '--parent': 'value',
      '--priority': 'value',
      '--project': 'value',
      '--time': 'value',
    },
    usage:
      'lightflux task create <title> [--date <date>] [--time <HH:mm>] [--project <id>] [--parent <id>] [--milestone <id>] [content]',
  },
  list: {
    flags: {
      '--all': 'boolean',
      '--json': 'boolean',
      '--parent': 'value',
      '--project': 'value',
      '--root': 'boolean',
      '--trash': 'boolean',
    },
    usage:
      'lightflux task list [--project <id>] [--parent <id>] [--root] [--all] [--trash] [--json]',
  },
  reopen: {
    flags: { ...SHARED, '--expected-version': 'value' },
    usage: 'lightflux task reopen <id> --expected-version <n>',
  },
  restore: {
    flags: { ...SHARED, '--expected-version': 'value' },
    usage: 'lightflux task restore <id> --expected-version <n>',
  },
  show: {
    flags: { '--json': 'boolean' },
    usage: 'lightflux task show <id> [--json]',
  },
  trash: {
    flags: { ...SHARED, '--expected-version': 'value', '--yes': 'boolean' },
    usage: 'lightflux task trash <id> --expected-version <n> [--yes]',
  },
  update: {
    flags: {
      ...SHARED,
      ...CONTENT,
      '--date': 'value',
      '--expected-version': 'value',
      '--milestone': 'value',
      '--no-milestone': 'boolean',
      '--no-parent': 'boolean',
      '--no-time': 'boolean',
      '--parent': 'value',
      '--priority': 'value',
      '--project': 'value',
      '--time': 'value',
      '--title': 'value',
    },
    usage:
      'lightflux task update <id> --expected-version <n> [--time <HH:mm>|--no-time] [task changes]',
  },
};

const UPDATE_FIELDS = {
  '--date': 'scheduledDate',
  '--milestone': 'milestoneId',
  '--parent': 'parentId',
  '--priority': 'priority',
  '--project': 'projectId',
  '--time': 'scheduledTime',
  '--title': 'title',
};

const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const taskContent = (parsed) =>
  loadTaskContent({
    content: value(parsed, '--content'),
    contentFile: value(parsed, '--content-file'),
    contentJson: value(parsed, '--content-json'),
  });

const mutationResult = (parsed, noun) => (result) =>
  emit(result, parsed.json, (value_) => {
    const entity = value_[noun];
    return `Updated ${entity.id} to v${entity.version}.`;
  });

const list = async ({ client, config, parsed }) => {
  rejectPair(parsed, '--root', '--parent');
  const parentId = value(parsed, '--parent');
  const requestedProject = value(parsed, '--project');
  const projectId =
    parentId && !requestedProject
      ? (await client.showTask(parentId)).task.projectId
      : (requestedProject ?? projectIdFor(parsed, config));

  const result = await client.listTasks(projectId, {
    includeCompleted: enabled(parsed, '--all'),
    includeTrash: enabled(parsed, '--trash'),
  });
  const tasks = result.tasks.filter(
    (task) =>
      (parentId === undefined || task.parentId === parentId) &&
      (!enabled(parsed, '--root') || task.parentId === null),
  );

  emit({ ...result, tasks }, parsed.json, (payload) =>
    rows(
      payload.tasks.map((task) =>
        [
          task.id,
          `v${task.version}`,
          task.completed ? 'done' : 'open',
          task.parentId ? 'subtask' : 'root',
          task.title,
        ].join('\t'),
      ),
    ),
  );
};

const show = async ({ client, parsed }) => {
  const taskId = requireText(parsed.positionals[0], 'Task ID');
  const result = await client.showTask(taskId);
  emit(result, parsed.json, ({ task }) =>
    [
      `${task.id}\tv${task.version}\t${task.title}`,
      `Project: ${task.projectId}`,
      `Schedule: ${task.scheduledDate}${task.scheduledTime ? ` ${task.scheduledTime}` : ' (all-day)'}`,
      `Parent: ${task.parentId ?? 'none'}`,
      `Milestone: ${task.milestoneId ?? 'none'}`,
      `Content: ${richTextPreview(task.content) || 'empty'}`,
    ].join('\n'),
  );
};

const create = async ({ client, config, content, parsed }) => {
  const title = requireText(parsed.positionals.join(' '), 'Task title');
  const parentId = value(parsed, '--parent');
  const requestedProject = value(parsed, '--project');
  let projectId = requestedProject;

  if (parentId) {
    const parent = await client.showTask(parentId);
    if (requestedProject && requestedProject !== parent.task.projectId) {
      throw new Error('A subtask must use its parent Project.');
    }
    projectId = parent.task.projectId;
  }

  const milestoneId = value(parsed, '--milestone');
  const result = await client.createTask(
    projectId ?? projectIdFor(parsed, config),
    {
      title,
      scheduledDate: value(parsed, '--date') ?? today(),
      scheduledTime: value(parsed, '--time') ?? null,
      priority: value(parsed, '--priority') ?? 'none',
      ...(parentId ? { parentId } : {}),
      ...(milestoneId === undefined ? {} : { milestoneId }),
      ...(content === undefined ? {} : { content }),
    },
    value(parsed, '--idempotency-key') ?? newIdempotencyKey(),
  );

  emit(result, parsed.json, ({ task }) => `Created ${task.id}: ${task.title}`);
};

const comment = async ({ client, parsed }) => {
  const taskId = requireText(parsed.positionals[0], 'Task ID');
  const message = requireText(value(parsed, '--message'), 'Comment message');
  await client.addTaskComment(
    taskId,
    message,
    value(parsed, '--idempotency-key') ?? newIdempotencyKey(),
  );
  emit(null, parsed.json, () => `Comment added to ${taskId}.`);
};

const updateChanges = (parsed, content) => ({
  ...changes(parsed, UPDATE_FIELDS),
  ...(content === undefined ? {} : { content }),
});

const mutate = async ({ action, client, content, parsed }) => {
  const taskId = requireText(parsed.positionals[0], 'Task ID');
  const expectedVersion = integer(parsed, '--expected-version', {
    required: true,
  });
  const idempotencyKey =
    value(parsed, '--idempotency-key') ?? newIdempotencyKey();

  if (action === 'update') {
    const updated = updateChanges(parsed, content);
    if (Object.keys(updated).length === 0) {
      throw new Error('Task update requires at least one change.');
    }
    const result = await client.mutateTask(
      taskId,
      { action: 'task.update', changes: updated, expectedVersion },
      idempotencyKey,
    );
    return mutationResult(parsed, 'task')(result);
  }

  if (action === 'trash') {
    const proceed = await confirmDestructive({
      command: 'Task trash',
      message: `Move task ${taskId} to trash?`,
      yes: enabled(parsed, '--yes'),
    });
    if (!proceed) {
      return undefined;
    }
  }

  const result = await client.mutateTask(
    taskId,
    { action: `task.${action}`, expectedVersion },
    idempotencyKey,
  );
  return mutationResult(parsed, 'task')(result);
};

const HANDLERS = { comment, create, list, show };

/**
 * Resolves one `lightflux task ...` subcommand and parses its flags. Parsing
 * happens before the desktop connection opens, so a typo fails fast instead
 * of launching the app.
 */
export const prepare = async ({ action, argv }) => {
  const spec = specs[action];
  if (!spec) {
    throw new Error(`Unknown task command: ${action ?? ''}`);
  }
  const parsed = parseArgs({ argv, spec, usage: spec.usage });

  // Validate everything that does not need the desktop before connecting, so
  // contradictory or missing flags fail without launching the app.
  if (action === 'list') {
    rejectPair(parsed, '--root', '--parent');
  }
  if (action === 'update') {
    rejectConflict(parsed, '--time');
    rejectConflict(parsed, '--parent');
    rejectConflict(parsed, '--milestone');
  }
  if (['complete', 'reopen', 'restore', 'trash', 'update'].includes(action)) {
    integer(parsed, '--expected-version', { required: true });
  }
  if (action === 'comment') {
    requireText(value(parsed, '--message'), 'Comment message');
  }
  return { action, content: await taskContent(parsed), parsed };
};

/** Runs a prepared subcommand against an open session. */
export const run = async ({ action, client, config, content, parsed }) =>
  (HANDLERS[action] ?? mutate)({ action, client, config, content, parsed });
