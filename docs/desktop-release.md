# LightFlux Desktop Release

LightFlux desktop builds use Tauri 2 and GitHub Actions. The workflow only
publishes desktop applications:

- macOS Apple Silicon (`aarch64`)
- macOS Intel (`x86_64`)
- Windows (`x86_64`, NSIS installer)
- Linux (`x86_64`, AppImage and deb)

iOS and Android are frozen platforms and are not included in release or
verification workflows.

## Release A Version

1. Move the user-facing changes from `CHANGELOG.md`'s `[Unreleased]` section
   into a dated `## [x.y.z] - YYYY-MM-DD` section. Keep the notes concise.
2. Update the version in:
   - `lightflux/package.json`
   - `lightflux/app.json`
   - `lightflux/src-tauri/Cargo.toml`
   - `lightflux/src-tauri/tauri.conf.json`
3. Commit and push the changelog and version changes together.
4. Create and push a matching desktop tag:

```bash
git tag desktop-v1.0.0
git push origin desktop-v1.0.0
```

The `Desktop release` workflow verifies the web export, builds all three
desktop targets, creates a public GitHub Release, and uploads the installers.
It can also be started manually from the repository's Actions page; manual
runs use the version from `tauri.conf.json`. The workflow publishes the
matching `CHANGELOG.md` section as the Release body and fails before building
when that section is missing or empty.

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
- Actions secret `TAURI_SIGNING_PRIVATE_KEY`: contents of
  `.tauri-keys/lightflux.key`
- Actions secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the key password

The workflow publishes with the built-in `GITHUB_TOKEN`; a cross-repository
release token is not required.

The `.tauri-keys` directory is gitignored. Never commit the private key or its
password. Back them up in the same secret
manager used for the Apple and Windows signing credentials. Losing the private
key prevents existing installations from trusting future updates.

When enabled, `tauri-action` creates signed updater artifacts and publishes
`latest.json` to the GitHub Release. LightFlux checks:

```text
https://github.com/little1d/LightFlux/releases/latest/download/latest.json
```

Installers, updater payloads, GitHub-generated source archives, release notes,
and `latest.json` are published from the single public
`little1d/LightFlux` repository. Standalone `.sig` files are removed after
manifest validation because their signatures are already embedded in
`latest.json`.

Platform builds run serially against a draft Release so each updater target is
merged into the same `latest.json`. A final job verifies the Windows x64,
macOS Apple Silicon, macOS Intel, and Linux x64 signatures before publishing
the Release as Latest. It then removes only the redundant standalone
signature assets.
Clients therefore never receive a partially built update manifest, while the
`.app.tar.gz` updater payloads remain available alongside the `.dmg`
installers. GitHub always adds both Source code archives and does not provide a
workflow setting to hide either one.

The updater can optionally enforce a minimum supported version by adding
`minimumSupportedVersion` to the update manifest. Ordinary releases remain
dismissible; only clients older than that value show a required update.

## Local Build

Install Node.js 22 and the stable Rust toolchain, then build from the
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
npm run desktop:dev
```

This starts the local frontend on port 1420 and opens **LightFlux Dev** without
installing an app. `tauri.dev.conf.json` gives it a separate
`com.little1d.lightflux.dev` identifier, URL scheme, data directory and AI
credential namespace, so it can run alongside the installed stable app.
Use this command instead of bare `npx tauri dev`, which reuses the stable
identity and may be forwarded to the stable app by the single-instance plugin.

Both development and desktop export ignore dotenv files and legacy cloud
API environment variables. Model requests from the desktop window use the
native transport, so browser CORS restrictions do not apply.

## Local Backup And Recovery

Desktop Settings provides a versioned JSON backup for the complete V12 app
state. Export writes a timestamped file to the operating system Downloads
directory. Restore accepts a selected `.json` file, validates the backup
envelope and current schema, and requires in-app confirmation before replacing
tasks, Projects, milestones, and task history.

Backups do not contain authentication credentials or desktop preferences.
Keep independent copies before uninstalling the application or clearing its
WebView data.

AI conversations use separate `chat-v1.json` and `chat-v1.backup.json` files in
the application data directory; the V12 task export does not include them.
API keys are stored in the system credential vault. See the
[AI chat release notes](releases/ai-chat.md) for configuration and data scope.

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
