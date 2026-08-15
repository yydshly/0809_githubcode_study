# Slice 04 验收证据

> 记录日期：2026-08-15。本文只证明 Slice 04 的候选来源锁、格式 / 合同 / QA / 分母 / 预注册与 seal-intent metadata 可以严格生成和校验。它不证明 codec 可运行、格式受支持、质量达标或候选已进入 Gate B。`C1/U1/E1/R1-pipeline/R1-product-validation/R1-product-release/O1/G1/V1` 均为 0；Release Gate 保持 `allowlist=none; registered=0; approved=0`。

## 被验收的制品

- `candidate-locks/composite-sharp-win32-x64.v0.4.0.json` / `REG-NORM-SHARP@0.4.0`：Sharp `v0.35.3` / commit `1018449164723ba0203c1beffaba0e21f7829c18`，Windows x64 npm / native bundle，`sharp-libvips` `1.3.2` / commit `4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6`，以及上游 libvips `v8.18.3` / commit `3664cfc5dc2c5661288f5bf5a85ccc51c64c1626`；同时冻结 28 项 native version 与逐组件 `usedUnder` 声明。
- `profiles/format-target.normalize-deliver.v0.4.0.json` / `FT-NORMALIZE-DELIVER@0.4.0`：15 行 `NORMALIZE-DELIVER` 格式矩阵；全部 `productSupport=false`，没有 executable 或 Gate B 状态。
- `contracts/cc-cap02-normalize-png.v0.4.0.json` / `CC-CAP02-NORMALIZE-PNG@0.4.0` 与 `contracts/cc-cap02-export-png.v0.4.0.json` / `CC-CAP02-EXPORT-PNG@0.4.0`：均无 adapter、runner、named hardware 或运行证据。
- `preregistrations/partition-plan.normalize-png.v0.4.0.json` / `PP-NORMALIZE-PNG@0.4.0` 与 `partition-plan.export-png.v0.4.0.json` / `PP-EXPORT-PNG@0.4.0`：normalize / export 各自冻结 `dev/calibration=30`、`holdout=30`、`defect/calibration=18`、`defect/holdout=18`、`escape=event-driven/0` 的完整 lifecycle。
- `preregistrations/qa-profile.normalize-deliver.v0.4.0.json` / `QA-NORMALIZE-DELIVER@0.4.0`、`preregistration.normalize-png.v0.4.0.json` / `PREREG-NORMALIZE-PNG@0.4.0`、`preregistration.export-png.v0.4.0.json` / `PREREG-EXPORT-PNG@0.4.0` 与 `seal-intent.normalize-deliver.v0.4.0.json` / `SEAL-INTENT-NORMALIZE-DELIVER@0.4.0`。
- 对应的严格关闭 schema、metadata generator、validator 与 fail-closed 测试；canonical 集合为 10 records / 7 schemas，冻结于 `2026-08-15T00:20:45.916Z`。

两份正式预注册中的数量是尚未物化的独立来源分母，不是已创建资产数。Slice 04 没有建立任何正式 pixels、fixture manifest、holdout bundle、request、receipt、result 或 EvidenceManifest pass。

每项 operation 的有限来源固定 3 次 planned repetitions，必须 3 / 3 全部通过，不能把 repeats 算成独立来源或挑最好一次。每来源跨三次合计最多 1 次 no-result invalid replacement，只允许 `runner-crash-before-result`、`custody-interruption`、`integrity-check-failure`，只能替换对应未产生结果的 attempt；有效 pass / non-pass 均不得重跑、覆盖或替换。QA 冻结九项 byte-backed 检查；适用接收、defect 拒绝与 identity match 精确为 1，false allow / reject、failure、timeout、missing、unknown 与灾难失败容忍精确为 0。这些是未运行的预注册门槛，不是实测成绩。

每项 operation 的 30-source partitions 各冻结 18 applicable / 12 rejection，18-source defect partitions 各冻结 6 applicable / 12 rejection。normalize 使用 raw source PNG 单位与 normalize-specific 注入缺陷；export 使用 `NormalizedImage.slice04.v0` artifact + bound pixel source 与 export-specific 注入缺陷。每项初始 C1 只计 sealed holdout 30 + sealed defect-holdout 18 = 48 个独立来源；open dev / defect calibration 和 escape 排除。escape 为 event-driven / 0、`formal=false`、`excludedFromInitialC1=true` 的 append-only invalidation ledger；确认的 contract-relevant escape 会使依赖 QA / C1 失效并要求新版本与新 sealed holdout。10 个 operation-specific manifest 均为 `not-created-blocks-run`。

## 第三方取得与本地边界

为核对不可变上游边界，`sharp`、`@img/sharp-win32-x64`、`@img/sharp-libvips-win32-x64`、`@img/colour`、`detect-libc` 与 `semver` 六个 npm registry tarball 只下载到仓库内未提交的临时 `.tmp/slice04-artifacts` 目录计算 SHA-256，并在记录完成后删除。它们没有被解包、执行、安装、复制进项目制品或保留；GitHub commit 只通过官方页面 / API 解析，没有下载 source archive；项目依赖没有增加 Sharp / libvips，仓库也没有第三方源码、二进制、图片、模型或权重。

许可按实际制品分别记录：`sharp@0.35.3` 为 Apache-2.0，`@img/sharp-libvips-win32-x64@1.3.2` package metadata 为 LGPL-3.0-or-later，`@img/sharp-win32-x64@0.35.3` package metadata 为 Apache-2.0 AND LGPL-3.0-or-later，上游 libvips repo 则为 LGPL-2.1-or-later。`THIRD-PARTY-NOTICES.md` 记录 bundled LGPLv3 条目对上游 v2 / v2.1 any-later 条款的使用；这些事实不能互相替代。

两份 official raw metadata 从 commit-fixed URL 临时取回到仓库根未提交的 `.tmp/slice04-metadata-audit`，独立计算 SHA-256 后整目录删除，未提交或保留；这与六个 npm tarball 使用的 `.tmp/slice04-artifacts` 是不同的临时核验步骤，也不是 source archive 下载。`versions.properties` 为 599 bytes / SHA-256 `cebb421de9568ae3ce8cfd66be62c3da53c2d549232c2e4327d9a9f97276c237`；`THIRD-PARTY-NOTICES.md` 为 4230 bytes / SHA-256 `25ffcfa69e28b1913ced27ec778b90f24911a1bb3021253577e8b0af55db0d49`。

Sharp 和随 Windows x64 bundle 交付的 libvips 是同一复合候选，不能计作两个独立比较臂。standalone `REG-NORM-LIBVIPS` 的构建、链接、格式库与交付方式仍未锁定，状态没有升级。

QA 只把 Slice 03 byte-backed observer 及其实现 hash pin 为 design lineage；该 observer 硬编码 Slice 02 normalize 合同且不接受 export artifact，与 Slice 04 两项 operation contract 不兼容，不能作为正式 oracle。两份 operation artifact schema、独立 oracle implementation 与 gold 均为 `not-created-blocks-gate-b`。future gold 只能来自非 candidate team 的项目原创 independent source 或冻结 reference program；candidate 不能生成 gold、不能作为唯一 decoder oracle，也不能自证。两份预注册各自冻结 `researchQuestion` 与 `decisionToInform`，分别服务 normalize / export 的独立 C1 决策；本切片没有回答这些问题。

seal intent 只 pin Slice 03 seal schemas/helper 作为 `execution-envelope-reference-only`；6-schema tree 使用统一 project-relative path + NUL + bytes + NUL 算法，SHA-256 为 `dd4291953ac349d9a19ffe306a279e5efb51243794cdc81733104876fbb34ecb`。actual runner、durable cross-process consumed-request ledger、trusted authority、operation-specific oracle、角色 assignment 与 approval 均未创建，formal run 明确 blocked；因此 `not-issued-awaiting-custodian-bundle` 不是可运行 request policy。

## 历史 UTC 时间链纠正

最终审计发现早期研究制品曾写入晚于实际生成时刻的未来 UTC。机器树因此按原提交时刻纠正：Slice 01 `createdAt=2026-08-14T17:26:30.000Z`；Slice 02 `frozenAt/createdAt=2026-08-14T18:41:55.000Z`；Slice 03 `frozenAt/createdAt=2026-08-14T19:47:13.000Z`。Slice 04 语义于实际 UTC `2026-08-15T00:20:45.916Z` 冻结，晚于所引用的 Slice 03 design lineage，完整顺序不倒置。

这只是错误未来时间的治理修复。受影响的 manifest、plan、observer、generated tree 与下游引用 hash 必须确定性重算，旧 pin 一律失效；没有新增或查看正式像素，没有运行 codec / calibration / holdout，也不新增任何能力、效果、R1、O1、G1、V1 或 Release Gate 证据等级。

## 冻结摘要

```text
candidate lock record: 773c2a403a9cbeb418e6c1deb4ff7f6599165f444061e205a7a510376aeb1046
generated Slice 04 subset (17 files): 5c851fa3233cac1ec7b140850091f6b575f8ce79046a5889239d3744a930973a
Slice 04 schema tree (7 files): 0be868b4206110e805c00f40ced132053b22d572a941fb094fe29590229b3b49
Slice 04 README: 9428d478f7c9d1ae1310eb96d5888fae5b6a2c626987937f2661e83645127551
full Slice 04 tree (18 files): b916c0f18df6eb175d119673853cc929a9dcc6eb9621ead4e170874afc79ba29
```

10 个 record 的当前 `contentHash` 为：

```text
candidate lock: 773c2a403a9cbeb418e6c1deb4ff7f6599165f444061e205a7a510376aeb1046
format target: cbfce3cfd827082d69b29c3fafbc8f3c9e3a93d03a2dd9216ac0a38a6b0f7159
normalize contract: 534ba211e44d1ef669c75cb130c3e1e3cd63dff7be61dd246853dd72d1ebdeca
export contract: 8c2fef119a53af39c02108bde6ffd7e8390bebbd77a31d935734033da1c1cd7f
normalize partition plan: 35c59353b75fb517c428ea87cf9c50b379cdddb29261e2f30655e7fd761b9700
export partition plan: 69f5965e7da9e873831573f84139b0f0cadcee07af99b15b7c7866729897ec09
QA profile: 14e4c246989dda8907a6b0c118a586c94dd87ea221880d692ec7f7c405272986
normalize preregistration: 95f5e481352dd440e0a47e6b03193f4af4c0ea7656f1505ed3ca63e8aae2f84e
export preregistration: 86e418f7227bdb880c9a4bc44ce7757fc4463d50c226855639bcc8e77941b134
seal intent: 955f0f345849da6da0d4d2fee9f530547f576ad0210515c510012cb5178d675b
```

## 验证命令与结果

从 `projects/single-image-studio` 运行：

```powershell
node --test tests/research-slice03.test.mjs tests/research-slice03-observer.test.mjs
node --test tests/research-slice04.test.mjs
npm.cmd run research:prepare
npm.cmd run verify
```

README pin 与最终 18-file tree 接线后，定向和全量命令均已重新实跑：

```text
targeted Slice 03 tests after chronology/seal repin: 12/12
targeted Slice 04 tests: 18/18
full verify tests: 125/125
```

测试数量只表示仓库约束覆盖，不是证据等级。

## 定向反证范围

Slice 04 定向测试必须至少拒绝：

- Sharp、native bundle、sharp-libvips 或上游 libvips 的版本、commit、URL、字节数、SHA-256、逐 package 许可 / notice 漂移；缺少六个 npm tarball 中任一项；虚构 GitHub source archive 下载；把 bundled libvips 重复登记为独立 candidate；
- official raw metadata URL / bytes / SHA-256 漂移，28 项 native component 缺失、重复、版本或逐项许可漂移，或用笼统许可替代 notices；
- 15 行格式矩阵缺失、重复、乱序、合同引用漂移、`productSupport=true`、伪造 executable、Gate B 或 C1；
- 两份合同偷加 adapter / runner / named hardware / 运行结果，或把 `not-executed` 写成格式支持；
- 两份 operation plan 任一缺失或被合并，30 / 30 / 18 / 18 lifecycle 漂移，把 open calibration / escape 纳入初始 C1，初始 C1 每项不是 sealed 30 + 18 = 48，defect 没有 operation-specific 注入，或 Slice 02 / 03 structural fixtures 被计入；
- QA 自证、unknown 当 pass、灾难失败被平均值稀释，适用 / 拒绝 / invalid / missing 分母混用；
- 不是 3 / 3 repetitions 全通过、每来源允许多于一次 replacement、replacement 替换了有效结果或非对应 no-result attempt、无效原因漂移、样本不足后追加到过线，或 `frozenAt` 晚于验证时刻；
- 把 Slice 03 observer 宣称为 Slice 04 compatible oracle，伪造 operation artifact schema / oracle / gold，允许 candidate 生成 gold / 自证，或两份预注册缺少各自研究问题与决策；
- custodian 与 candidate / threshold / QA / stopping author 重合，角色槽位被伪装成已 assignment / approved，seal intent 虚构 runner、durable ledger、trusted authority，或在 bundle 不存在时声称 request 已签发；
- escape 可被删除、可计入成功 / 提前停止，复现结果覆盖历史，或确认 escape 不触发依赖 QA / C1 失效和新 sealed holdout；
- schema `additionalProperties` 放宽、关键字段非 required、未知 schema keyword、合同自 hash 篡改、路径逃逸、未登记文件或旧 Slice 制品漂移；
- 仓库中出现 Slice 04 codec、正式 fixture pixels、holdout / defect-holdout / escape、secret seed、bundle、request、result、产品 catalog 或 UI 改动。

## 结论与限制

Slice 04 将 `REG-NORM-SHARP` 从 `research-only/pending-freeze` 推进到 source-resolved `candidate`，并冻结 `NORMALIZE-DELIVER` 进入 adapter / calibration 前所需的治理 metadata。这个状态只授权后续切片准备明确版本的 adapter；它不表示 Sharp 已安装、bundle 已加载、任何像素已处理、格式能力已成立或 Gate B 已通过。

下一切片必须另行冻结范围，只允许创建 normalize / export operation artifact schema 与独立 oracle / gold、实现 adapter、命名硬件与运行语义、完成 smoke，并在项目原创开放 `dev/calibration` / `defect/calibration` 上运行 calibration。该阶段仍不得直接创建正式 holdout；只有 calibration 形成新的最终候选 / QA / 阈值版本并通过独立审计后，才可另行授权 custodian 创建仓库外 bundle、写入 external pins、签发一次性 request 并运行。
