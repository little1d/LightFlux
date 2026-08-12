---
name: "lightflux-feature"
description: "Designs and implements LightFlux features from descriptions, screenshots, or product references. Invoke for feature requests, UX enhancements, or competitor-inspired flows."
---

# LightFlux Feature Enhancement

Translate product intent into a native LightFlux feature, implement it, and
prove the result. A reference product is evidence about a problem and
interaction model, not a specification to copy blindly.

## Establish Intent

1. Read `AGENTS.md`, the goal record when present, and the complete relevant
   implementation path.
2. Inspect supplied screenshots at full detail. Extract:
   - information hierarchy and primary user job;
   - layout, density, spacing, typography, and visual states;
   - entry, exit, keyboard, pointer, touch, and error interactions;
   - responsive behavior and states not visible in the image.
3. Separate what the user explicitly requested from inferred behavior.
4. Write observable acceptance criteria before editing.

Ask for clarification only when hidden behavior affects product semantics,
persisted data, privacy, or an irreversible decision. For reversible visual
details, follow existing LightFlux patterns and record the assumption.

## Design Fit

- Inspect neighboring components, design tokens, primitives, store actions,
  service boundaries, platform-specific files, and tests before introducing a
  new pattern.
- Keep domain behavior independent from rendering. Put shared rules in
  domain/store/service modules and platform differences at the edge.
- Preserve local-first behavior, autosave expectations, event logging, schema
  migration safety, and AI confirmation/audit constraints.
- Reuse existing components when they meet the interaction and visual bar.
  Add an abstraction only when it removes real duplication or complexity.
- Define loading, empty, error, disabled, focus, hover, pressed, and narrow
  states when relevant.
- Keep compact layouts information-dense and accessible. Use the established
  violet accent and avoid raw platform-default styling.

## Implement

1. Make the smallest coherent end-to-end change.
2. Add or update domain and persistence behavior before wiring UI when data
   shape changes.
3. Add migration and compatibility tests for persisted schema changes.
4. Add focused regression tests for business logic.
5. Adapt Web, iOS/Android, and Tauri surfaces according to actual impact.
6. Preserve unrelated worktree changes and avoid generated-file churn unless
   the source change requires regeneration.

## Demonstrate

Follow `../lightflux-verify/SKILL.md`.

For visible work, exercise the real flow with browser automation when
available. Check at least the intended desktop width and the narrowest relevant
layout. Compare the rendered result against acceptance criteria, including
focus, keyboard, pointer/touch, and persistence behavior.

Record:

- the user outcome delivered;
- assumptions and product decisions;
- changed files;
- automated checks and runtime paths;
- known platform gaps.

Do not mark the feature complete based only on static code inspection.
