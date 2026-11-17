import { enabled, parseArgs, requireText } from '../args.mjs';
import { deleteCredentials } from '../credentials.mjs';
import { emit, note, rows } from '../format.mjs';
import { selectWorkspaceContext } from '../context.mjs';
import { list as listProjects } from './project.mjs';
import {
  confirmDestructive,
  createPrompts,
  openSession,
  writeConfig,
} from '../session.mjs';

/**
 * Opens a session for the commands that need one. Commands that manage the
 * session itself (`setup`) run without it.
 */
const setup = async ({ client, config }) => {
  if (!process.stdin.isTTY) {
    note('Connected to local LightFlux Desktop. No login required.');
    return;
  }
  const prompts = createPrompts();
  try {
    const context = await selectWorkspaceContext({
      choose: prompts.choose,
      client,
    });
    await writeConfig({ ...config, ...context });
    note('Local desktop context saved.');
  } finally {
    prompts.close();
  }
};

const context = async ({ config, json }) => {
  emit(config, json, (saved) =>
    [
      `API: ${saved.apiUrl}`,
      `Workspace: ${saved.workspaceName ?? 'not selected'}`,
      `Project: ${saved.projectName ?? 'not selected'}`,
    ].join('\n'),
  );
};

const audit = async ({ client, config, json }) => {
  const result = await client.listAudit(config.workspaceId);
  emit(result, json, (payload) =>
    rows(
      payload.mutations.map((mutation) =>
        [
          mutation.id,
          mutation.action,
          mutation.undoneAt ? 'undone' : 'active',
          mutation.createdAt,
        ].join('\t'),
      ),
    ),
  );
};

const undo = async ({ client, json, parsed }) => {
  const mutationId = requireText(parsed.positionals[0], 'Mutation ID');
  const proceed = await confirmDestructive({
    command: 'Mutation undo',
    message: `Undo Workspace mutation ${mutationId}?`,
    yes: enabled(parsed, '--yes'),
  });
  if (!proceed) {
    return undefined;
  }
  const result = await client.undoMutation(mutationId);
  emit(
    result,
    json,
    (payload) => `Mutation undone at Workspace revision ${payload.revision}.`,
  );
};

const login = async ({ config }) => {
  note(
    `Connected to local LightFlux Desktop at ${config.apiUrl}. No account or login required.`,
  );
};

const logout = async () => {
  await deleteCredentials();
  note(
    'Legacy CLI credentials removed. Local desktop access uses your operating-system account.',
  );
};

const projects = async ({ client, config, json }) =>
  listProjects({ client, config, json });

/**
 * Commands that act on the Workspace rather than on one entity. `session`
 * marks the commands that manage the connection themselves instead of
 * receiving an open one.
 */
export const workspaceCommands = {
  audit: {
    flags: { '--json': 'boolean' },
    run: audit,
    usage: 'lightflux audit [--json]',
  },
  context: {
    flags: { '--json': 'boolean' },
    run: context,
    usage: 'lightflux context [--json]',
  },
  login: {
    flags: { '--json': 'boolean' },
    run: login,
    usage: 'lightflux login',
  },
  logout: {
    flags: { '--json': 'boolean' },
    run: logout,
    session: false,
    usage: 'lightflux logout',
  },
  projects: {
    flags: { '--json': 'boolean' },
    run: projects,
    usage: 'lightflux projects [--json]',
  },
  setup: { flags: {}, run: setup, session: false, usage: 'lightflux' },
  undo: {
    flags: { '--json': 'boolean', '--yes': 'boolean' },
    run: undo,
    usage: 'lightflux undo <mutation-id> [--yes] [--json]',
  },
};

export const runWorkspaceCommand = async ({ command, argv }) => {
  const entry = workspaceCommands[command];
  const parsed = parseArgs({ argv, spec: { usage: entry.usage, flags: entry.flags } });
  if (entry.session === false) {
    return entry.run({ parsed });
  }
  const { client, config } = await openSession();
  return entry.run({ client, config, json: parsed.json, parsed });
};
