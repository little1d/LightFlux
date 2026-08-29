import assert from 'node:assert/strict';
import { lstat, mkdtemp, readFile, readlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { installLightFluxSkill } from '../src/skills.mjs';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);
const sourceDirectory = join(repositoryRoot, 'skills', 'lightflux');

test('installs one canonical Skill for supported agents', async () => {
  const homeDirectory = await mkdtemp(
    join(tmpdir(), 'lightflux-skill-home-'),
  );
  const result = await installLightFluxSkill({
    homeDirectory,
    sourceDirectory,
  });

  assert.match(
    await readFile(join(result.canonicalPath, 'SKILL.md'), 'utf8'),
    /name: "lightflux"/,
  );
  for (const destination of result.destinations) {
    const stat = await lstat(destination.path);
    if (stat.isSymbolicLink()) {
      assert.equal(
        resolve(dirname(destination.path), await readlink(destination.path)),
        result.canonicalPath,
      );
    } else {
      assert.match(
        await readFile(join(destination.path, 'SKILL.md'), 'utf8'),
        /name: "lightflux"/,
      );
    }
  }
});

test('does not overwrite an existing Skill without force', async () => {
  const homeDirectory = await mkdtemp(
    join(tmpdir(), 'lightflux-skill-home-'),
  );
  await installLightFluxSkill({ homeDirectory, sourceDirectory });

  await assert.rejects(
    installLightFluxSkill({ homeDirectory, sourceDirectory }),
    /already exists/,
  );
});
