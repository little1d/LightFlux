# Deployment

Production deployment assets for the LightFlux API. The API runs as a single
Docker container behind nginx (TLS). PostgreSQL is hosted on Supabase and email
OTP is delivered through Resend SMTP, so no database or mail container runs on
the server.

```
deploy/
├── compose.prod.yaml         # Production compose (API only; external Supabase)
├── .env.production.example   # Environment template (no secrets)
├── nginx/lightflux.conf      # Reverse-proxy config (certbot adds TLS)
└── scripts/
    ├── install-docker.sh     # Docker install with Tencent intranet mirror
    ├── bootstrap.sh          # One-time server setup (docker + nginx + certbot)
    └── deploy.sh             # Repeatable deploy (sync → build → migrate → restart)
```

## Architecture

```
Client (Web / Tauri / Expo)
        │  HTTPS
        ▼
   nginx :443  ──reverse proxy──►  API container :8787 (127.0.0.1)
        │                                  │
   Let's Encrypt                     Supabase PostgreSQL (pooler :5432)
   auto-renew                        Resend SMTP :465
```

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

## Deploying (manual)

From a workstation with `rsync` + `ssh` access:

```bash
SSH_HOST=182.254.243.33 bash deploy/scripts/deploy.sh
```

This syncs `server/` (excluding `.env`, `node_modules`, `data`) and
`compose.prod.yaml`, rebuilds the image, runs migrations, and restarts the
container. The server-side `.env` is never touched.

## Deploying (CI/CD)

Pushes to `main` that touch `server/**` or `deploy/**` trigger
`.github/workflows/server-deploy.yml`, which runs the same `deploy.sh` over SSH.
Configure these repository secrets:

| Secret          | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `DEPLOY_SSH_KEY`| Private SSH key authorized on the server       |
| `DEPLOY_HOST`   | Server host or IP (e.g. `182.254.243.33`)      |
| `DEPLOY_USER`   | SSH user (e.g. `root`)                          |

Add the matching public key to `~/.ssh/authorized_keys` on the server. Prefer a
non-root deploy user with `docker` group membership in the long run.

`server-ci.yml` runs `npm test` for the server on every PR and push that
touches `server/**`.

## Certificates

certbot obtains and installs the Let's Encrypt certificate and enables
`certbot-renew.timer` for automatic renewal. Verify with:

```bash
certbot certificates
systemctl list-timers certbot-renew.timer
certbot renew --dry-run
```

## Email delivery note

With the unverified `onboarding@resend.dev` sender, Resend only delivers to the
Resend account owner. To reach any recipient, verify `lightflux.site` in Resend
(add the DNS records) and set `SMTP_FROM=noreply@lightflux.site`.
