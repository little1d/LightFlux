# 流光 (LightFlux)

基于 Expo、React Native、Tailwind CSS 和 NativeWind 的跨平台任务管理应用。

## 功能

- 今日任务新增、完成、删除和筛选
- 已完成任务按完成日期归档，可恢复为待办
- 月历视图、日期选取和指定日期添加任务
- 可折叠任务分组、分组创建和组内快速添加
- 搜索任务标题、正文和分组名称
- Web 右键 / 移动端长按任务菜单，可创建子任务
- 可恢复垃圾桶、永久删除和清空垃圾桶
- 宽屏按需显示可拖拽详情栏，窄屏使用全屏详情
- 桌面端竖向导航、账户菜单和任务内容类型提示
- Tiptap 富文本正文，支持 Markdown 输入规则、图片和代码块
- 设置页提供中文 / English 切换与快捷键说明
- 本地会话退出与重新进入，不删除设备上的任务
- iOS、Android 使用本地文件持久化，Web 使用 localStorage
- 响应式多视图 UI，无后端和远程账号依赖

## 运行

```bash
cd lightflux
npm install
npm run editor:build
npm start
npm run typecheck
```

也可以使用 `npm run android`、`npm run ios` 或 `npm run web`
直接启动对应平台。

修改 `editor-web/` 或原生 Tiptap 扩展后，需要重新执行
`npm run editor:build` 生成 TenTap WebView 使用的单文件编辑器。
