# 登录页设计与维护

登录地址为 `/login`。`src/features/auth/components/LoginPage.tsx` 承载 `public/assets/login/index.html`，该独立文档由 Anime.js Learn 母版适配，保留深色背景、网格、动画和响应式布局。

## 页面内容

标题按两行展示：

```text
学生公寓住宿
与报修管理系统
```

下方说明为“使用系统账号登录，办理住宿、缴费与报修业务。”。登录区只保留一层表单窗口，包含账号、密码及“登录工作台”按钮，底部保留“如无法登录，请联系管理员。”。多余外框、课程视频、重复登录提示及原订阅内容已移除，后续元素随文档流向上补位。

`login-layout.css` 负责取消多余容器背景与间距，并将表单 iframe 设为块级元素，避免底部基线空隙。中文大标题使用与首页共用的 `chinese-headings.css` 缩小字形并保留原行框高度；字体与字重规则见 [FONT_GUIDE.md](FONT_GUIDE.md)。

## 文件职责

| 文件 | 用途 |
| --- | --- |
| `public/assets/login/index.html` | 页面布局、标题、说明及项目导航 |
| `public/assets/login/assets/html/waitlist.html` | 实际账号登录表单；名称来自母版，仍被 iframe 加载 |
| `public/assets/login/assets/js/login-form.js` | 字段校验、同源登录请求及错误处理 |
| `public/assets/login/assets/js/login-bridge.js` | 表单高度、文档间通知和页面衔接 |
| `public/assets/login/assets/js/learn.js`、`chunks/` | 保留的母版运行时 |
| `public/assets/shared/css/account-button.css` | 各页面共用的账号按钮 |
| `tests/fixtures/login-template-source.json` | 母版资源与项目结构校验清单 |

## 认证与项目入口

表单调用 `POST /api/v1/auth/login`，成功后由主应用通过 `auth/me` 重新确认账号并进入对应工作台。跨文档消息校验同源及发送窗口，密码不通过消息传递，也不保存到浏览器存储。

登录表单保留必填、长度、错误提示及提交中锁定行为。认证接口、会话 Cookie、来源和 CSRF 规则见 [BACKEND_API.md](BACKEND_API.md)。

页眉提供项目 Logo、工作台、项目 GitHub 和账号按钮。页脚使用 HOME、WORKSPACE、项目及开发者链接、FLIGHT INC. 署名；赞助与邮件订阅区域已移除。

## 维护与验证

保持母版原始 CSS、字体与脚本的受保护内容，通过项目适配文件维护表单和布局。不要将 `waitlist.html` 当成未使用的订阅页删除。

`tests/checks/login-template.ts` 校验母版资源摘要和项目结构；认证及浏览器回归覆盖错误密码、各角色登录、身份跳转、退出和手机布局。运行登录页不依赖本机母版目录，截图输出到被忽略的 `test-results/screenshots/`。
