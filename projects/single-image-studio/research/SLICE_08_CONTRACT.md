# Slice 08 typed case-context Gate-B 范围合同

> 当前状态：`scope-frozen / implementation-not-started / definition-not-created / Gate-B-smoke-not-run / calibration-forbidden / non-C1 / non-product`。本范围自**包含本文件的 Git commit** 起生效；本文不回填 machine freeze 时间，也不表示 candidate、contract、schema、manifest、preregistration、runtime observation、request、result 或 decision 已创建。实时状态以 [../STATUS.md](../STATUS.md) 为准。

## 目标

Slice 07 已证明复合候选的 applicable 路径成立：Sharp 只负责 decode / pixel processing，项目原创 canonical PNG encoder 写出 `IHDR,sRGB,IDAT,IEND` 与 filter 0，18 / 18 applicable attempts 均通过 independent oracle。Slice 07 同时暴露了一个独立的 runner → driver 协议缺陷：runner 调用 operation executor 时没有传递冻结的 `disposition` 与 `expectedStableErrorCode`，driver 因而把 rejection case 当作 applicable case，并在读取不存在的 gold path 时得到 `ERR_INVALID_ARG_TYPE`。

Slice 08 只修复这个 typed case-context 绑定。candidate 的像素处理、canonical encoder、closed PNG profile、Sharp / bundled libvips 版本和 independent oracle 判定语义均不得借机改变。它只回答：在完整的新版本 36-attempt smoke 中，normalize / export 是否分别满足 Gate B。

## 不可改写的历史

- Slice 05 `@0.5.0`、Slice 06 `@0.6.0` 与 Slice 07 `@0.7.0` 均为只读闭合历史，不得重跑、追加、替换或重新解释。
- Slice 07 result tree、summary、decision 与 ledger 只能作为 exact lineage；不得把其 18 个 applicable pass 与 Slice 08 rejection 结果拼接成新 decision。
- Slice 07 的实际 rejection code `ERR_INVALID_ARG_TYPE` 保持历史事实；Slice 08 使用新的 ID、request、idempotency key、result root 与 `S08_*` error namespace。
- Slice 08 必须 pin Slice 07 definition commit `d056390bdec8b4f0ae129336f18301ec9ea24eb9` 与 result commit `fa16068eb967a1e9f4696b67c264fc2cce06e574`，以及 Slice 07 definition / result-tree / summary / decision / ledger 的 exact hashes。

## 新版本身份

实现阶段必须创建并互相 pin：

| 角色 | 计划 ID | Phase A 状态 |
| --- | --- | --- |
| composite candidate | `REG-NORM-SHARP-CANONICAL-PNG@0.8.0` | `not-created` |
| normalize contract | `CC-CAP02-NORMALIZE-PNG@0.8.0` | `not-created` |
| export contract | `CC-CAP02-EXPORT-PNG@0.8.0` | `not-created` |
| normalize Gate-B preregistration | `PREREG-GATEB-NORMALIZE-PNG@0.8.0` | `not-created` |
| export Gate-B preregistration | `PREREG-GATEB-EXPORT-PNG@0.8.0` | `not-created` |

candidate lineage 必须说明 candidate 图像实现与 `@0.7.0` 相同，版本升级来自执行协议与 evidence unit 改变。不得用“实现相同”为理由复用旧 request、result 或 decision。

## Typed case-context 合同

runner 只能向 driver 传递一个 closed、不可变、可哈希复核的 `caseContext`。最少包含：

```text
operation
sourceId / sourceRef / sourceContentHash
manifestRef / manifestContentHash
disposition = applicable | rejection
expectedStableErrorCode = null | exact S08 code
expectedFactsRef / goldRef（按 disposition 严格互斥）
attempt identity / repetition / idempotency key
candidate / contract / runtime / worker refs
```

runner、driver 与 terminal validator 必须从同一冻结 request / manifest 交叉核对这些字段，不能依赖对象展开、位置参数或调用方隐含约定。任何字段缺失、额外、交换、跨 operation、跨 source、跨 manifest 或 hash 不匹配都必须在 worker 前以 protocol failure 停止。

rejection case 必须满足：

- `disposition=rejection` 且 `expectedStableErrorCode` 为冻结的 exact `S08_*` code；
- driver 不得读取 `goldRecordPath`、expected pixels 或 applicable-only material；
- preflight 必须在 worker spawn 前结束；worker observation / artifact closure 为 null；
- actual code 与 expected code exact 相等才是 rejection pass；generic code、Node native error 或 expected-code laundering 均为 non-pass；
- terminal result 必须保留 request / manifest / case-context hash，summary 不能只信任自述 counters。

applicable case 继续沿用 Slice 07 已证明的候选路径，但在 Slice 08 新 request / contract / manifest 下重新完整运行与判定。

## 冻结 smoke 分母：12 sources / 36 attempts

Slice 08 使用新的 source / family / session / request identity，只引用既有项目原创 public-synthetic bytes、independent normalized inputs 与 gold facts，`independenceClaim=false`。每个 source 恰好 3 次，planned replacement=0：

| Operation | Applicable | Rejection | Attempts |
| --- | --- | --- | ---: |
| normalize | opaque、partial alpha、alpha holes | bad CRC、missing sRGB、unsupported source declaration | 18 |
| export | independent opaque、partial alpha、alpha holes `NormalizedImage` | invalid schema、parent identity tamper、color / alpha / metadata invalid | 18 |
| total | 6 | 6 | 36 |

不得只重跑 Slice 07 的 18 个失败 rejection attempts；不得把 Slice 07 pass 计入 Slice 08 denominator。export applicable input 仍必须来自 independent fixture generator，不能来自本 candidate 的 normalize output。

新错误 namespace 至少冻结：`S08_INPUT_CRC_MISMATCH`、`S08_INPUT_SRGB_REQUIRED`、`S08_NORMALIZE_SOURCE_DECLARATION_INVALID`、`S08_EXPORT_NORMALIZED_ARTIFACT_INVALID`。missing-sRGB 必须落专用 code。

## Gate-B 判定

normalize / export 分别产生 decision。单项 pass 必须同时满足：

- 18 / 18 terminal；零 retry、replacement、timeout、cancel、missing、unknown 或 protocol failure；
- 9 / 9 applicable candidate outputs 通过 independent oracle，三次 bytes / pixels / classification / runtime / exit 均满足冻结规则；
- 9 / 9 rejection exact-code pass 且 worker 未启动；
- case-context、request、manifest、source、expected code 与 terminal result 全链可离线重算；
- candidate encoder、worker、adapter、runner、driver、oracle、schema、runtime 与 source lineage 均匹配冻结 hash；
- 无 passthrough、fallback、byte patch、oracle repair、选择性重跑或旧结果拼接。

只有两项都 pass，后续新切片才可讨论开放 calibration；Slice 08 本身固定 `calibrationAuthorized=false`。任一项 non-pass、protocol failure 或 reconciliation unknown 都关闭 `@0.8.0`，不得修补后补跑。

## 必须先通过的 fake-only 负例

- runner 在真实 production callback shape 中遗漏 `disposition` 或 `expectedStableErrorCode`；
- source / code / operation / manifest wrapper 交换，或重算 self-hash 后 laundering；
- rejection 路径触碰 null gold、expected pixels 或启动 worker；
- actual generic / Node error 冒充 exact rejection pass；
- applicable 与 rejection context 互换，或 terminal counters 自证；
- replay Slice 07 request、result、ID、hash 或把旧 pass 拼入新 summary；
- partial result root、第二 invocation、retry、replacement、staging / reconciliation 残留；
- non-pass、单项 pass 或 deterministic output 偷升 calibration、C1 或产品支持。

测试必须走 production runner → driver 的实际回调边界，不能只直接调用 driver helper 来绕开字段传递层。

## 实现、定义与运行顺序

1. 提交并推送本 scope-only 合同；本阶段不调用真实 Sharp 图片路径。
2. 新建 Slice 08 versioned runner / driver protocol、strict schemas 与 fake / system-temp adversarial tests；不得修改 Slice 07 源码、定义或结果。
3. fresh runtime observation 后冻结 results-zero machine definition，包含 candidate、contracts、plans、preregistrations、manifests、source lineage、rights、implementation / schema hashes、stop rules 与 exact denominator。
4. central validator 必须验证 exact tree、Git clean / pushed admission、runtime、source / gold、typed callback contract 与 results absent。定义提交并推送后才可运行。
5. 仅允许一次 registered driver invocation，按 normalize → export 顺序运行；不得 retry、replacement 或选择性补跑。
6. 结果、审计与 evidence 独立提交。失败即关闭 `@0.8.0`；任何修复进入下一版本。

## 允许与禁止

允许：Slice 08 versioned research protocol、strict schemas、fake tests、公开 synthetic lineage wrapper、results-zero definition，以及定义推送后唯一 registered open-smoke result。

禁止：修改或重跑 Slice 05–07；创建 / 运行 calibration；创建或读取 formal holdout、defect-holdout、escape、bundle、seal request / receipt 或 EvidenceManifest；真实用户 / 人物照片、第三方图片、模型权重、许可未解资产；扩格式 / Matting / SourceCard / 产品 UI / server / download / catalog；将自动测试或局部 pass 表述为能力支持。

全程固定：

```text
productSupport=false
C1/U1/E1/R1-pipeline/R1-product-validation/R1-product-release/O1/G1/V1=0
Release Gate=allowlist none; registered 0; approved 0
formal holdout=not-created
```

## Phase A 退出条件

本 scope-only 提交只能声称：typed case-context、完整 12-source / 36-attempt 新分母、exact rejection 条件、Gate-B 合取与禁止边界已冻结。Slice 08 implementation、machine definition、runtime observation、request、result、decision 与 calibration 均为 `not-created`。
