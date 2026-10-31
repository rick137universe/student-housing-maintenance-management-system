# 项目文档索引

本目录只保留当前项目的开发、维护与验证说明。Markdown 文件统一采用 `UPPER_CASE_WITH_UNDERSCORES.md` 命名；项目运行方式与功能概览见[项目 README](../README.md)。

## 接口与页面

| 文档 | 用途 |
| --- | --- |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | 完整目录树、源码分层、迁移映射及验证结果 |
| [BACKEND_API.md](BACKEND_API.md) | 认证、权限、接口、事务、后台任务与备份恢复 |
| [WORKSPACE_ROUTES.md](WORKSPACE_ROUTES.md) | 四端现用页面地址及旧地址兼容规则 |
| [DATABASE_GUIDE.md](DATABASE_GUIDE.md) | 初始化、增量迁移、数据库角色与验证 |

## 页面设计与公共资源

| 文档 | 用途 |
| --- | --- |
| [HOME_DESIGN.md](HOME_DESIGN.md) | 首页独立文档、动画场景、真实入口与开发者区域 |
| [LOGIN_DESIGN.md](LOGIN_DESIGN.md) | 登录表单、认证衔接、单层窗口和原始资源保护 |
| [FONT_GUIDE.md](FONT_GUIDE.md) | 英文字体、中文字体、字重、预加载与字体生成 |
| [PUBLIC_ASSETS.md](PUBLIC_ASSETS.md) | 页面资源包、公共资源、Logo 及静态资源引用 |
| [STUDENT_WORKSPACE_DESIGN.md](STUDENT_WORKSPACE_DESIGN.md) | 工作台三栏结构、学生业务呈现和四端共用约定 |
| [MANAGER_WORKSPACE_DESIGN.md](MANAGER_WORKSPACE_DESIGN.md) | 宿管页面适配、审核、床位及账单核对 |
| [STATISTICS_VISUALIZATION.md](STATISTICS_VISUALIZATION.md) | 管理员统计页面布局、统计口径、筛选和图表 |

## 动画预览配置

| 文档 | 用途 |
| --- | --- |
| [STUDENT_PREVIEWS.md](STUDENT_PREVIEWS.md) | 学生预览、账单计数和四端共用的个人资料及消息动画 |
| [MANAGER_PREVIEWS.md](MANAGER_PREVIEWS.md) | 宿管预览配置与 Stagger 分配 |
| [MAINTENANCE_PREVIEWS.md](MAINTENANCE_PREVIEWS.md) | 维修预览和本人工作量、完成率及评分动画 |
| [ADMIN_PREVIEWS.md](ADMIN_PREVIEWS.md) | 管理员指定预览与固定分配表 |

## 目录维护

脚本按数据库维护、运行入口、静态页面同步、字体处理和公共工具分类，逐项用途及执行方式见 [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md)。

测试按编排入口、接口集成、静态检查、纯函数检查和按角色组织的浏览器回归分类，见 [TESTING_GUIDE.md](TESTING_GUIDE.md)。

- 页面清单位于 `src/features/workspace/config/*-pages.ts`，URL 规则位于 `src/lib/routing/workspace-paths.ts`，动画映射位于 `src/features/workspace/config/previews/`。更改对应配置时同步维护相关文档。
- 母版资源摘要与结构校验清单位于 `tests/fixtures/`：[首页](../tests/fixtures/home-template-source.json)、[登录页](../tests/fixtures/login-template-source.json)、[学生工作台](../tests/fixtures/student-template-source.json)。它们是测试输入，保留原名和校验内容，不参与日常页面运行。
- 项目 README 使用的 Logo 统一保存在 `public/assets/shared/images/flight-logo.svg`；文档目录不再另存静态素材。
- 文档目录只保存维护文档及其引用图片。浏览器回归截图输出到根目录的 `test-results/screenshots/`，本机 PostgreSQL 测试实例及日志保存在 `.local/postgres/`，两者均不纳入版本控制。
- 旧模拟页面脚本和一次性布局快照已移到 `temp/legacy-qa/` 临时留档，不属于当前测试；当前回归入口为 `tests/`。本机旧测试实例的用途及启动方式见[数据库说明](DATABASE_GUIDE.md#本机历史测试实例)。
- 旧模拟首页需求说明及已完成的一次性文件筛查报告、配套审计 JSON 已移除。当前功能以项目 README、实际代码和上述维护文档为准。
