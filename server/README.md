# LightFlux API

Node.js backend for WeChat authentication, PostgreSQL-backed cloud state,
image uploads, and the AI Agent proxy.

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

`SESSION_SECRET` must contain at least 32 random characters. `DATABASE_URL` is
required. Set `DATABASE_SSL=true` for a hosted database, and keep certificate
verification enabled in production.

The API deliberately does not run migrations during ordinary startup.
Deployments must run `npm run db:migrate` before starting new application
instances. The migration runner uses a PostgreSQL advisory lock and verifies
the checksum of every applied SQL file.

## Database model

- `users`: LightFlux user profiles.
- `auth_identities`: WeChat AppID/OpenID identities and optional UnionID
  linkage.
- `sessions`: SHA-256 hashes of cookie or bearer tokens. Raw tokens are never
  persisted.
- `app_states`: one versioned JSONB aggregate per user.

Task state remains local-first. The server stores the client's complete,
versioned aggregate instead of duplicating task, group, milestone, and event
rules in a second domain model. Writes older than the current
`state.updatedAt` are rejected with HTTP `409`, preventing a stale device from
overwriting newer cloud state.

Uploaded image bytes remain beneath `UPLOAD_DIR`; they do not belong in
PostgreSQL. The client stores returned URLs, so this boundary can later move to
S3-compatible object storage without rewriting task documents.

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
