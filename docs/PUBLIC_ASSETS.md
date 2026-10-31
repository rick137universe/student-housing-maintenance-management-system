# 静态资源组织与维护

`public/` 保留在项目根目录，采用“页面模块 + 公共资源”的组织方式。首页、登录、四端工作台和统计页各自保留独立资源包，跨页面的项目资源集中到 `assets/shared/`。

```text
public/
└── assets/
    ├── home/           首页母版、模型、解码器与项目适配
    ├── login/          登录页母版、登录表单与桥接脚本
    ├── student/        学生工作台及四端复用的 Docs 母版包
    ├── manager/        宿管工作台页面、桥接与预览
    ├── maintenance/    维修人员工作台页面、桥接与预览
    ├── admin/          管理员工作台页面、桥接与预览
    ├── statistics/     统计可视化页面与样式
    └── shared/
        ├── css/        跨页面的项目样式，fonts/ 保存字体声明
        ├── fonts/      字体文件及界面子集
        ├── images/     项目标志、favicon 与开发者头像
        └── js/         跨页面共用的工具函数
```

## 页面资源包

页面专属的 HTML、CSS、JS、JSON、模型、图片及解码器继续按所属页面保存在原目录中。母版自带的字体及 `chunks/` 与包内 CSS、脚本存在相对引用，保留其原有包结构和文件名；不按文件扩展名拆散这些预构建依赖。

`student/assets/` 内的 Docs 母版是其他三端复用的运行时来源，保持原有地址与依赖关系。新增跨页面的项目工具和样式统一进入 `shared/`，页面自身的业务桥接继续留在所属页面目录。

页面入口仍为 `/assets/home/index.html`、`/assets/login/index.html`、四端对应目录的 `index.html` 和 `/assets/statistics/index.html`；应用路由及母版页面布局不变。

## 公共资源

| 资源 | 当前位置 | 用途 |
| --- | --- | --- |
| 字体文件 | `public/assets/shared/fonts/` | 页面及 React 外壳共用的完整字体和界面子集 |
| 字体样式 | `public/assets/shared/css/fonts/` | 完整字体声明、界面子集声明及回退规则 |
| 文档 Logo | [flight-logo.svg](../public/assets/shared/images/flight-logo.svg) | 根 README 的项目展示图，保留原图形内容 |
| 导航与页脚 Logo | [flight_shmms_white.svg](../public/assets/shared/images/flight_shmms_white.svg) | 网站页眉与页脚共用的白色标志 |
| 站点图标 | [favicon.svg](../public/assets/shared/images/favicon.svg) | Next.js 元信息及独立文档共用 |
| 开发者头像 | `public/assets/shared/images/avatars/` | 保留 Pimnghi 与 rick137universe 两个头像 |
| 账号按钮样式 | [account-button.css](../public/assets/shared/css/account-button.css) | 首页、登录与四端顶部账号交互样式 |
| 日期金额工具 | [display-format.js](../public/assets/shared/js/display-format.js) | 静态文档和 React 页面共用的显示格式函数 |

网页 URL 省略 `public` 前缀，例如 `/assets/shared/images/flight-logo.svg`。仓库文档使用相对于文档文件的链接；根 README 图片路径为 `public/assets/shared/images/flight-logo.svg`。

字体、图片及 Logo 迁移保留文件内容。中文字体 CSS 仅更新资源 URL，日期金额工具仅移动位置；文件移动没有改变显示规则、字号、字重、颜色、页面元素的位置或大小。

## 迁移映射

| 原位置 | 新位置 |
| --- | --- |
| `public/assets/fonts/` | `public/assets/shared/fonts/` |
| `public/assets/images/` | `public/assets/shared/images/` |
| `public/assets/login/assets/images/flight_shmms_white.svg` | `public/assets/shared/images/flight_shmms_white.svg` |
| `public/assets/login/assets/css/account-button.css` | `public/assets/shared/css/account-button.css` |
| `public/assets/shared/display-format.js` | `public/assets/shared/js/display-format.js` |
| 原文档图片目录中的 `flight-logo.svg` | `public/assets/shared/images/flight-logo.svg` |

页面与公共资源整理时，原有 302 份静态文件全部保留，加入文档 Logo 后共 303 份。随后按要求删除独立字体 LICENSE 文本，并将两份字体 CSS 归入 `shared/css/fonts/`，当前共 302 份静态文件。没有内容的资源目录和原文档图片目录已清理。字体二进制内容、页面文案与业务功能保持不变，没有新增依赖。

## 同步与校验

`scripts/sync/` 的页面生成器及 `scripts/fonts/` 的字体处理脚本已经使用公共资源新位置。修改配置并重新生成页面时，继续按 [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md) 执行。

原有母版检查继续校验 95 份原始资源的字节摘要。首页与登录页页眉、页脚的四个项目快照摘要随公共资源 URL 更新；更新前先核对旧快照，确认页面变化仅来自资源地址替换，母版原始资源摘要保持不变。fixtures 的用途见 [TESTING_GUIDE.md](TESTING_GUIDE.md)。

## 本次验证结果

以下为页面与公共资源分类阶段的专项记录：

- TypeScript、ESLint、Next.js 生产构建及原有静态结构检查通过。
- 95 份母版原始资源逐字节一致，原有静态文件全部保留，文档 Logo 内容保持一致。
- 62 处公共脚本模块导入可解析；1,661 处 HTML/CSS 引用检查未发现仍指向已迁移文件的旧地址。
- 303 个静态资源 HTTP 响应与磁盘文件摘要一致。
- 首页、登录页和四端 145 个工作台页面加载通过，六个独立文档的公共中文字体均可用，无失败资源请求或未捕获浏览器错误。
- 143 项隔离接口、事务、权限、真实备份及隔离恢复检查通过。

以上为静态资源整理的专项验证；完整业务 E2E 的历史记录仍保存在 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)。

字体样式进一步归类后，TypeScript、ESLint、生产构建和字体生成器语法检查再次通过；15 份字体二进制和两份 CSS 内容保持一致。临时生产服务确认 React 登录入口及七个独立文档均可加载完整字体声明和 Regular、Bold、Heavy 界面字体，旧 CSS 地址及独立 LICENSE 文本返回 404。
