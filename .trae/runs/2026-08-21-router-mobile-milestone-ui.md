# Goal Run: Router Mobile And Milestone UI

- Status: `complete`
- Source: User-reported UI and routing defects, 2026-08-21
- Started: 2026-08-21
- Updated: 2026-08-21

## Objective

Make routed narrow layouts consistent and authenticated, give login a real
route, restore full-height milestone behavior, improve milestone creation, and
document the database migration workflow.

## Work Items

| ID | Acceptance criteria | Status |
| --- | --- | --- |
| BUG-001 | Milestones owns the available routed content height at desktop and narrow widths. | completed |
| BUG-002 | Signed-out startup renders only `/login`; no navigation, FAB, search, or Agent controls exist underneath. | completed |
| BUG-003 | Login is addressable at `/login`; successful/local continuation and auxiliary-page back actions return to `/today`. | completed |
| BUG-004 | Narrow primary routes share one utility header and omit redundant page titles. | completed |
| FEAT-005 | Milestone creation has clearer hierarchy, polished states, and a short entry transition. | completed |
| DOC-006 | Server docs explain forward-only migrations, current versions, and development-stage reset/squash boundaries. | completed |

## Runtime Baseline

- Viewport: Web 556x781 and 720x781.
- `/milestones` rendered its root through NativeWind `className` flex rules.
- Signed-out UI was an absolute sibling painted after an already mounted app
  shell.
- Mobile utilities were restricted to Today and Groups and absolutely
  positioned over route content.
- Milestone editor was one uniform card without entry motion or clear visual
  sections.

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| Browser narrow routes | pass | `/login`, `/today`, `/groups`, `/completed`, `/calendar`, `/milestones`, and `/statistics` at 556x781. |
| Browser desktop milestones | not run | Browser fixture remained narrow; production Web export and shared type/tests passed. |
| `cd lightflux && npm test` | pass | 16 files, 88 tests. |
| `cd lightflux && npm run typecheck` | pass | No TypeScript errors. |
| `cd lightflux && npm run desktop:web` | pass | Expo Router Web export completed. |
| `cd server && npm test` | pass | 23 passed; 1 live PostgreSQL test skipped by environment. |

## Runtime Evidence

- `/milestones` filled the 556x781 viewport (`bodyHeight` and `rootHeight`
  both 781) and kept its bottom navigation fixed.
- A fresh `127.0.0.1` origin entering `/today` redirected to `/login`;
  `hasFab`, `hasSearch`, and `hasAgent` were all false.
- A local session entering `/login` rendered only the authentication workspace;
  cancel returned to `/today`.
- Statistics back returned to `/today`.
- Groups, Completed, Calendar, and Milestones omitted their redundant narrow
  page titles while settings, search, and Agent remained available.
- The milestone editor rendered its icon/color identity, grouped controls,
  selected-color checkmark, and scrollable 1269px content within a 722px
  viewport after the 170ms entrance transition.

## Root Causes And Decisions

- The old signed-out screen was only an absolute sibling over a fully mounted
  app shell. Authentication now returns before the shell is created.
- Milestones still depended on NativeWind root flex classes after the router
  migration. Its root, safe area, and scroll viewport now own explicit flex.
- Mobile utilities were route-specific overlays. The routed shell now exposes
  them consistently on the six primary routes, while pages reserve their space.
- `/today` is the primary post-authentication, index, login-cancel, and
  auxiliary-back destination.

## Completion

- Changed source: router shell/routes, five narrow page surfaces, milestone
  editor, server README, and the updated durable shell rule in `AGENTS.md`.
- Residual risk: desktop-width browser visuals were not exercised in the fixed
  browser fixture; no desktop-only component behavior was changed beyond the
  shared route defaults and explicit milestone flex chain.
- Final status: complete.
