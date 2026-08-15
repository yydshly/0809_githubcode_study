# Slice 10 开放 calibration 范围合同

> 当前状态：`scope-frozen / implementation-not-started / definition-not-created / calibration-not-run / formal-holdout-not-created / non-C1 / non-product`。本范围自**包含本文件的 Git commit** 起生效；本文不回填未来 machine freeze 时间，也不表示 candidate、contract、schema、manifest、preregistration、request、result 或 calibration decision 已创建。实时状态以 [../STATUS.md](../STATUS.md) 为准。

## 目标

Slice 09 的唯一 registered open smoke 已不可变关闭：normalize / export 均为 `18 / 18 pass`，两项 Gate B decision 均 pass。该结果只证明冻结的窄范围 Gate-B smoke 通过；Slice 09 合同固定 `calibrationAuthorized=false`，不能在原版本上追加 calibration。

Slice 10 只为同一像素与 canonical PNG 架构建立**新版本、开放、形成性 calibration**。它冻结独立的 candidate / contract identity、运行时观测、operation-specific 分母、错误分类、停止规则、结果闭包与 admission。它不创建或运行 formal holdout，不产生 C1，也不授权产品或 UI 接线。

## 不可改写的 lineage

- Slice 05–09 的 definition、request、result、ledger、summary 和 decision 全部只读；不得重跑、补跑、选择性引用或把旧 pass 拼入 Slice 10 分母。
- Slice 09 definition commit 为 `36d92844a2ea58113567a24482e5297ba8cdd9ab`，registered result commit 为 `c91014c6bef8878277a8520d003b10684972087b`，结果树 SHA-256 为 `2f6bc6c2d7490568db0facd8b2615f74294fbb6e1b3a09828bf7a654750cf451`。
- Slice 09 normalize / export summary、decision、ledger tail 与 18 artifact closures 必须作为 exact admission lineage 重开；不能只读取文档中的 `pass` 字符串。
- Slice 10 使用全新的 source / family / session / manifest / request / idempotency / result identity 与 `S10_*` error namespace。

## 新版本身份

| 角色 | 计划 ID | Phase A 状态 |
| --- | --- | --- |
| composite candidate | `REG-NORM-SHARP-CANONICAL-PNG@0.10.0` | `not-created` |
| normalize contract | `CC-CAP02-NORMALIZE-PNG@0.10.0` | `not-created` |
| export contract | `CC-CAP02-EXPORT-PNG@0.10.0` | `not-created` |
| normalize open-calibration plan | `PP-OPEN-CALIBRATION-NORMALIZE-PNG@0.10.0` | `not-created` |
| export open-calibration plan | `PP-OPEN-CALIBRATION-EXPORT-PNG@0.10.0` | `not-created` |
| normalize preregistration | `PREREG-OPEN-CALIBRATION-NORMALIZE-PNG@0.10.0` | `not-created` |
| export preregistration | `PREREG-OPEN-CALIBRATION-EXPORT-PNG@0.10.0` | `not-created` |

candidate 必须精确引用 Slice 09 `@0.9.0` candidate、两份 contract、definition 和 closed result tree。`@0.10.0` 的版本提升来自 calibration protocol、分母和 identity namespace，不代表像素算法、Sharp 版本或 canonical encoder 已改变；若实现 bytes、参数、oracle、profile 或合同语义漂移，必须停止并另发版本。

## 开放来源与分母

只允许复用 Slice 05 已提交、项目原创、public-synthetic 的开放 bytes / independent normalized inputs / gold facts作为 lineage；不得复制真实用户照片、第三方图片或许可未解资产。所有 Slice 10 wrapper 必须声明 `independenceClaim=false`，使用新 identity，并逐项 pin 原始 record、content hash、file hash、bytes、rights 与 gold。

每个 operation 使用互斥的新 source / family / session identity：

| Operation | Partition | Applicable | Rejection | Sources | Attempts |
| --- | --- | ---: | ---: | ---: | ---: |
| normalize | `dev/calibration` | 18 | 12 | 30 | 90 |
| normalize | `defect/calibration` | 6 controls | 12 defects | 18 | 54 |
| export | `dev/calibration` | 18 | 12 | 30 | 90 |
| export | `defect/calibration` | 6 controls | 12 defects | 18 | 54 |
| total | open calibration only | 48 | 48 | 96 | 288 |

每个 source 恰好 3 个 planned repetitions；source-level unit 必须 `3 / 3` 全部 pass。Slice 10 固定零 retry、零 replacement，不得恢复 Slice 05 的 invalid-run replacement 规则。不得多数通过、挑最好一次、缩分母、见结果后加样、删除 failure / timeout / cancel / missing / unknown，或把 dev 与 defect 分母混算。

normalize 与 export 的 source identity、family、session、gold 和 result root 必须 operation-specific；export applicable input 必须由独立 fixture producer 建立，不能由同轮 candidate normalize output 充当 gold 或输入。

## Calibration 判定与停止规则

每项 operation 的 `calibration-complete-pass` 必须同时满足：

- `48 / 48` source units 和 `144 / 144` terminal attempts 闭合；
- 每来源 3 / 3 bytes、pixels、classification、runtime、worker exit 与 telemetry 符合冻结规则；
- 24 applicable sources 的 independent-oracle 结果全部 pass；
- 24 rejection / defect sources全部得到预注册的 exact `S10_*` code；
- 开始和结束的完整 runtime / native inventory 与冻结 attestation 一致；
- request、claim、ledger、publication、artifact record、oracle result、terminal、summary 可离线重算，且没有 staging / lock / extra / orphan。

任一 operation 出现普通、完整留证的 non-pass，该 operation 关闭为 `calibration-complete-non-pass`；另一 operation 可继续完成其独立分母。出现 protocol failure、missing terminal、timeout、cancel、unknown reconciliation、runtime drift、schema / implementation drift、rights mismatch 或持久化不确定时，整个 Slice 10 全局停止，未开始的 operation 不得注册。

每项 operation / version 最多一次 registered run；一个 driver invocation 最多顺序注册 normalize 与 export 各一次。没有有效结果重跑，也没有失败后的同版本修复。

## Calibration 的证据边界

开放 calibration 是形成性研究，不是独立验证：

- 即使两项 `calibration-complete-pass`，也只允许下一切片评审并冻结 formal-holdout preregistration；不自动创建 holdout、seal bundle、request 或 C1。
- calibration sources、阈值、gold、错误分类和结果不得进入未来 formal holdout 分母；必须按 family / session / derivative / near-duplicate 隔离。
- 本切片不允许根据结果调阈值后仍保留同一 preregistration。任何候选、contract、oracle、gold、阈值、停止规则或分母变更都要求新版本。
- 性能数据只能作为此 named hardware / runtime 的开放观测，不产生 O1。

## Definition 与 registered run 顺序

1. 提交并推送本 scope-only 合同；不运行 Sharp calibration。
2. 实现 `@0.10.0` machine definition、operation-specific runner、strict schemas、durable ledger、central validator 与 fake-only adversarial tests。
3. fresh runtime / hardware observation 后冻结 results-zero definition；中央验证 exact tree、Slice 09 admission lineage、96 sources、288 attempts、rights、gold、runtime 与 results absent。
4. definition commit 推送且 worktree / origin admission 全部 clean 后，才允许唯一 registered open calibration invocation。
5. 无论 pass、non-pass、partial 或 inconclusive，结果独立提交并永久关闭；随后只同步事实文档。

## 必测负例

- Slice 09 decision / summary / result tree / ledger / artifact closure 任一 hash 漂移，或只信任文档 pass；
- 复用 Slice 05 / 09 request、result、source ID 或把旧 pass 拼入分母；
- source / family / session / operation / manifest / gold 串线和 near-duplicate laundering；
- 96 / 288 分母缩减、3 / 3 改多数、重复 source、选择性重跑、replacement 或见结果后扩样；
- export 使用 candidate normalize output 作为独立输入 / gold；
- exact rejection code 被 generic / Node error 冒充；
- runtime / native package / candidate / contract / oracle / encoder / schema / runner 漂移；
- start / end runtime attestation 缺失、自哈希伪造或仅用布尔值代替完整 payload；
- staging / orphan / extra result、publication intent 无 complete、ledger 断链、terminal 与 artifact / oracle 不闭合；
- calibration pass 偷升 formal holdout、C1、O1、productSupport、UI / server / download / catalog 或 Release Gate。

## 永久禁止

Slice 10 不创建或查看 formal holdout / defect-holdout / escape，不创建 bundle / seal request / receipt / EvidenceManifest，不使用真实用户照片、第三方图片、模型权重或许可未解资产，不扩 JPEG / WebP / HEIC 支持，不进入 Matting / SourceCard，不修改产品 UI / server / download / catalog。

全程固定：`productSupport=false`；C1 / U1 / E1 / R1-pipeline / R1-product-validation / R1-product-release / O1 / G1 / V1 全部为 0；Release Gate 为 allowlist `none`、registered `0`、approved `0`。

## Phase A 退出条件

本提交只能声称 Slice 10 的开放 calibration 范围、96-source / 288-attempt 分母、零重试规则、判定 / 停止规则、lineage 与禁止边界已冻结。implementation、machine definition、runtime observation、source wrapper、request、result、summary、calibration decision、formal holdout 和 C1 均为 `not-created`。
