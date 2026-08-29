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

- `lightflux/`: Expo and React Native application for Web, iOS, and Android.
- `lightflux/src-tauri/`: Tauri desktop shell and Rust integrations.
- `lightflux/editor-web/`: Tiptap editor bundle embedded by native clients.
- `server/`: Node.js authentication, sync, upload, and AI proxy service.
- `cli/`: public CLI package and bundled Agent Skill.

## Product And Architecture Invariants

- Keep the product local-first. UI mutations update local state immediately,
  while persistence and sync remain behind service boundaries.
- Historical statistics come from `TaskEvent`; do not infer history from a
  current snapshot. Trash and archived data must not pollute active metrics.
- Persisted schema changes require forward migration, normalization, and tests
  for older data. Never silently discard user data.
- AI data mutations follow understand, disambiguate, preview, confirm, execute,
  audit, and undo semantics. The model must not mutate local data directly.
- Persistent server identity, session, and cloud app-state data use PostgreSQL
  migrations. Keep client-owned state as a versioned JSONB aggregate, use
  server revision compare-and-swap for writes, and keep upload bytes outside
  the database.
- Shared business rules belong in domain/store/service code. Put platform
  differences at `.web`, `.native`, Expo, or Tauri boundaries.
- Application source, CLI source, and desktop release assets live in the
  `little1d/LightFlux` repository. Desktop updater URLs and release automation
  must not target retired auxiliary repositories.
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
- Validate Web, mobile, and desktop behavior when shared UI or interaction code
  changes. A screenshot is evidence of intent, not permission to copy another
  product's branding blindly.

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

- Rebuild with `cd lightflux && npm run editor:build` after editor source or
  native editor extensions change.
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
- Mobile layouts follow the visual viewport, use explicit keyboard avoidance,
  keep shell utilities available across primary routes, and share one fixed
  quick-add anchor.
- Native authentication must restore its stored session and complete
  owner-scoped cloud reconciliation before showing task data. Local mode is
  always an explicit user choice.
- Production Expo origins are build inputs: validate every
  `EXPO_PUBLIC_*_API_URL` before export and clear Metro's cache for production
  builds.
