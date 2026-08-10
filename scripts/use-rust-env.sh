#!/bin/sh

DEV_ENV="${LIGHTFLUX_DEV_ENV:-$HOME/Desktop/Dev_env}"
export RUSTUP_HOME="${RUSTUP_HOME:-$DEV_ENV/rust/rustup}"
export CARGO_HOME="${CARGO_HOME:-$DEV_ENV/rust/cargo}"
export PATH="$CARGO_HOME/bin:$PATH"

if [ "$#" -eq 0 ]; then
  echo "Rust environment: $RUSTUP_HOME"
  rustc --version
  cargo --version
  exit
fi

exec "$@"
