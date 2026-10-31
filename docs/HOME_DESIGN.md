# 首页设计与维护

首页地址为 `/`。`src/app/layout.tsx` 挂载持久化的 `src/components/layout/AppShell.tsx`，首页由 `src/features/home/components/AnimeHome.tsx` 承载独立文档 `public/assets/home/index.html`，保留 Anime.js 母版的场景、动画运行时和响应式布局。

## 文件职责

| 文件或目录 | 用途 |
| --- | --- |
| `public/assets/home/index.html` | 首页结构、项目文案、导航与页脚 |
| `public/assets/home/assets/js/home.js`、`chunks/` | 母版预构建动画与 Three.js 运行时 |
| `public/assets/home/assets/models/`、`draco/` | 首页模型和解码器 |
| `public/assets/home/assets/js/project-bridge.js` | 当前账号、真实入口、动态文案及开发者卡片适配 |
| `public/assets/home/shortcuts.json` | 按角色生成的十二格页面入口及颜色 |
| `public/assets/home/assets/css/chinese-headings.css` | 缩小中文大标题字形，保留原有行框高度 |
| `tests/fixtures/home-template-source.json` | 母版资源摘要和受保护结构 |

首页在自己的文档中运行，避免外层全局 CSS 影响原场景。进入工作台时，原入口文档可在工作台就绪前作为遮罩；就绪后释放，返回首页时重新挂载。

## 当前页面内容

- 页眉使用项目 Logo、工作台入口、项目 GitHub 和账号按钮。未登录时显示“未登录”，登录后显示当前账号姓名；退出调用同源认证接口。
- 首页标题、系统介绍、住宿和报修说明使用项目文案。中文标题的适配位于独立样式中，母版原始 CSS、脚本与模型保持受保护状态。
- 十二格入口根据当前角色读取真实页面及对应模块颜色；未登录时使用学生入口，点击业务入口进入登录流程。
- 开发者场景标题为“加入开发团队”，保留母版场景布局和动画挂钩。`SPONSORS` 等内部标识用于原时间轴，不能仅因显示文案变化而删除。
- 开发者卡片只加载 `project-developers.json` 中 Pimnghi 和 rick137universe 的两个本地头像，并沿用重叠排列。资助人数、资金进度条、左侧赞助图标和首页右下角 Sponsored by 已移除。
- 页脚 SITE 保留 HOME、WORKSPACE；SOCIALS 保留项目 GitHub 与两位开发者链接，署名为 FLIGHT INC.，不再显示赞助区或邮件订阅。

首页中的模块图形沿用母版动画演示。真实统计位于管理员的[统计可视化页面](STATISTICS_VISUALIZATION.md)。

## 数据与导航

跨文档消息校验同源及发送窗口，只接受允许的入口。主应用进入工作台前通过 `auth/me` 确认身份，权限由服务端控制。直接访问 `/workspace` 会按会话返回对应工作台或登录页。

`scripts/sync/sync-home-shortcuts.ts` 根据四端页面清单生成入口数据和首页中的默认链接：

```sh
npx tsx scripts/sync/sync-home-shortcuts.ts
```

修改角色菜单或页面地址后，应同步该配置，并检查十二格条目数、地址及主题色。

## 资源与验证

母版导入来源记录在 `home-template-source.json`；运行首页不依赖开发者机器上的母版目录。英文与中文字体规则见 [FONT_GUIDE.md](FONT_GUIDE.md)。Anime.js 与 Three.js 使用保留的预构建代码，无需额外安装对应 npm 包。

`tests/checks/home-template.ts` 校验受保护资源摘要、项目导航、页脚和场景顺序；`tests/e2e/shared/home-shortcuts.ts` 校验角色入口。布局、登录状态和真实导航通过浏览器回归验证，截图输出到被忽略的 `test-results/screenshots/`。
