# 学生工作台：直接复制 Docs 页面

母版只读来源：`D:/Development/Anime.js/public/sites/animejs-com-23cc7dc7/documentation-ec29569f/`。项目副本位于 `public/assets/student/`，不依赖母版目录运行。

## 页面结构和原样资源

完整复制 Docs 的 HTML 外壳、顶部搜索、侧栏、预览容器、内容容器、搜索弹层及页脚。`core.css`、`docs.css`、`docs.js`、全部运行依赖及字体保持原始字节；没有新增或覆盖字号、行高、列宽、间距、断点和动画参数。`StudentDocsPage.module.css` 只负责承载整个独立文档，不覆盖文档内的样式。

左栏用原有 `docs-nav-item` 组织六组业务和十五个操作；中栏仍由母版的 `docs-demo` 和原始运行时负责滚动、激活、播放与折叠；右栏保留 `docs-info-content formatted-text`、标题、说明、相关入口、前后导航及完整页脚。顶部 Logo 换为项目 SVG，账户按钮复用首页和登录页的实现，Docs 进入本项目工作台，Learn 保留原站链接。搜索使用母版搜索组件，在学生业务菜单中搜索，支持键盘操作。

## 预览与内容选择

| 学生功能 | 母版预览 | 右侧采用的原有元素 |
| --- | --- | --- |
| 查看个人信息 | CSS 属性展示 | Docs 标题、正文、参数表格，用真实账号资料和住宿记录替换内容 |
| 修改个人信息 | Animatable setters 的指针跟随示例 | 参数表格、`ui-input` 和 `ui-controls`，填入姓名、电话和邮箱 |
| 修改登录密码 | HTML attributes 的输入控件示例 | 相同参数表格和输入控件，密码字段使用密码输入类型 |
| 入住、调宿、退宿 | CSS transforms、timeline add animations、reversed | 原有数据表、表格中的表单控件及操作按钮，连接申请和审核结果 |
| 账单、在线缴费、缴费记录 | timer duration、onComplete、timeline add timers | 原有参数表格和输入控件，展示账期、余额和测试支付结果 |
| 提交报修、查看进度、服务评价 | refresh、timeline seek、stagger grid | 表格、输入控件、有序列表，连接报修、处理历史和1～5分评价 |
| 公寓通知、缴费提醒、个人消息 | splitText、timer onComplete、timeline call functions | 表格、详情正文和已读操作 |

动画用于解释页面对应的操作，真实业务数据由右侧接口查询结果提供。选中的预览函数、样式与元素来自母版 `documentation-demos.html`，只筛选所需条目、替换标题和可见提示。完整原始示例文件也保留在副本中，以便核对来源。具体映射见 `src/data/student-docs.json`。

## 业务与路由

学生原来的十五个页面地址保持不变。`WorkspacePage` 完成身份与角色检查后，学生端使用独立 Docs 文档；其他三类角色继续使用原工作台。跨文档消息检查同源和发送窗口，消息只承载允许列表内的页面标识；账号和权限始终由现有认证与后端校验。

母版运行时原有的 `documentation-archive-map.js` 适配为本项目页面路径映射。原始 `docs.js` 不修改，继续处理侧栏、搜索、历史导航、预览播放、手机端拖动和最小化。页面变化后由 React Portal 将原有 `LiveWorkspace` 业务逻辑挂载到右侧，仅为学生端选择母版的组件 class。表单编辑和详情在右侧原内容区展开，避免使用旧工作台弹层样式。表格较宽时使用母版 `scroll-container scroll-x`，不改变字体和列宽。

保持原接口、参数、幂等支付标识、错误处理、分页与刷新行为。个人资料修改、入住/调宿/退宿、报修与评价、部分测试缴费、消息已读仍然真实落库。所有数据写入均调用原同源 API。页脚订阅提交继续拦截，不向第三方发送邮箱；母版广告脚本不加载。

## 验证

`docs/student-template-source.json` 记录只读母版的资源摘要。`tests/student-template.ts` 验证26个未改写资源及全部业务入口；替换的路径适配器单独说明，不计入未改写文件。

浏览器回归覆盖原有全部工作台页面、学生十五个菜单和预览、搜索、手机菜单、资料保存及刷新。`tests/student-browser.ts` 仅在独立测试库中创建专用学生，走通界面提交入住、宿管办理、报修、维修、评价、部分支付、调宿、退宿和消息已读，测试结束随独立测试库清理，不更改本机课程数据。

母版目录不修改。复制资源保留原始许可与版权信息；网页不改为其他主题配色，以保持母版原有深色外观。
