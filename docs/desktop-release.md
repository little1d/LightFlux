# LightFlux Desktop Release

LightFlux desktop builds use Tauri 2 and GitHub Actions. The workflow only
publishes desktop applications:

- macOS Apple Silicon (`aarch64`)
- macOS Intel (`x86_64`)
- Windows (`x86_64`, NSIS installer)

iOS, Android, and Linux packages are not included.

## Release A Version

1. Update the version in:
   - `lightflux/package.json`
   - `lightflux/app.json`
   - `lightflux/src-tauri/Cargo.toml`
   - `lightflux/src-tauri/tauri.conf.json`
2. Commit and push the version change.
3. Create and push a matching desktop tag:

```bash
git tag desktop-v1.0.0
git push origin desktop-v1.0.0
```

The `Desktop release` workflow verifies the web export, builds all three
desktop targets, creates a public GitHub Release, and uploads the installers.
It can also be started manually from the repository's Actions page; manual
runs use the version from `tauri.conf.json`.

## Local Build

The Tauri CLI is installed with the frontend dependencies. The shared Rust
toolchain is stored under `~/Desktop/Dev_env/rust` and exposed globally through
`/opt/homebrew/bin`. Initialize it once with:

```bash
mkdir -p "$HOME/Desktop/Dev_env/rust"
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o /tmp/lightflux-rustup-init.sh
RUSTUP_HOME="$HOME/Desktop/Dev_env/rust/rustup" \
  CARGO_HOME="$HOME/Desktop/Dev_env/rust/cargo" \
  sh /tmp/lightflux-rustup-init.sh -y --no-modify-path --profile minimal
```

After adding wrappers or the Cargo bin directory to `PATH`, build from the
repository root:

```bash
cd lightflux
npm install
cd ..
cargo check --manifest-path lightflux/src-tauri/Cargo.toml
cd lightflux
npx tauri build
```

For desktop development:

```bash
cd lightflux
npx tauri dev
```

## Signing

The initial macOS build uses an ad-hoc identity, and the Windows installer is
unsigned. GitHub Actions can build and publish both, but users may still see
Gatekeeper or SmartScreen warnings.

Before broad distribution, configure:

- Apple Developer ID signing and notarization for macOS.
- A trusted Authenticode certificate for Windows.

References:

- [Tauri GitHub Actions](https://v2.tauri.app/distribute/pipelines/github/)
- [macOS signing](https://v2.tauri.app/distribute/sign/macos/)
- [Windows signing](https://v2.tauri.app/distribute/sign/windows/)
