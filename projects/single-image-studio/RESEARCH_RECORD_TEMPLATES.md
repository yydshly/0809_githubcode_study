# 研究记录模板

> 本文件把 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md) 的规则转成可填写模板。模板本身不是证据；字段为 `pending`、`unknown` 或没有签署时，相关等级保持 0。真实用户研究另使用 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md)，数据与删除另使用 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md)，运行事件、性能、告警与问题定位字段以 [OBSERVABILITY_AND_OPERATIONS.md](OBSERVABILITY_AND_OPERATIONS.md) 为准。

## 1. 使用顺序

```text
FixtureManifest
→ Preregistration
→ 冻结 CapabilityContract / EffectDefinition
→ RunManifest + 原始结果
→ QA / 人工评审
→ EvidenceManifest
→ 状态决定与失效监控
```

- 所有记录都要有不可变 ID、版本、创建时间、责任人和内容 hash。
- 预注册在首个正式 run 前冻结；结果字段不可回填到预注册版本。
- dev、holdout、sealed defect-holdout 和 escape 使用不同来源族并显式关联。
- 真实用户内容不复制进这些模板的研究资产路径；只引用 DataPolicy 允许的最小事件 ID。

## 2. `FixtureManifest`

```yaml
fixture_manifest_id: pending
fixture_manifest_version: pending
suite_id: NORMALIZE-DELIVER | MATTE-GT | MATTE-REAL | NATURAL-DEGRADE | CREATIVE-COVERAGE | other
partition: dev/calibration | holdout | defect/calibration | defect/holdout | escape
created_at: pending
owner: pending
source_population: pending
source_family_rule: pending
capture_session_rule: pending
perceptual_dedup_method: pending
training_contamination_risk: unknown
minimum_independent_sources_total: pending
minimum_independent_sources_per_category: pending
applicable_categories: []
rejection_categories: []
difficult_categories: []
assets:
  - asset_id: pending
    source_family_id: pending
    capture_session_id: pending
    parent_asset_id: null
    derivation: original | crop | compression | synthetic-degradation | other
    sha256: pending
    perceptual_hash: pending
    rights_record_id: pending
    privacy_class: pending
    expected: applicable | reject | defect
    category_labels: []
freeze_hash: pending
frozen_at: pending
approvers: []
```

## 3. `Preregistration`

```yaml
preregistration_id: pending
version: pending
claim_type: C1 | U1 | E1 | R1-pipeline | R1-product-validation | R1-product-release | O1 | V1
target_id: pending
target_version: pending
research_question: pending
decision_to_inform: pending
contract_hash: pending
fixture_manifests: []
unit_of_analysis: independent_source
eligibility_rule: pending
rejection_rule: pending
invalid_run_rule: pending
sample_size_plan: pending
run_repetitions_per_source: pending
primary_estimand: pending
secondary_estimands: []
source_level_aggregation: pending
first_pass_rule: pending
within_retry_rule: pending
user_execution_rule: pending
pipeline_attempt_rule: pending
provider_call_rule: pending
metrics: []
visual_anchors: []
catastrophic_failures: []
category_floors: pending
overall_threshold: pending
confidence_method: pending
missing_result_treatment: pending
stopping_rule: pending
maximum_collection_window: pending
market_benchmark: pending | unavailable-preregistered
market_benchmark_absence_reason: null
reviewer_blinding: pending
adjudication_rule: pending
agreement_threshold: pending
frozen_at: pending
freeze_hash: pending
research_owner: pending
evidence_owner: pending
approvers: []
```

若市场比较对该确定性 / 治理合同不适用，写 `not_applicable` 并说明使用的 golden、性质测试或故障注入，不得留空。

## 4. `R1AcceptanceMatrix`

每个 effect / pipeline / surface build 使用一张版本化矩阵；一行代表一个可重复场景。

| scenario_id | initial state | fixture | fault / action | expected job states | expected user state | required artifacts | forbidden artifacts | repetitions | pass rule | zero-tolerance invariant | run IDs | decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pending` | `pending` | `pending` | `pending` | `pending` | `pending` | `pending` | `pending` | `pending` | `pending` | `pending` | — | `not-run` |

矩阵头部另记录：

```yaml
matrix_id: pending
matrix_version: pending
scope: pipeline | product-validation | product-release
target_id: pending
target_version: pending
pipeline_version: pending
qa_profile_version: pending
interface_build: not_applicable | pending
target_viewports: []
frozen_at: pending
freeze_hash: pending
```

## 5. `O1Profile`

```yaml
o1_profile_id: pending
version: pending
target_id: pending
target_version: pending
environment: pending
surface_scope: windows-desktop-chromium
windows_version: pending
browser_name_and_exact_build: pending
viewport_and_input_method: pending
client_hardware: pending
network_profile: pending
surface_build: pending
api_pipeline_and_executor_versions: pending
provider_snapshots: []
processing_and_storage_regions: []
deployment_topology: pending
server_hardware_and_software: pending
input_strata: []
cold_warm_states: []
concurrency_matrix: []
arrival_rate_and_burst_profiles: []
queue_policy: pending
queue_capacity_and_max_age: pending
worker_and_provider_quotas: pending
admission_and_backpressure_policy: pending
minimum_runs_per_stratum: pending
measurement_window: pending
stopping_rule: pending
sli_definitions: []
slo_targets: []
latency_targets: {browser: pending, queue: pending, stage: pending, end_to_end: pending}
cost_targets: {per_provider_call: pending, per_attempt: pending, per_user_execution: pending, per_usable_result: pending}
cost_record_version_and_currency: pending
resource_targets: {client_memory: pending, cpu: pending, ram: pending, vram: pending, disk: pending, network: pending}
capacity_targets: pending
error_budget: pending
recovery_targets: pending
retry_policy_version: pending
idempotency_and_reconciliation_policy_version: pending
fault_cases: []
missing_and_failed_run_rule: pending
required_trace_spans: []
required_run_event_names: []
alert_rule_versions: []
runbook_versions: []
raw_run_ids: []
result_by_stratum: pending
decision: not-run
approved_at: null
```

## 6. `RunManifest`

运行中由追加式 `RunEvent` 表达；执行、QA 与交付决定到达终态或进入冻结 `UNKNOWN` 时至少生成一版不可变快照。后续下载撤销、到期或删除只允许新建引用 `supersedes` 的 manifest 版本，不能覆盖旧版。失败、取消和未知运行同样填写。

```yaml
schema_version: run-manifest.v0
run_manifest_id: pending
manifest_version: pending
supersedes: null
created_at: pending
finalized_at: pending
event_stream_through: pending
trace_id: pending
user_execution_id: pending
parent_execution_id: null
session_scope_id: pending
surface_build: pending
api_schema_version: pending
effect_or_scene: {id: pending, version: pending}
execution_plan_id: pending
capability_contract_versions: []
qa_profile_version: pending
data_policy_version: pending
inputs:
  asset_ids: []
  artifact_hash_refs: []
outputs:
  artifact_ids: []
pipeline_attempt_ids: []
provider_call_ids: []
qa_job_ids: []
delivery_id: null
deletion_job_id: null
states:
  execution: pending
  surface_binding: pending
  qa: pending
  delivery: pending
  deletion: pending
timing:
  started_at: pending
  terminal_at: pending
  stage_durations_ms: {}
retry_summary: pending
fallback_summary: pending
cancel_summary: pending
reconciliation_summary: pending
error_envelope_ids: []
support_code: pending
executor_versions: []
provider_snapshots: []
processing_regions: []
resource_summary: pending
cost_summary:
  currency: pending
  estimated: pending
  provider_reported: pending
  billed: pending
  unknown_possible_charge: pending
rights_and_consent_record_refs: []
event_stream_hash: pending
manifest_hash: pending
retention_class: pending
```

普通日志不允许复制 `artifact_hash_refs`、图片内容或用户自由文本；权限受控记录只保存引用。一次用户执行可包含多个 attempt，但不得把重试覆盖成同一个 attempt。

## 7. `RunEvent`

```yaml
schema_version: run-event.v0
event_id: pending
event_name: pending
occurred_at: pending
observed_at: pending
trace_id: pending
span_id: pending
parent_span_id: null
request_id: pending
user_execution_id: pending
pipeline_attempt_id: null
provider_call_id: null
qa_job_id: null
delivery_id: null
deletion_job_id: null
component: pending
stage: pending
environment: pending
region: pending
build_version: pending
from_status: null
to_status: null
outcome: pending
duration_ms: null
queue_age_ms: null
attempt_number: null
canonical_code: null
error_envelope_id: null
safe_attributes: {}
artifact_ref_ids: []
event_schema_hash: pending
sequence_number: pending
previous_event_hash: null
```

`safe_attributes` 只使用版本化 allowlist。事件允许至少一次投递，消费者按 `event_id` 去重；发生时间与观察时间都保留，以发现乱序和时钟偏移。

## 8. `ErrorEnvelope`

```yaml
schema_version: error-envelope.v0
error_envelope_id: pending
occurred_at: pending
trace_id: pending
user_execution_id: pending
pipeline_attempt_id: null
provider_call_id: null
stage: pending
component: pending
canonical_code: pending
provider_code: null
outcome: pending
retry_class: NEVER | BOUNDED_IDEMPOTENT | RECONCILE_ONLY | USER_ACTION
retry_after_ms: null
max_attempts: pending
http_status: null
provider_request_id_restricted_ref: null
possible_charge: false | true | unknown
data_class: pending
safe_user_message_id: pending
support_code: pending
diagnostic_summary_redacted: pending
runbook_id: pending
```

供应商响应正文、图片、Prompt、密钥、对象 URL 与内部路径不得进入该模板。`provider_request_id` 使用权限受控引用，浏览器只显示安全文案与无语义支持码。

## 9. 告警、Runbook、故障注入与事故记录

### `AlertRule`

```yaml
alert_rule_id: pending
version: pending
scope: pending
signal_and_query: pending
window: pending
threshold_or_invariant: pending
severity: SEV-0 | SEV-1 | SEV-2 | SEV-3
error_budget_policy: pending
dedup_and_cooldown: pending
owner: pending
fallback_owner: pending
runbook_id: pending
kill_switch: pending
notification_safe_fields: []
tested_at: null
test_run_ids: []
```

### `RunbookRecord`

```yaml
runbook_id: pending
version: pending
title: pending
applicable_builds_and_versions: []
detection_signals: []
owner: pending
fallback_owner: pending
stop_or_rollback_authority: pending
containment_steps: []
diagnosis_steps: []
reconciliation_steps: []
recovery_steps: []
recovery_verification: []
user_communication: pending
evidence_retention_boundary: pending
last_drill_at: null
drill_run_ids: []
next_review_at: pending
```

### `FaultInjectionRecord`

```yaml
fault_record_id: pending
version: pending
o1_profile_id: pending
r1_acceptance_matrix_id: pending
scenario_id: pending
injection_layer_and_point: pending
fault_definition: pending
expected_event_and_state_sequence: []
zero_tolerance_invariants: []
expected_recovery_time: pending
expected_artifacts_and_cleanup: pending
expected_charge_state: pending
repetitions: pending
run_ids: []
observed_result: not-run
decision: not-run | pass | fail | invalid
```

### `IncidentReport`

```yaml
incident_id: pending
severity: pending
detected_at: pending
contained_at: null
recovered_at: null
affected_scope_and_versions: pending
alert_rule_id: pending
support_codes: []
runbook_id: pending
impact_without_user_content: pending
data_or_rights_impact: pending
cost_impact: pending
timeline_event_refs: []
root_cause_category: pending
root_cause: pending
containment_and_recovery: pending
user_or_owner_notifications: pending
escape_fixture_record: null
corrective_actions: []
owners: []
reviewed_at: null
```

事故记录只引用脱敏事件和受控证据，不附用户图片。涉及真实漏检时，只有完成权利 / 隐私处理后才能形成 `escape` 夹具。

## 10. `EvidenceManifest` 决定页

完整字段以 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md) 为准；决定页至少填写：

```yaml
evidence_id: pending
evidence_version: pending
claim_type: pending
scope_id: pending
target_id: pending
target_version: pending
preregistration_hash: pending
contract_hash: pending
fixture_manifest_versions: []
raw_run_ids: []
result_by_partition: pending
result_by_category: pending
qa_confusion_matrix: pending
reviewer_and_adjudication_record: pending
latency_cost_environment: pending
rights_and_license_records: pending
known_limits: []
decision: not-run | pass | fail | invalid | inconclusive
evidence_level: 0 | C1 | U1 | E1 | R1-pipeline | R1-product-validation | R1-product-release | O1 | G1 | V1
invalidation_triggers: []
supersedes: null
evidence_owner: pending
reviewers: []
approved_at: null
```

`inconclusive` 不能写成 pass。样本不足、污染、无法判定、市场比较臂缺席但未预注册或版本漂移时，关闭当前记录并新建版本。

## 11. Release Gate 记录

```yaml
allowlist_version: pending
asset_or_bundle_id: pending
asset_role: source | reference | result | failure | comparison-bundle
content_hash: pending
source_and_rightsholder: pending
permission_evidence_uri: pending
processing_allowed: pending
public_display_allowed: pending
commercial_marketing_allowed: pending
permission_scope: {surface: pending, media: pending, geography: pending, term: pending}
withdrawal_status: active | withdrawn | expired | unknown
person_property_trademark_review: pending
model_service_terms_record: pending
effect_and_qa_versions: pending
attribution_and_ai_disclosure: pending
reviewer: pending
approved_at: null
next_review_at: pending
takedown_locator: pending
decision: pending
```

Release Gate 只决定该资产或组合在声明 surface 上能否显示，不重新授予 C1、U1 或 E1。

## 12. `V1MigrationManifest`

只有 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) 的预注册等价条件成立时才填写：

```yaml
migration_id: pending
migration_version: pending
source_v1_scope: pending
source_interface_build: pending
target_interface_build: pending
target_r1_product_release_manifest: pending
equivalence_rule_version: pending
preregistered_at: pending
diff_audit: pending
unaffected_effects_and_variants: []
affected_effects_and_variants: []
bridge_acceptance_matrix: pending
bridge_run_ids: []
accessibility_results: pending
decision: migrate | partial-rerun | full-rerun
rationale: pending
reviewers: []
approved_at: null
invalidation_triggers: []
```

`partial-rerun` 或 `full-rerun` 的 scope 在新用户验证完成前保持不可发布；模板不能把行为变化改写成“视觉等价”。
