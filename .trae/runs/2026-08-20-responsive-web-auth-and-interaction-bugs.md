# Goal Run: Responsive Web Auth And Interaction Bugs

- Status: `in_progress`
- Source: User bug list and two narrow Web screenshots, 2026-08-20
- Started: 2026-08-20
- Updated: 2026-08-20

## Objective

Make narrow Web layouts stable and fully interactive, support practical email
authentication, suppress cloud errors in local mode, and open search results in
the correct task context.

## Scope

### Included

- Minimum usable Web viewport constraints with scrolling below the boundary.
- Better Auth email/password registration and sign-in alongside email OTP.
- Narrow Web task-detail height, metadata menus, and editor focus styling.
- Local-mode cloud-sync gating.
- Search-result routing to the owning task surface and task details.
- Existing uncommitted responsive AI and local-session fixes.

### Excluded

- OAuth providers and password-reset delivery beyond existing OTP support.
- Redesigning native mobile navigation.
- Cloud deployment or credential changes.

## Work Items

| ID | Type | Source locator | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | bug | User item 1 | Below the minimum viewport, the app scrolls instead of overlapping controls; 402x874 remains unchanged. | Web/Desktop | medium | ready |
| FEAT-002 | feature | User item 2 | Users can register/sign in with email and password or choose email OTP; passwords remain server-owned by Better Auth. | Web/Desktop/iOS/Android | high | ready |
| BUG-003 | bug | User item 3/screenshots | Narrow Web task details occupy about 40% height; date/group/priority controls work; editor has no raw focus rectangle. | Web | high | ready |
| BUG-004 | bug | User item 4 | Local-only or unauthenticated use never attempts cloud synchronization or shows sync-failure toast. | Web/Desktop/iOS/Android | high | ready |
| BUG-005 | bug | User item 5 | Opening a search result routes to a compatible view and keeps the requested task details open. | Web/Desktop/iOS/Android | high | ready |

## Questions And Assumptions

| ID | Kind | Detail | Resolution |
| --- | --- | --- | --- |
| QUESTION-001 | assumption | “40%” refers to the narrow Web task-detail bottom sheet. | Apply 40% to responsive Web only; native remains a focused workspace. |
| QUESTION-002 | assumption | Password support should include first-time account creation. | Use explicit sign-in/register modes with Better Auth email/password. |
| QUESTION-003 | assumption | Minimum viewport should preserve access rather than reject use. | Use minimum content dimensions and document scrolling, not an unsupported-screen blocker. |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-20 | Keep OTP and password as peer authentication modes. | OTP remains useful for recovery/onboarding while password improves repeat login and debugging. | User item 2; `server/src/email-auth.mjs` |
| 2026-08-20 | Gate cloud persistence on a proven authenticated owner. | API configuration alone does not imply a user session. | User item 4; `services/sessionStorage.ts`, `todoStorage.ts` |

## Execution Log

### BUG-001 - Minimum responsive viewport

- Baseline: Web content had no lower viewport bound, so controls could continue
  compressing below a usable phone-sized canvas.
- Root cause or design: The first implementation was added to
  `focusStyles.ts`, but Expo platform resolution loads `focusStyles.web.ts` on
  Web. The rule was present in source but absent from the running bundle.
- Changed files: `lightflux/config/focusStyles.web.ts`.
- Verification: Fresh-server computed-style and below-boundary overflow checks
  pending after moving the rules to the Web platform module.
- Review:
- Result: in progress

### FEAT-002 - Email/password authentication

- Baseline:
- Root cause or design:
- Changed files:
- Verification:
- Review:
- Result:

### BUG-003 - Narrow task details

- Baseline: At 402x874 the detail sheet was oversized, metadata menus rendered
  but their options did not receive pointer events, and the Tiptap editor
  exposed a raw browser focus rectangle.
- Root cause or design: Responsive Web reused the native 88% sheet height.
  Metadata menus portal to `document.body`, but RNW renders the task-detail
  `Modal` host at z-index 9999 while `MenuSurface` used z-index 2000; the
  editor therefore remained the pointer hit target beneath the visible menu.
- Changed files: `lightflux/App.tsx`,
  `lightflux/components/editor/TaskEditorMetadata.tsx`,
  `lightflux/components/editor/TaskEditorScreen.web.tsx`,
  `lightflux/components/ui/MenuSurface.tsx`.
- Verification: Runtime recheck pending after raising the Web menu host above
  the RNW modal host.
- Review:
- Result: in progress

### BUG-004 - Local-mode sync gating

- Baseline:
- Root cause or design:
- Changed files:
- Verification:
- Review:
- Result:

### BUG-005 - Search result routing

- Baseline:
- Root cause or design:
- Changed files:
- Verification:
- Review:
- Result:

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | Computed minimum dimensions remained `0px` after a fresh reload | The edited base module was not the Web-resolved module | 1 | Metro bundle maps `./config/focusStyles` to `config/focusStyles.web.ts` | Moved the viewport constraints into the Web module; runtime verification pending |
| BUG-003 | Date option was visible but did not update the task | Menu surface was below the RNW Modal stacking context | 1 | `elementFromPoint()` returned the Tiptap editor; menu host z-index 2000 and modal host z-index 9999 | Raised the Web menu host to 11000; runtime verification pending |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd lightflux && npm run typecheck` | pending | TypeScript | |
| `cd lightflux && npm test` | pending | Frontend | |
| `cd lightflux && npm run desktop:web` | pending | Production Web | |
| `cd server && npm test` | pending | Authentication server | |
| Browser 402x874 | pending | Narrow Web | |
| Browser desktop | pending | Desktop regression | |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |

## Memory Updates

- Goal record updated: yes
- Durable `AGENTS.md` lesson: pending

## Completion

- Completed items:
- Acceptance evidence:
- Checks not run:
- Residual risk:
- Final status:
