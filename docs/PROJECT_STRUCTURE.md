# 项目结构与源码迁移

整理日期：2026年10月31日。应用继续使用现有 Next.js App Router、TypeScript 和 npm，未新增依赖或修改依赖版本。

## 分层原则

- `src/app/` 只保留路由、根布局、页面元信息、API 入口和全局样式；根配置、环境文件、数据库脚本、测试及静态资源保留在项目根目录。
- `src/features/` 按业务组织组件、请求服务、配置和工具；跨业务 UI、布局放在 `components/ui`、`components/common` 和 `components/layout`。
- `src/hooks/` 保存两个共用的文档交互 Hook；导航提醒 Hook 属于工作台，保留在对应 feature 内。没有创建无实际内容的目录。
- `src/lib/` 保存 PostgreSQL 客户端、安全能力、错误和路由基础设施；`src/services/` 保存共享请求客户端、会话隔离缓存和跨业务服务端编排。
- 现有服务端资源查询、系统操作和事务编排跨越多个业务，保留在 `services/server/`，没有为目录调整而拆写 SQL 或改变事务边界。专属导航和账单汇总服务进入对应 feature。
- `constants/` 保存角色菜单和公共操作常量，`types/` 保存账号及共用页面元数据类型，`utils/` 仅保留公共格式化与路径函数。

## 业务模块

| Feature | 职责 |
| --- | --- |
| `auth` | 登录视图、认证上下文与首屏账号读取 |
| `home` | 首页母版承载与真实入口 |
| `workspace` | 四端外壳、页面配置、导航提醒和标题 |
| `personal` | 四端共用的资料与密码编辑 |
| `base-data` | 学生、楼栋、房间、床位维护与编辑 |
| `accommodation` | 入住、调宿、退宿提交与审核 |
| `billing` | 账单、缴费、核对及专属数据汇总 |
| `repairs` | 报修、初审、派工、维修处理与记录 |
| `notifications` | 公告、缴费提醒和消息 |
| `statistics` | 统计报表、个人统计和可视化 |
| `permissions` | 账号与权限管理界面 |
| `backups` | 备份管理界面 |
| `workflows` | 管理员流程配置界面 |

## 路由与持久化布局

登录入口为 `src/app/(auth)/login/page.tsx`，工作台入口位于 `src/app/(main)/workspace/`。路由组不进入公开 URL；首页、`/login`、四端工作台、动态功能与可选 catch-all、`/api/v1/[...path]` 及旧地址重定向均保持原有行为。没有添加新的根布局。

`components/layout/AppShell.tsx` 由原持久化入口迁移而来，继续在根布局中承载首页、登录及工作台的切换遮罩。路由页保留原有轻量入口方式，避免重建根外壳、重复挂载 iframe 或中断母版动画。

工作台内部旧组件和 Hook 的导出名称保留兼容，例如 `StudentWarning`、`StudentRecordData`、`useRepairDocument`；其实现位置已按实际跨业务用途归类。四端页面类型通过共享类型保持原有字段约束。

## 配置变更

| 文件 | 本次变更及原因 |
| --- | --- |
| `next.config.ts` | 旧地址重定向配置改从 `src/lib/routing/workspace-paths.ts` 导入；standalone、端口及重定向内容保持原样。 |
| `tsconfig.json` | 保持 `@/* → ./src/*`；显式纳入 src、scripts、tests、next.config 和 Next.js 生成类型，并排除 temp、.local、test-results，避免一次性脚本、本机运行数据及测试产物进入类型检查。 |
| 依赖、环境与工具链 | `package.json`、锁文件、`.env.local` 和 `.env.example` 的内容均与重构开始时一致；未更换包管理器。 |

跨目录的 src 导入使用 `@/`，同目录组件和样式可使用相对路径；CLI 脚本、测试与 Next.js 配置保留可直接执行的相对导入。相对指向 public 的资源导入已重新计算。

## 静态资源和辅助目录

`public/` 继续位于根目录，按页面模块与 `assets/shared/` 公共资源分类。独立页面母版包的入口和内部相对依赖保持不变，原始运行时、模型和解码器内容保留；公共字体、项目图片、账号样式和显示工具已经迁入 `shared/` 并更新引用。文档 Logo 同样迁入公共图片目录。说明及迁移映射见 [PUBLIC_ASSETS.md](PUBLIC_ASSETS.md)。数据库迁移与环境变量文件未移动。

本机运行数据与测试产物单独存放：`.local/postgres/test-cluster/` 保存历史 PostgreSQL 测试实例，`.local/postgres/logs/` 保存其日志，`test-results/screenshots/` 保存浏览器回归截图。旧模拟页面脚本和一次性布局快照保存在 `temp/legacy-qa/` 临时留档。这些目录均被 Git 忽略，不属于文档或应用源码。

`scripts/` 的 15 个运行与维护脚本按 `database/`、`runtime/`、`sync/`、`fonts/`、`lib/` 分类。npm 命令、集成测试和文档中的路径已同步更新，数据库 SQL、应用代码与静态资源保持不变。逐项用途见 [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md)。

`tests/` 的 59 个 TypeScript 文件按 `runners/`、`integration/`、`unit/`、`checks/` 和按角色分类的 `e2e/` 整理；3 份 `fixtures/` 的路径及母版原始资源摘要保持不变，首页与登录页的项目页眉、页脚快照随公共资源 URL 更新。现有断言、调用顺序、函数导出和命令参数均保留，npm 入口与相对导入已经更新。执行方式见 [TESTING_GUIDE.md](TESTING_GUIDE.md)。

路由目录移动后重新生成了默认与集成环境的 Next.js 类型，并移除了已停止服务的旧 dev/types 生成缓存，防止校验器继续引用旧路由文件。

## 验证结果

- 117 份原始源码的运行时语句或资源内容与迁移前一致；两处提取的 Hook 实现保持一致。新增文件仅为共享页面类型及两个 Hook，当前 src 共 120 个文件。
- 309 个静态资源、测试清单、依赖文件和环境文件摘要保持一致。
- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run build`：通过，公开路由与原项目一致。
- 704 处源码、脚本和测试模块引用以及 54 处本地文档链接：通过。
- 95 份母版资源校验、四端外壳结构、145 个页面地址、显示格式和统计工具校验：通过。
- 隔离接口回归：143 项检查通过，包括事务、权限、备份与隔离恢复。
- 针对性浏览器检查：145 个页面地址与资源加载通过，无失败静态资源或未捕获脚本错误；重构前后提交页导航和中文日期显示一致。
- 完整浏览器回归 `npm run test:e2e`：未全量通过。学生业务操作断言完成后，严格的浏览器错误收集断言捕获到母版 `public/assets/student/assets/js/docs.js` 的 `Cannot read properties of undefined (reading 'isLoaded')`；该脚本的 Demo 管理器在 `map.get(id)` 未取到实例时继续读取属性。此资源及应用运行时语句均与迁移前一致，145 页专项访问未复现该异常；尚不能确认完整回归中的触发时序，后续三端业务回归因此没有全部执行。保留原有严格断言，未改写母版运行时或业务流程。日志保存在忽略目录 `temp/src-refactor-e2e.log`。
- 为原有住宿提交测试增加原生预览初始化的前置等待，并将确认后日期期望更新为既有的中文格式；子页选中、表单提交和原始请求值断言保持。没有通过放宽断言或修改业务代码处理测试失败。

## 完整项目文件树

以下为本次整理后的项目文件快照，完整展开源码、静态资源、测试、脚本和维护文档。为避免列出本机数据及自动生成文件，省略 `.git/`、`node_modules/`、`.next/`、`.next-integration/`、`temp/`、`.local/`、`test-results/`、IDE 配置及 `*.tsbuildinfo`；环境文件仅展示名称。

```text
student-housing-maintenance-management-system/
├── database/
│   ├── migrations/
│   │   ├── 003_backend.sql
│   │   ├── 004_resource_guards.sql
│   │   ├── 005_metadata.sql
│   │   ├── 006_account_usernames.sql
│   │   ├── 007_navigation_reads.sql
│   │   └── 008_repair_workflow.sql
│   ├── 000_create_database.sql
│   ├── 001_schema.sql
│   └── 002_verify.sql
├── docs/
│   ├── ADMIN_PREVIEWS.md
│   ├── BACKEND_API.md
│   ├── DATABASE_GUIDE.md
│   ├── FONT_GUIDE.md
│   ├── HOME_DESIGN.md
│   ├── INDEX.md
│   ├── LOGIN_DESIGN.md
│   ├── MAINTENANCE_PREVIEWS.md
│   ├── MANAGER_PREVIEWS.md
│   ├── MANAGER_WORKSPACE_DESIGN.md
│   ├── PROJECT_STRUCTURE.md
│   ├── PUBLIC_ASSETS.md
│   ├── SCRIPTS_GUIDE.md
│   ├── STATISTICS_VISUALIZATION.md
│   ├── STUDENT_PREVIEWS.md
│   ├── STUDENT_WORKSPACE_DESIGN.md
│   ├── TESTING_GUIDE.md
│   └── WORKSPACE_ROUTES.md
├── public/
│   └── assets/
│       ├── admin/
│       │   ├── pages/
│       │   │   ├── announcements-action-1-records.html
│       │   │   ├── announcements-action-1-submit.html
│       │   │   ├── announcements-action-1.html
│       │   │   ├── announcements-overview.html
│       │   │   ├── backup-action-1-records.html
│       │   │   ├── backup-action-1-submit.html
│       │   │   ├── backup-action-1.html
│       │   │   ├── backup-action-2-records.html
│       │   │   ├── backup-action-2-submit.html
│       │   │   ├── backup-action-2.html
│       │   │   ├── backup-action-3.html
│       │   │   ├── backup-overview.html
│       │   │   ├── base-data-action-1-records.html
│       │   │   ├── base-data-action-1-submit.html
│       │   │   ├── base-data-action-1.html
│       │   │   ├── base-data-action-2.html
│       │   │   ├── base-data-action-3.html
│       │   │   ├── base-data-overview.html
│       │   │   ├── billing-action-1-records.html
│       │   │   ├── billing-action-1-submit.html
│       │   │   ├── billing-action-1.html
│       │   │   ├── billing-action-2-records.html
│       │   │   ├── billing-action-2-submit.html
│       │   │   ├── billing-action-2.html
│       │   │   ├── billing-action-3.html
│       │   │   ├── billing-overview.html
│       │   │   ├── dispatch-action-1.html
│       │   │   ├── dispatch-action-2.html
│       │   │   ├── dispatch-action-3.html
│       │   │   ├── dispatch-overview.html
│       │   │   ├── notifications-action-1.html
│       │   │   ├── notifications-overview.html
│       │   │   ├── overview-overview.html
│       │   │   ├── permissions-action-1-records.html
│       │   │   ├── permissions-action-1-submit.html
│       │   │   ├── permissions-action-1.html
│       │   │   ├── permissions-action-2-authorizations.html
│       │   │   ├── permissions-action-2-authorize.html
│       │   │   ├── permissions-action-2-records.html
│       │   │   ├── permissions-action-2-submit.html
│       │   │   ├── permissions-action-2.html
│       │   │   ├── permissions-action-3.html
│       │   │   ├── permissions-overview.html
│       │   │   ├── personal-action-1.html
│       │   │   ├── personal-action-2.html
│       │   │   ├── personal-action-3.html
│       │   │   ├── personal-overview.html
│       │   │   ├── process-action-1-edit.html
│       │   │   ├── process-action-1.html
│       │   │   ├── process-action-2-edit.html
│       │   │   ├── process-action-2.html
│       │   │   ├── process-action-3-edit.html
│       │   │   ├── process-action-3.html
│       │   │   ├── process-action-4-edit.html
│       │   │   ├── process-action-4.html
│       │   │   ├── process-overview.html
│       │   │   ├── reports-action-1-filter.html
│       │   │   ├── reports-action-1.html
│       │   │   ├── reports-action-2-filter.html
│       │   │   ├── reports-action-2.html
│       │   │   ├── reports-action-3.html
│       │   │   ├── reports-action-4.html
│       │   │   └── reports-overview.html
│       │   ├── bridge.js
│       │   ├── demos.html
│       │   ├── entries.js
│       │   └── index.html
│       ├── home/
│       │   ├── assets/
│       │   │   ├── css/
│       │   │   │   ├── chinese-headings.css
│       │   │   │   ├── core.css
│       │   │   │   └── home.css
│       │   │   ├── draco/
│       │   │   │   ├── draco_decoder.js
│       │   │   │   ├── draco_decoder.wasm
│       │   │   │   └── draco_wasm_wrapper.js
│       │   │   ├── fonts/
│       │   │   │   ├── BerkeleyMono-Italic.woff2
│       │   │   │   ├── BerkeleyMono-Regular.woff2
│       │   │   │   ├── Digital-7MonoItalic.woff2
│       │   │   │   └── DINish[slnt,wdth,wght].woff2
│       │   │   ├── images/
│       │   │   │   ├── icons/
│       │   │   │   │   └── drop-down.svg
│       │   │   │   ├── anime-js-logo-v4.svg
│       │   │   │   └── favicon.png
│       │   │   ├── js/
│       │   │   │   ├── chunks/
│       │   │   │   │   ├── chunk-CKCSI7LY.js
│       │   │   │   │   ├── chunk-CPVC3KGU.js
│       │   │   │   │   ├── chunk-DCANE7XH.js
│       │   │   │   │   ├── chunk-FX45FQRC.js
│       │   │   │   │   ├── chunk-N6I4AEHZ.js
│       │   │   │   │   ├── chunk-WQVFBASJ.js
│       │   │   │   │   ├── chunk-WXAKRBIO.js
│       │   │   │   │   └── debug-CBQ742GO.js
│       │   │   │   ├── home.js
│       │   │   │   └── project-bridge.js
│       │   │   ├── json/
│       │   │   │   ├── easings.json
│       │   │   │   ├── project-brand.json
│       │   │   │   ├── project-developers.json
│       │   │   │   ├── project-invitation.json
│       │   │   │   ├── sponsors-github-sponsors.json
│       │   │   │   ├── sponsors-gold-sponsors.json
│       │   │   │   ├── sponsors-platinum-sponsors.json
│       │   │   │   └── sponsors-silver-sponsors.json
│       │   │   └── models/
│       │   │       ├── module-animate-01.glb
│       │   │       ├── module-draggable-01.glb
│       │   │       ├── module-draggable-02.glb
│       │   │       ├── module-easing-01.glb
│       │   │       ├── module-engine-01.glb
│       │   │       ├── module-renderer-01.glb
│       │   │       ├── module-scope-01.glb
│       │   │       ├── module-scroll-01.glb
│       │   │       ├── module-shield-01.glb
│       │   │       ├── module-shield-02.glb
│       │   │       ├── module-spring-01.glb
│       │   │       ├── module-stagger-01.glb
│       │   │       ├── module-stagger-02.glb
│       │   │       ├── module-svg-01.glb
│       │   │       ├── module-timeline-01.glb
│       │   │       ├── module-timeline-02.glb
│       │   │       ├── module-timer-01.glb
│       │   │       ├── module-timer-02.glb
│       │   │       ├── module-timer-03.glb
│       │   │       ├── module-timer-04.glb
│       │   │       ├── module-timer-05.glb
│       │   │       └── module-waapi-01.glb
│       │   ├── media/
│       │   │   └── pages/
│       │   │       └── sponsors/
│       │   │           ├── platinum-sponsors/
│       │   │           │   └── ef1c9c6c85-1787698629/
│       │   │           │       └── sponsor-placeholder.svg
│       │   │           └── silver-sponsors/
│       │   │               └── 49214d1e15-1787698629/
│       │   │                   └── testmu-ai-logomark.svg
│       │   ├── index.html
│       │   └── shortcuts.json
│       ├── login/
│       │   ├── assets/
│       │   │   ├── css/
│       │   │   │   ├── core.css
│       │   │   │   ├── learn.css
│       │   │   │   └── login-layout.css
│       │   │   ├── fonts/
│       │   │   │   ├── BerkeleyMono-Italic.woff2
│       │   │   │   ├── BerkeleyMono-Regular.woff2
│       │   │   │   ├── Digital-7MonoItalic.woff2
│       │   │   │   └── DINish[slnt,wdth,wght].woff2
│       │   │   ├── html/
│       │   │   │   └── waitlist.html
│       │   │   ├── images/
│       │   │   │   ├── icons/
│       │   │   │   │   └── drop-down.svg
│       │   │   │   ├── anime-js-logo-v4.svg
│       │   │   │   └── favicon.png
│       │   │   ├── js/
│       │   │   │   ├── chunks/
│       │   │   │   │   ├── chunk-DCANE7XH.js
│       │   │   │   │   ├── chunk-FX45FQRC.js
│       │   │   │   │   └── chunk-WXAKRBIO.js
│       │   │   │   ├── learn.js
│       │   │   │   ├── login-bridge.js
│       │   │   │   └── login-form.js
│       │   │   └── json/
│       │   │       ├── easings.json
│       │   │       ├── sponsors-github-sponsors.json
│       │   │       ├── sponsors-gold-sponsors.json
│       │   │       ├── sponsors-platinum-sponsors.json
│       │   │       └── sponsors-silver-sponsors.json
│       │   ├── media/
│       │   │   └── pages/
│       │   │       └── sponsors/
│       │   │           └── platinum-sponsors/
│       │   │               └── ef1c9c6c85-1787698629/
│       │   │                   └── sponsor-placeholder.svg
│       │   └── index.html
│       ├── maintenance/
│       │   ├── pages/
│       │   │   ├── analytics-action-1.html
│       │   │   ├── analytics-action-2.html
│       │   │   ├── analytics-action-3.html
│       │   │   ├── analytics-overview.html
│       │   │   ├── notifications-action-1.html
│       │   │   ├── notifications-overview.html
│       │   │   ├── orders-action-1.html
│       │   │   ├── orders-action-2.html
│       │   │   ├── orders-overview.html
│       │   │   ├── overview-overview.html
│       │   │   ├── personal-action-1.html
│       │   │   ├── personal-action-2.html
│       │   │   ├── personal-action-3.html
│       │   │   ├── personal-overview.html
│       │   │   ├── records-action-1.html
│       │   │   ├── records-action-2.html
│       │   │   ├── records-overview.html
│       │   │   ├── repair-action-1.html
│       │   │   ├── repair-action-2.html
│       │   │   ├── repair-action-3.html
│       │   │   └── repair-overview.html
│       │   ├── bridge.js
│       │   ├── demos.html
│       │   ├── entries.js
│       │   ├── index.html
│       │   └── preview-data.js
│       ├── manager/
│       │   ├── pages/
│       │   │   ├── accommodation-action-1.html
│       │   │   ├── accommodation-action-2.html
│       │   │   ├── accommodation-action-3.html
│       │   │   ├── accommodation-overview.html
│       │   │   ├── base-data-action-1.html
│       │   │   ├── base-data-action-2.html
│       │   │   ├── base-data-action-3.html
│       │   │   ├── base-data-overview.html
│       │   │   ├── beds-action-1.html
│       │   │   ├── beds-action-2.html
│       │   │   ├── beds-action-3.html
│       │   │   ├── beds-overview.html
│       │   │   ├── billing-action-1.html
│       │   │   ├── billing-action-2.html
│       │   │   ├── billing-action-3.html
│       │   │   ├── billing-overview.html
│       │   │   ├── notifications-action-1.html
│       │   │   ├── notifications-overview.html
│       │   │   ├── overview-overview.html
│       │   │   ├── personal-action-1.html
│       │   │   ├── personal-action-2.html
│       │   │   ├── personal-action-3.html
│       │   │   ├── personal-overview.html
│       │   │   ├── repair-review-action-1.html
│       │   │   ├── repair-review-action-2.html
│       │   │   ├── repair-review-action-3.html
│       │   │   └── repair-review-overview.html
│       │   ├── bridge.js
│       │   ├── demos.html
│       │   ├── entries.js
│       │   └── index.html
│       ├── shared/
│       │   ├── css/
│       │   │   ├── fonts/
│       │   │   │   ├── source-han-sans-sc-ui.css
│       │   │   │   └── source-han-sans-sc.css
│       │   │   └── account-button.css
│       │   ├── fonts/
│       │   │   ├── dinish.woff2
│       │   │   ├── SourceHanSansSC-Bold.woff2
│       │   │   ├── SourceHanSansSC-ExtraLight.woff2
│       │   │   ├── SourceHanSansSC-Heavy.woff2
│       │   │   ├── SourceHanSansSC-Light.woff2
│       │   │   ├── SourceHanSansSC-Medium.woff2
│       │   │   ├── SourceHanSansSC-Normal.woff2
│       │   │   ├── SourceHanSansSC-Regular.woff2
│       │   │   ├── SourceHanSansSC-UI-Bold.woff2
│       │   │   ├── SourceHanSansSC-UI-ExtraLight.woff2
│       │   │   ├── SourceHanSansSC-UI-Heavy.woff2
│       │   │   ├── SourceHanSansSC-UI-Light.woff2
│       │   │   ├── SourceHanSansSC-UI-Medium.woff2
│       │   │   ├── SourceHanSansSC-UI-Normal.woff2
│       │   │   └── SourceHanSansSC-UI-Regular.woff2
│       │   ├── images/
│       │   │   ├── avatars/
│       │   │   │   ├── pimnghi.jpg
│       │   │   │   └── rick137universe.jpg
│       │   │   ├── favicon.svg
│       │   │   ├── flight_shmms_white.svg
│       │   │   └── flight-logo.svg
│       │   └── js/
│       │       └── display-format.js
│       ├── statistics/
│       │   ├── easings.css
│       │   ├── index.html
│       │   └── statistics.css
│       └── student/
│           ├── assets/
│           │   ├── css/
│           │   │   ├── application-editor.css
│           │   │   ├── core.css
│           │   │   ├── docs.css
│           │   │   └── profile-editor.css
│           │   ├── fonts/
│           │   │   ├── BerkeleyMono-Italic.woff2
│           │   │   ├── BerkeleyMono-Regular.woff2
│           │   │   ├── Digital-7MonoItalic.woff2
│           │   │   └── DINish[slnt,wdth,wght].woff2
│           │   ├── html/
│           │   │   ├── documentation-demos.html
│           │   │   └── student-demos.html
│           │   ├── images/
│           │   │   ├── icons/
│           │   │   │   ├── drop-down.svg
│           │   │   │   └── triangle.svg
│           │   │   ├── anime-js-logo-v4.svg
│           │   │   └── favicon.png
│           │   ├── js/
│           │   │   ├── chunks/
│           │   │   │   ├── chunk-CPVC3KGU.js
│           │   │   │   ├── chunk-DCANE7XH.js
│           │   │   │   ├── chunk-E4BKOIOO.js
│           │   │   │   ├── chunk-FX45FQRC.js
│           │   │   │   ├── chunk-N6I4AEHZ.js
│           │   │   │   ├── chunk-WQVFBASJ.js
│           │   │   │   ├── chunk-WXAKRBIO.js
│           │   │   │   ├── demo-three-UEGN5M7G.js
│           │   │   │   └── three-BFD54ARY.js
│           │   │   ├── docs.js
│           │   │   ├── documentation-archive-map.js
│           │   │   ├── student-bridge.js
│           │   │   ├── student-entries.js
│           │   │   └── student-preview-data.js
│           │   └── json/
│           │       ├── easings.json
│           │       ├── sponsors-github-sponsors.json
│           │       ├── sponsors-gold-sponsors.json
│           │       ├── sponsors-platinum-sponsors.json
│           │       └── sponsors-silver-sponsors.json
│           ├── media/
│           │   └── pages/
│           │       └── sponsors/
│           │           ├── platinum-sponsors/
│           │           │   └── ef1c9c6c85-1787698629/
│           │           │       └── sponsor-placeholder.svg
│           │           └── silver-sponsors/
│           │               └── 49214d1e15-1787698629/
│           │                   └── testmu-ai-logomark.svg
│           ├── pages/
│           │   ├── accommodation-action-1/
│           │   │   ├── records.html
│           │   │   └── submit.html
│           │   ├── accommodation-action-2/
│           │   │   ├── records.html
│           │   │   └── submit.html
│           │   ├── accommodation-action-3/
│           │   │   ├── records.html
│           │   │   └── submit.html
│           │   ├── repair-action-1/
│           │   │   ├── records.html
│           │   │   └── submit.html
│           │   ├── repair-action-2/
│           │   │   ├── current.html
│           │   │   └── records.html
│           │   ├── repair-action-3/
│           │   │   ├── records.html
│           │   │   └── submit.html
│           │   ├── accommodation-action-1.html
│           │   ├── accommodation-action-2.html
│           │   ├── accommodation-action-3.html
│           │   ├── accommodation-overview.html
│           │   ├── announcements-action-1.html
│           │   ├── announcements-action-2.html
│           │   ├── announcements-overview.html
│           │   ├── notifications-action-1.html
│           │   ├── notifications-overview.html
│           │   ├── overview-overview.html
│           │   ├── payment-action-1.html
│           │   ├── payment-action-2.html
│           │   ├── payment-action-3.html
│           │   ├── payment-overview.html
│           │   ├── personal-action-1.html
│           │   ├── personal-action-2.html
│           │   ├── personal-action-3.html
│           │   ├── personal-overview.html
│           │   ├── repair-action-1.html
│           │   ├── repair-action-2.html
│           │   ├── repair-action-3.html
│           │   └── repair-overview.html
│           └── index.html
├── scripts/
│   ├── database/
│   │   ├── migrate.ts
│   │   ├── restore-check.ts
│   │   ├── seed.ts
│   │   └── setup-roles.ts
│   ├── fonts/
│   │   ├── prepare-chinese-font-previews.py
│   │   └── prepare-chinese-fonts.py
│   ├── lib/
│   │   └── env.ts
│   ├── runtime/
│   │   ├── jobs.ts
│   │   └── start.mjs
│   └── sync/
│       ├── sync-admin-shell.ts
│       ├── sync-home-shortcuts.ts
│       ├── sync-maintenance-shell.ts
│       ├── sync-manager-shell.ts
│       ├── sync-student-navigation.ts
│       └── sync-student-previews.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (main)/
│   │   │   └── workspace/
│   │   │       ├── [role]/
│   │   │       │   ├── [feature]/
│   │   │       │   │   └── [[...action]]/
│   │   │       │   │       └── page.tsx
│   │   │       │   └── page.tsx
│   │   │       └── route.ts
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── [...path]/
│   │   │           └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── DocsElements.tsx
│   │   │   ├── DocsPagination.tsx
│   │   │   └── NavigationReceipt.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   └── ThemeProvider.tsx
│   │   └── ui/
│   │       ├── BusinessPanel.module.css
│   │       ├── EmptyState.tsx
│   │       └── Warning.tsx
│   ├── constants/
│   │   ├── accounts.ts
│   │   ├── module-content.ts
│   │   ├── role-features.ts
│   │   └── workspace-actions.ts
│   ├── features/
│   │   ├── accommodation/
│   │   │   ├── components/
│   │   │   │   ├── ManagerAccommodationPage.tsx
│   │   │   │   ├── ManagerAccommodationReview.tsx
│   │   │   │   ├── StudentAccommodationRecords.tsx
│   │   │   │   └── StudentAccommodationSubmit.tsx
│   │   │   └── services/
│   │   │       └── student-accommodation-data.ts
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── AuthProvider.tsx
│   │   │   │   ├── LoginPage.module.css
│   │   │   │   └── LoginPage.tsx
│   │   │   └── server/
│   │   │       └── initial-account.ts
│   │   ├── backups/
│   │   │   └── components/
│   │   │       └── AdminBackupPage.tsx
│   │   ├── base-data/
│   │   │   ├── components/
│   │   │   │   ├── AdminBaseDataPage.tsx
│   │   │   │   ├── ManagerBaseDataEditor.tsx
│   │   │   │   ├── ManagerBedEditor.tsx
│   │   │   │   ├── ManagerBedsPage.tsx
│   │   │   │   └── ManagerResourcePage.tsx
│   │   │   ├── services/
│   │   │   │   ├── manager-bed-data.ts
│   │   │   │   └── manager-resource-data.ts
│   │   │   └── utils/
│   │   │       ├── admin-base-data.ts
│   │   │       └── manager-base-data.ts
│   │   ├── billing/
│   │   │   ├── components/
│   │   │   │   ├── AdminBillingPage.tsx
│   │   │   │   ├── ManagerBillingPage.tsx
│   │   │   │   └── StudentFinancePage.tsx
│   │   │   ├── server/
│   │   │   │   └── student-finance-preview.ts
│   │   │   └── services/
│   │   │       ├── manager-billing-data.ts
│   │   │       └── student-finance-data.ts
│   │   ├── home/
│   │   │   └── components/
│   │   │       ├── AnimeHome.module.css
│   │   │       └── AnimeHome.tsx
│   │   ├── notifications/
│   │   │   ├── components/
│   │   │   │   ├── AdminAnnouncementPage.tsx
│   │   │   │   └── StudentAnnouncementPage.tsx
│   │   │   └── services/
│   │   │       └── student-announcement-data.ts
│   │   ├── permissions/
│   │   │   └── components/
│   │   │       └── AdminPermissionPage.tsx
│   │   ├── personal/
│   │   │   └── components/
│   │   │       ├── StudentPasswordEditor.tsx
│   │   │       └── StudentProfileEditor.tsx
│   │   ├── repairs/
│   │   │   ├── components/
│   │   │   │   ├── AdminDispatchPage.tsx
│   │   │   │   ├── MaintenanceOrderPage.tsx
│   │   │   │   ├── MaintenanceProcessingEditor.tsx
│   │   │   │   ├── MaintenanceRecordEditor.tsx
│   │   │   │   ├── MaintenanceRecordPage.tsx
│   │   │   │   ├── ManagerRepairPage.tsx
│   │   │   │   ├── ManagerRepairReview.tsx
│   │   │   │   └── StudentRepairPage.tsx
│   │   │   ├── services/
│   │   │   │   ├── maintenance-record-data.ts
│   │   │   │   ├── manager-repair-data.ts
│   │   │   │   └── student-repair-data.ts
│   │   │   └── utils/
│   │   │       └── repair-notification.ts
│   │   ├── statistics/
│   │   │   ├── components/
│   │   │   │   ├── AdminReportPage.tsx
│   │   │   │   ├── MaintenanceAnalyticsPage.tsx
│   │   │   │   └── StatisticsPage.tsx
│   │   │   ├── config/
│   │   │   │   └── statistics-icons.json
│   │   │   └── utils/
│   │   │       ├── report-filters.ts
│   │   │       └── statistics-visualization.ts
│   │   ├── workflows/
│   │   │   └── components/
│   │   │       └── AdminProcessPage.tsx
│   │   └── workspace/
│   │       ├── components/
│   │       │   ├── AdminDocsPage.module.css
│   │       │   ├── AdminDocsPage.tsx
│   │       │   ├── LiveWorkspace.module.css
│   │       │   ├── LiveWorkspace.tsx
│   │       │   ├── MaintenanceDocsPage.module.css
│   │       │   ├── MaintenanceDocsPage.tsx
│   │       │   ├── ManagerDocsPage.module.css
│   │       │   ├── ManagerDocsPage.tsx
│   │       │   ├── StudentDocsPage.module.css
│   │       │   ├── StudentDocsPage.tsx
│   │       │   ├── WorkspacePage.module.css
│   │       │   └── WorkspacePage.tsx
│   │       ├── config/
│   │       │   ├── previews/
│   │       │   │   ├── admin-previews.json
│   │       │   │   ├── admin-random-previews.json
│   │       │   │   ├── maintenance-previews.json
│   │       │   │   ├── manager-previews.json
│   │       │   │   └── student-previews.json
│   │       │   ├── admin-pages.ts
│   │       │   ├── maintenance-pages.ts
│   │       │   ├── manager-pages.ts
│   │       │   ├── navigation-signals.ts
│   │       │   ├── student-docs.json
│   │       │   ├── student-modules.json
│   │       │   ├── student-pages.ts
│   │       │   ├── student-records.json
│   │       │   ├── student-repair-pages.json
│   │       │   └── student-submissions.json
│   │       ├── hooks/
│   │       │   └── useNavigationAttention.ts
│   │       ├── server/
│   │       │   └── navigation.ts
│   │       └── utils/
│   │           └── page-title.ts
│   ├── hooks/
│   │   ├── useDocsDocument.ts
│   │   └── useDocsSubmitFooter.ts
│   ├── lib/
│   │   ├── routing/
│   │   │   └── workspace-paths.ts
│   │   ├── db.ts
│   │   ├── errors.ts
│   │   └── security.ts
│   ├── services/
│   │   ├── server/
│   │   │   ├── api.ts
│   │   │   ├── jobs.ts
│   │   │   ├── resources.ts
│   │   │   ├── system.ts
│   │   │   ├── tasks.ts
│   │   │   └── workflows.ts
│   │   ├── api-client.ts
│   │   └── record-data.ts
│   ├── types/
│   │   ├── auth.ts
│   │   └── workspace.ts
│   └── utils/
│       ├── display-format.ts
│       └── workspace-route.ts
├── tests/
│   ├── checks/
│   │   ├── home-template.ts
│   │   ├── login-template.ts
│   │   ├── page-titles.ts
│   │   └── student-template.ts
│   ├── e2e/
│   │   ├── admin/
│   │   │   ├── announcements.ts
│   │   │   ├── backup.ts
│   │   │   ├── base-data.ts
│   │   │   ├── billing.ts
│   │   │   ├── dispatch.ts
│   │   │   ├── notifications.ts
│   │   │   ├── permissions.ts
│   │   │   ├── personal.ts
│   │   │   ├── process.ts
│   │   │   ├── repair-process.ts
│   │   │   ├── reports.ts
│   │   │   ├── shell.ts
│   │   │   └── statistics-visualization.ts
│   │   ├── dorm-manager/
│   │   │   ├── accommodation.ts
│   │   │   ├── base-data.ts
│   │   │   ├── beds.ts
│   │   │   ├── billing.ts
│   │   │   ├── notifications.ts
│   │   │   ├── personal.ts
│   │   │   ├── repairs.ts
│   │   │   └── shell.ts
│   │   ├── maintenance/
│   │   │   ├── analytics.ts
│   │   │   ├── notifications.ts
│   │   │   ├── orders.ts
│   │   │   ├── personal.ts
│   │   │   ├── processing.ts
│   │   │   ├── records.ts
│   │   │   └── shell.ts
│   │   ├── shared/
│   │   │   ├── auth-redirect.ts
│   │   │   ├── breadcrumbs.ts
│   │   │   ├── display-format.ts
│   │   │   ├── home-shortcuts.ts
│   │   │   ├── pagination.ts
│   │   │   ├── password-editor.ts
│   │   │   ├── transitions.ts
│   │   │   ├── workspace-entry.ts
│   │   │   └── workspace-paths.ts
│   │   └── student/
│   │       ├── accommodation-submit.ts
│   │       ├── accommodation.ts
│   │       ├── announcements.ts
│   │       ├── finance.ts
│   │       ├── navigation-badges.ts
│   │       ├── navigation.ts
│   │       ├── notifications.ts
│   │       ├── previews.ts
│   │       ├── profile-editor.ts
│   │       ├── profile.ts
│   │       ├── repair.ts
│   │       ├── suite.ts
│   │       └── themes.ts
│   ├── fixtures/
│   │   ├── home-template-source.json
│   │   ├── login-template-source.json
│   │   └── student-template-source.json
│   ├── integration/
│   │   ├── navigation.ts
│   │   └── student-finance-preview.ts
│   ├── runners/
│   │   ├── browser.ts
│   │   └── integration.ts
│   └── unit/
│       └── display-format.ts
├── .env.example
├── .env.local
├── .gitattributes
├── .gitignore
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
└── tsconfig.json
```

## 原有文件与新位置

本次共移动 111 个原有文件。下表左列是历史位置，右列是当前实现；原有函数、组件和配置内容通过新位置继续使用。

| 原位置 | 新位置 |
| --- | --- |
| `src/app/login/page.tsx` | `src/app/(auth)/login/page.tsx` |
| `src/app/workspace/[role]/[feature]/[[...action]]/page.tsx` | `src/app/(main)/workspace/[role]/[feature]/[[...action]]/page.tsx` |
| `src/app/workspace/[role]/page.tsx` | `src/app/(main)/workspace/[role]/page.tsx` |
| `src/app/workspace/route.ts` | `src/app/(main)/workspace/route.ts` |
| `src/components/auth/AuthProvider.tsx` | `src/features/auth/components/AuthProvider.tsx` |
| `src/components/home/AnimeHome.module.css` | `src/features/home/components/AnimeHome.module.css` |
| `src/components/home/AnimeHome.tsx` | `src/features/home/components/AnimeHome.tsx` |
| `src/components/theme/ThemeProvider.tsx` | `src/components/layout/ThemeProvider.tsx` |
| `src/components/workspace/AdminAnnouncementPage.tsx` | `src/features/notifications/components/AdminAnnouncementPage.tsx` |
| `src/components/workspace/AdminBackupPage.tsx` | `src/features/backups/components/AdminBackupPage.tsx` |
| `src/components/workspace/AdminBaseDataPage.tsx` | `src/features/base-data/components/AdminBaseDataPage.tsx` |
| `src/components/workspace/AdminBillingPage.tsx` | `src/features/billing/components/AdminBillingPage.tsx` |
| `src/components/workspace/AdminDispatchPage.tsx` | `src/features/repairs/components/AdminDispatchPage.tsx` |
| `src/components/workspace/AdminPermissionPage.tsx` | `src/features/permissions/components/AdminPermissionPage.tsx` |
| `src/components/workspace/AdminProcessPage.tsx` | `src/features/workflows/components/AdminProcessPage.tsx` |
| `src/components/workspace/AdminReportPage.tsx` | `src/features/statistics/components/AdminReportPage.tsx` |
| `src/components/workspace/BusinessPanel.module.css` | `src/components/ui/BusinessPanel.module.css` |
| `src/components/workspace/DocsPagination.tsx` | `src/components/common/DocsPagination.tsx` |
| `src/components/workspace/LiveWorkspace.module.css` | `src/features/workspace/components/LiveWorkspace.module.css` |
| `src/components/workspace/LiveWorkspace.tsx` | `src/features/workspace/components/LiveWorkspace.tsx` |
| `src/components/workspace/MaintenanceAnalyticsPage.tsx` | `src/features/statistics/components/MaintenanceAnalyticsPage.tsx` |
| `src/components/workspace/MaintenanceOrderPage.tsx` | `src/features/repairs/components/MaintenanceOrderPage.tsx` |
| `src/components/workspace/MaintenanceProcessingEditor.tsx` | `src/features/repairs/components/MaintenanceProcessingEditor.tsx` |
| `src/components/workspace/MaintenanceRecordEditor.tsx` | `src/features/repairs/components/MaintenanceRecordEditor.tsx` |
| `src/components/workspace/MaintenanceRecordPage.tsx` | `src/features/repairs/components/MaintenanceRecordPage.tsx` |
| `src/components/workspace/ManagerAccommodationPage.tsx` | `src/features/accommodation/components/ManagerAccommodationPage.tsx` |
| `src/components/workspace/ManagerAccommodationReview.tsx` | `src/features/accommodation/components/ManagerAccommodationReview.tsx` |
| `src/components/workspace/ManagerBaseDataEditor.tsx` | `src/features/base-data/components/ManagerBaseDataEditor.tsx` |
| `src/components/workspace/ManagerBedEditor.tsx` | `src/features/base-data/components/ManagerBedEditor.tsx` |
| `src/components/workspace/ManagerBedsPage.tsx` | `src/features/base-data/components/ManagerBedsPage.tsx` |
| `src/components/workspace/ManagerBillingPage.tsx` | `src/features/billing/components/ManagerBillingPage.tsx` |
| `src/components/workspace/ManagerRepairPage.tsx` | `src/features/repairs/components/ManagerRepairPage.tsx` |
| `src/components/workspace/ManagerRepairReview.tsx` | `src/features/repairs/components/ManagerRepairReview.tsx` |
| `src/components/workspace/ManagerResourcePage.tsx` | `src/features/base-data/components/ManagerResourcePage.tsx` |
| `src/components/workspace/NavigationReceipt.tsx` | `src/components/common/NavigationReceipt.tsx` |
| `src/components/workspace/StudentAccommodationRecords.tsx` | `src/features/accommodation/components/StudentAccommodationRecords.tsx` |
| `src/components/workspace/StudentAccommodationSubmit.tsx` | `src/features/accommodation/components/StudentAccommodationSubmit.tsx` |
| `src/components/workspace/StudentAnnouncementPage.tsx` | `src/features/notifications/components/StudentAnnouncementPage.tsx` |
| `src/components/workspace/StudentEmptyState.tsx` | `src/components/ui/EmptyState.tsx` |
| `src/components/workspace/StudentFinancePage.tsx` | `src/features/billing/components/StudentFinancePage.tsx` |
| `src/components/workspace/StudentPasswordEditor.tsx` | `src/features/personal/components/StudentPasswordEditor.tsx` |
| `src/components/workspace/StudentProfileEditor.tsx` | `src/features/personal/components/StudentProfileEditor.tsx` |
| `src/components/workspace/StudentRepairElements.tsx` | `src/components/common/DocsElements.tsx` |
| `src/components/workspace/StudentRepairPage.tsx` | `src/features/repairs/components/StudentRepairPage.tsx` |
| `src/components/workspace/StudentWarning.tsx` | `src/components/ui/Warning.tsx` |
| `src/components/workspace/useNavigationAttention.ts` | `src/features/workspace/hooks/useNavigationAttention.ts` |
| `src/data/accounts.ts` | `src/constants/accounts.ts` |
| `src/data/admin-pages.ts` | `src/features/workspace/config/admin-pages.ts` |
| `src/data/admin-previews.json` | `src/features/workspace/config/previews/admin-previews.json` |
| `src/data/admin-random-previews.json` | `src/features/workspace/config/previews/admin-random-previews.json` |
| `src/data/maintenance-pages.ts` | `src/features/workspace/config/maintenance-pages.ts` |
| `src/data/maintenance-previews.json` | `src/features/workspace/config/previews/maintenance-previews.json` |
| `src/data/manager-pages.ts` | `src/features/workspace/config/manager-pages.ts` |
| `src/data/manager-previews.json` | `src/features/workspace/config/previews/manager-previews.json` |
| `src/data/module-content.ts` | `src/constants/module-content.ts` |
| `src/data/navigation-signals.ts` | `src/features/workspace/config/navigation-signals.ts` |
| `src/data/role-features.ts` | `src/constants/role-features.ts` |
| `src/data/statistics-icons.json` | `src/features/statistics/config/statistics-icons.json` |
| `src/data/student-docs.json` | `src/features/workspace/config/student-docs.json` |
| `src/data/student-modules.json` | `src/features/workspace/config/student-modules.json` |
| `src/data/student-pages.ts` | `src/features/workspace/config/student-pages.ts` |
| `src/data/student-previews.json` | `src/features/workspace/config/previews/student-previews.json` |
| `src/data/student-records.json` | `src/features/workspace/config/student-records.json` |
| `src/data/student-repair-pages.json` | `src/features/workspace/config/student-repair-pages.json` |
| `src/data/student-submissions.json` | `src/features/workspace/config/student-submissions.json` |
| `src/data/workspace-actions.ts` | `src/constants/workspace-actions.ts` |
| `src/data/workspace-paths.ts` | `src/lib/routing/workspace-paths.ts` |
| `src/server/api.ts` | `src/services/server/api.ts` |
| `src/server/db.ts` | `src/lib/db.ts` |
| `src/server/errors.ts` | `src/lib/errors.ts` |
| `src/server/initial-account.ts` | `src/features/auth/server/initial-account.ts` |
| `src/server/jobs.ts` | `src/services/server/jobs.ts` |
| `src/server/navigation.ts` | `src/features/workspace/server/navigation.ts` |
| `src/server/resources.ts` | `src/services/server/resources.ts` |
| `src/server/security.ts` | `src/lib/security.ts` |
| `src/server/student-finance-preview.ts` | `src/features/billing/server/student-finance-preview.ts` |
| `src/server/system.ts` | `src/services/server/system.ts` |
| `src/server/tasks.ts` | `src/services/server/tasks.ts` |
| `src/server/workflows.ts` | `src/services/server/workflows.ts` |
| `src/styles/globals.css` | `src/app/globals.css` |
| `src/utils/admin-base-data.ts` | `src/features/base-data/utils/admin-base-data.ts` |
| `src/utils/admin-report-data.ts` | `src/features/statistics/utils/report-filters.ts` |
| `src/utils/auth-session.ts` | `src/services/api-client.ts` |
| `src/utils/maintenance-record-data.ts` | `src/features/repairs/services/maintenance-record-data.ts` |
| `src/utils/manager-base-data.ts` | `src/features/base-data/utils/manager-base-data.ts` |
| `src/utils/manager-bed-data.ts` | `src/features/base-data/services/manager-bed-data.ts` |
| `src/utils/manager-billing-data.ts` | `src/features/billing/services/manager-billing-data.ts` |
| `src/utils/manager-repair-data.ts` | `src/features/repairs/services/manager-repair-data.ts` |
| `src/utils/manager-resource-data.ts` | `src/features/base-data/services/manager-resource-data.ts` |
| `src/utils/page-title.ts` | `src/features/workspace/utils/page-title.ts` |
| `src/utils/repair-notification.ts` | `src/features/repairs/utils/repair-notification.ts` |
| `src/utils/statistics-visualization.ts` | `src/features/statistics/utils/statistics-visualization.ts` |
| `src/utils/student-accommodation-data.ts` | `src/features/accommodation/services/student-accommodation-data.ts` |
| `src/utils/student-announcement-data.ts` | `src/features/notifications/services/student-announcement-data.ts` |
| `src/utils/student-finance-data.ts` | `src/features/billing/services/student-finance-data.ts` |
| `src/utils/student-record-data.ts` | `src/services/record-data.ts` |
| `src/utils/student-repair-data.ts` | `src/features/repairs/services/student-repair-data.ts` |
| `src/views/auth/LoginPage.module.css` | `src/features/auth/components/LoginPage.module.css` |
| `src/views/auth/LoginPage.tsx` | `src/features/auth/components/LoginPage.tsx` |
| `src/views/home/AnimeHomePage.tsx` | `src/components/layout/AppShell.tsx` |
| `src/views/workspace/AdminDocsPage.module.css` | `src/features/workspace/components/AdminDocsPage.module.css` |
| `src/views/workspace/AdminDocsPage.tsx` | `src/features/workspace/components/AdminDocsPage.tsx` |
| `src/views/workspace/MaintenanceDocsPage.module.css` | `src/features/workspace/components/MaintenanceDocsPage.module.css` |
| `src/views/workspace/MaintenanceDocsPage.tsx` | `src/features/workspace/components/MaintenanceDocsPage.tsx` |
| `src/views/workspace/ManagerDocsPage.module.css` | `src/features/workspace/components/ManagerDocsPage.module.css` |
| `src/views/workspace/ManagerDocsPage.tsx` | `src/features/workspace/components/ManagerDocsPage.tsx` |
| `src/views/workspace/StatisticsPage.tsx` | `src/features/statistics/components/StatisticsPage.tsx` |
| `src/views/workspace/StudentDocsPage.module.css` | `src/features/workspace/components/StudentDocsPage.module.css` |
| `src/views/workspace/StudentDocsPage.tsx` | `src/features/workspace/components/StudentDocsPage.tsx` |
| `src/views/workspace/WorkspacePage.module.css` | `src/features/workspace/components/WorkspacePage.module.css` |
| `src/views/workspace/WorkspacePage.tsx` | `src/features/workspace/components/WorkspacePage.tsx` |
