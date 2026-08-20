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
- Persistent server identity, session, and cloud app-state data use PostgreSQL
  migrations. Keep client-owned state as a versioned JSONB aggregate, reject
  stale writes by `updatedAt`, and keep upload bytes outside the database.
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

### 2026-08-12 - Destructive confirmation boundary
- Context: Permanent trash deletion and group deletion silently did nothing in desktop WebView builds because `globalThis.confirm` was unavailable.
- Rule: Route destructive actions through the shared in-app confirmation provider; never depend on browser-native `confirm()` for Web or Tauri behavior.
- Evidence: `lightflux/components/ui/ConfirmationProvider.tsx`; verified delete-group, permanent-delete, cancel, reload, and empty-trash confirmation workflows.

### 2026-08-14 - Manual pointer-drag listeners attach synchronously
- Context: Sidebar reorder used `draggable`/HTML5 DnD, then window `mousemove`/`mouseup` listeners registered from a `useEffect` keyed on a `dragging` state. Fast or synthetic events fired before the effect ran, so the drag silently no-opped.
- Rule: For custom pointer drags, attach window listeners synchronously inside the `onMouseDown` handler (not from an effect), read live props/index via refs, clear any click-suppression flag at drag start, and clean up on unmount. Native HTML5 DnD is unreliable inside the Tauri WebView.
- Evidence: `lightflux/components/navigation/DraggableNavigationItem.web.tsx`; pure reorder logic extracted to `reorderList` in `lightflux/store/todoDomain.ts` and covered by `lightflux/tests/todoDomain.test.ts`.

### 2026-08-14 - Cascading submenus flyout, never replace in place
- Context: "Move to group" replaced the whole action menu on hover, which mismatched the requested right-side cascade and let a pointer heading toward "移至垃圾桶" accidentally swap the menu.
- Rule: Render nested menus as an absolutely-positioned side flyout (right by default, flip left near the viewport edge) with a short close grace period; set `allowOverflow` on `MenuSurface` so the flyout can extend past the panel. Keep in-place mode swapping for native (non-web) only.
- Evidence: `lightflux/components/tasks/TaskActionMenu.tsx`, `lightflux/components/ui/MenuSurface.tsx`; verified hover-expand and click-to-move at desktop width.

### 2026-08-18 - Viewport-anchored popovers must use position:fixed on web
- Context: The Settings language `MenuSurface` mounted but was invisible: its overlay used `position:absolute`, and React Native Web makes every `View` `position:relative`, so the overlay resolved against its nearest ancestor `View` (the setting-control box) instead of the window. The menu's `measureInWindow`-derived viewport coordinates were then added on top of that ancestor offset, so a box at x≈669 rendered its menu at x≈1338 — fully off-screen. Menus triggered near the top-left only shifted slightly, hiding the bug for a long time.
- Rule: Any web overlay meant to cover/position against the viewport (menus, popovers built on `measureInWindow` coordinates) must be `position:fixed`, not `absolute`. RNW accepts `'fixed'` at runtime though its style types omit it; apply via a small typed cast. Verify with a control placed far from the top-left, not just near it.
- Evidence: `lightflux/components/ui/MenuSurface.tsx` (`webFixedPosition`); verified the language, group, priority, and date pickers open on-screen directly below their trigger and both language directions switch the whole UI.

### 2026-08-18 - Web overlays must portal to document.body
- Context: After the `position:fixed` fix the language dropdown still had its "English" option clipped/painted behind the statistics card. `position:fixed` positions against the viewport but does not escape ancestor stacking contexts: the Settings `sectionCard` uses `overflow:hidden`, and RNW wraps content in per-`View`/`Animated.View` stacking and transform contexts, so a `zIndex` set in-tree only competes within the nearest section.
- Rule: Render web popovers/menus through a `Portal` into `document.body` so they live in the root stacking context; `position:fixed` alone is not enough when any ancestor clips overflow or creates a stacking/transform context. Keep a platform-split `Portal` (`.web` via `createPortal`, `.native` pass-through since `Modal` already escapes the tree) with a base re-export for TS resolution.
- Evidence: `lightflux/components/ui/Portal.web.tsx`, `Portal.native.tsx`, `Portal.tsx`, `MenuSurface.tsx`; verified the language dropdown shows both options unobstructed and the move-to-group cascade flyout still expands without regression.

### 2026-08-19 - Native menus anchor to their trigger
- Context: Native `MenuSurface` ignored a supplied position and always used its bottom-sheet fallback, so task, group, and milestone actions appeared detached from their trigger on iOS/Android.
- Rule: Preserve one shared action-menu contract, but measure native trigger views with `measureInWindow`, pass a position, and clamp it against the viewport in `MenuSurface`. Reserve the bottom sheet layout only for intentionally unanchored native overlays; retain the Web `Portal` and fixed-position path.
- Evidence: `lightflux/components/tasks/useTaskContextMenu.ts`, `components/groups/useGroupContextMenu.ts`, `components/milestones/useMilestoneContextMenu.ts`, `components/ui/MenuSurface.tsx`, `components/ui/menuPosition.ts`; `lightflux/tests/menuPosition.test.ts`.

### 2026-08-19 - Native focus workflows use full-screen workspaces
- Context: AI commands and global search reused narrow desktop overlays on iOS/Android, carrying desktop shortcut copy and leaving the active screen visible behind a touch workflow.
- Rule: Keep AI/search business behavior shared, but render focused native text-entry workflows as full-screen safe-area workspaces with explicit close controls. Keep Web/Tauri keyboard shortcuts and compact overlays; expose mobile search through an accessible icon rather than a persistent navigation item.
- Evidence: `lightflux/components/agent/AgentCommandPanel.tsx`, `lightflux/components/SearchOverlay.tsx`, `lightflux/App.tsx`; verified narrow Web entry flow and `npm run typecheck`.

### 2026-08-19 - Mobile utilities belong only on primary workspaces
- Context: A global right-side cluster for account, search, and AI obscured page-owned controls such as Trash's empty action, while its controls used mismatched shapes and colors.
- Rule: On mobile, render account/settings only on a designated primary workspace and render search/AI only on primary task workspaces. Do not overlay utility controls on pages that own their own header actions. Use the shared `IconButton` size and shape; reserve violet fills for active state rather than separate control classes.
- Evidence: `lightflux/App.tsx`, `lightflux/components/GroupsScreen.tsx`, `lightflux/components/account/AccountMenu.tsx`; verified Groups and Trash at 627px, plus `npm test` and `npm run desktop:web`.

### 2026-08-19 - Navigation visibility is a V10 preference
- Context: Optional navigation views need to be hidden without deleting their local data or destroying desktop navigation order.
- Rule: Persist only optional hidden IDs in `hiddenNavigationItems`; Today and Groups remain visible active-task surfaces. Normalize older state to an empty hidden set, and map visible drag targets back to the full navigation order before reordering.
- Evidence: `lightflux/types/todo.ts`, `services/todoStorage.ts`, `store/todoStore.tsx`, `App.tsx`; `tests/todoStorageMigration.test.ts`.

### 2026-08-19 - Native keyboard workflows require explicit avoidance
- Context: Native full-screen AI and detail workflows can leave text composers behind the iOS keyboard when only safe-area padding is applied.
- Rule: Put native text-entry workspaces inside `KeyboardAvoidingView` and use a contextual bottom sheet for task details when the originating task surface should remain visible.
- Evidence: `lightflux/components/agent/AgentCommandPanel.tsx`, `components/editor/TaskEditorScreen.native.tsx`, `App.tsx`; TypeScript and Web export passed.

### 2026-08-19 - Mobile utility controls use direct destinations
- Context: A mobile account menu added an unnecessary intermediate step before Settings, while the Today brand block competed with left/right utility controls in the same narrow header.
- Rule: Let mobile settings controls navigate directly to Settings; reserve account-menu behavior for desktop. On narrow task surfaces, omit nonessential branding and keep utility controls as the header priority.
- Evidence: `lightflux/App.tsx`, `lightflux/components/TodoScreen.tsx`; browser workflow verified at 670px.

### 2026-08-19 - Mobile prompt sheets use explicit exit and submit paths
- Context: Quick creation had a broad dimmed backdrop and duplicate footer actions despite a close icon and keyboard submit; the AI prompt needed the same lightweight bottom-sheet interaction.
- Rule: For focused mobile prompt sheets, keep the source context visible, close through an explicit icon or platform back gesture, and submit direct text entry through its natural input action. Do not add backdrop dismissal or redundant footer buttons unless dismissal safety requires it.
- Evidence: `lightflux/components/tasks/QuickAddTaskSheet.tsx`, `components/agent/AgentCommandPanel.tsx`; typecheck, tests, and Web export passed.
