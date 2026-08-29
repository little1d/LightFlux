# LightFlux 环境隔离规范

本规范定义 LightFlux 的**开发（development）/ 预发（staging，可选）/ 生产（production）**
三层环境的隔离边界、配置约定与操作流程。目标：**本地开发永远不触碰生产数据**，
密钥永不进入 git，schema 变更先在非生产库验证再上生产。

> 现状风险：截至本规范落地前，本地 `server/.env` 直连生产 Supabase 库，
> 本地调试与生产数据共用一套。落地第一步即消除这一点。

## 1. 环境划分

| 环境 | 用途 | 触发者 | 数据库 | 域名/入口 |
| --- | --- | --- | --- | --- |
| development | 本地开发、调试、跑脚本 | 开发者本机 | **独立 dev Supabase 项目** | `localhost:8081`（Web）/ `localhost:8787`（API） |
| staging（可选） | 上线前灰度、真机联调 | `develop` 分支 CI | 独立 staging 库 | `staging.lightflux.site` |
| production | 正式用户 | `main` 分支 CI | 生产 Supabase 项目 | `lightflux.site` |

单人/小团队起步阶段可先只做 **development + production 两层**，staging 后续按需加。

## 2. 必须隔离的资源

每一层拥有各自独立的实例，禁止跨环境复用：

1. **数据库**：各环境一个独立 Supabase 项目（或独立 database）。dev 库可随意重置。
2. **后端 API 实例**：生产在服务器容器；dev 在本机 `npm run dev`。
3. **Auth 密钥**：`SESSION_SECRET`、`BETTER_AUTH_SECRET` 每层独立生成，互不通用。
   密钥不同 → 一个环境的会话 cookie 在另一个环境天然失效，避免串号。
4. **邮件发送**：见 §5。dev 默认**不发真实邮件**。
5. **AI 代理**：dev 用独立/低配额 key，避免消耗生产额度；可 `AI_ALLOW_ANONYMOUS=true` 方便本地。
6. **上传存储**：各环境独立 `UPLOAD_DIR`，dev 写本机临时目录。
7. **前端构建目标**：`EXPO_PUBLIC_*` 指向对应环境的 API 域名（见 §6）。

## 3. 配置文件约定

**原则：模板进 git，真实值只存本机 / 服务器 / CI secrets。**

**运行时只加载一个 `.env`。** `server/package.json` 的所有脚本都用
`--env-file-if-exists=.env`，因此进程只读 `server/.env` 这一个文件。环境的区分靠
**"在哪台机器"**，而不是靠文件名后缀：本机的 `server/.env` 内容=dev 配置，
服务器上的 `server/.env` 内容=生产配置。这是 12-factor 标准做法，也是当前部署
（`deploy/scripts/deploy.sh` rsync 时 `--exclude '.env'`，并校验服务器已存在 `.env`）
已经在用的模型——所以生产密钥永不进仓库、永不被本地覆盖。

| 文件 | 是否进 git | 用途 |
| --- | --- | --- |
| `server/.env.example` | ✅ 模板 | 字段说明 |
| `server/.env.development.example` | ✅ 模板 | 本地 dev 模板（指向 dev 库、log 投递） |
| `deploy/.env.production.example` | ✅ 模板 | 生产模板（最完善，字段以它为准） |
| `server/.env` | ❌ gitignore | **运行时唯一加载**。本机=dev 配置；服务器=生产配置 |
| 服务器 `/opt/lightflux/server/.env` | ❌ 仅在服务器 | 生产实际值 |
| `server/.env.production.local` | ❌ gitignore | 可选：本机手动运维生产库时的备份串（见下），**不参与运行时** |
| `lightflux/.env.example` | ✅ 模板 | 前端字段说明 |
| `lightflux/.env` | ❌ gitignore | 前端本地实际值（指向本地/生产 API） |

命名规则：**本机开发用无后缀 `.env`（默认指向 dev 资源）**；生产真实值只存在于服务器
和 GitHub Actions secrets。`.gitignore` 已用 `.env.*` + `!*.example` 白名单确保只有模板进仓库。

Radon / Expo 原生开发请求会携带动态端口的 `exp://127.0.0.1:*` Origin。本机
`server/.env` 必须设置 `NODE_ENV=development`，并在
`AUTH_TRUSTED_ORIGINS` 中保留 `exp://`。Better Auth 会按自定义协议匹配它；
生产环境不得加入该开发 Origin。

### 为什么不是"两个 `.env` 同时加载"？

- 应用运行时永远只该有一个真相来源，两个文件同时生效会产生"哪个覆盖哪个"的歧义。
- dev / prod 用**同名 `.env` + 不同机器**天然隔离，且和现有部署脚本零冲突。
- 仓库里存**两套模板**（dev / prod），保证两个环境的完整配置都被记录、可参考、可复现，
  但都不含真实密钥。这满足"两个环境都要留存、以后开发和部署都用得上"的诉求。

### 本地手动运维生产库（可选）

有时需要从本机对生产库跑只读排查或一次性 migration（例如线上 schema 修复）。做法：

1. 把生产连接串写进 `server/.env.production.local`（已被 gitignore 忽略）。
2. 一次性执行时显式加载它，例如：
   `node --env-file=.env.production.local src/postgres/migrate-cli.mjs`
3. **绝不**把生产串写进日常 `server/.env`，用完即回到 dev 配置。


## 4. 数据库隔离（最关键）

1. 在 Supabase 新建一个 **dev 项目**（免费档即可），拿到它的 Session pooler 连接串。
2. 本机 `server/.env` 的 `DATABASE_URL` 指向 **dev 库**，永不指向生产。
3. Schema 变更流程（配合 `db:migrate` 的 forward-only + checksum 校验）：
   - 新增 `NNN_描述.sql` migration（**禁止修改已应用的 migration 文件**，会触发 checksum 报错）。
   - 先在 dev 库 `npm run db:migrate` 验证 + 跑 `npm test`（pg-mem 会重放全部 migration）。
   - 合并到 `main`，由部署流程在生产库执行同一 migration。
4. **临时排查生产数据**：只用只读查询；一次性脚本用完即删，不留在仓库。
   连接生产库必须显式、有意识，绝不作为默认开发配置。

> 硬约束（源自 AGENTS.md）：持久化 schema 变更必须走 forward migration + 归一化 + 老数据测试，
> 绝不静默丢弃用户数据。

## 5. 邮件隔离

- **development**：`OTP_DELIVERY=log`（验证码打印到服务端日志），
  或本地 MailHog（`OTP_DELIVERY=smtp SMTP_HOST=localhost SMTP_PORT=1025`）。**不向真实邮箱发信**。
  注意：`log` 模式在 `NODE_ENV=production` 下会被服务端主动拒绝，这一保护正好防止生产误用日志投递。
- **production**：Resend SMTP，`SMTP_FROM=LightFlux <noreply@lightflux.site>`。

## 6. 前端多环境

`EXPO_PUBLIC_*` 在**构建时内联**（硬约束），因此按环境切换 `.env`：

- 本地对本地 API：`EXPO_PUBLIC_AUTH_API_URL=http://localhost:8787` 等。
- 本地对生产 API（联调）：指向 `https://lightflux.site`。
- 生产构建：CI 内注入生产域名后 `expo export`。

不要把生产域名写死在源码里；始终经由 `process.env.EXPO_PUBLIC_*`。

## 7. CI/CD 分支映射

| 分支 | 环境 | workflow |
| --- | --- | --- |
| `main` | production | `server-deploy.yml` / `web-deploy.yml`（现状） |
| `develop`（可选） | staging | 复制一份 deploy workflow，指向 staging 主机/域名/secrets |

Secrets 在 GitHub 里按环境命名（如 `PROD_SSH_KEY` / `STAGING_SSH_KEY`），
用 GitHub Environments 做审批与隔离。

## 8. 安全红线

- ❌ 开发者机器上不存生产 `DATABASE_URL` 作为默认配置。
- ❌ 任何真实密钥不进 git（只进模板占位符）。
- ❌ 不修改已应用的 migration 文件。
- ✅ 生产 schema 变更前先在 dev 验证。
- ✅ 排查生产数据用只读、可审计的一次性脚本，用后删除。

## 9. 落地清单（建议顺序）

- [x] 在 Supabase 建独立 dev 项目并取得连接串。
- [x] 新增 `server/.env.development.example` 模板（本仓库已提供）。
- [x] 本机 `server/.env` 切到 dev 库 + `OTP_DELIVERY=log`。
- [x] 用 `npm run db:migrate` 在 dev 库建全表（11 张表、4 条 migration），`npm test` 验证（23 通过）。
- [x] `.gitignore` 加固：`.env.*` + `!*.example` 白名单，保护真实 env、追踪模板。
- [ ] 前端 `.env` 增加"本地对本地 API"配置，联调时切换。
- [ ] （可选）本机需要运维生产库时，建 `server/.env.production.local` 存生产串。
- [ ] （可选）搭 staging：新 Supabase 项目 + `develop` 分支 workflow。
