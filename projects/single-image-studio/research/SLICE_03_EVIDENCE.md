# Slice 03 验收证据

> 记录日期：2026-08-15。本文只证明 Slice 03 的格式政策、byte-backed observer、开放合成夹具与密封仪式规则可重复运行。`C1/U1/E1/R1-pipeline/R1-product-validation/R1-product-release/O1/G1/V1` 均为 0；Release Gate 当前仍是 `allowlist=none; registered=0; approved=0`。

## 被验收的制品

- 1 份 `S03-TECHNICAL-OBSERVER@0.3.0` 冻结研究合同及独立 observer；它输出 `TechnicalObserverResult.slice03.v0`，不是产品 `SourceCard`。
- 15 行 `NORMALIZE-DELIVER` 格式矩阵与 15 份逐行 profile；全部固定 `productSupport=false`。
- 13 份严格 schema：5 份格式 / fixture / rights、2 份 observer 合同 / 输出，以及 6 份密封仪式 schema。
- 仅 `dev/calibration` 与 `defect/calibration` 的 25 个 fixture / 25 个项目原创 procedural 资产；全部 `catalog-denied`、不含真人或第三方内容。
- formal / rehearsal 分离的密封 validator：角色独立、8 项冻结 hash 链、一次性 request、无效重跑规则、完整 result history、逐 attempt custody 状态机、实际文件 / bundle hash、外部 trusted pins 与 realpath 边界。

冻结 hash：

```text
format matrix: 57ade2ad28bb4ecae40941ca084990aafc8f3182348085a9ab20158bfb61503e
technical observer implementation: 99596ad7030ae8db2e9861d0dae1689448221ca7876ef94fbf9e04f5fdbbf0e3
technical observer contract: 0aaea35f2874f3648a68fa30ddbf978acaf32b2b0e49daf49320b36707b89f40
generated subset tree (45 files): 2655c57799ecfcb69f57102a20c261c609e8345ffddd9d22697e6119637a6430
schema tree (13 files): 393fc66dbe6379f84f001617d4bbedd50139422f1443e446850672ff661c3226
```

## 验证命令与结果

从 `projects/single-image-studio` 运行：

```powershell
npm.cmd run research:prepare
npm.cmd run verify
```

2026-08-15 的全量 `npm.cmd run verify` 结果为 **107 / 107** tests 通过；Slice 01 仍为 3 fixtures / 18 assets，Slice 02 为 4 contracts / 10 fixtures / 30 assets，Slice 03 为 1 observer contract / 15 format rows / 15 profiles / 25 open fixtures / 25 assets / 6 seal schemas。所有列入 `node --check` 的脚本、服务与前端模块语法通过。测试数量不是证据等级。

定向反证覆盖：

- matrix 行缺失 / 乱序、错误状态、`productSupport=true`、row / profile 同步语义漂移、profile decoder / encoder 越权、拒绝码互换、固定生成树漂移与未登记任意扩展名文件；
- observer 的 MIME、签名、CRC、chunk、sRGB、filter、interlace、尺寸、文件 / pixel hash、Alpha 与 parent identity mismatch；
- schema 放宽、oneOf 类型绕过、未知 schema keyword、合同自 hash 重算、合法替换像素同步重算、资产篡改、路径逃逸、family / session 重用与 catalog 泄漏；
- custodian 角色重合、冻结链篡改、idempotency 重用、custody 前序断裂、有效结果选择性重跑、未预注册无效原因和结果历史删减；
- formal validator 对 rehearsal marker / mock ID、缺失或错误外部 trusted pins、整个 Git 仓库 / sibling、系统临时目录和 junction 回指仓库的拒绝；每个 attempt 的完整 custody 次序与时间单调性；rehearsal 仅可使用系统临时目录并在测试后清理。

## 结论与限制

Slice 03 已把格式状态、normalized-byte 技术观察和未来密封运行仪式变成可执行、可哈希、fail-closed 的研究设施。它没有实现 JPEG / WebP 解码、归一化或导出；header probe 和格式拒绝不构成格式支持。canonical PNG 也只覆盖最大 `1 MiB` / `256×256` 的项目原创开放 fixture reference profile。

没有创建正式 holdout、defect-holdout、escape、EvidenceManifest、Matting 候选、`MATTE-REAL`、真实图片、模型权重或产品 UI。正式 holdout 状态为 `not-created`；真正运行仍须在候选、合同、QA profile、阈值、分母、指标与停止规则全部冻结后由独立 custodian 在仓库外建立和保管。
