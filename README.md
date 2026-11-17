# LightFlux · 流光

**本地优先的桌面任务工具 · A local-first desktop task manager**

[![License: MIT](https://img.shields.io/badge/license-MIT-6E5BE8.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.1.4-6E5BE8.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933.svg)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-555.svg)](#安装)

[简体中文](#简体中文) · [English](#english)

---

## 简体中文

纯本地桌面任务工具。不需要账号、网络或自建服务器，双击打开就能用。数据保存在你自己的机器上，应用断网也完整可用。

macOS 为首选平台，Windows 次之，Linux 为 best effort。Expo Web 是 Tauri 的共享界面与开发预览，不作为公开网页产品部署。

### 功能

| 模块 | 说明 |
| --- | --- |
| **任务** | 任务与子任务、多 Project、日历视图、今日列表、完成记录、回收站 |
| **Milestone** | 公历、农历、纪念日与生日，支持提醒与置顶 |
| **详情** | 富文本正文、本地图片嵌入，随任务一起备份 |
| **统计** | 基于 `TaskEvent` 的历史统计，不做推测性估算 |
| **备份** | 自动本地快照、手动导出与跨设备恢复 |
| **小光 AI** | 多会话对话页，可查询和修改任务；写操作先预览、确认后才执行，结果可撤销 |
| **CLI 与 Agent** | 通过本机桌面接口读写数据，带版本校验、幂等键、审计与撤销 |

对话模型由你自己配置（OpenAI、DeepSeek 或任意 OpenAI Chat Completions 兼容服务），密钥存在系统凭据库，费用由你的账户承担。

以下**不属于**维护范围：iOS、Android、微信、账号体系、云同步、内置云 AI。

### 安装

桌面安装包发布在 [GitHub Releases](https://github.com/little1d/LightFlux/releases)：

- macOS Apple Silicon / Intel（`.dmg`）
- Windows x64
- Linux x86_64

应用离线可用。启动时会在后台静默检查更新，也可以随时在设置中手动检查。

### 开发

需要 Node.js 22+、Rust 1.82+ 和平台对应的 [Tauri 构建依赖](https://tauri.app/start/prerequisites/)。

```bash
npm --prefix shared ci
npm --prefix lightflux ci

cd lightflux
npx tauri dev            # 桌面应用（热更新）
```

```bash
npm run web              # 浏览器预览共享界面，无需服务端
npm run desktop:web      # 生成纯本地静态资源，不读 .env
npx tauri build          # 打桌面安装包
```

桌面构建不读取 `.env`，也不需要任何环境变量：`desktop:web`、`desktop:dev` 与正式安装包都以 `EXPO_NO_DOTENV=1` 启动，只与本机 loopback API 通信。仓库提供可选的 Dev Container，仅用于启动开发工作区。

### CLI 与 Agent

CLI 与同一份 checkout 的桌面端配合；桌面未运行时它会自动拉起。

```bash
npm --prefix cli ci
npm --prefix cli link

lightflux context --json
lightflux projects --json
lightflux project create "工作计划" --color '#8B7EFF'
lightflux task create "整理计划" --date 2026-09-12 --content "本地备注"
lightflux task list --json
```

不需要 `login`。运行 `lightflux` 可选择默认 Project；未选择时使用保留的 Inbox，Inbox 不可改名或删除。删除 Project 会把其下任务回收至 Inbox，不会丢数据。CLI 从不直接改写数据文件。

参数是严格解析的：写错 flag 会直接报错并给出建议，而不是被静默忽略。设置 `LIGHTFLUX_NO_AUTOSTART=1`（或运行于 CI）可关闭自动启动。

Agent 使用同一份协议，Skill 随仓库分发：

```bash
npx skills@latest add ./ --skill lightflux --global
```

详见 [CLI 文档](cli/README.md)、[本地架构](docs/local-desktop.md) 与 [1.1.3 小光说明](docs/releases/ai-chat.md)。

### 数据与备份

首次启动会把当前 WebView 的 V12 数据迁移到桌面应用数据目录，原 IndexedDB 数据保留。损坏或不支持的数据**不会**被当作空数据覆盖。

- 数据文件：`local-state-v12.json`
- `backups/`：保留最近 30 次变更前的快照
- 设置中可导出 JSON 备份，在其他设备上手动恢复

> **只存在云端、尚未同步到本机的数据不会自动下载。** 旧服务器与数据未删除；停服前必须另行导出、核对任务及附件。旧任务的远程图片链接不会自动转成本地文件，需要重新导入；新插入的图片会嵌入任务内容，随备份一起保存。

### 仓库结构

| 路径 | 用途 |
| --- | --- |
| `lightflux/` | 共享界面与 Tauri 桌面应用 |
| `shared/` | 不依赖网络与数据库的任务、Project、Milestone 规则 |
| `cli/` | 本机 CLI |
| `skills/lightflux/` | Agent Skill |
| `server/`、`deploy/` | 归档的云服务与恢复工具，不是桌面运行依赖 |

### 验证

```bash
npm --prefix lightflux test
npm --prefix lightflux run typecheck
npm --prefix lightflux run desktop:web
npm --prefix cli run check
cargo check --manifest-path lightflux/src-tauri/Cargo.toml
cargo test  --manifest-path lightflux/src-tauri/Cargo.toml
```

云服务的自动部署已停止。

---

## English

A fully local desktop task manager. No account, no network, no server of your own — open it and work. Your data stays on your machine, and the app remains fully usable offline.

macOS is the primary platform, Windows secondary, and Linux best effort. Expo Web is the shared UI and development preview for Tauri; it is not deployed as a public web product.

### Features

| Area | What you get |
| --- | --- |
| **Tasks** | Tasks and subtasks, multiple Projects, calendar view, today list, completion history, trash |
| **Milestones** | Gregorian and lunar dates, anniversaries and birthdays, reminders and pinning |
| **Details** | Rich-text bodies with embedded local images, carried along by backups |
| **Statistics** | History derived from `TaskEvent`, never guessed |
| **Backups** | Automatic local snapshots, manual export, restore on another machine |
| **Xiaoguang AI** | Multi-conversation chat that can read and change tasks; writes are previewed and confirmed before they run, and every result can be undone |
| **CLI and agents** | Read and write through the local desktop API with version checks, idempotency keys, audit and undo |

You bring your own chat model (OpenAI, DeepSeek, or any OpenAI Chat Completions compatible service). Keys live in the system credential vault, and usage is billed to your own account.

Explicitly **out of scope**: iOS, Android, WeChat, accounts, cloud sync, and built-in hosted AI.

### Install

Desktop builds are published on [GitHub Releases](https://github.com/little1d/LightFlux/releases):

- macOS Apple Silicon and Intel (`.dmg`)
- Windows x64
- Linux x86_64

The app works offline. It checks for updates quietly in the background at startup, and you can check manually from Settings at any time.

### Development

Requires Node.js 22+, Rust 1.82+, and the platform [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm --prefix shared ci
npm --prefix lightflux ci

cd lightflux
npx tauri dev            # desktop app with hot reload
```

```bash
npm run web              # browser preview of the shared UI, no server
npm run desktop:web      # produce local-only static assets, ignores .env
npx tauri build          # build a desktop installer
```

Desktop builds read no `.env` and need no environment variables: `desktop:web`, `desktop:dev` and release builds all start with `EXPO_NO_DOTENV=1` and talk only to their own loopback API. An optional Dev Container starts the development workspace only.

### CLI and agents

The CLI works with a desktop build from the same checkout, and launches it on demand.

```bash
npm --prefix cli ci
npm --prefix cli link

lightflux context --json
lightflux projects --json
lightflux project create "Work" --color '#8B7EFF'
lightflux task create "Draft the plan" --date 2026-09-12 --content "Local note"
lightflux task list --json
```

There is no `login`. Running `lightflux` lets you pick a default Project; without one it uses the reserved Inbox, which cannot be renamed or deleted. Deleting a Project returns its tasks to the Inbox instead of discarding them. The CLI never rewrites data files directly.

Flags are parsed strictly: a mistyped flag is an error with a suggestion, not something silently ignored. Set `LIGHTFLUX_NO_AUTOSTART=1` (or run in CI) to disable auto-launch.

Agents speak the same protocol, and the Skill ships with the repository:

```bash
npx skills@latest add ./ --skill lightflux --global
```

See the [CLI documentation](cli/README.md), the [local architecture notes](docs/local-desktop.md), and [the 1.1.3 Xiaoguang notes](docs/releases/ai-chat.md).

### Data and migration

On first launch, V12 data from the current WebView is migrated into the desktop app data directory; the original IndexedDB data is left in place. Corrupt or unsupported data is **never** silently replaced with an empty state.

- Data file: `local-state-v12.json`
- `backups/`: snapshots from the 30 most recent changes
- Export a JSON backup from Settings and restore it manually on another machine

> **Data that exists only in the cloud and never synced to this machine is not downloaded automatically.** The old server and its data have not been deleted; before shutting it down you must export and reconcile tasks and attachments separately. Remote image URLs in older tasks are not converted to local files and need re-importing; newly inserted images are embedded in the task body and travel with the backup.

### Repository layout

| Path | Purpose |
| --- | --- |
| `lightflux/` | Shared UI and the Tauri desktop app |
| `shared/` | Task, Project and Milestone rules with no network or database |
| `cli/` | The local CLI |
| `skills/lightflux/` | Agent Skill |
| `server/`, `deploy/` | Archived cloud service and recovery tooling; not a runtime dependency of the desktop app |

### Verifying a change

```bash
npm --prefix lightflux test
npm --prefix lightflux run typecheck
npm --prefix lightflux run desktop:web
npm --prefix cli run check
cargo check --manifest-path lightflux/src-tauri/Cargo.toml
cargo test  --manifest-path lightflux/src-tauri/Cargo.toml
```

Automatic deployment of the cloud service has been stopped.

---

[MIT License](LICENSE)
