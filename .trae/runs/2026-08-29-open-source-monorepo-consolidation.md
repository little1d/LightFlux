# Goal Run: Open-source monorepo consolidation

- Status: `blocked`
- Source: User request in this conversation
- Started: 2026-08-29 11:08
- Updated: 2026-08-29 11:38

## Objective

Make `little1d/LightFlux` the single coherent repository for the application,
CLI, and release distribution, improve its public README, remove obsolete local
build copies, and retire the superseded GitHub repositories without losing
required source or release behavior.

## Scope

### Included

- Remove generated local installer artifacts and obsolete LightFlux app copies.
- Import useful `lightflux-cli` source and documentation into the main repo.
- Move release/update references from `lightflux-releases` to `LightFlux`.
- Improve the root README for an open-source audience.
- Audit the main repository before changing it from private to public.
- Delete `little1d/lightflux-cli` and `little1d/lightflux-releases` after migration.

### Excluded

- Product feature changes unrelated to repository consolidation.
- Publishing a signed iOS IPA without Apple signing credentials.
- Changing production infrastructure beyond repository/release references.

## Work Items

| ID | Type | Source locator | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| REV-001 | review | User: remove unused local versions and artifacts | Generated package artifacts and obsolete app copies are inventoried and removed without deleting source or user data | Local macOS/iOS Simulator | medium | done |
| FEAT-001 | feature | User: put release and CLI together in LightFlux | CLI source and required release automation/configuration live in the main repository with no live dependency on auxiliary repos | Repository | high | done |
| FEAT-002 | feature | User: improve README.md | Root README clearly explains the product, supported platforms, setup, architecture, verification, and contribution flow without exposing secrets | Repository | medium | done |
| REV-002 | review | User: plans to open-source LightFlux | Current tree and Git history are checked for committed credentials and private-only material; blocking findings are removed or reported | Repository/security | high | done |
| FEAT-003 | feature | User: delete release and CLI remote repos | Required content/releases are preserved or migrated, then both exact GitHub repos are deleted and confirmed absent | GitHub | high | blocked |
| QUESTION-001 | question | User: plans to open-source LightFlux | Decide whether to switch `little1d/LightFlux` to public in this execution after audit | GitHub | high | done |

Allowed status values: `ready`, `in_progress`, `done`, `blocked`, `deferred`.

## Questions And Assumptions

| ID | Kind | Detail | Resolution |
| --- | --- | --- | --- |
| QUESTION-001 | approval boundary | Public visibility exposes the full Git history and is distinct from deleting the two explicitly named auxiliary repositories. | The user's explicit request to open-source LightFlux and use it as the main repository is treated as approval after a clean history audit. |
| QUESTION-002 | assumption | “放在一起” means one GitHub repository while keeping the CLI in an appropriate monorepo subdirectory rather than mixing package files into the app root. | Proceed with the structure that best matches the imported CLI package. |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-29 11:08 | Preserve/migrate before remote deletion. | Remote repository deletion is irreversible and release URLs may be embedded in clients. | `lightflux/src-tauri/tauri.conf.json`; user request. |
| 2026-08-29 11:20 | Keep CLI as a package under `cli/` and preserve its two-commit history with Git subtree. | This creates one repository without mixing independent npm and Expo package roots. | Merge commit `40db32c`; `cli/package.json`. |
| 2026-08-29 11:24 | Standardize the repository on MIT. | The already-public CLI used MIT; one repository should have a clear root license instead of retaining Expo's template `0BSD` metadata. | `LICENSE`, `cli/LICENSE`, `lightflux/package.json`. |
| 2026-08-29 11:26 | Publish updater assets from the main repository with `GITHUB_TOKEN`. | Cross-repository credentials and a dedicated release repository are no longer needed. | `.github/workflows/desktop-release.yml`; main `desktop-v1.0.0` release. |

## Execution Log

### REV-001 - Local artifact cleanup

- Baseline: Five indexed `LightFlux.app` copies are generated under
  `lightflux/src-tauri/target`; `lightflux/artifacts` contains the local macOS
  and Simulator packages; one Simulator install exists. No copy is installed
  in `/Applications` or `~/Applications`. A separate clean CLI clone exists at
  `/Users/bytedance/Desktop/Code/lightflux-cli`.
- Root cause or design: Remove generated application outputs now. Retain the
  separate CLI clone until its source and tests have been migrated and verified.
- Changed files: No tracked source changes; removed `lightflux/artifacts`,
  `lightflux/desktop-dist`, `lightflux/src-tauri/target`, and the Simulator app.
- Verification: Spotlight, filesystem, and `simctl` checks show no generated
  LightFlux application copy remains.
- Review: The separate CLI clone remains until the consolidated branch is pushed.
- Result: Generated package copies removed and roughly 5.8 GB reclaimed.

### FEAT-001 - Repository consolidation

- Baseline: `lightflux-cli` contained two commits and 19 package files;
  desktop updater links and automation targeted `lightflux-releases`.
- Root cause or design: Import CLI history under `cli/`, promote its CI and
  maintainer Skill to repository scope, and use the main repository for
  desktop release assets and updater metadata.
- Changed files: `cli/`, `.github/workflows/cli-ci.yml`,
  `.github/workflows/desktop-release.yml`, `docs/desktop-release.md`,
  `lightflux/src-tauri/tauri.conf.json`, and marketing release links.
- Verification: CLI checks and package dry-run pass; actionlint passes; the
  main `desktop-v1.0.0` release contains all nine signed updater assets and its
  downloaded manifest points only to main-repository URLs.
- Review: Existing installed v1.0.0 clients still point to the old repository,
  but old asset download counts are only 1-3 and the user explicitly requested
  deletion during pre-public rollout.
- Result: Source and release distribution are consolidated.

### FEAT-002 - Public README

- Baseline: Root documentation omitted the CLI and directed users to the
  auxiliary release repository.
- Root cause or design: Present the complete product, monorepo map, honest
  platform status, setup paths, architecture invariants, verification, and
  contribution flow from one entry point.
- Changed files: `README.md`, `LICENSE`, `lightflux/package.json`,
  `lightflux/package-lock.json`, and `cli/README.md`.
- Verification: Local links and commands were checked against current files
  and package scripts; package metadata consistently reports MIT.
- Review: No unsupported mobile-store or completed Workspace API claims remain.
- Result: Public-facing README and licensing are coherent.

### REV-002 - Open-source readiness

- Baseline: Main repository is private; ignored local environments contain
  real credentials and tracked generated DeepWiki metadata contained an
  absolute workstation path.
- Root cause or design: Keep all local env/signing files ignored, normalize
  generated metadata paths, and replace concrete development project/server
  identifiers in current documentation with placeholders.
- Changed files: `.trae/deepwiki/meta.json`, deployment examples, and
  `server/.env.development.example`.
- Verification: Gitleaks scanned 113 commits and found only the documented
  fixed test secret in `server/tests/email-auth.test.mjs`; no real `.env` was
  ever tracked. A worktree scan found real secrets only in ignored
  `server/.env`, confirming they are outside Git.
- Review: No exploitable high or medium security finding was introduced by the
  consolidation diff.
- Result: No credential blocker remains for public visibility.

### FEAT-003 - Retire auxiliary repositories

- Baseline: `little1d/lightflux-cli` and `little1d/lightflux-releases` exist and are public.
- Root cause or design: Delete only after CLI history, release files, updater
  URLs, and publishing automation are proven in the public main repository.
- Changed files: No source change; removed obsolete local CLI clone and deleted
  the now-unused `RELEASES_TOKEN` secret from the main repository.
- Verification: Main repository is public, CI/deploy workflows passed, and all
  migrated release assets are anonymously downloadable.
- Review: GitHub requires the `delete_repo` OAuth scope; the existing token has
  only `gist`, `read:org`, `repo`, and `workflow`.
- Result: Remote deletion is blocked until the owner completes GitHub device
  authorization for `gh auth refresh -h github.com -s delete_repo`.

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |
| FEAT-003 | `gh repo delete little1d/lightflux-cli --yes` | Existing GitHub OAuth token lacks destructive repository scope. | 1/3 | GitHub returned HTTP 403 and explicitly requested `delete_repo`. | Await owner authorization; no repository was deleted. |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd lightflux && npm test` | pending | Client | |
| `cd lightflux && npm test` | pass | Client | 19 files, 100 tests. |
| `cd lightflux && npm run typecheck` | pass | TypeScript | No diagnostics. |
| `cd lightflux && npm run desktop:web` | pass | Web production export | 1,214 modules bundled. |
| `cd server && npm test` | pass | Server | 25 passed, one live PostgreSQL test skipped. |
| `cd cli && npm run check && npm pack --dry-run` | pass | CLI | Five tests; 10-file npm package. |
| `cargo check --manifest-path lightflux/src-tauri/Cargo.toml` | pass with wrapper warning | Desktop | Cargo finished successfully; TRAE reported its shared cache path after completion. |
| `actionlint .github/workflows/*.yml` | pass | GitHub Actions | No findings. |
| Gitleaks Git history scan | pass | 113 commits | One test-fixture false positive; no real credential. |
| Main Release manifest download | pass | Desktop updater | Downloaded manifest matches migrated file and all URLs target `little1d/LightFlux`. |
| GitHub Actions on `f85ce99` | pass | Remote CI/deploy | CLI CI, Server CI, Server Deploy, and Web Deploy succeeded. |
| GitHub auxiliary repository deletion | blocked | Remote state | OAuth token lacks `delete_repo`; interactive owner authorization required. |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |
| FEAT-003 | GitHub rejected repository deletion without the `delete_repo` OAuth scope. | HTTP 403 from `gh repo delete`; `gh auth status` confirms the missing scope. | Run `gh auth refresh -h github.com -s delete_repo`, authorize the device code, then delete and verify both auxiliary repositories. |

## Memory Updates

- Goal record updated: yes.
- Durable `AGENTS.md` lesson: added the single-repository source, CLI, and
  release rule.

## Completion

- Completed items: Local cleanup, CLI/history import, release migration,
  README/license update, open-source audit, public visibility, and CI/deploy.
- Acceptance evidence: Main repository is public; CLI and Release files are
  present; all automated checks passed; old local clone/build artifacts are
  absent.
- Checks not run: No new desktop release was built because no version tag was
  created.
- Residual risk: Existing v1.0.0 clients still reference the old updater
  repository until they install a build containing the new endpoint.
- Final status: Blocked only on GitHub `delete_repo` authorization and deletion
  of the two auxiliary repositories.
