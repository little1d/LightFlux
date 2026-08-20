# LightFlux API

Node.js backend for email OTP authentication, PostgreSQL-backed cloud state,
image uploads, the AI Agent proxy, and legacy WeChat authentication.

## Local setup

PostgreSQL 15 or newer is required. The included Compose file starts both
PostgreSQL and the API:

```bash
docker compose up --build
```

To run Node.js on the host and only PostgreSQL in Docker:

```bash
docker compose up -d postgres
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

`SESSION_SECRET` and `BETTER_AUTH_SECRET` must contain at least 32 random
characters. `DATABASE_URL` is required. Set `DATABASE_SSL=true` for a hosted
database, and keep certificate verification enabled in production.

Local development defaults to `OTP_DELIVERY=log`, which prints the code in the
API process. Production requires `OTP_DELIVERY=smtp` and the `SMTP_*`
variables. SES and other SMTP services can be switched without changing auth
code.

The API deliberately does not run migrations during ordinary startup.
Deployments must run `npm run db:migrate` before starting new application
instances. The migration runner uses a PostgreSQL advisory lock and verifies
the checksum of every applied SQL file.

## Database model

- `users`: LightFlux user profiles.
- `auth_identities`: WeChat AppID/OpenID identities and optional UnionID
  linkage.
- `sessions`: SHA-256 hashes of legacy WeChat cookie or bearer tokens.
- `email_auth_*`: Better Auth users, sessions, OTP verifications, and rate
  limits.
- `federated_identities`: stable mapping from an authentication provider
  subject to the internal LightFlux user ID.
- `app_states`: one JSONB aggregate and monotonic server revision per user.

Task state remains local-first. The server stores the client's complete,
versioned aggregate instead of duplicating task, group, milestone, and event
rules in a second domain model. Clients submit `baseRevision`; PostgreSQL
updates only when it matches the current revision. A mismatch returns HTTP
`409` with the latest state and revision so the client can three-way merge and
retry. `state.updatedAt` remains only as protection for older clients that do
not yet submit a revision.

Uploaded image bytes remain beneath `UPLOAD_DIR`; they do not belong in
PostgreSQL. The client stores returned URLs, so this boundary can later move to
S3-compatible object storage without rewriting task documents.

## Database migrations

LightFlux has one PostgreSQL database schema. The files in `migrations/` are
ordered changes to that schema, not separate databases. `npm run db:migrate`
creates `lightflux_schema_migrations`, then applies only files whose numeric ID
has not been recorded.

Each applied row stores the migration ID, name, SHA-256 checksum, and timestamp.
The runner executes every new file in a transaction and uses a PostgreSQL
advisory lock so two deployments cannot migrate concurrently. Renaming or
editing an applied file fails checksum validation by design.

Current history:

- `001_initial.sql`: internal users, legacy identities and sessions, and the
  per-user JSONB app-state aggregate.
- `002_email_auth.sql`: Better Auth users, sessions, credential accounts,
  verifications, rate limits, and internal-user mapping.
- `003_app_state_revision.sql`: monotonic revisions for compare-and-swap cloud
  synchronization.
- `004_email_auth_accounts_issuer.sql`: aligns the credential-account unique
  key and nullable issuer with Better Auth's actual account model.

For a schema change, add the next `NNN_description.sql`, migrate the development
database, and run the server tests before deployment. Never rewrite an applied
migration just to make the history look shorter: existing databases would not
re-run it, while checksum verification would reject the changed file.

During early development, migrations may be squashed into a new baseline only
at an explicit reset point where every affected database can be discarded and
recreated and no environment contains data that must survive. Once a shared,
staging, or production database has applied a migration, use forward-only
changes. The number of migration files does not add runtime query complexity;
they run during deployment, not on ordinary API requests.

## Email OTP authentication

The client requests a six-digit code, valid for five minutes and three
verification attempts. OTP values are hashed in PostgreSQL. Web and Tauri use
an HttpOnly cookie; Expo native clients keep the cookie in SecureStore.

When Caddy or Nginx is the only public path to the API, configure
`AUTH_IP_ADDRESS_HEADERS` and `AUTH_TRUSTED_PROXIES` to match that proxy. Do
not trust forwarded IP headers while the Node port is directly reachable.

Expo native clients persist Better Auth cookies in SecureStore. Login is
considered complete only after the client restores the session and reconciles
the account-scoped cloud state; sync, image uploads, and Agent calls all use
the same authenticated fetch boundary.

## Importing the old JSON repository

Run migrations first, stop the old API process, then import its schema-v1
snapshot:

```bash
npm run db:migrate
npm run db:import-json -- ./data/auth.json
```

The import is idempotent. It preserves existing user IDs, identity links,
session token hashes, and app state. It never writes raw session tokens.
Keep the JSON file until user, identity, session, and app-state counts have
been checked in PostgreSQL.

## WeChat applications

- Web: approved Website Application, callback domain, and
  `WECHAT_WEB_REDIRECT_URI`.
- iOS/Android: approved Mobile Application, iOS Universal Link, Android
  package name, and release signing fingerprint.
- `AppSecret` values belong only in `server/.env`, never in Expo public
  environment variables.

The service starts without WeChat credentials so `/health` can be used during
setup, but authorization endpoints return `503` until the relevant application
is configured.

## AI Agent

Configure an OpenAI-compatible chat-completions endpoint with `AI_BASE_URL`,
`AI_API_KEY`, and `AI_MODEL`. Anonymous access is disabled by default because
each request consumes paid model quota.

The Agent interprets text and returns validated proposals. It never mutates
app state directly. Confirmed proposals execute in the client command layer,
then the client reports operation IDs and revisions.

## Uploads

For isolated local image-paste development, set
`UPLOAD_ALLOW_ANONYMOUS=true`. Keep it disabled in shared and production
environments. Supported formats are PNG, JPEG, WebP, GIF, and AVIF.

## Verification

The default suite uses an in-memory PostgreSQL-compatible engine. Run the
repository smoke test against a migrated disposable PostgreSQL database:

```bash
TEST_DATABASE_URL=postgresql://... npm run test:postgres
```

## Endpoints

- `GET /health`
- `POST /api/auth/email/email-otp/send-verification-otp`
- `POST /api/auth/email/sign-in/email-otp`
- `GET /api/auth/email/get-session`
- `POST /api/auth/email/sign-out`
- `GET /api/auth/wechat/web/start`
- `GET /api/auth/wechat/web/callback`
- `GET /api/auth/wechat/mobile/state`
- `POST /api/auth/wechat/mobile/exchange`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/app-state`
- `PUT /api/app-state`
- `POST /api/uploads`
- `GET /uploads/:filename`
- `POST /api/ai/turns`
- `POST /api/ai/proposals/:id/result`
