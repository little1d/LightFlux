# LightFlux Agent Workflows

## Repository Setup

```bash
npx lightflux
lightflux context --json
```

The repository may contain `.lightflux/config.json` with Workspace and Project
IDs, but credentials must remain in the operating-system credential store or
the `LIGHTFLUX_TOKEN` environment variable.

## Read Before Write

```bash
lightflux task show <task-id> --json
```

Use the returned task version for every mutation. If the server reports a
conflict, read the latest task and decide whether the intended change still
applies.

## Claim And Report Progress

```bash
lightflux task start <task-id>
lightflux task comment <task-id> --message "Implemented the parser; tests pending."
```

Do not emit routine narration. Comments should describe decisions, blockers,
or evidence another collaborator needs.

## Complete With Evidence

```bash
lightflux task complete <task-id> \
  --evidence commit:<sha> \
  --evidence check:"npm test"
```

Completion evidence should be specific and verifiable. Report checks that
actually ran and keep blocked or deferred work explicit.

## Mutation Policy

- Read operations may run without confirmation.
- Task edits within the selected Project may run with the granted scope.
- Bulk edits require a preview.
- Project deletion, membership, credential, and Workspace settings always
  require explicit human confirmation.
- Every mutation must carry an idempotency key and expected entity version.

The task commands above become available with the LightFlux 0.1.1 Workspace
API. Until then, the Skill is limited to installation and context guidance.
