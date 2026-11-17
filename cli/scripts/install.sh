#!/usr/bin/env bash
set -euo pipefail

REPOSITORY="little1d/LightFlux"
REF="${LIGHTFLUX_REF:-main}"

for command in curl node npm tar; do
  command -v "${command}" >/dev/null 2>&1 || {
    echo "LightFlux requires ${command}." >&2
    exit 1
  }
done

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( node_major < 22 )); then
  echo "LightFlux requires Node.js 22 or newer." >&2
  exit 1
fi

temporary_directory="$(mktemp -d -t lightflux-cli.XXXXXX)"
trap 'rm -rf "${temporary_directory}"' EXIT

echo "Downloading LightFlux ${REF}..."
curl -fsSL \
  "https://codeload.github.com/${REPOSITORY}/tar.gz/${REF}" |
  tar -xzf - -C "${temporary_directory}"

source_root="$(find "${temporary_directory}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
test -f "${source_root}/cli/package.json" || {
  echo "Downloaded archive does not contain the LightFlux CLI." >&2
  exit 1
}

echo "Installing LightFlux CLI..."
package_name="$(cd "${source_root}/cli" && npm pack --silent)"
npm install --global "${source_root}/cli/${package_name}"

echo "Installing the LightFlux Agent Skill..."
npx --yes skills@latest add "${source_root}" \
  --skill lightflux \
  --global \
  --copy \
  --yes

echo "Installed $(lightflux --version)."
