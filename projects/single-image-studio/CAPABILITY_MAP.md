# 单图基础能力地图

> 本文件冻结 Single Image Studio 的能力分类、公共逻辑产物和扩展规则。它描述的是研究与实现边界，不表示任何能力已经可发布；当前证据状态以 [STATUS.md](STATUS.md) 为准，运行记录、性能与故障定位合同见 [OBSERVABILITY_AND_OPERATIONS.md](OBSERVABILITY_AND_OPERATIONS.md)。

## 1. 四层结构

```text
Layer 1  工程底座
         上传、授权、任务状态、执行器、存储、失败恢复、下载
                              ↓
Layer 2  九类原子能力
         CAP-01 ～ CAP-09，可独立版本化、评测和替换
                              ↓
Layer 3  用户效果
         透明主体、纯色换底、自然增强、对象消除、创意重构……
                              ↓
Layer 4  场景配方
         通用报名头像、商品主图、旧照修复、社交图片……
```

原子能力是底座，效果是用户选择的结果，场景配方是多个能力 / 效果与特定参数、资格和 QA 的组合。页面不是能力本身；模型也不是能力本身。只有“冻结合同 + 可替换执行器 + 明确产物 + 适用边界 + QA + 证据”共同成立时，才形成可复用能力。

## 2. 九类原子能力

| ID | 能力域 | 主要职责 | 标准逻辑产物 | 首批研究重点 | 后续可扩展方向 |
| --- | --- | --- | --- | --- | --- |
| `CAP-01` | 来源资产 | 验证文件真实性、来源 hash、处理授权、隐私与版本关系；保存最小必要元数据 | `ImageAsset` | 单图输入、格式 / 像素限制、SHA-256、授权快照 | 相机拍摄、历史版本、多图逐张、外部资产导入 |
| `CAP-02` | 归一交付 | 统一方向、颜色空间、尺寸和编码；清理不应保留的元数据；生成正式下载产物 | `NormalizedImage`、`DeliveryArtifact` | EXIF 方向、ICC → sRGB、缩放、PNG / JPEG / WebP、透明度与元数据策略 | 平台尺寸、打印规格、文件体积目标、多尺寸包 |
| `CAP-03` | 图片理解 | 对来源图形成可审计的客观描述与风险信号，不直接决定最终效果 | `SourceCard` | 主体类型 / 数量、人物 / 物体 / 场景、模糊、曝光、噪声、分辨率、文字与背景复杂度 | OCR、材质、动作、空间、光线、审美特征与用户意图融合 |
| `CAP-04` | 主体区域 | 检测、分割、Alpha Matting、边缘净化、区域选择与人工修正；保存可追溯区域产物 | `SubjectMap`、`AlphaMatte`、`ForegroundLayer`、`MatteRevision` | 主体检测、人像 / 物体 Matting、发丝 / 毛发 / 孔洞、边缘去色、点击或画笔修正 | 宠物、透明 / 反光物、多主体、遮挡层级、语义区域 |
| `CAP-05` | 几何合成 | 在不重画受保护内容的前提下裁切、缩放、定位与确定性合成 | `CompositeImage` | 透明前景层 / 纯色底合成、等比 placement、智能裁切、背景虚化与基础阴影；正式文件交给 CAP-02 导出 | 图片换底、平台构图、商品定位、深度阴影、重打光 |
| `CAP-06` | 质量修复 | 诊断并改善光色、噪声、模糊、压缩和分辨率；区分保真增强与内容重建 | 非生成增强为 `CompositeImage`；发生内容重建时为 `GeneratedCandidate`；均带 `RunManifest` | 自然光色 / 清晰度、no-op 判定、降噪、去模糊、超分候选 | 旧照、划痕、颜色恢复、人脸恢复与分区增强 |
| `CAP-07` | 生成编辑 | 按 mask、参考或 Skill 配方进行局部修补、扩图、背景生成或创意重构 | `GeneratedCandidate` | 对象消除、局部修补、参考驱动创意、一个结果与一次显式重试 | 生成背景、扩图、换装 / 风格等受控新效果与本地执行器 |
| `CAP-08` | QA 证据 | 分离离线证据 QA 与线上任务 QA；记录输入、执行、输出、指标、版本和失败，控制下载与发布 | `QAReport`、`RunManifest`、`EvidenceManifest` | Alpha / 边缘、像素保护、尺寸 / 色值、主体数量、must-keep、参考泄漏 | 每类效果的 QA profile、漂移监控、审核工具与证据回放 |
| `CAP-09` | 编排推荐 | 以独立合同执行已选 DAG，或在当前 surface 的冻结 allowlist 中做资格过滤与可解释排序；管理任务、重试与失效传播 | `ExecutionPlan`、`RecommendationSet`；实际运行写入 `RunManifest` | `CAP-09.execute` 的确定性执行控制；后置 `CAP-09.recommend` 的硬资格与冻结规则 | Agent 路由、缓存、硬件选择、个性化、批量调度 |

表中的“首批研究重点”是待验证范围，不是当前产品格式或能力清单。`CAP-02` 的 Slice 05–08 失败历史保持不可改写；Slice 09 的 canonical PNG normalize / export 唯一 open smoke 已双 Gate-B pass。Slice 10 只冻结开放 calibration 范围，计划 96 个项目原创 synthetic source / 288 attempts；其 implementation、definition 和 results 尚未创建。即使后续 calibration 通过，也不是 formal holdout、C1 或产品支持。JPEG / WebP 等行继续 fail closed，全部格式仍为 `productSupport=false`。

### 能力依赖原则

- `CAP-01` 是所有后续处理的来源与授权入口；没有合法、可解码的 `ImageAsset` 时不得继续。
- `CAP-02` 为分析与执行提供同一归一版本，避免方向、颜色空间或缩放差异污染评测。
- `CAP-03` 只产生可审计信号；`CAP-09` 才负责把信号转换为资格、排序和计划。
- `CAP-04` 的区域产物可以被 `CAP-05` 和 `CAP-07` 共用，但生成模型的近似 mask 服从不能反向证明 Alpha Matting 成立。
- `CAP-05` 是确定性合成层；安全前景像素需要锁定时，不得由 `CAP-07` 替代。
- `CAP-06` 若会生成不存在的细节，必须在合同中标记为重建，不得继续以“保真增强”发布。
- 所有处理能力必须把运行与结果交给 `CAP-08`；离线证据 QA 可以使用真值指标，线上任务 QA 不得假设真实上传存在真值；没有任务级 `QAReport` 的文件不能解锁正式下载。
- `CAP-09.execute` 是控制面，不是像素 DAG 的末端节点；它可以在研究环境执行预注册候选，但必须记录环境与证据状态，不能借此让候选进入产品。
- `CAP-09.recommend` 只可在达到当前可见门槛的效果之间做资格与排序。它是产品选择流程依赖，不进入效果自身 U1 / E1 的执行 DAG，也不阻塞效果先取得内部证据。

## 3. 公共逻辑类型

这些是文档阶段冻结的逻辑接口，不代表本轮已经实现运行时代码。字段可以在实现前增加，但不得删除版本、来源、变化边界、QA 或许可等可审计信息。

### `CapabilityContract`

每一个原子能力版本必须声明：

```text
capability_contract_id + capability_domain + contract_version
input_artifact_types + output_artifact_types
eligibility + rejection_conditions
parameter_schema
executor + algorithm/model/checkpoint
execution_location + processing_region + data_policy_version
idempotency_scope + query/cancel/timeout/retry/reconciliation_semantics
must_preserve + may_change + must_not_change
qa_profile + fallback
cost_class + latency_class + hardware_requirements
observability_profile + sli_slo_profile + runbook_ids
code_license + weight_license + data_terms
evidence_status + release_status
```

页面和场景不得直接依赖具体模型名称，只依赖 `CapabilityContract`。更换模型或 checkpoint 时创建新能力版本；旧证据不能自动迁移。执行器没有冻结幂等、查询、取消、超时、有限重试、未知终态 reconciliation、地域、成本归因和可观测性语义时，合同不得进入 Gate B；“供应商支持重试”或“控制台可查”不能代替这些第一方合同。

### 产物类型

| 类型 | 最小含义 |
| --- | --- |
| `ImageAsset` | 原始文件指纹、解码状态、权利 / 同意快照、隐私级别和来源版本 |
| `NormalizedImage` | 固定方向、颜色空间、像素尺寸、编码策略与父资产引用的规范输入 |
| `SourceCard` | 模型 / 算法版本、可审计观测、置信边界、未知项和建议资格所需特征 |
| `SubjectMap` | 检测到的主体、类别、区域、数量、层级与选择来源 |
| `AlphaMatte` | 与规范输入对齐的连续 Alpha、前景 / 未知区及生成它的引擎版本 |
| `ForegroundLayer` | 与 `AlphaMatte` 对齐的前景 RGB / Alpha 层，记录边缘去色、污染控制、颜色空间及 premultiply 语义；不是最终编码文件 |
| `MatteRevision` | 对某一 `AlphaMatte` 的可追溯修正，记录父版本、擦除 / 恢复操作、工具与参数、修正范围和操作者角色 |
| `CompositeImage` | 经确定性操作得到的可追溯图片，包括裁切、缩放、定位、颜色 / 光色处理、非生成式降噪或背景合成；必须记录操作图与父资产 |
| `GeneratedCandidate` | 生成式输出、请求 / 配方版本、参考输入、mask、随机性与候选序号 |
| `DeliveryArtifact` | 经冻结导出合同编码并重新解码验证的最终文件，记录 MIME、像素、ICC / sRGB、Alpha、premultiply、元数据策略、字节数与文件 hash |
| `ExecutionPlan` | 已选 effect / scene 的版本化执行合同、输入绑定、能力 DAG、输出选择器、资源预算、fallback 与失效条件；执行后由 `RunManifest` 引用 |
| `RecommendationSet` | 针对一个 `SourceCard` 和冻结目录产生的合格 / 拒绝效果、规则版本、可解释理由、预计成本 / 时延与排序；不包含伪造结果 |
| `ReferencePair` | 经发布 allowlist 的来源 / 结果参考对，绑定效果、执行版本、显示变换、权利和 Release Gate；不得用概念图代替真实运行证据 |
| `ComparisonBundle` | 当前用户的原图、所选 `ReferencePair` 与本次结果的显示组合，记录各自原始产物、显示缩放 / 裁切和权利边界 |
| `QAReport` | QA profile、指标、人工检查、失败原因、下载 / 发布决定和检查器版本 |
| `RunManifest` | 一次用户执行的版本化不可变运行快照，引用所有 attempt、provider call、QA、交付、删除、成本和追加式事件流；失败、取消与未知终态也必须生成，后续生命周期变化只能新建版本 |
| `RunEvent` | 一次运行中不可变、追加式的状态或边界事件，带 trace / span / request 与执行层级 ID、发生 / 观察时间、低敏属性和前序事件 hash |
| `ErrorEnvelope` | 统一的脱敏错误结构，包含 stage、canonical code、retry class、可能费用、安全用户文案、支持码和 runbook；供应商原文不直接外泄 |
| `O1Profile` | 对精确浏览器、硬件、服务版本、区域、输入与负载范围冻结的 SLI / SLO、容量、成本、错误预算和故障注入合同 |
| `EvidenceManifest` | 夹具版本、候选版本、预注册阈值、原始结果、盲评、失败、成本 / 时延、权利与证据等级 |

所有派生产物必须引用父产物和 `RunManifest`；禁止只保存成品而丢失来源、版本或失败记录。运行中状态由 `RunEvent` 投影，不能覆盖历史状态；执行、界面绑定、QA、交付与删除状态必须分离。普通日志、trace 和 metrics 只用于脱敏诊断，不能替代 manifest / event 证据。完整字段、ID 层级和 O1 门槛由 [OBSERVABILITY_AND_OPERATIONS.md](OBSERVABILITY_AND_OPERATIONS.md) 冻结。

### `SourceCard.v0` 最小合同

Slice 02 的实际序列化合同以 [SourceCard.v0 schema](./research/slice-02/schemas/source-card.v0.schema.json) 为准；下列使用相同 camelCase 字段名。`@0.2.0` 只允许从归一化 PNG 字节重开核对技术字段，尚未冻结的质量、主体和内容观察被 schema 强制为 `unknown`：

```text
schemaVersion=source-card.v0
technical: mime + width + height + orientation + colorProfile + alphaPresent
quality: blur + exposure + noise
subject: primarySubjectType + subjectCount + personCount
content: textPresence + backgroundComplexity
perField: observerContract + confidence(lower, upper) + unknownReason
```

`unknown` 是正式值，不得由默认分数或模型猜测补齐。`@0.2.0` 中 technical observation 为强类型且 `confidence=[1,1]`；其余 observation 固定为 `value=unknown`、`confidence=[0,0]` 和逐字段 `unknownReason`。未来若要增加 `person|object|animal|scene`、布尔文字存在或背景复杂度枚举，必须发布新的合同 / schema 版本并独立取证，不能在 v0.2.0 内偷换。`SourceCard.v0` 不做身份、年龄、敏感属性或审美价值判断；OCR 文本内容、材质、动作和空间理解留待独立合同。

Slice 03 的 [`TechnicalObserverResult.slice03.v0`](./research/slice-03/schemas/technical-observer.slice03.schema.json) 是独立的研究中间产物：它从实际 normalized bytes 重开核对技术事实，并把 `sourceFormatFacts` 与 `normalizedArtifactFacts` 分栏。它不是新的产品 `SourceCard`，不会从 normalized PNG 反推源格式，且质量、主体和内容继续强制为 unknown。其冻结研究合同与验收见 [Slice 03 contract](./research/slice-03/contracts/technical-observer.slice03.v0.3.0.json) 和 [证据记录](./research/SLICE_03_EVIDENCE.md)；这些设施不授予 CAP-03 的 C1。

Slice 04 又为 `CAP-02` 冻结 `CC-CAP02-NORMALIZE-PNG@0.4.0` 与 `CC-CAP02-EXPORT-PNG@0.4.0` 两份 candidate-bound metadata contract，并将其绑定到 `REG-NORM-SHARP@0.4.0`、共享 QA、两份 operation-specific plan 与两份独立预注册。每项初始 C1 只预注册 sealed 48 个来源；operation artifact schema / independent oracle、adapter、named hardware、codec smoke、calibration 或正式像素均未创建，Slice 03 observer 只作不兼容 design lineage。全部格式仍为 `productSupport=false`，因此这些记录不能被页面、效果 DAG 或下载路径解析为已执行能力。范围与证据见 [Slice 04 contract](./research/SLICE_04_CONTRACT.md) 和 [Slice 04 evidence](./research/SLICE_04_EVIDENCE.md)。

Slice 05 没有覆盖上述历史记录，而是新增 `REG-NORM-SHARP@0.5.0` installed runtime candidate 与 `CC-CAP02-NORMALIZE-PNG@0.5.0` / `CC-CAP02-EXPORT-PNG@0.5.0` 两份 adapter-bound research contract。`NormalizedImage.slice04.v0` 与 `DeliveryArtifact.slice04.v0` strict schema、independent oracle / gold、adapter / isolated worker、named hardware、local runner、Gate B plan 及开放 manifest / preregistration 已在 `2026-08-15T04:23:38.389Z` 的 machine definition 中精确 pin。随后唯一注册真实 smoke 中，normalize 为 `6 pass / 12 non-pass`、export 为 `9 pass / 9 non-pass`；18 次 applicable attempt 全部 `S05_OUTPUT_ORACLE_REJECTED`，artifact 为 0，两份 Gate B decision 均为 `denied-not-entered`、`calibrationAuthorized=false`。该版本已经关闭，不得 calibration 或选择性重跑，仍不能被产品页面、效果 DAG 或下载路径解析为能力。完整证据见 [Slice 05 evidence](./research/SLICE_05_EVIDENCE.md)。

Slice 06 Phase B / C 为 diagnostic-only `@0.6.0` 建立 strict adapter、isolated worker、独立 PNG oracle、durable runner、26 份 schema、`REG-NORM-SHARP@0.6.0`、两份合同与 24-attempt preregistration。唯一注册诊断已闭合：每项 9 个 applicable oracle non-pass + 3 个 preflight rejection，18 份输出的 bytes / pixels / classification / runtime 都 3 / 3 一致，worker exit / telemetry 完整；独立重开均得到缺 `sRGB`、含 `pHYs`。这些结果只是 candidate selection diagnosis，不能被效果 DAG、页面或下载路径解析为可执行能力。完整证据见 [Slice 06 evidence](research/SLICE_06_EVIDENCE.md)。

Slice 07 的唯一 registered smoke 已关闭：18 / 18 applicable attempts 的 Sharp RGBA8 + 项目原创 canonical PNG encoder 输出均通过 independent oracle；18 个 rejection 因 driver binding 漏传分类字段而全部 non-pass。两项 Gate B denied，calibration、C1 与产品支持仍为 0 / false。见 [Slice 07 result evidence](research/SLICE_07_RESULT_EVIDENCE.md)。

### `EffectDefinition`

用户效果的逻辑合同包含：

```text
effect_id + effect_version
execution_dag
execution_control
selection_dependencies
user_parameters
eligibility + change_contract
qa_bundle
reference_pair_policy
evidence_status + release_status
```

`execution_dag` 只描述产物如何从输入变成用户结果；`execution_control` 绑定 `CAP-09.execute`，但控制面不伪装成像素节点；`selection_dependencies` 记录生成推荐集合所需的 `SourceCard` 与 `CAP-09.recommend`。U1 / E1 只验证冻结的执行合同、任务 QA 与适用分母，不依赖后置推荐先成立；进入产品选择流程前，selection dependencies 仍必须完整取得相应证据。

`research-candidate` 阶段的效果可以先引用本文件中存在的 `CAP-01`～`CAP-09` 能力域或注册表中的 `contract_version=planned` 条目，用于冻结目标 DAG 和研究顺序；这不表示执行器已经存在或能力已经取得 C1。效果升级到 `validated-internal` 或 `released` 前，每个 `execution_dag` 节点都必须解析到 [CAPABILITY_REGISTRY.md](CAPABILITY_REGISTRY.md) 中一个冻结的 `CapabilityContract` 版本，并记录 Registry ID、实现版本 / commit、模型或规则版本及有效证据。出现 `planned`、`pending-*`、`research-only`、`no-go` 或 C1=0 的节点时不得升级。一个 variant 若改变输出合同、分母或 QA，应独立取证；例如 `effect.subject-background` 的 `transparent` 与 `solid` 共用 Alpha 底座，但必须分别验证导出与合成结果。

### `SceneRecipe`

场景配方包含：

```text
scene_id + scene_version + target_purpose
effect_refs(effect_id + effect_version + variant)
additional_capability_contracts
input_selectors + output_selectors
parameter_constraints + eligibility + rejection_conditions
scene_qa + claim_boundary + expansion_policy
```

场景只组合已经发布的依赖；任一依赖失效，场景自动失效。`effect_ref` 展开一次；只有 contract 版本、输入父产物与参数完全一致的重复节点才可复用，否则必须报冲突，不能静默运行两次或借用旧输出。场景若要读取效果中间产物，`EffectDefinition` 必须把它列为可复用 `output_selector`；否则应直接引用产生该产物的冻结能力合同。

例如，普通报名头像不是新模型：

```text
CAP-03 单人 / 质量资格
+ CAP-04 人像 Alpha
+ CAP-05 头肩 placement 与纯色合成
+ CAP-02 尺寸 / 格式交付
+ CAP-08 人脸、边缘、构图与输出 QA
= scene.registration-portrait
```

它不自动成为任何地区或机构的官方证件照。

## 4. 横向、纵向与组合扩展

### 横向扩展：增加新的原子动作

横向扩展指在既有合同体系中加入新的可复用动作，例如：

```text
Matting → 自然增强 → 对象消除 → 扩图 → 重打光 → 超分 → 创意生成
```

每个新动作先登记为候选能力；研究态效果可以引用它所属的 CAP 域来声明待验证 DAG，但只有取得 C1 的冻结能力版本才可被可执行或发布效果解析。不能因为某个场景需要，就绕过能力验证直接写进页面。

### 纵向扩展：把同一能力链做深

首条纵向研究冻结为“主体与背景”：

```text
规范输入
→ 主体检测
→ 粗分割
→ Alpha Matting
→ 发丝 / 毛发 / 孔洞处理
→ 边缘去色与污染控制
→ 黑 / 白 / 彩底视觉 QA
→ 用户擦除 / 恢复
→ 透明 PNG
→ 纯色换底
→ 图片换底
→ AI 背景
→ 阴影与重打光
```

第一闭环只到“透明 PNG + 纯色换底 + 任务 QA”。图片换底、AI 背景、阴影与重打光在前序能力取得证据后再追加。

### 组合扩展：形成效果与场景

| 各依赖分别验证后可组合的候选能力 | 可形成的上层结果 |
| --- | --- |
| `CAP-03 + CAP-04 + CAP-05 + CAP-08` | 透明主体、纯色换底 |
| `CAP-03 + CAP-06 + CAP-08` | 自然增强、后续旧照修复 |
| `CAP-03 + CAP-07 + CAP-08` | Skill 创意效果；产品入口另依赖 `CAP-09.recommend` |
| `CAP-03 + CAP-04 + CAP-05 + CAP-02 + CAP-08` | 普通报名头像、商品白底图等场景草案 |
| `CAP-04 + CAP-05 + CAP-07 + CAP-08` | 后续商品场景图、生成背景与融合 |

相同原子能力可以服务多个效果和场景，但每个上层结果仍需自己的 U1 / E1、运行、运维、治理、价值与发布证据。

## 5. 当前研究组合

当前不是同时实现九类能力，而是按依赖建立最小可验证纵切：

1. `CAP-01 + CAP-02`：Slice 05 Gate B 双拒绝，Slice 06 diagnostic 定位 Sharp PNG profile 缺陷；Slice 07 applicable 路径全过但 rejection protocol 失配，Slice 08 又因 gold ID 读取错误在 worker 前失败。Slice 09 用 versioned gold identity 闭合 36 / 36 terminal attempts：normalize / export 各 9 applicable + 9 exact rejection pass，两项 Gate B 均 pass。该结果仍是开放 research smoke，calibration 未授权、formal holdout 未创建、C1=0。
2. `CAP-03`：形成最小 `SourceCard`，只记录可验证字段，不伪造推荐分数。
3. `CAP-04 + CAP-05 + CAP-08`：对测 Matting 并完成透明 / 纯色主体背景效果。
4. `CAP-09.execute`：随第一条无界面管线冻结确定性执行控制、状态、fallback 和失效传播，但不参与像素质量结论。
5. `CAP-06 + CAP-08`：建立自然增强的退化、no-op 与副作用协议。
6. `CAP-07 + CAP-08`：以 CR1 / CR2 真实对测保留一个稳定创意方向。
7. `CAP-09.recommend`：最后只在达到证据门槛的少量效果之间做硬资格和可解释排序。

首个混合邀请测试的最低组合是：质量、主体 / 背景、创意三个方向各至少一个效果满足 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md) 的完整发布公式。未达到门槛的能力和效果保持研究态，不用页面占位或 E0 样例补齐。
