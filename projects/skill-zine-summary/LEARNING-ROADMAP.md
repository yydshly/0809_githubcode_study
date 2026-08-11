# 分阶段学习路线

> 研究导航：[总索引](RESEARCH-INDEX.md) · [多原图实验室](http://localhost:4317/labs/multi-source) · [实验室运行手册](lab/RUNBOOK.md)

目标不是安装 12 个 Skill 然后逐个“抽卡”，而是用受控实验形成可以迁移到自己项目的技术资产。

## 总体顺序

| 阶段 | 重点 | 时间建议 | 核心产出 |
| --- | --- | --- | --- |
| 0 | 来源、许可和安全闸门 | 0.5 天 | 版本/许可矩阵 |
| 1 | 最小 Prompt Compiler | 1 天 | 同源输入对照与规则卡 |
| 2 | 三种照片真实性契约 | 1–2 天 | 重绘/保真/产品化决策树 |
| 3 | Hybrid fail-closed | 1–2 天 | 正常通过 + 故意失败的验证记录 |
| 4 | Code-native 原创 QA | 1–2 天 | 自有 HTML/SVG、阈值配置与指标测试器 |
| 5 | 综合技术储备 | 1 天 | 自有 schema、选择矩阵和 Skill RFC |

## 阶段 0：来源、许可与安全闸门

### 阅读

- 主汇总 README；
- 12 个目标仓库的 README、文件树和许可证；
- [UPSTREAM.md](UPSTREAM.md) 与 [INVENTORY.md](INVENTORY.md)。

MIT 或许可证明确允许的项目可以继续审查 `SKILL.md` 与脚本。无正式许可证的项目先停在 README、公开行为和文件级事实；如已阅读其实现，后续只能称“独立原创原型”，不能声称采用了严格 clean-room 流程。严格 clean-room 需要由接触过上游实现的人只写行为规格，再交给未接触实现的另一位实现者。

### 最小任务

- 复核 14→12 映射；
- 为每个目标固定 commit、获取日期、许可、执行依赖和当前可安装性；
- 对没有正式许可证的项目标记 `READ-ONLY`；
- 安装任何 Skill 前审查指令、脚本、依赖、网络调用和输出路径。

### 验收

- 14 行全部有明确去向；
- 每个目标都有精确 commit，不只写 `main`；
- 无许可项目没有被 vendor 或当成可改造基础；
- `gathered-scenes` 当前死链被明确记录。

## 阶段 1：最小 Prompt Compiler

### 主跑

- `gc-minimal-zine-poster`（MIT）
- `pixel-style-poster-skill`（MIT）

### 只读对照

- `daily-photo-playground`（无正式许可证）
- `dyy_photo_deconstruct`（无正式许可证）

### 最小实验

使用同一张自摄或合成静物图、同一段不超过 40 字的 brief，各运行一次 `gc` 与 `pixel`。保留各自原生画幅：`gc` 使用 3:5（1200×2000），`pixel` 使用 3:4（1200×1600）；横向展示时用 `contain` 放入同一个 1000×1000 中性预览框，不裁剪，定量指标仍基于原始输出。另固定：

- 输入文件 hash；
- 图像生成模型/工具版本；
- 输出尺寸与预览归一化规则；
- 最大 2 次生成；
- 最终 prompt 和失败原因。

对 `daily` 与 `dyy` 只制作规则卡：`输入证据 → 压缩规则 → 版式约束 → hard avoids`。

### 验收

- 能解释同一主体为何分别变成“高留白 + 单色锚”和“点阵 + 文字邻接”；
- 输出中的主元素都能追溯到输入或 brief；
- 没有复用上游示例的主题、构图或文案；
- 至少记录一次“规则通过/失败”的具体证据。

## 阶段 2：三种照片真实性契约

### 主跑

- `photo-revival`（MIT）：全量重绘，只承诺保留记忆点；
- `photo-relic-editorial`（MIT）：真实照片 + 记忆版画；
- `photo-to-zine-postcard`（MIT）：真实照片 + 正反面产品系统。

### 只读对照

- `photo-abstract-editorial`（无正式许可证）
- `gathered-scenes-zine-skill`（当前实现已删除；历史快照的许可随 commit 变化）

### 最小实验

选一张自己拥有权利、包含清晰轮廓、至少 3 个显著颜色和可测水平线的照片。先写同一份 Scene Card，再分别执行三种契约。

### 验收

- `revival` 保留主主体、场景和 1–2 个 memorable details，但文档明确“不承诺像素保真”；
- `relic` 与 `postcard` 先记录原生 ImageGen-only 基线；它们不能据此承诺像素保真。只有把源照片交给自有确定性 compositor 放置、并固定裁剪坐标、缩放算法和容差后，才执行 crop + pixel diff；未做 compositor 时结果标记为 `blocked` 或“仅感知相似”；
- `postcard` 有正反面、3 个源图色块和可书写区；
- 每条路线至少记录一次失败重试原因；
- 产出一张“全量重绘 / 保真拼版 / 产品化正反面”的选择树。

## 阶段 3：Hybrid fail-closed

### 可原样运行

- `travel-photo-abstraction` 固定 commit `96e3876...`。许可只允许原样使用，不能修改、衍生或再分发。

### 只读架构对照

- `poetic-line-zine-poster` 固定 commit `61514e0...`。无正式许可证，不复制脚本或提示词。

### 最小实验

1. 对 `travel` 运行安装完整性检查；
2. 使用自有输入生成一个 clean abstract panel；
3. 原样运行 finalizer/validator；
4. 复制自己的候选输出并故意篡改原照区域；
5. 验证正常候选通过、篡改候选失败。

### 验收

- 能画出 `source → evidence → generated panel → deterministic composite → validator` 管线；
- 随机环节只存在于抽象面板；
- 原照、标题、比例和交付检查由确定性步骤负责；
- 日志记录输入/输出 hash、环境、命令、pass/fail 和失败原因；
- 不向本仓库提交上游 Skill 源码或生成资产。

## 阶段 4：Code-native 原创 QA

### 研究对象

- `photo-distill`：HTML/CSS/SVG、Chrome/Chromium、Pillow、定量 finalizer；仓库没有正式许可证。

### 最小实验

不要复制上游模板或脚本，也不把单人阅读后的重写称为严格 clean-room。根据本研究自己的 Evidence Card 和公开行为规格，独立编写一个很小的自足 HTML/SVG，仅实现：

- 暖白纸面；
- 从自己的 Scene Card 推导的 2–3 个几何符号；
- 一个源图采样色锚；
- 无网络字体、无外部资产；
- 宽高比、着墨率、色锚比例和 160 px 缩略图可见性检查。

先做阈值标定，再评估真实候选：为每项指标各建立明显通过、明显失败和边界样例，明确纸色容差、着墨像素分类、色锚 HSV 范围、缩略图可见性算法及 pass/fail 阈值，冻结为版本化 `qa-profile.yaml`。不能先看目标结果再移动阈值。

### 验收

- HTML 离线可打开；
- 固定浏览器和字体后重复渲染稳定，或差异在声明容差内；
- 四项指标都有固定夹具、测量公式、版本化阈值，以及故意构造的 pass 和 fail 样例；
- fail 候选不会被当成最终交付；
- 输入与输出均无 EXIF/GPS 或其他敏感元数据。

## 阶段 5：综合储备

### 最小实验

选择两张差异明显的自有/合成图片，每张分别跑三种后端：

1. 全量重绘；
2. 原照 + 生成面板 + 确定性拼版；
3. HTML/SVG code-native。

每种模式重复两次，记录波动、失败原因、耗时和人工干预。

### 最终产出

- 自有 `Evidence Card` schema；
- 后端选择矩阵；
- 最小 compositor/validator；
- 6–10 张受控评测集说明；
- 原创 Skill RFC，而不是上游 Prompt 拼贴。

### 验收

- 新输入能根据“是否保真、是否可测、是否需要材料感”选择正确后端；
- 每次实验都有 input SHA、上游 commit、环境版本、prompt/参数、output SHA；
- 随机生成的失败可以被确定性 validator 拒绝；
- 自有实现没有复制无许可或限制许可项目的表达、代码和资产。

## 统一实验记录字段

```yaml
experiment_id: zine-YYYYMMDD-NN
record_schema_version: 1
input_artifact: <repo-path-or-access-controlled-uri>
input_sha256: <required>
input_rights: owned | synthetic | explicitly-authorized
source_metadata_removed: true
upstream_repo: owner/name
upstream_commit: <full-sha>
upstream_code_license: MIT | custom | none
upstream_assets_license: <spdx-or-unknown>
attribution_requirements: []
model_or_tool_terms_checked_at: YYYY-MM-DD
output_rights_status: cleared | restricted | unknown
redistribution_allowed: true | false | unknown
commercial_use_allowed: true | false | unknown
runtime:
  codex: <version>
  image_model: <name-or-unavailable>
  python: <version-or-na>
  pillow: <version-or-na>
  browser: <version-or-na>
generation_budget: 2
command_or_workflow: <exact-command-or-step-list>
model_parameters: {}
prompt_artifact: <repo-path-or-access-controlled-uri>
prompt_or_parameters_sha256: <required>
candidate_artifacts: []
output_sha256: <required>
validator_profile: <versioned-config-path>
measurements: {}
result: pass | fail | blocked
artifact_retention: <location-and-retention-period>
notes: <why>
```

哈希只用于校验内容没有变化，不能替代实验材料本身。Prompt、命令、模型参数、验证配置和测量结果必须保存在仓库内；若素材权利或隐私不允许入库，则记录访问受控的位置、负责人和保留期。
