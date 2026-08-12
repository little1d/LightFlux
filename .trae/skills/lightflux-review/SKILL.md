---
name: "lightflux-review"
description: "Reviews LightFlux code for correctness, regressions, security, and maintainability, then fixes proven issues. Invoke for code review, health checks, or autopilot quality passes."
---

# LightFlux Review And Repair

Review as a defect-finding exercise, not a style narration. For proven,
in-scope issues, move directly from finding to focused repair and verification.

## Define Scope

1. Read `AGENTS.md`, `git status`, and the goal record when present.
2. Determine the baseline:
   - user-specified files or subsystem;
   - current diff for change review;
   - relevant call paths and tests for repository health review.
3. Do not treat unrelated dirty-worktree edits as yours or revert them.
4. Read implementation, callers, persistence boundaries, platform variants,
   and tests before reaching a conclusion.

## Review Order

Prioritize:

1. Data loss, corruption, privacy, security, and destructive behavior.
2. Incorrect state transitions, stale data, races, and failed rollback.
3. Persistence migration and backward compatibility.
4. Cross-platform and responsive regressions.
5. Missing error, loading, focus, keyboard, and accessibility behavior.
6. Performance problems on realistic task volumes.
7. Maintainability only when it creates a concrete correctness or change-risk
   problem.

Ignore subjective style preferences already handled by formatters unless they
hide a defect.

## Evidence Standard

Every finding must include:

- severity: `high`, `medium`, or `low`;
- confidence and concrete failure mode;
- source file and line range;
- reproduction, counterexample, or violated invariant;
- smallest appropriate repair;
- missing regression coverage.

Do not report speculative possibilities as findings. Test the hypothesis or
label it as an open question.

## Repair Policy

- Immediately fix high and medium findings when confidence is high, scope is
  clear, and the change is reversible.
- Add a regression test before or with the fix.
- Ask before destructive migrations, product-semantic changes, broad
  rewrites, or fixes that conflict with user work.
- Record low findings as deferred unless they are trivial, adjacent, and carry
  negligible regression risk.
- Do not refactor unrelated code while repairing a finding.

After repair, follow `../lightflux-verify/SKILL.md`, then run one confirmation
review of the changed path. Do not recursively review confirmation fixes.

## Output

Lead with unresolved findings ordered by severity and grounded in file
references. Then state fixes applied, tests run, and residual risk. If no
findings remain, say so explicitly and identify any test or platform coverage
that was not available.
