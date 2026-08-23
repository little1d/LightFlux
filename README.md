<div align="center">

# 流光 · LightFlux

**本地优先（local-first）的跨平台任务管理应用**

Web · iOS · Android · macOS · Windows · Linux 一套代码，多端运行。

[![Web](https://img.shields.io/badge/Web-lightflux.site-7c3aed)](https://lightflux.site)
[![Expo](https://img.shields.io/badge/Expo-57-000020?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61dafb?logo=react)](https://reactnative.dev)
[![Tauri](https://img.shields.io/badge/Tauri-2-ffc131?logo=tauri)](https://tauri.app)

🌐 官网：**<https://lightflux.site>**

✅ Web 应用：**<https://lightflux.site/today>**

</div>

---

## 简介

LightFlux（流光）是一款注重信息密度与交互质感的任务管理工具。所有 UI 操作即时更新本地状态，持久化与云同步在服务边界之后异步进行——未登录也能完整使用，登录后再把本地数据同步到云端。

- **本地优先**：离线可用，交互零延迟；网络与账户只是能力增强，而非前置门槛。
- **一套代码多端运行**：基于 Expo / React Native 构建 Web 与移动端，桌面端由 Tauri 打包。
- **富文本任务**：基于 Tiptap 的正文编辑，支持 Markdown 输入规则、图片与代码块。
- **AI 助手**：理解 → 消歧 → 预览 → 确认 → 执行 → 审计 → 撤销的受控数据变更语义，模型不直接改动本地数据。

## 功能特性

- 今日任务的新增、完成、删除与筛选
- 已完成任务按完成日期归档，可恢复为待办
- 月历视图、日期选取与指定日期添加任务
- 可折叠项目、项目创建与项目内快速添加
- 子任务拖拽排序，顺序持久化
- 全局搜索（`Ctrl/⌘ + F`）任务标题、正文与项目名
- Web 右键 / 移动端长按任务菜单，可创建子任务
- 可恢复垃圾桶、永久删除与清空垃圾桶
- 宽屏可拖拽详情栏，窄屏使用保留列表上下文的底部详情面板
- Tiptap 富文本正文，任务详情自动保存
- 设置页提供语言切换、统计入口与可选导航页面可见性配置
- 版本化本地数据结构，当前严格使用 V12 Project 模型
- 邮箱密码 / 验证码（OTP）登录与跨端云状态同步

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 客户端 | Expo 57、React Native 0.86、React 19、NativeWind / Tailwind CSS |
| 富文本 | Tiptap 3（`editor-web/` 打包为单文件 WebView 编辑器） |
| 状态管理 | Zustand（存储通过独立 service 隔离） |
| 桌面端 | Tauri 2（Rust 外壳，`com.little1d.lightflux`） |
| 服务端 | Node.js、Better Auth（邮箱 OTP）、PostgreSQL、Nodemailer |
| 部署 | Docker Compose + Nginx 反代 + Let's Encrypt；PostgreSQL 托管于 Supabase，邮件经 Resend SMTP |

## 仓库结构

```
LightFlux/
├── lightflux/            # Expo / React Native 应用（Web、iOS、Android）
│   ├── editor-web/       # 原生客户端内嵌的 Tiptap 编辑器打包源
│   └── src-tauri/        # Tauri 桌面外壳与 Rust 集成
├── server/               # Node.js 认证、同步、上传与 AI 代理服务
├── deploy/               # 生产部署资产（compose、nginx、脚本）
├── docs/                 # 后端设计、桌面发布等文档
├── .github/workflows/    # CI/CD（服务端测试/部署、桌面端多平台发布）
└── AGENTS.md             # 仓库工作约定与架构不变量
```

## 快速开始

### 客户端

```bash
cd lightflux
npm install
npm run editor:build   # 生成 WebView 使用的单文件 Tiptap 编辑器
npm start              # 启动 Expo 开发服务器
```

平台专用启动：`npm run web`、`npm run ios`、`npm run android`、`npm run desktop:web`（静态导出）。

> 修改 `editor-web/` 或原生 Tiptap 扩展后，需重新执行 `npm run editor:build`。

### 服务端

需要 PostgreSQL 15+。

```bash
cd server
cp .env.example .env    # 填入 PostgreSQL 与 SMTP 配置
npm install
npm run db:migrate
npm run dev
```

或用 Compose 一并启动 PostgreSQL 与 API：`docker compose up --build`。详见 [server/README.md](server/README.md)。

### 连接客户端与服务端

在 `lightflux/.env` 中配置 API 地址（本地开发）：

```bash
EXPO_PUBLIC_AUTH_API_URL=http://localhost:8787
EXPO_PUBLIC_AI_API_URL=http://localhost:8787
EXPO_PUBLIC_UPLOAD_API_URL=http://localhost:8787
```

> `EXPO_PUBLIC_*` 会在 Web 构建时被内联进产物，请在构建前确认指向正确的环境。

## 数据持久化

任务数据使用 `schemaVersion: 12` 的 JSON 结构。Web 写入独立的 V12 IndexedDB key（不可用时回退到 `localStorage`），iOS/Android 写入独立的 V12 应用文档。每个任务包含稳定 ID、父任务 ID、项目 ID、完成/删除时间、富文本 JSON 与持久化排序字段 `sortOrder`。公测前的 Group 数据已清空，客户端不会读取低于 V12 的状态。应用状态携带全局更新时间以协调本地与云端版本。

登录后以完整版本化聚合同步到 PostgreSQL 的 `JSONB` 字段；云写入使用服务端 revision CAS，发生 409 冲突时客户端基于持久化云端基线执行三方合并并自动重试。历史统计来源于 `TaskEvent`，不从当前快照推断。

## 账户与登录

基于 Better Auth，支持**邮箱密码**与**六位邮箱验证码（OTP）**两种登录方式，跨端体验一致：

- Web / Tauri 使用 HttpOnly Cookie 维持会话；
- iOS / Android 通过 Better Auth Expo 客户端将会话保存在 SecureStore。

用户明确选择本地模式后，应用完全使用设备本地数据，不会尝试云同步。

## 部署

生产环境下 `lightflux.site` 由单个 Nginx 实例同时服务静态 Web 应用与 API：

- Web 应用本地导出（`npm run desktop:web`）后同步到服务器 `/opt/lightflux/web`；
- Nginx 将 `/` 作为 SPA history fallback，`/api/` 与 `/health` 反代到 API 容器；
- API 以 Docker 容器运行，PostgreSQL 托管于 Supabase，邮件经 Resend SMTP。

```bash
# 部署 API
SSH_HOST=<server-ip> bash deploy/scripts/deploy.sh

# 构建并部署 Web 应用
SSH_HOST=<server-ip> bash deploy/scripts/deploy-web.sh
```

完整流程、Nginx 配置与首次初始化步骤见 [deploy/README.md](deploy/README.md)。

## 桌面端发布

桌面端由 Tauri 打包，支持 macOS（Intel/Silicon）、Windows 与 Linux（AppImage / deb）。推送 `desktop-v*` 标签或手动触发 GitHub Actions 即可构建并发布至 [`little1d/lightflux-releases`](https://github.com/little1d/lightflux-releases)。详见 [docs/desktop-release.md](docs/desktop-release.md)。

## 文档

- [server/README.md](server/README.md) — 服务端配置与本地运行
- [deploy/README.md](deploy/README.md) — 生产部署
- [docs/backend-postgresql.md](docs/backend-postgresql.md) — 后端 PostgreSQL 设计
- [docs/desktop-release.md](docs/desktop-release.md) — 桌面端发布流程
- [AGENTS.md](AGENTS.md) — 仓库工作约定与架构不变量

## 验证基线

```bash
cd lightflux && npm test          # 单元测试
cd lightflux && npm run typecheck  # 类型检查
cd lightflux && npm run desktop:web # Web 静态导出
cd server && npm test              # 服务端测试
```
