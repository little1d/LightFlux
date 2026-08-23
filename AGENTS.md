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
  migrations. Keep client-owned state as a versioned JSONB aggregate, use
  server revision compare-and-swap for writes, and keep upload bytes outside
  the database.
- Shared business rules belong in domain/store/service code. Put platform
  differences at `.web`, `.native`, Expo, or Tauri boundaries.
- Global search uses `Command/Ctrl + F` and suppresses the browser default.
  Do not reintroduce a persistent search navigation item.
- Today and Projects are active-task surfaces: completed and trashed tasks must
  disappear immediately, while Today summaries may still use the full day's
  task set. Completed owns the completed-task list.
- Every task belongs to a Project. The reserved Inbox Project replaces
  unassigned tasks and cannot be deleted. V12 readers reject pre-V12 Group
  data; the pre-beta reset intentionally removed those accounts and snapshots.
- Moving a task between projects moves its non-trashed descendant branch in one
  state update. A subtask moved away from its parent's project becomes a root
  task so cross-project parent links are never created.
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
- Context: Permanent trash deletion and project deletion silently did nothing in desktop WebView builds because `globalThis.confirm` was unavailable.
- Rule: Route destructive actions through the shared in-app confirmation provider; never depend on browser-native `confirm()` for Web or Tauri behavior.
- Evidence: `lightflux/components/ui/ConfirmationProvider.tsx`; verified delete-project, permanent-delete, cancel, reload, and empty-trash confirmation workflows.

### 2026-08-14 - Manual pointer-drag listeners attach synchronously
- Context: Sidebar reorder used `draggable`/HTML5 DnD, then window `mousemove`/`mouseup` listeners registered from a `useEffect` keyed on a `dragging` state. Fast or synthetic events fired before the effect ran, so the drag silently no-opped.
- Rule: For custom pointer drags, attach window listeners synchronously inside the pointer/mouse-down handler (not from an effect), read live props/index via refs, clear click suppression at drag start, and clean up on unmount. Keep previews sibling-scoped and displace surrounding rows by the rendered row step, including inter-row margin. Native HTML5 DnD is unreliable inside the Tauri WebView.
- Evidence: `lightflux/components/navigation/DraggableNavigationItem.web.tsx`, `lightflux/components/tasks/DraggableTaskRow.web.tsx`, `DraggableTaskRow.native.tsx`, and `taskDrag.ts`; `lightflux/tests/todoDomain.test.ts` and `taskDrag.test.ts`.

### 2026-08-14 - Cascading submenus flyout, never replace in place
- Context: "Move to project" replaced the whole action menu on hover, which mismatched the requested right-side cascade and let a pointer heading toward "移至垃圾桶" accidentally swap the menu.
- Rule: Render nested menus as an absolutely-positioned side flyout (right by default, flip left near the viewport edge) with a short close grace period; set `allowOverflow` on `MenuSurface` so the flyout can extend past the panel. Keep in-place mode swapping for native (non-web) only.
- Evidence: `lightflux/components/tasks/TaskActionMenu.tsx`, `lightflux/components/ui/MenuSurface.tsx`; verified hover-expand and click-to-move at desktop width.

### 2026-08-18 - Viewport-anchored popovers must use position:fixed on web
- Context: The Settings language `MenuSurface` mounted but was invisible: its overlay used `position:absolute`, and React Native Web makes every `View` `position:relative`, so the overlay resolved against its nearest ancestor `View` (the setting-control box) instead of the window. The menu's `measureInWindow`-derived viewport coordinates were then added on top of that ancestor offset, so a box at x≈669 rendered its menu at x≈1338 — fully off-screen. Menus triggered near the top-left only shifted slightly, hiding the bug for a long time.
- Rule: Any web overlay meant to cover/position against the viewport (menus, popovers built on `measureInWindow` coordinates) must be `position:fixed`, not `absolute`. RNW accepts `'fixed'` at runtime though its style types omit it; apply via a small typed cast. Verify with a control placed far from the top-left, not just near it.
- Evidence: `lightflux/components/ui/MenuSurface.tsx` (`webFixedPosition`); verified the language, project, priority, and date pickers open on-screen directly below their trigger and both language directions switch the whole UI.

### 2026-08-18 - Web overlays must portal to document.body
- Context: After the `position:fixed` fix the language dropdown was still clipped behind a Settings card, and task-detail metadata menus later rendered visibly but could not receive clicks because their root Portal was below RNW's z-index 9999 `Modal` host.
- Rule: Render web popovers/menus through a `Portal` into `document.body`; when a menu can open from an RNW `Modal`, its root overlay must also stack above the Modal host. Keep a platform-split `Portal` (`.web` via `createPortal`, `.native` pass-through since `Modal` already escapes the tree) with a base re-export for TS resolution.
- Evidence: `lightflux/components/ui/Portal.web.tsx`, `Portal.native.tsx`, `Portal.tsx`, `MenuSurface.tsx`; verified the language dropdown, move-to-project cascade, and task-detail date/project/priority menus render and receive pointer input.

### 2026-08-19 - Native menus anchor to their trigger
- Context: Native `MenuSurface` ignored a supplied position and always used its bottom-sheet fallback, so task, project, and milestone actions appeared detached from their trigger on iOS/Android.
- Rule: Preserve one shared action-menu contract, but measure native trigger views with `measureInWindow`, pass a position, and clamp it against the viewport in `MenuSurface`. Reserve the bottom sheet layout only for intentionally unanchored native overlays; retain the Web `Portal` and fixed-position path.
- Evidence: `lightflux/components/tasks/useTaskContextMenu.ts`, `components/projects/useProjectContextMenu.ts`, `components/milestones/useMilestoneContextMenu.ts`, `components/ui/MenuSurface.tsx`, `components/ui/menuPosition.ts`; `lightflux/tests/menuPosition.test.ts`.

### 2026-08-19 - Native focus workflows use task-appropriate depth
- Context: Search benefits from a full-screen result workspace, while a full-screen AI prompt consumed the source context and left little usable room once the phone keyboard appeared.
- Rule: Keep AI/search business behavior shared. Native search remains a full-screen safe-area workspace, while AI uses an explicit-close, keyboard-avoiding bottom sheet around 38% of the available height so the originating task surface remains visible. Keep Web/Tauri keyboard shortcuts and expose mobile search through an accessible icon rather than persistent navigation.
- Evidence: `lightflux/components/agent/AgentCommandPanel.tsx`, `lightflux/components/SearchOverlay.tsx`, and `lightflux/app/_layout.tsx`; verified at 393x852 and a keyboard-reduced 393x500 viewport.

### 2026-08-21 - Mobile utilities belong to the routed shell
- Context: Restricting settings, search, and AI to Today and Projects made the six primary routes inconsistent, while repeating page titles consumed the space needed for a stable shared header.
- Rule: On narrow layouts, render settings, search, and AI from the routed shell on every primary navigation route; page surfaces reserve that space and omit redundant top-level titles. Suppress those utilities and the FAB while the Settings panel owns the foreground. Never render application shell chrome, navigation, FAB, search, or Agent underneath `/login`.
- Evidence: `lightflux/app/_layout.tsx`, `lightflux/components/ProjectsScreen.tsx`, `CompletedScreen.tsx`, `CalendarScreen.tsx`, `MilestonesScreen.tsx`, and `TrashScreen.tsx`; verified every primary route at 402x874 and 858x781.

### 2026-08-21 - Authentication routes preserve the Router Slot
- Context: Navigating from Settings to `/login` briefly reached the route, then reset through `/` to `/today` because the root layout replaced the tree and unmounted Expo Router's `<Slot />`.
- Rule: Keep the root `<Slot />` at a stable mount position across authenticated and authentication states. Hide the routed content host and omit shell chrome on `/login`; do not early-return a replacement tree that removes the Slot.
- Evidence: `lightflux/app/_layout.tsx`, `lightflux/app/login.tsx`; verified Settings to `/login`, reload, cancel to `/today`, and signed-out shell suppression at 402x874 and 858x781.

### 2026-08-21 - Composite rows cannot be HTML buttons
- Context: A Calendar task row used an outer `Pressable` and contained checkbox and menu `Pressable` controls, producing `<button><button>` and a hydration error on Web.
- Rule: Use a non-interactive `View` for composite rows that contain independent controls, then make only the intended title/content region pressable. Validate populated Web routes with `document.querySelectorAll('button button')`.
- Evidence: `lightflux/components/CalendarScreen.tsx`, `lightflux/components/ui/IconButton.tsx`; populated-route browser checks reported zero nested buttons and no hydration errors.

### 2026-08-23 - Navigation visibility is a V11 preference
- Context: Optional navigation views need to be hidden without deleting their local data or destroying desktop navigation order.
- Rule: Persist only optional hidden IDs in `hiddenNavigationItems`; Today and Projects remain visible active-task surfaces. New and previously untouched visibility preferences hide Completed, Calendar, Milestones, and Trash by default, while explicit V11 choices remain intact. Map visible drag targets back to the full navigation order before reordering.
- Evidence: `lightflux/types/todo.ts`, `services/todoStorage.ts`, `store/todoStore.tsx`, `app/_layout.tsx`; `tests/todoStorageMigration.test.ts`.

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

### 2026-08-20 - Phone layouts remove explanatory duplication
- Context: At 402 px, Settings repeated control descriptions, task details nested a bordered editor card inside a sheet, and Calendar repeated the selected date above a second task/composer card.
- Rule: Below phone-width breakpoints, omit copy that restates a control and treat bounded workspaces as one surface. Keep Settings typography and controls compact, and omit promotional account copy. On Calendar, let the selected cell carry date context, create through one selected-date add action, show matching task rows directly below the month grid, and omit project-color dots already represented by the task adjustment sheet.
- Evidence: `lightflux/components/SettingsScreen.tsx`, `components/editor/TaskEditorScreen.web.tsx`, `TaskEditorScreen.native.tsx`, `components/CalendarScreen.tsx`; verified at 402 px and 1200 px plus tests, typecheck, and Web export.

### 2026-08-20 - Narrow task actions use explicit bottom sheets
- Context: Phone-width task rows exposed a desktop ellipsis menu and cascading project flyout; a swipe-only replacement would conflict with drag gestures and hide important actions.
- Rule: Below the desktop breakpoint, use a visible task-adjustment icon and a keyboard-safe bottom sheet. Keep date, project, and priority as icon-led first-level controls, open their choices as in-sheet sublayers, make tall layers scrollable, and preserve anchored/cascading menus for desktop only.
- Evidence: `lightflux/components/tasks/TaskRowControls.tsx`, `TaskActionMenu.tsx`, `components/ui/MenuSurface.tsx`; verified date rescheduling, priority updates, project sublayer, and full action visibility at 402 px.

### 2026-08-20 - Cloud sync uses revision CAS and a persisted base
- Context: Device clocks and aggregate `updatedAt` values cannot reliably order concurrent offline edits, and a 409 without the prior cloud baseline cannot distinguish deletion from unchanged data.
- Rule: Every new client app-state write includes its last server revision. Persist the matching cloud base per authenticated owner, recover 409 responses with a three-way merge, retry against the returned revision, and never reuse one owner's local cache as another owner's initial state.
- Evidence: `server/migrations/003_app_state_revision.sql`, `server/src/postgres/repository.mjs`, `lightflux/services/todoStorage.ts`, `services/appStateMerge.ts`; `syncConflict.test.ts` and live PostgreSQL/API checks.

### 2026-08-20 - Native auth must prove session restoration
- Context: An OTP sign-in response can succeed before a native credential is available to subsequent sync, upload, and Agent requests; Radon also sends a dynamic-port `exp://` Origin that Better Auth rejects unless development trust is explicit.
- Rule: Store Expo native auth cookies in SecureStore, forward the recovered cookie through the shared authenticated fetch boundary, verify `getSession()` after OTP sign-in, and finish account-scoped cloud reconciliation before revealing task data. Local mode must be an explicit current-version user choice: never interpret missing auth configuration or a legacy session marker as permission to bypass login. In development, derive a missing API origin from the Expo host; the server must set `NODE_ENV=development` and trust `exp://`, while production must not trust that scheme.
- Evidence: `lightflux/services/authClient.native.ts`, `authConfig.ts`, `authApi.ts`, `sessionStorage.ts`, `SignedOutScreen.tsx`, `server/.env.development.example`, and `deploy/ENVIRONMENTS.md`; `authConfig.test.ts`, `sessionStorage.test.ts`, `authenticatedFetch.test.ts`, server email-auth tests, and live mobile-width login checks.

### 2026-08-23 - Mobile Web follows the visual viewport
- Context: iOS browser chrome and the software keyboard reduced the visible viewport while a hard root minimum height and layout-viewport bottom sheet left navigation below the screen and a large gap above the keyboard.
- Rule: On narrow Web, size the application root with the dynamic viewport, compact shell chrome for short heights, and anchor focused bottom sheets to `window.visualViewport` height plus offset instead of the layout viewport.
- Evidence: `lightflux/config/focusStyles.web.ts`, `app/_layout.tsx`, and `components/tasks/QuickAddTaskSheet.tsx`; verified at 320x568, 402x500, and a keyboard-reduced 402x350 visual viewport.

### 2026-08-23 - Mobile creation actions share one fixed anchor
- Context: Today, Calendar, and Projects each positioned their mobile add action independently, so the same control jumped vertically between routes.
- Rule: Use the shared bottom-right mobile quick-add control above navigation. Keep its location fixed rather than user-draggable so it stays predictable and does not compete with task drag or system-edge gestures.
- Evidence: `lightflux/components/tasks/MobileQuickAddButton.tsx`, `app/_layout.tsx`, and `components/CalendarScreen.tsx`; all three routes rendered the FAB at the same 393x852 coordinates.

### 2026-08-23 - Brand surfaces use the canonical mark
- Context: Web metadata and in-app headers still used Expo placeholders or separately drawn checkmarks after the LightFlux logo was finalized.
- Rule: Reuse `lightflux/assets/brand-mark.png` for in-app brand identity and derive platform icons from the same cropped source. Keep functional completion icons separate from the brand mark.
- Evidence: `lightflux/app.json`, `assets/brand-mark.png`, `public/apple-touch-icon.png`, `components/TodoScreen.tsx`, and `components/SignedOutScreen.tsx`; verified in the exported Web document and rendered Today/login views.

### 2026-08-23 - Account profile lives in authenticated identity
- Context: Account names were fixed at registration and avatars had no editing path, while the Settings card duplicated truncated session labels.
- Rule: Persist display names and avatar URLs through Better Auth's authenticated user update endpoint, upload avatar bytes through the existing authenticated upload service, then refresh the shared shell user so every account surface updates immediately.
- Evidence: `lightflux/services/authApi.ts`, `services/imageUpload.ts`, `components/account/ProfileCard.tsx`, and `components/appShellContext.tsx`; client/server tests and a live dev upload-update-session flow.

### 2026-08-23 - Project model starts with a clean V12 boundary
- Context: Groups were replaced by Projects before public beta, while development and production contained only disposable test accounts and state.
- Rule: Persist and accept only V12 `projects` and `projectId` data. Keep local state and sync metadata in V12-specific namespaces, reject pre-V12 aggregates, and preserve the reserved Inbox Project during parsing and conflict merges.
- Evidence: `lightflux/types/todo.ts`, `services/todoStorage.ts`, `services/appStateMerge.ts`, and `server/src/index.mjs`; `todoStorageMigration.test.ts`, `syncConflict.test.ts`, and `appStateMerge.test.ts`.
