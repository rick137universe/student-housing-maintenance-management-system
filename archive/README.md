# 早期原型资料

`src/demo-workspace/` 保存后端接入前的三个模拟业务组件。现用工作台已统一使用 `src/components/workspace/LiveWorkspace.tsx` 调用真实后端，这些归档组件不参与构建。

此目录保存历史设计参考和实验实现，不参与当前应用构建和日常验证。当前页面主体位于仓库的 `src/views/`，界面组件位于 `src/components/`。

| 目录 | 内容 |
| --- | --- |
| [src/](src/) | 旧版 3D 公寓、工作台组件、样式及模拟数据 |
| [docs/](docs/) | 早期提取结果、设计说明、输出计划和第二版方案 |
| [scripts/](scripts/) | 历史生成、修补和 QA 一次性脚本 |
| [assets/images/reference/](assets/images/reference/) | 六张原参考截图及 source-hero.jpg、source-ready.jpg |
| [assets/images/revision-2/](assets/images/revision-2/) | 第二版设计的八张截图 |

`src/RolePortal.tsx`、`src/ModulePage.tsx` 和 `src/workspace-data.ts` 保存旧版工作台；现用登录组件与模拟数据分别位于仓库的 `src/components/auth/`、`src/data/`。

归档源码和脚本保留历史导入及作者机器上的绝对路径，不作为可运行工具，不要在当前代码上直接运行。`docs/output-plan.json` 的本地资料位置已更新，但其中原始开发环境信息仍仅用于历史参考。文档中的历史实现描述不代表当前功能。

归档图片集中在本目录的 `assets/images/`，不会作为网站公开资源。旧 QA 结果可以从 Git 历史查看；新生成的截图、脚本和结果放在仓库被忽略的 `docs/qa/`。
