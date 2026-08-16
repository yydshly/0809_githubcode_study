# 产品定义

> 文档角色：目标产品假设，不是当前 R0 工程探针的功能说明。当前状态以 [STATUS.md](STATUS.md) 为准。

## 一句话产品

一个会先理解单张图片、只推荐适用结果、明确说明改动边界，并在任务专属质量检查通过后才允许下载的单图智能处理器。

## 当前 MVP 产品决策

上面是一项长期产品假设，不是当前 MVP 必须一次实现的功能列表。`2026-08-16` 起，近期产品目标收缩为两个递进版本：

1. **MVP-A 基础单图编辑器**：打开一张图片，完成正确预览、裁剪、旋转、尺寸、基础光色、输出格式 / 质量、比较和下载。它不依赖模型或远程服务。
2. **MVP-B 主体与背景增强**：在同一工作区通过可替换云端 Provider 自动去背景，并用最小保留 / 擦除画笔修正，输出透明 PNG 或纯色换底。

SourceCard 语义推荐、多模型路由、自然增强和创意任务继续作为后续假设，不阻止 MVP-A 开发和早期内部可用性走查。C1 / U1 / E1 / R1 / O1 / G1 / V1 与 Release Gate 继续约束公开能力声明和正式发布；内部产品试用版可以在明确标注、无虚假能力声明的前提下先行构建和验证。

当前抠图实现策略不要求用户安装模型。首个真实实现通过 `BackgroundRemovalProvider` 使用云端服务；只有真实使用数据证明成本、隐私、延迟或离线需求构成阻塞时，才评估浏览器或本地模型。完整执行顺序见 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)。

## 目标用户与待验证问题

目标用户是想把一张现有图片快速处理好或改造好、但不想理解模型、Prompt、Skill 或图像管线的普通网页用户。首轮只验证使用 Windows 桌面 Chromium 的用户，不把其他平台的可用性从浏览器技术共性中推断出来。

这仍是待验证的受众假设。研究必须回答：

1. 用户是否同时需要质量、主体 / 背景和创意结果，还是只需要其中一个垂直方向？
2. 成对参考与变化合同是否能让用户准确预期结果？
3. 系统给出少量合格效果是否比工具墙更容易完成任务？
4. 用户是否能在三分钟内、最多两次执行得到至少一个真实可用结果？

下载、好奇点击或内部评审不能单独证明用户价值。

市场产品只用于校准用户已经形成的任务预期，不能替代上述用户证据。统一比较口径与尚缺研究簇见 [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md)。

## 首轮交付平台

- 产品形态仍是网页，但首轮支持目标收敛为 Windows 桌面 Chromium。
- Chrome 与 Edge 最新稳定版作为研究候选；每次 R1、O1、V1 和发布记录必须冻结精确版本，不能用“最新浏览器”作为证据字段。
- 最小设计视口为 `1280 × 720` CSS px，另测 `1440 × 900` CSS px；鼠标与键盘都必须能完成主流程。
- 移动端、平板、iPhone、Safari、Firefox、HEIC、macOS、Linux 和完整响应式适配后置，不进入首轮 R1-product、V1、O1 或对外支持声明。
- 手机通过 LAN 打开当前页面只算 R0 工程预览，只能使用合成或明确非敏感资产，不证明移动产品已经实现。

五类界面、桌面兼容矩阵与可访问性合同见 [UI_SURFACES_AND_ACCESSIBILITY.md](UI_SURFACES_AND_ACCESSIBILITY.md)。

## 四层产品结构

```text
工程底座
上传、资产、任务状态、执行、恢复、存储、下载
        ↓
九类原子能力
理解、Matting、增强、合成、生成、QA、编排等
        ↓
用户效果
透明主体、纯色换底、自然增强、创意重构等
        ↓
场景配方
报名头像、商品图、旧照、社交图、纪念创作等
```

### 工程底座

工程底座只负责可靠运行，不能作为图片能力证据。当前 R0 已验证部分输入、状态机、接口和下载约束，但没有证明效果质量。

### 原子能力

九类能力及统一产物见 [CAPABILITY_MAP.md](CAPABILITY_MAP.md)。每项能力必须通过 `CapabilityContract` 描述输入、资格、输出、不变量、QA、fallback、版本、资源与许可。

### 用户效果

用户选择“会得到什么”，不选择模型、Skill 或工作流。每个 `EffectDefinition` 必须包含：

- 适用与拒绝条件；
- 所需能力 DAG；
- 用户必要参数；
- `must_keep / may_change / forbidden`；
- 真实来源图 → 结果图参考对；
- QA bundle、失败与 fallback；
- 证据和发布状态。

当前效果目录见 [TASK_CATALOG.md](TASK_CATALOG.md)。

### 场景配方

`SceneRecipe` 只组合已经发布（`released`）的能力与效果，不拥有另一套模型。任一依赖失效、版本改变或许可过期时，场景必须自动退回实验状态。

报名头像、商品图和旧照修复因此不是基础能力。普通报名头像依赖人像资格、Matting、合成、几何与 QA；官方证件照还必须绑定地区、机构、证件、提交渠道和规则版本。

## 目标流程

1. **选择图片**：客户端仅做格式、大小、像素与本地 hash 预检；网络发送前展示实际处理方、用途和保留 / 删除说明。数据流、删除与安全合同见 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md)。
2. **归一化**：生成可追踪的 `NormalizedImage`，处理方向、色彩空间和敏感元数据；正式流水线不直接发送未经归一化的原始文件。
3. **建立 SourceCard**：只记录可观察事实及置信度，例如主体、数量、边界、质量问题、文字风险和背景复杂度；不推断身份、成年、种族或审美偏好。
4. **资格过滤**：先应用硬拒绝规则，再由 `CAP-09.recommend` 从当前 surface 的冻结 allowlist 中给出 0–4 个候选；不足四个不补位。受控验证界面可以纳入满足研究可见门槛的 `validated-internal` 效果，正式产品只允许 `released` 效果。研究协议直接指定效果时不需要先证明推荐排序。
5. **解释效果**：展示真实参考对、推荐依据、预计耗时、是否生成式处理、会保留什么和可能改变什么。
6. **执行**：客户端提交 `effect_id + version` 与允许的用户字段；冻结 Recipe、模型和 Prompt 由服务端解析，不能由浏览器任意覆盖。
7. **质量门禁**：文件完整性检查与任务内容 QA 分开；QA 故障时 fail closed，候选不能成为可下载结果。
8. **比较与下载**：按任务展示版本化 `ReferencePair / ComparisonBundle`；只有当前 run、当前来源、当前效果版本且运行时 QA 通过的 `DeliveryArtifact` 才允许下载。

## 长期智能能力研究链

下列主体与背景依赖链是长期智能能力研究方向，不是 MVP-A 的第一工程纵切；MVP-A 的第一纵切是“打开 → 编辑 → 导出 → 重开验证”。MVP-B 才从这条链中接入最小必要部分：

```text
ImageAsset → NormalizedImage → SourceCard
→ 主体检测 → Alpha Matting → 边缘净化
→ transparent / solid variant → 任务 QA → 导出
```

自动结果失败时，研究一套最小的擦除 / 恢复蒙版修正，不扩展成自由画布。

## 未来混合产品邀请测试

这里定义的是未来同时包含质量、背景和创意三方向的 **mixed beta**，不是当前 M5 的 MVP beta-readiness 决策。mixed beta 不是单项能力完成的同义词，至少需要：

- 一个质量方向效果达到 U1；
- `effect.subject-background` 的计划发布 variant 达到 U1；
- 一个创意效果达到 E1；
- 所有依赖能力达到 C1；
- 每个可见效果达到 R1-pipeline、R1-product-release、O1、G1 与逐资产 Release Gate；
- 形成性用户研究已经修正关键理解问题，且至少 18 名新目标用户的冻结验证已为对应范围取得 V1；若验证发生在研究壳，正式页面只能按预注册等价变更规则迁移，超出范围必须取得 V1-release。

目标指标是三分钟内、最多两次执行获得至少一个用户认为可用且符合任务合同的结果。最小冻结验证界面先取得 `R1-product-validation / V1-validation`，只允许正式页面进入设计；正式 surface 完成后还要取得 `R1-product-release` 并迁移或复验 V1。混合邀请不是用来补齐尚缺的发布证据。阈值与测量方式见 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md)。

创意 E1 不阻塞能力底座与实用纵向研究；它只阻塞“质量 + 背景 + 创意”混合产品的邀请测试。

## 明确边界

### 当前不做

- 多图上传、逐张批量、合集和 ZIP / PDF；
- 海报、故事册、商品套件和完整电商生产线；
- 图层、自由画布、字体、贴纸、模板和模型市场；
- 账户、团队、计费、公共云部署；
- 强美颜、换脸、生成正装或未告知的面部重建；
- 未绑定有效 profile 的官方证件受理承诺。
- 移动端、平板、iPhone、Safari、Firefox、HEIC 与完整响应式适配；它们需要后续独立证据，不由首轮桌面浏览器结果继承。

### 官方证件照片

“官方证件照”不是通用效果。任何正式 profile 必须记录：

```text
profile_id + jurisdiction + issuing_authority + document_type
+ submission_channel + profile_version + official_url
+ checked_at + acceptance_claim
```

如果规则禁止数字换底、滤镜或 AI 修改，产品只能检查、执行明确允许的确定性操作或提示重拍。普通报名头像的草案见 [PORTRAIT_PARAMETERS.md](PORTRAIT_PARAMETERS.md)。

## 产品成立条件

产品发布公式为：

```text
全部依赖 C1
+ 效果 U1 / E1
+ R1-product-release（且相应 R1-pipeline 已通过）
+ CompatibilityProfile 与 TestEvidenceManifest（同一 build、声明范围，决定为 pass）
+ O1
+ G1
+ 对 release surface 有效的 V1，或已批准的 V1MigrationManifest
+ ReleaseManifest（部署、回滚与恢复硬门通过）
+ 每项用户可见资产通过 Release Gate
= 可发布
```

任何缺项都必须保持实验或隐藏状态。具体证据定义见 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md)。
