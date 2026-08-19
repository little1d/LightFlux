# Goal Run: Mobile Settings And Sheet Polish

- Status: `complete`
- Source: User request and narrow iOS screenshots, 2026-08-19

## Objective

Make the mobile settings icon navigate directly to Settings, prevent narrow Today header overlap, and align quick task creation and AI prompting as compact bottom sheets.

## Work Items

| ID | Type | Acceptance criteria | Platforms | Status |
| --- | --- | --- | --- | --- |
| BUG-001 | bug | Mobile Today has no brand/settings overlap at narrow widths. | iOS/Android/Web | done |
| FEAT-002 | feature | The mobile settings button opens Settings directly without an account menu. | iOS/Android | done |
| FEAT-003 | feature | Quick add has no dark backdrop or redundant action buttons; close dismisses and Enter creates. | iOS/Android/Web | done |
| FEAT-004 | feature | Mobile AI opens as a bottom prompt sheet with visible input, not as a full-screen page. | iOS/Android/Web | done |

## Decisions

- The mobile settings button is navigation, not an account control.
- Brand identity is retained on desktop-width Today but omitted below the desktop layout breakpoint to preserve task workspace density.
- Dismissal is only the explicit close button or native back gesture; neither quick-add nor AI uses a backdrop as an implicit destructive exit.

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| Typecheck | pending | |
| Unit tests | pending | |
| Web export | pending | |
| Narrow browser workflow | pending | |

## Execution Log

### BUG-001 - Narrow Today header

- Root cause: The always-rendered Today brand block occupied the same top region as mobile utility controls.
- Fix: The brand block now renders only at desktop layout widths; narrow layouts reserve compact top space for utilities.
- Evidence: Browser screenshot at 670px showed settings, search, and AI without overlap or brand text.

### FEAT-002 - Direct mobile settings

- Fix: The left mobile settings icon calls navigation directly. `AccountMenu` remains desktop-only, where sign-out is available from the desktop account trigger.
- Evidence: Browser click on the settings icon opened Settings immediately with no menu surface.

### FEAT-003 - Quick-add sheet refinement

- Fix: Removed the backdrop press target and dimmed background. The sheet is dismissed by its close icon; title entry uses the existing `onSubmitEditing` path, so Enter creates the task. Removed duplicate cancel/create footer buttons.
- Fix: Replaced the rounded-square quick-add icon with a 52px circular floating button positioned above the bottom navigation.
- Evidence: Browser screenshot at 670px showed the transparent-context bottom sheet with only close control, text input, and metadata selectors.

### FEAT-004 - AI prompt sheet

- Fix: The native AI surface now uses the same transparent-context, bottom-aligned sheet model as quick add. It retains `KeyboardAvoidingView`, uses native slide animation, and assigns scroll space so the composer stays visible.
- Evidence: Typecheck and production Web export passed; live iOS/Android rendering remains for Radon confirmation.

## Verification Summary

| Check | Result | Notes |
| --- | --- | --- |
| `cd lightflux && npm test` | pass | 13 files, 71 tests. |
| `cd lightflux && npm run typecheck` | pass | Passed. |
| `cd lightflux && npm run desktop:web` | pass | Expo Web export completed. |
| Browser narrow workflow | pass | Direct settings, non-overlapping Today header, circular add action, and transparent quick-add sheet checked at 670px. |
| Live iOS/Android runtime | blocked | No simulator/device bridge is available in this environment. |

## Completion

- Final status: complete
- Residual risk: Confirm native AI slide/keyboard animation in Radon before release.
