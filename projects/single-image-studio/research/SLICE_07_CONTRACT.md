# Slice 07 canonical PNG 复合候选 Gate-B 范围合同

> 当前状态：`scope-frozen / implementation-not-started / definition-not-frozen / Gate-B-smoke-not-run / calibration-forbidden / non-C1 / non-product`。本范围自**包含本文件的 Git commit** 起生效；本文不写入尚未发生的 machine definition freeze 时间，也不表示 candidate、contract、encoder、adapter、schema、manifest、preregistration、runtime attestation、Gate-B decision 或 result 已创建。实时状态以 [../STATUS.md](../STATUS.md) 为准。

## 目标

Slice 06 已经把失败原因闭合为一个明确事实：Sharp `0.35.3` 生成的 18 份 applicable PNG 像素正确且三次确定一致，但共同缺少合同要求的 `sRGB` chunk，并额外带有禁止的 `pHYs` chunk。Slice 07 据此只授权一个新版本复合候选：

```text
strict input policy
→ Sharp isolated worker 只负责 decode / pixel processing，返回 RGBA8 + width + height
→ candidate-owned canonical PNG encoder 写出固定 closed profile
→ independent oracle 从最终 bytes 重开并验收
```

这不是在 Sharp PNG 后追加 byte patch，也不是 oracle 修复输出。候选编码器是生产侧的一部分；oracle 是独立验收方。两者不得共享实现、导入关系或可替换角色。

本切片只回答：这个新复合候选能否在冻结的 canonical PNG smoke 上分别通过 normalize / export Gate B。它不授权 calibration、formal holdout、C1 或产品接入。

## 不可改写的历史

- Slice 05 `@0.5.0` 保持 `closed-non-pass / Gate-B denied / calibration forbidden`。
- Slice 06 `@0.6.0` 保持 `characterization-complete / Gate-B-no-authority / calibration forbidden`；其 24 次 request、result、ledger、summary、close 与 quarantine bytes 不得重跑、替换或重新解释。
- Slice 06 的结论只能作为 candidate-selection lineage；不能把诊断闭包当成 Gate-B pass。
- 旧错误码、合同 ID、candidate ID、request ID、idempotency key 与 result path 均不得复用。

## 新版本身份

实现阶段必须创建并互相 pin：

| 角色 | 计划 ID | Phase A 状态 |
| --- | --- | --- |
| composite candidate | `REG-NORM-SHARP-CANONICAL-PNG@0.7.0` | `not-created` |
| normalize contract | `CC-CAP02-NORMALIZE-PNG@0.7.0` | `not-created` |
| export contract | `CC-CAP02-EXPORT-PNG@0.7.0` | `not-created` |
| normalize Gate-B preregistration | `PREREG-GATEB-NORMALIZE-PNG@0.7.0` | `not-created` |
| export Gate-B preregistration | `PREREG-GATEB-EXPORT-PNG@0.7.0` | `not-created` |

candidate lineage 必须 pin Slice 06 close / summary / result-tree，Sharp / bundled libvips 精确来源与运行时 closure，以及 candidate-owned encoder 的独立 implementation hash。Sharp 与 bundled libvips 仍是一个上游复合组件；新增 encoder 是同一新候选的明确组成部分，不得虚构为独立比较臂。

## Candidate encoder closed profile

候选编码器只接受已经由 worker 严格绑定的 `RGBA8 + width + height`，并固定输出：

```text
PNG signature
IHDR: bitDepth=8, colorType=6, compression=0, filter=0, interlace=0
sRGB: renderingIntent=0, exactly once, before IDAT
IDAT: deterministic zlib stream over filter-0 scanlines
IEND: exactly once, no trailing bytes
```

禁止输出 `pHYs`、`iCCP`、`gAMA`、`cHRM`、`eXIf`、`tEXt`、`zTXt`、`iTXt`、`tIME`、APNG chunks、未知 critical chunk 或任何未列 ancillary chunk。最大尺寸保持 `256 × 256`，decoded RGBA 上限 `262,144` bytes，最终文件上限 `1 MiB`，orientation=1、straight alpha、metadata policy 保持 `strip-all-except-color-contract`。

encoder 必须是项目原创实现，只使用已经许可明确的本地运行时 / Node builtins；不得复制或 import Slice 02/03 reference encoder、Slice 05/06 oracle、测试 gold encoder，也不得调用 Sharp PNG encoder 后再删 chunk。生产 encoder 与 independent oracle 必须有不同模块、不同 implementation hash、独立 CRC / chunk / zlib 路径和反向依赖禁令。

## 冻结 smoke 分母：12 sources / 36 attempts

Slice 07 使用新的 source / family / session / request identity，只引用 Slice 05 已公开、项目原创 synthetic smoke bytes、artifact record 与 gold facts。它们是 regression lineage，`independenceClaim=false`，不进入 calibration、holdout 或 C1。

每个 source 恰好 3 次，planned replacement=0：

| Operation | Applicable | Rejection | Attempts |
| --- | --- | --- | ---: |
| normalize | opaque、partial alpha、alpha holes | bad CRC、missing sRGB、unsupported source declaration | 18 |
| export | independent opaque、partial alpha、alpha holes `NormalizedImage` | invalid schema、parent identity tamper、color/alpha/metadata invalid | 18 |
| total | 6 | 6 | 36 |

对应 lineage 精确为 Slice 05 normalize smoke `.001`–`.006` 与 export smoke `.001`–`.006`。export applicable input 必须继续来自 independent fixture generator，不能使用本候选 normalize output 作为 gold 或输入。

新错误 namespace 必须冻结至少：`S07_INPUT_CRC_MISMATCH`、`S07_INPUT_SRGB_REQUIRED`、`S07_NORMALIZE_SOURCE_DECLARATION_INVALID`、`S07_EXPORT_NORMALIZED_ARTIFACT_INVALID`。missing-sRGB 必须直接落专用 code，不能退化为 generic chunk-profile code。

## Gate-B 判定

normalize / export 分别产生 decision。单项 `pass` 必须同时满足：

- 18 / 18 terminal，零 replacement、timeout、cancel、missing、unknown 或 protocol failure；
- 9 / 9 applicable 均发布严格 artifact closure，independent oracle 全部通过；
- 9 / 9 rejection 均在预注册边界以 exact code 拒绝，不调用不该调用的 worker；
- 每个 source 的 3 / 3 file hash、decoded-pixel hash、classification、runtime binding 与 worker exit 状态一致；
- 最终 bytes 只含固定 chunk profile，像素 / alpha identity 与 gold 完全一致；
- candidate encoder、worker、adapter、oracle、runner、schema、runtime 和 manifest 均与冻结 hash 一致；
- 没有 passthrough、fallback、byte patch、oracle repair、candidate self-oracle 或选择性重跑。

两项 decision 独立记录，但只有 **normalize 与 export 都 pass** 才能把“未来可另行讨论开放 calibration”记为 eligible；本切片本身仍不得运行 calibration。任一项 non-pass 都关闭 `@0.7.0`，不得修补后补跑。

一次冻结 driver invocation 按 normalize → export 顺序注册两个 operation run。普通、闭包完整的 candidate non-pass 不跳过另一 operation；protocol / integrity / runtime drift / reconciliation unknown 会全局停止，未开始的 operation 记为 not-run，不得通过第二次 invocation 补齐。

## 实现、定义与运行顺序

1. 先提交并推送本 scope-only 合同；本阶段不调用 Sharp 图片路径。
2. 实现 candidate encoder、worker / adapter / runner、strict schemas、independent oracle adapter 与 fake / temporary tests，单独提交并推送；不得生成 canonical result。
3. fresh inventory 后冻结 results-zero machine definition：candidate、两合同、Gate-B plan、两 preregistration、两 manifest、rights、runtime / hardware、source lineage、implementation / schema pins、stop rules 与 exact denominator。
4. production validator 必须逐 byte 验证 definition、Git admission、runtime、source / gold、encoder-oracle separation 与 results absent；定义基线提交并推送后才可运行。
5. 只允许一次 registered driver invocation，生成 append-only open-smoke result tree；不得 retry、replacement 或选择性重跑。
6. 结果与 evidence 另行提交。若失败，关闭 `@0.7.0`；任何修复都要求新版本。

## 允许与禁止

允许：Slice 07 独立研究代码、schema、records、项目原创 candidate encoder、公开 synthetic lineage wrapper、Gate-B smoke plan / preregistration、fake protocol tests、results-zero definition，以及运行后严格 allowlist 内的 open-smoke records / artifacts。

禁止：

- 修改 Slice 05 / 06 冻结记录、结果或合同；
- 运行 Slice 05 calibration，或在 Slice 07 两项 Gate B 全过前创建 / 运行任何 calibration；
- 创建或读取新的 formal holdout、defect-holdout、escape、bundle、seal request / receipt 或 EvidenceManifest；
- 使用真实用户照片、人物照片、第三方图片、模型权重或许可未解资产；
- 扩展 JPEG / WebP / HEIC / APNG、Matting、SourceCard 内容理解、自然增强或创意能力；
- 修改产品 UI、server、download、catalog 或把研究候选接入产品路径；
- 把自动测试、某个 operation pass、artifact 存在或 deterministic output 表述为 C1 / 产品支持。

全程固定：

```text
productSupport=false
C1/U1/E1/R1-pipeline/R1-product-validation/R1-product-release/O1/G1/V1=0
Release Gate=allowlist none; registered 0; approved 0
formal holdout=not-created
```

## Phase A 退出条件

本 scope-only 提交只能声称：范围、候选结构、closed PNG profile、12-source / 36-attempt 分母、Gate-B 合取条件与禁止边界已写清；Slice 07 implementation、definition、fixture wrapper、runtime observation、smoke result 与 decision 均为 `not-created`。链接和 diff 检查不构成候选或能力证据。
