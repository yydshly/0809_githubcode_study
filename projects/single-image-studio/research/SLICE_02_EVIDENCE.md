# Slice 02 验收证据

> 记录日期：2026-08-15。本文只证明 Slice 02 的合同、参考适配器与合成夹具隔离机制可重复运行。`C1/U1/E1/R1-pipeline/R1-product-validation/R1-product-release/O1/G1/V1` 均为 0；Release Gate 不以“0/0”表达，当前是 `allowlist=none; registered=0; approved=0`。

## 被验收的制品

- 4 份 `CapabilityContract v0.2.0`：normalize、export、SourceCard.v0、Matting simple baseline。
- 7 份合同 I/O schema：`ImageAsset.v0`、`NormalizedImage.v0`、`RGBA8PixelBuffer.v0`、`DeliveryArtifact.v0`、`SourceCard.v0`、`SubjectMap.v0`、`AlphaMatte.v0`；另有 capability / fixture / rights / partition schema，共 11 份严格 schema。
- 1 个只使用 Node.js 内建模块的本地参考适配器；不含模型或第三方运行时依赖。
- 2 个 suite × 5 个 partition = 10 个项目原创合成 fixture / 30 个 PNG。
- strict validator：合同 / 实现 / plan / manifest / asset hash、rights、partition coverage、family / session / exact / perceptual 隔离、sealed state、escape lineage 和 catalog denial。

当前 canonical partition plan hash：

```text
101e924e4b793931d29a5919fa033ab029c2b89844d7578ae89717783b4eca4c
```

2026-08-15 时间链审计撤销旧 pin `f97918cdbfd47d4a34cfa51ffae580ec11cb19df3326e4287b2ca85063628408`：旧 plan / manifests 的冻结时间是错误的未来 UTC；同版 generator 现以原提交时刻 `2026-08-14T18:41:55.000Z` 重生成并得到上述 canonical plan hash。Git 历史与旧 pin 仍保留用于审计，但旧值不得再作为当前 plan 身份。这个修正没有改变 PNG bytes、合同语义、fixture partition / lineage 或证据等级，也没有创建新证据；所有受时间字段影响的同版 manifest / contract hash 由当前机器树重新闭合。

参考适配器和各合同的实际 hash 以生成后的 contract JSON 为准；适配器文件变化会让 validator fail closed，并要求重新生成合同和夹具。

## 验证命令

从 `projects/single-image-studio` 运行：

```powershell
npm.cmd run research:prepare
npm.cmd run verify
```

定向测试覆盖：

- 生成器在两个独立临时根目录输出相同 plan / contract / manifest / PNG。
- normalize 与 export 的 descriptor / bytes 交叉核对、逐像素保持、alpha 声明、文件 hash、byte length 和 reopen pixel verification。
- `SourceCard.v0` 从 normalized bytes 重开技术字段并拒绝 artifact mismatch；未冻结观察项保持强类型显式 unknown。
- Matting baseline 的合成来源 / 真人 / 单主体 / 均匀背景 / opaque source 前置条件、确定性、partial alpha 和参数 fail-closed。
- 生成记录实际通过对应 JSON Schema；错误技术类型和 schema 放宽均被拒绝。
- 篡改合同内容、跨 partition 复用来源族、未登记任意扩展名文件、资产 hash / 路径 / catalog 泄漏均被拒绝。

2026-08-15 全量结果：`node --test` 为 **85 / 85** 通过；Slice 01 仍为 3 fixtures / 18 assets，Slice 02 为 4 contracts / 10 fixtures / 30 assets；全部列入 `node --check` 的服务、生成器、validator、reference adapter 与前端模块语法通过。测试数量不是证据等级。

## 结论与限制

Slice 02 已把四个 planned 占位推进为可执行、可 hash、范围窄且诚实拒绝的冻结研究合同，并建立两套 suite 的五 partition 隔离骨架。它仍没有真实图片分母、真实 Matting 候选、真正密封的质量 holdout、质量阈值、人工盲评、EvidenceManifest 或 Gate B / Gate C 结果。

仓库可见 holdout 仅是 isolation rehearsal；它不能用于未来 C1。下一切片只准备 `NORMALIZE-DELIVER` 格式政策矩阵、技术 observer 加固与仓库外密封仪式 schema / mock rehearsal，不进入 Matting 候选，不创建 `MATTE-REAL`，也不把 JPEG / WebP 探测写成正式支持。
