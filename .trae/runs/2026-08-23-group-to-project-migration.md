# Goal Run: Group To Project Migration

- Status: `complete`
- Source: User request, 2026-08-23
- Started: 2026-08-23 15:35
- Updated: 2026-08-23 16:36

## Objective

Ship a clean V12 Project model, intentionally discard pre-release Group data
and accounts in development and production, and remove backward compatibility.

## Scope

### Included

- Persisted app-state V12 with `projects` and task `projectId`.
- Strict V12 `projects` and `projectId` persistence with a fresh local storage
  namespace.
- A real Inbox Project for tasks that previously had no group.
- Project terminology in navigation, task controls, statistics, search, AI,
  marketing copy, and routes.
- Public and Agent-facing Project contracts.
- Removal of the legacy `/groups` route; `/projects` is the only canonical URL.
- Full development and production reset of account, app-state, session, and
  upload data before public beta.

### Excluded

- Team Workspace membership and role management.
- Normalized server-side Project and Task tables.
- The public `/api/v1/workspaces` implementation planned for 0.1.1.

## Work Items

| ID | Type | Source locator | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MIG-001 | migration | `types/todo.ts`, `services/todoStorage.ts` | V12 reads and writes only Projects; pre-V12 local state is ignored. | All | high | done |
| FEAT-002 | feature | Store, routes, components, content | Project is the canonical domain and visible product term; the legacy `/groups` route is removed. | Web/iOS/Android/Desktop | high | done |
| FEAT-003 | feature | Agent client and server | Agent context and operations use Project terminology and IDs. | All | high | done |
| TEST-004 | verification | Client/server tests and runtime | Strict persistence, sync, task moves, AI operations, marketing, desktop, and narrow layouts pass. | All | high | done |
| RESET-005 | destructive reset | Development and production PostgreSQL/upload storage | Both environments retain schema/migration history but contain no users, sessions, app state, verification data, or uploads. | Server | high | done |
| SHIP-006 | delivery | Whole worktree | All current changes are reviewed, committed, and pushed to `origin/main`. | Repository | high | done |

## Questions And Assumptions

| ID | Kind | Detail | Resolution |
| --- | --- | --- | --- |
| ASSUMPTION-001 | product | Every current task needs a Project. | Fresh V12 state creates a reserved Inbox; legacy Group state is discarded. |
| ASSUMPTION-002 | compatibility | Existing `/groups` links may be stored externally. | User explicitly chose to remove route compatibility; `/projects` is canonical. |
| ASSUMPTION-003 | rollout | Cloud snapshots may still be V11 during upgrade. | Superseded: user explicitly approved clearing development and production before public beta. |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-23 15:35 | Use schema V12 with a required Project ID. | The Project model needs a real Inbox instead of nullable grouping. | User request and `lightflux-cli/docs/architecture.md`. |
| 2026-08-23 15:35 | Model Inbox as a real reserved Project. | Workspace tasks should belong to a Project; null grouping does not satisfy the 0.1.1 model. | Prior Workspace design and current ungrouped task behavior. |
| 2026-08-23 | Remove `/groups` route compatibility. | The user prefers a clean Project-only URL surface. | Follow-up user decision. |
| 2026-08-23 16:19 | Remove all V7-V11 data compatibility and reset both environments. | No public users exist yet; the user explicitly approved destructive reset before beta. | Current user request. |

## Execution Log

### MIG-001 - Persisted model

- Baseline: V11 stores `groups`, task `groupId`, and a top-level
  `ungroupedName`.
- Root cause or design: V12 uses `projects`, required task `projectId`, and a
  reserved Inbox Project. Parsing rejects V7-V11 records, and new storage keys
  prevent old local state or sync baselines from loading.
- Changed files: `lightflux/types/todo.ts`, `services/todoStorage.ts`,
  `services/appStateMerge.ts`, Store/domain code, and migration/sync tests.
- Verification: strict-version rejection, Inbox repair, legacy cache deletion,
  and conflict recovery tests passed.
- Review: Client and server writes contain no Group compatibility fields.
- Result: done.

### RESET-005 - Pre-beta data reset

- Development PostgreSQL: removed 2 email-auth users, 24 email sessions, 2
  credential accounts, 1 internal user, and 1 app-state row.
- Production PostgreSQL: removed 1 email-auth user, 2 email sessions, 1
  internal user, and 1 app-state row.
- Preserved all tables and `lightflux_schema_migrations`.
- Removed the one local upload; all production LightFlux upload volumes were
  verified empty.
- Result: done.

### FEAT-002 - Project product surface

- Baseline: Navigation, routes, screens, menus, search, statistics, and
  marketing content exposed Group terminology.
- Root cause or design: Renamed the canonical route to `/projects`, moved
  Project components/content into matching modules, and removed `/groups`.
- Changed files: `lightflux/app`, `components/projects`, shared task/editor
  surfaces, translations, analytics, marketing content, and Tauri metadata.
- Verification: desktop 1119x907 and narrow 402x730 browser workflows rendered
  Inbox and a standard Project, created a Project, moved a task, and reported
  no nested buttons or horizontal overflow.
- Review: Inbox remains renameable but cannot be deleted.
- Result: done.

### FEAT-003 - Agent Project contract

- Baseline: Agent context and operations used `groups`, `groupId`,
  `group.create`, and `group.update`.
- Root cause or design: Renamed context, references, operations, previews, and
  validation to Project. Omitted Project IDs default to Inbox; null Project IDs
  are rejected.
- Changed files: `lightflux/agent`, `components/agent`, `server/src/agent.mjs`,
  translations, and Agent tests.
- Verification: client Agent tests and server Agent tests passed.
- Review: destructive confirmation and revision checks remain unchanged.
- Result: done.

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |
| MIG-001 | deterministic Inbox test | The assertion compared unrelated migrated `analyticsStartedAt`, which intentionally uses the supplied current time when absent. | 1/3 | Only `projects` differed from the intended assertion scope; Inbox `createdAt` was stable from legacy `updatedAt`. | Narrowed the assertion to Project migration; passed. |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd lightflux && npm test` | pass | Client/domain/persistence | 19 files, 100 tests. |
| `cd lightflux && npm run typecheck` | pass | Cross-platform TypeScript | No errors. |
| `cd lightflux && npm run desktop:web` | pass | Web/Tauri bundle | Expo Web export completed. |
| `cd server && npm test` | pass | Agent and strict V12 app-state API | 25 passed, one opt-in PostgreSQL test skipped. |
| `cargo check` | environment-blocked after compile | Tauri | Rust compilation finished; sandbox rejected Cargo registry cache access after the command. |
| Desktop 1119x907 | pass | Project navigation and layout | Inbox and standard Project rendered; no nested buttons or horizontal overflow. |
| Narrow 402x730 | pass | Clean Project startup | Rendered empty Inbox, only Today/Project navigation, no nested buttons or horizontal overflow, and removed legacy IndexedDB keys. |
| Development/production PostgreSQL | pass | Destructive pre-beta reset | Both environments report zero users and app-state rows while retaining four migration rows. |
| Local/production uploads | pass | Destructive pre-beta reset | Local uploads and all three server LightFlux volumes report zero files. |
| `/groups` route scan | pass | Legacy route removal | No app route or robots entry remains. |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |
| high | Old Group state could prevent login-time cloud synchronization after the Project rename. | Authentication waits for cloud reconciliation before showing task data. | Both environments were reset; V12 uses new local keys and rejects pre-V12 state. |
| medium | Concurrent data could remove the reserved Inbox Project. | Three-way merge allows one-sided record deletion. | Merge now restores Inbox and repairs task references. |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |

## Memory Updates

- Goal record updated: yes
- Durable `AGENTS.md` lesson: updated to the clean V12 Project boundary.

## Completion

- Completed items: MIG-001, FEAT-002, FEAT-003, TEST-004, RESET-005,
  SHIP-006.
- Acceptance evidence: strict V12 tests, client/server suites,
  typecheck, Web export, and browser workflows.
- Delivery: commit `90d4424` pushed to `origin/main`; this final record update
  follows in a documentation-only commit.
- Checks not run: Physical iOS/Android device flow. `cargo check` compiled the
  crate, then the sandbox rejected access to the external Cargo cache.
- Residual risk: pre-V12 clients cannot sync after the public-beta cutover by
  design.
- Final status: complete
