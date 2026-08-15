# Slice 11 开放 calibration 协议修复范围合同

> 当前状态：`scope-frozen / implementation-not-started / definition-not-created / calibration-not-run / formal-holdout-not-created / non-C1 / non-product`。本范围自包含本文件的 Git commit 起生效；本文不回填未来 machine freeze 时间，也不表示 candidate、contract、schema、request、result 或 calibration decision 已创建。实时状态以 [../STATUS.md](../STATUS.md) 为准。

## 目标

Slice 10 的 results-zero definition 已先提交推送，其唯一 registered invocation 随后在首个 normalize applicable attempt 关闭为 `protocol-failed`。失败不是候选图像质量结论，而是两个本地协议缺陷：完整 gold expected object 被直接传给只接受 12 个 canonical output keys 的 Slice 07 adapter；随后错误映射又把该 pre-worker failure 误记为 `workerInvoked=true`。

Slice 11 只修复这两个边界，并以新版本重新建立开放 calibration。它冻结显式、可哈希的 gold-to-adapter expected 投影，以及从 preflight 到 child exit 的真实 worker lifecycle。它不改变 Sharp、canonical PNG encoder、像素 profile、独立 oracle、来源总体、判定阈值或产品能力。

## 不可改写 lineage

- Slice 10 definition commit `86543a47bb5eea6a287861bf587fbffc3014ba1f`、result commit `13c40fce4404929104cbfd39048b47e1fd203e71`、4-file result tree `225847d125c58ee6affaa087746101d469d7ae04109504f0bd6781f593b9ee9e` 与 [result evidence](SLICE_10_EVIDENCE.md) 全部只读。
- 不得重跑 Slice 10、补跑其 287 个未执行 slots、改写 terminal、删除 lifecycle 矛盾或把旧记录拼入 Slice 11 分母。
- Slice 09 dual-pass Gate-B lineage 与 Slice 05 项目原创 public-synthetic material 仍只作精确来源；Slice 11 必须使用新 source / family / session / manifest / request / idempotency / result identities 和 `S11_*` error namespace。

## 新版本身份

| 角色 | 计划 ID | 当前状态 |
| --- | --- | --- |
| composite candidate | `REG-NORM-SHARP-CANONICAL-PNG@0.11.0` | `not-created` |
| normalize contract | `CC-CAP02-NORMALIZE-PNG@0.11.0` | `not-created` |
| export contract | `CC-CAP02-EXPORT-PNG@0.11.0` | `not-created` |
| normalize plan / prereg | `PP-OPEN-CALIBRATION-NORMALIZE-PNG@0.11.0` / `PREREG-OPEN-CALIBRATION-NORMALIZE-PNG@0.11.0` | `not-created` |
| export plan / prereg | `PP-OPEN-CALIBRATION-EXPORT-PNG@0.11.0` / `PREREG-OPEN-CALIBRATION-EXPORT-PNG@0.11.0` | `not-created` |

版本提升只表示 expected projection 与 lifecycle protocol 改变。候选像素实现、Sharp 版本、encoder、oracle、输出 profile 或合同语义如有漂移，必须停止并另发版本。

## Expected projection 合同

每个 applicable source 必须同时冻结：

- 完整 `goldExpected` canonical JSON 与 SHA-256，保留 file / MIME / parent identity 等 provenance；
- 仅含 `decodedPixelSha256,width,height,pixelLayout,colorSpace,orientation,alphaMode,alphaPresent,metadataPolicy,pngFilterPolicy,interlace,animation` 的 `adapterExpected`；
- 固定投影 key 列表、投影实现 hash、输入 / 输出 content hash，以及逐字段 `adapterExpected[key] === goldExpected[key]`；
- adapter 与 independent oracle 只接收 exact `adapterExpected`，artifact / publication records 仍分别绑定完整 gold identity。

缺字段、额外字段、类型错误、投影实现漂移、输入 / 输出 hash 不闭合或两侧同名字段不等，必须在 worker 前以 `S11_EXPECTED_PROJECTION_INVALID` 停止。不得由 adapter 静默丢字段，不得让 oracle 修补 candidate bytes。

## Worker lifecycle 真实性

每次 attempt 必须持久区分：`preflight-not-started`、`spawn-attempted`、`ipc-message-received`、`exit-confirmed`。terminal 的 `workerInvoked` 与 `workerExitConfirmed` 必须从事件事实派生，而非按异常类型猜测：

- preflight / expected projection / request validation 失败固定 `workerInvoked=false`、`workerExitConfirmed=null`；
- 只有实际调用 child-process spawn 后才可记 `workerInvoked=true`；
- 成功必须同时具备 exact IPC message 与 `exit code=0 / signal=null`；
- timeout、cancel、startup failure、message 后非零退出、无退出或 reconciliation unknown 必须保留精确 observation，且不得被 generic error 覆盖；
- terminal、ledger、summary 与 publication 必须交叉绑定同一 observation；自重哈希不能洗白阶段矛盾。

## 开放分母与停止规则

Slice 11 重新冻结与 Slice 10 同规模、但身份全新的公开合成分母：normalize / export 各 `30 dev/calibration + 18 defect/calibration` sources，每来源 3 次，合计 96 sources / 288 attempts。每项 24 applicable + 24 rejection；3 / 3 全过；零 retry、零 replacement。`independenceClaim=false`，不得把重用公开来源冒充新独立证据。

普通、完整留证的 non-pass 可关闭该 operation 并继续另一 operation；protocol failure、lifecycle 矛盾、missing terminal、timeout、cancel、unknown reconciliation、runtime / implementation / schema / rights drift 会全局停止，未启动 operation 不得注册。每 operation / version 只有一次 registered run；同版本没有修复后重跑。

## Definition 与执行顺序

1. 提交并推送本 scope-only 合同；不得运行 Sharp calibration。
2. 实现 versioned projection、adapter / lifecycle protocol、runner、strict schemas、central validator 与 fake-only adversarial tests。
3. fresh runtime observation 后冻结 results-zero definition；验证 exact lineage、96 / 288 分母、projection、lifecycle、rights、results absent 与 deterministic regeneration。
4. definition commit 推送且 `HEAD == origin/main`、worktree clean 后，才允许唯一 registered invocation。
5. 任意 pass / non-pass / partial / inconclusive 结果均原样独立提交并永久关闭 Slice 11。

## 必测负例

- 直接把完整 gold object 传给 12-field adapter；投影缺键、加键、错值、错序义、错 hash 或实现漂移；
- pre-worker error 伪造 `workerInvoked=true`，或 spawn 后错误伪造 `workerInvoked=false`；
- IPC message、exit、timeout、cancel、resource 与 runtime observation 缺失或跨 attempt 串线；
- terminal / ledger / summary 自重哈希后洗白 lifecycle；
- 复用 Slice 10 request / result identity、缩减 96 / 288、2-of-3、retry、replacement 或补跑旧 slot；
- output / oracle / artifact / publication 串线、额外 staging / orphan / result root；
- calibration 偷升 formal holdout、C1、O1、productSupport、UI / server / download / catalog 或 Release Gate。

## 永久边界

Slice 11 不创建或查看 formal holdout / defect-holdout / escape，不创建 seal bundle / request / receipt / EvidenceManifest，不使用真实用户照片、第三方图片、模型权重或许可未解资产，不扩 JPEG / WebP / HEIC，不进入 Matting / SourceCard，不修改产品 UI / server / download / catalog。

全程固定：`productSupport=false`；C1 / U1 / E1 / R1-pipeline / R1-product-validation / R1-product-release / O1 / G1 / V1 全部为 0；Release Gate 为 allowlist `none`、registered `0`、approved `0`。
