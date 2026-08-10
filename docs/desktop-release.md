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

Install Rust and the Tauri CLI before running a local desktop build:

```bash
rustup toolchain install stable
cd lightflux
npm install --no-save @tauri-apps/cli@^2
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
