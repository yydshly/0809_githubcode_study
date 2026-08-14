# 部署、发布与恢复合同

> 本文件定义首轮 Windows 桌面 Web 产品的部署快照、兼容迁移、灰度、停用、回滚、备份恢复和供应商降级门槛。它是未来实现合同，不表示当前 R0 已有持久队列、数据库、对象存储、灰度系统、备份或生产环境；相关 R1-product-release、O1 与 G1 证据均为 0。

## 1. 范围与原则

- 首轮用户可见发布只面向 [QUALITY_AND_COMPATIBILITY.md](QUALITY_AND_COMPATIBILITY.md) 冻结的 Windows 桌面 Chrome / Edge profile；移动端和其他浏览器后置。
- 发布单位不是一个 git commit，而是可复现的应用、配置、schema、数据策略、供应商和前端 build 组合。
- 数据平面与控制平面分离：关停图片处理不能关停删除、tombstone、状态查询、支持和清理。
- rollback 不等于删除新版本记录。运行、证据、事故和迁移结果只追加；旧版恢复后仍可解释新版本留下的任务。
- 任何 fallback 都必须在相同用户承诺下有独立合同和证据；没有证据时宁可暂时不可用，也不静默更换模型、降低 QA 或返回伪成功。

## 2. 环境与不可变制品

至少区分本地 / CI、研究、预发布和邀请生产环境。环境之间不得共享真实用户对象、密钥、队列或数据库；研究夹具和真实用户临时数据使用不同存储域。

可发布制品必须内容寻址或等价不可变，包括：

- 前端静态资源、服务端、worker、QA 和清理任务镜像 / 包；
- 数据库、队列消息、对象 metadata 和 API schema；
- CapabilityContract、EffectDefinition、QA profile、CompatibilityProfile 与 DataPolicy；
- 功能开关、路由、限额、超时、重试、成本上限、供应商 snapshot 与地区；
- migration、rollback、reconciliation 和恢复脚本；
- 参考目录 allowlist 和用户可见文案 / 同意版本。

构建产物必须有 provenance、依赖锁、hash、签名或等价完整性验证。部署时只解析已批准 manifest，不从浮动分支、`latest` 镜像或未锁定远程模型动态取版本。

## 3. `ReleaseManifest`

每次研究部署、验证 build 或邀请发布分别生成不可变 manifest：

```text
release_id + release_version + release_scope + created_at
source_commit + dirty_state + build_id + artifact_hashes + provenance
frontend_build + server_version + worker_versions + qa_version
capability_contracts + effect_definitions + executor_snapshots
api_schema_version + database_schema_version + queue_schema_versions
object_metadata_schema_version + run_manifest_schema_version
migrations + migration_order + rollback_plan + compatibility_window
compatibility_profile_id + test_evidence_manifest_id + o1_profile_id
data_policy_id + processor_snapshot + regions + secret_versions
provider_routes + fallback_routes + rate_limits + retry_and_timeout_policy
feature_flags + rollout_plan + stop_conditions + kill_switch_owners
backup_policy_id + restore_drill_id + tombstone_policy_version
observability_schema + alert_rules + dashboards + runbooks
release_gate_allowlist_version + known_defects + accepted_risks
approvers + approved_at + deployed_at + deployment_record
post_deploy_checks + decision + invalidation_triggers
```

- `dirty_state` 必须为 false 才能发布；任一精确版本、迁移、回滚、兼容或数据字段为 `unknown` 时不能批准邀请生产。
- manifest 中的 secret 只记录秘密版本 / 引用，不记录秘密值。
- 紧急 hotfix 也生成新 manifest、制品和审计记录；紧急不允许跳过跨用户绑定、删除、下载或数据外发硬门。

## 4. 运行态 schema 迁移

schema 不只指数据库，还包括 API payload、队列消息、任务状态、对象 metadata、RunManifest、QAReport、tombstone、审计事件和浏览器持久状态。每次变化先分类为 backward-compatible、forward-compatible 或 breaking，并写入迁移计划。

默认采用 expand → migrate / backfill → verify → switch reads / writes → contract：

1. **expand**：先增加新字段 / 表 / 消息版本，不删除 N-1 仍读取的结构；
2. **dual compatibility**：N 写入 N 能用且 N-1 可安全忽略或读取的数据；N / N-1 混跑期间禁止产生任一侧会误解释的状态；
3. **migrate**：可重放、幂等、限速地迁移；记录游标、计数、失败和校验 hash；
4. **verify**：对数量、引用、用户 / run / asset 绑定、TTL 和 tombstone 做不变量检查；
5. **switch**：达到预注册门槛后切换读写路径；
6. **contract**：兼容窗口和回滚窗口结束、备份验证且无旧 reader 后才删除旧结构。

禁止不可逆的单步“部署即删列”、用浏览器端修复服务端数据、把未知旧状态默认为成功，或在回滚窗口内清除旧版所需字段。迁移失败必须停止 rollout；修复前不得继续扩大流量。

## 5. N / N-1 兼容窗口

滚动部署、旧标签页、在途任务和 worker drain 会导致版本共存。每个 ReleaseManifest 必须明确 N / N-1 窗口和下列行为：

- N 网关可安全读取 N-1 创建的任务、资产、消息和 tombstone；N-1 不会误读 N 写入的数据；
- worker 按消息 schema 路由，或在升级前排空不兼容队列；不允许错误 worker 猜测 payload；
- 浏览器静态资源使用 build ID 和不可变 URL；API 响应携带可判定 schema / build 版本；旧标签页若超出窗口，进入安全升级状态而不是继续提交；
- idempotency key、用户执行、pipeline attempt、provider call 和计费关系跨 N / N-1 保持一致；
- 删除和 tombstone 语义跨版本向前兼容，任何版本都不能复活已经删除或解绑的资产；
- N / N-1 acceptance matrix 覆盖部署中提交、刷新、重试、取消、迟到响应、下载和删除。

只承诺 N 与紧邻 N-1；更旧客户端 / 消息必须被明确拒绝、迁移或隔离。兼容窗口不能用来无限期保留过期用户数据。

## 6. 灰度与停止条件

rollout 阶段、流量上限、观察窗口、样本分母、继续 / 停止阈值在部署前冻结。建议顺序是：

```text
预发布合成夹具
→ 内部自有 / 已授权研究夹具
→ 受控研究参与者
→ 小范围邀请用户
→ 逐级扩大到已批准范围
```

每一级都运行 build / schema 探针、真实管线 smoke、错误 / 延迟 / 成本 / QA / 删除指标和人工结果抽查。以下事件触发停止或回退，不得等待总体平均值恢复：

- 跨用户、跨 run 或旧来源结果绑定；错误下载；删除后复活；未授权外发；
- schema / migration 不变量失败、不可解释 UNKNOWN 增长或重复计费；
- 灾难性图片缺陷、QA 漏放越过冻结上限或输出格式 / Alpha 合同破坏；
- 数据泄漏、签名 URL 泄漏、供应商条款 / 地域 / 留存漂移；
- p95、失败率、队列年龄、资源或每个可用结果成本越过冻结 stop condition。

灰度成功只允许继续扩大声明范围，不自动授予 C1/U1/E1/R1/O1/G1/V1。

## 7. Kill switch

kill switch 至少按全局、效果、执行器 / 供应商、推荐、上传入口和下载授权分层，并记录 owner、审批 / break-glass 规则、传播时限、当前状态和演练证据。

- 关停执行后，新任务明确失败或暂不可用，不进入无限排队；在途任务按冻结策略取消、查询后丢弃或完成 QA。
- 关停推荐不能自动暴露未发布效果；必要时整个效果目录降级为不可用，而不是凭空推荐。
- 关停供应商后，只有已有 C1/U1/E1、R1、O1 与 G1 覆盖的备用路由才能接管。
- 无论何种开关状态，删除、tombstone、访问撤销、到期清理、状态查询和事故取证保持可用。
- 开关变更生成审计事件并绑定 release / incident；恢复前完成最小 smoke，不允许手工改配置后无记录放量。

## 8. 回滚

回滚目标是在冻结恢复时限内恢复安全服务，并保持数据、权利和证据不变量。每次发布前至少验证：

1. 旧制品、配置、合同、供应商路由和 secret 引用仍可取得且 hash 匹配；
2. N-1 能读取或明确隔离 N 创建的任务、消息、对象 metadata 和 tombstone；
3. 数据库 / 队列 migration 有向前修复或已验证逆向方案；无法安全逆转时使用兼容旧代码的 expand 状态，不强行降 schema；
4. 在途任务、provider UNKNOWN、幂等、可能计费和迟到结果有明确 reconciliation；
5. rollback 后重跑来源 / 结果绑定、下载、删除、清理和目标浏览器 smoke；
6. 失败 release 保留为不可变记录，标记影响窗口、run 范围和处置，不覆盖原始证据。

回滚后只有当旧 ReleaseManifest 仍在许可、供应商、数据策略和安全有效期内，才可恢复邀请流量；否则保持关停并向前修复。

## 9. 备份、恢复与 tombstone

备份范围由 DataPolicy 冻结。配置、schema、必要任务 metadata、审计和 tombstone 可以备份；真实用户图片、Alpha 和结果不得因为“方便恢复”突破逐类 TTL。任何包含用户内容的备份必须记录加密、访问、地区、创建 / 到期和删除能力。

- tombstone 是恢复输入，不是可丢缓存。备份必须包含其版本与删除时间，且保留至少覆盖所有可能恢复 / 迟到结果窗口；具体期限由 DataPolicy 冻结。
- 恢复先进入隔离环境，验证 manifest / hash / schema，加载 tombstone 和删除账本，运行 reconciliation，再允许任何对象读取或 worker 恢复。
- 若备份中的资产在当前时间已过 TTL、已删除、已 `SUPERSEDED` / `DETACHED` 或命中 tombstone，恢复过程只保留允许的最小删除证明，不得恢复可下载内容。
- 恢复演练同时测 RPO、RTO、数据完整性、跨用户隔离、签名 URL 失效、供应商 UNKNOWN 和到期清理；目标与样本在演练前冻结。
- 不能恢复、无法证明 tombstone 完整或删除无法在 SLO 内重新收敛时，不得恢复用户流量。

备份到期和物理清除记录进入删除证明，但不得声称已删除供应商独立持有的副本。

## 10. 供应商降级与故障隔离

每个远程供应商 route 冻结健康信号、错误分类、timeout、有限 retry、circuit breaker、成本上限、数据地域和保留行为。降级顺序是：

1. 对安全的瞬时失败按同一幂等关系有限重试；
2. 查询有 request ID 的 UNKNOWN，不盲目重新计费；
3. 达到 circuit threshold 后暂停该 route，保护队列和成本；
4. 只有备用 route 的完整合同、效果、QA、O1 和 G1 证据覆盖当前任务时才切换；
5. 无合格备用时明确显示暂不可用，允许删除 / 换任务，不返回较差模型结果冒充原效果。

供应商返回成功不等于任务成功；结果仍经过来源绑定、格式与任务 QA。供应商恢复后先以项目自有夹具做 canary，确认模型 / 条款 / 地域 / 留存 snapshot 未漂移，再逐步恢复。未声明的模型更新视为版本变化并触发停用和重新取证。

## 11. 发布、恢复和退出门槛

邀请发布前必须同时具备：

- 精确 build 的已批准 ReleaseManifest，且所有制品和配置可重建；
- 对应 CompatibilityProfile 和 `pass` 的 TestEvidenceManifest；
- schema migration dry-run、N / N-1 acceptance matrix、备份恢复与 tombstone 演练；
- 灰度 stop conditions、kill switch、rollback 和供应商故障演练；
- 与发布版本匹配的 R1-product-release、O1、G1 和完整效果发布公式；
- owner、告警、runbook、事故联系人和发布 / 回退决定记录。

部署后按冻结窗口执行 smoke、指标审查、结果抽查和删除检查。任一硬门失败时停止扩大流量；命中零容忍不变量时立即关停受影响路径。ReleaseManifest、CompatibilityProfile、TestEvidenceManifest 或恢复演练仍为 `pending` 时，当前状态保持未发布。
