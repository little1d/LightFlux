---
name: "lightflux-autopilot"
description: "Runs a bounded single-agent LightFlux loop from goal documents or mixed bug and feature requests. Invoke for autonomous goal-mode or multi-item product work."
---

# LightFlux Autopilot

Own a mixed product goal from intake through implementation, verification,
review, and memory capture. Use one main agent for the complete loop. Do not
delegate to sub-agents unless the user explicitly requests delegation.

## Bootstrap

Before planning or editing:

1. Read the repository `AGENTS.md` completely.
2. Inspect `git status`, relevant package scripts, current implementation, and
   tests. Preserve unrelated worktree changes.
3. Read every supplied document, PDF page, screenshot, and referenced file.
   Use document or image extraction tools when available; do not ask the user
   to transcribe readable input.
4. Create `.trae/runs/YYYY-MM-DD-<goal-slug>.md` from
   `assets/goal-run-template.md`.

Do not stop after producing a plan. Continue until the completion gate or a
real blocker is reached.

## Intake

Turn the source material into atomic work items:

- `BUG-NNN`: existing behavior contradicts an expectation.
- `FEAT-NNN`: new behavior or product capability.
- `REV-NNN`: explicit code-health investigation.
- `QUESTION-NNN`: a decision that cannot be inferred safely.

Each item must have a source locator, current behavior, expected outcome,
observable acceptance criteria, target platforms, dependencies, risk, and
status. Preserve distinctions between facts, user requirements, and agent
assumptions.

Resolve uncertainty with the least interruption:

- Proceed with a recorded assumption for reversible implementation details.
- Ask one grouped, option-based question when ambiguity changes product
  semantics, privacy, persisted data, or destructive behavior.
- Require approval before destructive migrations, external publishing, paid
  actions, credential use, or irreversible operations.

## Queue Order

Process the smallest ready item in this order:

1. Blocking bugs and data-integrity risks.
2. Enabling domain or architecture changes.
3. User-visible features.
4. Explicit review items.

Avoid unrelated cleanup. A review finding enters the active queue only when it
is high or medium severity, high confidence, and relevant to the current goal.
Record lower-severity ideas as deferred work.

## Dispatch

Read and follow the matching sibling skill before each stage:

- Feature: `../lightflux-feature/SKILL.md`
- Bugfix: `../lightflux-bugfix/SKILL.md`
- Review: `../lightflux-review/SKILL.md`
- Verification: `../lightflux-verify/SKILL.md`
- Memory: `../lightflux-memory/SKILL.md`

For each work item:

1. Mark it `in_progress` in the goal record.
2. Establish evidence for the baseline.
3. Implement with the feature or bugfix skill.
4. Run the verification skill at the item's risk level.
5. Record changed files, decisions, checks, and results.
6. Mark it `done` only when acceptance criteria are demonstrated.
7. Run the memory skill after a verified milestone.

After each coherent batch, run one review pass. Fix qualifying findings,
re-verify, then run one confirmation review. Do not recursively review every
review fix.

## Bounded Repair

Track attempts by failed check and root-cause hypothesis. Allow at most three
evidence-based attempts for the same pair.

An attempt must produce new evidence or test a distinct hypothesis. Repeating
the same command or cosmetic edit is not a new attempt. After the third failed
attempt:

- mark the item `blocked`;
- preserve diagnostics and the smallest reproduction;
- explain the missing decision, environment, or external dependency;
- continue with independent queue items.

Do not create new speculative work merely to keep the loop running.

## Completion Gate

The goal is complete only when:

- every source item is `done`, or explicitly `deferred`/`blocked` with a reason;
- all non-deferred acceptance criteria are demonstrated;
- required automated and runtime checks pass, with unrelated failures clearly
  separated;
- the final review contains no unresolved high or medium findings;
- unrelated user changes remain untouched;
- the goal record and durable memory are current.

Finish with a concise report of delivered behavior, verification evidence,
remaining blockers or deferred items, and the goal record path.
