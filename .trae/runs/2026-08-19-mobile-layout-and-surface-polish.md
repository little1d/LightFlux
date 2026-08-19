# Goal Run: Mobile Layout And Surface Polish

- Status: `complete`
- Source: User report and three iOS screenshots in conversation
- Started: 2026-08-19
- Updated: 2026-08-19

## Objective

Remove the redundant Today overview on every client and make task actions, Trash, and Settings compact and platform-appropriate across Web, Tauri, iOS, and Android.

## Scope

### Included

- Remove the Today overview component and its unused content contract.
- Correct mobile safe-area bottom navigation and prevent task action menus from rendering as desktop-positioned menus on touch clients.
- Remove the Trash white surface and simplify the Settings header and section presentation.
- Establish component-level platform style boundaries where the inspected code currently mixes desktop and mobile rendering concerns.

### Excluded

- Changing task data, navigation destinations, or desktop preference behavior.
- Rebuilding unrelated app screens.

## Work Items

| ID | Type | Source locator | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| FEAT-001 | feature | User request: "今日概览" | Today opens directly into task entry and task rows; no overview card or overview copy remains. | Web/iOS/Android/Desktop | low | done |
| BUG-002 | bug | iOS screenshots 1-2 | Bottom navigation respects the device safe area; task action triggers use a touch-appropriate surface rather than a viewport-positioned desktop menu. | iOS/Android | high | done |
| FEAT-003 | feature | iOS screenshot 3 and user request | Trash has no white framed page surface; Settings omits redundant preferences heading/subtitle and uses compact sections. | Web/iOS/Android/Desktop | medium | done |
| REV-004 | review | User request: platform style isolation | Shared behavior remains shared while Web/Tauri and native layout/rendering branches are separated at component boundaries where needed. | Web/iOS/Android/Desktop | medium | done |

## Questions And Assumptions

| ID | Kind | Detail | Resolution |
| --- | --- | --- | --- |
| QUESTION-001 | assumption | Native task actions will use an in-app bottom sheet with the existing action set, while Web/Tauri retain anchored context menus. | Reversible presentation-only change; validated against the screenshot's touch ergonomics requirement. |
| QUESTION-002 | assumption | Removing the settings header preserves the page title supplied by application navigation or mobile screen context. | Existing screen source and runtime inspection will confirm title ownership. |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-19 | Treat iOS menu placement as a platform-rendering bug, not a menu-coordinate tuning issue. | A touch client needs an ergonomic action surface independent of the trigger's screen coordinate. | User screenshots and `TaskActionMenu`/`MenuSurface` ownership path. |

## Execution Log

### FEAT-001 - Remove Today overview

- Baseline: `TodoScreen` rendered the overview card whenever the day contained a task and depended on four global translation fields.
- Root cause or design: The card duplicated information that does not enable a primary task workflow. Removing it is presentation-only and leaves tasks, events, and analytics intact.
- Changed files: `lightflux/components/TodoScreen.tsx`, `lightflux/content/types.ts`, `lightflux/content/en/today/index.ts`, `lightflux/content/zh/today/index.ts`.
- Verification: Browser navigation to Today showed task input/list without overview text; content contract and full test suite passed.
- Review: No data or historical metrics path changed.
- Result: done.

### BUG-002 - Native bottom navigation and task actions

- Baseline: `MenuSurface` ignored `position` for every non-web client and always placed menus at the bottom; task, group, and milestone hooks therefore opened actions detached from their triggers. Mobile bottom navigation used a fixed 66px white surface plus implicit safe-area handling.
- Root cause or design: Preserve a shared menu contract, but measure the native trigger with `measureInWindow`, pass a viewport position, and use the same clamped anchored position on native `Modal` and Web `Portal`. The navigation safe-area view now explicitly owns only the bottom inset and uses the canvas background with a smaller fixed content bar.
- Changed files: `lightflux/App.tsx`, `lightflux/components/ui/MenuSurface.tsx`, `lightflux/components/ui/menuPosition.ts`, `lightflux/components/tasks/useTaskContextMenu.ts`, `lightflux/components/groups/useGroupContextMenu.ts`, `lightflux/components/milestones/useMilestoneContextMenu.ts`, `lightflux/tests/menuPosition.test.ts`.
- Verification: `menuPosition.test.ts` covers normal, bottom-right, and negative-anchor placement; TypeScript, full tests, and Web export passed. Native emulator unavailable in this environment.
- Review: Anchored menus retain existing Web Portal and context-menu behavior; all consuming native hooks now provide a measured position.
- Result: done.

### FEAT-003 - Trash and Settings surface simplification

- Baseline: Trash empty state and rows used framed white cards; Settings rendered the redundant `LIGHTFLUX PREFERENCES` eyebrow and desktop-preference subtitle with large rounded cards.
- Root cause or design: Keep the canvas as the page surface; use separators for Trash rows and remove explanatory settings header copy while tightening section spacing/radii.
- Changed files: `lightflux/components/TrashScreen.tsx`, `lightflux/components/SettingsScreen.tsx`, `lightflux/components/settings/styles.ts`, `lightflux/content/types.ts`, `lightflux/content/en/desktop/index.ts`, `lightflux/content/zh/desktop/index.ts`.
- Verification: Browser workflow checked populated Trash and Settings at 681px width; screenshots captured `trash-surface.png` and `settings-compact.png`.
- Review: Destructive Trash actions and Settings controls remain unchanged.
- Result: done.

### REV-004 - Platform style boundaries

- Baseline: Platform-specific drag files already existed, but the shared overlay primitive silently applied desktop Web positioning rules to native menus.
- Root cause or design: The shared business/action menu stays shared. Platform-specific boundaries are contained in `MenuSurface` (`Portal`/fixed overlay for Web, `Modal` for native), while trigger measurement is performed only in native hook branches.
- Changed files: same as BUG-002.
- Verification: Web dropdown opened through the Portal at narrow desktop/mobile width; `npm run desktop:web` passed.
- Review: No unresolved high or medium findings. The only residual gap is live iOS/Android device exercise.
- Result: done.

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd lightflux && npm run typecheck` | pass | TypeScript | Passed after UI and menu changes. |
| `cd lightflux && npm test` | pass | Unit tests | 13 files, 70 tests. |
| `cd lightflux && npm run desktop:web` | pass | Web/Tauri layout | Expo Web export completed. |
| Native action surface inspection | blocked | iOS/Android | No iOS/Android simulator or device bridge available. |
| Browser workflow at desktop and narrow widths | pass | Web/Tauri layout | Today, Trash, Settings, and settings menu checked at 681px width. |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |

## Memory Updates

- Goal record updated: yes
- Durable `AGENTS.md` lesson: added native anchored menu rule.

## Completion

- Completed items: FEAT-001, BUG-002, FEAT-003, REV-004.
- Acceptance evidence: browser workflow, `menuPosition.test.ts`, full unit suite, typecheck, and Web export.
- Checks not run: live iOS/Android runtime inspection.
- Residual risk: native safe-area rendering is logically covered but must be visually checked on a device after the next Radon build.
- Final status: complete.
