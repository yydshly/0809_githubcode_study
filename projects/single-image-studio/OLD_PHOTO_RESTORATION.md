# 老照片基础整理与生成式修复实验设计合同

## 设计合同

```text
Entry mode: revision-led
Request revision: 5
Target user and context: 有一张褪色、低对比、轻微划痕或噪点老照片，希望得到更易观看副本的普通用户
Desired first impression: 没有 API 也能先在本机完成基础整理；需要补画缺失细节时，再明确进入会重绘像素的 AI 实验
Visual ambition: Functional
Experience architecture: Editorial Flow
Visual constraints: 复用现有场景卡、设置、运行状态、原图/结果比较与下载，不新增独立页面
Information constraints: 必须写明可能重绘面部、纹理和历史细节；不得声称档案级、无损、身份精确或事实恢复
Operation constraints: `UT-OLD-PHOTO` 只复用本地 renderer，并允许使用与自然增强相同的 Alpha 安全轻度降噪和受限清晰度；`CR-RESTORE` 只允许通过显式 Provider policy 接入能够直接接收本地图片的编辑服务、固定提示合同和独立下载命名；不在浏览器暴露密钥
State constraints: 本地基础整理始终可选；没有满足 direct-upload 合同的生成式 Provider 时只关闭 AI 实验；失败/未知不自动重试；旧结果不得解锁新任务下载
Environment constraints: 桌面 Chromium 内部试用；不执行真实用户照片测试，不在本轮发起收费 API 调用
Primary journey: 上传并确认 → 选择老照片基础整理 → 选择褪色修正/黑白层次/柔和提亮或手调光色、轻度降噪和清晰度 → 本地生成 → 四版本比较 → 下载副本；AI 补全是独立可选分支
User-defined phases: 本地基础整理；AI 实验边界；设置/结果；测试；浏览器验收；文档交付
Required artifacts: old-photo-local.js、old-photo-restoration.js、两个独立任务、设置/结果/下载合同、Codex 原创参考对比页、测试、浏览器验收记录
Autonomy authorization: 用户明确“确定并继续”，授权在现有图片编辑服务边界内直接实现
User-decision boundary: 真实用户照片收集、公开 URL 中转、档案修复承诺和付费 Provider 切换仍需独立批准；本轮只授权 Codex 原创测试图与 MiniMax 候选接线分析
Observable completion criteria: 本地任务无需 API 可运行；五项公开参数均可见、可撤销且进入同一渲染/下载链；四个版本有不同但克制的降噪/清晰度起点；Alpha 不变；AI 实验单独出现并受服务状态控制；两者输出独立命名且不改写原图；现有场景与本地旅程不回归
```

## 当前能力承诺

`UT-OLD-PHOTO`“老照片基础整理”完全在浏览器本机执行。它提供褪色修正、黑白层次、柔和提亮和原始光色与细节四个透明预设，并允许继续裁剪、旋转、调整亮度 / 对比度 / 饱和度 / 轻度降噪 / 清晰度以及导出 PNG / JPEG。降噪只平滑局部轻微颗粒，清晰度只增强已有局部反差；它不会上传图片，也不会识别划痕、人脸或缺失区域，更不会生成不存在的细节。因此它适合“让照片更易看、重新构图和导出副本”，不等于真正的去划痕、重度去噪、失焦恢复、修脸、文字恢复或档案修复。

`CR-RESTORE`“AI 老照片修复（实验）”与本地路径分离。只有 Provider policy 选中满足本地图片直传合同的图片编辑服务，并经用户确认生成风险时才可提交；未配置 Provider 不影响本地基础整理。

上传页提供一张项目原创、人物完全虚构的老照片演示图，来源和固定文件身份见 [DEMO_ASSETS.md](DEMO_ASSETS.md)。它用于亲自观察基础整理前后差异，不作为真实照片修复质量证据。

`CR-RESTORE`“AI 老照片修复（实验）”使用生成式图片编辑模型处理整张输入。它可以尝试减轻褪色、轻微划痕、噪点和低对比，但输出像素会被重新生成；人物面部、服饰纹理、文字、日期和背景细节都可能发生变化。因此它只提供可比较的观看副本，不是无损清理、档案扫描、法证复原或历史事实恢复。

当前已接入的 direct-upload 实现仍是 OpenAI `gpt-image-2` 的 `v1/images/edits` route。MiniMax `image-01` 已登记为备用候选，但官方 image-to-image API 要求 `subject_reference.image_file` 是在线图片 URL，且主要语义是主体参考生成；本项目不会为了启用它而把本地用户照片上传到未治理的公开 URL。因此仅配置 `MINIMAX_TOKEN_PLAN_KEY` 不会让任务变成可运行。正式 MiniMax adapter 必须先解决私有上传 / 删除、账户条款、费用、任务适配与输出 QA，或等待官方提供满足本项目直接上传合同的接口。

Codex 内置图片编辑能力只用于项目原创测试素材和视觉演示，不是网页可调用的隐藏 Provider。已登记的参考图见 [DEMO_ASSETS.md](DEMO_ASSETS.md)；它用于观察可能的细节重绘风险，不是产品成功结果或 ground truth。

## 覆盖清单

| 用户阶段 | 表面 / 状态 | 证据 | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 本地能力合同 | 四个公开预设、五项手调和能力边界 | 单元测试、文档 | 0–3 | pass | 保持参数透明，不增加隐式“智能修复” |
| 本地可用性 | 服务不可用时仍可运行 | catalog 与浏览器 DOM | 4–8 | pass | 运行第三条真实本地浏览器旅程 |
| 本地设置 | 裁剪、旋转、光色、轻度降噪、清晰度、格式与上限 | renderer 与状态测试 | 4–6 | pass | 四预设、可见控件、编辑历史和 renderer 已接通；透明隐藏 RGB 与 Alpha 受回归保护 |
| AI 实验可用性 | Provider available / unavailable | policy、catalog 与浏览器 DOM | 4–8 | pass | 只允许满足 direct-upload 合同的 Provider；MiniMax 候选当前 fail closed |
| AI 实验设置 | 强度、保留重点、生成确认 | 文案与状态测试 | 4–6 | pass | 保持克制默认值并阻止无确认提交 |
| Codex 视觉参考 | 原始虚构老照片 / 生成式参考完整并排显示；明确非运行结果 / 非真值 | 固定资产 hash、独立页面、浏览器 DOM / viewport | 2–7 | defer | canonical HTTP 页面、两张图片 identity 与文案测试通过；当前任务没有可调用的 in-app browser 控制通道，待该通道可用时复核 1280×720 与窄屏完整显示 |
| 运行与恢复 | 本地 success；AI loading / success / failed / unknown | renderer、API/client/state 回归 | 5–6 | pass | 本地任务不创建远程 run；AI 禁用自动重试 |
| 结果与下载 | 原图比较、四版本细节参数、能力说明、独立命名 | 下载合同、浏览器本地旅程邻接检查 | 5–7 | pass | 四版本逐项参数、重开、结果切换、单张下载和 ZIP 自动化不回归；新细节控件视觉复核由浏览器 defer 单列 |
| 真实模型质量 | 实际老照片输入和 API 输出 | 有预算的受控调用与人工比较 | 7–8 | defer | 本轮不授权真实 API 费用或用户照片；批准项目原创/公共领域 fixture 与调用预算后复核 |
| 工程交付 | 产品/完整验证、链接、提交 | 命令输出 | 9 | pass | 定向 51/51、产品 237/237、219 个 JavaScript 文件语法检查与 diff check 通过；真实第三条浏览器报告仍单列待运行 |
