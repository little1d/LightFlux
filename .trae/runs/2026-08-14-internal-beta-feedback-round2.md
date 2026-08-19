# Goal Run: LightFlux 内测反馈修复（第二轮）

- Status: `done`
- Source: `LightFlux 内测.pdf`（3 页，2026-08-14）
- Started: 2026-08-14
- Updated: 2026-08-14

## Objective

修复第二轮内测反馈中的侧边栏拖拽/预览/tooltip、任务助理对齐、日历优先级预览三处缺陷，
交付“移动到分组”hover 展开子菜单与“发现新版本”更新弹窗增强，并顺带提升相关代码鲁棒性。

## Scope

### Included

- 左侧导航拖拽可用，拖拽时显示黑色预览；选中项不再显示黑底白字 tooltip（避免同时出现两个黑框）。
- 任务助理（AI）按钮与其他导航项处于同一列（水平居中对齐）。
- 日历界面任务项显示优先级指示器。
- 任务操作菜单“移动到分组”支持 hover 展开右侧分组子菜单。
- 桌面端更新入口：新版本时可打开“发现新版本”弹窗，含版本号、更新内容、取消/跳过此版本/立即更新。
- 相关路径的鲁棒性强化（边界与空值防御），不做无关重构。

### Excluded

- 修改 AI Agent 确认/执行/持久化协议。
- Apple Developer ID 签名、公证、公开发布。
- 与本轮反馈无关的大范围重构。

## Work Items

| ID | Type | Source locator | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | bug | 第 1 页第 1 条 | 左侧导航项可拖拽排序并有可见预览；选中项不再显示 tooltip 黑框；hover 其他项只出现一个 tooltip | Web/Desktop | medium | done |
| BUG-002 | bug | 第 1 页第 2 条 | 任务助理按钮与导航项在同一列水平居中对齐 | Web/Desktop | low | done |
| BUG-003 | bug | 第 1 页第 3 条 | 日历视图任务项（日格与右侧当日列表）显示任务优先级 | Web/iOS/Android/Desktop | low | done |
| FEAT-004 | feature | 第 2 页第 4 条 | “移动到分组”hover 即展开分组列表，可点击目标分组完成移动 | Web/Desktop | medium | done |
| FEAT-005 | feature | 第 3 页第 5 条 | 有新版本时可打开“发现新版本”弹窗；含版本号/更新内容/取消/跳过此版本/立即更新；跳过后不再提示该版本 | Desktop | medium | done |
| REV-006 | review | 用户要求“检查代码可优化处，更鲁棒” | 识别并修复相关路径的高/中风险鲁棒性问题；低风险记录为 deferred | All | medium | done |

Allowed status values: `ready`, `in_progress`, `done`, `blocked`, `deferred`.

## Questions And Assumptions

| ID | Kind | Detail | Resolution |
| --- | --- | --- | --- |
| QUESTION-001 | assumption | tooltip 是否应在选中项上显示 | 不显示：选中项已有紫色高亮态，hover 时再叠加黑底白字会与相邻 hover 项同时出现两个黑框；仅未选中项在 hover/focus 时显示 tooltip |
| QUESTION-002 | assumption | “跳过此版本”的持久化范围 | 持久化到 desktop preferences（skippedUpdateVersions），后续检查更新时跳过该版本，不影响必需更新 |
| QUESTION-003 | assumption | 更新弹窗触发入口 | 沿用现有侧边栏更新按钮/托盘 update action 打开弹窗，本轮补齐“跳过此版本”按钮与文案 |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-14 | 拖拽预览基于当前可见行、tooltip 仅未选中项显示 | 复现 PDF 第 1 页双黑框问题，选中态与 hover 提示解耦 | `lightflux/App.tsx` |
| 2026-08-14 | skip 版本持久化于 desktop preferences | 需要跨会话记忆“跳过此版本” | `lightflux/services/desktopPreferences.ts` |
| 2026-08-14 | 拖拽的 window 监听在 `onMouseDown` 内同步挂载（不再走 effect） | effect 在下一次渲染才挂监听，快速/合成事件会漏掉首批移动导致拖拽失效 | `lightflux/components/navigation/DraggableNavigationItem.web.tsx` |
| 2026-08-14 | “移动到分组”改为右侧级联 flyout（含左翻转与关闭宽限期），不再原地替换整菜单 | 忠实还原 PDF“右边出现各种分组”，并避免鼠标移向“移至垃圾桶”时误替换菜单 | `lightflux/components/tasks/TaskActionMenu.tsx`、`lightflux/components/ui/MenuSurface.tsx` |
| 2026-08-14 | 抽出纯函数 `reorderList` 并补单测 | 集中易错的重排 splice 逻辑，浏览器自动化无法验证时以确定性单测锁定行为 | `lightflux/store/todoDomain.ts`、`lightflux/tests/todoDomain.test.ts` |

## Execution Log

（逐项填写）

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd lightflux && npm run typecheck` | pass | TypeScript | 全量无报错 |
| `cd lightflux && npm test` | pass | Domain/command | 67 passed（新增 6 条 `reorderList` 单测） |
| `cd server && npm test` | pass | Server 网关 | 12 passed |
| `cd lightflux && npx expo export --platform web` | pass | 全量 web 打包 | 646 modules，无报错 |
| 运行时：侧边栏 tooltip 仅未选中项显示 | pass | 浏览器验证 | 选中项 hover 无黑框，同时最多一个 tooltip |
| 运行时：日历优先级指示器 | pass | 浏览器验证 | 高优先级任务在日历显示红色感叹号图标 |
| 运行时：移动到分组右侧 flyout | pass | 浏览器验证 | hover 即弹出分组列表（未分组/工作项目），可点击移动 |
| 运行时：侧边栏拖拽重排序 | blocked | 浏览器验证 | `browser_evaluate` 在本环境返回 undefined；同步 DOM 读取无法观察 React 异步 flush。已改由 `reorderList` 单测 + 代码走查确认逻辑正确 |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |
| High | 拖拽 window 监听放在 effect 里，快速/合成事件在监听挂载前触发，导致拖拽整体失效 | `DraggableNavigationItem.web.tsx` 原实现 | 改为 `onMouseDown` 内同步挂载监听并在 ref 中读取最新 props；卸载时清理 |
| Medium | 拖拽在行外松开时 `click` 不触发，`suppressClick` 残留会吞掉下一次点击 | 同上 | 在每次 `onMouseDown` 起始重置 `suppressClick` |
| Medium | “移动到分组”原地替换整菜单，鼠标移向“移至垃圾桶”会误触替换，且与 PDF 右侧级联设计不符 | `TaskActionMenu.tsx` | 改为右侧/左翻转级联 flyout，带 140ms 关闭宽限期 |
| Low | `skippedUpdateVersions` 反序列化未做类型防御 | `desktopPreferences.ts` | 已加数组与 string 元素过滤 |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |
| VERIFY-DRAG | 浏览器自动化无法可靠合成 window 级 mouse 拖拽并观察异步状态更新 | 三次 `browser_evaluate` 均返回 undefined | 由用户在真实桌面/浏览器手动确认拖拽重排；逻辑已由单测覆盖 |

## Memory Updates

- Goal record updated: yes
- Durable `AGENTS.md` lesson: added（拖拽监听同步挂载 + 级联 flyout 复用 MenuSurface）

## Completion

- Completed items: BUG-001, BUG-002, BUG-003, FEAT-004, FEAT-005, REV-006
- Acceptance evidence: typecheck/lightflux test/server test/web export 全绿；tooltip、日历优先级、移动分组 flyout 运行时验证通过
- Checks not run: Rust `cargo check`（本轮无 Rust 改动）；桌面拖拽运行时验证（工具受限，见 Deferred）
- Residual risk: 侧边栏拖拽重排序未经自动化运行时确认（逻辑经单测与走查验证）；建议用户在桌面端手动试用
- Final status: done

---

# 追加：内测反馈（第三轮 UI/UX 深度优化）

- Status: `done`
- Updated: 2026-08-18

## Objective

美化首页“今日”区域与交互；修复设置中英文切换；侧边栏拖拽重排加入平滑避让动画；
升级 Toast 系统并在关键路径（完成任务）增加正向反馈；任务详情页支持日期/分组/优先级编辑；
今日页面支持行内编辑任务标题；“未分组”统一更名“默认分组”。

## Work Items

| ID | Type | Acceptance criteria | Status |
| --- | --- | --- | --- |
| FEAT-015 | feature | “未分组”更名“默认分组”（中英文） | done |
| FEAT-016 | bug | 设置语言选择框点击可展开中英文下拉，选择后整屏 UI 切换 | done |
| FEAT-017 | feature | 今日页首页美化 + 行内编辑任务标题 | done |
| FEAT-018 | feature | Toast 全局化 + 完成任务表扬提示 | done |
| FEAT-019 | feature | 侧边栏拖拽重排：被拖项抬升、其他项平滑避让、松手 toast | done |
| FEAT-020 | feature | 任务详情页可编辑日期/分组/优先级（chip + MenuSurface 弹层） | done |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-18 | 侧边栏拖拽状态上提到 `App.tsx`（`navigationDrag`），共享给所有导航项 | 让非拖拽项能在拖拽过程中平滑位移避让，而非松手瞬移 | `DraggableNavigationItem.web/native.tsx`、`navigationDrag.ts`、`App.tsx` |
| 2026-08-18 | `MenuSurface` web 遮罩层由 `position:absolute` 改为 `fixed` | RNW 默认给每个 View 加 `position:relative`，absolute 遮罩相对最近祖先定位，`measureInWindow` 得到的视口坐标被叠加到祖先偏移上，导致远离左上角的菜单（设置语言框）整体飞出屏幕 | `lightflux/components/ui/MenuSurface.tsx` |
| 2026-08-18 | 新增 `Portal`（web/native 分平台）并让 `MenuSurface` web 分支挂到 `document.body` | 仅靠 `position:fixed` 无法跳出祖先层叠上下文；设置卡片 `sectionCard` 有 `overflow:hidden`，且 RNW 每个 View/Animated.View 会创建独立层叠/transform 上下文，导致语言下拉的“English”被下方统计块裁剪/覆盖。Portal 到 body 后菜单落在根层叠上下文，自身 zIndex 生效 | `lightflux/components/ui/Portal.web.tsx`、`Portal.native.tsx`、`Portal.tsx`、`MenuSurface.tsx` |

## Verification Summary

| Check or runtime path | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | pass | 全量无报错 |
| `npm test` | pass | 67 passed（含 content 翻译完整性） |
| `npm run desktop:web` | pass | web 打包成功（需 sandbox 外执行，`~/.expo/state.json` 写入受限） |
| 运行时：设置语言下拉 | pass | 修复后菜单落在框正下方（x≈562/669, 视口内）；English/简体中文 双向切换整屏 UI |
| 运行时：任务详情三 chip | pass | 日期(迷你日历+今天/明天)/分组/优先级弹层均可选，chip 文案实时更新 |
| 运行时：今日行内编辑 + 完成 toast | pass | 点击标题即可行内编辑；勾选完成弹出庆祝/表扬 toast |
| 运行时：侧边栏拖拽避让动画 | pass | 中途读取 computed transform：被拖项 scale1.06/translateY130/z40/shadow，下方兄弟 translateY-60；松手出现“顺序已更新” |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |
| High | 设置语言下拉（及所有远离左上角触发的 MenuSurface 菜单）飞出屏幕不可见 | 实测 menu rect x=1338（框在 x=669），恰为祖先偏移的二次叠加 | web 遮罩改 `position:fixed`，锚定视口；修复所有 MenuSurface 消费方 |

## Completion

- Completed items: FEAT-015 ~ FEAT-020
- Acceptance evidence: typecheck/test/web export 全绿；六项运行时行为浏览器逐一验证通过
- Final status: done
