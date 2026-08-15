# 证据与发布门槛

> 本文件是 Single Image Studio 的证据等级、实验隔离与发布判定规范。它不记录候选模型的宣传能力，只规定项目能够声称什么以及需要什么证据。当前等级快照见 [STATUS.md](STATUS.md)。

## 1. 基本原则

- 工程可运行、原子能力有效、效果质量、产品闭环、运维可靠、治理合规、用户价值和资产可发布是相互独立的结论。
- 单次成功、挑选出的好图、页面截图、仓库 README、自动测试通过或内部主观喜欢都不能单独升级证据。
- 每个结论绑定不可变 `EvidenceManifest`；合同、夹具、引擎、checkpoint、配方、关键参数、QA profile 或适用分母改变时，必须创建新版本并重新取证。
- 对项目自有或明确授权的研究夹具，所有原始成功、拒绝、失败、超时与诊断重试都按研究 manifest 保留；不得只展示成功样例或用重试覆盖初次失败。真实用户运行只保留冻结 `DataPolicy` 允许的最小记录，原图与结果按期限删除。
- 数值指标用于解释特定缺陷，不替代独立视觉复核、灾难性失败门禁和真实任务结果。

## 2. 证据轴

| 轴 | 等级 | 达标含义 | 明确不能推出 |
| --- | --- | --- | --- |
| 原子能力 | `C1` | 一个版本化 `CapabilityContract` 在预声明分母和独立 holdout 上达到冻结质量、拒绝、重复性与失败上限；输入输出和 fallback 可复现 | 不自动证明某个用户效果好用、可上线或可商用 |
| 实用效果 | `U1` | 冻结 `EffectDefinition` 在适用分母上通过客观指标、困难类别、任务视觉检查、灾难失败上限和重复性复验 | 不证明创意价值、正式机构受理、运行闭环或用户价值 |
| 创意效果 | `E1` | 冻结生产输入合同和配方跨至少三类适用图片稳定成立，通过可辨认性、变化幅度、审美完整性、重复性、must-keep 与参考泄漏检查 | 不授予公开展示权，也不证明实用像素准确度 |
| 研究管线 | `R1-pipeline` | 从规范输入到真实执行器、任务 QA、产物与 manifest 的非模拟链可重复运行；成功、拒绝、失败、超时、取消和重试均留证 | 不证明用户界面完成或用户能独立完成任务 |
| 验证界面闭环 | `R1-product-validation` | 冻结研究界面使用真实能力完成“上传 → 资格 / 推荐 → 设置 → 处理 / 生成 → QA → 对比 → 下载”，并按版本化 acceptance matrix 验收换图、换任务、旧响应和失败恢复 | 只证明该研究界面 build 可用于受控验证，不证明后来重做的正式页面可发布 |
| 发布界面闭环 | `R1-product-release` | 最终用户可见界面的精确 build 在冻结 `CompatibilityProfile` 范围运行真实能力，并通过该 build 的完整 acceptance matrix 与 `TestEvidenceManifest` | 不证明规模运维、治理或用户价值；且必须先取得相应 R1-pipeline |
| 运维 | `O1` | 冻结的 p50/p95 时延、成本、内存 / 显存、并发、冷启动、限流与故障恢复目标在目标环境达标 | 不证明图片质量或商业需求 |
| 治理 | `G1` | 代码、精确权重、训练 / 测试数据和供应商条款已审计；数据发送、告知同意、保留删除、日志脱敏和安全边界可验证 | 不等于某张来源 / 结果资产可公开展示 |
| 用户价值 | `V1` | 真实目标用户在冻结任务中理解推荐与变化边界，在最多两次执行、三分钟内取得可用结果，并主动保留 / 下载或完成预期用途 | 不替代质量、运行、治理或资产权利证据 |
| 资产发布 | `Release Gate` | 每一张来源、参考、结果、失败示例及其组合逐项通过权利、来源、生成记录、质量和声明审查 | 不自动允许引用同项目中的其他资产，也不升级能力等级 |

G1 的数据流、安全与远程服务细则见 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md)；V1 的招募、分母、尝试和数据协议见 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md)；浏览器、格式、色彩、视觉回归与无障碍证据见 [QUALITY_AND_COMPATIBILITY.md](QUALITY_AND_COMPATIBILITY.md)；部署、schema、灰度、回滚和恢复见 [DEPLOYMENT_RELEASE_AND_RECOVERY.md](DEPLOYMENT_RELEASE_AND_RECOVERY.md)。这些从属合同不得自行修改本表的证据含义或发布公式。

首轮 R1-product-validation、R1-product-release 与邀请 beta 仅以 Windows 桌面浏览器为候选范围：冻结日 Chrome stable 和 Edge stable 的精确版本，最低 `1280 × 720` CSS viewport，并以 `1440 × 900` 完成主要视觉审查。手机、平板、iPhone、Safari、Firefox、HEIC/HEIF 和完整响应式范围后置；偶然可用不产生支持证据。精确系统、浏览器、viewport、DPR、缩放、格式和色彩范围必须写入版本化 `CompatibilityProfile`，不能只写“最新版”或“桌面端”。

未达到上述一级证据时统一记为 0（研究材料可分别称 C0、U0、E0 等，但不得暗示接近发布）。旧文档中的单一 `R1` 自本轮起拆为 `R1-pipeline` 和 `R1-product`；后者必须进一步写明 `validation` 或 `release` 范围。未经范围与 build 限定的 `R1-product` 只表示证据轴，不构成发布证据。

## 3. 状态记录单位

本文件不复制当前等级数值；唯一实时快照始终写在 [STATUS.md](STATUS.md)。状态只能按通过的**版本化证据目标**统计：

| 证据 | 计数单位 | 状态必须引用 |
| --- | --- | --- |
| C1 | 通过的 CapabilityContract 版本数；另报 CAP-01～CAP-09 覆盖域数 | EvidenceManifest、合同版本、CAP 域 |
| U1 / E1 | 通过的 EffectDefinition 版本数 | EvidenceManifest、效果与 variant 版本 |
| R1-pipeline | 通过的管线目标版本数 | EvidenceManifest、R1AcceptanceMatrix、管线版本 |
| R1-product-validation / release | 通过的界面 build 数，两个范围分别统计 | EvidenceManifest、R1AcceptanceMatrix、CompatibilityProfile、TestEvidenceManifest、精确 build 与 viewport；release 另需 ReleaseManifest |
| O1 | 通过的 O1Profile 数 | EvidenceManifest、profile 与目标环境 |
| G1 | 通过的治理范围数 | EvidenceManifest、治理范围与复查期限 |
| V1 | 通过的 V1Scope 数 | EvidenceManifest、效果 / variant、目标人群与界面 build |
| Release Gate | 冻结 allowlist 中登记、批准、撤销 / 到期的资产和组合数 | allowlist 版本、资产 / 组合 ID 与逐项决定 |

现有网页为 R0 工程探针。它的状态机、接口与自动检查可以成为未来 R1-pipeline / R1-product-validation / R1-product-release 的工程输入，但不能计入能力、效果、视觉 QA、运行、价值或发布证据。C1 合同数与 CAP 域覆盖率不得混写；Release Gate allowlist 未冻结时也不得用具有“全部通过”含义的 `0 / 0`。

## 4. 四套互斥夹具

| 集合 | 用途 | 可以做什么 | 禁止做什么 |
| --- | --- | --- | --- |
| `dev/calibration` | 候选筛选、指标校准、阈值和失败分类设计 | 查看全部结果；调整算法、配方、QA 和候选阈值 | 把调参后的成绩冒充独立验收；与 holdout 共享同源内容 |
| `holdout` | 冻结版本的正式能力 / 效果验收 | 在合同、版本、分母、阈值和停止规则冻结后运行；按预注册规则判定 | 看结果后调参并继续沿用同一证据；选择性删图；将衍生裁切或近重复图放入 dev |
| `defect` | 验证 QA 是否能发现已知灾难缺陷 | 以独立来源人工注入毛边、色边、孔洞、主体误删、脸部漂移、人物数量错误、假文字、水印和参考泄漏等可定位缺陷；内部再分 calibration 与 sealed holdout | 用它替代自然输入质量评测；只测“好结果通过”而不测“坏结果被拦截”；在冻结前查看 sealed defect-holdout |
| `escape` | 保存真实运行中被现有 QA 漏过的问题并持续回归 | 经权利 / 隐私处理后记录最小复现、根因、修复版本并加入下一版回归 | 把生产用户图默认纳入研究或公共样例；回写、修改已经冻结的历史 holdout 结论 |

### 隔离规则

- 以内容来源族而非文件名划分集合；同一照片的裁切、压缩、换色、连拍、同一捕获会话或其他派生版本属于同源，不得跨集合。
- 夹具 manifest 必须包含资产 hash、感知去重结果、`source_family_id`、`capture_session_id`、派生链、来源、权利、题材 / 困难类别、预期适用或拒绝、集合和版本。公开数据还需声明候选模型可能的训练污染风险；未知时写 `unknown`，不能假定独立。
- `holdout` 在预注册冻结前不得用于演示、提示词编写、阈值选择或人工挑选。
- 发现数据污染时，该 EvidenceManifest 作废；移除污染源、发布新夹具版本并完整重跑。
- `escape` 只影响后续版本；不能用修复后的结果重写此前失败率或删除历史失败。
- `defect/calibration` 只能使用专属校准来源族调整 QA；`defect/holdout` 使用另一个来源族与密封标注，冻结前不得被候选 QA、提示词作者或阈值制定者看到。QA profile、缺陷生成方法或判定阈值改变后，旧 sealed defect-holdout 不得再次充当独立证据，必须发布新版本。
- 四套夹具是项目控制的研究资产，不是用户上传的保留目录。真实用户图片按 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) 和 G1 的告知、用途与删除期限处理，默认不永久进入 `dev/calibration`、`holdout`、`defect` 或 `escape`。真实漏检优先保存去标识元数据和人工重建的最小复现；只有另行取得明确、可撤回的研究保留授权并冻结期限时，原图才可进入受限 escape 资产库，且仍不得自动公开。

Slice 03 只把未来密封运行的角色独立、冻结 hash 链、一次性请求、无效重跑、逐 attempt append-only custody、外部 trusted pins、实际文件 hash 与 resolved-realpath 边界做成 schema 和 mock rehearsal。mock 只在系统临时目录运行并被正式 validator 拒绝；正式运行还必须拒绝整个 Git 仓库与系统临时目录，且仓库外路径本身也不是密封证明。当前正式 holdout 明确为 `not-created`，因此这些设施不构成 C1 或任何独立验收证据；详见 [Slice 03 证据记录](research/SLICE_03_EVIDENCE.md)。

Slice 04 只冻结 `REG-NORM-SHARP` 的 source-resolved 复合候选 metadata，以及 `NORMALIZE-DELIVER` 的两份合同、QA、normalize / export 两份 operation-specific 五 partition plan、两份预注册与 seal intent；没有安装或执行 codec，没有 adapter、named hardware、smoke、calibration、正式像素或 EvidenceManifest 结果。每项 lifecycle 为 30 / 30 / 18 / 18 / event-driven-0，初始 C1 只计 sealed holdout 30 + sealed defect-holdout 18 = 48；open calibration 与 append-only escape 排除。Slice 03 observer / seal 只作不兼容 design lineage / execution-envelope reference，正式 artifact schema / oracle、runner、durable ledger、trust、角色 assignment / approval 均未建。全部格式继续 `productSupport=false`，因此 validator 通过仍不构成 Gate B 或 C1；详见 [Slice 04 范围合同](research/SLICE_04_CONTRACT.md) 与 [证据记录](research/SLICE_04_EVIDENCE.md)。

密封 request 的冻结必须区分 policy/template 与具体实例。候选、合同、QA、分母和停止规则可以在 bundle 创建前冻结，但包含 `bundleId` / `bundleSha256` 的具体一次性 request 只能按 `preregistration frozen → independent custodian bundle → external pins / isolation audit → issue request → run` 的顺序签发。Slice 04 request 状态为 `not-issued-awaiting-custodian-bundle`，不得用伪造 bundle ID 提前满足冻结链。

## 5. 统一研究流程

1. **登记合同**：在 [CAPABILITY_REGISTRY.md](CAPABILITY_REGISTRY.md) 登记能力、执行器、精确版本 / checkpoint、输入输出、许可和已知限制。
2. **预注册**：冻结问题、适用与拒绝分母、夹具版本、候选、停止规则、指标、视觉锚点、灾难失败和通过门槛。
3. **校准对测**：对 CAP-03 / CAP-04 / CAP-06 / CAP-07 等经验型视觉能力，在同一适用分母上尽量比较至少两个可研究候选、一个简单基线和一个可用市场基准；确定性、治理或控制合同改用 golden、性质测试、替代实现与故障注入。无法取得比较臂时必须在预注册前固定原因与替代方案，不得看结果后取消，也不得以宣传截图代替。
4. **冻结版本**：选择候选与参数，冻结 `CapabilityContract` / `EffectDefinition`、QA profile 和 `EvidenceManifest` 草案。
5. **独立验收**：一次性运行 `holdout`；研究夹具按授权保存全部输入、输出、失败、时延、成本、hash 和环境，用户数据则遵守其 DataPolicy。不得看结果后继续调参并沿用版本。
6. **QA 反证**：在 `defect` 上确认已知坏结果会被拒绝，同时量化正常结果误拒绝率。
7. **人工复核**：至少两名首评按冻结锚点独立检查；分歧触发预注册第三评审或保守规则，无法裁决时不得事后删出分母。原始判断、盲评顺序、一致性和最终裁决均留档。
8. **等级判定**：只有所有硬门槛同时满足才升级；平均分不能掩盖人物误删、面部形变、错误结果关联等灾难失败。
9. **运行、运维与治理**：分别验证 R1-pipeline、目标范围的 R1-product-validation / release、O1 和 G1，不能由 C1 / U1 / E1 推断。
10. **用户与发布**：完成 V1，并对每个用户可见来源 / 结果对执行逐资产 Release Gate。

现有 IoU、Alpha MAE、边界 F1、2px 边界、ΔE00 等数值全部视为**候选阈值**。它们必须先和人眼可用性、不同分辨率 / 主体类别及市场基准校准，再冻结到具体任务版本；不得把研究计划中的示例数字直接当成通用发布标准。

### 5.1 suite × partition 预注册是入场条件

任何 C1、U1 或 E1 正式运行前，必须对每个 `fixture_suite × partition` 填完并冻结以下字段。缺少任一字段时，运行只能记为探索，不得事后补写后升级：

```text
suite_id + suite_version
partition = dev/calibration | holdout | defect/calibration | defect/holdout | escape
source_population + source_family_rule + capture_session_rule
applicable_categories + rejection_categories + difficult_categories
minimum_independent_sources_total
minimum_independent_sources_per_category
minimum_applicable_sources + minimum_rejection_sources
run_repetitions_per_source + deterministic_or_stochastic
unit_of_analysis + source_level_aggregation
primary_estimand + secondary_estimands
eligibility_rule + exclusion_rule + invalid_run_rule
failure_timeout_cancel_treatment + missing_result_treatment
user_execution_rule + internal_retry_rule + diagnostic_retry_rule
catastrophic_failure_definition + category_floor + overall_threshold
confidence_method + stopping_rule + maximum_collection_window
fixture_manifest_version + preregistration_hash + frozen_at + approvers
```

- 各数量和阈值由校准结果与风险等级决定，本规范不预填通用数字；未填不等于零容忍或无限容忍，而是**不可判定**。
- `source`、`run`、`candidate` 和 `reviewer rating` 不得混为同一分母。主结论默认以预注册的独立来源为统计单位，除非合同明确给出其他单位和理由。
- 多次运行必须预先规定来源级如何聚合，以及 first-pass 与 within-retry 哪一个是主估计量；不得看到结果后选择较好口径。
- 正确拒绝、错误拒绝、错误放行、执行失败、超时、取消、缺失结果和人工排除分别进入预声明分母，不能从成功率中静默删除。
- `holdout` 只按冻结停止规则运行一次。若样本不足、夹具污染或执行中断需要补充来源，原 manifest 关闭为未决或失败，并以新版本重新预注册；不得只补到刚好过线。

## 6. 各方向的最小证据要求

### 主体与背景

- `dev/calibration` 与独立 `holdout` 都要覆盖人物、普通物体及发丝、毛发、孔洞、低对比、反光 / 透明、细杆、阴影和复杂背景。
- 正式 Matting 比较臂必须在同一声明分母上至少包含两个许可允许当前研究、已锁版本并真正输出连续 Alpha 的候选，以及一个登记基线；粗分割不能冒充 Matting。市场基准可取得时使用同一规范输入与导出条件，不可取得时按预注册缺席。若共同支持范围只有人像，首次 C1 必须缩窄为人像并对其他输入拒绝。
- 透明与纯色 variant 共用经验证的 Alpha，但分别检查 RGBA、背景色、边缘污染、前景像素锁定和下载格式。
- 人脸 / 主体系统性误删、明显孔洞、错误主体或内部像素被生成重画属于灾难失败，不能被平均指标抵消。

### 自然增强

- 夹具同时包含曝光、白平衡、噪声、模糊、压缩、低分辨率和“已经足够好、不应明显改变”的 no-op 图。
- 预注册过锐、偏色、假纹理、塑料脸、文字破坏和局部光晕等副作用。
- 保真版本不得生成不存在的细节；使用生成式恢复时必须作为独立效果和变化合同重新取证。

### 创意效果

- CR1 / CR2 先在 6 张跨题材来源上低成本筛选，不以诊断重试计入正式通过。
- 入围版本冻结后，使用全新的 6 类 × 3 张来源完成独立复验，每张至少独立运行两次。
- 18 个来源只构成首轮受控 E1 证据，不证明任意题材或真实用户分布上的普遍稳定；必须报告原始分母、类别结果和置信区间，并把支持范围限制在预注册适用类别。
- 评审来源可辨认、变化幅度、审美完整性、效果身份重复性、must-keep、主体 / 人物数量、假文字 / 水印与参考内容泄漏。
- 达到 E1 的效果也只能进入受控候选目录；公开参考对仍逐图经过 Release Gate。

### CAP-08 QA 与证据独立性

- 候选 QA 不能成为授予自身 C1 的唯一裁判。CAP-08 的 ground truth、严重度和最终 pass / fail 由不参与该 QA profile 调参的独立标注者或冻结参考程序产生，并由指定证据责任人签署。
- `defect/calibration` 用于设计检测与阈值；密封的 `defect/holdout` 才能验证坏结果被拦截。自然 `holdout` 中已确认的好结果用于验证 false reject；两者共同形成按缺陷严重度、类别和来源族分层的 QA confusion matrix。
- 预注册必须分别给出 false allow、false reject、无法判定与执行错误的样本数、分母、置信方法和门槛。灾难级缺陷不得被普通缺陷的平均分掩盖，但具体容忍值必须在运行前冻结，不能在本文件中凭空假定。
- 标注者分歧需由预注册的第三方裁决或保守规则处理，并报告一致性指标；候选 QA 的输出不得覆盖原始金标、评审记录或不一致样本。
- QA profile、判定阈值、缺陷生成方法、gold label 或严重度定义改变，都会使 CAP-08 及依赖它的 U1 / E1 / R1 证据失效。新的 escape 暴露漏检后，修复版必须使用新的 sealed defect-holdout 与相应自然 holdout 重新取证。

### 用户价值

- 先以 6–8 名目标用户做形成性测试，只用于发现理解、流程和结果预期问题，不据此声称 V1。
- 修正问题并冻结任务、效果版本、界面 build、样例和判定标准后，至少使用 18 名新的目标用户完成正式任务验证；形成性参与者不计入冻结验证分母。总人数不能替代每个待声明效果 / variant 的预注册最小有效样本。
- 每项 V1 结论必须绑定一个 `V1Scope`，分别冻结招募人群、效果 / variant、界面 build、分配方式、每效果有效样本、ITT / eligible / rejected / invalid 分母、停止规则、成功阈值和置信方法。
- 记录用户是否正确理解推荐理由、允许 / 禁止变化、参考与真实结果的区别，以及是否在最多两次**用户执行**、三分钟内取得可用结果。用户执行、管线 attempt、自动 retry 和计费模型调用必须分别记录。
- 实用效果还需验证用户能完成预期用途；创意效果还需验证用户能由参考对合理预期变化。内部评审、点击或停留时长不能单独替代这些结论。
- V1 只对其冻结界面 build 成立。研究界面上的 V1 不自动满足正式发布界面的 V1；发布判定要求 `V1Scope.interface_build` 与 R1-product-release 的 build 一致，或引用在正式页面实现前预注册、完成桥接测试并获批准的 `V1MigrationManifest`。完整协议见 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md)。

## 7. R1 与 O1 可执行契约

### 7.1 `R1AcceptanceMatrix`

每个 R1 结论必须绑定一份版本化验收矩阵，而不是只列“测过成功和失败”。每一行至少包含：

```text
matrix_id + matrix_version + target_id + target_version
scope = pipeline | product-validation | product-release
effect_version + capability_contract_versions + qa_profile_version
pipeline_version + api_schema_version + interface_build + target_viewports
compatibility_profile_id + test_evidence_manifest_id + release_manifest_id
scenario_id + scenario_class + initial_state + fixture_id
fault_injection + user_action_sequence + expected_job_state_sequence
expected_user_visible_state + expected_artifacts + forbidden_artifacts
download_and_binding_invariants + timeout_or_recovery_expectation
user_execution_limit + internal_retry_limit + repetitions
pass_rule + zero_tolerance_invariants + observed_run_ids + decision
```

矩阵必须覆盖适用于目标的正常成功、正确资格拒绝、任务 QA 拒绝、输入错误、用户取消、限流、可恢复 / 不可恢复错误、超时或未知终态、换图、换任务、换参数、迟到响应、刷新 / 重启和下载绑定。某场景不适用时要给出理由，不能直接漏列。

- R1-pipeline 的矩阵验证真实执行器、状态、产物、QA、manifest 和清理行为；R0 模拟或固定样例不计入。
- R1-product-validation 绑定冻结研究界面 build，可用于受控用户验证和决定是否进入正式页面设计；它必须在声明的 CompatibilityProfile 上具有 `pass` 的 TestEvidenceManifest，不能用单个开发浏览器截图代替。
- R1-product-release 绑定最终用户可见 build 与冻结 CompatibilityProfile。即使交互合同不变，也必须在最终 build 上执行预注册矩阵；若想复用部分 validation 证据，必须事前定义等价条件、不可复用场景和最小重测集，并在新 EvidenceManifest 中批准，不能默认继承。
- 首轮 product 范围要求同一冻结 profile 中的 Windows Chrome 和 Edge 都通过最低 `1280 × 720` 功能矩阵，并在 `1440 × 900` 完成主要视觉回归与人工审查。范围外浏览器、移动端或格式不纳入分母，也不得由 Chromium 同源或偶然成功推断支持。
- R1-product-release 还必须引用精确部署快照的已批准 ReleaseManifest，并通过 N/N-1、灰度停止、kill switch、回滚、备份恢复与 tombstone 演练；这些字段为 `pending` 时只能保持 R1-product-release=0。
- 每个场景的重复次数、通过比例、恢复时限与不可容忍不变量须在运行前冻结。未填写的矩阵不能判定 R1；平均通过率不能掩盖错误结果绑定、隐私泄露、错误下载或旧响应覆盖新任务。

### 7.2 `O1Profile`

O1 只对一个冻结的能力 / 效果管线、执行环境和负载范围成立。每份 profile 至少包含：

```text
o1_profile_id + version + target_id + target_version
executor_and_pipeline_versions + provider + region
hardware + software_environment + deployment_topology
workload_population + image_size_and_format_strata
cold_or_warm_state + concurrency_matrix + queue_policy
minimum_runs_per_stratum + measurement_window + stopping_rule
end_to_end_latency_metric + executor_latency_metric
cost_per_attempt + cost_per_usable_result + retry_cost
memory_vram_disk_network_metrics + capacity_limit
rate_limit_behavior + timeout_behavior + cancel_cleanup
fault_injection_cases + recovery_time + data_integrity_checks
targets + error_budget + censored_or_missing_run_rule
raw_run_ids + result_by_stratum + decision + approved_at
```

- p50 / p95、成本、资源、并发、冷启动、限流和故障恢复必须在相同版本、相同负载口径下报告；不能用平均值替代困难分层或把失败运行从时延 / 成本分母删除。
- profile 中的具体目标、样本量和错误预算必须在负载测试前冻结。本文件不提供通用数值；字段为空或环境不匹配时，O1 维持 0。
- 供应商、区域、硬件、队列、缓存、关键重试策略、输入分布或并发声明发生实质变化时，原 O1 不能自动迁移。
- O1 验证运行可靠性与资源边界；数据是否被允许处理、保存和删除由 G1 决定，二者不能互相替代。
- 只要浏览器承担 hash、解码、preview、比较或导出，O1Profile 就必须按目标 CompatibilityProfile 记录浏览器阶段时延、峰值内存和失败；服务端快速不能抵消目标桌面浏览器卡死或内存越界。

## 8. `EvidenceManifest` 最小字段

```text
evidence_id + evidence_version + created_at
claim_type + scope_id + target_id + target_version + supersedes
contract_hash + interface_build + pipeline_version + qa_profile_version
compatibility_profile_id + test_evidence_manifest_id + release_manifest_id
fixture_manifest_version + suite_partition_plan + preregistration_hash
dev_set + holdout_set + defect_calibration_set + sealed_defect_holdout_set + escape_set
source_family_ids + capture_session_ids + derivation_lineage + perceptual_dedup_report
candidate_executors + baseline + market_benchmark
preregistered_population + eligibility + rejection_population + category_quotas
unit_of_analysis + primary_estimand + source_level_aggregation
sample_size_plan + confidence_method + stopping_rule + invalid_and_missing_rule
metrics + visual_anchors + catastrophic_failures + thresholds + category_floors
raw_run_ids + user_executions + pipeline_attempts + internal_retries + diagnostic_retries
successes + correct_rejections + false_rejections + false_allows + failures + timeouts + cancels
qa_confusion_matrix + reviewer_records + adjudication_rule + agreement_result
latency + cost + hardware + environment
source_rights + code_license + weight_license + data_terms
r1_acceptance_matrix_id + o1_profile_id + v1_scope_id + v1_migration_manifest_id
result_by_partition + result_by_category + result_summary
evidence_level + decision + known_limits + invalidation_triggers
reviewers + evidence_owner + approved_at
```

Manifest 只引用不可变运行与资产 hash。若某字段尚未知，必须显式写 `unknown` 并维持未达标；对该 claim 确实不适用的字段写 `not_applicable` 并给出理由。不得留空后仍升级等级，也不得用另一个证据轴的结论补齐本轴字段。

## 9. Release Gate

Release Gate 按资产及公开组合逐项授予，而不是按项目一次性授予。公开清单必须有不可变 `allowlist_version`；每一张来源图、参考图、结果图、公开失败示例，以及它们组成的来源 / 参考 / 结果对，都必须记录：

- `asset_id`、`asset_version`、`asset_role`、`asset_bundle_id`、内容 hash、感知 hash、来源族和派生链；
- 来源 URI / 本地来源、取得日期、作者 / 权利人、原始许可文本或凭证 hash；
- `processing_allowed`、`public_display_allowed`、`commercial_marketing_allowed`，以及各自的用途、surface、地域、期限和撤回条件；
- 人物肖像 / 隐私同意、未成年人、商标、艺术品、地点、敏感信息和必要署名审查；
- 实际执行 surface、模型 / checkpoint、配方、请求、参考输入、全部候选、选择过程和输出 hash；
- 对应 EffectDefinition / CapabilityContract / QAReport 版本、资产级明显缺陷复核、已知限制和用户可见变化 / AI 编辑声明；
- 供应商条款版本、审核人、批准人、批准日期、到期 / 复查日期、撤销原因和下架定位信息。

Release Gate 的质量项只确认该资产与已取得的效果 / QA 证据相符并排除资产级明显问题，不重新授予 C1、U1 或 E1。`asset_bundle_id` 的组合必须单独审查误导性配对、来源 / 参考 / 结果标注和声明；单图通过不能自动推出组合通过。

G1 与 Release Gate 互不替代：G1 证明授权、数据流、删除、日志与资产盘点机制在一个治理范围内有效；Release Gate 才决定某个具体资产或组合能否在某个 surface 展示。G1 不必等待所有未来资产批准，Release Gate 也不能弥补治理机制缺失。

真实用户图默认只允许该次处理，并按冻结保留期限删除，不进入公共参考目录或永久研究夹具。处理授权不等于研究留存、公开展示或商业宣传授权；如需保留或展示，必须分别取得明确、可撤回的用途授权，并记录期限。代码许可证不自动覆盖模型权重、训练数据、字体、样图或模型输出。

## 10. 发布公式与失效规则

一个用户效果可发布的统一公式是：

```text
全部依赖能力 C1
+ 对应效果 U1（实用）或 E1（创意）
+ R1-product-release（精确界面 build；且其 R1-pipeline 已通过）
+ CompatibilityProfile 与 TestEvidenceManifest（同一 build、声明范围，决定为 pass）
+ O1
+ G1
+ V1（V1Scope 绑定同一发布 build，或具有有效 V1MigrationManifest；效果版本不变）
+ ReleaseManifest（同一制品、配置、schema、供应商与数据策略；部署 / 回滚 / 恢复硬门通过）
+ 每项用户可见资产通过 Release Gate
= 可发布
```

R1-product-validation 只允许进入受控研究与正式界面设计决策，不进入发布公式。R1-product-release 以前置的相应 R1-pipeline 为必要条件；发布所用 V1 必须指向相同正式界面 build，或引用按 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) 预注册、桥接并批准的 `V1MigrationManifest`。CompatibilityProfile / TestEvidenceManifest 的质量硬门见 [QUALITY_AND_COMPATIBILITY.md](QUALITY_AND_COMPATIBILITY.md)，ReleaseManifest 与运行恢复硬门见 [DEPLOYMENT_RELEASE_AND_RECOVERY.md](DEPLOYMENT_RELEASE_AND_RECOVERY.md)。场景配方还要求其引用的每个效果 / 原子能力均处于可发布版本，并完成场景自己的资格、参数与 QA 验证。

以下任一变化会使相关发布结论失效并回退到研究态：

- 能力、模型 / checkpoint、配方、关键参数、输出规格、QA profile、管线版本或用户界面 build 改版；
- Windows / 浏览器精确版本、viewport / 缩放 / DPR、输入输出格式、色彩或无障碍范围发生超出预注册等价条件的变化；
- API / 数据库 / 队列 / 对象 metadata schema、制品、部署拓扑、关键功能开关、供应商 / fallback route、备份或 tombstone 策略发生实质变化；
- V1 的效果 / variant、目标人群、界面 build、招募 / 分配、主估计量、分母、尝试次数或成功规则改变；
- 适用人群、图片类型、场景声明或官方规则扩大；
- 许可证、服务条款、数据保留 / 删除或供应商行为发生实质变化；
- 新 `escape` 暴露既有门槛无法拦截的灾难缺陷；
- O1、G1 或用户可见资产 / 组合的 Release Gate 被撤销或到期。

首个混合邀请测试还必须满足：质量、主体 / 背景、创意三个方向各至少一个效果达到上述公式，并保持“三分钟内、最多两次执行取得可用结果”的 V1 目标。缺一项就只继续研究，不用候选能力、静态样例或页面占位补齐。
