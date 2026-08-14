# 基础能力候选注册表

> 状态：当前规范（研究注册表）  
> 最后核对：2026-08-14  
> 当前结论：以下条目均未取得 `C1`，也没有任何第三方代码、模型权重或资产进入本项目。

本文是基础能力候选的唯一决策账本。它记录“可以研究什么、为什么尚不能发布”，不代表依赖已安装、模型已接入或能力已经成立。来源及第三方边界见 [UPSTREAM.md](./UPSTREAM.md)，能力定义见 [CAPABILITY_MAP.md](./CAPABILITY_MAP.md)，证据门槛见 [EVIDENCE_AND_RELEASE.md](./EVIDENCE_AND_RELEASE.md)。

## 状态含义

| 状态 | 含义 | 允许的动作 |
| --- | --- | --- |
| `planned` | 本地原创合同或框架尚在设计，连实现版本都未冻结 | 只写合同与预注册；不得作为可执行能力解析 |
| `research-only/pending-freeze` | 官方来源与初步许可边界可研究，但精确 commit / package / checkpoint / hash 尚未全部锁定 | 只读研究和版本解析；锁定前不得下载或进入对测 |
| `candidate` | 不可变实现 / 服务版本与基础许可边界已经锁定，可以开始实现适配器；是否可进入正式 calibration 仍取决于下方 Gate B | 仅在隔离的非产品环境做适配与获批实验 |
| `research-only` | 方法值得研究，但权重、训练数据、依赖、维护状态或商业边界仍有未解阻塞项 | 只读研究；补齐阻塞项前不得进入产品运行链 |
| `no-go` | 已知许可、政策或用途条件与目标用途冲突 | 不下载、不集成、不生成发布资产 |

`candidate` 不等于 Gate B、`C1`，更不等于“可发布”。不可变实现 / 服务版本或基础许可字段出现 `planned`、`pending-freeze`、`pending-selection` 或 `pending-resolution` 时，条目不得标为 `candidate`；合同、适配器或预注册仍为 `pending-definition` 时可以保持来源层面的 candidate，但不得开始正式 calibration。`pending-benchmark` 在 Gate B 后允许受控对测，但会阻止 C1、O1 和发布。当前首批候选中没有整体条目被判为 `no-go`；已识别的禁止变体会在对应条目中单独列明。

## 登记与晋级规则

候选按三个不可倒置的 Gate 前进。性能和证据是对测产物，不得反过来成为进入对测的前置条件。

### Gate A · source-resolved：允许取得依赖或准备服务适配

```text
source_url
+ immutable_source_ref (git commit / exact package version)
+ artifact_boundary(artifact_name + artifact_url + sha256)
  或 hosted_service_boundary(snapshot + terms_checked_at + endpoint)
+ code_license + weight_license + dependency_licenses
+ training_data_note
= Gate A
```

Gate A 只允许按记录边界下载 / 安装或准备托管服务 adapter，不允许把输出计入正式 calibration。无模型库的权重与训练数据字段写 `n/a`；上游未披露的内容写 `unknown`，不能留空或猜测。

### Gate B · calibration-ready：允许正式对测

```text
Gate A
+ planned CapabilityContract 已补成冻结 contract_version
+ adapter_version + execution_location + named_hardware_profile
+ fixture_version + preregistration_id + cost_guardrail
+ 输入输出、失败语义、日志与数据发送边界通过 smoke test
+ 幂等 / 查询 / 取消 / 超时 / 有限重试 / UNKNOWN reconciliation 已冻结
+ provider_request_id / region / cost 映射通过 smoke test（远程执行器）
= Gate B
```

Gate B 要求的是“使用哪台 / 哪类硬件”和成本上限，不要求尚未产生的 p50 / p95 或每次成本结论。`EvidenceManifest` 此时只登记预注册路径和空的结果位置。

### Gate C · C1：允许冻结原子能力版本

```text
Gate B
+ p50/p95_latency + peak_ram/vram + measured_cost_per_run
+ dev/calibration 原始结果 + 独立 holdout
+ defect 检出与误拒绝 + 重复性 + failure ledger
+ 完整 EvidenceManifest
= C1 候选评审
```

Gate C 通过后仍只授予指定 `CapabilityContract` 版本 C1，不授予整个仓库或模型家族；O1、G1、上层 U1 / E1 与发布公式继续独立判断。

- 分支名、`latest`、浮动包版本和模型别名都不是可复现实验边界。
- 代码许可不能自动覆盖 checkpoint、训练数据、示例图片、字体、第三方依赖或模型输出。
- 从 Hugging Face、Google Drive、GitHub Release 或镜像站下载的同名权重，必须分别记录发布者、文件哈希和该文件适用的许可。
- 上游性能数字只作线索；本项目的成本、时延、内存和质量结论必须在冻结硬件与夹具上实测。
- 任何候选只有在许可证、治理、运行和效果证据同时满足 [EVIDENCE_AND_RELEASE.md](./EVIDENCE_AND_RELEASE.md) 后才能离开本表的研究状态。

### 远程执行器附加登记字段

任何由第一方服务端调用的远程执行器，在 Gate B 前还必须逐项冻结；缺失项写 `unknown` 并阻止 Gate B，不能以供应商控制台或 SDK 默认值代替：

```text
adapter_version + endpoint + immutable_provider_snapshot
request_schema_version + response_schema_version
idempotency_key_scope + deduplication_window + duplicate_outcome
submit_semantics + status_query_semantics + terminal_state_mapping
cancel_semantics + cancel_acknowledgement + late_result_policy
connect_timeout + request_timeout + overall_deadline
retryable_codes + maximum_attempts + backoff + jitter
unknown_state_reconciliation_window + reconciliation_poll_policy
local_provider_call_id + provider_request_id_mapping
processing_region + storage_region + cross_region_egress
rate_limit + concurrency_quota + admission_policy
input_data_classes + provider_retention + deletion_capability
cost_unit + price_record_version + estimated/reported/billed fields
possible_charge_semantics + per_execution_cost_guardrail
safe_log_fields + redaction_rules + runbook_ids
```

自动重试每次都创建新的 `pipeline_attempt_id` / `provider_call_id`，但必须保持冻结的幂等语义；提交结果未知时只允许查询或 reconcile，不得盲目再次计费。供应商取消成功、本地不再展示、供应商删除完成是三个不同事实。ID、状态、事件、支持码、成本与故障注入的完整合同见 [OBSERVABILITY_AND_OPERATIONS.md](./OBSERVABILITY_AND_OPERATIONS.md)。

## 首批候选总览

Registry ID 标识候选实现，`CAP-01`～`CAP-09` 标识稳定能力域，两者不能互换。一个实现可以服务多个能力域；C1 只授予冻结的 `CapabilityContract` 版本，不授予某个仓库的全部功能。

| Registry ID | 候选 | 能力域 | 目标能力 | 当前状态 | 主要阻塞项 |
| --- | --- | --- | --- | --- | --- |
| `REG-LOCAL-ASSET-INGEST` | 本地来源资产合同与入口 | `CAP-01` | 文件真实性、授权快照、hash 与父子版本 | `planned` | 冻结合同版本、持久化边界与治理验证 |
| `REG-NORM-SHARP` | Sharp | `CAP-02`、`CAP-05` | 来源归一化、裁切、合成、导出 | `research-only/pending-freeze` | 精确 npm 版本、传递依赖、性能基准 |
| `REG-NORM-LIBVIPS` | libvips | `CAP-02`、`CAP-05` | 低内存确定性图像处理 | `research-only/pending-freeze` | 精确 tag/commit、构建选项、LGPL 交付方式 |
| `REG-VISION-OPENCV` | OpenCV | `CAP-03`、`CAP-05`、`CAP-08` | 质量指标、几何、蒙版与 QA | `research-only/pending-freeze` | 精确 tag/commit、启用模块与第三方组件清单 |
| `REG-DETECT-GROUNDING-DINO` | Grounding DINO | `CAP-03`、`CAP-04` | 开放词汇主体检测 | `research-only` | checkpoint 许可、哈希、训练数据与依赖审计 |
| `REG-SEG-SAM2` | SAM 2.1 | `CAP-04` | 点击/框提示分割与人工修正 | `research-only/pending-freeze` | 精确 commit、checkpoint 选择/哈希、硬件实测 |
| `REG-MATTE-BIREFNET` | BiRefNet | `CAP-04` | 通用高分辨率主体分割/Matting 候选 | `research-only` | 官方权重许可与哈希未锁定 |
| `REG-MATTE-MODNET` | MODNet | `CAP-04` | 人像 Matting 基线 | `research-only/pending-freeze` | 精确 commit、checkpoint 文件/哈希、真实图对测 |
| `REG-BASELINE-MATTE-SIMPLE` | 本地简单 Matting 基线占位 | `CAP-04` | 证明复杂候选相对简单方法的增益，不作为产品 fallback | `planned` | 冻结算法、适用分母、合同与实现版本 |
| `REG-LOCAL-EDGE-REFINE` | 本地边缘净化适配器 | `CAP-04` | 前景颜色去污染、孔洞与 Alpha / premultiply 语义 | `planned` | 冻结算法、参数、底层原语和多底 QA |
| `REG-LOCAL-MATTE-CORRECTION` | 本地擦除 / 恢复修正工具 | `CAP-04` | 版本化用户修正与 `MatteRevision` | `planned` | 冻结交互操作、次数 / 面积、父版本与重验 |
| `REG-LOCAL-NATURAL-ENHANCE` | 本地非生成自然增强适配器 | `CAP-06` | 限幅光色 / 噪声 / 轻度清晰度与 no-op | `planned` | 冻结算法图、参数上限、底层库版本与 QA |
| `REG-RESTORE-REAL-ESRGAN` | Real-ESRGAN | `CAP-06` | 超分辨率与退化修复候选 | `research-only` | 权重许可范围、依赖链、幻觉细节 QA |
| `REG-RESTORE-RESTORMER` | Restormer | `CAP-06` | 去噪、去模糊、去雨候选 | `research-only` | Google Drive 权重的明确许可与哈希 |
| `REG-INPAINT-LAMA` | LaMa | `CAP-07` | Mask 驱动对象消除/修补候选 | `research-only` | 权重来源、镜像一致性、许可与哈希 |
| `REG-GEN-DIFFUSERS` | Diffusers | `CAP-07` | 本地生成模型适配框架 | `research-only/pending-freeze`（仅框架） | 精确版本；每个下游模型必须独立登记 |
| `REG-CLOUD-OPENAI-IMAGE` | OpenAI GPT Image 2 API | `CAP-07` | 云端创意生成与编辑 | `candidate` | 成本/时延、数据流、失败率与输出 QA |
| `REG-LOCAL-QA-EVIDENCE` | 本地 QA 与证据框架 | `CAP-08` | QA 调度、运行 manifest、证据与下载门禁 | `planned` | 冻结框架合同、持久化与反证夹具 |
| `REG-LOCAL-QA-OFFLINE` | 离线证据 QA 合同 | `CAP-08` | 真值指标、盲评、候选比较与 EvidenceManifest | `planned` | 冻结指标实现、评审协议与 fixture 版本 |
| `REG-LOCAL-QA-RUNTIME` | 线上任务 QA 合同族 | `CAP-08` | 无真值条件下的任务检查、人工 fallback 与下载决定 | `planned` | 冻结各效果 QA profile、checker 与误放行上限 |
| `REG-LOCAL-ORCHESTRATOR` | 本地显式规则编排器 | `CAP-09` | 独立 `execute` / `recommend` 合同，共用状态与失效基础设施 | `planned` | 分别冻结执行规则、推荐规则与证据 |

## Planned `CapabilityContract` 解析表

下表让研究态 `EffectDefinition.execution_dag` 能指向明确的合同占位，而不是只指向宽泛 CAP 域。这里的 `@planned` 是字面状态，不是可执行版本。所有条目统一为：

```text
contract_version=planned
implementation_ref=pending-freeze
parameter_schema=pending-definition
eligibility/rejection=pending-definition
must_preserve/may_change/must_not_change=pending-definition
cost/latency/hardware=pending-benchmark
evidence_status=C1=0
release_status=planned
```

每行列出的 Registry ID 只是候选执行器集合。进入 Gate B 前，必须从集合中选择并冻结实际执行器，把许可 / 服务边界、输入输出、参数、变化合同、QA profile 与 fallback 补成完整 [CapabilityContract](./CAPABILITY_MAP.md#capabilitycontract)；不得把 `@planned` 字符串改名后冒充版本。

| Planned Contract ref | CAP 域 | 输入 → 输出 | 候选执行器映射 | 计划边界与 QA / fallback |
| --- | --- | --- | --- | --- |
| `CC-CAP01-INGEST@planned` | `CAP-01` | 用户文件 + 权利快照 → `ImageAsset` | `REG-LOCAL-ASSET-INGEST` | 解码 / hash / 权利失败即拒绝；不把浏览器预检当事实源 |
| `CC-CAP02-NORMALIZE@planned` | `CAP-02` | `ImageAsset` → `NormalizedImage` | `REG-NORM-SHARP` 或 `REG-NORM-LIBVIPS` | 方向、ICC→sRGB、像素与元数据策略待冻结；失败不降级为原始字节 |
| `CC-CAP02-EXPORT@planned` | `CAP-02` | `ForegroundLayer` / `CompositeImage` / `GeneratedCandidate` → `DeliveryArtifact` | `REG-NORM-SHARP` 或 `REG-NORM-LIBVIPS` | MIME、Alpha / premultiply、ICC、元数据和重开校验待冻结；导出失败不解锁下载 |
| `CC-CAP03-SOURCE-CARD-V0@planned` | `CAP-03` | `NormalizedImage` → `SourceCard.v0` | `REG-VISION-OPENCV` + 许可完成后的检测候选 | 只输出能力地图定义的 v0 字段；每字段允许 `unknown + unknown_reason`，不得补猜 |
| `CC-CAP04-DETECT@planned` | `CAP-04` | `NormalizedImage` + 目标类别 → `SubjectMap` | `REG-DETECT-GROUNDING-DINO` 或后续登记候选 | 主体数量 / 类别 / 框与拒绝边界待冻结；错误主体不得静默进入 Matting |
| `CC-CAP04-SEGMENT@planned` | `CAP-04` | `NormalizedImage` + `SubjectMap` + prompt → `SubjectMap` | `REG-SEG-SAM2` 或后续登记候选 | 输出是区域，不等于连续 Alpha；失败回到重新选主体或拒绝 |
| `CC-CAP04-MATTE@planned` | `CAP-04` | `NormalizedImage` + `SubjectMap` → `AlphaMatte` | `REG-MATTE-BIREFNET` / `REG-MATTE-MODNET` 中与冻结分母匹配者 | 人像与通用物体不得共用未验证证据；灾难性误删直接失败 |
| `CC-CAP04-MATTE-SIMPLE@planned` | `CAP-04` | `NormalizedImage` + `SubjectMap` → `AlphaMatte` | `REG-BASELINE-MATTE-SIMPLE` | 只作 calibration 比较，不得自动成为产品 fallback |
| `CC-CAP04-EDGE-REFINE@planned` | `CAP-04` | `NormalizedImage` + `AlphaMatte` → `ForegroundLayer` | `REG-LOCAL-EDGE-REFINE` + 锁定后的 `REG-VISION-OPENCV` | 边缘去色、污染控制、孔洞与 premultiply 语义待冻结；黑 / 白 / 彩底检查 |
| `CC-CAP04-CORRECT@planned` | `CAP-04` | `ForegroundLayer` + 用户操作 → `MatteRevision` + 新 `AlphaMatte` / `ForegroundLayer` | `REG-LOCAL-MATTE-CORRECTION`；语义提示候选另有 `REG-SEG-SAM2` | 修正次数、面积、工具、父版本与 corrected-pass QA 待冻结；不可隐藏 first-pass 失败 |
| `CC-CAP05-COMPOSE-SUBJECT-BG@planned` | `CAP-05` | `ForegroundLayer` + 背景参数 → `CompositeImage` | `REG-NORM-SHARP` / `REG-NORM-LIBVIPS` / `REG-VISION-OPENCV` 中的冻结组合 | 透明或纯色 variant 分开参数与 QA；受保护前景不得重画 |
| `CC-CAP06-NATURAL-ENHANCE@planned` | `CAP-06` | `NormalizedImage` + `SourceCard.v0` → `CompositeImage` 或 no-op | `REG-LOCAL-NATURAL-ENHANCE` | 仅非生成、限幅光色 / 噪声 / 清晰度；无可信改善返回 no-op，不转用重建模型 |
| `CC-CAP07-CREATIVE@planned` | `CAP-07` | `NormalizedImage` + 版本化参考 / 配方 → `GeneratedCandidate` | `REG-CLOUD-OPENAI-IMAGE` 或后续完整登记模型 | 必须绑定冻结 snapshot、配方、数据边界、幂等 / 查询 / 取消 / UNKNOWN 与一次显式用户重试；不保证像素级身份 |
| `CC-CAP08-OFFLINE-EVIDENCE@planned` | `CAP-08` | fixture 真值 + 候选输出 + 盲评 → `EvidenceManifest` | `REG-LOCAL-QA-OFFLINE` + 已冻结 checker | 允许 IoU / Alpha MAE / boundary F1 等真值指标；不得充当真实上传的 runtime QA |
| `CC-CAP08-RUNTIME-SUBJECT-BG@planned` | `CAP-08` | 用户运行产物 + 任务合同 → `QAReport` | `REG-LOCAL-QA-RUNTIME` + 已冻结 checker | 无真值条件下检查 Alpha / 主体 / 边缘预览 / 纯色 / 编码，并允许人工 fallback；失败锁下载 |
| `CC-CAP08-RUNTIME-NATURAL-ENHANCE@planned` | `CAP-08` | 原图 + 增强结果 + 任务合同 → `QAReport` | `REG-LOCAL-QA-RUNTIME` + 已冻结 checker | 检查几何、文字、身份敏感区域、副作用与 no-op；不把感知分数单独当放行 |
| `CC-CAP08-RUNTIME-CREATIVE@planned` | `CAP-08` | 原图 + `GeneratedCandidate` + must-keep → `QAReport` | `REG-LOCAL-QA-RUNTIME` + 已冻结 checker | 检查主体数量、must-keep、假文字 / 水印、参考泄漏与人工可用性；失败锁下载 |
| `CC-CAP09-EXECUTE@planned` | `CAP-09` | 已选 `EffectDefinition` / `SceneRecipe` + 绑定产物 → `ExecutionPlan`，执行写 `RunManifest` | `REG-LOCAL-ORCHESTRATOR` | 只做确定性 DAG、状态、fallback 与失效控制；作为控制面，不进入像素 DAG |
| `CC-CAP09-RECOMMEND@planned` | `CAP-09` | `SourceCard.v0` + 可见效果目录 → `RecommendationSet` | `REG-LOCAL-ORCHESTRATOR` | 只对满足当前可见门槛的效果做硬资格和可解释排序；不阻塞效果先取得 U1 / E1 |

## 本地原创候选

以下条目用于闭合能力域与执行候选之间的引用。它们不是第三方依赖，也不表示 R0 探针已经实现对应能力；`planned` / `pending-freeze` 与 `C1=0` 均为硬停止状态。

### `REG-LOCAL-ASSET-INGEST` — 来源资产合同与入口

| 字段 | 记录 |
| --- | --- |
| 来源 | [本项目](./README.md) 本地原创研究；未来实现不得通过相对路径依赖兄弟项目 |
| 固定研究边界 | `observed_at=2026-08-14`；`CapabilityContract version=planned`；`implementation_ref=pending-freeze` |
| 预期职责 | 生成 `ImageAsset`：文件真实性/可解码性、来源 SHA-256、最小元数据、处理授权/公开展示/商业宣传权限快照、隐私等级与父子版本关系 |
| 运行位置 | 正式入口位于服务端网关；浏览器只做可重复的快速预检，不能单独成为来源或授权事实源 |
| 代码许可 | 本地原创；本项目尚未选择对外许可证，外部分发权不因本登记而授予 |
| 模型/权重/服务 | 不使用模型或外部图片服务；若未来增加内容审核、恶意文件扫描或对象存储服务，须另建注册项 |
| 硬件、成本、时延 | `pending-benchmark`；记录每种格式/像素级别的 p50/p95、峰值 RAM、hash 与解码成本 |
| 当前 R0 边界 | 已有输入预检和 hash 只能作为实现线索；尚无冻结 `CapabilityContract`、权利持久化或独立 holdout 证据 |
| 证据与状态 | `C1=0`，`planned`；`implementation_ref` 冻结前不得被效果解析为已验证能力版本 |

### `REG-LOCAL-QA-EVIDENCE` — QA 与证据框架

| 字段 | 记录 |
| --- | --- |
| 来源 | [本项目](./README.md)、[证据与发布规范](./EVIDENCE_AND_RELEASE.md) 本地原创研究 |
| 固定研究边界 | `observed_at=2026-08-14`；`CapabilityContract version=planned`；`implementation_ref=pending-freeze`；`qa_profile_version=pending-definition` |
| 预期职责 | 生成 `QAReport`、`RunManifest` 与 `EvidenceManifest`；保存输入/执行/输出 hash、任务专属检查、人工复核、失败理由和下载/发布决定 |
| 运行位置 | QA 检查可在视觉 worker 执行；证据汇总、最终门禁和不可变记录由服务端负责，浏览器不得自行宣布通过 |
| 代码许可 | 本地原创；本项目尚未选择对外许可证，外部分发权不因本登记而授予 |
| 模型/权重/服务 | 框架本身无模型；OpenCV、感知指标、检测器、外部审核服务等每个 checker 必须解析到自己的冻结注册项与版本 |
| 硬件、成本、时延 | `pending-benchmark`；分别记录 checker 时延/资源与整个 QA bundle 的 p50/p95、误放行和误拒绝 |
| 当前 R0 边界 | 文件 hash、run ID 和响应完整性仅属于 `integrity_check`，不是图片任务 QA，不得升级为 `QAReport.pass` |
| 证据与状态 | `C1=0`，`planned`；必须先通过 `defect` 反证集和独立 holdout 才能冻结任何 QA profile |

### `REG-LOCAL-QA-OFFLINE` — 离线证据 QA 合同

| 字段 | 记录 |
| --- | --- |
| 来源 | [本项目](./README.md)、[证据与发布规范](./EVIDENCE_AND_RELEASE.md) 本地原创研究 |
| 固定研究边界 | `observed_at=2026-08-14`；`CapabilityContract=CC-CAP08-OFFLINE-EVIDENCE@planned`；`implementation_ref=pending-freeze`；`metric_bundle=pending-definition` |
| 预期职责 | 在有 fixture 真值或冻结盲评协议时计算候选指标、困难类别和灾难性失败，保存全部原始结果并生成 `EvidenceManifest` |
| 输入 / 输出与变化边界 | fixture manifest + 真值 / 评审表 + 候选产物 → `EvidenceManifest`；只评价和记录，不修改候选图片 |
| 运行位置 | 自托管研究 worker 与受控复核工具；原始结果默认不公开 |
| 代码许可 | 本地原创；具体指标实现和 checker 必须分别解析到冻结注册项，不能用论文名称代替实现版本 |
| 模型/权重/服务 | 合同本身无模型；所用检测器、感知模型或外部服务逐项登记，未知权重不得进入 Gate B |
| 硬件、成本、时延 | `pending-benchmark`；指标与人工复核分别计时，不用运行时延迟预算倒推离线阈值 |
| QA / fallback | 以 `dev/calibration` 校准并一次性验收独立 holdout；评审不一致按预注册仲裁，不挑最好一轮 |
| 证据与状态 | `C1=0`，`planned`；它不能为任意真实上传生成 runtime pass |

### `REG-LOCAL-QA-RUNTIME` — 线上任务 QA 合同族

| 字段 | 记录 |
| --- | --- |
| 来源 | [本项目](./README.md)、[证据与发布规范](./EVIDENCE_AND_RELEASE.md) 本地原创研究 |
| 固定研究边界 | `observed_at=2026-08-14`；`CapabilityContract family=planned`；首批 profile 为 `CC-CAP08-RUNTIME-SUBJECT-BG@planned`、`CC-CAP08-RUNTIME-NATURAL-ENHANCE@planned`、`CC-CAP08-RUNTIME-CREATIVE@planned` |
| 预期职责 | 在用户输入通常没有真值时运行任务专属检查、形成 `QAReport`，按冻结规则放行、人工复核或拒绝下载 |
| 输入 / 输出与变化边界 | 原图 / 中间产物 / 最终 `DeliveryArtifact` + effect contract → `QAReport`；只检查与决策，不修改结果来掩盖失败 |
| 运行位置 | 视觉 worker 执行 checker，服务端做最终门禁；浏览器只能展示状态和证据摘要 |
| 代码许可 | 本地原创；文件解析器、OpenCV 原语、检测器或人工审核组件分别锁版本与许可 |
| 模型/权重/服务 | 不假设存在 GT；模型 checker 若未完成独立 defect / holdout 校准，必须保持 `research-only` |
| 硬件、成本、时延 | `pending-benchmark`；记录每个 checker 与 bundle 的 p50/p95、人工转交率、误放行和误拒绝 |
| QA / fallback | subject/background 检查 Alpha、边缘多底预览、主体大块误删、纯色色值与最终文件重开；其他 profile 按 Planned 解析表冻结。无法判断时人工复核或拒绝，不用离线 IoU 冒充线上真值 |
| 证据与状态 | `C1=0`，`planned`；每个 profile 单独通过 defect 与独立 holdout 后才能冻结 |

### `REG-LOCAL-ORCHESTRATOR` — 显式规则编排器

| 字段 | 记录 |
| --- | --- |
| 来源 | [本项目](./README.md)、[能力地图](./CAPABILITY_MAP.md) 本地原创研究 |
| 固定研究边界 | `observed_at=2026-08-14`；`CC-CAP09-EXECUTE@planned` 与 `CC-CAP09-RECOMMEND@planned` 独立取证；`implementation_ref=pending-freeze`；两个 `ruleset_version` 均为 `pending-definition` |
| 预期职责 | `execute` 为用户已选 effect / scene 生成并执行确定性 `ExecutionPlan`，记录状态、fallback 与失效；`recommend` 才把 `SourceCard.v0` 转为硬资格、少量可解释排序与 `RecommendationSet` |
| 运行位置 | 服务端网关；研究首版使用冻结显式规则，不使用端到端不透明推荐模型 |
| 代码许可 | 本地原创；本项目尚未选择对外许可证，外部分发权不因本登记而授予 |
| 模型/权重/服务 | 首版本不使用模型或外部推荐服务；未来 Agent/学习排序器必须作为新的执行器注册并重新取证 |
| 硬件、成本、时延 | `pending-benchmark`；分别记录执行计划解析 / 状态恢复与推荐规则求值时延，不能把两份证据合并 |
| 当前 R0 边界 | 现有固定任务列表和状态机是工程线索，不是基于 `SourceCard` 的资格/推荐证据 |
| 证据与状态 | 两份合同均 `C1=0`、`planned`；`execute` 可先于效果 U1 / E1 验证，`recommend` 只在达标效果间验证；规则、依赖版本和解释输出冻结前不得称为 AI 推荐 |

## 确定性处理候选

### `REG-NORM-SHARP` — Sharp

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [lovell/sharp](https://github.com/lovell/sharp)、[官方文档](https://sharp.pixelplumbing.com/) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit=pending-resolution`；`npm_version=pending-selection` |
| 预期职责 | EXIF 自动旋转、尺寸归一、ICC/色彩处理、裁切、合成、PNG/JPEG/WebP 导出 |
| 运行位置 | Node/TypeScript 网关或独立确定性渲染 worker；不得放入浏览器作为正式处理证据 |
| 代码许可 | Apache-2.0；仍需保留许可与审查预编译包包含的 libvips/编解码依赖 |
| 模型/权重 | 不适用 |
| 硬件、成本、时延 | `pending-benchmark`；以 CPU 为首个评测 profile，记录 p50/p95、峰值 RAM 与每百万像素耗时 |
| 证据与状态 | `C1=0`，`research-only/pending-freeze`；先锁定精确 npm / libvips 版本，再验证方向、ICC→sRGB、Alpha 与编码确定性 |

### `REG-NORM-LIBVIPS` — libvips

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [libvips/libvips](https://github.com/libvips/libvips)、[官方站点](https://www.libvips.org/) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit/tag=pending-resolution` |
| 预期职责 | Sharp 的底层图像处理引擎；必要时作为 Python/CLI 的低内存确定性处理候选 |
| 运行位置 | 自托管 CPU worker |
| 代码许可 | LGPL-2.1-or-later；具体静态/动态链接、修改和再分发方式须在交付前复核 |
| 模型/权重 | 不适用 |
| 硬件、成本、时延 | `pending-benchmark`；构建时必须记录启用的格式库和各自许可证 |
| 证据与状态 | `C1=0`，`research-only/pending-freeze`；若只通过 Sharp 使用，也要先把实际捆绑版本写入运行 manifest |

### `REG-VISION-OPENCV` — OpenCV

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [opencv/opencv](https://github.com/opencv/opencv)、[官方许可页](https://opencv.org/license/) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit/tag=pending-resolution` |
| 预期职责 | 模糊/曝光/噪声候选指标、几何、颜色统计、形态学、蒙版与任务 QA 原语 |
| 运行位置 | 自托管 Python 视觉 worker，默认 CPU；特定模块是否启用按实验锁定 |
| 代码许可 | OpenCV 4.5.0 起主体为 Apache-2.0；数据文件、可选模块和第三方编解码/加速组件需单独审计 |
| 模型/权重 | 核心原语不需要权重；若使用 DNN 模型，必须另建注册项 |
| 硬件、成本、时延 | `pending-benchmark` |
| 证据与状态 | `C1=0`，`research-only/pending-freeze`；先锁定精确构建与模块，指标才能在与人工判断校准后进入 QA 门禁 |

## 检测、分割与 Matting 候选

### `REG-DETECT-GROUNDING-DINO` — Grounding DINO

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [IDEA-Research/GroundingDINO](https://github.com/IDEA-Research/GroundingDINO) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit=pending-resolution`；`checkpoint=pending-selection`；`sha256=pending-resolution` |
| 预期职责 | 用文本类别定位人物、商品、宠物或用户指定主体，为 `SourceCard` 和后续分割提供框 |
| 运行位置 | 自托管 Python 视觉 worker；CPU/GPU profile 均待实测 |
| 代码许可 | Apache-2.0（官方仓库） |
| 模型/权重 | 仓库提供预训练模型，但当前研究未确认选定 checkpoint 的独立许可声明、训练数据边界与传递依赖，不能以代码许可代替 |
| 硬件、成本、时延 | `pending-benchmark` |
| 证据与状态 | `C1=0`，`research-only`；许可和 artifact lock 完成前不得下载到产品环境 |

### `REG-SEG-SAM2` — SAM 2.1

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [facebookresearch/sam2](https://github.com/facebookresearch/sam2) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit=pending-resolution`；官方 SAM 2.1 checkpoint 家族已确认，具体型号与 `sha256=pending-selection` |
| 预期职责 | 点击/框提示分割、用户擦除/恢复修正；不单独承担发丝级 Alpha Matting |
| 运行位置 | 自托管 Python 视觉 worker；官方路径基于 PyTorch，GPU 优先，CPU 可行性待测 |
| 代码许可 | Apache-2.0；可选 `cc_torch` 组件为 BSD-3-Clause，demo 字体另有 SIL OFL-1.1 |
| 模型/权重 | 官方 README 明确 SAM 2 checkpoints、demo 与训练代码为 Apache-2.0；仍须锁定具体文件 URL 与 SHA-256 |
| 硬件、成本、时延 | `pending-benchmark`；分别评测 tiny/small/base-plus 的交互延迟、VRAM 和边界收益 |
| 证据与状态 | `C1=0`，`research-only/pending-freeze`；锁定 commit 与 checkpoint 后也只作为修正/区域能力候选，不可把二值 mask 宣称为透明抠图完成 |

### `REG-MATTE-BIREFNET` — BiRefNet

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit=pending-resolution`；`checkpoint=pending-selection`；`sha256=pending-resolution` |
| 预期职责 | 人物、商品、动物及复杂轮廓的高分辨率主体分割/Matting 候选 |
| 运行位置 | 自托管 Python 视觉 worker；GPU profile 优先，CPU/ONNX/TensorRT 仅作后续候选 |
| 代码许可 | MIT（官方仓库） |
| 模型/权重 | 官方仓库指向多组自有与第三方权重，但当前未找到能无歧义覆盖选定文件的许可与哈希，因此不得按 MIT 代码许可推定权重可用 |
| 已知禁止变体 | 官方 README 明示第三方 `briaai/RMBG-2.0` 权重仅非商业使用；本项目商业方向判为 `no-go`，不得替代基础 BiRefNet 权重 |
| 硬件、成本、时延 | `pending-benchmark`；上游数字只作容量规划线索，不写入本项目通过标准 |
| 证据与状态 | `C1=0`，基础 BiRefNet 为 `research-only`；先解析官方 release/Hugging Face 文件级许可 |

### `REG-MATTE-MODNET` — MODNet

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [ZHKKKe/MODNet](https://github.com/ZHKKKe/MODNet) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit=pending-resolution`；`checkpoint=pending-selection`；`sha256=pending-resolution` |
| 预期职责 | 单人摄影肖像的 trimap-free Matting 基线；不用于商品、动物或多人通用能力承诺 |
| 运行位置 | 自托管 Python 视觉 worker；CPU/GPU/ONNX profile 待测 |
| 代码许可 | Apache-2.0 |
| 模型/权重 | 官方 README 明确仓库中的代码、模型与 demo（`doc/gif` 除外）为 Apache-2.0；仍需固定实际 checkpoint 与哈希 |
| 硬件、成本、时延 | `pending-benchmark` |
| 证据与状态 | `C1=0`，`research-only/pending-freeze`；锁定 commit 与 checkpoint 后，必须与至少一个通用候选和简单基线在同一夹具盲测 |

### `REG-BASELINE-MATTE-SIMPLE` — 简单 Matting 基线占位

| 字段 | 记录 |
| --- | --- |
| 来源 | [本项目](./README.md) 的本地研究占位；具体算法尚未选择，不能从名称推断为 GrabCut、阈值法或其他实现 |
| 固定研究边界 | `observed_at=2026-08-14`；`CapabilityContract=CC-CAP04-MATTE-SIMPLE@planned`；`algorithm_version=pending-definition`；`implementation_ref=pending-freeze` |
| 预期职责 | 在同一输入、SubjectMap 和输出合同下提供低复杂度比较下限，用于判断学习型 Matting 的实际增益；不作为默认产品 fallback |
| 输入 / 输出与变化边界 | `NormalizedImage` + `SubjectMap` → `AlphaMatte`；主体保护、拒绝、参数和 Alpha 语义均待预注册 |
| 运行位置 | 计划为自托管 CPU 视觉 worker；具体语言与依赖待算法选择后冻结 |
| 代码许可 | 本地原创部分许可证未定；若选用 OpenCV 或其他库，必须锁定对应 Registry ID、版本和传递许可 |
| 模型/权重/训练数据 | 目标是不使用学习权重；当前因算法未定写 `pending-definition`，不得假称无依赖 |
| 硬件、成本、时延 | `pending-benchmark` |
| QA / fallback | 与正式候选共享离线指标和灾难性失败定义；失败只计入 baseline 结果，不自动触发它处理用户图片 |
| 证据与状态 | `C1=0`，`planned`；算法、合同和实现未冻结前不得进入 Gate B |

### `REG-LOCAL-EDGE-REFINE` — 边缘净化适配器

| 字段 | 记录 |
| --- | --- |
| 来源 | [本项目](./README.md) 本地原创研究；如使用 OpenCV 或其他原语，只通过冻结 Registry 版本调用 |
| 固定研究边界 | `observed_at=2026-08-14`；`CapabilityContract=CC-CAP04-EDGE-REFINE@planned`；`algorithm_version=pending-definition`；`implementation_ref=pending-freeze` |
| 预期职责 | 由原图和连续 Alpha 形成 `ForegroundLayer`，显式处理背景色污染、孔洞、软边、颜色空间及 straight / premultiplied Alpha 转换 |
| 输入 / 输出与变化边界 | `NormalizedImage` + `AlphaMatte` → `ForegroundLayer`；只能改变冻结边缘带内的前景颜色 / Alpha 表达，核心前景像素与几何必须保持 |
| 运行位置 | 计划为自托管 CPU 视觉 worker；实际原语、边缘带定义和像素精度待冻结 |
| 代码许可 | 本地原创适配层许可证未定；底层库按各 Registry 条目审计 |
| 模型/权重/训练数据 | 首版计划不使用学习权重；若引入学习型前景估计器，须新建注册项，不能沿用本条合同 |
| 硬件、成本、时延 | `pending-benchmark` |
| QA / fallback | 黑 / 白 / 至少一类高对比彩底检查，比较核心前景、边缘色偏、孔洞和 halo；无法改善时保留原始 matte 失败记录并拒绝或进入修正，不静默强蚀刻 |
| 证据与状态 | `C1=0`，`planned`；算法与多底 defect / holdout 尚未建立 |

### `REG-LOCAL-MATTE-CORRECTION` — 擦除 / 恢复修正工具

| 字段 | 记录 |
| --- | --- |
| 来源 | [本项目](./README.md) 本地原创研究；不复用 R0 页面作为能力证据 |
| 固定研究边界 | `observed_at=2026-08-14`；`CapabilityContract=CC-CAP04-CORRECT@planned`；`operation_schema=pending-definition`；`implementation_ref=pending-freeze` |
| 预期职责 | 把一次受限擦除 / 恢复操作保存为 `MatteRevision`，产生新的 Alpha / 前景层，并保留 first-pass 与父版本 |
| 输入 / 输出与变化边界 | `ForegroundLayer` + 版本化笔刷 / 点击操作 → `MatteRevision` + 新 `AlphaMatte` / `ForegroundLayer`；只允许显式操作覆盖区域变化 |
| 运行位置 | 计划为浏览器交互采集 + 服务端 / worker 权威重放；浏览器位图不能单独成为最终证据 |
| 代码许可 | 本地原创，许可证未定；若使用 SAM2 语义提示，另绑定 `REG-SEG-SAM2` 的冻结合同和许可 |
| 模型/权重/服务 | 纯笔刷路径无模型；语义提示路径是独立 variant，不能共享证据 |
| 硬件、成本、时延 | `pending-benchmark`；分别记录交互反馈、权威重放、修正次数 / 面积和 corrected-pass 总时延 |
| QA / fallback | 每次修正后完整重跑 subject/background runtime QA；超过冻结次数 / 面积或仍失败则拒绝。first-pass 与 corrected-pass 成功率分开报告 |
| 证据与状态 | `C1=0`，`planned`；具体操作 schema、预算、移动端可用性和重放一致性未冻结 |

## 质量修复与局部编辑候选

### `REG-LOCAL-NATURAL-ENHANCE` — 非生成自然增强适配器

| 字段 | 记录 |
| --- | --- |
| 来源 | [本项目](./README.md) 本地原创研究；底层像素原语只能从冻结的 Registry 候选解析 |
| 固定研究边界 | `observed_at=2026-08-14`；`CapabilityContract=CC-CAP06-NATURAL-ENHANCE@planned`；`algorithm_graph=pending-definition`；`implementation_ref=pending-freeze` |
| 预期职责 | 对有诊断支持的曝光、白平衡、对比、噪声与轻度清晰度问题做限幅、非生成处理；高质量或无可信改善的输入返回 no-op |
| 输入 / 输出与变化边界 | `NormalizedImage` + `SourceCard.v0` → 非生成 `CompositeImage` 或 no-op；几何、人物 / 物件、文字与来源事实必须保持，禁止生成伪细节 |
| 运行位置 | 计划为自托管 CPU worker；Sharp / OpenCV 是否使用、顺序和精确版本均待 Gate A/B 冻结 |
| 代码许可 | 本地原创适配层许可证未定；Sharp / OpenCV 等底层库按各自注册项审计，不因本条合并授权 |
| 模型/权重/训练数据 | 首版不使用学习模型或权重；若任何步骤引入学习型重建，必须新建独立合同和注册项，不能沿用本条 U1 |
| 硬件、成本、时延 | `pending-benchmark`；按像素级别记录 p50/p95、峰值 RAM、处理率与 no-op 比例 |
| QA / fallback | 依赖冻结的自然增强 runtime QA；无改善或副作用风险时返回原图 / 不建议处理，不转用 Real-ESRGAN、Restormer 或生成服务 |
| 证据与状态 | `C1=0`，`planned`；参数上限、顺序、no-op 与副作用门槛未冻结 |

### `REG-RESTORE-REAL-ESRGAN` — Real-ESRGAN

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit=pending-resolution`；`checkpoint=pending-selection`；`sha256=pending-resolution` |
| 预期职责 | 低分辨率图像放大与退化修复候选；不得与普通无损 resize 混称 |
| 运行位置 | 自托管 Python GPU worker；官方 NCNN 路径可作为独立后续候选，不能混用证据 |
| 代码许可 | BSD-3-Clause（官方仓库） |
| 模型/权重 | 官方 release 提供多个 `.pth`，但当前未确认 LICENSE 对各文件、BasicSR/GFPGAN/facexlib 与 NCNN 包的完整覆盖；逐件解析前不可商用集成 |
| 硬件、成本、时延 | `pending-benchmark` |
| 证据与状态 | `C1=0`，`research-only`；必须增加假纹理、脸部身份、文字破坏和 no-op 退化检查 |

### `REG-RESTORE-RESTORMER` — Restormer

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [swz30/Restormer](https://github.com/swz30/Restormer) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit=pending-resolution`；任务 checkpoint 与 `sha256=pending-selection` |
| 预期职责 | 去噪、运动/散焦去模糊与去雨研究；每项任务视为独立能力变体 |
| 运行位置 | 自托管 Python GPU worker；CPU 可行性待测 |
| 代码许可 | MIT（官方仓库） |
| 模型/权重 | 预训练模型由官方 README 通过 Google Drive 分任务提供；当前未确认下载物的文件级许可和哈希是否由 MIT 明确覆盖 |
| 硬件、成本、时延 | `pending-benchmark` |
| 证据与状态 | `C1=0`，`research-only`；不得用合成退化成绩替代真实手机图可用性 |

### `REG-INPAINT-LAMA` — LaMa

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [advimman/lama](https://github.com/advimman/lama) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit=pending-resolution`；`checkpoint=pending-selection`；`sha256=pending-resolution` |
| 预期职责 | 用户给定 mask 的对象消除与背景修补；不负责自动选择要删除的对象 |
| 运行位置 | 自托管 Python worker；CPU/GPU profile 待测 |
| 代码许可 | Apache-2.0（官方仓库 LICENSE） |
| 模型/权重 | README 的旧官方分发链接与当前 Google Drive/Hugging Face 镜像并存；镜像同名不证明同一 artifact，也未完成文件级许可核对 |
| 硬件、成本、时延 | `pending-benchmark` |
| 证据与状态 | `C1=0`，`research-only`；需先锁定官方 artifact，再建立结构重复、人物残留和文字破坏缺陷集 |

## 生成执行器候选

### `REG-GEN-DIFFUSERS` — Hugging Face Diffusers

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [huggingface/diffusers](https://github.com/huggingface/diffusers)、[官方文档](https://huggingface.co/docs/diffusers/) |
| 固定研究边界 | `observed_at=2026-08-14`；`git_commit/package_version=pending-selection` |
| 预期职责 | 作为本地/自托管生成模型的统一实验适配框架，而不是一个具体图片能力 |
| 运行位置 | 自托管 Python GPU worker；具体硬件由后续模型注册项决定 |
| 代码许可 | Apache-2.0（框架） |
| 模型/权重 | 不包含通用的“Diffusers 权重许可”；每个 `from_pretrained(...)` 模型、VAE、ControlNet、LoRA、文本编码器和安全组件都必须独立登记 |
| 硬件、成本、时延 | `pending-benchmark`，无法在未选具体模型时估算 |
| 证据与状态 | 框架 `C1=0`、`research-only/pending-freeze`；锁定框架版本后，每个模型仍需独立登记；“任意 Hub 模型直接加载”路径为 `no-go` |

### `REG-CLOUD-OPENAI-IMAGE` — OpenAI GPT Image 2 API

| 字段 | 记录 |
| --- | --- |
| 官方来源 | [GPT Image 2 模型页](https://developers.openai.com/api/docs/models/gpt-image-2)、[图片生成指南](https://developers.openai.com/api/docs/guides/image-generation)、[价格](https://openai.com/api/pricing/) |
| 固定研究边界 | `observed_at=2026-08-14`；官方不可变模型快照 `gpt-image-2-2026-04-21` 是后续实验目标 |
| Gate 状态 | 来源 / snapshot / 服务条款入口足以保持来源层面 `candidate`；正式 Gate B 仍被 adapter 合同、数据发送边界、fixture 预注册与 cost guardrail 阻塞 |
| 当前 R0 差异 | `server/server.mjs` 仍发送浮动别名 `gpt-image-2`；本轮按要求不改运行时代码，因此当前探针运行不能称为已固定模型版本，也不能复用为正式 E1、R1-pipeline 或 R1-product 证据 |
| 预期职责 | CR1/CR2 等云端创意生成/编辑候选；不承担像素级抠图、Alpha Matting、身份保证或官方证件合规 |
| 运行位置 | OpenAI 托管服务；只能由服务端 adapter 调用，密钥不得进入浏览器 |
| 代码许可 | 不适用；这是外部 API，不是开源代码依赖 |
| 服务/输出/训练数据边界 | 受核对当日的 Services Agreement、Service Terms、Usage Policies 与图片政策约束；客户输出权属不能补足第三方输入、肖像、商标或作品权利。训练数据细节不是本项目可审计 artifact，记录为 `service-provider boundary / not locally disclosed`，不得猜测 |
| 接口边界 | 官方模型页确认支持 image generation 与 image edit；官方指南确认当前不支持透明背景，mask 也不构成 mask 外像素锁定证据 |
| 远程运行语义 | `adapter_version=pending-definition`；`idempotency_scope=unknown`；状态查询、取消确认、迟到结果、超时、有限重试与 `UNKNOWN` reconciliation 均为 `pending-definition`。这些字段冻结并以第一方 adapter smoke test 证明前不得进入 Gate B |
| 请求与地域映射 | 每次调用必须保存受限的 `provider_call_id ↔ provider_request_id` 映射；`endpoint`、实际 processing / storage region、跨区外发和供应商保留边界均为 `pending-resolution`，未知时不得处理真实用户图 |
| 成本归因 | 必须按 provider call、pipeline attempt、user execution 与 QA 通过的可用结果记录 `estimated / provider-reported / billed / unknown`；取消、超时和未知状态保留 `possible_charge`。价格记录版本、币种、计量单位与单次 / 会话 guardrail 均为 `pending-definition` |
| 日志 / Trace / Runbook | 只允许登记脱敏字段、canonical error 与本地 ID；供应商响应正文、图片、Prompt、密钥不得进入普通日志。关键 span、支持码、`RB-01` / `RB-02` / `RB-05` 映射尚未实现，当前均为 0 |
| 硬件、成本、时延 | 本地硬件不适用；价格会变化，不在注册表写死。实验记录实际请求尺寸、质量、输入/输出 token、账单成本、p50/p95、429/5xx/审核失败率 |
| 证据与状态 | `C1=0`，`candidate`；取得 `E1/O1/G1` 前只允许受控实验，失败结果不得解锁下载 |

## 下一次登记动作

1. 先按 Gate A 锁定来源与许可，再把本表 `@planned` 合同补成不可变版本；不得直接从仓库名跳到 effect DAG。
2. 为三个首轮对测方向分别预注册候选：归一化 / 导出（Sharp/libvips）、主体与背景（至少 MODNet + 一个许可完成且与正式分母匹配的通用 Matting 候选 + 已定义简单基线）、自然增强（本地非生成适配器）、创意（固定 OpenAI snapshot）。
3. 通过官方 release/tag/API 获取不可变源版本，下载前记录许可文件；下载后立即计算 SHA-256。托管服务改记录 snapshot、endpoint 与条款核对日期，不虚构文件 hash。
4. 在 Gate B 冻结 adapter、命名硬件、fixture、预注册与成本上限；只在此后运行 calibration，并把实测成本 / 时延和结果写入 `EvidenceManifest`。
5. 将 checkpoint、依赖和训练数据结论逐项写回本表；无法消除的商用限制转为 `no-go`。在独立 holdout、defect 与重复性证据齐全后才评审 C1。
