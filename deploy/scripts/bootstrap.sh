#!/usr/bin/env bash
# One-time server bootstrap for the LightFlux API host (TencentOS Server 4).
#
# Installs Docker, nginx, and certbot, installs the reverse-proxy config, and
# obtains the TLS certificate. Run once on a fresh server, as root.
#
# Prerequisites:
#   - DNS: lightflux.site and www.lightflux.site resolve to this server.
#   - Cloud security group: inbound TCP 80 and 443 are open.
#
# Usage (on the server):
#   DOMAIN=lightflux.site CERT_EMAIL=you@example.com bash bootstrap.sh
set -euo pipefail

DOMAIN="${DOMAIN:-lightflux.site}"
WWW_DOMAIN="www.${DOMAIN}"
CERT_EMAIL="${CERT_EMAIL:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "=== $* ==="; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

log "install docker"
if ! command -v docker >/dev/null 2>&1; then
  bash "${SCRIPT_DIR}/install-docker.sh"
else
  echo "docker already installed: $(docker --version)"
fi

log "install nginx + certbot"
dnf -y install nginx certbot python3-certbot-nginx

log "install reverse-proxy config"
install -m 0644 "${SCRIPT_DIR}/../nginx/lightflux.conf" /etc/nginx/conf.d/lightflux.conf
nginx -t
systemctl enable --now nginx
systemctl reload nginx

log "obtain TLS certificate for ${DOMAIN} and ${WWW_DOMAIN}"
if [[ -n "${CERT_EMAIL}" ]]; then
  certbot --nginx -d "${DOMAIN}" -d "${WWW_DOMAIN}" \
    --non-interactive --agree-tos --redirect -m "${CERT_EMAIL}"
else
  echo "CERT_EMAIL not set; registering without contact email."
  certbot --nginx -d "${DOMAIN}" -d "${WWW_DOMAIN}" \
    --non-interactive --agree-tos --redirect --register-unsafely-without-email
fi

log "enable certificate auto-renewal"
systemctl enable --now certbot-renew.timer

log "bootstrap complete — deploy the API with deploy/scripts/deploy.sh"
