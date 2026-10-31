<p align="center">
  <img src="public/assets/shared/images/flight-logo.svg" alt="FLight 项目 Logo" width="320">
</p>

# FLight | 学生公寓住宿与报修管理系统

FLight 面向学生、宿管人员、维修人员和管理员，提供从入住申请、床位分配、账单缴费到报修派工、维修评价的完整业务流程。项目使用 Next.js、TypeScript 和 PostgreSQL，业务数据通过同源 API 持久化到数据库。

界面以 Anime.js 母版为基础，包含动画首页、独立登录页和四端工作台。工作台采用「功能目录 / 动画预览 / 业务正文」三栏布局，并按角色和具体页面配置预览动画。

当前定位为课程与本地运行项目：在线缴费使用测试支付，不产生真实扣款；数据库备份调用 PostgreSQL 工具，恢复时创建独立副本。

## 功能概览

| 角色 | 模块 | 主要能力 |
| --- | --- | --- |
| 学生 | 个人信息、住宿业务、缴费管理、报修服务、公告查看、个人消息 | 维护资料与密码，申请入住 / 调宿 / 退宿，查询账单与测试缴费，提交报修、跟进进度和评价服务 |
| 宿管人员 | 基础信息、住宿事务、床位状态、报修初审、账单核对、个人中心、个人消息 | 维护所辖资料，审核住宿申请并分配床位，检查床位异常，初审报修，核对账单并发送催缴通知 |
| 维修人员 | 工单接收、维修处理、维修记录、个人统计、个人中心、个人消息 | 接收获派工单，记录维修进展与配件等待，确认完工，查看工作量、完成率和服务评价 |
| 管理员 | 基础数据、流程管控、报修派工、统计报表、权限管理、备份恢复、账单管理、公告管理、个人中心、个人消息 | 导入导出基础资料，配置业务规则，人工或按负载派工，管理账号与楼栋授权，生成账单、发布公告、审计及备份恢复 |

管理员“统计报表 → 统计可视化”沿用母版 easing-editor 的三栏布局，展示床位、报修、派工、评价及账单等 12 项真实统计指标，支持柱图、折线图和环图、楼栋与日期筛选、数据明细和 CSV 导出。参见[统计可视化说明](docs/STATISTICS_VISUALIZATION.md)。

核心业务包括：

- **住宿事务**：入住、调宿、退宿审核与办理，自动或手动分床，性别、容量和有效入住约束，床位状态同步及历史记录。
- **账单缴费**：固定月费配置、按账期批量生成、账单维护、分次测试支付、幂等处理、核对与站内催缴。
- **报修维修**：提交 → 初审 → 派工 → 接单 → 维修 → 完工 → 评价；支持驳回、等待配件、处理过程及 1～5 星评价。管理员可在“流程管控 → 报修流程”开启“自动通过报修初审”，新报修将由系统自动审核并直接进入待派工队列；默认关闭，现有工单不受设置变更影响。
- **数据与统计**：学生、楼栋、房间、床位维护，分页与筛选，CSV 模板、原子导入和导出，入住率、欠费、工作量与评分汇总。
- **系统管理**：账号状态、角色权限、宿管楼栋授权、公告、站内消息、操作审计、备份策略和恢复验证。

数据访问由服务端控制：学生访问本人业务，宿管访问负责或获授权楼栋，维修人员访问获派工单，管理员在权限范围内管理全局业务。URL 或浏览器中的角色参数不能授予权限。

## 界面与页面地址

- 首页提供系统介绍、按登录身份生成的真实工作台入口，以及开发团队参与入口。
- 四端模块主页使用母版 Getting started 点阵；具体页面采用文字、图形或数字动画。缴费与个人统计的指定数字预览读取真实业务数据，并在达到目标值后停止。
- 英文与 ASCII 数字沿用母版 DINish、Berkeley Mono 和 Digital-7；中文采用思源黑体 `SourceHanSansSC`，使用 WOFF2、界面子集和关键字重预加载。说明见 [项目字体](docs/FONT_GUIDE.md)。
- 顶部导航提供「工作台」、项目 GitHub 和账户入口；页脚使用项目 Logo、FLIGHT INC. 署名及项目与开发者链接。
- 页面标题统一以 ` | FLight` 结尾；中间栏保留预览重播，隐藏跳转 CodePen 的编辑图标。
- 日期统一显示为 `2026年10月23日`，账期显示为 `2026年10月`；日期时间保留现有 `HH:mm:ss`。金额显示为 `￥200` 或 `￥200.50`。显示格式独立于数据库、API、CSV 和表单提交值，日期及数值类型保持不变。
- 四端导航复用母版 `NEW` 标记，提示待缴、待审核、待接单、待派工及未读进展，并聚合到父目录。待办完成后消除；公告、维修评价和备份结果使用个人阅读记录，查看详情后消除，内容再次更新时重新提示。

| 页面 | 地址 |
| --- | --- |
| 首页 | `/` |
| 登录 | `/login` |
| 按当前身份进入工作台 | `/workspace` |
| 学生工作台 | `/workspace/student` |
| 宿管工作台 | `/workspace/dormManager` |
| 维修工作台 | `/workspace/maintenance` |
| 管理员工作台 | `/workspace/admin` |

具体页面使用语义化路径，例如 `/workspace/student/personal/profile`、`/workspace/student/accommodation/check-in/submit`。原 `action-1`、`action-2` 等编号地址保留 308 永久重定向兼容。完整清单见 [工作台页面地址规范](docs/WORKSPACE_ROUTES.md)。

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 应用框架 | Next.js 16.3.5 App Router、React 19、TypeScript |
| 界面与动画 | Anime.js 4、母版 Three.js 场景与运行时、CSS Modules、Tailwind CSS 4 |
| 数据与校验 | PostgreSQL、`pg`、Zod、参数化 SQL 与事务 |
| 身份认证 | 加盐 scrypt 密码哈希、数据库会话、HttpOnly Cookie、CSRF 校验及登录限流 |
| 后台任务 | 独立 TypeScript 工作进程，执行账单调度、备份与恢复任务 |
| 验证工具 | ESLint、TypeScript、接口集成测试、Playwright / Microsoft Edge |

母版页面以同源独立文档承载，四端复用静态样式与动画运行时；React 业务组件通过接口读写数据。母版原始资源、项目适配脚本和业务代码分别维护。Anime.js 与 Three.js 使用 `public/assets` 中随母版保留的预构建运行时，不再单独安装对应的 npm 包。

## 本地运行

### 环境要求

- Node.js **24 或以上**，以及 npm。
- PostgreSQL **18**，可访问的数据库实例，以及匹配版本的 `psql`、`pg_dump` 和 `pg_restore`。
- 执行数据库初始化与角色配置的管理账号。
- 运行浏览器回归时需要本机安装 Microsoft Edge。

以下命令以 PowerShell 为例，在项目根目录执行。

### 1. 安装与配置

```powershell
npm ci
Copy-Item .env.example .env.local
```

编辑 `.env.local`，替换示例连接和密码。已有本机配置时无需重新复制。

| 配置项 | 用途 |
| --- | --- |
| `DATABASE_URL` | 应用数据库连接，日常运行使用受限的 `dorma_app` 账号 |
| `DATABASE_ADMIN_URL` | 数据库迁移、角色配置和独立测试库管理连接 |
| `DATABASE_OPERATIONS_URL` | 备份及隔离恢复维护连接，通常使用具备 `CREATEDB` 的 `dorma_ops` |
| `APP_ORIGIN` | 浏览器实际访问源，默认 `http://localhost:3100`，用于写请求来源校验 |
| `SEED_PASSWORD` | 初始化样例账号的密码，至少 8 个字符 |
| `BACKUP_DIR` | 本机备份目录，放在 PostgreSQL 数据目录之外 |
| `PG_BIN` | PostgreSQL 命令行工具目录，例如 `C:/Program Files/PostgreSQL/18/bin` |

数据库名默认为 `student_housing_maintenance`，业务 schema 为 `housing`。连接字符串中的特殊字符需要 URL 编码。环境配置不纳入 Git。

### 2. 创建数据库与执行迁移

仅在数据库尚不存在时执行建库脚本，按本机安装调整工具路径：

```powershell
$pgClient = 'C:/Program Files/PostgreSQL/18/bin/psql.exe'
& $pgClient -X -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f database/000_create_database.sql
```

随后执行：

```powershell
npm run db:migrate
npx tsx scripts/database/setup-roles.ts
npm run db:seed
```

`db:migrate` 在空库中创建初始结构，再执行增量迁移；已有库只执行尚未应用的迁移，并校验已执行文件的摘要。无需另外手工执行 `001_schema.sql` 或 `002_verify.sql`。

`setup-roles.ts` 创建或更新 `dorma_app`、`dorma_ops`，配置权限，并将连接凭据写回 `.env.local`。已配置好对应角色与权限的环境可跳过此步骤。`db:seed` 显式初始化课程样例，重复执行不会清空已有业务数据，也不会重置已有账号密码。

### 3. 启动网页和任务进程

```powershell
npm run dev -- --hostname localhost
```

在另一个终端执行：

```powershell
npm run jobs
```

访问 [本地首页](http://localhost:3100)，从 `/login` 登录。`APP_ORIGIN` 必须与实际使用的协议、主机和端口一致。

### 样例账号

| 身份 | 用户名 |
| --- | --- |
| 学生 | `stu202602341` |
| 宿管人员 | `dm0301` |
| 维修人员 | `mt008` |
| 管理员 | `admin` |

密码使用首次初始化时的 `SEED_PASSWORD`，前端不保存或自动填入密码。学生用户名使用 `stu` 前缀，维修人员使用 `mt` 前缀；学号保持不变。初始化还提供其他学生、第二位宿管和第二位维修人员，用于验证数据隔离。

## 常用命令与验证

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务，默认端口 3100 |
| `npm run db:migrate` | 初始化结构并应用增量迁移 |
| `npm run db:seed` | 初始化课程样例数据 |
| `npm run jobs` | 持续执行后台任务 |
| `npm run jobs:once` | 执行一轮任务检查后退出 |
| `npm run restore:check -- <恢复库名>` | 验证登记格式的独立恢复数据库 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run check` | 依次执行 lint、类型检查和生产构建 |
| `npm run test:integration` | 数据库与接口集成测试 |
| `npm run test:e2e` | 集成测试及浏览器回归 |
| `npm run build` | 生产构建 |
| `npm start` | 启动 standalone 生产服务 |

集成测试会创建唯一命名的独立测试库，在 **3101** 端口启动测试服务，使用 `.next-integration` 构建目录和 `temp/` 下的测试备份目录，完成后清理测试库及已登记的恢复副本。运行前需配置三类数据库连接，准备好 `dorma_app`、`dorma_ops` 及 PostgreSQL 工具，并确保 3101 端口可用。

验证内容包括四类角色接口、访问范围、并发分床与付款、事务回滚、CSV 导入、备份与隔离恢复；浏览器回归进一步覆盖登录退出、页面导航、表单、分页、动画预览和桌面 / 手机布局。母版校验同时检查受保护原始资源的字节一致性。这里列出的是测试范围，不代表每次文档更新都已执行完整验收。

## 后台任务与生产运行

```powershell
npm run build
npm start
```

项目使用 Next.js standalone 输出。`npm start` 会准备 `public` 和静态构建资源，加载本机 `.env.local` 并启动服务，默认端口为 3100，可通过 `PORT` 调整；同时按实际访问地址更新 `APP_ORIGIN`。任务进程仍需单独运行 `npm run jobs`。

工作进程每 15 秒检查队列并更新心跳，业务时间使用 `Asia/Shanghai`。每月 1 日 00:10 生成账单，启动时补查当月；默认备份策略为每日 02:00，支持配置每日执行时间和保留天数。

备份使用 `pg_dump` 自定义格式并记录 SHA-256 校验值。恢复校验已登记的有效备份后，使用 `pg_restore` 创建 `dorma_restore_*` 独立数据库，并验证结构、约束与业务一致性，网页不会覆盖当前业务库。健康接口 `/api/v1/health` 提供数据库连接和工作进程心跳状态；工作进程未运行时，备份任务保留在队列中。

生产运行还需保留任务脚本、所需依赖、数据库连接、PostgreSQL 工具和备份目录。部署到 HTTPS 或反向代理环境时，按实际拓扑配置来源校验与代理信任，相关说明见 [后端接口与业务说明](docs/BACKEND_API.md)。

## 项目结构

```text
src/
├─ app/                 页面路由、布局及 /api/v1 接口入口
│  ├─ (auth)/           登录路由组，公开地址不含组名
│  ├─ (main)/           四端工作台路由组
│  ├─ api/              同源 API Route Handlers
│  └─ globals.css       全局样式
├─ components/          跨业务共享 UI、文档控件及持久化布局
├─ features/            按业务组织的组件、请求服务、配置与工具
├─ hooks/               跨业务共用的文档交互 Hooks
├─ lib/                 数据库、安全、错误及路由基础设施
├─ services/            共享请求客户端、会话缓存和服务端编排
├─ constants/           角色菜单、模块说明及业务操作常量
├─ types/               共享类型
└─ utils/               日期金额格式化及公共路径工具
public/assets/
├─ home/                首页母版资源与项目适配
├─ login/               登录页母版资源与项目适配
├─ student/             学生工作台及四端共用的母版运行时
├─ manager/             宿管工作台
├─ maintenance/         维修工作台
├─ admin/               管理员工作台
├─ statistics/          统计可视化页面及样式
└─ shared/
   ├─ css/              跨页面的项目样式，fonts/ 保存字体声明
   ├─ fonts/            字体文件及网页子集
   ├─ images/           项目 Logo、favicon 和开发者头像
   └─ js/               跨页面共用的工具函数
database/               初始数据库结构及增量迁移
scripts/
├─ database/            数据库迁移、初始化、角色配置和恢复检查
├─ runtime/             生产启动及后台任务入口
├─ sync/                静态页面、导航和预览同步
├─ fonts/               字体转换与界面子集生成
└─ lib/                 脚本共用的环境加载工具
tests/
├─ runners/             集成与浏览器回归编排入口
├─ integration/         导航接口及数据库汇总检查
├─ unit/                通用纯函数检查
├─ checks/              标题与母版静态检查
├─ e2e/                 按四端角色及共用用例组织的浏览器回归
└─ fixtures/            母版资源摘要和结构校验清单
docs/                   业务、页面路径、界面与字体说明
```

页面 URL 映射集中在 `src/lib/routing/workspace-paths.ts`，各角色的页面清单位于 `src/features/workspace/config/`，动画映射位于其中的 `previews/`，基础业务入口与接口对应关系由 `src/constants/workspace-actions.ts` 管理。静态工作台页面和预览通过 `scripts/sync/sync-*.ts` 同步；调整页面时需同时考虑对应数据源与生成文件。完整目录树、职责与迁移映射见 [项目结构说明](docs/PROJECT_STRUCTURE.md)。

本机运行数据和检查产物单独保存且不纳入 Git：`.local/postgres/` 保存历史 PostgreSQL 测试实例与日志，`test-results/screenshots/` 保存浏览器截图，`temp/legacy-qa/` 保存旧模拟页面检查的临时留档。文档目录不再保存数据库文件或测试输出。旧测试实例不用于当前默认连接，按需启动方式见[数据库说明](docs/DATABASE_GUIDE.md#本机历史测试实例)。

## 文档

- [文档索引与维护约定](docs/INDEX.md)
- [项目结构与目录迁移](docs/PROJECT_STRUCTURE.md)
- [数据库与迁移说明](docs/DATABASE_GUIDE.md)
- [脚本用途与执行方式](docs/SCRIPTS_GUIDE.md)
- [测试目录与执行方式](docs/TESTING_GUIDE.md)
- [静态资源组织与维护](docs/PUBLIC_ASSETS.md)
- [后端接口、权限与业务规则](docs/BACKEND_API.md)
- [工作台页面地址规范](docs/WORKSPACE_ROUTES.md)
- [首页设计来源](docs/HOME_DESIGN.md)、[登录页设计来源](docs/LOGIN_DESIGN.md)
- [学生工作台设计](docs/STUDENT_WORKSPACE_DESIGN.md)、[宿管工作台设计](docs/MANAGER_WORKSPACE_DESIGN.md)
- [学生预览配置](docs/STUDENT_PREVIEWS.md)、[宿管预览配置](docs/MANAGER_PREVIEWS.md)、[维修预览配置](docs/MAINTENANCE_PREVIEWS.md)、[管理员预览配置](docs/ADMIN_PREVIEWS.md)
- [统计可视化](docs/STATISTICS_VISUALIZATION.md)
- [字体与网页字体生成](docs/FONT_GUIDE.md)

界面设计、页面地址和动画预览分别维护，修改时以代码、页面清单和对应回归为准。历史 `archive/`、旧首页实现、未使用组件、旧根层静态资源及关联闲置依赖已移除，需要追溯时可查看 Git 历史。原始 OTF 和独立字体 LICENSE 文本已删除，运行所需 WOFF2 与中文子集保留；公开头像仅保留 Pimnghi 与 rick137universe。

## 项目边界与参与开发

当前未接入真实支付商户、短信或邮件服务；通知通过站内消息发送。暂不提供退款冲正、接单后的工单改派或覆盖式数据库恢复。切换到恢复副本需要维护人员验证后手动调整连接。

业务访问隔离由后端权限检查与查询范围实现，数据库未启用行级安全策略。密码、数据库凭据和会话令牌不进入仓库；依赖、构建缓存、本机配置及 QA 产物按 `.gitignore` 忽略规则管理。项目名称已统一为 FLight，部分数据库角色、内部标识与消息协议保留 `dorma` 命名以保持兼容。

欢迎通过 [Issues](https://github.com/rick137universe/student-housing-maintenance-management-system/issues) 反馈问题，或提交 Pull Request 参与开发。提交修改前运行与改动相关的检查；提交消息采用 `feat:`、`fix:`、`docs:`、`refactor:` 等前缀。

开发者：[rick137universe](https://github.com/rick137universe)、[Pimnghi](https://github.com/Pimnghi)。界面与动画基于 Anime.js 母版适配，第三方代码、字体及资源沿用各自许可。
