import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DataType, newDb } from 'pg-mem';

import { runMigrations } from '../src/postgres/migrations.mjs';
import { createPostgresRepository } from '../src/postgres/repository.mjs';

let pool;
let repository;

beforeEach(async () => {
  const database = newDb({
    autoCreateForeignKeyIndices: false,
    noAstCoverageCheck: true,
  });
  database.public.registerFunction({
    implementation: (value) =>
      [...value].reduce((hash, character) => {
        return ((hash << 5) - hash + character.charCodeAt(0)) | 0;
      }, 0),
    name: 'hashtext',
    args: [DataType.text],
    returns: DataType.integer,
  });
  database.public.registerFunction({
    implementation: () => null,
    name: 'pg_advisory_xact_lock',
    args: [DataType.integer],
    returns: DataType.integer,
  });
  database.public.registerFunction({
    implementation: (value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? 'object'
        : Array.isArray(value)
          ? 'array'
          : typeof value,
    name: 'jsonb_typeof',
    args: [DataType.jsonb],
    returns: DataType.text,
  });
  database.public.registerFunction({
    implementation: (value) => value.length,
    name: 'length',
    args: [DataType.text],
    returns: DataType.integer,
  });

  const adapter = database.adapters.createPg();
  pool = new adapter.Pool();
  await runMigrations({
    directory: fileURLToPath(new URL('../migrations/', import.meta.url)),
    pool,
    useAdvisoryLock: false,
  });
  repository = createPostgresRepository({ pool });
});

afterEach(async () => {
  await repository.close();
});

test('links WeChat identities with the same UnionID to one user', async () => {
  const first = await repository.upsertWechatUser('web', {
    appId: 'web-app',
    openId: 'web-open-id',
    unionId: 'shared-union',
    displayName: 'First name',
    avatarUrl: null,
  });
  const second = await repository.upsertWechatUser('mobile', {
    appId: 'mobile-app',
    openId: 'mobile-open-id',
    unionId: 'shared-union',
    displayName: 'Latest name',
    avatarUrl: 'https://example.com/avatar.png',
  });

  assert.equal(second.id, first.id);
  assert.equal(second.displayName, 'Latest name');
  const identities = await pool.query(
    'SELECT user_id FROM auth_identities ORDER BY app_id',
  );
  assert.equal(identities.rowCount, 2);
  assert.deepEqual(
    new Set(identities.rows.map((identity) => identity.user_id)),
    new Set([first.id]),
  );
});

test('maps a verified auth subject to one internal user', async () => {
  const first = await repository.upsertFederatedUser({
    provider: 'better-auth-email',
    subject: 'auth-user-1',
    email: 'person@example.com',
    displayName: 'Person',
    avatarUrl: null,
  });
  const second = await repository.upsertFederatedUser({
    provider: 'better-auth-email',
    subject: 'auth-user-1',
    email: 'PERSON@example.com',
    displayName: 'Updated person',
    avatarUrl: 'https://example.com/person.png',
  });
  const separate = await repository.upsertFederatedUser({
    provider: 'future-provider',
    subject: 'other-auth-user',
    email: 'person@example.com',
    displayName: 'Separate identity',
    avatarUrl: null,
  });

  assert.equal(second.id, first.id);
  assert.equal(second.displayName, 'Updated person');
  assert.notEqual(separate.id, first.id);
  const identity = await pool.query(
    `SELECT verified_email
     FROM federated_identities
     WHERE provider = 'better-auth-email' AND provider_subject = $1`,
    ['auth-user-1'],
  );
  assert.equal(identity.rows[0].verified_email, 'person@example.com');
});

test('re-running migrations is idempotent', async () => {
  await runMigrations({
    directory: fileURLToPath(new URL('../migrations/', import.meta.url)),
    pool,
    useAdvisoryLock: false,
  });

  const applied = await pool.query(
    'SELECT id, name, checksum FROM lightflux_schema_migrations',
  );
  assert.equal(applied.rowCount, 2);
  for (const migration of applied.rows) {
    assert.match(migration.checksum, /^[0-9a-f]{64}$/);
  }
});

test('stores hashed sessions and ignores expired sessions', async () => {
  const user = await repository.upsertWechatUser('web', {
    appId: 'web-app',
    openId: 'session-user',
    unionId: null,
    displayName: 'Session user',
    avatarUrl: null,
  });
  const activeHash = 'a'.repeat(64);
  await repository.createSession({
    id: randomUUID(),
    userId: user.id,
    tokenHash: activeHash,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
  });

  assert.equal(
    (await repository.findSessionByTokenHash(activeHash))?.user.id,
    user.id,
  );
  assert.equal(
    await repository.findSessionByTokenHash('b'.repeat(64)),
    null,
  );
});

test('rejects stale app-state writes without changing current data', async () => {
  const user = await repository.upsertWechatUser('web', {
    appId: 'web-app',
    openId: 'state-user',
    unionId: null,
    displayName: 'State user',
    avatarUrl: null,
  });
  const currentState = {
    schemaVersion: 10,
    updatedAt: 200,
    todos: [],
    groups: [],
  };
  const staleState = {
    schemaVersion: 10,
    updatedAt: 100,
    todos: [{ id: 'stale' }],
    groups: [],
  };

  assert.equal(
    (await repository.putAppState(user.id, currentState)).updated,
    true,
  );
  const staleResult = await repository.putAppState(user.id, staleState);
  assert.deepEqual(staleResult, {
    updated: false,
    currentUpdatedAt: 200,
  });
  assert.deepEqual(await repository.getAppState(user.id), currentState);
});

test('imports the legacy JSON snapshot idempotently', async () => {
  const userId = randomUUID();
  const identityId = randomUUID();
  const sessionId = randomUUID();
  const snapshot = {
    schemaVersion: 1,
    users: [
      {
        id: userId,
        displayName: 'Legacy user',
        avatarUrl: null,
        appState: {
          schemaVersion: 10,
          updatedAt: 300,
          todos: [],
          groups: [],
        },
        createdAt: 100,
        updatedAt: 300,
      },
    ],
    identities: [
      {
        id: identityId,
        provider: 'wechat',
        platform: 'web',
        appId: 'legacy-app',
        openId: 'legacy-open-id',
        unionId: null,
        userId,
        createdAt: 100,
      },
    ],
    sessions: [
      {
        id: sessionId,
        userId,
        tokenHash: 'c'.repeat(64),
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
      },
    ],
  };

  await repository.importLegacySnapshot(snapshot);
  await repository.importLegacySnapshot(snapshot);
  await repository.upsertWechatUser('web', {
    appId: 'legacy-app',
    openId: 'legacy-open-id',
    unionId: null,
    displayName: 'Current profile',
    avatarUrl: 'https://example.com/current.png',
  });
  await repository.importLegacySnapshot(snapshot);

  assert.equal((await pool.query('SELECT id FROM users')).rowCount, 1);
  assert.equal(
    (await pool.query('SELECT id FROM auth_identities')).rowCount,
    1,
  );
  assert.equal((await pool.query('SELECT id FROM sessions')).rowCount, 1);
  assert.equal((await repository.getAppState(userId)).updatedAt, 300);
  const profile = await pool.query(
    'SELECT display_name, avatar_url FROM users WHERE id = $1',
    [userId],
  );
  assert.deepEqual(profile.rows[0], {
    display_name: 'Current profile',
    avatar_url: 'https://example.com/current.png',
  });
});
