# LightFlux Agent Workflows

## Repository Setup

```bash
lightflux
lightflux context --json
```

The CLI starts LightFlux Desktop on demand and waits for its loopback API; no
login, API URL or `LIGHTFLUX_TOKEN` is needed. Automated runs set
`LIGHTFLUX_NO_AUTOSTART=1` (also implied by `CI=true`) to fail without opening
a GUI.

## Discover IDs

```bash
lightflux projects --json
lightflux milestone list --json
lightflux task list --project <project-id> --json
lightflux task show <task-id> --json
```

LightFlux exposes one local Workspace per desktop data directory. Every task
belongs to a Project, and Inbox is the reserved fallback Project.

## Manage Projects

```bash
lightflux project create "Work" --color '#8B7EFF' --json
lightflux project create "Next up" --after <project-id> --json
lightflux project rename <project-id> "New name"
lightflux project color <project-id> '#55B9A5'
lightflux project reorder <project-id> --position 0
lightflux task list --project <project-id> --all --json   # preview before delete
lightflux project delete <project-id> --yes --json
```

Inbox is pinned first and cannot be renamed, reordered, or deleted. Deleting a
Project moves every task and subtask in it to Inbox; nothing is discarded. The
delete is a normal journal mutation, so it appears in `audit` and can be undone
while it stays the latest change.

## Create Tasks And Subtasks

```bash
lightflux task create "Prepare release" \
  --project <project-id> \
  --date 2026-09-12 \
  --time 14:30 \
  --content-file ./release-notes.txt \
  --json

lightflux task create "Verify artifacts" \
  --parent <parent-task-id> \
  --date 2026-09-12 \
  --json
```

A subtask inherits its parent Project. Use `--no-parent` to detach a task.
Task time is optional and uses local `HH:mm`; use `--no-time` when updating a
task to make it all-day again.

## Rich-Text Content

- `--content <text>` converts text to Tiptap paragraphs.
- `--content-file <path>` reads UTF-8 text.
- `--content-json <path>` reads a validated Tiptap JSON document.
- `--content-json -` reads Tiptap JSON from stdin.

Use only one content source per command.

## Milestones

```bash
lightflux milestone create "Launch" \
  --type countdown \
  --date 2026-10-01 \
  --reminders 7,1,0 \
  --json

lightflux milestone create "Birthday" \
  --type birthday \
  --date 08-15 \
  --yearly \
  --lunar \
  --json

lightflux task update <task-id> \
  --expected-version <version> \
  --milestone <milestone-id> \
  --json
```

Milestone mutations require the current milestone `version`. Use
`--no-milestone` to remove a task association.

## Read Before Write

Use the returned task or milestone version for every mutation. If the desktop
reports a conflict, read the latest entity and decide whether the intended
change still applies.

## Claim And Report Progress

```bash
lightflux task comment <task-id> \
  --message "Implemented the parser; tests pending."
```

LightFlux has no separate assignment state. Use a concise comment only when
another collaborator needs durable status.

## Complete With Evidence

```bash
lightflux task show <task-id> --json
lightflux task comment <task-id> \
  --message "Verified with commit <sha> and npm test."
lightflux task complete <task-id> --expected-version <version>
```

## Audit And Undo

```bash
lightflux audit --json
lightflux undo <latest-mutation-id>
```

Only the latest active Workspace mutation can be undone. Re-read the entity
and audit list after undo before attempting another write.

## Desktop Updates

The CLI calls the desktop's loopback API, launching the app first if needed.
Mutations update the shared store immediately and acknowledge after local
persistence. No remote sync or polling is involved; restarting is not a refresh
step. In non-interactive runners, prefer `LIGHTFLUX_NO_AUTOSTART=1` and start
the desktop explicitly.
