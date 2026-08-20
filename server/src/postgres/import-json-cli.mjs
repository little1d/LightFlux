import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { postgresConfigFromEnvironment } from './config.mjs';
import { createPostgresPool } from './pool.mjs';
import { createPostgresRepository } from './repository.mjs';

const inputPath = resolve(
  process.argv[2] ?? process.env.DATA_FILE ?? './data/auth.json',
);
const snapshot = JSON.parse(await readFile(inputPath, 'utf8'));
const pool = createPostgresPool(postgresConfigFromEnvironment());
const repository = createPostgresRepository({ pool });

try {
  await repository.importLegacySnapshot(snapshot);
  console.log(`Imported legacy auth data from ${inputPath}.`);
} finally {
  await repository.close();
}
