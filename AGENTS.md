# LightFlux Agent Guide

## Scope

This file applies to the whole repository. A more specific `AGENTS.md` in a
subdirectory overrides it for that subtree.

## Working Contract

- Read this file, the relevant source, and `git status` before changing code.
- Treat source code and package scripts as authoritative. `.trae/deepwiki/` is
  an orientation aid and may lag behind the implementation.
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
- `.trae/deepwiki/`: generated architecture and subsystem documentation.
- `.trae/runs/`: auditable records for autonomous goal executions.

## Product And Architecture Invariants

- Keep the product local-first. UI mutations update local state immediately,
  while persistence and sync remain behind service boundaries.
- Historical statistics come from `TaskEvent`; do not infer history from a
  current snapshot. Trash and archived data must not pollute active metrics.
- Persisted schema changes require forward migration, normalization, and tests
  for older data. Never silently discard user data.
- AI data mutations follow understand, disambiguate, preview, confirm, execute,
  audit, and undo semantics. The model must not mutate local data directly.
- Shared business rules belong in domain/store/service code. Put platform
  differences at `.web`, `.native`, Expo, or Tauri boundaries.
- Global search uses `Command/Ctrl + F` and suppresses the browser default.
  Do not reintroduce a persistent search navigation item.
- Today and Groups are active-task surfaces: completed and trashed tasks must
  disappear immediately, while Today summaries may still use the full day's
  task set. Completed owns the completed-task list.
- Moving a task between groups moves its non-trashed descendant branch in one
  state update. A subtask moved away from its parent's group becomes a root
  task so cross-group parent links are never created.
- On narrow screens below 360 px, action menus stack. A subtask context-menu
  action must not also open task details.
- Drag previews must be built from the actually visible row so nested task
  frames remain aligned.

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
./scripts/use-rust-env.sh cargo check --manifest-path lightflux/src-tauri/Cargo.toml
```

- Rebuild with `cd lightflux && npm run editor:build` after editor source or
  native editor extensions change.
- For UI work, exercise the changed workflow at relevant breakpoints with
  browser automation when the environment is available.
- Never claim a check passed unless it was run. Record blocked, environmental,
  and pre-existing failures separately from regressions caused by the change.

## Autonomous Execution

- Broad goal documents use `.trae/skills/lightflux-autopilot/SKILL.md`.
- Feature, review, bugfix, verification, and memory stages use their matching
  sibling skills under `.trae/skills/`.
- Create a goal record from
  `.trae/skills/lightflux-autopilot/assets/goal-run-template.md`.
- Stop retrying the same failed check or root-cause hypothesis after three
  evidence-based attempts. Record the blocker instead of looping.

## Memory Protocol

Use two layers:

1. `.trae/runs/<goal>.md` stores task status, source references, decisions,
   attempts, commands, results, and deferred work for one execution.
2. This file stores only durable constraints and proven lessons that are likely
   to affect future work.

After a verified change, update an existing rule instead of duplicating it. Add
a lesson below only when it is reusable, evidence-backed, and not merely a task
status update. Never store secrets, personal task data, raw prompts, transient
logs, or speculation.

## Learned Lessons

Use this format:

```markdown
### YYYY-MM-DD - Short title
- Context: Where the recurring issue appeared.
- Rule: The behavior future agents must preserve.
- Evidence: Source paths and checks that proved the rule.
```
