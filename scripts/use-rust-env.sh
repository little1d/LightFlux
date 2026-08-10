#!/bin/sh

LIGHTFLUX_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
export RUSTUP_HOME="$LIGHTFLUX_ROOT/.dev_env/lightflux-rust/rustup"
export CARGO_HOME="$LIGHTFLUX_ROOT/.dev_env/lightflux-rust/cargo"
export PATH="$CARGO_HOME/bin:$PATH"

if [ "$#" -eq 0 ]; then
  echo "Rust environment: $RUSTUP_HOME"
  rustc --version
  cargo --version
  exit
fi

exec "$@"
