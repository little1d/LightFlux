# Goal Run: Screen component split

- Status: `complete`
- Source: User-requested prioritized refactor
- Started: 2026-08-12
- Updated: 2026-08-12

## Objective

Split `StatisticsScreen`, `SettingsScreen`, and `GroupsScreen` into focused
feature modules without changing product behavior, persisted state, or public
screen contracts.

## Batches

| Batch | Before | After | Extracted ownership |
| --- | ---: | ---: | --- |
| Statistics | 1,156 lines | 278 lines | charts, insights, formatters, primitives, styles |
| Settings | 1,044 lines | 156 lines | reusable controls, desktop/macOS sections, styles |
| Groups | 1,043 lines | 159 lines | controller hook, group card, task rows, shared types |

## Architecture Decisions

- Screen entry files keep navigation props and page composition.
- Zustand subscriptions and mutations stay in controller or feature-boundary
  modules, not in presentational statistics or row components.
- Existing store APIs, persistence schema, animation durations, responsive
  breakpoints, task drag scopes, and keyboard behavior remain unchanged.
- Static style maps may remain large when they contain no behavior or state.

## Verification

| Check | Result |
| --- | --- |
| `cd lightflux && npm test` | pass, 12 files and 61 tests |
| `cd lightflux && npm run typecheck` | pass |
| `cd server && npm test` | pass, 12 tests |
| `cd lightflux && npx expo export --platform all` | pass for Web, iOS, Android |
| Groups runtime | pass: collapse/expand, inline edit, detail sync, value restored |
| Settings runtime | pass: language select opens/closes, statistics entry works |
| Statistics runtime | pass: range switches from 30 days to 7 days and charts rerender |
| Narrow viewport | pass at 752 CSS px |
| Fresh browser console | no new errors; existing RN Web shadow deprecation only |

## Residual Coverage

- Browser tooling could not resize its fixed 752 CSS px viewport to the
  desktop breakpoint. Desktop code paths were covered by TypeScript and
  production Web/iOS/Android exports; no Tauri/Rust source changed.
