#!/usr/bin/env bash
# Build and deploy the LightFlux Web app (exported Expo bundle) to the server.
#
# The web app is a static SPA served by nginx from /opt/lightflux/web and calls
# the same-origin API at https://lightflux.site/api. This script builds the
# export locally (so EXPO_PUBLIC_* values are baked in from lightflux/.env) and
# syncs the result to the server.
#
# Runs from a workstation (needs node + rsync + ssh) or from CI. Configure the
# target with environment variables:
#
#   SSH_HOST      server host or IP            (required)
#   SSH_USER      ssh user                     (default: root)
#   SSH_PORT      ssh port                     (default: 22)
#   WEB_ROOT      web root on the server       (default: /opt/lightflux/web)
#   SSH_OPTS      extra ssh options            (optional)
#   SKIP_BUILD    reuse an existing export     (default: unset; set to 1 in CI
#                 after the workflow has already run `npm run desktop:web`)
#
# Example:
#   SSH_HOST=182.254.243.33 bash deploy/scripts/deploy-web.sh
set -euo pipefail

SSH_HOST="${SSH_HOST:?SSH_HOST is required}"
SSH_USER="${SSH_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"
WEB_ROOT="${WEB_ROOT:-/opt/lightflux/web}"
SSH_OPTS="${SSH_OPTS:-}"
SKIP_BUILD="${SKIP_BUILD:-}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SSH="ssh -p ${SSH_PORT} ${SSH_OPTS} ${SSH_USER}@${SSH_HOST}"
RSYNC_SSH="ssh -p ${SSH_PORT} ${SSH_OPTS}"

log() { echo "=== $* ==="; }

if [ -n "${SKIP_BUILD}" ]; then
  log "reuse existing web export (SKIP_BUILD set)"
else
  log "build web export (bakes lightflux/.env EXPO_PUBLIC_* values)"
  ( cd "${REPO_ROOT}/lightflux" && npm run desktop:web )
fi

DIST="${REPO_ROOT}/lightflux/desktop-dist"
test -f "${DIST}/index.html" || { echo "Missing ${DIST}/index.html"; exit 1; }

log "ensure remote web root exists"
${SSH} "mkdir -p ${WEB_ROOT}"

log "sync web bundle to ${WEB_ROOT}"
rsync -az --delete -e "${RSYNC_SSH}" \
  "${DIST}/" "${SSH_USER}@${SSH_HOST}:${WEB_ROOT}/"

log "reload nginx"
${SSH} "nginx -t && systemctl reload nginx"

log "web deploy complete"
