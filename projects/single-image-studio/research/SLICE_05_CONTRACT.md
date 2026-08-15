# Slice 05 Gate B smoke 与开放校准范围合同

> 当前状态：`scope-frozen / implementation-not-started / Gate-A-inherited / Gate-B-not-evaluated / non-C1 / non-product`。本范围自**包含本文件的 Git commit** 起生效；本文不写入尚未发生的未来冻结时间，也不表示机器预注册、fixture manifest、adapter、oracle、runtime、smoke 或 calibration 已经建立。实时等级仍以 [../STATUS.md](../STATUS.md) 为准。

## 目标

Slice 05 只授权把 Slice 04 已锁定的 `REG-NORM-SHARP@0.4.0` 复合候选推进到两个相互独立的 Gate B 决定，并在某一 operation 的 Gate B 全项通过后，对该 operation 运行项目原创开放校准：

1. canonical PNG source bytes → `NormalizedImage` 的 `normalize`；
2. 冻结 `NormalizedImage` → PNG `DeliveryArtifact` 的 `export`。

本切片不扩大格式范围。PNG 以外的输入 / 输出行继续 fail closed，全部格式行继续 `productSupport=false`。稳定拒绝不等于格式支持，Gate B 也不等于 C1、产品能力或发布资格。

Slice 05 当前只完成了这份范围冻结；实现尚未开始。Slice 04 的 candidate lock、合同、QA、partition plan、预注册、seal intent、hash 与历史状态不得原地修改。后续实现必须创建新的 Slice 05 记录和版本链，并明确引用 Slice 04 的不可变 pins。

## 前置事实与 Gate 边界

Slice 04 已完成 Gate A / source-resolved：Sharp `v0.35.3`、Windows x64 native bundle、`sharp-libvips@1.3.2` 与 bundled libvips `v8.18.3` 的来源和基础许可边界已经锁定。Gate A 只允许按该边界取得依赖、准备适配器和进行获批研究，不授予运行、格式支持或质量结论。

Gate B 必须按 operation 分别判定。每个 operation 都必须同时满足：

```text
Gate A source lock
+ adapter-bound frozen CapabilityContract
+ strict operation artifact schema
+ non-candidate independent oracle implementation and gold
+ exact adapter path/version/hash
+ execution location and named hardware/runtime profile
+ open fixture version and machine preregistration
+ resource/cost guardrail
+ idempotency/query/cancel/timeout/retry/reconciliation semantics
+ local data, logging and failure boundary
+ actual input/output/failure smoke all pass
= that operation is Gate B / calibration-ready
```

任何缺项、`unknown` 或 smoke non-pass 都使对应 operation 保持 `Gate-B-not-entered`。normalize 通过不能替 export 通过，export 通过也不能替 normalize 通过；不得向整个 Sharp 家族授予聚合 Gate B。

Gate B 只表示该冻结 operation 可以进入本切片的开放 calibration。它不表示 PNG 已成为产品支持格式，不产生 C1、U1、E1、R1-pipeline、R1-product-validation、R1-product-release、O1、G1、V1 或 Release Gate。

## 强制执行顺序

每个 operation 独立遵守下列状态机：

```text
scope-frozen / implementation-not-started
→ runtime + artifact + oracle contracts frozen
→ open fixture manifests + machine preregistration frozen
→ adapter + execution semantics + named hardware frozen
→ smoke closed
   ├─ smoke non-pass → Gate-B-denied; calibration-not-started
   └─ smoke all-pass → Gate-B-calibration-ready
                       → open calibration running
                       → open calibration closed
                         (observed-conformant | observed-nonconformant | inconclusive)
                       → post-calibration refreeze and independent audit required
```

不得先运行像素或查看结果，再补写机器预注册、阈值、分母、停止规则、adapter hash、hardware profile 或 smoke 计划。smoke 必须与 calibration 来源和分母分离；smoke 结果不得计入任何 calibration 或未来 C1 分母。

calibration 后若需要修改 candidate boundary、合同、artifact schema、adapter、QA、gold、阈值、分母、停止规则或正式格式边界，当前版本必须关闭并发布新版本及新预注册；不得覆盖原记录或追加运行到刚好过线。

## Operation artifact、oracle 与 adapter

实现阶段只允许为 normalize / export 建立各自严格关闭的 artifact schema、oracle 和 adapter binding：

- artifact 必须绑定父产物、contract、candidate、adapter、hardware profile 与 run identity，并记录实际文件 SHA-256、独立重开后的 decoded-pixel SHA-256、尺寸、方向、sRGB、RGBA8、straight Alpha 与 metadata policy；
- oracle / gold 必须使用不依赖 Sharp 的项目原创实现或事前冻结 reference program；oracle 不得 import candidate、使用 candidate 输出生成 gold、把 candidate decoder 作为唯一 decoder，或允许 candidate 自证；
- candidate adapter 只能接收冻结 canonical PNG 范围；PNG 以外或不满足 profile 的输入必须在调用 candidate 前稳定拒绝；
- candidate path 禁止 passthrough、fallback 或调用 oracle / reference encoder 修补输出。若必须增加本地编码或 byte patcher，该实现已改变候选边界，必须新建候选 / 合同版本后再评审；
- 实际输出 bytes 必须由独立 oracle 重开；artifact 自报 hash、单次 API 成功或 Sharp 的官方功能说明均不能代替实际验证。

Slice 03 observer 继续只作 design lineage；未经新合同与兼容性证明，不得直接充当 Slice 05 oracle。

## 执行位置、运行语义与 smoke

实现阶段可以建立**仅供本地开放研究**的 adapter / calibration runner，但它不得被称为未来 formal seal runner，也不得满足 Slice 04 seal intent 中仍缺失的 durable consumed-request ledger、trusted authority、custody、角色 assignment 或 approval。

named hardware/runtime profile 至少冻结：不含 hostname / serial 的 opaque profile ID、OS build、CPU / architecture、可用内存边界、Node / npm、实际 Sharp / libvips 版本、并发 / cache / SIMD 设置、输入限制、deadline 与资源 guardrail。GPU 未使用时明确写 `not-used`，未知字段不能用猜测补齐。

本地运行语义至少冻结：

- operation、contract、source、参数与 adapter 版本共同定义的幂等范围；
- immutable run / attempt ID、结果原子写入与查询；
- 取消确认、timeout、零有效结果重试与 unknown reconciliation；
- stable error code、无结果失败不产生 artifact、全部 attempt 保留；
- local-only、无远程数据发送、日志 allowlist 与错误脱敏；
- calibration runner 与未来 formal runner 的明确隔离。

smoke 必须按 operation 分开，覆盖至少一个实际 applicable 路径、冻结拒绝路径、实际输出重开、文件 / decoded-pixel identity、metadata / Alpha / 色彩边界、幂等及适用的 timeout / cancel / reconciliation 故障路径。只有该 operation 的全部 smoke 硬门同时通过，才可把它写为 `Gate-B-calibration-ready`。

## 开放 calibration 分母

Slice 05 只能创建和运行项目原创、公开可见、非正式的以下四份 operation-specific manifest：

| Operation | Partition | 独立来源 | Applicable / rejection | Planned repetitions | Formal / C1 角色 |
| --- | --- | ---: | ---: | ---: | --- |
| normalize | `dev/calibration` | 30 | 18 / 12 | 每来源 3 | `formal=false`；排除于初始 C1 |
| normalize | `defect/calibration` | 18 | 6 / 12 | 每来源 3 | `formal=false`；排除于初始 C1 |
| export | `dev/calibration` | 30 | 18 / 12 | 每来源 3 | `formal=false`；排除于初始 C1 |
| export | `defect/calibration` | 18 | 6 / 12 | 每来源 3 | `formal=false`；排除于初始 C1 |

因此完整开放计划为 96 个 operation-specific 独立来源与 288 个 planned repetitions。它们是 future implementation plan，不是当前已创建文件或已经冻结的 machine denominator。

来源必须在机器预注册冻结后才可运行，并满足：

- 全部为 Slice 04 freeze 之后新建的项目原创 synthetic bytes / artifacts；不得使用真实照片、用户上传或第三方样片；
- normalize 与 export 使用独立 manifest、来源单位、family/session namespace、gold 与运行结论；candidate normalize 输出不得生成 export gold；
- 不复用 Slice 02 仓库可见 holdout、Slice 03 开放格式夹具或其他历史结构夹具充数；
- `defect/calibration` 每个来源只能包含一个事前登记、operation-specific 的注入缺陷或独立有效 control；
- 每来源 3 / 3 planned repetitions 必须全部通过才算来源通过，禁止 majority vote 或挑最好一次；
- 每来源跨三次最多一次 replacement，且只可替换在结果产生前发生的 `runner-crash-before-result`、`custody-interruption` 或 `integrity-check-failure` no-result attempt；有效 pass / non-pass 均不得重跑、覆盖或替换；
- failure、timeout、cancelled、missing、unknown、false allow 与 false reject 分开记录，不得从分母静默删除；
- calibration 结论只能写作开放观察，不能创建 C1 EvidenceManifest。

Slice 04 规划的每项 `holdout=30` 与 `defect/holdout=18` 继续保持 `not-created`；`escape` 继续是 event-driven 初始 0 且本切片不得创建。

## 当前证据不变量

从本范围冻结到 Slice 05 关闭，所有阶段都必须保持：

```text
productSupport=false
C1/U1/E1/R1-pipeline/R1-product-validation/R1-product-release/O1/G1/V1=0
Release Gate=allowlist none; registered 0; approved 0
formal holdout=not-created
formal defect-holdout=not-created
escape=not-created
bundle/request/receipt/formal result/EvidenceManifest=not-created
formal runner/durable ledger/trusted authority=not-created
role assignment=not-assigned; approval=not-approved
product UI and server runtime path unchanged
```

测试数量、schema validator、codec smoke、开放 calibration 的全通过、图片文件存在或本地 adapter 可调用，都不能改变上述不变量。

## 允许的资产与改动

实现阶段仅允许：

- 精确匹配 Slice 04 source lock 的项目内依赖声明与 lockfile；生成的 `node_modules` 不提交；
- 新的 Slice 05 strict schemas、candidate runtime attestation、contracts、QA / oracle refs、hardware / execution profile、smoke plan / result、四份开放 manifest、append-only open run records 与 calibration summary；
- 项目原创 adapter、oracle、fixture generator、runner、validator 与测试；
- 项目原创、无真人 / 品牌 / 第三方内容的 synthetic PNG / RGBA bytes，只位于 Slice 05 开放 smoke、`dev/calibration` 或 `defect/calibration` 边界；
- 为事实同步更新研究状态、来源与运行语义文档。

本范围冻结提交本身不实施上述项目；它们仍为 `not-started`。

## 硬停止与非目标

- 不创建、查看、生成或保存正式 `holdout`、`defect/holdout`、`escape` pixels、secret seed、生成器、manifest、bundle、rebuild key、request、receipt、custody ledger、formal result 或 EvidenceManifest。
- 不把 Slice 02 可见 holdout 或任何公开 / 可重建集合改称正式 holdout。
- 不使用真实用户照片、真人图、第三方图片、许可未解素材、模型或 checkpoint。
- 不进入 Matting、`MATTE-GT` / `MATTE-REAL` 扩展、SourceCard 内容理解、自然增强、创意能力或其他 CAP。
- 不修改 `/`、`/research/` 或其他产品 UI，不把 Sharp adapter 接入 `server/`、`web/`、任务 catalog 或下载路径。
- 不扩 PNG 之外的输入 / 输出格式，不把稳定拒绝、smoke 或开放 calibration 写成产品支持。
- 不建立 standalone libvips 第二比较臂；Sharp 与 bundled libvips 仍是一个复合候选。
- 不授予 C1 或任何效果、运行、运维、治理、价值、发布等级。

越过任一硬停止项必须停止当前工作并发布新的明确范围合同；“继续 Slice 05”不是创建正式材料或扩产品能力的授权。

## Slice 05 关闭条件

Slice 05 可以以 honest pass、non-pass 或 inconclusive 关闭，但必须满足：

- Slice 01–04 archival records / hashes 保持不变；
- 两项 operation 分别记录全部 Gate B 前置和 smoke 决定；smoke non-pass 的 operation 没有 calibration run；
- 只有 Gate B 全项通过的 operation 才有冻结后的开放 manifest 和完整原始 calibration attempts；
- 所有开放结果、失败和合法 invalid replacement append-only 保留，且不进入未来 C1 分母；
- calibration 后需要任何合同性变更时明确写 `new-version-and-preregistration-required`；
- 正式 holdout、defect-holdout、escape、formal runner / trust、bundle / request / receipt / EvidenceManifest 仍为 `not-created`；
- 所有格式继续 `productSupport=false`，全部证据轴继续为 0；
- 定向 validator、负例、链接检查、`git diff --check` 与项目全量 `verify` 通过；自动检查只证明研究制品一致性。

Slice 05 关闭后也不能自动创建正式 bundle。下一范围必须先对 calibration 后的最终 candidate、合同、artifact schema、adapter、QA、阈值、分母、停止规则和预注册完成新版本冻结与独立审计，之后才可讨论是否授权独立 custodian 建立仓库外正式 holdout。
