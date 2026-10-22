# 项目字体

英文和 ASCII 数字继续使用母版的 DINish（CSS 名称 `DIN`）、Berkeley Mono（`Mono`）及 Digital-7。中文和全角标点使用 `SourceHanSansSC`。

统一样式位于 `public/assets/fonts/source-han-sans-sc.css`。首页、登录页和四端母版在头部直接引用，登录表单及 React 外层页面也引用相同文件。它位于母版 CSS 之后，避免字体变量被覆盖；`account-button.css` 不再重复导入字体。母版原始 CSS、字号、字重、行高和间距声明保持原样。

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

网页引用同目录的 WOFF2 文件，原始 OTF 不参与浏览器下载。WOFF2 仅进行格式转换，保留原始轮廓、字形映射、字重和字体元数据。版权及许可声明见 `public/assets/fonts/SourceHanSansSC-LICENSE.txt`。

需要重新生成网页字体时，在 `public/assets/fonts` 放入原始七份 `SourceHanSansSC-*.otf`，使用安装了 `fonttools[woff]` 的 Python 执行：

```sh
python scripts/prepare-chinese-fonts.py
python scripts/prepare-chinese-font-previews.py
```
