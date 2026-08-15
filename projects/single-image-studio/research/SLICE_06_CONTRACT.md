# Slice 06 开放诊断表征范围合同

> 当前状态：`scope-frozen / implementation-not-started / definition-not-frozen / diagnostic-characterization-not-run / Gate-B-no-authority / calibration-forbidden / non-C1 / non-product`。本范围自**包含本文件的 Git commit** 起生效；本文不写入尚未发生的 machine definition freeze 时间，也不表示 candidate、contract、schema、manifest、preregistration、fixture wrapper、runtime attestation、runner 或 result 已经创建。实时状态仍以 [../STATUS.md](../STATUS.md) 为准。

## 目标与两阶段边界

Slice 06 只授权为 Slice 05 暴露出的两个 P2 建立一个新的、可离线复核的**开放 diagnostic characterization**：

1. 找出 normalize / export applicable output 被 independent oracle 拒绝的精确、稳定子因，并保留足以重算该结论的 output bytes、worker observation 与 oracle record；
2. 把 normalize missing-sRGB 的稳定拒绝优先级冻结为新的 `S06_INPUT_SRGB_REQUIRED`；
3. 只以项目原创、已经公开的 synthetic regression lineage 检查三类 Alpha 形态及两个 preflight sentinel；
4. 用结果决定下一切片应选择或修正哪个 candidate boundary。

本切片**没有 Gate B 决策权**。characterization 完整、某次 output 通过 oracle、24 次全部符合合同或自动测试全部通过，都不能生成 Gate B pass、不能授权 calibration，也不能称为 PNG 支持、真实归一化、正式导出或产品能力。若结果足以选择候选，下一切片仍须重新冻结 candidate、contract、Gate-B plan、preregistration、denominator、runtime 与 stop rules，之后才可运行新的 Gate-B smoke。

## 不可改写的 Slice 05 关闭事实

Slice 05 `REG-NORM-SHARP@0.5.0`、两份 `CapabilityContract@0.5.0`、definition tree 与唯一注册 smoke 均为不可变历史记录。它们保持：

```text
smoke-closed-non-pass
normalize Gate B=denied-not-entered
export Gate B=denied-not-entered
calibrationAuthorized=false
artifact count=0
productSupport=false
```

禁止重发任何 `@0.5.0` request、追加 / 替换 / 删除其 result、选择性重跑、运行其已冻结 calibration，或以新诊断解释回写旧 terminal record。Slice 05 generic `S05_OUTPUT_ORACLE_REJECTED` 的历史子因继续是 `unknown`；Slice 06 只能产生属于新版本的新观察。

## 计划版本与身份

实现阶段必须创建新的、互相绑定的版本，不能复制旧 ID 后只换 hash：

| 角色 | 计划 ID | 当前 Phase A 状态 |
| --- | --- | --- |
| diagnostic-only composite candidate | `REG-NORM-SHARP@0.6.0` | `not-created` |
| normalize contract | `CC-CAP02-NORMALIZE-PNG@0.6.0` | `not-created` |
| export contract | `CC-CAP02-EXPORT-PNG@0.6.0` | `not-created` |
| normalize diagnostic preregistration | `PREREG-DIAGNOSTIC-NORMALIZE-PNG@0.6.0` | `not-created` |
| export diagnostic preregistration | `PREREG-DIAGNOSTIC-EXPORT-PNG@0.6.0` | `not-created` |

`REG-NORM-SHARP@0.6.0` 必须明确写 `selectionStatus=diagnostic-only-not-selected`、lineage 指向 Slice 05 closed-non-pass `@0.5.0`，source metadata lineage 继续指向 Slice 04 `REG-NORM-SHARP@0.4.0`。Sharp / bundled libvips 仍是一个复合候选；不得把 bundled libvips 另算比较臂。

两份 `@0.6.0` contract 不得放宽 Slice 05 的 canonical PNG、sRGB、RGBA8、straight Alpha、metadata、父产物或 byte / decoded-pixel identity 要求来迁就失败输出。diagnostic persistence、错误优先级或 adapter / worker binding 发生变化已经足以要求新版本；这不表示 `@0.6.0` 已成为待进入 Gate B 的最终候选。

## 最小冻结分母：8 个 source unit / 24 次

Slice 06 计划且只计划以下 8 个 operation-specific source unit，每个恰好 3 次 repetition，共 24 次 terminal attempt。它们使用新的 Slice 06 source / family / session / request ID，但只引用下列 Slice 05 项目原创 bytes 与 gold facts 作为 `regressionLineageRef`；不得声明为新独立来源，也不得计入 calibration、holdout 或 C1。

| Operation | Slice 05 byte lineage | 诊断角色 | Repetitions |
| --- | --- | --- | ---: |
| normalize | `raw.s05.normalize.smoke.001` | canonical opaque applicable | 3 |
| normalize | `raw.s05.normalize.smoke.002` | canonical partial-alpha applicable | 3 |
| normalize | `raw.s05.normalize.smoke.003` | canonical alpha-holes applicable | 3 |
| normalize | `raw.s05.normalize.smoke.005` | missing-sRGB preflight regression；期望 `S06_INPUT_SRGB_REQUIRED` 且 worker 不得被调用 | 3 |
| export | `normalized.s05.export.smoke.001` | independent opaque `NormalizedImage` applicable | 3 |
| export | `normalized.s05.export.smoke.002` | independent partial-alpha `NormalizedImage` applicable | 3 |
| export | `normalized.s05.export.smoke.003` | independent alpha-holes `NormalizedImage` applicable | 3 |
| export | `normalized.s05.export.smoke.004` | invalid schema-version preflight sentinel；期望 `S06_EXPORT_NORMALIZED_ARTIFACT_INVALID` 且 worker 不得被调用 | 3 |

normalize 与 export 必须有两份独立 manifest、preregistration、run identity、ledger、summary 与 close record。export 的三个 applicable input 继续来自 independent fixture generator lineage，不能由 candidate normalize output 生成。其他 Slice 05 rejection、开放 calibration、fault injection、holdout、defect-holdout 与 escape 不进入本分母；已通过的旧 rejection 只作历史 lineage，新的协议性质测试只能使用 fake / temporary mutation，不得增加真实 candidate attempt。

三次 repetition 用于识别 output bytes、oracle 子因和 worker observation 是否确定一致，不得 majority vote。每个 source 的 3 / 3 都必须形成 terminal record；planned replacement 为 0，valid result、non-pass、timeout、cancelled、unknown、missing 或 protocol failure 一律不得重跑或替换。

## 诊断记录与 specimen 边界

characterization runner 必须把 candidate 调用与 independent oracle 分离，并为每次 attempt 原子、append-only 地保留：

- request / claim、attempt identity、candidate / contract / implementation refs、runtime / hardware observation；
- worker IPC 是否返回、严格 response validation 结果、资源 / deadline observation 与精确 `workerExitConfirmed` 状态；
- output byte length、file SHA-256、受控相对路径，以及独立 decoder 可取得的 actual facts；
- independent oracle 的完整 structured result、exact child issue codes、输入 / 输出 identity 与实现 hash；
- terminal status、top-level stable code、diagnostic child refs、开始 / 完成时间和 durable ledger chain；
- cleanup / retention disposition 与 full result-tree inventory。

所有 worker output，无论 oracle pass 或 non-pass，都只能保存为 `formal=false / productSupport=false / excludedFromGateB=true` 的 diagnostic specimen；non-pass bytes 进入明确的 quarantine 语义。不得写入 `artifacts/`、产品下载目录、研究 catalog 或正式证据路径，也不得生成 `NormalizedImage` / `DeliveryArtifact` 能力通过声明。普通日志禁止记录图片 bytes、payload、hostname、serial、用户名或绝对个人路径。

顶层可以保留 `S06_OUTPUT_ORACLE_REJECTED`，但 terminal closure 必须同时 pin 可离线重算的 oracle record 和 exact child issue codes；只留 generic code、异常 message 或临时 staging 文件即不合格。不得使用 passthrough、fallback、candidate decoder 自证、oracle / reference encoder 修补、byte patcher 或见结果后放宽合同。

## Lineage 与必须重建的边界

可以只读引用、不能改写或冒充新证据的项目包括：

- Slice 04 `REG-NORM-SHARP@0.4.0` source / license pins；
- Slice 05 definition index、candidate / contracts、closed result tree、summary、decision、ledger 与证据文档；
- 上表 8 个项目原创 public-synthetic bytes、rights 与 independent gold facts；
- 若语义和 bytes 完全不变，Slice 04 `NormalizedImage.slice04.v0`、`DeliveryArtifact.slice04.v0` artifact schema；
- 若源码与 hash 完全不变，independent oracle 的纯 decoder / evaluator core。

实现阶段必须新建：Slice 05 closure-lineage record、candidate lock、两份 contract、diagnostic plan / preregistration / manifest、runtime attestation、hardware observation、adapter / worker / diagnostic runner binding、diagnostic persistence wrapper、S06 error registry、严格 request / event / terminal / worker-observation / oracle-result / specimen / summary / close schemas、definition index、generator / validator 与 result allowlist。

Sharp `0.35.3`、package lock 或 native bytes 可以作为预期 lineage，但 actual installed closure 与 hardware 是时点事实；machine definition freeze 前必须重新 inventory / attest。旧 runtime / hardware record 不能直接冒充 Slice 06 实际环境。

## 状态机与 Gate 状态

normalize / export 各自遵守同一状态机：

```text
scope-frozen / implementation-not-started
→ implementation + fake protocol tests ready
→ definition-frozen / results-0
→ one registered diagnostic characterization run
   ├─ characterization-complete
   ├─ protocol-failed
   └─ inconclusive
→ Slice 06 closed
```

三个终态都固定保持：

```text
gateBDecisionAuthority=false
Gate B=not-entered-diagnostic-only
calibrationAuthorized=false
calibration=not-created-by-scope
productSupport=false
C1/U1/E1/R1-pipeline/R1-product-validation/R1-product-release/O1/G1/V1=0
Release Gate=allowlist none; registered 0; approved 0
```

`characterization-complete` 只表示 24 次预注册诊断闭包完整，允许下一切片基于事实讨论 candidate selection；它不是 candidate conformance pass。若 output、oracle child issues、worker observation、exit state、runtime integrity、ledger 或 tree closure 有任一 unknown / missing / unreferenced / unverifiable，必须关闭为 `protocol-failed` 或 `inconclusive`。

## 强制执行顺序与停止规则

1. 先提交并推送本范围合同；Phase A 不授权任何 Sharp 图片调用。
2. 实现代码、strict schemas 与只用 fake / temporary mutation 的协议测试单独提交；不得生成 canonical results。
3. fresh inventory 后以真实 UTC 冻结 machine definition；定义树必须 `results=0`，完整提交并推送后才可运行。
4. 每个 operation / version 只允许一次 registered characterization run；不得复用 Slice 05 request / idempotency key / result path。
5. 运行结果单独 append-only 提交，之后才同步事实文档。

以下任一情况立即停止，当前 `@0.6.0` 不得重跑：

- package、native、runtime、hardware、source byte、gold、implementation、schema、manifest、preregistration 或 definition hash 漂移；
- 见到 output 后修改 candidate、contract、oracle、denominator、expected code、retention、stop rule 或 error precedence；
- unregistered request / result、selective retry、replacement、missing terminal record、ledger 断链或 staging / specimen 无法闭合；
- diagnostic bytes / exact oracle child issues / worker observation 未持久化，或 `workerExitConfirmed` 保持 unknown；
- specimen 被写入 artifact、catalog、产品、calibration 或 formal evidence 路径；
- 触及真实 / 用户照片、第三方样片、模型 / checkpoint、许可未解资产、正式 holdout / defect-holdout / escape 或产品 UI / server。

需要任何修复时封存已有结果，并创建下一新版本或下一范围；不得追加运行到结果看起来更好。

## 允许与禁止的改动

实现阶段仅允许 Slice 06 独立的 schemas、records、lineage wrappers、diagnostic adapter / worker / oracle wrapper / runner / generator / validator、fake tests、两份 manifest / preregistration，以及运行后严格 allowlist 内的 open diagnostic records / specimens。`node_modules/`、临时构建和 cache 不提交。

本切片禁止：

- 创建或运行 Gate-B plan、calibration plan / preregistration / admission / summary；
- 创建、读取或命名新的正式 holdout、defect-holdout、escape、bundle、request、receipt、formal result 或 EvidenceManifest；
- 扩 PNG 之外格式、SourceCard 内容理解、Matting、自然增强、创意能力或任何产品任务；
- 修改 `/`、`/research/` UI、`server/`、下载路径、任务 catalog 或正式运行链；
- 使用真实人物 / 用户图片、第三方图像、模型权重或新增未解析依赖；
- 将 diagnostic pass、稳定拒绝、文件存在或自动测试数量表述为能力 / 产品证据。

## Phase A 退出条件

本 scope-only 提交完成时只能声称：

- 本文件与 [slice-06/README.md](slice-06/README.md) 已建立两阶段边界；
- 状态 / README / plan / map / registry / upstream 已同步为 `implementation-not-started`；
- 计划分母为 8 source units / 24 attempts，Gate B authority 与 calibration 均为 false；
- 没有 Slice 06 machine record、schema、script、test、fixture、runtime observation 或 result；
- Slice 05 `@0.5.0` 与所有历史文件未改，全部证据轴仍为 0。

链接检查和 `git diff --check` 只证明文档结构一致，不表示后续 definition 或 characterization 已实现。
