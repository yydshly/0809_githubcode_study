# ID Photo Workflow Lab

> 一个围绕 HivisionIDPhotos 的证件照能力研究与集成 Demo：模型只做来源记录，重点研究能力、展示、处理原理和端到端工作流复用。

## 项目卡

| 字段 | 内容 |
| --- | --- |
| 状态 | 研究中（固定 Hivision CPU runtime 与真实 Demo 已跑通） |
| 研究主题 | HivisionIDPhotos 能力展示、工作流原理、API 适配与产品边界 |
| 技术栈 | Node.js 22+、原生 HTML/CSS/JavaScript、Hivision FastAPI（外部本地服务） |
| 上游项目 | [Zeyi-Lin/HivisionIDPhotos](https://github.com/Zeyi-Lin/HivisionIDPhotos)；见 [UPSTREAM.md](UPSTREAM.md) |
| 独立仓库 | 暂无 |
| 在线演示 | [GitHub Pages 静态效果 Demo](https://yydshly.github.io/0809_githubcode_study/id-photo-workflow-lab/)；本地真实运行 `http://127.0.0.1:4191/` |
| 最后验证 | 2026-08-18；见 [RUNTIME_RECEIPT.md](RUNTIME_RECEIPT.md)、[BROWSER_ACCEPTANCE.md](BROWSER_ACCEPTANCE.md) 与 [STATIC_PAGES_ACCEPTANCE.md](STATIC_PAGES_ACCEPTANCE.md) |

## 当前方向

本项目不研究模型结构、训练方法或排行榜。MODNet、BiRefNet、RMBG 等只记录为 Hivision 可选择的底层候选；IMG.LY 与 MagicQuill 也只保留[相关技术卡](RELATED_TECHNOLOGY_NOTES.md)。真正研究的是：

1. Hivision 对用户提供了什么能力，以及这些能力怎样展示；
2. 抠图、人脸检测、对齐、几何裁切、换底、DPI/KB 和打印排版怎样串成工作流；
3. 如何通过稳定的本地 API 边界复用 Hivision，而不把 Python/模型代码复制进前端项目；
4. 哪些结果只是普通报名头像/标准底色头像，不能冒充官方证件合规。

## 已实现 Demo

Demo 通过本地 Node 适配层连接 Hivision FastAPI，覆盖：

- 单图上传与本地预览；
- 输出像素尺寸、DPI、人像抠图模型和人脸检测器选择；
- 人脸对齐；
- 标准透明图与高清透明图；
- 透明、白、蓝、红或自定义底色；
- 基于背景结果生成六寸、五寸、A4、3R、4R 五种打印排版与可选裁切线；
- 纯离线 CPU 与可选 Face++ 端云状态；
- 美白、亮度、对比度、饱和度和锐化；
- 智能换正装明确显示为上游 `waiting`，不伪造能力；
- 上游未连接、处理中、成功和失败状态；
- 明确的“普通头像制作，不代表官方证件合规”提示。

接口与能力对应关系见 [HIVISION_CAPABILITY_MAP.md](HIVISION_CAPABILITY_MAP.md)，架构见 [DEMO_ARCHITECTURE.md](DEMO_ARCHITECTURE.md)。

## 快速开始

GitHub Pages 只展示已经完成的静态图片、运行事实和五纸张切换，不执行上传或模型：[打开静态效果 Demo](https://yydshly.github.io/0809_githubcode_study/id-photo-workflow-lab/)。真实处理继续使用下面的本机模式。

### 1. 仅查看界面和交互夹具

测试模式不会运行模型，页面和输出会明确标注“项目原创交互夹具”。

```powershell
cd projects\id-photo-workflow-lab
npm.cmd run start:fixture
```

打开 `http://127.0.0.1:4191/`。

### 2. 首次准备真实 Hivision

脚本会克隆固定提交、创建 `.venv`、安装上游 requirements、下载并核对 MODNet SHA-256。运行物全部被 Git 忽略：

```powershell
npm.cmd run setup:real
```

然后一条命令同时启动 loopback-only Python bridge 和 Demo：

```powershell
npm.cmd start
```

打开 `http://127.0.0.1:4191/`。当前本机已经完成 setup 与真实 CPU smoke；输入只在请求内存中处理，不写入项目。

### 验证

```powershell
npm.cmd test
npm.cmd run check
```

## 目录说明

```text
.
├── README.md
├── UPSTREAM.md
├── RESEARCH.md
├── HIVISION_CAPABILITY_MAP.md
├── RELATED_TECHNOLOGY_NOTES.md
├── DEMO_ARCHITECTURE.md
├── RUNTIME_RECEIPT.md
├── DESIGN_CONTRACT.md
├── BROWSER_ACCEPTANCE.md
├── server.mjs
├── runtime/
│   └── hivision_bridge.py
├── web/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── scripts/
│   ├── check-syntax.mjs
│   ├── setup-hivision.ps1
│   ├── smoke-real-runtime.py
│   ├── start-real.mjs
│   └── validate-project.mjs
└── tests/
    └── demo.test.mjs
```

## 运行边界

- Demo 只监听 `127.0.0.1`。
- Node 适配层只允许预登记的 Hivision 路由，不提供任意反向代理。
- 单次请求限制为 12 MiB，并设置上游超时。
- 正常模式不会伪造结果；上游不可用时明确显示未连接。
- `--fixture` 仅用于界面/流程 QA，输出不是模型结果。
- 输入和响应只在当前请求内存中转，不写入磁盘。

## 与上游的差异

- Git 中没有复制 Hivision Python、模型、图片、尺寸表或 UI；本机 ignored `vendor/` 保存固定 clone，ignored `.venv/` 保存运行时。
- Demo 通过本地原创 bridge 调用 Hivision library；前端、bridge、适配层与启动脚本均为本项目原创实现。
- 本项目增加了 loopback-only、请求大小、路由 allowlist、超时、状态检测和夹具/真实结果区分。
- 上游返回成功不等于官方证件 profile 通过；本项目没有加入“审核必过”等声明。

## 许可证与署名

本项目原创代码和研究文档尚未选择对外许可证。HivisionIDPhotos 固定研究提交声明 Apache-2.0；其外链模型、服务和素材仍按各自条款处理。详见 [UPSTREAM.md](UPSTREAM.md)。
