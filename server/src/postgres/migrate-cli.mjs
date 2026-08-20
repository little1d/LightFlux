import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { postgresConfigFromEnvironment } from './config.mjs';
import { runMigrations } from './migrations.mjs';
import { createPostgresPool } from './pool.mjs';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = resolve(currentDirectory, '../../migrations');
const pool = createPostgresPool(postgresConfigFromEnvironment());

try {
  const count = await runMigrations({
    directory: migrationsDirectory,
    pool,
  });
  console.log(`PostgreSQL schema is current (${count} migration files).`);
} finally {
  await pool.end();
}
