import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { createPostgresPool } from '../src/postgres/pool.mjs';
import { createPostgresRepository } from '../src/postgres/repository.mjs';

const connectionString = process.env.TEST_DATABASE_URL;

test(
  'executes repository flows against PostgreSQL',
  { skip: !connectionString },
  async () => {
    const pool = createPostgresPool({
      connectionString,
      maxConnections: 2,
    });
    const repository = createPostgresRepository({ pool });
    let userId;
    try {
      await repository.healthcheck();
      const suffix = randomUUID();
      const user = await repository.upsertWechatUser('web', {
        appId: `live-app-${suffix}`,
        openId: `live-open-${suffix}`,
        unionId: `live-union-${suffix}`,
        displayName: 'Live PostgreSQL test',
        avatarUrl: null,
      });
      userId = user.id;

      const tokenHash = 'd'.repeat(64);
      await repository.createSession({
        id: randomUUID(),
        userId,
        tokenHash,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
      });
      assert.equal(
        (await repository.findSessionByTokenHash(tokenHash))?.user.id,
        userId,
      );

      const current = {
        schemaVersion: 10,
        updatedAt: 2,
        todos: [],
        groups: [],
      };
      const stale = { ...current, updatedAt: 1 };
      assert.equal(
        (await repository.putAppState(userId, current)).updated,
        true,
      );
      assert.deepEqual(await repository.putAppState(userId, stale), {
        updated: false,
        currentUpdatedAt: 2,
      });
      assert.deepEqual(await repository.getAppState(userId), current);
    } finally {
      if (userId) {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      }
      await repository.close();
    }
  },
);
