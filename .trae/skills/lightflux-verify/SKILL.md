---
name: "lightflux-verify"
description: "Selects and runs risk-based LightFlux tests, builds, and runtime checks. Invoke after code changes, during bugfixes, or before an autonomous goal is completed."
---

# LightFlux Verification

Produce evidence that the changed behavior works without overstating coverage.
Run focused checks first for fast feedback, then broaden according to risk.

## Select The Matrix

| Change | Required checks |
| --- | --- |
| TypeScript domain/store/service | Focused Vitest file, full `npm test`, `npm run typecheck` |
| Persisted schema or migration | Migration/domain tests, full frontend tests, typecheck, reload with representative older data |
| React Native/Web UI | Typecheck, relevant tests, browser workflow at desktop and narrow widths |
| Tiptap editor source/extensions | Editor build, typecheck, affected runtime flow |
| Node server | Focused Node test when possible, full server test suite |
| Tauri/Rust | Cargo check plus affected desktop runtime flow |
| Cross-layer or release-critical | All affected suites and the relevant production build/export |

Use these repository commands:

```bash
cd lightflux && npm test
cd lightflux && npm run typecheck
cd lightflux && npm run desktop:web
cd lightflux && npm run editor:build
cd server && npm test
./scripts/use-rust-env.sh cargo check --manifest-path lightflux/src-tauri/Cargo.toml
```

Do not run expensive unrelated builds by habit. Do broaden verification for
shared state, persistence, schema, authentication, Agent execution, or
cross-platform code.

## Runtime Verification

For visible or interaction changes:

1. Start only the required services. The normal Web and API ports are `8081`
   and `8787`; detect and reuse an existing healthy process before starting
   another.
2. Use browser automation when available.
3. Exercise the real entry point and complete workflow, not a synthetic
   component-only page.
4. Check desktop and relevant narrow layouts, keyboard and pointer/touch paths,
   focus behavior, errors, empty states, and persistence after reload.
5. Inspect console and network failures.

Static inspection alone is not a visual or interaction pass when a runnable
environment is available.

## Failure Handling

Classify each failure as:

- caused by the current change;
- pre-existing and reproducible on the baseline;
- environment or dependency blocked;
- not yet classified.

Fix change-caused failures. Do not alter unrelated behavior merely to turn a
pre-existing check green. Capture the command, important output, and evidence
for blocked checks.

Use a maximum of three evidence-based repair attempts for the same failed check
and root-cause hypothesis.

## Record

Append to the goal record:

- exact command or runtime path;
- pass, fail, or blocked;
- relevant output summary;
- platforms and viewport sizes covered;
- checks not run and why.

Never write “all tests pass” unless every test claimed was actually run.
