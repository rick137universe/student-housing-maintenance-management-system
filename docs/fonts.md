# 项目字体

英文和 ASCII 数字继续使用母版的 DINish（CSS 名称 `DIN`）、Berkeley Mono（`Mono`）及 Digital-7。中文和全角标点使用 `SourceHanSansSC`。

统一样式位于 `public/assets/fonts/source-han-sans-sc.css`。它通过现有的 `account-button.css` 接入首页、登录页和四端母版，登录表单及 React 外层页面也引用相同文件。母版原始 CSS、字号、字重、行高和间距声明保持原样。

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

页面原有的 `font-weight` 不变。没有对应文件的字重由浏览器按 CSS 字体匹配规则选择，例如 600 使用 Bold，800 使用 Heavy。字体以 `font-display: swap` 加载。

网页引用同目录的 WOFF2 文件，原始 OTF 不参与浏览器下载。WOFF2 仅进行格式转换，保留原始轮廓、字形映射、字重和字体元数据。版权及许可声明见 `public/assets/fonts/SourceHanSansSC-LICENSE.txt`。

需要重新生成网页字体时，在 `public/assets/fonts` 放入原始七份 `SourceHanSansSC-*.otf`，使用安装了 `fonttools[woff]` 的 Python 执行：

```sh
python scripts/prepare-chinese-fonts.py
```
