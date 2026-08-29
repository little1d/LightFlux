# Architecture

## Repository Boundary

`cli/` is a package boundary inside the public LightFlux monorepo. It contains
no application UI, PostgreSQL access, or server implementation and
communicates exclusively through the versioned LightFlux API.

Application source, CLI source, and desktop installers all live in
`little1d/LightFlux`. Desktop tags keep the `desktop-v*` prefix so the updater
contract remains distinct from future npm package tags.

## Product Model

Every authenticated account owns one Personal Workspace. Before sign-in it is
device-only; after sign-in the same Workspace becomes cloud-synchronized.
There is no separate Local Workspace in the product model.

Team Workspaces add members, roles, service accounts, and audit history.
Existing LightFlux Groups migrate to Projects while preserving IDs. Ungrouped
tasks migrate to an Inbox Project.

```text
Account
├── Personal Workspace
│   ├── Inbox
│   └── Projects
└── Team Workspaces
    ├── Members
    ├── Projects
    ├── Service Accounts
    └── Audit Log
```

## Public API Dependency

The CLI expects these 0.1.1 endpoints:

```text
GET /api/v1/workspaces
GET /api/v1/workspaces/:workspaceId/projects
GET /api/v1/projects/:projectId/tasks
GET /api/v1/tasks/:taskId
POST /api/v1/tasks/:taskId/mutations
POST /api/v1/tasks/:taskId/comments
GET /api/v1/workspaces/:workspaceId/changes?cursor=...
```

Every mutation carries an expected entity version and idempotency key. Server
responses identify the actor and resulting Workspace change sequence.

The current LightFlux server does not expose these routes. They must be
implemented in the main repository before Workspace selection and task
commands can be enabled.

## Authentication

The published CLI will use an OAuth-style device authorization flow. Tokens
must be stored in an operating-system credential store. The initial scaffold
accepts `LIGHTFLUX_TOKEN` strictly for development and never persists it.

Agents use Workspace service accounts with project-scoped permissions:

```text
projects:read
tasks:read
tasks:write
tasks:complete
comments:write
```

Membership, credential, Workspace deletion, and Project deletion scopes are
not granted by default.

## Skill Boundary

The Skill describes when and how an Agent should use LightFlux. It does not:

- contain credentials;
- access PostgreSQL;
- construct private API payloads;
- duplicate conflict or authorization logic;
- mutate task files directly.

All deterministic behavior remains in the CLI. The same canonical Skill is
installed once beneath `~/.agents/skills` and linked into supported Agent
directories.

## Release Model

- Repository: `little1d/LightFlux`
- Package directory: `cli/`
- npm package: `lightflux`
- executable: `lightflux`
- package version: independent from the LightFlux application version
- first functional Workspace release: aligned with LightFlux 0.1.1

The package name was unclaimed in the npm registry when the repository was
initialized. Availability must be checked again immediately before publish.
