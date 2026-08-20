# PostgreSQL Backend

## Boundary

LightFlux remains local-first:

1. UI mutations update Zustand immediately.
2. Device persistence commits the versioned aggregate.
3. Authenticated Web clients synchronize the aggregate through
   `/api/app-state`.
4. PostgreSQL accepts only a state whose `updatedAt` is not older than the
   current cloud copy.

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
deleted. Session values are one-way SHA-256 hashes. App states use JSONB plus a
separate indexed comparison value, `state_updated_at`.

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
