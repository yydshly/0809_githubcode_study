# GitHub Pages 静态站验收

## 构建与子路径

| 字段 | 记录 |
| --- | --- |
| 验收时间 | 2026-08-18T14:21:05+08:00 |
| 目标 URL | `https://yydshly.github.io/0809_githubcode_study/id-photo-workflow-lab/` |
| 本地等价 URL | `http://127.0.0.1:4192/id-photo-workflow-lab/` |
| 现有 Pages build | vinext build pass |
| 现有 Pages export | 34 routes，36 HTML files |
| 现有 export verify | pass；13 skill pages / 13 lab variants |
| 新静态目录 | `public-site/` → Pages artifact `/id-photo-workflow-lab/` |

工作流复制后的最终目录已核对 `index.html`、`styles.css`、`showcase.js`、source preview、transparent PNG 和 A4 layout，`showcase.js` 通过 `node --check`。

## 静态边界

- 页面没有文件上传控件；
- HTML 和 JavaScript 没有 `/api/` 调用；
- `showcase.js` 没有 `fetch()`；
- 所有 CSS、JS、favicon 和图片使用 `./` 相对路径；
- GitHub Pages 只展示提交内静态资产，不运行 Python、ONNX、Face++ 或本地 bridge。

## 浏览器证据

浏览器驱动：agent-browser 0.27.0 / Chromium。最终截图保留在项目外的 Codex visualization workspace：

- `static-pages-desktop.png`
- `static-pages-effects.png`
- `static-pages-mobile.png`

| 检查 | 结果 |
| --- | --- |
| 页面与资源 | body 有内容；所有页面图片 `complete && naturalWidth > 0` |
| 静态模式 | DOM 没有 `input[type=file]` |
| 效果切换 | 原图 → 透明标准图后，标题、RGBA 事实、WebP preview 和完整 PNG 下载同时更新 |
| 纸张切换 | 六寸 → A4 后，标签为 A4，尺寸为 `3508 × 2479`，预览与下载链接更新 |
| 桌面 | hero、运行事实、效果双图和排版层级清晰 |
| 390px | 五纸张按钮、A4 预览、尺寸事实和下载按钮可用 |
| 横向溢出 | 390px 为 `NO_HORIZONTAL_OVERFLOW` |
| 浏览器错误 | agent-browser errors 无条目；补充相对 favicon 避免根路径 404 |

## 资产来源

完整来源、原始 SHA、虚构人物声明、Hivision/模型身份与派生参数见 [public-site/assets/PROVENANCE.md](public-site/assets/PROVENANCE.md)。这些图片是研究证据，不是官方证件正例或质量承诺。

## 2026-08-18 显示修复

部署后用户发现右侧透明图被舞台裁切。浏览器确认图片盒为 `543.5×760.9`、舞台为 `543.5×520`。修复将结果图绝对定位在舞台中，并固定 `width/height:100%` 与 `object-fit:contain`。修复后桌面两者均为 `543.5×520`，390px 两者均为 `289×340`；原图、透明图和蓝底图均保持完整显示。详细记录见 [STATIC_DISPLAY_REPAIR.md](STATIC_DISPLAY_REPAIR.md)。
