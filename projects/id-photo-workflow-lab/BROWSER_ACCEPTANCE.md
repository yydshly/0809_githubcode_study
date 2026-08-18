# 浏览器验收

## 运行环境

| 字段 | 记录 |
| --- | --- |
| 验收时间 | 2026-08-18T13:57:29+08:00 |
| 规范启动 | `npm.cmd start` |
| 规范 URL | `http://127.0.0.1:4191/` |
| Python bridge | `http://127.0.0.1:8080/`，loopback-only |
| 上游 | HivisionIDPhotos `5c191e2577f14755a69d9df6db415fab23aca484` |
| 模型 | MODNet ONNX，SHA-256 `07c308cf…66584df9` |
| 运行设备 | ONNX Runtime CPU |
| 浏览器驱动 | agent-browser 0.27.0 / Chromium |
| 视口 | 1280×800、390×844 |

最终截图保留在项目外的 Codex visualization workspace：

- `hivision-real-desktop-result.png`
- `hivision-real-a4-layout.png`
- `hivision-real-mobile-layout.png`
- `hivision-real-capability-status.png`

## 真实能力状态

浏览器从 `/api/hivision/status` 观察到：

```text
Hivision CPU runtime 已连接
Python 3.10.11
OpenCV 4.11.0
ONNX Runtime 1.23.2
device CPU
installed models 1
```

六张能力卡显示：

| 能力 | UI 状态 | 事实 |
| --- | --- | --- |
| CPU 纯离线抠图 | 真实可运行 | MODNet + MTCNN 本机运行 |
| 不同证件照规格 | 已实现 | 目标像素与构图参数已开放 |
| 五种打印纸张 | 五种已映射 | 六寸、五寸、A4、3R、4R |
| 美颜与光色 | 已实现 | 五项参数已透传并执行 |
| 端云人脸检测 | 需要配置 | Face++ 两项 key 不存在，控件禁用 |
| 智能换正装 | Waiting | 上游没有可调用实现，页面不伪造 |

## 真实主旅程

输入使用兄弟项目已经登记的项目原创虚构 mannequin 图片；没有复制进本项目，也不形成运行依赖。

浏览器操作：

```text
上传虚构人像
→ 295×413 / 300 DPI
→ 纯离线 CPU
→ MODNet + MTCNN
→ whitening 2 / brightness 2 / contrast 3 / saturation 2 / sharpen 1
→ 蓝色背景
→ A4 / 裁切线
```

观察结果：

- 标准底色图在浏览器可见，badge 为 `Hivision 结果`；
- 证据区明确写出“纯离线 CPU、MODNet、MTCNN、295×413、300 DPI”；
- 本次浏览器上游处理计时为 899 ms；
- A4 排版显示 `3508×2479 px`，预览与下载入口可用；
- 高清透明图下载入口可用；
- `window.__consoleErrors=[]`，无 error overlay。

## 五种纸张运行证据

独立 real-runtime smoke 对同一有底色结果逐项调用 bridge：

| paper | 实际输出 |
| --- | --- |
| 六寸 | RGB `1795×1205` |
| 五寸 | RGB `1500×1051` |
| A4 | RGB `3508×2479` |
| 3R | RGB `1500×1051` |
| 4R | RGB `1795×1205` |

五项都返回结构有效的 RGB 图片；A4 同时有真实浏览器预览。

## 响应式与交互

| 检查 | 结果 |
| --- | --- |
| 1280px | 输入/配置与结果双栏清楚，真实结果、状态和 A4 排版可见 |
| 390px | 单栏结果、纸张选择、裁切线、排版和证据区可操作 |
| 横向溢出 | 390px 观察 `documentElement.scrollWidth <= innerWidth` |
| 状态语义 | 真实/端云未配置/waiting 使用文字与样式双重表达 |
| 夹具边界 | `npm run start:fixture` 仍可用于 UI QA，并明确不运行模型 |

## 未关闭边界

- 当前只有一个虚构人像 smoke，不能外推真人和自然图片质量；
- Face++ 需要用户凭据且会远程发送图片，本轮没有调用；
- 智能换正装仍是上游 waiting，不是延期的本地实现任务；
- 美颜与换底不能用于禁止数字修改的官方证件 profile；
- 上游 Python requirements 不是 exact lock，跨机器复现仍需 wheel hashes。
