# Goal Run: Utility Entry And Settings Cleanup

- Status: `complete`
- Source: User screenshot and request, 2026-08-19

## Objective

Separate mobile account/settings access from search and AI controls, remove settings-page redundancy, and prevent global utilities from obscuring page-specific actions.

## Work Items

| ID | Acceptance criteria | Status |
| --- | --- | --- |
| BUG-001 | Trash, calendar, completed, and Milestones do not render global utility controls that can obstruct page actions. | done |
| FEAT-002 | Account opens at the left of the Groups primary workspace; Search and AI share right-side icon-button styling. | done |
| FEAT-003 | Settings no longer includes the redundant keyboard shortcut section or localization keys. | done |

## Decisions

- Mobile account/settings is available from the Groups primary workspace, not every navigation view.
- Search and AI remain on the two primary task workspaces (Today and Groups).
- Utility controls use the common 40px `IconButton` style; violet indicates active state rather than a different control shape.

## Evidence

- Browser at 627px: Groups exposes account, search, and AI; account opens its menu at the left.
- Browser at 627px: Trash exposes only its page actions, with no global utility overlap.
- Browser Settings contains only language and statistics content.
- `cd lightflux && npm test`: pass, 13 files and 70 tests.
- `cd lightflux && npm run typecheck`: pass.
- `cd lightflux && npm run desktop:web`: pass.

## Changed Files

- `lightflux/App.tsx`
- `lightflux/components/GroupsScreen.tsx`
- `lightflux/components/SettingsScreen.tsx`
- `lightflux/components/account/AccountMenu.tsx`
- `lightflux/components/settings/styles.ts`
- `lightflux/content/types.ts`
- `lightflux/content/en/settings/index.ts`
- `lightflux/content/zh/settings/index.ts`

## Residual Risk

- Live iOS/Android rendering remains to be checked in Radon; no device bridge is available in this environment.
