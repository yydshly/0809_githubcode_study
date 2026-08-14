# 可观测性与运维研究契约

> 文档角色：冻结 Single Image Studio 首轮桌面浏览器研究的运行记录、性能、容量、成本、告警和故障定位合同。本文描述目标系统，不表示这些能力已经实现；证据状态仍以 [STATUS.md](STATUS.md) 为准。

## 1. 当前事实与首轮范围

当前 R0 工程探针使用内存任务状态，进程重启后不能恢复；没有版本化持久任务、结构化日志、分布式 trace、指标系统、告警、支持码索引或正式 runbook。上述项目当前实现数与 O1 证据均为 **0**。控制台启动信息、浏览器开发者工具、自动测试输出和 R0 的 run ID 只能作为工程线索，不能充当 `RunManifest`、运行证据或线上问题定位能力。

首轮目标环境只包括：

```text
Windows 桌面设备
+ Chromium 系桌面浏览器
+ 键盘 / 鼠标交互
+ 单窗口、单图、单次会话
+ 第一方 HTTPS 页面与 API
```

每份正式 `O1Profile` 必须锁定 Windows 版本、浏览器名称和精确 build、视口、设备硬件、网络档位、服务端版本、区域与负载。`latest` 不能作为证据版本。移动端、触摸、安全区、移动内存 / 电量、iOS / Android、Safari / Firefox、相机拍摄和移动网络均后置，也不得由桌面结果推断。首轮对 HEIC、AVIF、HDR、动画图等未冻结格式只允许明确拒绝，不能静默错误处理后称为兼容。

## 2. 运行关联模型

一次用户操作必须能够沿下列层级定位，且重试不得覆盖父级记录：

```text
trace_id
└─ user_execution_id                 用户每次点击“执行”的一次意图
   ├─ pipeline_attempt_id            首次管线尝试或自动重试；每次重试新建
   │  ├─ provider_call_id            每次本地执行器或远程供应商调用
   │  ├─ qa_job_id                   每次任务 QA
   │  └─ artifact_id                 每个中间或最终产物
   ├─ delivery_id                    下载门禁与正式交付
   └─ deletion_job_id                删除、TTL 或迟到结果清理
```

此外，每个 HTTP 请求有独立 `request_id`，每个组件内部步骤有 `span_id`；它们都引用当前 `trace_id`。匿名 `session_id` 只在冻结 TTL 内用于访问控制，不进入长期指标标签。远程供应商返回的 `provider_request_id` 只保存在受限诊断字段，并与本地生成的 `provider_call_id` 映射。

ID 必须不可猜测、不可复用且不含用户、文件、时间、供应商或错误含义。浏览器只收到完成当前交互所需的 ID 和无语义 `support_code`；不得把数据库主键、对象 key、供应商请求 ID 或内部 trace 查询链接返回用户。

## 3. 状态必须分离

一个 `status` 不能同时表示执行、界面绑定、QA、下载和删除。权威投影至少分为：

| 维度 | 允许状态 | 说明 |
| --- | --- | --- |
| `execution_status` | `CREATED`、`VALIDATING`、`QUEUED`、`RUNNING`、`SUCCEEDED`、`FAILED`、`CANCELED`、`UNKNOWN` | `SUCCEEDED` 只表示执行器产生了候选，不代表 QA 或下载通过 |
| `surface_binding_status` | `ACTIVE`、`SUPERSEDED`、`DETACHED`、`EXPIRED` | 换图、换效果、刷新或会话过期后，迟到结果不得重新绑定 |
| `qa_status` | `NOT_STARTED`、`RUNNING`、`PASS`、`REVIEW`、`FAIL`、`ERROR` | 只有绑定仍有效且 QA `PASS` 才能考虑交付 |
| `delivery_status` | `LOCKED`、`READY`、`DOWNLOADED`、`REVOKED`、`EXPIRED` | 签名下载与当前会话、run、artifact 和 QA 版本绑定 |
| `deletion_status` | `NOT_REQUESTED`、`REQUESTED`、`IN_PROGRESS`、`CONFIRMED`、`PARTIAL`、`FAILED` | 本地确认与供应商删除边界分别记录，不能合并声称 |

状态由追加式 `RunEvent` 投影，禁止直接改写历史事件。非法转换、同一幂等键产生两个有效执行、终态后复活、旧结果覆盖新结果、QA 失败仍下载、删除 tombstone 后重建资产，均为零容忍不变量。

## 4. `RunManifest`

`RunManifest` 是一次 `user_execution_id` 的版本化不可变快照；执行中状态由追加式事件表达，不能不断覆盖同一 JSON 冒充审计记录。执行、QA 与交付决定到达终态或冻结 `UNKNOWN` 时至少生成一版；之后发生下载撤销、到期或删除时生成引用 `supersedes` 的新版本，旧版保留且不能改写。证据必须钉住精确 manifest 版本。最低字段如下：

```text
schema_version + run_manifest_id + manifest_version + supersedes
created_at + finalized_at + event_stream_through
trace_id + user_execution_id + parent_execution_id
session_scope_id + surface_build + api_schema_version
effect_or_scene_id + effect_or_scene_version + execution_plan_id
capability_contract_versions + qa_profile_version + data_policy_version
input_asset_ids + input_artifact_hash_refs + output_artifact_ids
pipeline_attempt_ids + provider_call_ids + qa_job_ids
delivery_id + deletion_job_id
execution_status + surface_binding_status + qa_status
delivery_status + deletion_status
started_at + terminal_at + stage_durations
retry_summary + fallback_summary + cancel_summary + reconciliation_summary
error_envelope_ids + support_code
executor_versions + provider_snapshots + processing_regions
resource_summary + cost_summary + possible_charge
rights_and_consent_record_refs
event_stream_hash + manifest_hash + retention_class
```

图片 hash 只通过权限受控的资产记录引用，不能复制到普通日志。`RunManifest` 必须保留失败、取消和 `UNKNOWN`，不能只为成功运行生成。多个 pipeline attempt 聚合到同一用户执行，但 O1 和成本分母仍分别报告 user execution、attempt 和 provider call。

## 5. `RunEvent`

每次状态变化、外部调用、产物生成、QA、交付和清理产生一个追加式事件：

```text
schema_version + event_id + event_name + occurred_at + observed_at
trace_id + span_id + parent_span_id + request_id
user_execution_id + pipeline_attempt_id
provider_call_id + qa_job_id + delivery_id + deletion_job_id
component + stage + environment + region + build_version
from_status + to_status + outcome
duration_ms + queue_age_ms + attempt_number
canonical_code + error_envelope_id
safe_attributes + artifact_ref_ids
event_schema_hash + sequence_number + previous_event_hash
```

`safe_attributes` 采用事件级 allowlist；未知字段默认不写。生产 / 真实用户事件禁止携带图片字节、base64、缩略图、原文件名、路径、对象 URL、完整 IP / User-Agent、EXIF / GPS、OCR 或 Prompt 全文、可跨用户关联的图片 hash、密钥、Authorization、Cookie 和供应商响应正文。

事件投递允许至少一次，但消费者必须按 `event_id` 去重；丢失、重复、乱序和时钟偏移须可观测。业务处理不得依赖遥测平台可用性；遥测中断时进入本地有界缓冲或明确降级，不能无限阻塞图片任务，也不能静默丢掉正式 O1 运行证据。

## 6. `ErrorEnvelope` 与支持码

所有失败采用同一结构，不把供应商原文直接传给浏览器：

```text
error_envelope_id + occurred_at
trace_id + user_execution_id + pipeline_attempt_id + provider_call_id
stage + component + canonical_code + provider_code
outcome + retry_class + retry_after_ms + max_attempts
http_status + provider_request_id + possible_charge
data_class + safe_user_message_id + support_code
diagnostic_summary_redacted + runbook_id
```

`canonical_code` 使用低基数、版本化命名空间：`INPUT_*`、`SECURITY_*`、`POLICY_*`、`QUEUE_*`、`EXECUTOR_*`、`PROVIDER_*`、`QA_*`、`DELIVERY_*`、`STORAGE_*`、`CANCEL_*`、`DELETE_*`、`TELEMETRY_*`、`INTERNAL_*`。供应商新增错误先映射到既有类别；不能把高基数原始错误文本当指标 label。

`retry_class` 只能是：

- `NEVER`：格式、授权、安全拒绝、确定性 QA 失败等不可自动重试；
- `BOUNDED_IDEMPOTENT`：在冻结次数、退避、总时限和成本上限内，以同一幂等语义新建 attempt；
- `RECONCILE_ONLY`：调用结果未知，只允许查询，不允许盲目再提交；
- `USER_ACTION`：需要用户改图、改参数或显式再次执行。

`support_code` 为随机、短期、无语义的查询码，映射到 `user_execution_id`，本身不能解码内部 ID。所有用户可见终态失败都展示支持码；查询需最小权限和工单理由，映射按 DataPolicy 到期。支持人员默认只看脱敏时间线，不得查看用户图片。

## 7. 日志、Trace 与 Metrics

### 7.1 结构化日志

- 统一 JSON schema、UTC 时间、严重级别、component、environment、build、region、canonical code 和关联 ID。
- 业务状态以 `RunEvent` 为准；普通日志只补充诊断，不能成为唯一审计源。
- 成功、失败、取消、超时、未知、迟到丢弃、QA 拒绝、下载拒绝和删除均有结构化事件。
- 采样不得破坏证据：正式 O1 / 故障注入 run、全部失败 / `UNKNOWN` / 安全事件及删除事件 100% 保留最小事件；普通成功诊断日志可采样，但 `RunManifest` 不采样。
- 开发环境也使用相同字段 allowlist；“只在本机”不是记录图片或密钥的理由。

### 7.2 Trace

最低 span 链为：

```text
browser.precheck → browser.decode_preview → upload
→ api.accept → normalize → queue.wait → worker.execute
→ provider.call（若有）→ qa → export → manifest.finalize
→ result.fetch → compare.render → download
→ cancel / delete / reconcile（按需）
```

跨队列、worker 和供应商时传播第一方 trace context；不能把敏感参数放进 span 名称或 baggage。供应商不支持 trace 时，以 `provider_call_id ↔ provider_request_id` 建立边界。正式 O1 运行要求关键 span 完整；缺失 span 的运行记为遥测失败，不能从时延分母删除。

### 7.3 Metrics

指标 label 只允许低基数维度：build、environment、region、effect version、executor version、stage、outcome、canonical code、输入像素 / 格式档、冷 / 热状态、并发档。禁止以用户、会话、run、asset、文件名、Prompt、URL 或 provider request ID 作为 label。

最低指标族：

| 范围 | 指标 |
| --- | --- |
| 浏览器 | 预检 / 解码 / 预览时延、上传开始与完成时延、上传吞吐、交互响应、长任务、JS 错误、页面峰值内存（可测时）、结果与对比首显 |
| API / 队列 | 接受 / 拒绝率、请求时延、队列深度、最老任务年龄、入队到启动、去重、背压与限流 |
| 管线 | 各 stage 与端到端 p50/p95/p99、成功 / 明确拒绝 / 失败 / 取消 / `UNKNOWN`、attempt 数、恢复时间、迟到结果丢弃 |
| 执行器 / 供应商 | 调用时延、429/5xx/安全拒绝、超时、无效响应、查询 / 取消结果、限额余量、provider request 映射完整率 |
| QA / 交付 | QA pass/review/fail/error、误放行 / 误拒绝研究指标、导出失败、下载门禁拒绝、错误绑定不变量 |
| 资源 / 容量 | CPU、RAM、VRAM、磁盘、网络、worker 并发、冷启动、缓存命中及有界缓冲占用 |
| 成本 | 每 provider call、pipeline attempt、user execution 和可用结果成本；重试浪费、取消后计费、`UNKNOWN` 潜在费用 |
| 治理 | 删除年龄与失败、遥测脱敏扫描、未登记 region / processor、密钥或敏感字段检测 |

## 8. 首轮 SLI / SLO 合同

具体目标必须在负载运行前写入版本化 `O1Profile`；下面是桌面研究首轮的默认预注册候选，不是当前成绩，也不自动授予 O1。

| SLI | 计算口径 | 默认候选 SLO |
| --- | --- | --- |
| 浏览器交互可响应 | 声明桌面硬件上，上传后关键点击到可见反馈；按交互计 | p95 ≤ 200 ms；不得因后台轮询持续阻塞主线程 |
| 本地预览 | 支持格式从文件选择完成到方向正确的预览首显；失败也计入分母 | p95 ≤ 2 s |
| 接受确认 | 上传完成到服务端返回已接受 / 明确拒绝 | p95 ≤ 1 s |
| 已接受任务终态 | 已接受执行在 180 s 内到达成功、明确失败、取消或可解释 `UNKNOWN`；失败不从分母删除 | ≥ 99% |
| 可用结果时限 | 取得 U1 / E1 的适用运行，从用户执行到 QA 通过结果首显 | p95 ≤ 180 s，并单独报告各效果 / 输入档 |
| 队列启动 | 在冻结邀请负载内，入队至 worker 开始 | p95 目标由首轮 capacity calibration 冻结；未填不得判 O1 |
| 取消确认 | 可取消阶段从请求到本地绑定撤销 | p95 ≤ 2 s；远程取消结果另记 |
| `UNKNOWN` | 终态窗口后仍无法确认供应商是否执行 / 计费的 user execution | ≤ 0.5%；超过冻结 reconciliation window 的存量为 0 |
| 运行关联完整性 | 正式运行可由 support code 解析到完整 ID 链、状态与成本；按运行计 | 100% |
| 关键 trace 完整性 | 正式 O1 run 的必需 span 与事件齐全 | 100% |
| 下载绑定正确性 | 下载与当前会话、run、artifact、QA 版本一致 | 100%，零容忍 |
| 迟到 / 跨任务污染 | 旧结果覆盖新图、新任务或 tombstone 后复活 | 0，零容忍 |
| 敏感日志泄漏 | 自动扫描或人工抽样发现禁止字段 / 内容 | 0，零容忍 |

“已接受任务终态”衡量系统可解释性，不等于图片质量成功率；U1 / E1 的质量分母仍由 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md) 定义。网络断开、用户关闭页面等删失规则必须预注册，不能看结果后排除。统计至少同时报告计数、比例、时间窗、p50/p95/p99、最大值和分层；平均值不能替代尾延迟。

错误预算为 `1 - SLO`，按冻结测试窗口和目标 run 数计算。零容忍不变量没有可消费错误预算，任何一次触发都停止相关研究 / 邀请入口并进入事故流程。尚无真实稳定流量时使用预注册的重复运行和故障注入，不伪造“月可用性”。

## 9. 性能、容量与背压

性能报告至少按以下维度分层：

- Windows / Chromium 精确版本、CPU / RAM / GPU、视口和电源模式；
- 输入格式、文件字节、总像素、Alpha、颜色空间和解码难度；
- 冷启动 / 热启动、缓存命中、首轮 / retry、执行器和模型 snapshot；
- 本地、Wi-Fi / 有线以及冻结延迟和带宽档；
- 单用户、声明邀请并发和短时 burst；
- 成功、正确拒绝、失败、取消和 `UNKNOWN`。

容量计划不得只写“支持并发”。每份 `O1Profile` 必须记录：

```text
arrival_rate + burst_duration
queue_capacity + maximum_queue_age
worker_count + concurrency_per_worker
mean_and_p95_service_time
cpu_ram_vram_disk_network_headroom
provider_quota + rate_limit
admission_limit + per_session_limit + cost_limit
backpressure_behavior + overload_user_message
drain_and_recovery_time
```

采用有界队列和显式 admission control；容量不足时在产生费用前明确拒绝或给出可验证等待状态。禁止无限排队、浏览器无上限轮询、worker 内隐式无限重试和超过页面绑定期限后仍生成可下载结果。容量估计需要用到达率、服务时间与实测并发校验，并保留至少一个 worker / 供应商配额不足的安全余量；估算值不能替代负载测试。

浏览器预算与后端预算分别归因。前端至少监测大图解码峰值内存、长任务、预览位图释放、轮询次数与网络字节；后端分别测规范化、推理 / 供应商、QA、导出与存储。移动端性能不得混入桌面 O1 分母。

## 10. 成本合同

成本同时记录 `estimated`、`reported_by_provider`、`billed` 和 `unknown`，并绑定币种、价格表 / 条款版本、计量单位、区域和核对时间。至少聚合：

```text
cost_per_provider_call
cost_per_pipeline_attempt
cost_per_user_execution
cost_per_qa_passed_usable_result
automatic_retry_waste
canceled_but_billed
unknown_possible_charge
self_hosted_compute_and_storage_estimate
```

浏览器点击一次不等于供应商调用一次。每个 `provider_call_id` 单独记账，再聚合到 attempt 和 user execution。超时或取消但供应商状态未知时 `possible_charge=true`，在 reconciliation 完成前不能记为零。成本 guardrail 包括每次用户执行、每会话、每日研究预算、并发和自动 retry 上限；触发后停止新调用并保留已有状态，不得为了“成功”绕过上限。

## 11. 告警、事故等级与 Runbook

首轮没有 24×7 可用性承诺，告警发给明确的研究 / 工程责任人；无人响应时自动停止真实调用，而不是假装在线。

| 等级 | 触发示例 | 默认动作 |
| --- | --- | --- |
| `SEV-0` | 跨用户 / 跨 run 结果、错误下载、公开对象、密钥或图片进入日志、tombstone 后复活 | 立即 kill switch、撤销下载 / 外发、保护脱敏证据、启动安全事故流程 |
| `SEV-1` | 大量 `UNKNOWN`、删除超期、重复计费、供应商状态无法 reconcile、零容忍 QA 门禁失效 | 暂停受影响效果 / 执行器，限制新任务并由责任人处置 |
| `SEV-2` | 错误预算快速消耗、队列年龄 / 429 / 5xx / 成本异常、关键 trace 缺失 | 降低 admission、切换已验证 fallback 或停止实验，按 runbook 调查 |
| `SEV-3` | 单次可恢复错误、性能趋势或非关键仪表缺口 | 记录工单并在下一研究窗口处理 |

最低告警规则覆盖：错误绑定 / 下载、敏感日志、删除失败、`UNKNOWN` 年龄、队列年龄、worker 不可用、供应商 429/5xx/超时、QA error / fail 激增、遥测中断、成本上限和未登记 region。告警必须包含 `runbook_id`、影响 scope、版本、开始时间和脱敏示例支持码；不得把图片、Prompt 或供应商响应正文发送到通知渠道。

首批 runbook：

| ID | 场景 | 必须回答 |
| --- | --- | --- |
| `RB-01` | 供应商超时、限流或故障 | 是否停止新调用、查询既有请求、是否可能计费、何时恢复 |
| `RB-02` | 任务卡在 `UNKNOWN` | 查询窗口、禁止盲重试、reconcile、迟到结果和清理 |
| `RB-03` | 错误绑定或越权下载 | kill switch、撤销、影响范围、访问审计与通知 |
| `RB-04` | 队列 / worker 过载 | admission、drain、容量恢复、用户状态和数据完整性 |
| `RB-05` | 成本异常 | 停用哪一 snapshot / effect、账单核对、重复调用与预算恢复 |
| `RB-06` | 日志或 trace 泄漏 | 停采、限制访问、删除 / 轮换、范围核对与复盘 |
| `RB-07` | 删除或 TTL 清理失败 | 撤销访问、逐 processor 清理、PARTIAL 说明和再次验证 |
| `RB-08` | 产物损坏或 QA / 导出门禁异常 | 锁下载、定位 stage、重开校验、回滚版本与逃逸回归 |

每份 runbook 记录 owner、替补、适用版本、检测信号、停用 / 回滚权限、分步操作、用户沟通、验证恢复、证据保留、复盘和演练日期。没有责任人、kill switch 或恢复验证的文档不算可运行 runbook。

## 12. 脱敏与访问控制

- 定义统一 `safe_attributes` schema；新增字段必须经隐私 / 安全审核，默认拒绝采集。
- 普通日志和指标只保存低关联元数据。资产表、供应商 request 映射、支持码索引和安全审计分别存放、分别授权、分别到期。
- Prompt 只记录模板版本、参数 schema 版本和受控枚举；自由文本如确需定位，使用明确同意的短期受限存储，不进入普通日志。
- 浏览器错误报告去掉页面内容、文件路径、插件清单和完整 URL；上传失败不附带文件。
- 日志查看、支持码查询和人工复核都写独立访问审计，包括操作者、工单理由、scope 和时间。
- 定期对日志 / trace / 告警样本做禁止字段扫描；发现泄漏不是“删一行日志”结束，必须按 `RB-06` 处理历史副本、索引、导出和密钥。

## 13. 故障注入矩阵

O1 与 R1-pipeline 至少覆盖下列可重复故障，记录注入点、期望事件 / 状态、恢复时限、产物与费用。不能在真实第三方服务上做未经允许的破坏性测试。

| 层 | 故障 | 必须验证的不变量 |
| --- | --- | --- |
| 浏览器 | 选图后刷新、双击执行、换图、断网 / 恢复、结果返回前切换效果 | 幂等提交；旧响应不覆盖；状态可恢复或明确失效；无错误下载 |
| 上传 / API | 截断上传、重复 request、客户端超时但服务端已接受 | 同一幂等键不产生两个有效执行；查询而非盲重交 |
| 队列 | 消息重复、乱序、延迟、队列满、消费者重启 | 去重、合法状态转换、有界背压、任务不丢失或明确失败 |
| worker | stage 超时、进程退出、OOM、磁盘满、部分产物写入 | 临时产物不放行；新 attempt 可追溯；资源被回收 |
| 供应商 | 429、5xx、超时、无效响应、安全拒绝、查询 / 取消不可用 | 有界重试、`possible_charge`、`UNKNOWN` reconcile、不会绕过拒绝 |
| QA / 导出 | checker 崩溃、QA fail、输出无法重开、hash 不符 | 下载保持 `LOCKED`；失败不伪装成功；保留故障证据 |
| 存储 / 下载 | 写入失败、签名 URL 过期、错误 session 请求 | 不产生半成品；越权为零；撤销立即生效 |
| 删除 | 清理 worker 失败、供应商迟到结果、tombstone 竞态 | 结果不复活；PARTIAL 不冒充 CONFIRMED；按 SLO 重试 / 升级 |
| 遥测 | 日志 / trace / metrics 接收端不可用、事件重复 / 乱序 | 业务有界降级；正式证据标记不完整；不无限缓存敏感数据 |
| 时钟 / 配置 | 时钟偏移、版本漂移、错误 region、旧规则热加载 | 拒绝未登记版本 / region；时间线使用发生与观察双时间 |

每个注入场景至少运行冻结重复次数；任何零容忍不变量失败立即停止同版本后续用户研究，进入根因分析，修复后以新 build 和新的 run IDs 完整重验。

## 14. 问题定位与恢复闭环

收到支持码或告警后，标准流程为：

```text
验证查询权限与 scope
→ 支持码解析 user_execution_id
→ 重建 RunEvent 时间线与五类状态
→ 定位失败 stage、版本和受影响 attempt/provider call
→ 核对 QA、交付、删除、可能费用和迟到结果
→ 匹配 runbook，必要时停用 effect / executor / provider
→ 修复或明确拒绝，验证没有错误资产可下载
→ 写 IncidentReport 与 escape 回归（若适用）
```

根因分类至少区分：输入、浏览器、网络、第一方 API、队列、执行器 / 模型、供应商、QA、导出 / 存储、数据治理、配置 / 发布和遥测。`provider error` 不是完整根因；必须记录第一方为何未能预防、隔离、恢复或向用户解释。

## 15. 取得 O1 前的退出条件

桌面范围取得 O1 前，至少需要：

1. 持久任务、追加式事件与不可变终态 manifest 已实现并通过重启 / 重放；
2. 结构化日志、关键 trace、低基数 metrics、脱敏扫描、告警和支持码查询真实可用；
3. 冻结桌面 `O1Profile`、浏览器 / 硬件 / 网络 / 输入 / 并发分层和错误预算；
4. 性能、容量、成本和故障注入原始 run 均能由 manifest 复现；
5. `RB-01`～`RB-08` 有 owner、kill switch、演练和恢复验证；
6. 所有零容忍不变量为 0，非零 SLO 在预注册窗口达标；
7. 数据与日志边界同时满足 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md)，不得以 O1 替代 G1。

在这些条件满足前，只能说“正在设计 / 实现可观测性与运维底座”。R0 能启动、一次调用成功或本地控制台没有报错，都不能写成 O1 或可发布证据。
