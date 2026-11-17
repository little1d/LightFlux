# Local CLI Architecture

The CLI contains no application UI, persistence writer or cloud authentication.
It reads the running desktop's owner-only connection descriptor and uses the
versioned API exclusively on `http://127.0.0.1:<port>`. Redirects are rejected.
No environment token or saved cloud API URL can override this boundary.

One desktop data directory owns one `local` Workspace and its Projects. Inbox
is reserved and cannot be renamed, reordered or deleted.

```text
CLI -> loopback HTTP + per-launch token -> Tauri -> desktop domain/store
                                                   -> atomic local file
```

The loopback API preserves the existing task and Milestone endpoint shapes:

```text
GET /api/v1/workspaces
GET /api/v1/workspaces/local/projects
POST /api/v1/workspaces/local/projects
POST /api/v1/projects/:projectId/mutations
GET|POST /api/v1/projects/:projectId/tasks
GET /api/v1/tasks/:taskId
POST /api/v1/tasks/:taskId/mutations
POST /api/v1/tasks/:taskId/comments
GET /api/v1/milestones/:milestoneId
GET|POST /api/v1/workspaces/local/milestones
POST /api/v1/milestones/:milestoneId/mutations
GET /api/v1/workspaces/local/audit
POST /api/v1/mutations/:mutationId/undo
```

Project mutations use the same `POST /mutations` contract as tasks, including
`expectedVersion`, `Idempotency-Key`, audit and latest-only undo.

Existing entity writes require `expectedVersion`. Create/update/comment requests
require `Idempotency-Key`. Audit, replay results and the latest undo snapshot live
in a versioned optional extension to V12, persisted atomically with task state.
Undo fails when subsequent desktop edits changed the snapshot.

## Source layout

```text
src/cli.mjs              entry point: dispatch, help, `--version`
src/args.mjs             flag table, strict parsing, mutation bodies
src/session.mjs          prompts, confirmation, connection, default Project
src/format.mjs           JSON vs tab-separated output
src/commands/task.mjs    task list/show/create/comment/complete/...
src/commands/milestone.mjs
src/commands/project.mjs
src/commands/workspace.mjs  context, projects, audit, undo, login, setup
src/api.mjs              loopback HTTP client
src/local.mjs            connection descriptor and autostart
src/content.mjs          plain text to Tiptap JSON
src/milestone.mjs        date rules and reminder offsets
src/version.mjs          the single source of the CLI version
```

Each command group exports a `specs` table, a `prepare` step that parses and
validates its flags, and a `run` step that executes against an open session.
Parsing and validation happen before the desktop connection opens, so an
invalid command never launches the app. Flags are strict: only the flags a
command declares are accepted, and a typo is reported with the closest match
and the command's usage line.

The desktop rejects Origin-bearing browser requests and unexpected Host values.
The security boundary is the operating-system user, not per-Agent permissions.
Same-user processes can use the CLI. No listener is exposed to LAN interfaces.

Agents discover IDs, preview intended changes and obtain human confirmation
before mutation. The root `skills/lightflux/` documents this workflow and is
installed by the open Skills CLI.

See [desktop persistence and migration](../../docs/local-desktop.md).
