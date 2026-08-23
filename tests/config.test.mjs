import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { readConfig, writeConfig } from '../src/config.mjs';

test('config storage excludes credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lightflux-config-'));
  await writeConfig(
    {
      apiUrl: 'https://lightflux.site/',
      projectId: 'project',
      projectName: 'Website',
      schemaVersion: 1,
      workspaceId: 'workspace',
      workspaceName: 'Team',
    },
    directory,
  );

  assert.deepEqual(await readConfig(directory), {
    apiUrl: 'https://lightflux.site',
    projectId: 'project',
    projectName: 'Website',
    schemaVersion: 1,
    workspaceId: 'workspace',
    workspaceName: 'Team',
  });
  assert.equal(
    (await readFile(join(directory, 'config.json'), 'utf8')).includes('token'),
    false,
  );
});
