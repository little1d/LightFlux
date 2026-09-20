# LightFlux Agent Guide

## Scope

This file applies to the whole repository. A more specific `AGENTS.md` in a
subdirectory overrides it for that subtree.

## Working Contract

- Read this file, the relevant source, and `git status` before changing code.
- Treat source code and package scripts as authoritative. Generated
  documentation is only an orientation aid and may lag behind implementation.
- Preserve user changes in a dirty worktree. Never revert unrelated edits.
- Continue through implementation and verification when requirements are
  clear. Ask only when a decision is product-significant, destructive,
  irreversible, credential-dependent, or genuinely ambiguous.
- Keep updates and final reports in the user's language.

## Repository Map

- `lightflux/`: Expo Web interface shared with the Tauri desktop application.
- `lightflux/src-tauri/`: Tauri desktop shell and Rust integrations.
- `shared/`: environment-independent task and Milestone mutation rules.
- `server/`: archived cloud service, retained for data recovery.
- `cli/`: public CLI package.
- `skills/lightflux/`: canonical public Agent Skill.

## Product And Architecture Invariants

- Keep the product local-only. Desktop startup and task workflows must not
  require accounts, network access, or a hosted server. Expo Web is the desktop
  frontend and local preview, not a separately deployed product.
- CLI mutations use the running desktop's loopback API and shared store.
  Never write task files from the CLI. Acknowledge writes only after durable
  persistence; retain entity versions, idempotency, audit and latest-only undo.
- Historical statistics come from `TaskEvent`; do not infer history from a
  current snapshot. Trash and archived data must not pollute active metrics.
- Persisted schema changes require forward migration, normalization, and tests
  for older data. Never silently discard user data.
- AI data mutations follow understand, disambiguate, preview, confirm, execute,
  audit, and undo semantics. The model must not mutate local data directly.
- Desktop data uses atomic local file replacement and pre-change backups.
  Preserve legacy WebView data during migration; stop writes on corrupt or
  unsupported state. Do not delete cloud data or retire servers without a
  separately verified export and explicit approval.
- Shared business rules belong in domain/store/service code. Put platform
  differences at `.web`, `.native`, Expo, or Tauri boundaries.
- Application source, CLI source, and desktop release assets live in the
  `little1d/LightFlux` repository. Desktop updater URLs and release automation
  must not target retired auxiliary repositories.
- Desktop and CLI are the maintained product surfaces. Keep Expo Web as the
  Tauri frontend foundation; iOS, Android, and WeChat are frozen and must not
  receive new release or integration work.
- CLI discovers an owner-only, per-launch desktop connection descriptor.
  Bind only to 127.0.0.1 and reject browser Origin and unexpected Host headers.
  Do not restore cloud device authorization or accept remote API overrides.
- Distribute the Agent Skill with the open `skills` CLI. The LightFlux CLI
  must not own Agent-specific Skill paths, links, updates, or removal.
- Global search uses `Command/Ctrl + F` and suppresses the browser default.
  Do not reintroduce a persistent search navigation item.
- Today and Projects are active-task surfaces: completed and trashed tasks must
  disappear immediately, while Today summaries may still use the full day's
  task set. Completed owns the completed-task list.
- Every task belongs to a Project. The reserved Inbox Project replaces
  unassigned tasks and cannot be deleted. V12 readers reject pre-V12 Group
  data.
- Moving a task between projects moves its non-trashed descendant branch in one
  state update. A subtask moved away from its parent's project becomes a root
  task so cross-project parent links are never created.
- On narrow screens below 360 px, action menus stack. A subtask context-menu
  action must not also open task details.

## UI Quality

- Match the existing compact, minimal visual language and reuse local
  components and tokens before adding new primitives.
- Violet is the functional accent. Do not introduce default blue controls that
  conflict with the established palette.
- Define hover, pressed, focus, disabled, loading, empty, error, and narrow
  layout states when they apply.
- Prefer direct inline editing, keyboard support, visible focus rings, concise
  tooltips, immediate feedback, and short transitions over modal-heavy flows.
- Validate the Expo Web build and Tauri desktop behavior when shared UI or
  interaction code changes. A screenshot is evidence of intent, not
  permission to copy another product's branding blindly.

## Verification Baseline

Run the smallest relevant checks first, then broaden according to risk:

```bash
cd lightflux && npm test
cd lightflux && npm run typecheck
cd lightflux && npm run desktop:web
cd server && npm test
cd cli && npm run check
cargo check --manifest-path lightflux/src-tauri/Cargo.toml
```

- For UI work, exercise the changed workflow at relevant breakpoints with
  browser automation when the environment is available.
- Never claim a check passed unless it was run. Separate blocked,
  environmental, and pre-existing failures from regressions.

## Local Agent Files

- `.trae/` is developer-local workspace state. Keep it ignored and never
  commit it to the public repository.
- Keep detailed execution evidence in local run records, not in this file.
- Stop retrying the same failed check or root-cause hypothesis after three
  evidence-based attempts.

## Learned Lessons

- Route destructive actions through the shared in-app confirmation provider;
  browser-native `confirm()` is not reliable in WebView builds.
- Web popovers use a `document.body` portal and viewport-fixed positioning
  above modal hosts. Native menus measure their trigger or intentionally use a
  bottom sheet. Composite rows must not nest interactive HTML buttons.
- Custom pointer drags attach window listeners synchronously and build previews
  from the visible row so nested geometry and fast gestures remain correct.
- Failed persistence must block quit/relaunch rather than silently losing
  changes. Keep the app open and surface the error.
- Desktop exports ignore legacy cloud environment variables and dotenv files.
  Update checks must be explicit; new task images must persist locally.
