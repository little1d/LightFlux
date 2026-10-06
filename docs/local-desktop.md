# Local Desktop

## Runtime

LightFlux is a local desktop product. Expo renders the Tauri UI; it is not a
hosted Web service. Startup does not restore a cloud session or poll a server.
The built-in hosted AI entry is removed; external agents use the local CLI.
Update checks are manual and optional.

## Data

Application data directories:

| OS | Directory |
| --- | --- |
| macOS | `~/Library/Application Support/com.little1d.lightflux/` |
| Windows | `%APPDATA%/com.little1d.lightflux/` |
| Linux | `$XDG_DATA_HOME/com.little1d.lightflux/`, default `~/.local/share/` |

- `local-state-v12.json`: current task data and local automation journal.
- `backups/lightflux-auto-*.json`: last 30 pre-change snapshots, in the importable backup envelope.
- `local-api.json`: per-launch loopback URL/token; private, never commit or share.

Writes are serialized, flushed to disk and atomically renamed. An existing
state is backed up before replacement. Unchanged content does not rotate backups.
On Unix, the application data directory is mode 0700 and new files are 0600.
Use Settings to export and import a versioned JSON backup.

The first local-only launch copies existing V12 IndexedDB data into the desktop
file without deleting the source. Existing credentials and sync metadata remain
untouched for recovery. Unsupported or corrupt local snapshots stop writes
instead of being replaced with an empty workspace.

CLI mutations run in the same desktop store as UI edits. Persisted
`localAutomation.version = 1` contains audit, replay responses, comments and a
single latest undo snapshot; older V12 data without this extension is accepted.
Do not reopen a local-only file in an older cloud-capable binary: older readers
do not understand the automation extension.

New raster images are embedded as data URLs (8 MB maximum per image), so backups
carry their bytes. This increases backup size; keep independent copies outside
the machine. Existing HTTP image references are preserved, not downloaded
automatically. Replace them with local image imports before retiring their host.

## Cloud Retirement

No more DNS/Tunnel configuration is needed for desktop use. Automatic server
deployment and hosted Web deployment are disabled. Legacy server source and
recovery tooling remain available, but are not installed or started by the
desktop.

Before deleting a server or account:

1. Export the latest cloud snapshot through an authorized recovery path.
2. Keep the original export and attachments as an independent backup.
3. Compare task, Project, Milestone and attachment counts against the desktop.
4. Import deliberately through desktop Settings; restore replaces current data.
5. Verify offline use and a restore on another profile before stopping services.

This refactor does not contact or delete cloud data. Remote-only edits may be
missing from the local cache. Temporary system hosts overrides from previous
cloud setup are outside the application and should be removed separately.

## Verification

For live development, run `npm run desktop:dev` from `lightflux/`. It opens
**LightFlux Dev** with the `com.little1d.lightflux.dev` identifier and separate
data and AI credentials. The installed stable app can remain running.

Keep that terminal running while using the development window. The command
starts both the desktop process and its frontend at `http://localhost:1420`.
Opening `target/debug/lightflux-desktop` alone does not start the frontend;
without the service, the window can be blank. If this happens, quit only
LightFlux Dev and restart it with `npm run desktop:dev`.

For a standalone test bundle, use an isolated application identifier:

```bash
cd lightflux
npx tauri build --debug --bundles app \
  --config '{"identifier":"com.little1d.lightflux.local-test","productName":"LightFlux Local Test"}'
```

Point `LIGHTFLUX_DESKTOP_DATA_DIR` to that application's data directory for CLI
checks. Test startup, task/subtask/Milestone/content, Project
create/rename/color/reorder/delete with task rehoming, stale versions, replay,
audit/undo, reload, backup import, and forbidden Origin/Host requests.

When the desktop is not running (or its descriptor is stale), the CLI launches
the installed app and polls until the loopback API answers. Automated runs set
`LIGHTFLUX_NO_AUTOSTART=1` (CI environments also opt out) so no GUI is started.
