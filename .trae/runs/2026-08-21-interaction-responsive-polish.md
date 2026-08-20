# Goal Run: Interaction And Responsive Polish

- Status: `complete`
- Source: User bug list and two responsive screenshots, 2026-08-21
- Started: 2026-08-21
- Updated: 2026-08-21

## Objective

Eliminate routed Web interaction errors, retain desktop navigation at useful
tablet widths, simplify milestone creation, restore polished task reordering,
and unify Toast feedback.

## Scope

### Included

- Web nested-button hydration error.
- Settings-to-login route behavior.
- Shared desktop/narrow layout breakpoint.
- Compact milestone calendar/repeat selectors.
- Today and Groups task/subtask drag affordances and insertion preview.
- Shared Toast primitive and provider presentation.
- Full verification, review, commits, and push to `origin/main`.

### Excluded

- Persisted schema or domain-model changes.
- New milestone date semantics.
- Cross-group task dragging.

## Work Items

| ID | Type | Source locator | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | bug | Hydration warning / `IconButton.tsx` | No interactive `<button>` is nested in another button; console has no nesting error. | Web/Desktop | high | done |
| BUG-002 | bug | Settings login action | Local-mode Settings login opens `/login`, closes the settings panel, and cancel returns to `/today`. | Web/iOS/Android/Desktop | high | done |
| BUG-003 | bug | Responsive screenshot 1 | Widths that can hold the app shell retain the left sidebar; narrow header does not split controls across isolated columns. | Web/Desktop | high | done |
| FEAT-004 | feature | Milestone screenshot 2 | Selected milestone type is fixed; calendar and recurrence use compact selectors with defaults. | Web/iOS/Android/Desktop | medium | done |
| BUG-005 | bug | Today/Groups task drag | Root tasks and subtasks expose drag handles; moving previews the insertion and surrounding rows shift smoothly. | Web/iOS/Android | high | done |
| FEAT-006 | feature | Toast feedback | One shared Toast component renders compact, polished success/error/celebrate feedback. | Web/iOS/Android/Desktop | medium | done |
| REV-007 | review | Current diff | No unresolved high/medium in-scope findings; all checks pass before push. | all | high | done |

## Questions And Assumptions

| ID | Kind | Detail | Resolution |
| --- | --- | --- | --- |
| QUESTION-001 | assumption | Useful desktop shell cutoff can move below 900px. | Use one shared 820px breakpoint: it fits 78px navigation plus two 360px panes and divider. |
| QUESTION-002 | assumption | Milestone type should not change inside the form. | The template menu is authoritative for new milestones; existing milestones retain their stored type. |
| QUESTION-003 | assumption | Drag remains sibling-scoped. | Preserve current domain behavior and preview only valid sibling targets. |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-21 | Use explicit non-button row containers with dedicated interactive children. | HTML forbids nested buttons and hydration must match. | Browser warning and task row callers |
| 2026-08-21 | Reuse one layout breakpoint constant. | Divergent `900` checks caused shell and page behavior to switch inconsistently. | `rg` across layout and components |
| 2026-08-21 | Keep Expo Router's Slot mounted through auth transitions. | Removing it reset `/login` through `/` without invoking auth callbacks. | Route instrumentation and 402/858 browser workflows |
| 2026-08-21 | Keep drag preview state sibling-scoped. | Cross-parent/group previews would promise invalid domain moves. | `taskDrag.ts` and seeded parent/child browser fixtures |

## Execution Log

### BUG-001 - Nested button hydration

- Baseline: Calendar task rows rendered an outer `Pressable` around checkbox,
  title, and `TaskMoreButton`, producing three populated `<button><button>`
  instances and React's hydration warning.
- Root cause or design: `IconButton` itself was valid; the row-level caller was
  an interactive container around independent controls.
- Changed files: `lightflux/components/CalendarScreen.tsx`.
- Verification: populated route matrix at 402x874 and 858x781 reported zero
  `button button` matches on seven routes and no hydration console errors.
- Review: dedicated title `Pressable` retains edit/long-press behavior while
  checkbox and menu remain independent siblings.
- Result: done.

### BUG-002 - Settings login route

- Baseline: Settings reached `/login`, then Router changed to `/` and the index
  redirected to `/today`; neither cancel nor local/auth continuation ran.
- Root cause or design: the root layout's auth early return unmounted Expo
  Router's `<Slot />`, resetting the navigation container.
- Changed files: `lightflux/app/_layout.tsx`,
  `lightflux/components/SignedOutScreen.tsx`, `lightflux/app/login.tsx`,
  and `lightflux/components/SettingsScreen.tsx`.
- Verification: Settings login stayed at `/login`, rendered no application
  navigation, and cancel returned to `/today` at 402x874 and 858x781.
- Review: the Slot remains at one stable mount position while shell chrome,
  FAB, search, Agent, menus, and task details are omitted on login.
- Result: done.

### BUG-003 - Responsive shell

- Baseline: a hard-coded 900px cutoff moved the navigation to the bottom at
  858px and left utility controls detached from page content.
- Root cause or design: shell and page components used divergent inline
  breakpoints; Web flex items also expanded by the scrollbar width on long
  narrow pages.
- Changed files: `lightflux/config/layout.ts`, `lightflux/app/_layout.tsx`,
  and responsive page/menu/editor components.
- Verification: 858x781 kept six 48px left-rail tabs and no bottom tabs;
  every primary route at 402px and 858px had body width equal to viewport.
- Review: the 820px cutoff fits a 78px rail, 8px divider, and two 360px panes;
  the shell uses the numeric window width and `minWidth: 0`.
- Result: done.

### FEAT-004 - Milestone form

- Baseline: the form repeated the already-selected milestone type and used two
  large, misaligned segmented groups for calendar and recurrence.
- Root cause or design: template selection is authoritative for creation;
  calendar and recurrence are compact choices, not simultaneous modes.
- Changed files: `lightflux/components/milestones/MilestoneEditorCard.tsx`
  and `lightflux/components/MilestonesScreen.tsx`.
- Verification: 402px and 858px workflows showed no duplicate type buttons,
  defaulted to Gregorian/yearly for an anniversary, aligned both 52px
  selectors, and changed calendar and recurrence through anchored menus.
- Review: countdown defaults to one-time; existing milestones retain stored
  type/rules; one-time saves clear `startYear`.
- Result: done.

### BUG-005 - Task drag

- Baseline: Today did not wrap rows in `DraggableTaskRow`; Groups only marked a
  target after hover and did not move surrounding rows in advance.
- Root cause or design: drag state was local to the source row and had no
  sibling-scoped source/target model for rendering displacement.
- Changed files: `lightflux/components/TodoScreen.tsx`,
  `lightflux/components/groups/GroupSectionCard.tsx`,
  `lightflux/components/tasks/DraggableTaskRow.web.tsx`,
  `DraggableTaskRow.native.tsx`, `taskDrag.ts`, and
  `lightflux/tests/taskDrag.test.ts`.
- Verification: seeded 402px Today and Groups fixtures reordered root and child
  tasks; a paused pointer drag lifted the source by 46px, shifted its sibling
  by exactly -46px, and rendered the insertion line before release.
- Review: targets remain in the same parent/group scope; external HTML drags
  cannot create task drag state; UI test ordering was restored or isolated.
- Result: done.

### FEAT-006 - Toast

- Baseline: feedback presentation was duplicated between a dark provider card,
  an older standalone component, and a Milestones-local Toast.
- Root cause or design: one provider-owned primitive should control variants,
  stacking, motion, safe-area placement, dismissal, and accessibility.
- Changed files: `lightflux/components/ui/Toast.tsx`,
  `ToastProvider.tsx`, and `lightflux/components/MilestonesScreen.tsx`.
- Verification: success Toast appeared above the 402px bottom navigation,
  exposed a localized close control, stacked at most three entries, and
  auto-dismissed after the three-second display interval.
- Review: removal uses an independent fallback timer rather than depending on
  a Web `Animated` completion callback that may be throttled.
- Result: done.

### REV-007 - Review and delivery

- First review: fixed Toast dismissal, exact drag displacement, external
  drag-state contamination, and routed narrow-width expansion.
- Confirmation review: populated-route matrix found zero unresolved high or
  medium findings.
- Delivery: pushed `0cb478e`, `3413611`, and `33facf7` to `origin/main`.
- Result: done.

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |
| BUG-002 | Settings login returned to Today | New close button received the original pointer | 1 | Fresh bundle still failed and the close control was not invoked | rejected |
| BUG-002 | `/login` reset through `/` | History push behavior caused the reset | 2 | `router.replace` failed identically; route logs showed no auth callback | rejected |
| BUG-002 | `/login` reset through `/` | Auth early return unmounted `<Slot />` | 3 | Stable Slot made login/cancel pass at both viewports | fixed |
| FEAT-006 | Toast remained after timeout | Dismissal depended on a throttled animation callback | 1 | Alert remained after four seconds in Web automation | fixed with independent timer |
| BUG-003 | Milestone body exceeded 402px | Flex item retained scrollbar intrinsic width | 1 | `minWidth: 0` constrained HTML but body still exceeded viewport | partial |
| BUG-003 | Milestone body exceeded 402px | Percentage shell width included the scrollbar | 2 | Numeric `useWindowDimensions().width` produced bodyWidth 402 | fixed |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd lightflux && npm run typecheck` | pass | TypeScript | No errors. |
| `cd lightflux && npm test` | pass | Frontend | 17 files, 91 tests. |
| `cd lightflux && npm run desktop:web` | pass | Production Web | Expo export completed, 1190 modules. |
| `cd server && npm test` | pass | Server regression | 23 passed; 1 live PostgreSQL test skipped by environment. |
| Browser 402x874 and 858x781 | pass | Seven routed surfaces, auth, menus, drag, Toast | Zero nested buttons, hydration errors, or horizontal overflow. |
| Pointer drag paused before release | pass | Groups child preview | Source +46px, sibling -46px, insertion line visible. |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |
| medium | Web Toasts could remain indefinitely when `Animated` completion was throttled. | Alert count remained two after four seconds. | Independent post-animation dismissal timer; runtime recheck passed. |
| medium | Fixed drag displacement did not include actual row margin. | Rendered child centers differed by 46px while preview moved 42px. | Shared steps changed to root 54px/child 46px with focused tests. |
| medium | External HTML drags could create a fake task drag state on `dragEnter`. | Handler synthesized source ID when `dragState` was null. | Ignore drag-enter unless an active same-scope drag exists. |
| medium | Long narrow routed pages expanded the shell by scrollbar width. | Milestone body width was 419px at a 402px viewport. | Numeric shell width plus zero flex min-width; all routes now match viewport. |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |
| none | No goal item deferred or blocked. | Completion gate evidence above. | None. |

## Memory Updates

- Goal record updated: yes
- Durable `AGENTS.md` lesson: updated auth Slot, composite-row HTML, and drag preview rules.

## Completion

- Completed items: BUG-001 through FEAT-006.
- Acceptance evidence: automated suites, production export, populated route
  matrix, authentication flow, compact milestone menus, and paused/final drag
  workflows all passed.
- Checks not run: live PostgreSQL integration remained environment-skipped;
  no Rust source changed, so Cargo check was not required.
- Residual risk: native drag and menu code passed shared TypeScript/domain
  checks but was not exercised on a physical iOS/Android device in this run.
- Delivery commits:
  - `0cb478e fix(ui): stabilize routed responsive shell`
  - `3413611 feat(ui): polish milestones task drag and toasts`
  - `33facf7 docs: record routed UI and migration guidance`
- Final status: complete; implementation, verification, review, commits, and
  remote push all finished.
