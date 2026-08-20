# 流光 (LightFlux)

基于 Expo 57、React Native 0.86、Tailwind CSS 和 NativeWind 的跨平台任务管理应用。

## 功能

- 今日任务新增、完成、删除和筛选
- 已完成任务按完成日期归档，可恢复为待办
- 月历视图、日期选取和指定日期添加任务
- 可折叠任务分组、分组创建和组内快速添加
- 子任务拖拽排序，顺序会持久化
- 搜索任务标题、正文和分组名称
- Web 右键 / 移动端长按任务菜单，可创建子任务
- 可恢复垃圾桶、永久删除和清空垃圾桶
- 宽屏按需显示可拖拽详情栏，窄屏使用保留列表上下文的底部详情面板
- Ionicons 桌面导航、账户菜单和任务内容类型提示
- Tiptap 富文本正文，支持 Markdown 输入规则、图片和代码块
- 任务详情自动保存，无需手动点击保存
- 设置页提供语言、统计入口和可选导航页面配置
- 本地会话退出与重新进入，不删除设备上的任务
- iOS、Android 使用本地文件持久化，Web 使用 localStorage
- 版本化本地数据结构，支持旧数据迁移
- Node API 使用 PostgreSQL，支持邮箱验证码、微信登录、云状态同步和 AI 代理

## 运行

```bash
cd lightflux
npm install
npm run editor:build
npm test
npm start
npm run typecheck
```

也可以使用 `npm run android`、`npm run ios` 或 `npm run web`
直接启动对应平台。

修改 `editor-web/` 或原生 Tiptap 扩展后，需要重新执行
`npm run editor:build` 生成 TenTap WebView 使用的单文件编辑器。

## 数据持久化

任务数据使用 `schemaVersion: 10` 的 JSON 结构。Web 写入
IndexedDB（不可用时回退到 `localStorage`），iOS/Android 写入应用文档目录。每个任务包含稳定 ID、
父任务 ID、分组 ID、完成/删除时间、富文本 JSON 和持久化排序字段
`sortOrder`；应用状态包含全局更新时间以协调本地与云端版本，任务分组也包含独立顺序字段。状态管理使用 Zustand，存储通过独立 service
隔离；登录后以完整版本化聚合同步到 PostgreSQL `JSONB`，未登录时仍
完全使用设备本地数据。云写入使用服务端 revision CAS；发生 409 时，
客户端基于持久化云端基线执行三方合并并自动重试。

## 账户与登录

```bash
cd server
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

客户端配置 `lightflux/.env`：

```bash
EXPO_PUBLIC_AUTH_API_URL=http://localhost:8787
```

默认登录方式为六位邮箱验证码。Web/Tauri 使用 HttpOnly Cookie，
iOS/Android 通过 Better Auth Expo 客户端将会话保存在 SecureStore。
微信开放平台接口作为兼容登录方式保留。服务端配置见 `server/README.md`，
PostgreSQL 设计见 [`docs/backend-postgresql.md`](docs/backend-postgresql.md)，申请材料和审核步骤见
[`docs/wechat-open-platform/README.md`](docs/wechat-open-platform/README.md)。
