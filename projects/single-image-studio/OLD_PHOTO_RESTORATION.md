# 老照片温和修复实验设计合同

## 设计合同

```text
Entry mode: revision-led
Request revision: 2
Target user and context: 有一张褪色、低对比、轻微划痕或噪点老照片，希望得到更易观看副本的普通用户
Desired first impression: 这是一个受约束的生成式修复实验，先说明会重绘，再让用户选择修复强度
Visual ambition: Functional
Experience architecture: Editorial Flow
Visual constraints: 复用现有场景卡、设置、运行状态、原图/结果比较与下载，不新增独立页面
Information constraints: 必须写明可能重绘面部、纹理和历史细节；不得声称档案级、无损、身份精确或事实恢复
Operation constraints: 复用现有 gpt-image-2 image edit route；新任务 ID、固定提示合同和下载命名；不新增模型、依赖或供应商
State constraints: OpenAI 图片服务未配置时不可选；失败/未知不自动重试；旧结果不得解锁新任务下载
Environment constraints: 桌面 Chromium 内部试用；不执行真实用户照片测试，不在本轮发起收费 API 调用
Primary journey: 上传并确认 → 选择老照片温和修复 → 选择克制/标准强度与保留重点 → 明确生成式风险 → 生成 → 对比 → 下载副本
User-defined phases: 合同；任务与提示；设置/结果；测试；浏览器 fallback；文档交付
Required artifacts: old-photo-restoration.js、独立任务与服务 allowlist、设置/结果/下载合同、测试、浏览器验收记录
Autonomy authorization: 用户明确“确定并继续”，授权在现有图片编辑服务边界内直接实现
User-decision boundary: 真实 API 调用及费用、档案修复承诺、模型/供应商更换、用户照片收集不在本次授权内
Observable completion criteria: 任务独立出现且受服务状态控制；提示由固定合同构造而非自由文本；设置明确重绘风险；输出独立命名；不改写原图；现有场景与本地旅程不回归
```

## 当前能力承诺

“老照片温和修复”使用生成式图片编辑模型处理整张输入。它可以尝试减轻褪色、轻微划痕、噪点和低对比，但输出像素会被重新生成；人物面部、服饰纹理、文字、日期和背景细节都可能发生变化。因此它只提供可比较的观看副本，不是无损清理、档案扫描、法证复原或历史事实恢复。

项目当前使用的 `gpt-image-2` 支持图片输入、图片输出和 `v1/images/edits`；官方能力说明只证明它能够生成和编辑图片，不证明老照片身份或历史细节必然精确。实现必须以产品内风险文案和原图/结果比较弥补这一边界，不能把模型输出冒充原始事实。

## 覆盖清单

| 用户阶段 | 表面 / 状态 | 证据 | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 能力合同 | 固定任务、提示与风险边界 | 单元测试、文档 | 0–3 | continue | 建立独立注册表和提示构造器 |
| 可用性 | 服务 available / unavailable | catalog 与浏览器 DOM | 4–8 | continue | 与现有 OpenAI 图片服务状态绑定 |
| 设置 | 强度、保留重点、生成确认 | 文案与状态测试 | 4–6 | continue | 提供克制默认值并阻止无确认提交 |
| 运行与恢复 | loading / success / failed / unknown | API/client/state 回归 | 5–6 | continue | 复用现有 run 状态且禁用自动重试 |
| 结果与下载 | 原图比较、风险说明、独立命名 | 下载合同、浏览器本地旅程邻接检查 | 5–7 | continue | 新增恢复结果呈现与命名 |
| 真实模型质量 | 实际老照片输入和 API 输出 | 有预算的受控调用与人工比较 | 7–8 | defer | 本轮不授权真实 API 费用或用户照片；批准项目原创/公共领域 fixture 与调用预算后复核 |
| 工程交付 | 产品/完整验证、链接、提交 | 命令输出 | 9 | continue | 实现后运行完整检查 |
