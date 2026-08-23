<p align="center">
  <img src="assets/brand-mark.png" width="112" height="112" alt="LightFlux">
</p>

<h1 align="center">LightFlux</h1>

<p align="center">
  <strong>A calm workspace where people and AI agents move work forward together.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/lightflux"><img src="https://img.shields.io/npm/v/lightflux?style=flat-square&color=6d4aff" alt="npm version"></a>
  <a href="https://github.com/little1d/lightflux-cli/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/little1d/lightflux-cli/ci.yml?branch=main&style=flat-square&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/Node.js-22-339933?style=flat-square" alt="Node.js 22">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-111827?style=flat-square" alt="MIT License"></a>
</p>

LightFlux is a local-first workspace for focused personal planning and
agent-assisted team execution. It keeps projects, tasks, progress, and
evidence in one shared context without forcing people to translate work
between a task manager and their coding tools.

This repository is the public bridge between LightFlux and local agents such
as Claude Code and Codex. It contains the `lightflux` command, the versioned
API client, and the Agent Skill that defines safe task workflows. The
LightFlux application and server remain in the main product repository.

## What It Provides

- One command to connect a repository to a Personal or Team Workspace.
- A shared Agent Skill installed for Claude Code and Codex.
- Scriptable context and task workflows with stable JSON output.
- Version-aware mutations, idempotency, audit evidence, and human
  confirmation boundaries.

## Install

```bash
npx lightflux
```

The guided setup:

1. Configures the LightFlux API origin.
2. Connects your LightFlux account.
3. Selects a Personal or Team Workspace and default Project.
4. Installs the bundled Skill for Claude Code and Codex.

Credentials are never written to the repository or `config.json`.

## Agent Skill

The canonical Skill lives at:

```text
skills/lightflux/
├── SKILL.md
└── references/
    └── workflows.md
```

`npx lightflux` copies it to:

```text
~/.agents/skills/lightflux
```

It then links the same installation into:

```text
~/.claude/skills/lightflux
~/.codex/skills/lightflux
```

This follows the single-installation approach used by repositories such as
`SwanHubX/pytrio-skill`, while adding Workspace selection and authenticated
API access.

## Commands

```bash
lightflux                         # Configure context and install the Skill
lightflux context                 # Show the selected Workspace and Project
lightflux context --json          # Print machine-readable context
lightflux skills                  # Install the bundled Skill
lightflux skills --force          # Replace an existing installation
```

Workspace and task commands will use the public LightFlux API:

```bash
lightflux auth login
lightflux workspace list
lightflux workspace use
lightflux project list
lightflux project use
lightflux task list
lightflux task show
lightflux task start
lightflux task update
lightflux task complete
lightflux task comment
```

## Workspace Model

Every account has one Personal Workspace for individual work. Team Workspaces
add shared Projects, members, scoped service accounts, and an auditable change
history. Local agents operate through the same permission model as every
other LightFlux client.

## Repository Layout

```text
assets/                      Brand assets
src/                         CLI and public API client
skills/lightflux/            Published Agent Skill
.trae/skills/                Repository-maintenance Skill
tests/                       Deterministic unit tests
docs/architecture.md         Product and API boundaries
```

## Development

LightFlux requires Node.js 22.

```bash
npm install
npm run check
npm pack --dry-run
```

See [docs/architecture.md](docs/architecture.md) for repository boundaries,
authentication, Workspace APIs, and mutation guarantees.

## License

[MIT](LICENSE)
