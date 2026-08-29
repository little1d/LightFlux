<p align="center">
  <img src="assets/brand-mark.png" width="96" height="96" alt="LightFlux">
</p>

<h1 align="center">LightFlux CLI</h1>

<p align="center">
  Connect coding agents to LightFlux workspaces, projects, and tasks.
</p>

<p align="center">
  <a href="https://github.com/little1d/LightFlux/actions/workflows/cli-ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/little1d/LightFlux/cli-ci.yml?branch=main&style=flat-square&label=CLI%20CI" alt="CLI CI"></a>
  <img src="https://img.shields.io/badge/Node.js-22-339933?style=flat-square" alt="Node.js 22">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-111827?style=flat-square" alt="MIT License"></a>
</p>

The CLI is the public, scriptable integration layer for Claude Code, Codex,
and other coding agents. It lives in the main LightFlux monorepo while keeping
its API boundary independent from application internals and database access.

## Status

The current `0.0.0` package is an early scaffold. Local context management and
Agent Skill installation work today. Workspace and task commands remain
disabled until the versioned public Workspace API is implemented.

## Capabilities

- Configure a LightFlux API origin.
- Print the selected Workspace and Project as stable JSON.
- Install one canonical LightFlux Skill for Claude Code and Codex.
- Use `LIGHTFLUX_TOKEN` for development without persisting the token.
- Keep future mutations behind expected-version, idempotency, audit, and
  human-confirmation boundaries.

## Usage

From this repository:

```bash
cd cli
npm install
node src/cli.mjs
```

After the npm package is published:

```bash
npx lightflux
```

Available commands:

```text
lightflux
lightflux context
lightflux context --json
lightflux skills
lightflux skills --force
lightflux --help
lightflux --version
```

The interactive setup stores non-secret context in
`~/.config/lightflux/config.json` on macOS and Linux, or the corresponding
application-data directory on Windows. Tokens are read only from the
`LIGHTFLUX_TOKEN` environment variable during development.

## Agent Skill

The canonical Skill source is:

```text
skills/lightflux/
├── SKILL.md
└── references/
    └── workflows.md
```

Installation copies it to `~/.agents/skills/lightflux`, then links that
directory into the supported Claude Code and Codex Skill locations.

## Development

Node.js 22 or newer is required.

```bash
cd cli
npm ci
npm run check
npm pack --dry-run
```

See [docs/architecture.md](docs/architecture.md) for the Workspace model,
authentication plan, API contract, and mutation safety requirements.

## License

[MIT](LICENSE)
