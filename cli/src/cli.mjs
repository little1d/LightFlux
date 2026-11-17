#!/usr/bin/env node

import * as milestone from './commands/milestone.mjs';
import * as project from './commands/project.mjs';
import * as task from './commands/task.mjs';
import { runWorkspaceCommand, workspaceCommands } from './commands/workspace.mjs';
import { openSession } from './session.mjs';
import { VERSION } from './version.mjs';

const USAGE = `LightFlux CLI ${VERSION}

Usage:
  lightflux                         Select the default local Project
  lightflux context [--json]        Show the connected desktop and Project
  lightflux projects [--json]       List Projects
  lightflux audit [--json]          Show recent CLI mutations
  lightflux undo <id> [--yes]       Undo the latest mutation
  lightflux task|milestone|project <command> [...]
  lightflux --help
  lightflux --version

Run \`lightflux <group> --help\` for the commands in a group.`;

const GROUPS = { milestone, project, task };

const printHelp = (text = USAGE) => {
  process.stdout.write(`${text}\n`);
};

/** The usage line for `lightflux <group>` or one of its subcommands. */
const usageFor = (command, action) => {
  if (GROUPS[command]) {
    const entry = GROUPS[command];
    if (action === undefined) {
      const names = Object.keys(entry.specs).sort();
      return [
        `lightflux ${command} <command> [...]:`,
        ...names.map((name) => `  ${name}`),
        '',
        'Run `lightflux ' + command + ' <command> --help` for one command.',
      ].join('\n');
    }
    const spec = entry.specs[action];
    if (!spec) {
      throw new Error(`Unknown ${command} command: ${action}`);
    }
    return spec.usage;
  }
  const entry = workspaceCommands[command];
  return entry ? entry.usage : USAGE;
};

const wantsHelp = (argv) => argv.includes('--help') || argv.includes('-h');

const main = async () => {
  const [command, ...rest] = process.argv.slice(2);

  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return;
  }
  if (command === '--version' || command === '-v') {
    printHelp(VERSION);
    return;
  }

  // A bare `lightflux` re-runs Project selection, the way `git remote` prints
  // its subcommands rather than erroring.
  if (command === undefined) {
    await runWorkspaceCommand({ argv: [], command: 'setup' });
    return;
  }

  if (GROUPS[command]) {
    const [action, ...argv] = rest;
    // `lightflux task --help` prints the group's commands; `lightflux task
    // create --help` prints just that command's usage.
    if (action === undefined || action === '--help' || action === '-h') {
      printHelp(usageFor(command));
      return;
    }
    if (wantsHelp(argv)) {
      printHelp(usageFor(command, action));
      return;
    }
    const prepared = await GROUPS[command].prepare({ action, argv });
    const { client, config } = await openSession();
    await GROUPS[command].run({ ...prepared, client, config });
    return;
  }

  if (workspaceCommands[command]) {
    if (wantsHelp(rest)) {
      printHelp(usageFor(command));
      return;
    }
    await runWorkspaceCommand({ argv: rest, command });
    return;
  }

  throw new Error(`Unknown command: ${[command, ...rest].join(' ')}`);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`LightFlux: ${message}\n`);
  process.exitCode = 1;
});
