# 独立登录页的设计来源

页面地址为 `/login`，通过现有 `/api/v1/auth/login` 登录，成功后进入该身份的工作台。已登录访问登录页会进入自己的工作台。

设计基于只读母版 `D:/Development/Anime.js/public/sites/animejs-com-23cc7dc7/learn-eabea785/`：

- 从 `assets/css/learn.css` 复制到 `src/views/auth/learn-base.css`，增加 `[data-dorma-login]` 作用域，把网格颜色改为主题变量。保留原有中央排版、网格、标题与订阅区的结构和样式。
- 参照 `index.html` 的 `learn`、`learn-animejs`、`learn-header`、`learn-header-text`、`learn-email-signup` 结构，在 `LoginPage.tsx` 中改为 React 登录界面。
- 参照 `assets/js/learn.js` 的文字和表单先后淡入顺序，用可清理且支持减少动态效果的 CSS 动画实现入场，不加载其整套网站脚本。
- `login.css` 只负责认证表单、中文排版、Dorma 品牌和浅深主题的适配。字体使用项目内已有字体，无需重复复制。

课程视频、课程订阅 iframe、广告脚本、页脚赞助资源与登录无关，因此未复制。原 `LoginDialog` 及其 CSS 已删除，首页入口和未登录工作台入口统一指向 `/login`。页面不读取母版路径、不使用 iframe，也不向课程订阅服务发送请求。

母版文件未修改。复制的样式沿用母版项目的 MIT 许可（Copyright (c) 2025 JCodesMore；完整许可见项目根目录 LICENSE）。
