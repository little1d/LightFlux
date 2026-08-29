#!/usr/bin/env bash
# Deploy the LightFlux API to the production server.
#
# Syncs server source and the production compose file to the server, rebuilds
# the API image, and restarts the container. The Dockerfile CMD runs database
# migrations before starting the process. The server-side `.env` is NEVER
# overwritten: secrets are managed on the server only.
#
# Runs from a workstation (needs rsync + ssh) or from CI. Configure the target
# with environment variables:
#
#   SSH_HOST      server host or IP            (required)
#   SSH_USER      ssh user                     (default: root)
#   SSH_PORT      ssh port                     (default: 22)
#   REMOTE_DIR    deploy root on the server    (default: /opt/lightflux)
#   SSH_OPTS      extra ssh options            (optional)
#
# Example:
#   SSH_HOST=<server-ip> bash deploy/scripts/deploy.sh
set -euo pipefail

SSH_HOST="${SSH_HOST:?SSH_HOST is required}"
SSH_USER="${SSH_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/opt/lightflux}"
SSH_OPTS="${SSH_OPTS:-}"
# Stable compose project name so redeploys reuse the same container and volume
# regardless of the directory the compose file lives in.
COMPOSE_PROJECT="${COMPOSE_PROJECT:-lightflux}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SSH="ssh -p ${SSH_PORT} ${SSH_OPTS} ${SSH_USER}@${SSH_HOST}"
RSYNC_SSH="ssh -p ${SSH_PORT} ${SSH_OPTS}"

log() { echo "=== $* ==="; }

log "ensure remote directories exist"
${SSH} "mkdir -p ${REMOTE_DIR}/server ${REMOTE_DIR}/deploy"

log "sync server source (excluding secrets, deps, local data)"
rsync -az --delete -e "${RSYNC_SSH}" \
  --exclude '.env' \
  --exclude 'node_modules' \
  --exclude 'data' \
  "${REPO_ROOT}/server/" "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/server/"

log "sync production compose file"
rsync -az -e "${RSYNC_SSH}" \
  "${REPO_ROOT}/deploy/compose.prod.yaml" \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/deploy/compose.prod.yaml"

log "verify server-side .env exists"
${SSH} "test -f ${REMOTE_DIR}/server/.env || { echo 'Missing ${REMOTE_DIR}/server/.env on server. Create it from deploy/.env.production.example.'; exit 1; }"

log "build and restart the API container"
${SSH} "cd ${REMOTE_DIR}/deploy && docker compose -p ${COMPOSE_PROJECT} -f compose.prod.yaml up -d --build"

log "wait for health"
${SSH} 'for i in $(seq 1 20); do if curl -fsS http://127.0.0.1:8787/health >/dev/null; then echo healthy; exit 0; fi; sleep 3; done; echo "health check failed"; exit 1'

log "deploy complete"
