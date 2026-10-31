# 项目脚本指南

`scripts/` 中的 15 个文件均服务于当前项目的运行或开发维护，全部保留。按职责分为数据库维护、运行入口、静态页面同步、字体处理和公共工具；本次分类仅调整路径和引用，未改变脚本实现或增加依赖。

所有命令均在项目根目录执行。常用 npm 命令名称保持不变，`package.json` 已指向新位置。

## 数据库维护

| 文件 | 用途 | 执行入口 |
| --- | --- | --- |
| [database/migrate.ts](../scripts/database/migrate.ts) | 初始化结构、执行增量迁移与校验已执行版本 | `npm run db:migrate` |
| [database/seed.ts](../scripts/database/seed.ts) | 显式初始化样例数据，重复执行保留已有业务记录 | `npm run db:seed` |
| [database/setup-roles.ts](../scripts/database/setup-roles.ts) | 配置数据库角色、权限及本机连接凭据 | `npx tsx scripts/database/setup-roles.ts` |
| [database/restore-check.ts](../scripts/database/restore-check.ts) | 校验登记的隔离恢复数据库 | `npm run restore:check -- <恢复库名>` |

这些脚本使用 `.env.local` 或进程环境中的数据库连接。集成测试会在独立测试库中调用迁移、初始化及后台任务入口。数据库结构与执行顺序见 [DATABASE_GUIDE.md](DATABASE_GUIDE.md)。

## 运行入口

| 文件 | 用途 | 执行入口 |
| --- | --- | --- |
| [runtime/start.mjs](../scripts/runtime/start.mjs) | 准备静态资源并启动 Next.js standalone 生产服务 | 先 `npm run build`，再 `npm start` |
| [runtime/jobs.ts](../scripts/runtime/jobs.ts) | 执行账单调度、备份和隔离恢复任务 | `npm run jobs` 或 `npm run jobs:once` |

后台任务与网页服务分别启动，业务实现仍保存在 `src/services/server/`。生产运行方式见 [BACKEND_API.md](BACKEND_API.md)。

## 静态页面与预览同步

| 文件 | 用途 |
| --- | --- |
| [sync/sync-student-navigation.ts](../scripts/sync/sync-student-navigation.ts) | 按学生页面清单同步导航、页面片段、路由适配及预览 |
| [sync/sync-student-previews.ts](../scripts/sync/sync-student-previews.ts) | 根据学生动画配置更新预览，可单独执行，也由导航同步调用 |
| [sync/sync-manager-shell.ts](../scripts/sync/sync-manager-shell.ts) | 生成宿管外壳、页面片段、页面清单及预览 |
| [sync/sync-maintenance-shell.ts](../scripts/sync/sync-maintenance-shell.ts) | 生成维修人员外壳、页面片段、页面清单及预览 |
| [sync/sync-admin-shell.ts](../scripts/sync/sync-admin-shell.ts) | 生成管理员外壳、页面片段、页面清单及预览 |
| [sync/sync-home-shortcuts.ts](../scripts/sync/sync-home-shortcuts.ts) | 根据四端页面清单生成首页入口及主题色数据 |

页面配置调整后按需执行相应脚本，例如：

```powershell
npx tsx scripts/sync/sync-student-previews.ts
npx tsx scripts/sync/sync-home-shortcuts.ts
```

完整同步时先更新学生导航，再更新依赖学生副本的其他三端外壳，最后更新首页入口。学生导航生成仍使用脚本中 `mother` 指定的本机只读母版目录；当前值为 `D:/Development/Anime.js/public/sites/animejs-com-23cc7dc7/`。部署和日常启动使用已经生成的 `public/assets/`，不执行这些生成脚本，也不需要该外部目录。

## 字体处理

| 文件 | 用途 |
| --- | --- |
| [fonts/prepare-chinese-fonts.py](../scripts/fonts/prepare-chinese-fonts.py) | 将外部的七字重 OTF 转换为完整 WOFF2，并核对字符映射和字重 |
| [fonts/prepare-chinese-font-previews.py](../scripts/fonts/prepare-chinese-font-previews.py) | 从完整 WOFF2 生成包含 GB2312 及界面文字的轻量子集和 CSS |

这两个文件属于资源维护工具，执行时使用已安装 `fonttools[woff]` 的 Python。原始 OTF 在项目外部提供，已有 WOFF2 可以直接生成界面子集；日常启动无需重新转换字体。命令及字重说明见 [FONT_GUIDE.md](FONT_GUIDE.md)。

## 公共工具

[lib/env.ts](../scripts/lib/env.ts) 由数据库脚本、任务脚本和集成测试导入，用于加载 `.env.local` 并检查必要连接配置，不作为独立命令执行。
