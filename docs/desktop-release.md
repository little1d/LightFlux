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

## Enable Signed Updates

Desktop updates are disabled at build time until signing is configured. This
keeps local and existing release builds working without embedding a fake key.

Generate the updater key pair on a trusted machine:

```bash
cd lightflux
mkdir -p ../.tauri-keys
npx tauri signer generate \
  --password "use-a-password-manager-generated-value" \
  --write-keys "../.tauri-keys/lightflux.key"
```

Configure the repository with:

- Actions variable `LIGHTFLUX_UPDATER_ENABLED`: `true`
- Actions variable `LIGHTFLUX_UPDATER_PUBLIC_KEY`: contents of
  `.tauri-keys/lightflux.key.pub`
- Actions secret `RELEASES_TOKEN`: a token with write access to the public
  `little1d/lightflux-releases` repository
- Actions secret `TAURI_SIGNING_PRIVATE_KEY`: contents of
  `.tauri-keys/lightflux.key`
- Actions secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the key password

The `.tauri-keys` directory is gitignored. Never commit the private key or its
password. Back them up in the same secret
manager used for the Apple and Windows signing credentials. Losing the private
key prevents existing installations from trusting future updates.

When enabled, `tauri-action` creates signed updater artifacts and publishes
`latest.json` to the GitHub Release. LightFlux checks:

```text
https://github.com/little1d/lightflux-releases/releases/latest/download/latest.json
```

The source repository remains private. Installers, signatures, and
`latest.json` are published to the dedicated public
`little1d/lightflux-releases` repository so installed apps can download them
without a GitHub account.

Platform builds run serially against a draft Release so each updater target is
merged into the same `latest.json`. A final job verifies the Windows x64,
macOS Apple Silicon, and macOS Intel signatures before publishing the Release
as Latest. Clients therefore never receive a partially built update manifest.

The updater can optionally enforce a minimum supported version by adding
`minimumSupportedVersion` to the update manifest. Ordinary releases remain
dismissible; only clients older than that value show a required update.

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

To exercise updater checks in a local release build, expose the public key
while compiling:

```bash
LIGHTFLUX_UPDATER_PUBLIC_KEY="$(cat "../.tauri-keys/lightflux.key.pub")" \
  npx tauri build
```

The updater does not run in the regular Expo web application.

## macOS Menu Bar And Dock

The macOS build creates a monochrome Template Icon in the menu bar. Left click
shows and focuses the main window. Right click exposes quick task creation, AI
capture, Today, Milestones, conditional update, Settings, and Quit actions.

Device-only preferences are stored separately from task data:

- Dock icon: Flux, Paper, or Graphite
- Dock visibility: always, while the window is open, or menu-bar-only
- Dock badge: incomplete Today tasks, overdue tasks, or none
- Last-window behavior: hide to the menu bar or quit

Menu-bar-only mode always keeps the menu bar icon available so the main window
can be reopened. Runtime Dock icon choices do not change the Finder or
Launchpad icon.

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
