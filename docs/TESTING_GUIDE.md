# 测试目录与执行指南

测试使用现有 TypeScript、Node.js `assert`、Playwright 和 Microsoft Edge，保留全部 59 个测试文件及 3 份 fixtures。本次整理仅调整文件位置、名称和引用，原有函数导出名称、断言、用例顺序及执行参数保持不变，未引入新的测试框架或依赖。

## 目录职责

```text
tests/
├── runners/            2 个：集成与浏览器测试编排入口
├── integration/        2 个：导航接口、学生缴费预览数据库检查
├── unit/               1 个：日期与金额格式化纯函数检查
├── checks/             4 个：标题、首页、登录及学生母版静态检查
├── e2e/
│   ├── shared/         9 个：跨角色用例与共用交互检查
│   ├── student/        13 个：学生业务回归
│   ├── dorm-manager/   8 个：宿管业务回归
│   ├── maintenance/    7 个：维修人员业务回归
│   └── admin/          13 个：管理员业务与统计可视化回归
└── fixtures/           3 份：母版资源摘要与结构清单
```

`runners/integration.ts` 负责创建一次性数据库、迁移及初始化数据、启动测试服务、执行接口检查，并在结束后停止服务和清理已登记的测试及恢复数据库。`runners/browser.ts` 导出浏览器回归编排函数，由集成入口调用，复用该独立环境。

`integration/navigation.ts` 使用集成入口提供的会话与数据库，检查四端提醒、个人阅读记录及越权拒绝。`integration/student-finance-preview.ts` 是独立数据库检查，通过事务内临时表验证缴费预览汇总与角色权限，结束后回滚。

`checks/` 集中保存母版文件摘要、结构及页面标题检查。四端外壳文件还包含与其浏览器用例共用的结构校验函数，继续放在对应角色模块中，避免为分类拆写现有测试。

`e2e/shared/` 包含认证跳转、首页入口、显示格式、分页、路由兼容、延迟加载及跨角色共用的面包屑、动画切换和密码编辑检查。为保持现有调用方式，共用函数的导出名称仍可包含 `Student` 或 `student`。

`e2e/admin/statistics-visualization.ts` 同时保存统计工具的纯函数检查和真实浏览器回归，维持原有组合方式。`unit/display-format.ts` 的纯函数检查由显示格式浏览器用例调用。

## 常用执行方式

所有命令均从项目根目录执行。npm 命令名称不变，内部已指向 `tests/runners/integration.ts`：

| 命令 | 用途 |
| --- | --- |
| `npm run test:integration` | 独立数据库、接口、事务、权限、备份与隔离恢复检查 |
| `npm run test:e2e` | 上述集成检查及完整浏览器回归 |
| `npm run test:integration -- --navigation-browser` | 集成检查及四端导航提醒浏览器回归 |
| `npm run test:integration -- --repair-browser` | 集成检查及报修流程配置浏览器回归 |
| `npm run test:integration -- --format-browser` | 集成检查及显示格式、账单与公告浏览器回归 |
| `npm run test:integration -- --statistics-browser` | 集成检查及统计可视化浏览器回归 |

这些参数可以组合使用。数据库及 PostgreSQL 工具配置见 [DATABASE_GUIDE.md](DATABASE_GUIDE.md)，脚本入口见 [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md)。浏览器回归使用本机 Microsoft Edge。

两个独立检查仍可单独执行：

```powershell
node --import tsx tests/checks/page-titles.ts
node --env-file=.env.local --import tsx tests/integration/student-finance-preview.ts
```

类型检查继续覆盖全部子目录，ESLint 也检查这些测试文件：

```powershell
npm run typecheck
npm run lint
```

## Fixtures 与测试输出

`fixtures/home-template-source.json`、`fixtures/login-template-source.json` 和 `fixtures/student-template-source.json` 分别由 `checks/` 中对应母版检查读取，目录和母版原始资源摘要保持不变。公共资源整理时，仅在确认页面差异来自资源 URL 后，更新首页与登录页的四个项目页眉、页脚快照摘要，见 [PUBLIC_ASSETS.md](PUBLIC_ASSETS.md)。它们是测试输入；页面源码和静态资源继续保存在 `src/` 与 `public/`。

截图输出到被忽略的 `test-results/screenshots/`；隔离测试备份输出到 `temp/` 下的本次测试目录。测试目录不保存运行结果或本机数据库文件。

## 维护约定

新增测试按其执行层级及业务角色归类，共用交互检查放在 `e2e/shared/`。角色目录中的文件省略重复角色前缀，例如 `e2e/admin/billing.ts`、`e2e/student/finance.ts`。

各子用例通过现有编排函数执行，避免单独运行依赖集成数据库和会话的浏览器函数。路径调整时同步更新静态与动态导入、npm 入口、文档链接，并核对 fixtures 和现有断言。
