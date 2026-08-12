---
name: "lightflux-bugfix"
description: "Diagnoses and fixes LightFlux defects from reports, screenshots, or failing behavior. Invoke for bugs, regressions, broken interactions, or UX behavior that feels wrong."
---

# LightFlux Bugfix

Fix the demonstrated defect at its root, protect it with a regression check,
and verify the user's actual workflow.

## Build The Case

1. Read `AGENTS.md`, the goal record when present, `git status`, and the
   relevant source and tests.
2. Inspect supplied screenshots in detail. Treat annotations, cursor position,
   scroll state, viewport, selected item, and platform chrome as evidence.
3. Write:
   - expected behavior;
   - observed behavior;
   - platform and viewport;
   - smallest known reproduction;
   - impact and likely regression boundary.
4. Reproduce before editing when the environment permits. Capture runtime
   errors, console output, network failures, state transitions, or a failing
   test.

If static inspection does not distinguish plausible causes, gather runtime
evidence before choosing a fix. Do not patch several guesses at once.

## Diagnose

Maintain a short evidence table in the goal record:

| Hypothesis | Supporting evidence | Contradicting evidence | Next probe |
| --- | --- | --- | --- |

Trace the full path that owns the behavior:

- input and gesture;
- component state;
- store/domain mutation;
- persistence or API boundary;
- platform adapter;
- rendered output.

Choose the narrowest root cause that explains all observed evidence. Check
whether an existing uncommitted edit overlaps the same code and work with it.

## Fix

1. Add a failing regression test first when the behavior can be expressed at a
   stable domain, service, or component boundary.
2. Apply the smallest coherent fix at the owning layer.
3. Preserve data compatibility and cross-platform behavior.
4. Avoid timeout-based or platform-specific workarounds unless the platform
   contract requires them and the reason is documented.
5. Add a concise comment only where the constraint is otherwise non-obvious.

## Verify

Follow `../lightflux-verify/SKILL.md`.

At minimum:

- prove the original reproduction now passes;
- run the focused regression test;
- test an adjacent negative or boundary case;
- check affected platforms and narrow layouts;
- confirm persistence after reload when stored state is involved.

Use the bounded-repair rule from the autopilot skill: no more than three
evidence-based attempts for the same failed check and root-cause hypothesis.

Record root cause, evidence, fix, regression coverage, and any residual risk.
Do not close a bug merely because the symptom disappeared once.
