# LightFlux · 流光

纯本地桌面任务工具。无需账号、网络或自建服务器，打开即可使用。

macOS 为首选平台，Windows 次之，Linux 为 best effort。Expo Web 只是 Tauri
的共享界面和开发预览，不再部署公开网页产品。

## 能力

- **任务与 Project**：任务、子任务、Project、日历、完成列表和回收站。
- **Milestone**：公历、农历、纪念日和提醒。
- **详情与统计**：富文本详情、本地图片，历史统计基于 `TaskEvent`。
- **备份**：自动本地备份、手动导出和恢复。
- **CLI 与 Agent**：通过本机桌面接口操作数据，支持版本校验、幂等、审计和撤销。

以下内容不属于维护范围：iOS、Android、微信、账号、云同步和内置云 AI。

## 安装

桌面安装包发布在
[GitHub Releases](https://github.com/little1d/LightFlux/releases)。
应用离线可用；启动时会在后台静默检查更新，也可以随时在设置中手动检查。

## 开发

需要 Node.js 22+、Rust 1.82+ 和平台对应的 Tauri 构建依赖。

```bash
npm --prefix shared ci
npm --prefix lightflux ci
cd lightflux
npx tauri dev            # 桌面应用
```

```bash
npm run web              # 共享界面预览，无需服务端
npm run desktop:web      # 纯本地静态资源，不读 .env
npx tauri build          # 桌面安装包
```

桌面构建不读取 `.env`，也不需要任何环境变量：`desktop:web`、`desktop:dev`
和正式安装包都以 `EXPO_NO_DOTENV=1` 启动，只与它自己的 loopback API 通信。
可选 Dev Container 仅启动开发工作区。

## CLI 与 Agent

CLI 和使用同一 checkout 的桌面端配合；桌面未运行时会自动启动它。

```bash
npm --prefix cli ci
npm --prefix cli link
lightflux context --json
lightflux projects --json
lightflux project create "工作计划" --color '#8B7EFF'
lightflux task create "整理计划" --date 2026-09-12 --content "本地备注"
```

不需要 `login`。运行 `lightflux` 可选择默认 Project，未选择时使用保留的
Inbox，Inbox 不可改删。删除 Project 会将其下任务回收至 Inbox，不会丢弃数据。
CLI 从不直接改写数据文件；`LIGHTFLUX_NO_AUTOSTART=1`（或 CI 环境）可关闭
自动启动。

Agent 使用同一份协议，Skill 随仓库分发：

```bash
npx skills@latest add ./ --skill lightflux --global
```

详见 [CLI 文档](cli/README.md) 与 [本地架构](docs/local-desktop.md)。
公开仓库的安装命令只在这些变更发布后才具备同样的本地能力，旧安装包不会
自动变成本地版。

## 数据与迁移

首次启动会把当前 WebView 的 V12 数据迁移到桌面应用数据目录，原 IndexedDB
数据保留。损坏或不支持的数据不会被当成空数据覆盖。

- 当前数据文件：`local-state-v12.json`
- `backups/`：保留最近 30 次变更前的快照
- 通过设置导出 JSON 备份，可在其他设备上手动恢复

**只存在云端、尚未同步到这台设备的数据不会自动下载。** 旧服务器与数据未删除；
停服前必须另行导出、核对任务及附件。旧任务的远程图片链接不会自动变成本地文件，
需要重新导入；新插入的图片会嵌入任务内容，随备份一起保存。

## 仓库结构

| 路径 | 用途 |
| --- | --- |
| `lightflux/` | 共享界面与 Tauri 桌面应用 |
| `shared/` | 不依赖网络和数据库的任务、Project、Milestone 规则 |
| `cli/` | 本机 CLI |
| `skills/lightflux/` | Agent Skill |
| `server/`、`deploy/` | 归档的云服务与恢复工具，不是桌面运行依赖 |

## 验证

```bash
npm --prefix lightflux test
npm --prefix lightflux run typecheck
npm --prefix lightflux run desktop:web
npm --prefix cli run check
cargo check --manifest-path lightflux/src-tauri/Cargo.toml
cargo test --manifest-path lightflux/src-tauri/Cargo.toml
```

云服务自动部署已停止。

[MIT License](LICENSE)
