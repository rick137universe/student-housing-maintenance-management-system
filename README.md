# Dorma · 学生公寓住宿与报修管理系统前端

> **公共业务首页第一版（2026-10-11）：** 保留 Anime Clone 的原镜头动画、段落顺序、时序及分辨率，公共介绍分为系统介绍、住宿服务、报修服务、信息与提醒。顶部与末尾的登录入口复用演示登录；登录后进入当前身份的第一个功能。赞助区域及部分原页脚暂时保留。

Dorma 是面向学生、宿管人员、维修人员和系统管理员的校园住宿服务**前端演示项目**。当前版本具备四类身份的登录演示、20 个功能分组和 57 个操作入口。公共首页展示通用服务场景；登录后进入当前身份专属的业务详情页，左侧菜单直接访问授权功能。

> **当前阶段：可运行的交互原型。** 页面中的账号、账单、床位、工单和统计指标来自前端模拟数据。部分操作能更新当前页面状态，但没有真实身份认证、业务 API、数据库持久化或支付、备份服务。功能入口数量不代表业务流程已经完成。

本文档依据 2026-10-11 的仓库代码编写，描述当前可从首页进入的版本。早期设计、旧版组件和一次性脚本集中在 `archive/`；它们不参与当前应用构建。早期 QA 截图保留在 Git 历史中，新的本地 QA 产物放在被忽略的 `docs/qa/`。

## 开发语言与技术栈

| 类别 | 当前使用情况 |
| --- | --- |
| TypeScript / TSX | 主要开发语言；用于 Next.js 页面、React 组件、演示数据、类型定义和 `next.config.ts`。 |
| CSS | `src/styles/globals.css` 提供全局样式；各功能目录中的 `*.module.css` 提供组件级样式。 |
| JavaScript / JSON | `.mjs` 文件配置 ESLint 和 PostCSS；`package.json`、`tsconfig.json` 等管理依赖和工具配置。原动画通过 `public/assets/js/home.js` 及其分包加载。 |
| HTML / SVG | 业务页面使用 TSX；公共首页保留捕获的 HTML 模板、SVG 与 WebGL 场景。 |

当前应用基于 **Next.js 16.3.5（App Router）**、**React 19.2.4** 和 **TypeScript 5**。样式主要使用 CSS Modules，并通过 PostCSS 接入 **Tailwind CSS 4**；界面图标使用 **Lucide React**。公共首页使用原生 Anime.js / Three.js WebGL 运行资源、SVG 与 CSS 动画，保持原时序和分辨率；稳定的页面属性隔离样式，避免逐帧进行昂贵的关系选择器匹配。演示登录使用浏览器 `sessionStorage`，主题选择使用 `localStorage`。

仓库还配置了 shadcn 组件生成器，并保留一个基于 Base UI 的按钮组件；当前业务页面未引用该按钮。公共首页的动画运行时已打包在 `public/assets/js/`，配套资源包括字体、图片、GLB 模型和 Draco 解码文件；React 接入组件负责启动原脚本及连接登录入口。根布局保留已启动的首页场景，隐藏时暂停引擎；详情页外壳也由根布局保留，跨功能只更新业务内容，避免导航重新挂载。项目目前只有前端演示代码，没有后端服务、数据库或正式 API 集成。开发环境要求 Node.js 24 或以上，使用 npm 和 `package-lock.json` 管理依赖；ESLint、TypeScript 类型检查与 Next.js 构建用于代码验证。

## 本地运行与检查

需要 Node.js 24 或以上，依赖版本由 `package-lock.json` 锁定。

```powershell
npm ci
npm run dev -- --port 3100
```

浏览器打开 <http://localhost:3100>。生产构建与代码检查使用：

```powershell
npm run check
```

该命令依次执行 ESLint、TypeScript 类型检查和 Next.js 生产构建。也可分别运行 `npm run lint`、`npm run typecheck`、`npm run build`。当前 `next.config.ts` 启用了 `output: "standalone"`，但 `npm run start` 仍调用 `next start`，运行时会出现不兼容提示；生产部署应使用构建生成的 `.next/standalone/server.js`，并按 Next.js 的 standalone 部署说明提供静态资源。

本次版本执行 `npm run check` 并进行浏览器回归：四类身份登录、全部 57 个操作入口、刷新与浏览器前进后退、退出登录和跨角色访问拦截；检查桌面与手机布局、主题切换及返回首页的动画初始化。这些检查不代表完整业务链路或后端权限已实现。

## 如何体验当前版本

点击首页顶部「登录」或首屏「登录工作台」，选择身份自动填入演示账号，再点击登录。有演示会话时顶部显示「进入工作台」。四个演示账号的密码均为 `Dorma2026`：

| 身份 | 用户名 | 工作台功能分组 |
| --- | --- | ---: |
| 学生 | `202602341` | 5 |
| 宿管人员 | `dm0301` | 5 |
| 维修人员 | `wx008` | 4 |
| 系统管理员 | `admin` | 6 |

登录成功后进入当前身份第一个功能的第一个操作。工作台采用左侧角色功能菜单、右侧业务内容的布局，手机端通过「功能菜单」展开导航。详情页地址保持 `/workspace/{role}/{feature}/{action}`，例如 `/workspace/student/repair/action-1` 是学生「提交报修」页。工作台内部使用无刷新路由切换，左侧导航保持挂载，支持刷新及浏览器前进后退；首页与工作台之间使用客户端路由切换。原首页场景由根布局保留，离开时暂停引擎及滚动回调，返回时恢复，避免重新加载动画资源。公共首页不展示角色专属数据或管理操作。

工作台顶部支持「跟随系统 / 浅色 / 深色」主题；公共首页保留原动画的深色外观；工作台浅色模式使用黑白灰。主题选项保存在浏览器 `localStorage`；演示身份保存在 `sessionStorage`，退出登录或结束当前浏览器会话后需要重新登录。详情页有基于演示角色的前端访问拦截，但它不构成正式系统的权限保护。

## 功能进展

下表以**当前可从首页进入的界面**为准。「局部交互」表示页面内能看到状态变化，通常在刷新后丢失；「表单演示」表示能填写并得到提示，但不生成真实业务记录；「列表展示」表示可查看模拟数据，部分列表支持关键词搜索。

| 身份 | 功能分组 | 当前已有的能力 | 主要待完成事项 |
| --- | --- | --- | --- |
| 学生 | 个人信息 | 查看资料；修改资料、密码表单演示 | 资料未完整保存，密码不影响登录凭证 |
| 学生 | 住宿业务 | 入住、调宿、退宿申请表单演示 | 申请记录、审核进度、床位联动 |
| 学生 | 缴费管理 | 查看账单、模拟缴费、缴费记录展示 | 支付接入；缴费状态与账单、记录、统计同步 |
| 学生 | 报修服务 | 报修表单、固定进度时间线、星级评价局部交互 | 新工单生成、跨角色流转、真实进度与评价关联 |
| 学生 | 公告查看 | 公寓通知和缴费提醒列表 | 公告详情、阅读状态与通知服务 |
| 宿管人员 | 基础信息 | 学生、房间、床位列表 | 数据增删改与关联校验 |
| 宿管人员 | 住宿事务 | 入住分配、退宿登记表单；调宿申请列表 | 真实审核、入住退宿记录与床位变化 |
| 宿管人员 | 床位状态 | 床位总览、状态更新表单、异常列表 | 状态持久化、重复分配及异常校验 |
| 宿管人员 | 报修初审 | 待初审、上报、驳回记录列表 | 逐单审核、上报和驳回操作 |
| 宿管人员 | 账单核对 | 账单、欠费、催缴记录列表 | 核对确认、催缴发送与结果更新 |
| 维修人员 | 工单接收 | 固定工单的查看、确认接单及局部状态更新 | 接收真实派工与持久化 |
| 维修人员 | 维修处理 | 开始维修、更新状态、确认完工的局部交互 | 完整字段保存、状态约束、与学生进度同步 |
| 维修人员 | 维修记录 | 填写记录并在归档页查看本次记录 | 持久化、与工单及完工状态关联 |
| 维修人员 | 个人统计 | 工作量、完成率和评价展示 | 从实际工单与评价计算指标 |
| 系统管理员 | 基础数据 | 模拟数据列表、CSV 文件选择、演示数据 CSV 下载 | 导入解析与校验、数据维护接口 |
| 系统管理员 | 流程管控 | 分床、住宿、缴费规则配置表单 | 规则保存及在业务流程中生效 |
| 系统管理员 | 报修派工 | 待派工列表、人工选择维修人员的表单 | 实际派工、匹配规则及工单同步 |
| 系统管理员 | 统计报表 | 固定指标、维修统计、演示数据 CSV 下载 | 实时统计、筛选与报表生成 |
| 系统管理员 | 权限管理 | 账号与审计列表、角色权限表单 | 账号管理、后端授权及真实审计 |
| 系统管理员 | 备份恢复 | 策略表单、模拟备份状态和恢复点列表 | 真实备份任务、校验及恢复 |

**目前没有跨角色的完整业务链路。** 例如，学生提交报修不会自动进入宿管初审；管理员的演示派工不会进入维修人员工单；维修完工也不会更新学生的进度。入住、调宿和退宿同样不会改变床位数据。

一些局部交互也尚未共享状态：学生点击「确认模拟缴费」后，该页面显示「已缴清」，但「本月待缴」指标和「缴费记录」仍展示原来的模拟数据。后续对接需要明确统一的数据来源和操作后的刷新规则。

## 项目结构与文件定位

源码按文件职责分类，以路由、页面、组件、数据、工具、样式为入口。`app/` 遵循 Next.js App Router 约定；其余分类是本项目的维护约定，并非框架强制结构。

```text
项目根目录/
├─ src/
│  ├─ app/                     路由入口、根布局与 favicon.ico
│  │  └─ workspace/[role]/[feature]/[[...action]]/
│  ├─ views/                   页面主体，组合组件与页面状态
│  │  ├─ home/                 AnimeHomePage.tsx；保留旧 HomePage.tsx
│  │  └─ workspace/            WorkspacePage.tsx 及页面样式
│  ├─ components/              界面组件及紧邻组件的 CSS Modules
│  │  ├─ auth/                 LoginDialog 登录弹层
│  │  ├─ home/                 AnimeHome.tsx 原页面接入；保留 Lens 组件
│  │  ├─ workspace/            业务表单、列表、切换组件及共用样式
│  │  ├─ theme/                ThemeProvider、useTheme、ThemeSelect
│  │  └─ ui/                   shadcn 基础组件
│  ├─ data/                    演示账号、模拟内容、角色菜单
│  │  └─ graphics/             route-path.ts、sphere-paths.ts
│  ├─ utils/                   demo-session.ts、class-names.ts
│  └─ styles/                  globals.css 与 anime-*.css
├─ public/assets/              原动画 JS 分包、模型、图片、字体与解码文件
├─ docs/                       当前文档，requirements-map.md 为需求映射
├─ archive/                    历史资料，不参与当前应用构建
│  ├─ README.md                归档索引及使用边界
│  ├─ src/                     历史原型源码
│  ├─ docs/                    历史研究、设计说明与 output-plan.json
│  ├─ scripts/                 历史一次性脚本
│  └─ assets/images/
│     ├─ reference/            原参考截图
│     └─ revision-2/           第二版设计截图
├─ README.md
└─ 标准工具配置文件
```

| 要修改的内容 | 文件入口 |
| --- | --- |
| 公共首页入口、文案与登录连接 | `src/views/home/AnimeHomePage.tsx`、`src/data/anime-home-markup.ts`、`src/components/home/AnimeHome.tsx` |
| 公共首页原动画与样式 | `public/assets/js/home.js` 及分包、`src/styles/anime-*.css`；旧 Lens 组件保留 |
| 登录弹层与演示身份 | `src/components/auth/LoginDialog.tsx`、`src/data/accounts.ts` |
| 业务路由解析、角色访问拦截与左侧菜单 | `src/views/workspace/WorkspacePage.tsx` |
| 通用表单与列表 | `src/components/workspace/ActionWorkspace.tsx` |
| 学生报修、维修人员工单交互 | `src/components/workspace/RepairWorkspace.tsx`、`MaintenanceWorkspace.tsx` |
| 角色菜单、功能及操作 ID | `src/data/role-features.ts` |
| 通用模拟业务内容 | `src/data/module-content.ts` |
| 演示会话存取 | `src/utils/demo-session.ts` |
| 主题状态和主题选择控件 | `src/components/theme/ThemeProvider.tsx` |
| 全局样式、类名合并工具 | `src/styles/globals.css`、`src/utils/class-names.ts` |

`src/app/` 只承接路由、布局和框架约定资源，页面主体从 `views/` 导入。路由嵌套对应实际 URL，不为减少层级而压平。旧版 `RolePortal`、`ModulePage`、`ResidenceEngine` 等源码统一保存在 `archive/src/`，具体内容参见 [归档索引](archive/README.md)。

命名与引用约定：React 页面和组件使用 PascalCase（例如 `WorkspacePage.tsx`）；普通数据、工具文件使用 kebab-case（例如 `demo-session.ts`）；组件和页面样式使用同名 `*.module.css` 并紧邻使用者，工作台共用样式为 `BusinessPanel.module.css`。Next.js 的 `page.tsx`、`layout.tsx` 等约定文件名保持不变。跨分类导入使用 `@/`，同目录引用使用相对路径；shadcn 的样式和工具别名在 `components.json` 中同步配置。只有实际出现相应代码时才新增 `api`、`services`、`hooks`、`types` 等目录。

根目录的 `.ts`、`.json`、`.mjs` 是文件格式，不是统一的职责分类。`package.json`、锁文件及 Next.js、TypeScript、ESLint、PostCSS、shadcn 配置保留在根目录，遵循工具的常见发现方式；README、`.gitignore`、工具指令文件也保留在此处。自动生成的 `next-env.d.ts`、依赖、构建结果和本地 QA 产物由 `.gitignore` 排除。

网站字体放在 `public/assets/fonts/`，原动画图片位于 `public/assets/images/`，模型位于 `public/assets/models/`。favicon 依照 Next.js 图标约定留在 `src/app/`，TSX 中的 SVG 动画继续作为源码维护。历史参考图统一放在 `archive/assets/images/`，与网站公开资源分开。

## 已知边界与后续对接

- **认证与授权：** 账号密码硬编码在前端，`sessionStorage` 只保存角色标识。正式系统需要后端认证、会话管理和服务端数据权限校验。
- **业务数据：** 当前列表、指标和部分时间线由 `src/data/module-content.ts`、`src/components/workspace/ActionWorkspace.tsx` 及各业务组件内的固定数据提供；页面修改大多不会持久化。
- **状态流转：** 需统一住宿申请、床位、报修工单和账单的状态定义，并确定每个角色的可执行操作及操作后的数据变化。
- **外部服务：** 在线缴费、消息催缴、批量导入、真实派工、备份恢复尚未接入相应服务。CSV 导出仅下载前端演示数据。
- **生产启动配置：** `package.json` 中的 `start` 脚本与 `next.config.ts` 的 standalone 输出不一致，后续应统一部署方式并验证生产启动。
- **测试与文档：** `archive/scripts/` 中的早期 QA 脚本含作者机器上的绝对 Playwright 路径与旧版页面选择器，已归档且不作为当前验收命令。`docs/qa/` 用于本地生成的截图和结果，已从 Git 跟踪中移除。当前版本尚缺可跨机器运行的完整业务验收测试，以及接口、字段、权限和状态流转文档。

协作时，先以 `src/data/role-features.ts` 作为当前菜单与路径的入口清单；修改功能 ID 或操作 ID 时同步检查详情页链接。新增业务数据和接口前，建议先约定各角色共用的记录 ID、状态、字段及更新规则，再逐条打通业务链路。提交前运行 `npm run check`；若改动了交互或样式，还需按实际入口在浏览器复核。
