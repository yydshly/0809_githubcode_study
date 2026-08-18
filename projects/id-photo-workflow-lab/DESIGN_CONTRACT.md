# Demo 设计契约

```text
Entry mode: revision-led / direct implementation
Request revision: 4
Target user and context: 想理解并试用 Hivision 证件照流水线的产品/工程研究者
Desired first impression: 这是清楚、可信、可操作的工作流实验台，不是模型排行榜
Visual ambition: Functional
Experience architecture: Editorial Flow
Visual constraints: 单一浅色主题；结果优先；不过度装饰；状态不只靠颜色
Information constraints: 先能力与边界，再操作；模型参数置于高级设置
Operation constraints: 本地真实 Demo 保留；公开 GitHub Pages 必须纯静态、无上传/模型/API，使用已登记静态图片展示
State constraints: 静态 before/transparent/blue 比较、五种纸张切换、能力 pass/config/waiting
Environment constraints: 本地 Node.js 22+；GitHub Pages 子路径；桌面与 390px；中文
Primary journey: 阅读真实运行摘要 → 切换原图/透明/蓝底效果 → 切换五种纸张 → 查看能力边界与源码
User-defined phases: 1) 了解能力、展示、原理 2) 使用能力构建 Demo 3) 真实复现 README 能力 4) 静态 GitHub Pages 展示并发布远端
Required artifacts: fixed upstream checkout, model receipt, runtime bridge, local demo, static showcase, asset provenance, Pages workflow, tests, browser evidence, git publish
Autonomy authorization: 用户明确要求构建 Demo
User-decision boundary: Face++ 端云模式需要用户自己的 key；智能换正装上游仍为 waiting，不能伪造实现
Observable completion criteria: 本地真实链继续成立；静态站无 API 依赖且在 GitHub 子路径可用；效果/五纸张/状态准确；桌面/390px可用；Pages workflow 可构建；提交并推送远端
Coverage record: 下表
```

| 用户阶段 | 要求 | 证据 | 状态 |
| --- | --- | --- | --- |
| 1 | 能力、展示和原理可独立阅读 | `HIVISION_CAPABILITY_MAP.md` | pass |
| 1 | 模型仅记录，不扩展训练研究 | `UPSTREAM.md` / `RESEARCH.md` | pass |
| 2 | 真实 Hivision API adapter | 4/4 tests + normal-mode disconnected contract | pass |
| 2 | 夹具模式完整主旅程 | browser interaction + result/layout screenshots | pass |
| 2 | 桌面与 390px | browser screenshots + no-overflow DOM observation | pass |
| 2 | 键盘、状态与 reduced-motion | focus outline + `scrollBehavior=auto` + state observations | pass |
| 2 | 工程验证与交接 | npm test/check + `BROWSER_ACCEPTANCE.md` | pass |
| 2 | 真实 Hivision 模型结果 | 固定 MODNet + CPU + 项目已有虚构人像实际请求 | pass |
| 3 | 固定上游与一个 CPU 模型 | vendor checkout、hash、real runtime smoke | pass |
| 3 | 五种纸张真实布局 | runtime/API/browser evidence | pass |
| 3 | 美颜与光色控制 | form/API/browser evidence | pass |
| 3 | 纯离线/端云状态 | health + UI state；Face++ 未配置时禁用 | pass |
| 3 | 智能换正装现状 | 上游 README/source + UI waiting state | pass |
| 3 | 真实桌面/390px主旅程 | browser screenshots + result facts | pass |
| 4 | 静态效果展示站 | public-site files + no API/upload evidence | pass |
| 4 | 静态图片与来源 | committed assets + provenance + hashes | pass |
| 4 | 五种纸张静态切换 | browser interaction + DOM/image evidence | pass |
| 4 | GitHub Pages 子路径 | workflow copy/verify + local subpath server | pass |
| 4 | 桌面/390px 静态站 | browser screenshots + no-overflow evidence | pass |
| 4 | 远端提交与部署 | commit/push/Pages status | pass |
| 5 | 修复静态透明图完整显示 | deployed desktop effect panel + mobile adjacent check | pass |
