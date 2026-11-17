import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

import { createApiClient } from './api.mjs';
import { readConfig, writeConfig } from './config.mjs';
import { connectLocalDesktop } from './local.mjs';

const LOCAL_WORKSPACE = 'local';

/** Opens a readline session; every caller must close it in a `finally`. */
export const createPrompts = () => {
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return {
    ask: async (message, initialValue = '') => {
      const suffix = initialValue ? ` (${initialValue})` : '';
      const answer = (await terminal.question(`${message}${suffix}: `)).trim();
      return answer || initialValue;
    },
    choose: async (message, options) => {
      process.stdout.write(`${message}\n`);
      options.forEach((option, index) => {
        process.stdout.write(`  ${index + 1}. ${option.label}\n`);
      });
      while (true) {
        const answer = Number(
          (await terminal.question(`Choose 1-${options.length}: `)).trim(),
        );
        if (Number.isInteger(answer) && options[answer - 1]) {
          return options[answer - 1].value;
        }
        process.stdout.write('Enter one of the listed numbers.\n');
      }
    },
    confirm: async (message, initialValue = true) => {
      const hint = initialValue ? 'Y/n' : 'y/N';
      const answer = (
        await terminal.question(`${message} (${hint}): `)
      )
        .trim()
        .toLowerCase();
      return answer ? answer === 'y' || answer === 'yes' : initialValue;
    },
    close: () => terminal.close(),
  };
};

/**
 * Asks for confirmation on an interactive terminal. Returns false when the
 * user declines, and throws when `--yes` was not passed in CI.
 */
export const confirmDestructive = async ({
  message,
  command,
  yes,
}) => {
  if (yes) {
    return true;
  }
  if (!process.stdin.isTTY) {
    throw new Error(`${command} requires --yes in non-interactive mode.`);
  }
  const prompts = createPrompts();
  try {
    return await prompts.confirm(message, false);
  } finally {
    prompts.close();
  }
};

/**
 * Connects to the local desktop and resolves the active Project.
 *
 * The saved Project is preferred while it still exists, then Inbox, then the
 * first Project, so a deleted default degrades instead of failing.
 */
export const openSession = async () => {
  const { connection, probed } = await connectLocalDesktop({
    probe: async (connectionDescriptor) => {
      const client = createApiClient(connectionDescriptor);
      return { client, projects: await client.listProjects(LOCAL_WORKSPACE) };
    },
  });
  const { client, projects } = probed;
  const saved = await readConfig();
  const project =
    projects.find(
      (item) =>
        saved?.workspaceId === LOCAL_WORKSPACE && item.id === saved.projectId,
    ) ??
    projects.find((item) => item.kind === 'inbox') ??
    projects[0];

  return {
    client,
    config: {
      apiUrl: connection.apiUrl,
      projectId: project?.id,
      projectName: project?.name,
      schemaVersion: 1,
      workspaceId: LOCAL_WORKSPACE,
      workspaceName: 'Local Workspace',
    },
  };
};

/** Resolves the Project a command should act on. */
export const projectIdFor = (parsed, config) => {
  const projectId = parsed.flags.get('--project') ?? config.projectId;
  if (!projectId) {
    throw new Error('A Project is required. Pass --project or run `lightflux`.');
  }
  return projectId;
};

export const newIdempotencyKey = () => randomUUID();

export { readConfig, writeConfig, LOCAL_WORKSPACE };
