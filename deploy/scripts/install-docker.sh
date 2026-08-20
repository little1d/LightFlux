#!/usr/bin/env bash
# Install Docker Engine + Compose plugin on TencentOS Server 4 (RHEL 9 compatible).
#
# The official docker-ce repo points baseurl at download.docker.com, which is
# unreachable from mainland Tencent Cloud hosts (TLS connection reset). This
# script rewrites baseurl/gpgkey to the Tencent intranet mirror, which the
# server reaches directly.
set -euo pipefail

log() { echo "=== $* ==="; }

MIRROR="https://mirrors.tencentyun.com/docker-ce"
REPO_FILE="/etc/yum.repos.d/docker-ce.repo"

log "download docker-ce repo definition"
curl -fsSL "${MIRROR}/linux/centos/docker-ce.repo" -o "${REPO_FILE}" \
  || curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -o "${REPO_FILE}"

log "pin releasever to 9 (TencentOS Server 4 == RHEL 9)"
sed -i 's#\$releasever#9#g' "${REPO_FILE}"

log "point baseurl and gpgkey at the Tencent intranet mirror"
sed -i "s#https://download.docker.com#${MIRROR}#g" "${REPO_FILE}"

log "refresh metadata cache"
dnf clean all >/dev/null 2>&1 || true

log "install docker engine + compose plugin"
dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin

log "configure daemon (registry mirror + log rotation)"
mkdir -p /etc/docker
cat >/etc/docker/daemon.json <<'JSON'
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"],
  "log-driver": "json-file",
  "log-opts": {"max-size": "10m", "max-file": "3"}
}
JSON

log "enable and start docker"
systemctl enable --now docker
systemctl restart docker

log "versions"
docker --version
docker compose version
log "DONE"
