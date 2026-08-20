# PostgreSQL Backend

## Boundary

LightFlux remains local-first:

1. UI mutations update Zustand immediately.
2. Device persistence commits the versioned aggregate.
3. Authenticated Web clients synchronize the aggregate through
   `/api/app-state`.
4. PostgreSQL accepts a write only when its `baseRevision` matches the current
   server revision.
5. A 409 response includes the current aggregate and revision; the client
   merges its persisted cloud base, local state, and returned cloud state,
   then retries.

PostgreSQL owns identity, session, and cloud-backup concerns. It does not
reimplement client task-domain rules. This avoids two competing sources of
truth while offline editing and conflict resolution are still aggregate-based.

AI conversation context and rate-limit windows are short-lived process memory,
not durable user data. Run one API replica for Agent traffic until that
ephemeral coordination is moved to a shared store or requests use sticky
routing. PostgreSQL-backed authentication and app-state routes are otherwise
safe across multiple API instances.

## Schema

The initial migration creates:

- `users`
- `auth_identities`
- `sessions`
- `app_states`
- `lightflux_schema_migrations`

Foreign keys cascade identity, session, and app-state removal when a user is
deleted. Legacy WeChat session values are one-way SHA-256 hashes. App states
use JSONB, a compatibility `state_updated_at`, and a monotonic `revision`.
Email OTP credentials use Better Auth tables; Expo native session cookies are
stored with SecureStore.

## Migration policy

- Add a new numbered SQL file; never edit an applied migration.
- Run `npm run db:migrate` as a deployment step before application rollout.
- The runner serializes concurrent deploys with an advisory lock.
- Stored SHA-256 checksums detect modified historical migration files.
- Back up PostgreSQL before destructive schema changes.

## Deployment

Required environment:

```bash
DATABASE_URL=postgresql://user:password@host:5432/lightflux
DATABASE_MAX_CONNECTIONS=10
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
SESSION_SECRET=<at-least-32-random-characters>
```

For a single API instance, 10 connections is conservative. If non-Agent routes
are scaled across multiple instances, keep the total configured pool size below
the database connection limit or place PgBouncer in transaction mode in front
of PostgreSQL.

Run:

```bash
cd server
npm ci --omit=dev
npm run db:migrate
npm start
```

The `/health` endpoint checks the migrated database schema and returns
`database: "postgresql"`.

## Backup and restore

Use provider snapshots or standard PostgreSQL tooling:

```bash
pg_dump --format=custom --file=lightflux.dump "$DATABASE_URL"
pg_restore --clean --if-exists --dbname="$DATABASE_URL" lightflux.dump
```

Treat the upload directory or future object-storage bucket as a separate
backup target; image bytes are intentionally outside PostgreSQL.
