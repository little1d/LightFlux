# Goal Run: Responsive Web Auth And Interaction Bugs

- Status: `complete`
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
| BUG-001 | bug | User item 1 | Below the minimum viewport, the app scrolls instead of overlapping controls; 402x874 remains unchanged. | Web/Desktop | medium | completed |
| FEAT-002 | feature | User item 2 | Users can register/sign in with email and password or choose email OTP; passwords remain server-owned by Better Auth. | Web/Desktop/iOS/Android | high | completed |
| BUG-003 | bug | User item 3/screenshots | Narrow Web task details occupy about 40% height; date/group/priority controls work; editor has no raw focus rectangle. | Web | high | completed |
| BUG-004 | bug | User item 4 | Local-only or unauthenticated use never attempts cloud synchronization or shows sync-failure toast. | Web/Desktop/iOS/Android | high | completed |
| BUG-005 | bug | User item 5 | Opening a search result routes to a compatible view and keeps the requested task details open. | Web/Desktop/iOS/Android | high | completed |

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
- Verification: A fresh Web server reported computed minimums of 320px by
  568px while the 402x874 viewport remained unchanged. The production bundle
  contains the same minimum dimensions and `overflow:auto` rules.
- Review: Expo's reset is overridden from the Web platform module rather than
  from the unused base module.
- Result: completed

### FEAT-002 - Email/password authentication

- Baseline: The sign-in workspace exposed only the six-digit email OTP flow.
- Root cause or design: Better Auth already had a password column in migration
  002, so enable its verified email/password provider and keep OTP as a peer
  sign-in method rather than introducing a second credential store.
- Changed files: `server/src/email-auth.mjs`,
  `server/tests/email-auth.test.mjs`, `lightflux/services/authApi.ts`,
  `lightflux/services/sessionStorage.ts`,
  `lightflux/components/SignedOutScreen.tsx`, localized common content, and
  `lightflux/tests/sessionStorage.test.ts`.
- Verification: Server tests passed OTP restoration and password
  registration, email verification, password sign-in, and session restoration.
  At 402x874 the UI exposed password sign-in, account creation, OTP sign-in,
  and local mode; the description now names both authentication methods.
- Review: No schema migration was required; passwords remain hashed and owned
  by Better Auth.
- Result: completed

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
- Verification: At 402x874 the sheet measured about 40% of the viewport.
  Date, group, and priority selections all updated their chips and underlying
  rows. A fresh-server focus pass reported no editor/wrapper outline, border,
  or shadow, and the screenshot showed no focus rectangle.
- Review: The remaining focus frame came from the global
  `#task-rich-editor:focus-within` wrapper rule; it is now desktop-only.
- Result: completed

### BUG-004 - Local-mode sync gating

- Baseline: Configuring a remote API was treated as equivalent to having an
  authenticated owner, so local saves could enter the cloud path and surface a
  persistence-error Toast.
- Root cause or design: Remote persistence is enabled only after a successful
  owner-scoped synchronization. Local mode and signed-out state always save to
  device storage.
- Changed files: `lightflux/services/todoStorage.ts`,
  `lightflux/services/sessionStorage.ts`,
  `lightflux/tests/syncConflict.test.ts`, and
  `lightflux/tests/sessionStorage.test.ts`.
- Verification: The regression test proves local saves make zero app-state
  load/save calls before an owner is established. Browser edits in local mode
  made no app-state requests and showed no save-failure Toast; only the startup
  auth-session probe remained.
- Review: Signing out clears both the local session marker and remote sync
  context.
- Result: completed

### BUG-005 - Search result routing

- Baseline: A result could lose its requested detail state while the search
  Modal closed, and the current surface might not own the task.
- Root cause or design: Open the result before closing search and route active
  tasks to Groups and completed tasks to Completed.
- Changed files: `lightflux/App.tsx`,
  `lightflux/components/SearchOverlay.tsx`,
  `lightflux/store/todoDomain.ts`, and
  `lightflux/tests/todoDomain.test.ts`.
- Verification: The domain test covers active/completed routing. At 402x874,
  searching for an active task by title closed search, switched to Groups, and
  kept the requested task detail sheet open.
- Review: The result panel now sits above the full-screen close layer.
- Result: completed

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | Computed minimum dimensions remained `0px` after a fresh reload | The edited base module was not the Web-resolved module | 1 | Metro bundle maps `./config/focusStyles` to `config/focusStyles.web.ts` | Moved the viewport constraints into the Web module; fresh-server computed styles and production bundle passed |
| BUG-003 | Date option was visible but did not update the task | Menu surface was below the RNW Modal stacking context | 1 | `elementFromPoint()` returned the Tiptap editor; menu host z-index 2000 and modal host z-index 9999 | Raised the Web menu host to 11000; date, group, and priority clicks passed |
| BUG-003 | Tiptap itself had no outline but a focus frame remained | The frame came from the `task-rich-editor` wrapper | 2 | Focused editor computed styles were clear while the wrapper retained the global focus shadow | Limited the wrapper focus shadow to desktop widths; fresh-server screenshot passed |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd lightflux && npm run typecheck` | pass | TypeScript | No errors. |
| `cd lightflux && npm test` | pass | Frontend | 16 files, 88 tests. |
| `cd lightflux && npm run desktop:web` | pass | Production Web | Expo export completed; bundle contains the viewport, focus, and auth-copy changes. |
| `cd server && npm test` | pass | Authentication server | 23 passed, 1 PostgreSQL integration test skipped by environment. |
| Browser 402x874 | pass | Narrow Web | Metadata, 40% sheet, focus, auth modes, local sync boundary, and search workflow exercised. |
| Browser desktop | not run | Desktop runtime | Shared logic covered by tests/typecheck/export; browser fixture remained fixed at 402x874. |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |
| low | Sign-in description still described OTP as the only method. | Password tab was the default while the supporting copy said email code only. | Updated Chinese and English copy to name password and email-code login. |
| low | Narrow focus frame survived the ProseMirror style reset. | Wrapper `focus-within` shadow remained visible in a focused screenshot. | Scoped the framed-editor focus treatment to desktop widths. |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |
| VERIFY-DESKTOP | The browser fixture was locked to 402x874. | Browser snapshots reported a fixed 402x874 viewport. | Recheck pointer workflows in a desktop viewport during the next desktop UI pass. |

## Memory Updates

- Goal record updated: yes
- Durable `AGENTS.md` lesson: updated the existing Web Portal rule with the
  RNW Modal host stacking requirement.

## Completion

- Completed items: BUG-001, FEAT-002, BUG-003, BUG-004, BUG-005.
- Acceptance evidence: focused and full automated suites, production Web
  export, computed styles, screenshots, network inspection, and the complete
  402x874 workflows recorded above.
- Checks not run: live PostgreSQL integration and a separate desktop-width
  browser pass.
- Residual risk: password delivery and cloud synchronization still depend on
  the deployed SMTP/API environment; no real credentials were submitted during
  browser verification.
- Final status: complete.
