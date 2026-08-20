# Goal Run: Calendar And Mobile Task Actions

- Status: `complete`
- Source: User screenshots and responsive interaction request, 2026-08-20
- Started: 2026-08-20
- Updated: 2026-08-20

## Objective

Remove repeated calendar agenda chrome and provide a compact, touch-oriented
task action flow on narrow screens.

## Scope

### Included

- Calendar creation from the selected date through a single add icon.
- Direct selected-date task rows without a date/composer card.
- Narrow task action bottom sheet with date, group, and priority sublayers.
- Responsive Web, iOS/Android source, and desktop menu regression coverage.

### Excluded

- Persisted schema changes.
- Swipe gestures that conflict with existing task drag behavior.
- Redesigning desktop context-menu interaction.

## Work Items

| ID | Type | Source locator | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| FEAT-001 | feature | Calendar screenshot | Calendar shows one selected-date add entry and tasks directly below the month grid. | Web/iOS/Android/Desktop | medium | done |
| FEAT-002 | feature | Narrow task menu screenshot | Phone task rows use a settings affordance and a bottom action sheet with nested date/group/priority choices. | Web/iOS/Android | high | done |
| VERIFY-003 | verification | 402x874 and desktop | Creation and nested task actions work without overlap or desktop regressions. | Web/Desktop | medium | done |

## Questions And Assumptions

| ID | Kind | Detail | Resolution |
| --- | --- | --- | --- |
| QUESTION-001 | assumption | Swipe should not be the only mobile action path. | Existing drag/reorder interactions make swipe ambiguous; use an explicit tune icon and touch sheet. |
| QUESTION-002 | assumption | Calendar add should reuse Quick Add. | Reuse the existing date/group/priority creation surface and prefill the selected date. |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-20 | Remove the agenda card on all widths. | The selected calendar cell already communicates date context. | `components/CalendarScreen.tsx` |
| 2026-08-20 | Use an in-place bottom-sheet hierarchy on narrow screens. | It preserves context and avoids viewport-clamped desktop flyouts. | `components/tasks/TaskActionMenu.tsx` |

## Execution Log

### FEAT-001 - Calendar simplification

- Baseline: Selected date, count, and creation controls were repeated in a
  separate framed agenda card.
- Changed files: `lightflux/components/CalendarScreen.tsx`,
  `components/tasks/QuickAddTaskSheet.tsx`, `App.tsx`, and Calendar content.
- Verification: At 402 px, the old composer and agenda card are absent, the
  selected-date add icon opens Quick Add with August 20 preselected, and the
  created task renders directly below the month grid. At 1200x813, the full
  calendar uses the available width without a side agenda card.
- Result: done.

### FEAT-002 - Narrow task actions

- Baseline: Phone-width rows used a desktop ellipsis menu and cascading group
  flyout.
- Changed files: `lightflux/components/tasks/TaskRowControls.tsx`,
  `TaskActionMenu.tsx`, and `components/ui/MenuSurface.tsx`.
- Verification: At 402 px, the tune icon opened a bottom sheet; date, group,
  and priority sublayers opened in place. Changing priority updated the row
  icon/background immediately, and rescheduling from August 20 to 21 moved the
  calendar count. Every first-level action remained within the 716 px app
  viewport. Desktop retained its 240 px anchored menu and group flyout.
- Result: done.

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |
| VERIFY-003 | Source Web startup | A concurrently edited storage import was temporarily duplicated. | 1/3 | Metro reported duplicate `Language`; the owning conversation corrected it. | Used the successful production export for runtime checks; final source typecheck and export passed. |
| FEAT-002 | 402 px action sheet | Safe-area content extended under the bottom navigation. | 1/3 | The final action initially appeared visually clipped. | Made the white sheet own the safe-area region and kept first/date layers scrollable; final action bottom was 714.5 of 716 px. |
| VERIFY-003 | Browser screenshot | IDE screenshot command timed out twice after the menu opened. | 1/3 | DOM snapshots and bounding boxes remained responsive with no console errors. | Retried observation separately and used element bounds plus prior/following screenshots. |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd lightflux && npm run typecheck` | pass | TypeScript | Passed after concurrent auth/storage work settled. |
| `cd lightflux && npm test` | pass | Frontend regressions | 15 files, 81 tests. |
| `cd lightflux && npm run desktop:web` | pass | Web export | Expo export completed; process cleanup warning did not affect exit code or artifacts. |
| Browser 402x874 device simulation | pass | Narrow calendar/actions | Inner app viewport was 402x716; add, create, priority, date, group layer, scrolling, and console checked. |
| Browser 1200x813 | pass | Desktop regression | Calendar filled the workspace; Quick Add and anchored task menu remained functional. |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |
| NATIVE-001 | No iOS/Android simulator bridge was available. | Shared source, native keyboard avoidance, responsive Web, typecheck, and export were covered. | Confirm touch animation and safe-area spacing in the next device build. |

## Memory Updates

- Goal record updated: yes
- Durable `AGENTS.md` lesson: updated phone duplication rule and added narrow task action rule.

## Completion

- Completed items: FEAT-001, FEAT-002, VERIFY-003.
- Acceptance evidence: responsive and desktop browser workflows, 81 tests,
  TypeScript, and production Web export.
- Checks not run: live iOS/Android device workflow.
- Residual risk: native runtime requires device/simulator confirmation.
- Final status: complete.
