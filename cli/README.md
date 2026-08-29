<p align="center">
  <img src="assets/brand-mark.png" width="112" height="112" alt="LightFlux">
</p>

<h1 align="center">LightFlux</h1>

<p align="center">
  <strong>Agentic 时代的 Todo List 治理</strong>
</p>

<p align="center">
  <a href="https://github.com/little1d/lightflux-cli/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/little1d/lightflux-cli/ci.yml?branch=main&style=flat-square&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/Node.js-22-339933?style=flat-square" alt="Node.js 22">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-111827?style=flat-square" alt="MIT License"></a>
</p>

LightFlux 的愿景，是成为 Agentic 时代的 Todo List 治理层。

当工作不再只由人完成，Todo List 就不能只是静态的待办记录。它需要成为人与 Agent 共享的执行协议，让目标、上下文、责任、状态、权限、交付证据和变更历史始终清晰、可验证、可追溯。

`lightflux-cli` 是 LightFlux 面向 Claude Code、Codex 等 Agent 的公开接入层。本仓库包含 `lightflux` 命令、公开 API 客户端和规范任务工作流的 Agent Skill；LightFlux 应用与服务端保留在产品主仓库中。

## Todo List 治理

- **共享上下文**：人与 Agent 围绕同一个 Workspace、Project 和 Task 工作。
- **明确责任**：任务开始前先读取和认领，执行者、状态与进度不再依赖隐式约定。
- **受控变更**：通过版本检查、幂等键、权限范围和人工确认约束写操作。
- **证据闭环**：完成任务时附带提交、Pull Request 和检查结果，而不只是标记完成。
- **可追溯协作**：关键决策和变更进入统一历史，便于审计、冲突处理与交接。

## 当前能力

- 配置 LightFlux API 地址，并查看当前 Workspace 和 Project 上下文。
- 以稳定的 JSON 格式输出上下文，供 Agent 和脚本读取。
- 将同一份 LightFlux Skill 安装到 Claude Code 和 Codex。
- 使用开发环境令牌选择 Workspace 和默认 Project。
- 通过 Agent Skill 定义读取、认领、更新、完成任务时的安全边界。

> 当前 `0.0.0` 版本是 CLI 基础骨架。设备授权和完整的任务命令需要
> LightFlux 公开 Workspace API 就绪后启用，本文不会将这些规划能力描述为已可用。

## 使用

npm 包发布后的入口是：

```bash
npx lightflux
```

发布前可在当前仓库运行：

```bash
npm install
node src/cli.mjs
```

交互式配置会设置 API 地址，并询问是否安装 Agent Skill。开发阶段设置 `LIGHTFLUX_TOKEN` 后，还可以从可用的 Workspace 中选择默认 Project。令牌不会写入仓库或 `config.json`。

## 命令

```bash
lightflux                         # 配置上下文并安装 Skill
lightflux context                 # 查看当前 Workspace 和 Project
lightflux context --json          # 输出机器可读的上下文
lightflux skills                  # 安装内置 Skill
lightflux skills --force          # 覆盖已有 Skill
lightflux --help
lightflux --version
```

## Agent Skill

Skill 的唯一源文件位于：

```text
skills/lightflux/
├── SKILL.md
└── references/
    └── workflows.md
```

安装时会复制到：

```text
~/.agents/skills/lightflux
```

并链接到：

```text
~/.claude/skills/lightflux
~/.codex/skills/lightflux
```

## Workspace 模型

每个账户拥有一个用于个人工作的 Personal Workspace。Team Workspace 在此基础上提供共享 Project、成员、受限服务账户和可审计的变更历史。Agent 与其他 LightFlux 客户端遵循同一套权限模型。

## 后续能力

公开 Workspace API 就绪后，CLI 将补充：

- OAuth 风格的设备授权；
- Workspace、Project 和 Task 的查询与切换；
- Task 的认领、更新、评论和带证据完成；
- 基于预期版本、幂等键和审计记录的安全变更。

## 仓库结构

```text
assets/                      品牌资源
src/                         CLI 与公开 API 客户端
skills/lightflux/            随包发布的 Agent Skill
.trae/skills/                仓库维护 Skill
tests/                       单元测试
docs/architecture.md         产品与 API 边界
```

## 开发

需要 Node.js 22 或更高版本。

```bash
npm install
npm run check
npm pack --dry-run
```

仓库边界、身份验证、Workspace API 和变更约束见 [docs/architecture.md](docs/architecture.md)。

## 许可证

[MIT](LICENSE)
