# 项目字体

英文和 ASCII 数字继续使用母版的 DINish（CSS 名称 `DIN`）、Berkeley Mono（`Mono`）及 Digital-7。中文和全角标点使用 `SourceHanSansSC`。

统一样式位于 `public/assets/shared/css/fonts/source-han-sans-sc.css`。首页、登录页和四端母版在头部直接引用，登录表单及 React 外层页面也引用相同文件。它位于母版 CSS 之后，避免字体变量被覆盖；`account-button.css` 不再重复导入字体。母版原始 CSS、字号、字重、行高和间距声明保持原样。

`@font-face` 的 `unicode-range` 限定为汉字、中文标点等 CJK 区段，不接管拉丁字母和 ASCII 数字。登录表单的 `system-ui` 本身能显示中文，因此将这个仅覆盖 CJK 的字体放在其前面；英文仍按原有字体列表选择。

| 字体文件 | 字体自身的字重 |
| --- | --- |
| ExtraLight | 250 |
| Light | 300 |
| Normal | 350 |
| Regular | 400 |
| Medium | 500 |
| Bold | 700 |
| Heavy | 900 |

页面原有的 `font-weight` 不变。没有对应文件的字重由浏览器按 CSS 字体匹配规则选择，例如 600 使用 Bold，800 使用 Heavy。

为避免刷新时先显示系统字体再切换，中文字体使用 `font-display: block`。首页、登录页、登录表单和四端外壳在头部预加载 Regular、Bold、Heavy；独立文档直接引入字体样式，减少嵌套 CSS 加载带来的延迟。

`SourceHanSansSC-UI` 是七个原字重的轻量子集，包含 GB2312 字符及项目界面文字，在字体列表中位于完整字体之前。字体缺少的生僻字继续由完整 `SourceHanSansSC` 显示；英文与 ASCII 数字不受影响。子集不改变字形和字重，生成时核对字符映射和字重元数据。首次加载时，浏览器可能短暂等待中文字体，而不立即绘制默认字体。

字体文件保存在 `public/assets/shared/fonts/`，字体样式统一归类到 `public/assets/shared/css/fonts/`。原始 OTF 已从项目删除，不参与部署；完整 WOFF2 和界面子集继续保留。WOFF2 仅进行格式转换，保留原始轮廓、字形映射、字重和字体内置元数据；独立的 LICENSE 文本已移除，转换脚本不再重新生成该文本。

两份 CSS 均用于中文字体加载：`source-han-sans-sc.css` 是页面引用的入口，声明完整字体的七个字重、中文字符范围和字体回退顺序，并导入 `source-han-sans-sc-ui.css`；后者声明体积更小的界面字体子集。常用中文优先使用界面子集，生僻字回退到完整字体。它们共同维持现有中英文字体与字重匹配，不应删除。

日常运行和重新生成界面子集无需 OTF。使用安装了 `fonttools[woff]` 的 Python 执行：

```sh
python scripts/fonts/prepare-chinese-font-previews.py
```

只有需要重新转换完整字体时，才重新取得七份原始 `SourceHanSansSC-*.otf`，放到 `public` 之外的目录，再指定输入目录执行：

```sh
python scripts/fonts/prepare-chinese-fonts.py "D:/FontSources/SourceHanSansSC"
python scripts/fonts/prepare-chinese-font-previews.py
```

转换脚本会先检查七个字重是否齐全，再将 WOFF2 输出到 `public/assets/shared/fonts`；子集脚本将 CSS 输出到 `public/assets/shared/css/fonts/`。不再要求将源字体放入网站公开目录。
