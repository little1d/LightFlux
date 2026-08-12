---
name: "lightflux-memory"
description: "Maintains durable LightFlux lessons in AGENTS.md and execution evidence in goal records. Invoke before work for context and after verified milestones or failed repair loops."
---

# LightFlux Memory

Keep future agents consistent without turning long-term context into a task
log. Memory has two layers with different retention rules.

## Read Before Work

1. Read the repository `AGENTS.md` completely.
2. Read the active `.trae/runs/<goal>.md` when one exists.
3. Search existing lessons before adding a new rule.
4. Treat source and tests as authoritative when memory conflicts with current
   implementation. Correct stale memory after verifying the new fact.

## Execution Memory

The active goal record is the audit trail. Store:

- source locators and acceptance criteria;
- assumptions and user decisions;
- item status and dependency changes;
- hypotheses, attempts, and evidence;
- changed files;
- exact verification commands and results;
- blockers and deferred work.

Update it after each item or meaningful attempt, not only at the end.

## Durable Memory

Write to `AGENTS.md` only when all are true:

- the lesson is supported by source, a reproduction, or a passing regression
  test;
- it is likely to affect future tasks;
- it describes a constraint, invariant, convention, recurring failure mode, or
  required verification path;
- it can be stated as an actionable rule;
- it is not already represented.

Good durable memories include migration requirements, platform interaction
constraints, ownership boundaries, and a proven reason a tempting approach
fails. Task completion, file lists, transient ports, speculative ideas, raw
logs, and one-off implementation details belong only in the goal record.

## Write Procedure

1. Update an existing rule when possible.
2. Otherwise append one entry under `## Learned Lessons`:

```markdown
### YYYY-MM-DD - Short title
- Context: Where the recurring issue appeared.
- Rule: The behavior future agents must preserve.
- Evidence: Source paths and checks that proved the rule.
```

3. Keep the rule concise and independent of the current conversation.
4. Link evidence by repository-relative path and test name where useful.
5. Never store secrets, credentials, personal task content, full prompts,
   screenshots, or private API responses.

## Loop Prevention

Failed attempts are tracked in the goal record by check and hypothesis. Promote
a failure to durable memory only after the root cause is proven and the lesson
would prevent a future recurrence.

If memory caused a wrong decision, record the correction and replace the stale
rule. Do not keep contradictory entries for historical completeness; the goal
record already provides history.
