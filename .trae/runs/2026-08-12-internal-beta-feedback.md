# Goal Run: LightFlux 内测反馈修复

- Status: `complete`
- Source: `LightFlux 内测.pdf`（2 页）
- Started: 2026-08-12
- Updated: 2026-08-12

## Objective

让任务选中、分组管理、行内编辑和完成流转符合内测预期，并交付包含最新优先级图标的可试用 Mac 桌面包。

## Scope

### Included

- 今日任务右键时显示选中态，但不打开详情。
- 任务操作菜单支持移动到任意分组或未分组。
- 分组标题右键时显示选中态。
- 分组页面的主任务和子任务统一支持行内编辑，并同步右侧详情。
- 已完成任务从今日和分组列表即时移出，只在已完成页面展示。
- 核查桌面资源链并重建 Apple Silicon 内测包。

### Excluded

- 改变已完成任务的历史统计口径。
- 修改 AI Agent 的确认、执行或持久化协议。
- Apple Developer ID 签名、公证和公开发布。

## Work Items

| ID | Type | Source locator | Acceptance criteria | Platforms | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | bug | 第 1 页“右击今日页面的任务” | 右键任务时该行显示紫色选中态；操作菜单关闭后恢复；右键不打开详情 | Web/Desktop | medium | done |
| FEAT-001 | feature | 第 1 页“添加到 xx 分组” | 任务菜单可选择未分组或任意分组；移动子任务时保持有效层级；状态立即持久化 | Web/iOS/Android/Desktop | medium | done |
| BUG-002 | bug | 第 1 页“mac 包优先级 icon 没有更新” | 桌面 Web 资源包含当前 Ionicons 字体；新 Mac 包显示与源码一致的四档优先级图标 | Desktop | medium | done |
| BUG-003 | bug | 第 2 页“大的分组名也没有选中特效” | 分组菜单打开期间对应分组标题有明确紫色选中态 | Web/iOS/Android/Desktop | low | done |
| BUG-004 | bug | 第 2 页“item/子 item 在横轴上编辑” | 主任务和子任务标题均可在行内编辑；编辑时打开并同步右侧详情；右键仍不打开详情 | Web/iOS/Android/Desktop | medium | done |
| BUG-005 | bug | 第 2 页 Bug Report | 勾选完成后任务立即从今日和分组页面消失，并出现在已完成页面；恢复后重新出现 | Web/iOS/Android/Desktop | medium | done |

Allowed status values: `ready`, `in_progress`, `done`, `blocked`, `deferred`.

## Questions And Assumptions

| ID | Kind | Detail | Resolution |
| --- | --- | --- | --- |
| QUESTION-001 | assumption | 任务右键选中态是否应打开详情 | 不打开详情；沿用已验证的“右键子任务不打开详情”约束，仅用菜单任务 ID 驱动临时高亮 |
| QUESTION-002 | assumption | 移动带子任务的任务时如何处理层级 | 移动当前任务及其全部后代；若当前任务的父级不在目标分组，则当前任务脱离父级成为根任务 |
| QUESTION-003 | assumption | 今日完成进度是否保留已完成数量 | 保留摘要统计；仅从可操作任务列表移除已完成任务 |

## Decisions

| Time | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| 2026-08-12 | 使用任务菜单状态驱动临时行选中 | 选中视觉不能与详情打开状态继续耦合 | `lightflux/App.tsx`、`AGENTS.md` |
| 2026-08-12 | 完成任务保留在 store，只在活跃视图过滤 | 已完成页面和统计仍需要完整记录 | `lightflux/store/todoStore.tsx`、PDF 第 2 页 |

## Execution Log

### BUG-001 - 任务右键选中态

- Baseline: 右键后菜单出现，但 `today-task-*` / `group-task-*` 行背景仍透明；右键高亮与详情选中共用 `selectedTask`，无法独立表达。
- Root cause or design: 使用 `taskMenu.todoId` 作为菜单打开期间的临时 `selectedTaskId`，不修改 `selectedTask`，因此不会打开详情。
- Changed files: `lightflux/App.tsx`
- Verification: 浏览器右键“LF 内测临时任务”后背景为 `rgb(238, 236, 255)`、有紫色阴影，且 `#task-title-input` 不存在。
- Review:
- Result: 原始复现通过。

### FEAT-001 - 移动到分组

- Baseline: 任务菜单只有重命名、优先级、添加子任务和移至垃圾桶。
- Root cause or design: 新增原子 `moveTodoToGroup`；根任务移动整棵子树，跨分组移动子任务时将其从旧父级脱离。
- Changed files: `lightflux/store/todoDomain.ts`、`lightflux/store/todoStore.tsx`、`lightflux/components/tasks/TaskActionMenu.tsx`、`lightflux/i18n/translations.ts`
- Verification: `tests/todoDomain.test.ts` 9 项通过；浏览器将临时任务从未分组移动至“工作项目”成功。
- Review: 任务子树移动保持父子关系；垃圾桶任务不会被移动。
- Result: 领域、UI 和边界路径通过。

### BUG-002 - Mac 优先级图标

- Baseline: 源码使用 Ionicons；浏览器当前菜单已显示 `remove-circle-outline`、`alert-circle`、`flag`、`arrow-down-circle`。
- Root cause or design: 源码图标已更新，旧 Mac 包携带的是旧导出资源；清理并重新导出 Desktop Web 后重新打包。
- Changed files: 无额外源码修改；生成新的 `.app` 和内测 ZIP。
- Verification: 导出的 Ionicons 字体与依赖源文件 SHA-256 完全一致；Tauri 二进制引用该哈希资源；`.app` 为 arm64、ad-hoc 签名校验通过并成功启动。
- Review: 未发现字体回退或旧资源引用。
- Result: 新包包含当前优先级图标。

### BUG-003 - 分组右键选中态

- Baseline: `groupMenu` 记录活动分组，但 `GroupHeader` 未消费该状态。
- Root cause or design: 菜单对应的分组卡片使用紫色边框、阴影、浅紫标题背景和左侧标记。
- Changed files: `lightflux/components/GroupsScreen.tsx`
- Verification: 浏览器右键“未分组”后标题背景为 `rgb(243, 241, 255)`，操作菜单保持打开。
- Review: 选中态只绑定菜单生命周期，不改变展开状态。
- Result: 原始复现通过。

### BUG-004 - 统一行内编辑

- Baseline: 子任务使用 `TextInput`，主任务仍是只读 `Pressable`。
- Root cause or design: 主任务与子任务统一使用 `InlineTaskTitle`，输入时即时写入 store；右侧编辑器监听同一任务标题。
- Changed files: `lightflux/components/GroupsScreen.tsx`
- Verification: 浏览器将“明日计划”行内改为“明日计划-内测”，详情标题同步更新，再恢复原值。
- Review: 右键捕获仍阻止输入框聚焦，因此不会回归“右键打开详情”。
- Result: 行内编辑和详情同步通过。

### BUG-005 - 完成任务流转

- Baseline: 今日页面允许筛选并展示已完成任务；分组页面未过滤已完成任务。
- Root cause or design: 新增共享 `selectActiveTodos`；今日任务区和分组派生数据只消费未完成任务，今日摘要仍使用完整当日数据。
- Changed files: `lightflux/store/todoDomain.ts`、`lightflux/components/TodoScreen.tsx`、`lightflux/components/GroupsScreen.tsx`、`lightflux/App.tsx`
- Verification: 浏览器勾选临时任务后分组立即为空；已完成页出现该任务；恢复后重新出现在工作项目。临时任务随后永久删除。
- Review: `selectActiveTodos` 同时过滤完成与垃圾桶任务；统计仍保留完整 store 数据。
- Result: 完成和恢复双向流程通过。

## Retry Ledger

| Work item | Failed check | Root-cause hypothesis | Attempt | New evidence | Result |
| --- | --- | --- | --- | --- | --- |
| BUG-002 | `cargo check` / `tauri build` shell exit | TRAE 沙箱拒绝 Rust 全局缓存日志 | 1/3 | Cargo 输出 `Finished`，`.app` 已生成且签名有效 | 环境层假失败；使用产物校验确认通过 |

## Verification Summary

| Check or runtime path | Result | Coverage | Notes |
| --- | --- | --- | --- |
| `cd lightflux && npm run typecheck` | pass | TypeScript | 最终通过 |
| `cd lightflux && npm test` | pass | Frontend domain and command behavior | 11 个文件、59 项通过 |
| `cd server && npm test` | pass | Existing dirty AI server changes | 12 项通过 |
| `npx expo export --platform all` | pass | Web/iOS/Android production bundles | 三端导出成功 |
| Desktop browser workflow | pass | Right-click, inline edit, move group, complete/restore | 1200 CSS px 双栏同步通过；临时数据已清理 |
| Narrow browser workflow | pass | Menu and task flows | 模拟 340 CSS px；菜单边界为 88–328，保留 12px 安全边距 |
| Fresh browser console | pass | Runtime errors | 仅 React DevTools 信息和既有 shadow 弃用警告，无 error |
| `cd lightflux && npm run desktop:web` | pass | Desktop Web resource export | 含 390KB Ionicons 字体 |
| Tauri Apple Silicon package | pass | Mac runtime and priority icons | `.app` 构建、签名、启动通过；命令尾部被沙箱缓存规则误报非零 |

## Review Findings

| Severity | Finding | Evidence | Resolution |
| --- | --- | --- | --- |
| medium | `selectActiveTodos` 若接收 `allTodos` 会包含垃圾桶任务 | `lightflux/store/todoDomain.ts` | 同时过滤 `completed` 和 `trashedAt`，增加回归测试 |

## Deferred Or Blocked

| ID | Reason | Evidence | Required next action |
| --- | --- | --- | --- |
| none | 无功能阻塞项 | 所有工作项和验收标准已验证 | 无 |

## Memory Updates

- Goal record updated: yes
- Durable `AGENTS.md` lesson: 已记录活跃视图过滤和跨分组子树移动规则

## Completion

- Completed items: BUG-001、FEAT-001、BUG-002、BUG-003、BUG-004、BUG-005。
- Acceptance evidence: 自动化测试、三端导出、浏览器真实流程、Tauri arm64 包签名和启动。
- Checks not run: 未做 Apple Developer ID 公证；不属于本轮内测范围。
- Residual risk: ad-hoc 签名包首次在其他 Mac 打开时可能触发 Gatekeeper 提示。
- Final status: complete
