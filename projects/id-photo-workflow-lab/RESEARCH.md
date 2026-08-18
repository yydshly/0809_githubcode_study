# 研究记录

## 研究问题

1. HivisionIDPhotos 的核心能力有哪些，用户看见的交付物是什么？
2. 哪些步骤由模型完成，哪些步骤是确定性图像处理和产品编排？
3. 如何在不复制上游实现的前提下复用其 API 能力？
4. 普通报名照、标准底色头像与官方证件 profile 应如何分界？

## 研究层级

- HivisionIDPhotos 是唯一主研究对象：拆能力、讲原理、连接 API、构建 Demo。
- IMG.LY 与 MagicQuill 是相关技术：只记录目标、技术原理、输入输出、运行形态、可借鉴点和阻塞边界。
- 不为相关技术安装依赖、下载模型、构建第二套 Demo 或把它们接入证件照主链。

完整技术卡见 [RELATED_TECHNOLOGY_NOTES.md](RELATED_TECHNOLOGY_NOTES.md)。

## 基线环境

| 项目 | 值 |
| --- | --- |
| Hivision 固定提交 | `5c191e2577f14755a69d9df6db415fab23aca484` |
| 本项目运行时 | Node.js 22+（零 npm 依赖）+ ignored Python 3.10.11 venv |
| 真实上游 | ignored fixed clone + loopback bridge `127.0.0.1:8080` |
| Demo | `http://127.0.0.1:4191/` |
| 研究日期 | 2026-08-18 |

## 能力结论

Hivision 不是“一个证件照模型”，而是一条编排链：

```text
输入归一
→ 人像抠图模型
→ 可选外观调整
→ 人脸检测
→ 可选角度对齐
→ 头部比例 / 顶距 / 目标像素裁切
→ 标准透明图 + 高清透明图
→ 背景合成
→ DPI / KB
→ 打印排版
```

模型主要解决“人像在哪里、每个像素多透明”；尺寸、背景、DPI、文件大小与排版由传统确定性算法完成。产品价值主要来自把这些步骤组织成一次可理解的任务，而不是单独展示模型名称。

## 展示策略

Demo 不做模型排行榜，而把能力展示成四类用户结果：

| 展示 | 用户问题 | 对应 Hivision 能力 |
| --- | --- | --- |
| 透明标准图 | 把人物从背景中分离，并按目标尺寸构图 | `/idphoto` 标准输出 |
| 透明高清图 | 保留更高分辨率的可编辑主体 | `/idphoto` HD 输出 |
| 标准底色图 | 生成白/蓝/红/自定义底色头像 | `/add_background` |
| 打印排版 | 在六寸、五寸、A4、3R、4R 画布上重复排列有底色照片 | bridge `/layout` 调用上游 layout calculator |

用户首先选择用途和结果，不需要先理解 MODNet、MTCNN 或 RetinaFace。模型选择保留在“处理引擎”设置中，作为可解释的高级参数。

## 复用策略

本项目选择“ignored fixed clone + 本地原创 bridge”，而不是把上游复制进 Git：

```text
浏览器
→ 本地 Node allowlist adapter
→ loopback Python bridge
→ ignored fixed Hivision library
→ Hivision 模型与 OpenCV 流程
```

这样有四个好处：

- Python、OpenCV 和模型依赖隔离在 `.venv/` 与 `vendor/`；
- Git 不复制权重或上游源码；运行物有 commit/hash 收据；
- 将来可以替换 Hivision，只要保持本项目自己的工作流合同；
- 可以在适配层加入输入限制、超时、错误归一和本地监听边界。

## 当前 Demo 边界

- 固定提交、MODNet CPU、MTCNN、美颜参数、换底和五种纸张已经真实跑通；
- 夹具模式只验证界面、状态和输出编排，不构成模型能力证据；
- 一张项目原创虚构 mannequin 输入证明工程链闭合；仍不证明真人/自然人像总体质量；
- Demo 已开放美颜和五种纸张；KB 压缩、水印暂不进入主线；
- 端云 Face++ 只有配置用户自己的 key 后才开放，当前未配置/未调用；
- 智能换正装在上游 README 仍是 `waiting`，源码没有可调用实现；
- 没有编码任何地区或签发机关的官方证件规则。

## 实验记录

| 日期 | 假设 | 方法 | 证据 | 结论 |
| --- | --- | --- | --- | --- |
| 2026-08-18 | Hivision 的主要复用价值是工作流而非模型研究 | 固定提交拆解 `IDCreator` 与 FastAPI | [能力地图](HIVISION_CAPABILITY_MAP.md) | 成立 |
| 2026-08-18 | 可以不把 Python/模型提交到 Git 而复用能力 | 建立 loopback Node adapter 与浏览器 Demo | [架构](DEMO_ARCHITECTURE.md) | 成立；运行物保持 ignored 并由收据固定 |
| 2026-08-18 | README 的 CPU 与五纸张能力能在固定版本复现 | ignored clone/venv/MODNet + 本地 bridge real smoke | [运行收据](RUNTIME_RECEIPT.md) | CPU 抠图、美颜、换底与五种纸张工程链通过；质量与合规仍未成立 |

## 下一步

- [x] 在独立 Hivision 环境启动固定提交与一个已记录模型；
- [x] 用项目已有权处理的虚构非敏感照片完成第一条真实链路；
- [x] 记录标准透明图、底色图和五种排版的结构事实，不公开输入/输出到产品仓库；
- [ ] 根据真实错误补充无脸、多脸、模型缺失和资源不足状态；
- [ ] 再决定是否增加 KB、更多纸张和普通报名照规格库。
