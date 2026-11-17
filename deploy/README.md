# Deployment

LightFlux desktop and CLI need an HTTPS API for authentication and optional
cloud sync. The core product does not require a public Web application.

To avoid an ICP dependency, run the API on an overseas Linux host or another
self-hosted location where the chosen domain can terminate HTTPS legally.
LightFlux does not depend on a specific cloud vendor.

## Architecture

```text
Desktop / CLI
      |
    HTTPS
      |
    nginx
      |
API container :8787
      |
PostgreSQL + SMTP + optional AI provider
```

The optional Expo Web export can be placed in `/opt/lightflux/web`; nginx
serves it from the same origin. It is a convenience and download/docs surface,
not a required product runtime.

## Host Requirements

- Ubuntu/Debian or a RHEL-compatible Linux distribution
- A domain whose A/AAAA record resolves to the host
- Inbound TCP 80 and 443
- Outbound access to PostgreSQL, SMTP, and configured AI services
- `rsync` and SSH access for deployment

Choose a host region outside mainland China when avoiding ICP is a requirement.
DNS, hosting, and data-processing obligations remain the operator's
responsibility.

## Bootstrap

Copy `deploy/` to the host and run as root:

```bash
DOMAIN=api.example.com CERT_EMAIL=ops@example.com \
  bash deploy/scripts/bootstrap.sh
```

The script installs Docker from Docker's official installer, installs nginx
and certbot with the host package manager, renders
`nginx/lightflux.conf.template`, and obtains a Let's Encrypt certificate.

Create the production environment:

```bash
cp deploy/.env.production.example server/.env
chmod 600 server/.env
```

Set `PUBLIC_BASE_URL` and `APP_WEB_URL` to the final HTTPS origin. Use a
production PostgreSQL database and unique secrets. Do not commit `server/.env`.

## Deploy API

From a trusted workstation or CI runner:

```bash
SSH_HOST=<host> SSH_USER=<user> bash deploy/scripts/deploy.sh
```

Optional variables:

```text
SSH_PORT=22
REMOTE_DIR=/opt/lightflux
COMPOSE_PROJECT=lightflux
SSH_OPTS=
```

The script preserves the server-side `.env`, rebuilds the API container, runs
forward migrations through the image command, and waits for `/health`.

## Optional Web Surface

Build-time `EXPO_PUBLIC_*` values must point to the production HTTPS API:

```bash
EXPO_PUBLIC_AUTH_API_URL=https://api.example.com
EXPO_PUBLIC_UPLOAD_API_URL=https://api.example.com
EXPO_PUBLIC_AI_API_URL=https://api.example.com
SSH_HOST=<host> bash deploy/scripts/deploy-web.sh
```

The GitHub Web workflow is manual-only. Desktop releases and API delivery do
not depend on publishing the Web surface.

## GitHub Actions

Configure the `production` environment:

| Name | Kind | Purpose |
| --- | --- | --- |
| `DEPLOY_SSH_KEY` | secret | SSH private key |
| `DEPLOY_HOST` | secret | Overseas or self-hosted host |
| `DEPLOY_USER` | secret | Restricted deploy user |
| `EXPO_PUBLIC_AUTH_API_URL` | variable | Optional Web build API origin |
| `EXPO_PUBLIC_UPLOAD_API_URL` | variable | Optional Web build upload origin |
| `EXPO_PUBLIC_AI_API_URL` | variable | Optional Web build AI origin |

`server-deploy.yml` deploys API changes from `main`. `web-deploy.yml` is
started manually only.

## Verification

Before switching DNS:

```bash
curl --fail https://api.example.com/health
docker compose -p lightflux -f deploy/compose.prod.yaml ps
certbot renew --dry-run
```

Back up PostgreSQL and the upload volume independently. See
`docs/archive/backend-postgresql.md` for database backup and migration rules.
