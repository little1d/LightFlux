# Goal Run: Revision Conflict Recovery And Native Auth

- Status: `complete`
- Source: User request, 2026-08-20
- Started: 2026-08-20
- Updated: 2026-08-20

## Objective

Add server-authoritative revision synchronization, automatically recover 409 conflicts without discarding independent device edits, and complete secure native authentication and post-login synchronization.

## Scope

### Included

- PostgreSQL app-state revision migration and compare-and-swap API.
- Persistent client cloud baseline and three-way aggregate merge.
- Automatic 409 merge/retry and runtime state reconciliation.
- Better Auth email OTP on iOS/Android with SecureStore-backed credentials.
- Authenticated native sync, upload, and AI requests.

### Excluded

- Real-time collaboration, CRDTs, or normalized task tables.
- Production SMTP/provider provisioning.
- Shared Agent conversation storage across API replicas.

## Work Items

| ID | Type | Source locator | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| FEAT-001 | feature | User: revision protocol | Every app-state write is conditional on a server revision and returns the next revision. | Server/Web/iOS/Android/Desktop | high | done |
| BUG-002 | bug | User: 409 recovery | A stale device receives the latest snapshot, three-way merges independent edits, retries, and updates local runtime/cache. | Web/iOS/Android/Desktop | high | done |
| FEAT-003 | feature | User: native auth | Native OTP sessions persist securely and authenticate sync, upload, and Agent calls; successful sign-in triggers cloud reconciliation. | iOS/Android | high | done |

## Questions And Assumptions

| ID | Kind | Detail | Resolution |
| --- | --- | --- | --- |
| QUESTION-001 | assumption | Concurrent edits to the same record need a deterministic fallback. | Use three-way equality first, then the record/state `updatedAt`; preserve independent additions/deletions when only one side changed from the base. |
| QUESTION-002 | assumption | Existing pre-revision clients may still call PUT without `baseRevision`. | Keep legacy `updatedAt` protection when `baseRevision` is absent; new clients always use revision CAS. |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-20 | Persist the last cloud revision and base state on each device. | Three-way recovery requires knowing what the device last synchronized, including after offline restart. | `lightflux/services/todoStorage.ts` ownership boundary. |
| 2026-08-20 | Reuse current Better Auth email OTP implementation for native auth. | It already uses Expo SecureStore and avoids introducing a second native token system. | `authClient.native.ts`, `SignedOutScreen.tsx`, server email auth files. |

## Execution Log

### FEAT-001 - Revision CAS

- Baseline: PostgreSQL compared only client `state.updatedAt`; GET returned no server version.
- Root cause or design: Added migration 003 with a monotonic `app_states.revision`. New PUT requests include `baseRevision`; the repository locks per user, compares revisions, increments atomically, and returns the next revision. Legacy requests without a revision retain `updatedAt` protection.
- Changed files: `server/migrations/003_app_state_revision.sql`, `server/src/postgres/repository.mjs`, `server/src/index.mjs`, PostgreSQL tests.
- Verification: In-memory repository tests, PostgreSQL 17 live smoke test, migration inspection, and an authenticated HTTP flow (`0 -> 1`, stale `0 -> 409`) passed.
- Review: Conflict responses include owner, latest revision, and latest aggregate.
- Result: done.

### BUG-002 - Conflict recovery

- Baseline: Any 409 became a generic save failure; the client kept no cloud baseline and could not merge safely.
- Root cause or design: Persist `{ownerId, revision, baseState}` beside device data. On conflict, merge base/local/remote by three-way equality, use record timestamps only for true same-record conflicts, repair references, retry up to three times, and reconcile the live Zustand state. Serialize cloud writes and prevent older responses from overwriting newer device saves.
- Changed files: `lightflux/services/appStateMerge.ts`, `todoStorage.ts`, `store/todoStore.tsx`, `authApi.ts`, focused tests.
- Verification: Independent edits, deletion/addition, same-record conflict, account switching, concurrent device saves, and 409 retry tests passed.
- Review: Canonical key-sorted comparison prevents JSON key order from consuming revisions or creating false conflicts.
- Result: done.

### FEAT-003 - Native auth

- Baseline: Remote auth was previously Web-only. The parallel email-auth work introduced Better Auth OTP and Expo SecureStore but did not guarantee post-login cloud reconciliation.
- Root cause or design: Reused the Better Auth Expo client. Native cookies live in SecureStore and are forwarded by `authenticatedFetch` to sync, upload, and Agent endpoints. OTP verification now proves `getSession()` restoration. Login waits for TodoStore hydration and account-scoped revision synchronization before task data becomes visible.
- Changed files: `lightflux/services/authClient.native.ts`, `authApi.ts`, `sessionStorage.ts`, `SignedOutScreen.tsx`, `App.tsx`, `app.json`, server email-auth integration and tests.
- Verification: Better Auth OTP/session test, authenticated-header test, Expo scheme/plugin config inspection, full client tests/typecheck/Web export, and Compose API health passed.
- Review: Owner IDs in sync metadata prevent a previous account's local cache from being uploaded to a newly authenticated account.
- Result: done.

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |
| BUG-002 | `syncConflict.test.ts` | Test baseline was being normalized into a different value. | 1/3 | First synchronization unexpectedly made two mocked writes. | Added an equality assertion and inspected calls. |
| BUG-002 | `syncConflict.test.ts` | Ordinary JSON serialization treated key order as content. | 2/3 | Parsed state was deep-equal but synchronization still wrote a new timestamped state. | Switched equality to canonical key-sorted serialization; test passed. |
| FEAT-003 | Compose health | API code regression. | 1/3 | Container log showed production OTP requires SMTP. | Marked Compose as local development with log delivery; API became healthy. |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd server && npm test` | pass | Server/domain | 22 passed, one opt-in live test skipped. |
| Live PostgreSQL smoke test | pass | PostgreSQL CAS | Revision repository flow passed against PostgreSQL 17. |
| `cd lightflux && npm test` | pass | Client merge/storage | 15 files, 82 tests. |
| `cd lightflux && npm run typecheck` | pass | Cross-platform types | Passed. |
| `cd lightflux && npm run desktop:web` | pass | Web/Tauri bundle | Export completed; Expo force-exited after output generation. |
| Compose API workflow | pass | Integrated runtime | PostgreSQL and API healthy; email OTP login and revision 409 exercised over HTTP. |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |
| medium | A late conflict result could overwrite a newer device save. | `saveAppState` wrote the synchronized result after the remote queue. | Added a device-write generation guard. |
| medium | OTP success could reveal the previous account before secure session restoration/sync. | `continueSession` set `signedIn` before `syncRemote`; verification did not call `getSession`. | Verify session restoration and await account sync before entering the app. |
| medium | Independent parent moves could create a merged A↔B cycle. | Three-way merge combined valid one-sided moves without a cycle pass. | Deterministically break the lexicographically last parent edge in every detected cycle. |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |

## Memory Updates

- Goal record updated: yes
- Durable `AGENTS.md` lesson: added revision-CAS and native-session rules.

## Completion

- Completed items: FEAT-001, BUG-002, FEAT-003.
- Acceptance evidence: automated suites, live PostgreSQL, Compose health, OTP HTTP session, revision 0/1/409 HTTP flow.
- Checks not run: physical iOS/Android OTP delivery with production SMTP.
- Residual risk: same-record simultaneous edits use deterministic last-updated fallback rather than a field-level CRDT.
- Final status: complete
