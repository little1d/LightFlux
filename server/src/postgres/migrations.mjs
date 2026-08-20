import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const MIGRATION_NAME_PATTERN = /^(\d{3,})_([a-z0-9_-]+)\.sql$/i;
const LOCK_NAMESPACE = 947321;
const LOCK_ID = 1;
const checksum = (sql) =>
  createHash('sha256').update(sql).digest('hex');

const loadMigrations = async (directory) => {
  const filenames = (await readdir(directory))
    .filter((filename) => MIGRATION_NAME_PATTERN.test(filename))
    .sort();

  const migrations = await Promise.all(
    filenames.map(async (filename) => {
      const match = filename.match(MIGRATION_NAME_PATTERN);
      const sql = await readFile(resolve(directory, filename), 'utf8');
      return {
        checksum: checksum(sql),
        id: Number(match[1]),
        name: match[2],
        sql,
      };
    }),
  );
  const ids = new Set();
  for (const migration of migrations) {
    if (ids.has(migration.id)) {
      throw new Error(`Migration ID ${migration.id} is duplicated.`);
    }
    ids.add(migration.id);
  }
  return migrations;
};

export const runMigrations = async ({
  pool,
  directory,
  useAdvisoryLock = true,
}) => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS lightflux_schema_migrations (
        id integer PRIMARY KEY,
        name text NOT NULL,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    if (useAdvisoryLock) {
      await client.query('SELECT pg_advisory_lock($1, $2)', [
        LOCK_NAMESPACE,
        LOCK_ID,
      ]);
    }

    const migrations = await loadMigrations(directory);
    const appliedResult = await client.query(
      `SELECT id, name, checksum
       FROM lightflux_schema_migrations
       ORDER BY id`,
    );
    const applied = new Map(
      appliedResult.rows.map((migration) => [
        Number(migration.id),
        migration,
      ]),
    );

    for (const migration of migrations) {
      const appliedMigration = applied.get(migration.id);
      if (appliedMigration) {
        if (appliedMigration.name !== migration.name) {
          throw new Error(
            `Migration ${migration.id} was renamed from ${appliedMigration.name} to ${migration.name}.`,
          );
        }
        if (appliedMigration.checksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.id}_${migration.name} was modified after it was applied.`,
          );
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO lightflux_schema_migrations (id, name, checksum)
           VALUES ($1, $2, $3)`,
          [migration.id, migration.name, migration.checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    return migrations.length;
  } finally {
    if (useAdvisoryLock) {
      await client
        .query('SELECT pg_advisory_unlock($1, $2)', [
          LOCK_NAMESPACE,
          LOCK_ID,
        ])
        .catch(() => {});
    }
    client.release();
  }
};
