# Goal Run: Mobile Workflows And Navigation Preferences

- Status: `complete`
- Source: User request and iOS screenshots, 2026-08-19

## Objective

Replace obstructive mobile task editing with a contextual detail workspace, make AI keyboard-safe, expose settings on mobile, allow users to hide optional navigation views, and add a metadata-aware quick task action.

## Work Items

| ID | Type | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | bug | AI composer remains visible above the native keyboard. | iOS/Android | high | done |
| FEAT-002 | feature | Mobile task details open as a contextual sheet rather than a full-screen replacement. | iOS/Android | medium | done |
| FEAT-003 | feature | A mobile floating add action creates a task with selected date, group, and priority. | iOS/Android | high | done |
| FEAT-004 | feature | Settings can hide optional navigation views, persists safely, and the mobile settings launcher is available outside Groups. | Web/iOS/Android/Desktop | high | done |

## Decisions

- Keep Today and Groups visible so there is always an active task surface.
- Make Completed, Calendar, Milestones, and Trash independently hideable.
- Use a bottom-aligned mobile detail sheet so the user maintains context of the list beneath it.
- Use one explicit confirmation to create quick tasks; no provisional persisted task is created.

## Evidence

| Hypothesis | Evidence | Next probe |
| --- | --- | --- |
| AI composer is hidden because its native full-screen panel does not react to keyboard height. | `AgentCommandPanel` uses `SafeAreaView` without `KeyboardAvoidingView`. | Add native keyboard avoiding around the focused workspace. |
| Full-screen editor causes the reported context loss. | `App.tsx` mounts `TaskEditorScreen` in `presentationStyle="fullScreen"` modal. | Replace with transparent contextual sheet. |
| Optional nav requires persistence and migration. | Navigation order is persisted as required items; loader always appends all IDs. | Add normalized hidden IDs with a V10 migration and tests. |

## Execution Log

### BUG-001 - AI keyboard avoidance

- Root cause: The native AI workspace had no keyboard-avoidance container, so the composer remained at the physical bottom when iOS opened the keyboard.
- Fix: Wrapped the native safe-area workspace in `KeyboardAvoidingView` using iOS padding behavior.

### FEAT-002 - Contextual mobile task details

- Root cause: The mobile task editor was mounted in a full-screen modal, replacing the originating task context.
- Fix: The editor now opens in a transparent, bottom-aligned 84% sheet. The underlying task surface remains visible and a backdrop or close button dismisses the sheet.

### FEAT-003 - Quick task creation

- Design: Added `QuickAddTaskSheet`, a keyboard-safe bottom sheet that holds an unpersisted draft until confirmation. It exposes date calendar, group list, and priority list before a single `addTodo` call.
- Data change: `NewTodo.priority` is optional and `addTodo` applies it without changing existing callers.
- Browser evidence: At 627px, selected high priority and created a task; the list rendered its high-priority indicator.

### FEAT-004 - Navigation preferences and mobile settings launcher

- Data migration: Persisted state moves from V9 to V10 with `hiddenNavigationItems`. The loader keeps only optional IDs, so Today and Groups cannot be hidden. Older state defaults to no hidden views.
- UI: Settings shows switches for Completed, Calendar, Milestones, and Trash. The mobile left utility button opens account/settings on Today and Groups; its menu includes the account avatar.
- Review repair: Hidden items caused desktop drag targets to use the wrong index in the full navigation array. Targets now resolve through the visible navigation order before persistence.

## Changed Files

- `lightflux/App.tsx`
- `lightflux/components/SettingsScreen.tsx`
- `lightflux/components/account/AccountMenu.tsx`
- `lightflux/components/agent/AgentCommandPanel.tsx`
- `lightflux/components/editor/TaskEditorScreen.native.tsx`
- `lightflux/components/tasks/QuickAddTaskSheet.tsx`
- `lightflux/content/types.ts`
- `lightflux/content/en/settings/index.ts`
- `lightflux/content/zh/settings/index.ts`
- `lightflux/services/todoStorage.ts`
- `lightflux/store/todoStore.tsx`
- `lightflux/tests/appStateMerge.test.ts`
- `lightflux/tests/todoStorageMigration.test.ts`
- `lightflux/types/todo.ts`

## Verification Summary

| Check | Result | Notes |
| --- | --- | --- |
| `cd lightflux && npm run typecheck` | pass | Passed after the review repair. |
| `cd lightflux && npm test` | pass | 13 files, 71 tests. |
| `cd lightflux && npm run desktop:web` | pass | Expo Web export completed. |
| Browser narrow workflow | pass | Settings launcher, immediate navigation hiding, quick-add metadata selection, and high-priority creation checked at 627px. |
| Live iOS/Android runtime | blocked | No simulator/device bridge is available in this environment. |

## Review

- No unresolved high or medium findings.
- Repaired visible-navigation drag index mapping before final verification.

## Completion

- Final status: complete
- Residual risk: Verify iOS keyboard animation and native editor-sheet gesture behavior in Radon before release.
