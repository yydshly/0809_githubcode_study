# 用户研究与 V1 协议

> 本文件规定 Single Image Studio 如何开展形成性研究和正式 V1 验证。它冻结研究对象、抽样、分母、尝试次数、界面版本、停止规则与用户图片的数据边界，不记录当前证据状态。当前状态以 [STATUS.md](STATUS.md) 为唯一事实来源，证据轴和发布公式见 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md)。

## 1. 目标与边界

用户研究回答的是：目标用户能否理解一个已验证效果，在真实界面中以受控成本取得并保留可用结果。它不能替代：

- C1 对原子能力的质量证明；
- U1 / E1 对效果稳定性的证明；
- R1-pipeline / R1-product-validation / R1-product-release 对真实运行链与对应界面版本失败恢复的证明；
- O1 对时延、成本和可靠性的证明；
- G1 对数据、权利和删除机制的证明；
- Release Gate 对具体公开资产的授权。

点击、停留时长、满意评论、内部员工试用或挑选出的成功故事都不能单独授予 V1。官方证件 profile、机构受理率及法规符合性不在本协议的当前范围内，除非未来建立独立场景合同和官方规则证据。

首轮 V1 只外推到冻结的 Windows 桌面 Chromium 范围：Chrome/Edge 精确版本、Windows 版本、显示缩放、页面缩放、`1280 × 720` / `1440 × 900` 目标视口和输入方式均需记录。移动、平板、iPhone、Safari、Firefox、HEIC 与完整响应式体验不进入首轮 V1；详细边界见 [UI_SURFACES_AND_ACCESSIBILITY.md](UI_SURFACES_AND_ACCESSIBILITY.md)。

## 1A. 早期内部可用性走查（非用户研究证据）

为避免完整证据门阻止最小产品学习，基础编辑器和后续抠图闭环可以各做一次受控的早期内部走查。它不属于下文的形成性研究或冻结 V1 验证，也不能授予 C1、U1 / E1、R1、O1、G1、V1 或 Release Gate。

- 仅在对应工程主路径、失败门控、真实下载和本地数据边界通过后开始；
- 每轮使用 5–8 名符合目标用户特征的人员，使用项目提供的原创或明确许可图片，不接收、上传或保存参与者自己的照片；
- 在受控本地设备上记录 build、浏览器、视口、任务脚本、完成时间、求助、错误、下载和主持人介入；
- 默认不录音、不录像、不采集敏感人口属性；观察前说明目的、记录内容、退出方式并取得同意；
- 基础编辑器轮只回答导航、编辑、错误理解和下载是否可用；抠图轮只回答自动结果、修正负担、透明导出和纯色换底是否可理解；
- 结果只能用于界面迭代和下一阶段 go / no-go，不得作为效果质量、总体成功率或公开产品能力的证据。

一旦需要参与者自己的图片、远程上传、正式招募结论或对外成功率，就退出本条轻量边界，重新满足下文研究和治理前置条件。

## 2. 两阶段研究

### 2.1 形成性研究

- 使用 6–8 名目标用户发现术语、推荐解释、参考预期、参数、错误恢复和下载理解问题。
- 可以迭代任务、文案和界面；每次变化均记录 build 与日期。
- 形成性参与者、其任务结果和形成性成功率不得进入正式 V1 分母。
- 研究结论只用于修改假设与生成正式预注册，不声称 V1。

### 2.2 冻结 V1 验证

- 使用至少 18 名**新的、互不重复**的目标用户；如一个研究同时声明多个效果或 variant，还必须满足每个效果 / variant 预注册的最小有效样本，不能用总人数替代。
- 18 人是邀请 beta 的最低产品决策起点，不是总体人群代表性或普遍成功率证明；必须报告原始分母、区间与招募偏差，结论只外推到冻结 `V1Scope`。
- 在首名正式参与者开始前冻结 `V1Scope`、效果版本、界面 build、任务、样例、资格与拒绝规则、样本计划、主估计量、成功门槛、置信方法和停止规则。
- 运行期间不得更换模型、配方、QA profile、关键文案、交互、样本口径或阈值。必要变更会关闭当前 scope，并以新版本重新预注册。

## 3. 开始研究前的必要条件

形成性或正式研究不得仅靠 R0 页面开始。根据使用的数据与研究目的，启动前必须记录：

1. 目标效果的冻结 EffectDefinition、全部依赖合同和 QA profile，且相应 C1 与 U1 / E1 已取得；形成性研究也不把候选或 E0 结果当成真实用户能力测试。
2. 真实 R1-pipeline 与覆盖该研究环境、负载和恢复目标的 O1Profile。形成性研究可使用尚未冻结的低保真壳层，但必须先通过覆盖数据告知、错误绑定、QA 门禁、删除和真实下载的形成性安全 smoke matrix；它不能取得 R1-product-validation。正式 V1-validation 必须使用已经取得相同 build `R1-product-validation` 的冻结研究界面。
3. 若 V1 将用于发布公式，界面必须是已经取得 R1-product-release 的精确 build，或具有预注册等价变更清单、桥接测试和批准迁移 manifest 的 release build；不能把后来重做的界面默认视为相同产品。
4. 覆盖研究环境、预期输入与并发范围的 O1Profile；V1 观察到的用时不能反向代替独立 O1。
5. 覆盖参与者数据、用户图片、第三方服务发送、录屏 / 录音、日志和删除的 G1 治理范围。
6. 所有展示给参与者的项目来源图、参考图、示例结果和失败示例已通过其研究 surface 所需的 Release Gate。参与者私有上传不因此获得公开展示权。
7. 测试账号、故障回退、支持联系人、暂停条件和删除验证已经演练。
8. 已冻结 `CompatibilityProfile`，记录精确 Windows、Chrome/Edge、Chromium、视口、DPR、Windows 显示缩放、页面缩放、输入方式和已排除平台；对应 build 已在 `1280 × 720` 与 `1440 × 900` 通过状态、错误恢复、键盘和可访问性 acceptance matrix。

任何前置项为 `unknown`、已过期或目标版本不一致时，只能做不采集个人图片的内部方法演练，不能计入用户研究证据。

## 4. `V1Scope` 最小字段

每个正式结论对应一个不可变 scope：

```text
v1_scope_id + version + study_purpose
research_question + hypothesis + decision_to_inform
effect_id + effect_version + variants
capability_contract_versions + qa_profile_version + pipeline_version
r1_product_scope = validation | release
interface_build + compatibility_profile_id
windows_version + browser_name + browser_version + chromium_version
target_viewports + device_pixel_ratio + windows_display_scale + page_zoom
input_method + locale + explicitly_excluded_platforms
target_population + inclusion + exclusion + recruitment_channels
segments + assignment_method + crossover_or_learning_control
minimum_unique_participants_total
minimum_valid_participants_per_effect + per_variant + per_segment
unit_of_analysis + repeated_task_handling
itt_denominator + eligible_denominator + rejected_denominator + valid_denominator
dropout_rule + invalid_session_rule + missing_data_rule
task_script + allowed_help + facilitator_intervention_rule
timer_start_event + timer_stop_event + pause_rule
user_execution_rule + internal_retry_rule + source_replacement_rule
primary_estimand + secondary_estimands
compound_success_definition + understanding_measure + usability_anchor
overall_threshold + per_effect_floor + confidence_method
catastrophic_user_or_output_failures + stopping_rule + maximum_window
consent_version + retention_schedule + deletion_verification
preregistration_hash + frozen_at + research_owner + evidence_owner
```

本协议不为未校准项目虚构通过率、类别下限或置信区间数值。上述字段必须在招募前填写；空白或 `unknown` 使研究不可授予 V1。

### 4.1 `V1MigrationManifest`

验证壳的 V1 不得靠文档判断迁移到正式页面。若声称 release build 与验证 build 等价，必须在正式页面实现前预注册允许迁移的变化，并在实现后建立：

```text
migration_id + migration_version
source_v1_scope + source_interface_build
target_interface_build + target_r1_product_release_manifest
equivalence_rule_version + preregistered_at
diff_by_task_discovery_information_hierarchy_controls_copy_states
diff_by_compatibility_profile_viewport_timing_data_notice_download_behavior
unaffected_effects_and_variants + affected_effects_and_variants
bridge_acceptance_matrix + bridge_run_ids + accessibility_results
decision(migrate|partial-rerun|full-rerun) + rationale
reviewers + approved_at + invalidation_triggers
```

任务发现、信息层级、控件、关键文案、页面状态、桌面视口行为、兼容环境、计时、数据告知或下载任一项超出等价清单时，受影响 scope 不得迁移，必须重新取得 V1-release。迁移只减少重复测试，不改变原 V1 的目标人群、效果版本、兼容范围、分母或成功门槛；桌面证据不能通过迁移扩展为移动或其他浏览器证据。

## 5. 抽样、分配与分母

### 5.1 参与者与效果覆盖

- 参与者必须符合目标人群，而不是只招内部团队、图片专家或已有产品经验者。
- 同一人只计一次 unique participant。重复参加、形成性参与者或协助设计的人不能进入冻结验证分母。
- 每个待声明效果 / variant 都有自己的最小有效样本和类别覆盖。若总样本达到 18，但任一效果的预注册下限未达到，只能对覆盖充足的范围判定，不能宣布整个混合产品取得 V1。
- 默认每人只有一个预注册的 primary task。若使用交叉设计，必须预先处理顺序、学习效应和同一人的相关性；不能把同一人多次任务当成多个独立用户。

### 5.2 四个必须同时报告的分母

- `ITT`：已同意并开始正式任务的全部参与者。招募后因产品资格判断、执行失败或结果不佳而退出者仍保留在 ITT。
- `eligible`：其首个任务来源符合冻结 EffectDefinition 资格的参与者。
- `rejected`：首个来源被产品判定不适用的参与者，继续区分 correct reject 与 false reject。
- `valid`：仅排除预注册的研究无效情形后可进入主统计的参与者。

产品执行错误、超时、错误推荐、QA 拦截、用户放弃和未下载通常是任务结果，不是研究无效理由。正确拒绝可证明资格与推荐行为，但不能当作该效果“取得可用结果”的 V1 成功。若用户换图，首图的拒绝或失败仍保留在原分母，新图只能按预注册的 source replacement 规则进入补充分析。

### 5.3 无效与缺失

可考虑的无效情形仅限预注册事件，例如重复参与、未完成同意、研究工具自身丢失关键记录、主持人严重偏离脚本或确认不是目标人群。参与者不会操作、产品崩溃、模型失败或结果不可用不得事后标成无效。

所有退出、缺失、无效及其原因逐项报告。若有效样本不足，只能按冻结停止规则关闭为未决或失败，再开新 scope；不得边看通过率边补招到刚好过线。

## 6. 时间与尝试次数

`V1Scope` 必须把事件定义到可由日志和观察记录共同核对：

- **用户执行**：用户明确确认后创建一个新的效果处理 / 生成任务。调整参数后再次提交、选择另一个结果配方后提交，均算新的用户执行。
- **管线 attempt**：后端为一次用户执行创建的实际任务尝试。
- **内部 retry / fallback**：系统未要求用户再次确认而进行的重试或执行器切换；它不增加用户执行数，但必须进入 R1、O1、成本和 V1 运行记录，不能被隐藏。
- **诊断 retry**：研究人员为排查问题额外触发的运行；不得替换参与者看到的原始结果，也不得计入正式成功。

“最多两次执行”只指同一 primary task 的用户执行数。主报告必须同时给出 first-pass 与 within-two-executions，且预先指定哪一个是主估计量。三分钟的起点、终点、是否允许暂停以及网络 / 排队时间是否计入都在 scope 中冻结；不能在失败后重置计时器。

换来源图会开始一个可追踪的新 source attempt，但不会删除原任务结果。若资格拒绝后允许换图，是否继续计入同一三分钟窗口必须事前规定。

## 7. 任务与成功判定

正式任务使用中性脚本，不透露预期“应该喜欢”的答案，也不由主持人代替用户选效果、参数或结果。允许帮助的内容和次数预注册并逐次记录。

每个参与者的 V1 compound success 至少同时检查：

1. 用户正确理解推荐理由、适用边界、允许 / 禁止变化，以及参考图不是承诺结果。
2. 在冻结时间和用户执行次数内得到与本人 primary task 绑定的结果。
3. 结果通过对应任务 QA，且无预注册灾难缺陷。
4. 用户按冻结的可用性锚点判断结果可用于预期目的；不能只问泛化的“喜欢吗”。
5. 用户主动下载 / 保存结果，或完成预注册的等价实际用途。

主成功率、每效果 / variant 下限、理解题规则、可用性量表锚点和置信方法必须预注册。各条件的单项结果也要报告，不能只给一个合成百分比。实用效果需验证实际用途；创意效果需验证用户由参考对形成的预期与真实变化一致。

## 8. 评审、盲法与裁决

- 能从界面日志直接判定的事件使用冻结事件定义；不能用研究员回忆替代。
- 输出质量与“是否符合任务合同”由至少两名不参与该次会话引导的评审者独立判断，并在可行时隐藏执行器、配方和候选身份。
- 在研究开始前冻结视觉锚点、分歧裁决方式、第三评审触发条件、保守规则和一致性指标。分歧原始记录不得被最终结论覆盖。
- 用户本人的“可用于目的”与专家 QA 是不同变量，二者都保留；任何一方不能静默替代另一方。
- 分析脚本、排除清单和主表在揭示汇总通过率前锁定。探索性切片必须明确标注，不得事后变成主结论。

## 9. 停止、暂停与版本变化

预注册至少包含目标样本停止、最大招募窗口、数据质量暂停、隐私 / 安全事件暂停、连续系统不可用、灾难输出和夹具 / 版本污染的处理规则。

出现以下情况时立即停止把新会话计入当前 scope，并由责任人决定关闭或新建版本：

- 模型、checkpoint、配方、QA profile、管线、关键参数或资格合同改变；
- 界面 build、核心任务流程、推荐解释、参考样例或关键文案改变；
- 数据发送方、保留期限、同意文本或供应商条款改变；
- 隐私事件、错误结果绑定、错误下载或新的灾难级 escape；
- 研究人员提前查看主结果后提出改变样本、分母或门槛。

旧版本的原始结果继续保留在其合法期限内并如实报告，不能并入新版本主结论。

## 10. 用户图片、录制与删除

### 10.1 分离授权

同意界面必须把以下用途分开，不以一个总开关替代：

- 为本次任务处理图片；
- 将图片发送给列明的本地 / 云端执行器；
- 保存研究事件与去标识指标；
- 录屏、录音或访谈转写；
- 在研究期内额外保留原图 / 结果用于缺陷分析；
- 公开展示或营销使用。

拒绝额外保留或公开展示不能阻止用户获得本次处理服务，除非研究本身无法在最小数据范围内合法运行，并在招募前明确说明。

### 10.2 默认最小化

- 用户原图、参考输入、结果和完整请求默认只为该次处理及冻结的短期研究核验保留，并按 G1 中的明确期限删除。
- 它们不自动复制到 `dev/calibration`、`holdout`、`defect`、`escape`、公开样例、培训材料或模型训练目录。
- 日志使用运行 ID 和最少必要元数据；不得把原图、可还原缩略图、完整提示词、文件名、EXIF、访问令牌或个人标识写入普通分析日志。
- 删除必须覆盖应用存储、任务缓存、临时文件、备份策略内可操作副本和供应商侧数据，并留下不含图片内容的删除证明。

### 10.3 escape 处理

真实 QA 漏检优先记录缺陷分类、受影响版本、去标识事件和人工 / 合成重建的最小复现。只有参与者另行明确同意研究保留、用途、访问者和期限时，原图才可进入受限 escape 库；撤回后按承诺删除。研究保留授权仍不等于公开展示授权，Release Gate 必须另行逐资产审查。

## 11. 报告与 V1 判定

正式报告和对应 EvidenceManifest 至少包括：

- V1Scope 与预注册 hash、研究日期、build、效果和所有依赖版本；
- 招募漏斗、ITT / eligible / rejected / valid / dropout / invalid 的准确人数与原因；
- 每效果、variant、人群段、来源困难类别的分母与结果；
- first-pass、within-two、时间、内部 retries、失败、QA 拒绝和下载 / 用途结果；
- compound success 及每个组成条件、置信结果、预注册门槛和偏差；
- 帮助次数、协议偏离、版本事件、评审分歧、用户负面反馈和已知限制；
- 数据保留 / 删除执行状态、研究事故以及责任人签署。

只有对应效果 / variant 的全部硬门槛在其预注册分母上同时成立，才能对该 `V1Scope` 授予 V1。平均结果不能补偿某效果无样本、灾难失败或类别下限失败。

研究界面的 V1-validation 只能直接支持产品方向判断；用于发布公式的 V1 必须绑定取得 R1-product-release 的同一界面 build、同一效果版本和同一目标人群范围，或引用一份通过预注册等价条件与定向桥接测试的迁移 manifest。界面变化若超出事前批准的等价范围，就必须创建新 scope 并重跑相应用户验证。

## 12. 启动清单

- [ ] 前置 C1、U1 / E1、R1-pipeline 与目标 R1-product-validation / release 范围可追溯
- [ ] V1Scope 所有字段已填写并冻结，无 `unknown`
- [ ] `CompatibilityProfile` 已冻结精确 Windows、Chrome/Edge 和视口；两个目标视口的 acceptance matrix 已通过
- [ ] 总样本与每效果 / variant 有效样本均已预注册
- [ ] ITT、eligible、rejected、valid、dropout 与 invalid 口径已冻结
- [ ] first-pass、within-two、计时和内部 retry 口径已冻结
- [ ] 主成功率、类别下限、置信方法与停止规则已冻结
- [ ] G1 覆盖真实用户数据流、保留、删除、日志和供应商
- [ ] 参与者可见项目资产已通过对应 surface 的 Release Gate
- [ ] 同意、撤回、删除、暂停与事故响应已经演练
- [ ] 研究 owner、证据 owner、评审者和裁决者已指定

任一项未完成时，研究可以继续准备，但不能开始计入正式 V1。
