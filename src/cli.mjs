#!/usr/bin/env node

import { createInterface } from 'node:readline/promises';

import { createApiClient, LightFluxApiError } from './api.mjs';
import { readConfig, writeConfig } from './config.mjs';
import { installLightFluxSkill } from './skills.mjs';

const VERSION = '0.0.0';
const DEFAULT_API_URL = 'https://lightflux.site';

const printHelp = () => {
  process.stdout.write(`LightFlux CLI ${VERSION}

Usage:
  lightflux                 Configure context and install the Skill
  lightflux context         Show the selected Workspace and Project
  lightflux context --json  Print machine-readable context
  lightflux skills          Install the bundled Skill
  lightflux skills --force  Replace an existing Skill installation
  lightflux --help
  lightflux --version
`);
};

const createPrompts = () => {
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
          (await terminal.question('Select a number: ')).trim(),
        );
        if (Number.isInteger(answer) && options[answer - 1]) {
          return options[answer - 1].value;
        }
        process.stdout.write('Enter one of the listed numbers.\n');
      }
    },
    close: () => terminal.close(),
    confirm: async (message, initialValue = true) => {
      const hint = initialValue ? 'Y/n' : 'y/N';
      const answer = (
        await terminal.question(`${message} (${hint}): `)
      ).trim().toLowerCase();
      if (!answer) {
        return initialValue;
      }
      return answer === 'y' || answer === 'yes';
    },
  };
};

const chooseWorkspaceContext = async ({
  apiUrl,
  choose,
  token,
}) => {
  const client = createApiClient({ apiUrl, token });
  const workspaces = await client.listWorkspaces();
  if (workspaces.length === 0) {
    process.stdout.write(
      'Create a Personal or Team Workspace in LightFlux first.\n',
    );
    return {};
  }
  const workspaceId = await choose(
    'Select a Workspace',
    workspaces.map((workspace) => ({
      label: `${workspace.name} (${workspace.kind})`,
      value: workspace.id,
    })),
  );
  const workspace = workspaces.find((item) => item.id === workspaceId);
  const projects = await client.listProjects(workspaceId);
  if (projects.length === 0) {
    return {
      workspaceId,
      workspaceName: workspace?.name,
    };
  }
  const projectId = await choose(
    'Select a default Project',
    projects.map((project) => ({
      label: project.name,
      value: project.id,
    })),
  );
  const project = projects.find((item) => item.id === projectId);
  return {
    workspaceId,
    workspaceName: workspace?.name,
    projectId,
    projectName: project?.name,
  };
};

const runSetup = async () => {
  if (!process.stdin.isTTY) {
    throw new Error('Interactive setup requires a terminal.');
  }
  process.stdout.write('\nLightFlux\n\n');
  const prompts = createPrompts();
  try {
    const existing = await readConfig();
    const apiUrl = (
      await prompts.ask(
        'LightFlux API URL',
        existing?.apiUrl ?? DEFAULT_API_URL,
      )
    ).replace(/\/$/, '');
    const parsedUrl = new URL(apiUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('The API URL must use HTTP or HTTPS.');
    }

    const token = process.env.LIGHTFLUX_TOKEN?.trim();
    let workspaceContext = {};
    if (token) {
      try {
        workspaceContext = await chooseWorkspaceContext({
          apiUrl,
          choose: prompts.choose,
          token,
        });
      } catch (error) {
        if (error instanceof LightFluxApiError && error.status === 404) {
          process.stdout.write(`\n${error.message}\n`);
        } else {
          throw error;
        }
      }
    } else {
      process.stdout.write(
        [
          '',
          'Workspace login will use device authorization in LightFlux 0.1.1.',
          'Set LIGHTFLUX_TOKEN only when testing the API during development.',
          'Tokens are never written to config.json.',
          '',
        ].join('\n'),
      );
    }

    const destination = await writeConfig({
      apiUrl,
      schemaVersion: 1,
      ...workspaceContext,
    });
    if (
      await prompts.confirm(
        'Install the LightFlux Skill for Claude Code and Codex?',
      )
    ) {
      const installed = await installLightFluxSkill({ force: true });
      process.stdout.write(`\nSkill installed: ${installed.canonicalPath}\n`);
      for (const item of installed.destinations) {
        process.stdout.write(
          `  ${item.agent}: ${item.path} (${item.mode})\n`,
        );
      }
    }
    process.stdout.write(`\nConfiguration saved: ${destination}\n`);
  } finally {
    prompts.close();
  }
};

const showContext = async (json) => {
  const config = await readConfig();
  if (!config) {
    throw new Error('LightFlux is not configured. Run `lightflux` first.');
  }
  if (json) {
    process.stdout.write(`${JSON.stringify(config)}\n`);
    return;
  }
  process.stdout.write(
    [
      `API: ${config.apiUrl}`,
      `Workspace: ${config.workspaceName ?? 'not selected'}`,
      `Project: ${config.projectName ?? 'not selected'}`,
    ].join('\n') + '\n',
  );
};

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return;
  }
  if (command === '--version' || command === '-v') {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if (command === 'context') {
    await showContext(args.includes('--json'));
    return;
  }
  if (command === 'skills') {
    const result = await installLightFluxSkill({
      force: args.includes('--force'),
    });
    process.stdout.write(`Installed LightFlux Skill: ${result.canonicalPath}\n`);
    return;
  }
  if (args.length > 0) {
    throw new Error(`Unknown command: ${args.join(' ')}`);
  }
  await runSetup();
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`LightFlux: ${message}\n`);
  process.exitCode = 1;
});
