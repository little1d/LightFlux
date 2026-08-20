import { randomUUID } from 'node:crypto';

const asDate = (timestamp) => new Date(timestamp);

const mapUser = (row) => ({
  id: row.id,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
});

const transaction = async (pool, operation) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const createPostgresRepository = ({ pool }) => {
  if (!pool) {
    throw new Error('A PostgreSQL pool is required.');
  }

  const healthcheck = async () => {
    await pool.query(
      `SELECT checksum
       FROM lightflux_schema_migrations
       WHERE id = 1`,
    );
  };

  const upsertWechatUser = async (platform, profile) =>
    transaction(pool, async (client) => {
      const identityKey = `wechat:openid:${profile.appId}:${profile.openId}`;
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        identityKey,
      ]);
      if (profile.unionId) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `wechat:union:${profile.unionId}`,
        ]);
      }

      const identityResult = await client.query(
        `SELECT DISTINCT user_id
         FROM auth_identities
         WHERE provider = 'wechat'
           AND (
             ($1::text IS NOT NULL AND union_id = $1)
             OR (app_id = $2 AND open_id = $3)
           )`,
        [profile.unionId, profile.appId, profile.openId],
      );
      if (identityResult.rows.length > 1) {
        const error = new Error(
          'WeChat identity belongs to multiple LightFlux users.',
        );
        error.status = 409;
        throw error;
      }
      const timestamp = new Date();
      let userId = identityResult.rows[0]?.user_id;

      if (!userId) {
        userId = randomUUID();
        await client.query(
          `INSERT INTO users (
             id, display_name, avatar_url, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $4)`,
          [userId, profile.displayName, profile.avatarUrl, timestamp],
        );
      } else {
        await client.query(
          `UPDATE users
           SET display_name = COALESCE($2, display_name),
               avatar_url = COALESCE($3, avatar_url),
               updated_at = $4
           WHERE id = $1`,
          [
            userId,
            profile.displayName || null,
            profile.avatarUrl,
            timestamp,
          ],
        );
      }

      await client.query(
        `INSERT INTO auth_identities (
           id, user_id, provider, platform, app_id, open_id, union_id,
           created_at, updated_at
         ) VALUES ($1, $2, 'wechat', $3, $4, $5, $6, $7, $7)
         ON CONFLICT (provider, app_id, open_id) DO UPDATE
         SET platform = EXCLUDED.platform,
             union_id = COALESCE(EXCLUDED.union_id, auth_identities.union_id),
             updated_at = EXCLUDED.updated_at`,
        [
          randomUUID(),
          userId,
          platform,
          profile.appId,
          profile.openId,
          profile.unionId,
          timestamp,
        ],
      );
      const linkedIdentity = await client.query(
        `SELECT user_id
         FROM auth_identities
         WHERE provider = 'wechat' AND app_id = $1 AND open_id = $2`,
        [profile.appId, profile.openId],
      );
      if (linkedIdentity.rows[0]?.user_id !== userId) {
        const error = new Error(
          'WeChat identity is already linked to another LightFlux user.',
        );
        error.status = 409;
        throw error;
      }

      const userResult = await client.query(
        `SELECT id, display_name, avatar_url
         FROM users
         WHERE id = $1`,
        [userId],
      );
      return mapUser(userResult.rows[0]);
    });

  const upsertFederatedUser = async ({
    provider,
    subject,
    email,
    displayName,
    avatarUrl,
  }) =>
    transaction(pool, async (client) => {
      const identityKey = `${provider}:${subject}`;
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        identityKey,
      ]);

      const identityResult = await client.query(
        `SELECT user_id
         FROM federated_identities
         WHERE provider = $1 AND provider_subject = $2`,
        [provider, subject],
      );
      const timestamp = new Date();
      let userId = identityResult.rows[0]?.user_id;

      if (!userId) {
        userId = randomUUID();
        await client.query(
          `INSERT INTO users (
             id, display_name, avatar_url, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $4)`,
          [
            userId,
            displayName || email?.split('@')[0] || 'LightFlux user',
            avatarUrl ?? null,
            timestamp,
          ],
        );
        await client.query(
          `INSERT INTO federated_identities (
             id, user_id, provider, provider_subject, verified_email,
             created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $6)`,
          [
            randomUUID(),
            userId,
            provider,
            subject,
            email?.trim().toLowerCase() || null,
            timestamp,
          ],
        );
      } else {
        await client.query(
          `UPDATE users
           SET display_name = COALESCE($2, display_name),
               avatar_url = COALESCE($3, avatar_url),
               updated_at = $4
           WHERE id = $1`,
          [userId, displayName || null, avatarUrl ?? null, timestamp],
        );
        await client.query(
          `UPDATE federated_identities
           SET verified_email = COALESCE($3, verified_email),
               updated_at = $4
           WHERE provider = $1 AND provider_subject = $2`,
          [
            provider,
            subject,
            email?.trim().toLowerCase() || null,
            timestamp,
          ],
        );
      }

      const userResult = await client.query(
        `SELECT id, display_name, avatar_url
         FROM users
         WHERE id = $1`,
        [userId],
      );
      return mapUser(userResult.rows[0]);
    });

  const createSession = async ({
    id,
    userId,
    tokenHash,
    createdAt,
    expiresAt,
  }) =>
    transaction(pool, async (client) => {
      await client.query('DELETE FROM sessions WHERE expires_at <= now()');
      await client.query(
        `INSERT INTO sessions (
           id, user_id, token_hash, created_at, expires_at
         ) VALUES ($1, $2, $3, $4, $5)`,
        [id, userId, tokenHash, asDate(createdAt), asDate(expiresAt)],
      );
    });

  const findSessionByTokenHash = async (hash) => {
    const result = await pool.query(
      `SELECT
         s.id AS session_id,
         s.user_id,
         s.expires_at,
         u.display_name,
         u.avatar_url
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.expires_at > now()
       LIMIT 1`,
      [hash],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      session: {
        id: row.session_id,
        userId: row.user_id,
        expiresAt: row.expires_at,
      },
      user: {
        id: row.user_id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
    };
  };

  const deleteSession = async (sessionId) => {
    await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  };

  const getAppStateSnapshot = async (userId) => {
    const result = await pool.query(
      'SELECT state, revision FROM app_states WHERE user_id = $1',
      [userId],
    );
    const row = result.rows[0];
    return row
      ? { state: row.state, revision: Number(row.revision) }
      : { state: null, revision: 0 };
  };

  const getAppState = async (userId) =>
    (await getAppStateSnapshot(userId)).state;

  const putAppState = async (userId, state, baseRevision) => {
    const stateUpdatedAt = Number(state?.updatedAt);
    if (
      !Number.isFinite(stateUpdatedAt) ||
      stateUpdatedAt < 0 ||
      !Number.isSafeInteger(stateUpdatedAt)
    ) {
      const error = new Error('App state has an invalid updatedAt value.');
      error.status = 400;
      throw error;
    }
    if (
      baseRevision !== undefined &&
      (!Number.isSafeInteger(baseRevision) || baseRevision < 0)
    ) {
      const error = new Error('App state has an invalid baseRevision value.');
      error.status = 400;
      throw error;
    }

    return transaction(pool, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `app-state:${userId}`,
      ]);
      const current = await client.query(
        `SELECT state, state_updated_at, revision
         FROM app_states
         WHERE user_id = $1
         FOR UPDATE`,
        [userId],
      );
      const currentUpdatedAt =
        current.rowCount > 0
          ? Number(current.rows[0].state_updated_at)
          : null;
      const currentRevision =
        current.rowCount > 0 ? Number(current.rows[0].revision) : 0;
      if (
        baseRevision !== undefined &&
        baseRevision !== currentRevision
      ) {
        return {
          conflict: true,
          currentRevision,
          currentState: current.rows[0]?.state ?? null,
          updated: false,
        };
      }
      if (
        baseRevision === undefined &&
        currentUpdatedAt !== null &&
        currentUpdatedAt > stateUpdatedAt
      ) {
        return {
          conflict: true,
          currentRevision,
          currentState: current.rows[0]?.state ?? null,
          currentUpdatedAt,
          updated: false,
        };
      }

      const nextRevision = currentRevision + 1;
      if (currentUpdatedAt === null) {
        await client.query(
          `INSERT INTO app_states (
             user_id, state, state_updated_at, revision, updated_at
           ) VALUES ($1, $2::jsonb, $3, $4, now())`,
          [userId, JSON.stringify(state), stateUpdatedAt, nextRevision],
        );
      } else {
        await client.query(
          `UPDATE app_states
           SET state = $2::jsonb,
               state_updated_at = $3,
               revision = $4,
               updated_at = now()
           WHERE user_id = $1`,
          [userId, JSON.stringify(state), stateUpdatedAt, nextRevision],
        );
      }
      return {
        conflict: false,
        currentUpdatedAt: stateUpdatedAt,
        revision: nextRevision,
        updated: true,
      };
    });
  };

  const importLegacySnapshot = async (snapshot) =>
    transaction(pool, async (client) => {
      if (
        snapshot?.schemaVersion !== 1 ||
        !Array.isArray(snapshot.users) ||
        !Array.isArray(snapshot.identities) ||
        !Array.isArray(snapshot.sessions)
      ) {
        throw new Error('Legacy auth snapshot is invalid.');
      }

      for (const user of snapshot.users) {
        await client.query(
          `INSERT INTO users (
             id, display_name, avatar_url, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE
           SET display_name = CASE
                 WHEN users.updated_at <= EXCLUDED.updated_at
                   THEN EXCLUDED.display_name
                 ELSE users.display_name
               END,
               avatar_url = CASE
                 WHEN users.updated_at <= EXCLUDED.updated_at
                   THEN EXCLUDED.avatar_url
                 ELSE users.avatar_url
               END,
               updated_at = CASE
                 WHEN users.updated_at > EXCLUDED.updated_at
                   THEN users.updated_at
                 ELSE EXCLUDED.updated_at
               END`,
          [
            user.id,
            user.displayName,
            user.avatarUrl ?? null,
            asDate(user.createdAt),
            asDate(user.updatedAt),
          ],
        );
        if (user.appState) {
          const stateUpdatedAt = Number(
            user.appState.updatedAt ?? user.updatedAt,
          );
          const currentState = await client.query(
            'SELECT state_updated_at FROM app_states WHERE user_id = $1',
            [user.id],
          );
          if (
            currentState.rowCount === 0 ||
            Number(currentState.rows[0].state_updated_at) <= stateUpdatedAt
          ) {
            await client.query(
              `INSERT INTO app_states (
                 user_id, state, state_updated_at, updated_at
               ) VALUES ($1, $2::jsonb, $3, $4)
               ON CONFLICT (user_id) DO UPDATE
               SET state = EXCLUDED.state,
                   state_updated_at = EXCLUDED.state_updated_at,
                   updated_at = EXCLUDED.updated_at`,
              [
                user.id,
                JSON.stringify(user.appState),
                stateUpdatedAt,
                asDate(user.updatedAt),
              ],
            );
          }
        }
      }

      for (const identity of snapshot.identities) {
        await client.query(
          `INSERT INTO auth_identities (
             id, user_id, provider, platform, app_id, open_id, union_id,
             created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
           ON CONFLICT (provider, app_id, open_id) DO NOTHING`,
          [
            identity.id,
            identity.userId,
            identity.provider,
            identity.platform,
            identity.appId,
            identity.openId,
            identity.unionId ?? null,
            asDate(identity.createdAt),
          ],
        );
      }

      for (const session of snapshot.sessions) {
        await client.query(
          `INSERT INTO sessions (
             id, user_id, token_hash, created_at, expires_at
           ) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [
            session.id,
            session.userId,
            session.tokenHash,
            asDate(session.createdAt),
            asDate(session.expiresAt),
          ],
        );
      }
    });

  return {
    close: () => pool.end(),
    createSession,
    deleteSession,
    findSessionByTokenHash,
    getAppState,
    getAppStateSnapshot,
    healthcheck,
    importLegacySnapshot,
    putAppState,
    upsertFederatedUser,
    upsertWechatUser,
  };
};
