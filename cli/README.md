# LightFlux CLI

Operate the local LightFlux desktop app from a terminal or coding agent.
Requires Node.js 22+ and the matching local-only desktop build.
No account, email code, hosted API or database is required.

## Install

From this checkout:

```bash
npm --prefix cli ci
npm --prefix cli link
lightflux context --json
```

If LightFlux Desktop is not running, the CLI launches the installed app, waits
for its loopback API, then runs the command. Set `LIGHTFLUX_NO_AUTOSTART=1`
(or `CI=true`) to fail without starting a GUI. Run `lightflux` to select
a default Project; otherwise Inbox is used. `--project <id>` overrides it.
`lightflux login` is a compatibility connection check, not an authorization flow.
`logout` removes legacy CLI credentials; it does not disable local OS-user access.

Once published, the public installer installs CLI and Skill together:

```bash
curl -fsSL https://raw.githubusercontent.com/little1d/LightFlux/main/cli/scripts/install.sh | bash
```

## Projects

```bash
lightflux projects --json
lightflux project create "Work" --color '#8B7EFF' --json
lightflux project create "Next up" --after <project-id> --json
lightflux project show <id> --json
lightflux project rename <id> "New name"
lightflux project color <id> '#55B9A5'
lightflux project reorder <id> --position 0
lightflux project delete <id> --yes --json
```

The reserved Inbox cannot be renamed, reordered or deleted. Deleting a Project
moves all of its tasks (including subtasks) to Inbox; no task is discarded.
Project mutations carry the same idempotency, audit and latest-only undo
guarantees as task mutations.

## Tasks And Subtasks

```bash
lightflux projects --json
lightflux task list --project <id> --all --json
lightflux task show <task-id> --json
lightflux task create "Prepare release" --date 2026-09-12 --time 14:30 --content "Notes" --json
lightflux task create "Verify artifacts" --parent <task-id> --json
lightflux task list --parent <task-id> --json
lightflux task update <task-id> --expected-version <n> --content-file notes.txt
lightflux task update <task-id> --expected-version <n> --no-time
lightflux task update <task-id> --expected-version <n> --no-parent
lightflux task complete <task-id> --expected-version <n>
lightflux task reopen <task-id> --expected-version <n>
lightflux task trash <task-id> --expected-version <n> --yes
lightflux task restore <task-id> --expected-version <n>
lightflux task comment <task-id> --message "Verified locally"
```

Content inputs: `--content <text>`, `--content-file <UTF-8 path>`, or
`--content-json <path|->` for Tiptap JSON. Choose one per command.
`--no-milestone` clears a Milestone association. Subtasks inherit their parent Project.

## Milestones

```bash
lightflux milestone list --json
lightflux milestone create "Launch" --type countdown --date 2026-10-01 --reminders 7,1,0
lightflux milestone create "Birthday" --type birthday --date 08-15 --yearly --lunar
lightflux milestone show <id> --json
lightflux milestone update <id> --expected-version <n> --pinned
lightflux milestone archive <id> --expected-version <n>
lightflux milestone unarchive <id> --expected-version <n>
lightflux milestone trash <id> --expected-version <n> --yes
lightflux milestone restore <id> --expected-version <n>
lightflux task update <task-id> --expected-version <n> --milestone <id>
```

## Safety

Read before mutation and use the returned `version`. Supply a stable
`--idempotency-key` for retryable requests. Never blindly retry a version conflict.

```bash
lightflux audit --json
lightflux undo <mutation-id> --yes --json
```

Only the latest mutation with unchanged desktop data can be undone. Reads and
unchanged saves do not invalidate undo. Audit and idempotency records survive restart.
Desktop changes appear immediately; no cloud polling or application restart is needed.

CLI reads an owner-only `local-api.json` from the desktop data directory, connects
only to `127.0.0.1`, and never writes task files. Old cloud `apiUrl` and
`LIGHTFLUX_TOKEN` are ignored. Tokens are never printed in `context`.
`LIGHTFLUX_DESKTOP_DATA_DIR` selects an isolated test app's data directory.

Cross-device sync, remote agents and team Workspaces are not supported.

## Skill

```bash
npx skills@latest add ./ --skill lightflux --global
# After publishing the repository changes:
npx skills@latest add little1d/LightFlux --skill lightflux --global
```

Canonical source: `skills/lightflux/` at repository root. The open Skills CLI
owns installation and removal; LightFlux never writes Agent-specific directories.

## Verify

```bash
npm --prefix cli run check
cd cli
npm pack --dry-run
```

See [architecture](docs/architecture.md). Licensed under [MIT](LICENSE).
