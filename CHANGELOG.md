# Changelog

Notable user-facing changes are recorded here. Release entries are concise and
written for people using LightFlux rather than for repository maintainers.

## [Unreleased]

## [1.1.4] - 2026-10-08

### Added

- Tasks can include an optional time across details, lists, calendar views,
  AI actions, and the CLI.

### Changed

- Desktop releases remove standalone updater signature files after validating
  that the signatures are embedded in `latest.json`.
- New tasks start as all-day tasks; time can be added later from a half-hour
  selection menu.
- Task rows no longer show a redundant generic icon for ordinary note content.

### Fixed

- Using Quick Add from the macOS menu bar no longer crashes the application.

## [1.1.3] - 2026-10-06

### Added

- Added Xiaoguang, a multi-conversation AI assistant with streaming Markdown
  replies and OpenAI-compatible model configuration.
- Xiaoguang can search and manage local tasks through preview, confirmation,
  durable persistence, audit, and undo flows.

### Changed

- Desktop API keys are stored in the system credential vault and cached only
  for the current process to avoid repeated system prompts.
- Development builds now use an isolated app identity, data directory, and
  credential namespace so they can run beside the installed app.
- Simplified the conversation sidebar by removing search.

### Security

- Only the selected conversation and explicitly approved task results are sent
  to the configured model service.
