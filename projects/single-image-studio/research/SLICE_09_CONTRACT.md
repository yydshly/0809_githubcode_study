# Slice 09 gold-identity Gate-B 范围合同

> 当前状态：`scope-frozen / implementation-not-started / definition-not-created / Gate-B-smoke-not-run / calibration-forbidden / non-C1 / non-product`。本范围自**包含本文件的 Git commit** 起生效；本文不回填尚未发生的 machine freeze 时间，也不表示 candidate、contract、schema、manifest、preregistration、request、result 或 decision 已创建。实时状态以 [../STATUS.md](../STATUS.md) 为准。

## 目标

Slice 08 在定义提交并推送后进入唯一 registered invocation，但在首个 normalize applicable attempt 的 worker 前关闭。原因是 actual-case driver 读取 `material.gold.id`，而冻结的 Slice 05 gold record 使用 `goldRecordId`。这是 gold identity 协议失配，不是候选像素或 encoder 结论。

Slice 09 只版本化并修复这一 identity boundary，然后重新建立完整的 12-source / 36-attempt Gate-B smoke。Sharp RGBA8 stage、项目原创 canonical PNG encoder、closed PNG profile、independent oracle 与冻结错误分类不得借机改变。

## 不可改写的历史

- Slice 05–08 的 definition、request、result、ledger、summary 和 decision 均为只读 lineage，不得重跑、追加、替换或拼接。
- Slice 08 definition commit 为 `a8bcbe57278c7fd2620c16b39f1a939a1e3ccf89`；protocol-failure 封存 commit 为 `184cdcbe464884b550b2c579672f2e26f2fdc4ca`，partial result-tree SHA-256 为 `2dd9e53fcd2163913a47c16f92f9a31733ef3ffc491949e6c1a31464774da0d6`。
- Slice 08 的 `S08_CASE_MATERIAL_INVALID`、1 request、1 started event、0 terminal 和 export 未启动必须保持历史事实；不得在原树上补 terminal。
- Slice 09 使用全新 ID、request、idempotency key、result root 与 `S09_*` namespace。

## 新版本身份

| 角色 | 计划 ID | Phase A 状态 |
| --- | --- | --- |
| composite candidate | `REG-NORM-SHARP-CANONICAL-PNG@0.9.0` | `not-created` |
| normalize contract | `CC-CAP02-NORMALIZE-PNG@0.9.0` | `not-created` |
| export contract | `CC-CAP02-EXPORT-PNG@0.9.0` | `not-created` |
| normalize Gate-B preregistration | `PREREG-GATEB-NORMALIZE-PNG@0.9.0` | `not-created` |
| export Gate-B preregistration | `PREREG-GATEB-EXPORT-PNG@0.9.0` | `not-created` |

candidate 必须把 `@0.8.0` 作为不可变 lineage，并明确版本提升来自 gold identity / evidence protocol 变更，而非新像素能力。

## Gold identity 边界

applicable material 不得让 driver 猜测原始 JSON 字段。generator / resolver 必须先产生 closed、self-hashed `goldIdentity`，至少包含：

```text
schemaVersion
goldRecordId
goldRecordContentHash
goldRecordFileSha256 / byteLength
operation / sourceId / manifest identity
expected output file and decoded-pixel identities
producer / oracle independence refs
```

runner request、`caseContext`、resolved material、driver 和 terminal validator 必须对同一 `goldIdentity` 逐项交叉绑定。driver 只读取该 typed identity，不得直接访问原始 gold record 的 `.id` 或用 fallback 在 `id` / `goldRecordId` 之间猜测。下列情况必须在 worker 前 fail closed：

- `goldRecordId` 缺失、额外、类型错误或与 content / file hash 不符；
- source、manifest、operation、producer、oracle 或 expected pixels 串线；
- 自哈希重算后的 identity laundering；
- applicable material 无 gold，或 rejection material 携带 / 读取 gold。

rejection 继续要求 worker-free exact `S09_*` code；missing-sRGB 必须是专用 code，generic / Node error 不得冒充 pass。

## 冻结分母

Slice 09 使用新的 source / family / session / request identity，但只引用已公开、项目原创 synthetic bytes / independent normalized input / gold facts；`independenceClaim=false`。零 retry、零 replacement：

| Operation | Applicable | Rejection | Attempts |
| --- | --- | --- | ---: |
| normalize | opaque、partial alpha、alpha holes | bad CRC、missing sRGB、unsupported declaration | 18 |
| export | independent opaque、partial alpha、alpha holes | invalid schema、parent identity tamper、color / alpha / metadata invalid | 18 |
| total | 6 | 6 | 36 |

每个 source 恰好 3 次。不得仅补 Slice 08 未运行的 35 个 attempt，也不得把 Slice 07 applicable pass 拼入新 decision。

## Gate-B 与停止规则

normalize / export 分别判定。单项 pass 要求 18 / 18 terminal、9 / 9 applicable independent-oracle pass、9 / 9 rejection exact-code pass、3 / 3 bytes / pixels / classification / runtime / exit 符合冻结规则，并且全部 request / context / gold identity / manifest / source / result 可离线重算。

Slice 09 本身固定 `calibrationAuthorized=false`。任一 protocol failure、missing、timeout、cancel、unknown、non-pass 或 reconciliation uncertainty 都关闭 `@0.9.0`；不得修复后继续同版本分母。

## Fake-only 必测边界

- 直接用真实 Slice 05 gold record shape 走 production runner → resolver → driver，不得使用自造 `.id` 伪对齐 fixture；
- `id` / `goldRecordId` 交换、缺失、双写、类型错误和自哈希 laundering；
- gold / source / manifest / operation / expected pixel 交换；
- rejection 触碰 gold 或 worker，generic error 洗白为 exact pass；
- Slice 08 request / result / partial ledger replay，或把旧 pass 拼入 summary；
- partial root、第二 invocation、retry / replacement、staging 残留、分母缩减；
- 单项 pass 或自证 counters 偷升 calibration、C1 或产品支持。

## 顺序与禁止

1. 提交并推送本 scope-only 合同；不运行真实 Sharp。
2. 实现 `@0.9.0` typed gold identity、driver / runner / validator 与 fake adversarial tests；不修改 Slice 08 源码、定义或结果。
3. fresh runtime observation 后冻结 results-zero definition，中央验证 exact tree、runtime、lineage、gold identity 与 results absent。
4. 定义提交并推送后，仅允许一次 registered invocation 执行完整 36 attempts。
5. 结果无论 pass / non-pass / partial 都独立封存；任何修复再次新版本。

禁止 calibration、formal holdout / defect-holdout / escape、bundle / seal request / receipt / EvidenceManifest、真实用户图片、第三方图片、模型权重、许可未解资产、格式扩展、Matting / SourceCard / UI / server / download / catalog 接线。

全程固定：`productSupport=false`；C1 / U1 / E1 / R1-pipeline / R1-product-validation / R1-product-release / O1 / G1 / V1 全部为 0；Release Gate 为 allowlist `none`、registered `0`、approved `0`。

## Phase A 退出条件

本提交只能声称 gold identity boundary、完整 36-attempt 新分母、Gate-B 合取与停止规则已冻结。Slice 09 implementation、machine definition、runtime observation、request、result、decision 和 calibration 均为 `not-created`。
