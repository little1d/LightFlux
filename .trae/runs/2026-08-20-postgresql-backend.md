# Goal Run: PostgreSQL Backend

- Status: `complete`
- Source: User request, 2026-08-20
- Started: 2026-08-20

## Objective

Replace the single-process JSON authentication repository with a transactional PostgreSQL backend while preserving the existing client API and local-first synchronization behavior.

## Work Items

| ID | Type | Acceptance criteria | Risk | Status |
| --- | --- | --- | --- | --- |
| FEAT-001 | feature | Users, WeChat identities, sessions, and per-user app state persist in PostgreSQL. | high | done |
| FEAT-002 | feature | Database migrations are versioned, repeatable, and safe under concurrent startup. | high | done |
| FEAT-003 | feature | Existing `auth.json` data can be imported without exposing session tokens or discarding app state. | high | done |
| FEAT-004 | feature | Local development has documented environment configuration and Docker Compose services. | medium | done |
| REV-005 | review | Stale device state cannot overwrite a newer cloud state. | high | done |

## Decisions

- Store the client-owned aggregate state as `JSONB`; do not duplicate task domain tables on the server while the client remains local-first.
- Keep uploaded image bytes outside PostgreSQL. Database/object metadata can be added when object storage replaces the current upload directory.
- Use SHA-256 session token hashes only; raw bearer/cookie tokens never enter the database.
- Reject stale app-state writes with HTTP 409 based on the state's monotonic `updatedAt`.
- Run migrations explicitly with `npm run db:migrate`; Docker Compose runs migrations before starting the API.

## Evidence

| Current behavior | Evidence | Required change |
| --- | --- | --- |
| Auth, identity, session, and app state are held in one process-global object and flushed to JSON. | `server/src/index.mjs` | Add a PostgreSQL repository and make request auth asynchronous. |
| The client already syncs one versioned aggregate through `/api/app-state`. | `lightflux/services/todoStorage.ts`, `authApi.ts` | Preserve the endpoint contract and add stale-write protection. |
| Existing deployments may have schema-v1 JSON data. | `server/src/index.mjs`, `DATA_FILE` | Add an explicit idempotent import command. |

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| PostgreSQL repository integration tests | pass | pg-mem suite plus one live PostgreSQL smoke test. |
| `cd server && npm test` | pass | 19 passed, one opt-in live test skipped. |
| `cd lightflux && npm run typecheck` | pass | Client API contract remains valid. |
| Docker/PostgreSQL runtime | pass | PostgreSQL 17 and API containers are healthy. |

## Execution Log

### FEAT-001 - PostgreSQL repository

- Added pooled PostgreSQL storage for users, WeChat identities, hashed sessions, and per-user JSONB app state.
- Converted request authentication and app-state routes from process-global JSON access to asynchronous repository calls.
- Added graceful pool shutdown and a database-backed health check.

### FEAT-002 - Migrations

- Added numbered SQL migrations, advisory-lock serialization, migration-name validation, duplicate-ID rejection, and SHA-256 checksums.
- Ran migration 001 twice against PostgreSQL 17; both runs succeeded and one 64-character checksum record exists.

### FEAT-003 - Legacy import

- Added `npm run db:import-json -- <path>`.
- Import preserves IDs, app states, and token hashes, is idempotent, and does not let an older snapshot overwrite a newer profile or app state.

### FEAT-004 - Runtime and documentation

- Added Dockerfile, Compose services, health checks, non-root API execution, environment documentation, and backup/deployment guidance.
- Docker Hub was unreachable from the environment. Official PostgreSQL and Node images were pulled through AWS Public ECR and tagged with their standard local names.
- The running services are `server-postgres-1` and `server-api-1`.

### REV-005 - Review repairs

- Added per-user PostgreSQL advisory locks before app-state version comparison, covering concurrent first writes.
- Refused ambiguous WeChat identity linkage instead of silently moving an identity between users.
- Sanitized unexpected backend/database failures to generic HTTP 500 responses.
- Added a PostgreSQL pool error listener.
- Documented that Agent conversation/rate-limit memory is ephemeral and currently requires one Agent API replica or sticky routing.

## Changed Files

- `server/migrations/001_initial.sql`
- `server/src/postgres/*`
- `server/src/index.mjs`
- `server/src/http-errors.mjs`
- `server/tests/postgres*.test.mjs`
- `server/tests/http-errors.test.mjs`
- `server/Dockerfile`
- `server/compose.yaml`
- `server/.env.example`
- `server/README.md`
- `docs/backend-postgresql.md`
- `README.md`

## Completion

- Final status: complete
- Runtime: `http://localhost:8787/health`
- Residual scope: native-client bearer-token persistence/login wiring remains separate from this server migration.
