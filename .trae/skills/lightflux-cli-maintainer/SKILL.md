---
name: "lightflux-cli-maintainer"
description: "Maintains the LightFlux CLI and bundled Agent Skills. Invoke when changing commands, API contracts, Skill packaging, installation, or release behavior."
---

# LightFlux CLI Maintainer

Keep this repository independent from the private LightFlux UI and server
implementation.

## Boundaries

- Treat the public Workspace API contract under `server/` as authoritative.
- Do not import client components, database repositories, or internal server
  modules into the CLI package even though they share this repository.
- Keep credentials out of config files, logs, fixtures, and Skills.
- Put Agent guidance in `cli/skills/lightflux/`; put deterministic behavior in
  `cli/src/`.
- A Skill must call the CLI rather than construct API requests itself.

## Changes

1. Update types and API behavior before commands.
2. Keep commands scriptable with stable JSON output.
3. Add focused tests for config, installation, and API errors.
4. Run `cd cli && npm run check && npm pack --dry-run`.
5. Verify that the package contains `src/` and `skills/`, but no credentials
   or development fixtures.

Workspace and task mutations must preserve expected-version, idempotency,
audit, and human-confirmation boundaries.
