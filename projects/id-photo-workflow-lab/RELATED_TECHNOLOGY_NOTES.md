# 相关图片技术卡

> 本文件只记录与证件照主线相邻的技术。HivisionIDPhotos 是唯一主研究对象和 Demo 上游；下列项目不安装、不运行、不接入 Demo，也不扩展为模型研究。

## 研究层级

| 层级 | 项目 | 角色 | 动作 |
| --- | --- | --- | --- |
| 主线 | HivisionIDPhotos | 普通报名头像/标准底色头像的端到端工作流 | 拆能力、讲原理、构建 API Demo |
| 相关技术 | IMG.LY Background Removal JS | 浏览器本地自动抠图与 Alpha 输出参考 | 记录目标、原理、运行和许可 |
| 相关技术 | MagicQuill | 生成式局部编辑与画笔交互参考 | 记录目标、原理、运行和许可 |

## IMG.LY Background Removal JS

### 目标描述

在浏览器或 Node.js 中自动识别通用前景，输出透明主体、背景或 mask。它解决的是“主体/背景分离”，不是证件照构图和交付。

### 技术原理

```text
图片解码
→ 统一缩放到 1024×1024
→ IS-Net ONNX
→ 单通道前景预测
→ mask 插值回原尺寸
→ 写入 Alpha / 合成
→ PNG、JPEG、WebP 或 mask
```

- 浏览器使用 ONNX Runtime Web；CPU 走 WASM，可选 WebGPU；
- 默认模型是 IS-Net FP16，另有 full 与量化版本；
- 第一次运行需要获取模型与 WASM，默认可从 IMG.LY CDN 下载，也可自托管；
- 图片推理可留在浏览器，但“图片不上传”不等于“首次完全无网络”。

### 输入与输出

| 输入 | 输出 |
| --- | --- |
| ImageData、Blob、URL、字节或字符串 | foreground、background、Alpha mask；PNG/JPEG/WebP 等 |

### 与证件照主线的关系

- 可作为未来“浏览器本地抠图 Provider”的技术参考；
- 不做人脸检测、头部比例、顶距、证件尺寸、DPI 或打印排版；
- 若输出质量满足人像需求，理论上可以替换 Hivision 流水线中的 Matting handler，但本项目不做这项接线。

### 必要边界

- 固定研究提交：`12f56cc4f2a90d624e165a715748d22efc7a1d93`，Web package `1.7.0`；
- 代码和 Web data package 为 AGPL-3.0；直接进入现有产品需先决定 AGPL 路径或取得其他许可；
- 首次资源体积、浏览器内存、主线程响应、模型完整性与发丝/玻璃质量仍需独立产品验证；
- 当前动作：`description-only / no install / no demo`。

## MagicQuill

### 目标描述

[MagicQuill](https://github.com/ant-research/MagicQuill) 是 CVPR 2025 的交互式生成图片编辑系统。用户用少量画笔表达“添加、删除或改色”，系统猜测意图并对局部区域进行生成式重绘。它解决的是“怎样更直观地控制生成式编辑”，不是像素保真的自动抠图。

### 用户能力

| 交互 | 目的 | 结果性质 |
| --- | --- | --- |
| Add brush | 画出希望新增的轮廓/结构 | 扩散模型生成新内容 |
| Subtract brush | 标记希望移除或重绘的区域 | 扩散模型局部修复/重绘 |
| Color brush | 指定局部颜色和范围 | 生成式改色 |
| Draw&Guess | 根据图片和笔画自动猜 prompt | 多模态模型建议，可人工改写 |
| 画布工具 | 上传、移动/缩放/旋转笔画、撤销/重做、接受/丢弃结果 | 人在回路的迭代编辑 |

### 技术原理

论文把系统分成三个组件：

```text
Idea Collector
  画布、add/subtract/color 笔画、图层和历史
          │
          ▼
Painting Assistor
  微调 LLaVA 读取原图与笔画，执行 Draw&Guess，生成简短 prompt
          │
          ▼
Editing Processor
  编辑 mask + edge condition + color condition
  → diffusion inpainting branch（内容/像素上下文）
  → ControlNet-like control branch（结构/颜色约束）
  → 局部生成结果
```

更具体地说：

- add/subtract 笔画修改由 CNN 提取的边缘图，形成结构条件；
- color 笔画先与原图混合，再降采样/最近邻放大成简化色块条件；
- 所有笔画区域取并集后膨胀为编辑 mask，给阴影和邻近细节留下重绘空间；
- 扩散 UNet 增加两条插件分支：inpainting branch 负责内容感知局部生成，control branch 注入边缘与颜色条件；
- Painting Assistor 使用专门微调的 LLaVA，根据画笔和图像上下文猜测用户想添加/改色的对象。

### 输入与输出

| 输入 | 输出 |
| --- | --- |
| 原图、add/subtract/color 笔画、编辑 mask、可选 prompt、扩散参数 | 被局部重新生成的 RGB 图片 |

MagicQuill 的“remove background”示例属于生成式局部编辑：它可以把指定背景区域重新生成成别的内容，但官方流程不输出前景 Alpha，也不保证未编辑人物像素逐点不变。因此不能把它当成 Hivision 的 Matting 替代品。

### 运行形态

- Python 3.10、PyTorch/CUDA、Gradio/FastAPI；
- 官方 README 声明需要 GPU，已测试最低约 8 GB VRAM；
- checkpoints 合计约 25 GB；
- 依赖 LLaVA submodule、ComfyUI/BrushNet/ControlNet 类组件与 SD 1.5 社区模型；
- `gradio_run.py` 在 `127.0.0.1:7860` 启动 UI，并提供 prompt guessing 与背景图片预处理路由。

### 与证件照主线的关系

可以借鉴：

- add/subtract 画笔语义；
- 笔画可移动、旋转、撤销/重做；
- 生成结果的接受/丢弃循环；
- 把复杂模型参数放进高级设置；
- 用 AI 建议减少 prompt 输入负担。

不进入证件照主链：

- 生成式重绘可能改变脸、头发、服装和背景边界；
- 不输出可验证 Alpha；
- 不提供人脸几何、证件尺寸、DPI 或打印排版；
- 严格证件 profile 通常要求保留原始人物特征，生成式编辑风险方向相反。

若未来建设“创意报名头像/普通职业头像”，MagicQuill 类技术可以作为单独的创意分支；不得和“官方证件照”共用合规声明。

### 必要边界

- 固定研究提交：`8958300027238b259cfcabbc8aa38793d7c4ac47`；该提交的主要变化是 README 宣布 MagicQuillV2 已在另一个仓库发布，本技术卡仍针对用户给出的 MagicQuill 仓库；
- 仓库实际 `LICENSE` 是 CC BY-NC 4.0，README note 也写明非商业；README 顶部 badge 与论文页面存在不同的 CC 文案，不能用 badge 覆盖 LICENSE 文件；
- 社区 SD checkpoints、LLaVA、ComfyUI/BrushNet 等组件各有独立来源和许可证；
- 未获取 25 GB checkpoints，未安装、未运行、未复制 UI/代码/图片；
- 当前动作：`description-only / noncommercial / no demo`。

## 对当前项目的决策

```text
HivisionIDPhotos
→ 继续作为唯一证件照工作流与 Demo 主线

IMG.LY
→ 只保留浏览器本地 Alpha 抠图技术卡

MagicQuill
→ 只保留生成式画笔编辑技术卡
→ 不用于证件照透明抠图、人物保真或官方 profile
```
