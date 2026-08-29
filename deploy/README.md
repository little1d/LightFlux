# Deployment

Production deployment assets for LightFlux. `lightflux.site` serves both the
static Web app (exported Expo bundle) and the API from one nginx instance with a
single TLS certificate. The API runs as a single Docker container. PostgreSQL is
hosted on Supabase and email OTP is delivered through Resend SMTP, so no
database or mail container runs on the server.

```
deploy/
├── compose.prod.yaml         # Production compose (API only; external Supabase)
├── .env.production.example   # Environment template (no secrets)
├── nginx/lightflux.conf      # Static Web app + API reverse proxy (certbot adds TLS)
└── scripts/
    ├── install-docker.sh     # Docker install with Tencent intranet mirror
    ├── bootstrap.sh          # One-time server setup (docker + nginx + certbot)
    ├── deploy.sh             # API deploy (sync → build → migrate → restart)
    └── deploy-web.sh         # Web deploy (build export → sync to /opt/lightflux/web)
```

## Architecture

```
                          Client (browser / Tauri / Expo)
                                    │  HTTPS
                                    ▼
                              nginx :443
                        ┌───────────┴────────────┐
              /  /_expo (static)          /api  /health (proxy)
                        │                          │
              /opt/lightflux/web           API container :8787 (127.0.0.1)
              (exported Expo Web)                   │
                                          Supabase PostgreSQL (pooler :5432)
   Let's Encrypt auto-renew               Resend SMTP :465
```

- The Web app is a same-origin SPA: it calls `https://lightflux.site/api`, so no
  cross-origin CORS is involved for browser clients.
- nginx serves `/opt/lightflux/web` for `/` (SPA history fallback to
  `index.html`) and reverse-proxies `/api/` and `/health` to the container.
- The API binds to `127.0.0.1:8787`; only nginx is exposed publicly.
- `PUBLIC_BASE_URL` must be `https://…` so the Better Auth session cookie is
  marked `Secure`.
- The image `CMD` runs `npm run db:migrate` before `npm start`, so migrations
  apply on every container start (idempotent, advisory-locked).

## Prerequisites

1. **DNS**: `lightflux.site` and `www.lightflux.site` A records point to the
   server IP. The apex `@` record is required for the root domain.
2. **Cloud security group**: inbound TCP `80` and `443` open to `0.0.0.0/0`
   (configured in the Tencent Cloud console, not on the server).

## First-time setup

On the server, as root:

```bash
# 1. Copy the deploy/ directory and server/ source to the server, e.g. via
#    the deploy script below, or manually to /opt/lightflux.

# 2. Bootstrap the host (installs docker, nginx, certbot; issues the cert).
DOMAIN=lightflux.site CERT_EMAIL=you@example.com \
  bash /opt/lightflux/deploy/scripts/bootstrap.sh

# 3. Create the production env file from the template and fill in real values.
cp /opt/lightflux/deploy/.env.production.example /opt/lightflux/server/.env
chmod 600 /opt/lightflux/server/.env
# edit /opt/lightflux/server/.env
```

## Deploying the API (manual)

From a workstation with `rsync` + `ssh` access:

```bash
SSH_HOST=<server-ip> bash deploy/scripts/deploy.sh
```

This syncs `server/` (excluding `.env`, `node_modules`, `data`) and
`compose.prod.yaml`, rebuilds the image, runs migrations, and restarts the
container. The server-side `.env` is never touched.

## Deploying the Web app (manual)

The Web app is exported locally so the `EXPO_PUBLIC_*` values from
`lightflux/.env` are baked into the bundle. Point that file at production
(`EXPO_PUBLIC_AUTH_API_URL=https://lightflux.site`, and the AI/upload URLs to
the same origin) before building, then:

```bash
SSH_HOST=<server-ip> bash deploy/scripts/deploy-web.sh
```

This runs `npm run desktop:web`, syncs `lightflux/desktop-dist/` to
`/opt/lightflux/web`, and reloads nginx. nginx serves the SPA from `/` and
proxies `/api` and `/health` to the API container, so the browser app talks to
the same origin.

> The service files (`services/authConfig.ts`, `agentApi.ts`, `imageUpload.ts`)
> read `process.env.EXPO_PUBLIC_*` directly. Expo only inlines the value for
> direct member access, so do not reintroduce an intermediate `const env =
> process.env` alias — the export would ship an empty origin and silently fall
> back to local-only mode.

## Deploying (CI/CD)

Pushes to `main` that touch `server/**` or `deploy/**` trigger
`.github/workflows/server-deploy.yml`, which runs the same `deploy.sh` over SSH.
Pushes that touch `lightflux/**` (or the Web deploy assets) trigger
`.github/workflows/web-deploy.yml`, which builds the export in CI and runs
`deploy-web.sh` over SSH with `SKIP_BUILD=1`. Configure these repository
secrets:

| Secret          | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `DEPLOY_SSH_KEY`| Private SSH key authorized on the server       |
| `DEPLOY_HOST`   | Server host or IP                              |
| `DEPLOY_USER`   | SSH user (e.g. `root`)                          |

The Web build inlines the API origin at build time, so the workflow reads the
`EXPO_PUBLIC_*` values from repository **variables** (not secrets — the origin
is public and shipped in the bundle) under the `production` environment:

| Variable                     | Value                    |
| ---------------------------- | ------------------------ |
| `EXPO_PUBLIC_AUTH_API_URL`   | `https://lightflux.site` |
| `EXPO_PUBLIC_UPLOAD_API_URL` | `https://lightflux.site` |
| `EXPO_PUBLIC_AI_API_URL`     | `https://lightflux.site` |

Add the matching public key to `~/.ssh/authorized_keys` on the server. Prefer a
non-root deploy user with `docker` group membership in the long run.

`server-ci.yml` runs `npm test` for the server on every PR and push that
touches `server/**`. The manual `deploy-web.sh` remains available for local
deploys (omit `SKIP_BUILD` so it builds from `lightflux/.env`).

## Certificates

certbot obtains and installs the Let's Encrypt certificate and enables
`certbot-renew.timer` for automatic renewal. Verify with:

```bash
certbot certificates
systemctl list-timers certbot-renew.timer
certbot renew --dry-run
```

## Email delivery note

`lightflux.site` is verified in Resend. Production uses
`SMTP_FROM=LightFlux <noreply@lightflux.site>` so OTP mail can reach any
recipient. Do not replace it with Resend's `onboarding@resend.dev` test sender,
which only delivers to the Resend account owner.
