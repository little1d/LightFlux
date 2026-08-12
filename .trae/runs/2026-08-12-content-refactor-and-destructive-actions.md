# Goal Run: Content refactor and destructive actions

- Status: `complete`
- Source: User architecture review and two bug reports
- Started: 2026-08-12
- Updated: 2026-08-12

## Objective

Split localized UI content by language and page, remove duplicated task-domain
logic, and restore destructive trash and group actions.

## Findings And Resolution

| Severity | Finding | Root cause | Resolution |
| --- | --- | --- | --- |
| high | Permanent delete, empty trash, and delete group could do nothing | Web/Tauri confirmation depended on optional `globalThis.confirm` and returned when unavailable | Added shared in-app `ConfirmationProvider` and migrated all confirmation callers |
| medium | UI content was a 1,182-line bilingual file with desktop strings embedded in components | Locale and page ownership were not represented in the file layout or type boundary | Added typed `content/{zh,en}/{page}/index.ts` modules and moved desktop strings into content |
| medium | Agent task execution duplicated task tree ordering, traversal, and restore rules | Command executor maintained private copies of store domain algorithms | Reused `todoDomain` exports from the Agent executor |

## Verification

| Check | Result |
| --- | --- |
| `cd lightflux && npm test` | pass, 12 files and 61 tests |
| `cd lightflux && npm run typecheck` | pass |
| `cd server && npm test` | pass, 12 tests |
| `cd lightflux && npm run desktop:web` | pass |
| `cd lightflux && npx expo export --platform all` | pass for Web, iOS, and Android |
| Desktop browser delete group | pass: cancel preserves group; confirm removes group |
| Desktop browser permanent task delete | pass: confirmation shown, item removed, reload preserves deletion |
| Desktop browser empty trash | pass: confirmation shown; cancel preserves existing user trash |
| Chinese/English settings switch | pass and restored to Chinese |
| Browser console | no new runtime errors |

## Deferred Refactors

- `StatisticsScreen`, `SettingsScreen`, `GroupsScreen`, `App`, and the Agent
  adapter/panel remain large. Split them by feature sections only with dedicated
  behavior tests; broad file surgery is not coupled to this bug fix.
- Use MDX only for long-form help, onboarding, or release content. Runtime
  labels and formatter functions remain typed TypeScript content.
