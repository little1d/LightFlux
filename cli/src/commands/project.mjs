import {
  enabled,
  integer,
  parseArgs,
  requireText,
  value,
} from '../args.mjs';
import { emit, rows } from '../format.mjs';
import { confirmDestructive, newIdempotencyKey } from '../session.mjs';

export const specs = {
  color: {
    flags: { '--idempotency-key': 'value', '--json': 'boolean' },
    usage: 'lightflux project color <id> <#rrggbb> [--json]',
  },
  create: {
    flags: {
      '--after': 'value',
      '--color': 'value',
      '--idempotency-key': 'value',
      '--json': 'boolean',
    },
    usage: 'lightflux project create <name> [--color <#rrggbb>] [--after <id>] [--json]',
  },
  delete: {
    flags: {
      '--idempotency-key': 'value',
      '--json': 'boolean',
      '--yes': 'boolean',
    },
    usage: 'lightflux project delete <id> [--yes] [--json]',
  },
  rename: {
    flags: { '--idempotency-key': 'value', '--json': 'boolean' },
    usage: 'lightflux project rename <id> <name> [--json]',
  },
  reorder: {
    flags: {
      '--idempotency-key': 'value',
      '--json': 'boolean',
      '--position': 'value',
    },
    usage: 'lightflux project reorder <id> --position <n> [--json]',
  },
};

const summary = (project) =>
  `${project.id}\t${project.kind}\t${project.name}`;

const create = async ({ client, config, parsed }) => {
  const name = requireText(parsed.positionals.join(' '), 'Project name');
  const color = value(parsed, '--color');
  const after = value(parsed, '--after');
  const result = await client.createProject(
    config.workspaceId,
    {
      name,
      ...(color === undefined ? {} : { color }),
      ...(after === undefined ? {} : { afterProjectId: after }),
    },
    value(parsed, '--idempotency-key') ?? newIdempotencyKey(),
  );
  emit(
    result,
    parsed.json,
    (payload) => `Created project ${payload.project.id}: ${payload.project.name}`,
  );
};

const show = async ({ client, parsed }) => {
  const projectId = requireText(parsed.positionals[0], 'Project ID');
  const result = await client.showProject(projectId);
  emit(result, parsed.json, ({ project }) =>
    [
      summary(project),
      `Color: ${project.color}`,
      `Order: ${project.sortOrder}`,
    ].join('\n'),
  );
};

const mutate = async ({ action, client, parsed }) => {
  const projectId = requireText(parsed.positionals[0], 'Project ID');
  const idempotencyKey =
    value(parsed, '--idempotency-key') ?? newIdempotencyKey();

  if (action === 'delete') {
    const proceed = await confirmDestructive({
      command: 'Project delete',
      message: `Delete project ${projectId}? Its tasks return to Inbox.`,
      yes: enabled(parsed, '--yes'),
    });
    if (!proceed) {
      return undefined;
    }
  }

  const mutation = {
    rename: () => ({
      action: 'project.update',
      name: requireText(parsed.positionals.slice(1).join(' '), 'Project name'),
    }),
    color: () => ({
      action: 'project.update',
      color: requireText(parsed.positionals[1], 'Project color'),
    }),
    reorder: () => ({
      action: 'project.reorder',
      position: integer(parsed, '--position', { required: true }),
    }),
    delete: () => ({ action: 'project.delete' }),
  }[action];

  const result = await client.mutateProject(
    projectId,
    mutation(),
    idempotencyKey,
  );
  emit(result, parsed.json, (payload) => {
    if (action === 'delete') {
      return `Deleted project ${projectId}; its tasks returned to Inbox.`;
    }
    if (action === 'reorder') {
      return `Project ${projectId} moved to position ${payload.project.sortOrder}.`;
    }
    return `Updated project ${payload.project.id}: ${payload.project.name}`;
  });
};

const HANDLERS = { create, show };

/** Resolves one `lightflux project ...` subcommand and parses its flags. */
export const prepare = ({ action, argv }) => {
  const spec = specs[action];
  if (!spec) {
    throw new Error(`Unknown project command: ${action ?? ''}`);
  }
  const parsed = parseArgs({ argv, spec, usage: spec.usage });
  requireText(parsed.positionals[0], 'Project ID');
  if (action === 'reorder') {
    integer(parsed, '--position', { required: true });
  }
  if (action === 'rename' || action === 'color') {
    requireText(parsed.positionals[1], 'Project value');
  }
  return { action, parsed };
};

/** Runs a prepared subcommand against an open session. */
export const run = async ({ action, client, config, parsed }) =>
  (HANDLERS[action] ?? mutate)({ action, client, config, parsed });

/** Lists the Projects of the active Workspace. */
export const list = async ({ client, config, json }) => {
  const projects = await client.listProjects(config.workspaceId);
  emit(projects, json, (items) => rows(items.map(summary)));
};
