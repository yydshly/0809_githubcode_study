# Slice 04 候选来源锁与预注册合同

> 状态：`scope-frozen / metadata-only / source-resolved-candidate / non-Gate-B`。本切片只冻结 `NORMALIZE-DELIVER` 的真实候选来源边界、研究合同与正式预注册元数据；不安装或执行 codec，不运行 calibration，不创建正式 holdout / defect-holdout / escape，不授予 Gate B、C1 或任何产品能力。完成证据见 [SLICE_04_EVIDENCE.md](SLICE_04_EVIDENCE.md)，实时等级仍以 [../STATUS.md](../STATUS.md) 为准。

## 目标

Slice 04 只允许以下工作：

1. 将 `REG-NORM-SHARP` 的精确上游、npm 包、Windows x64 原生 bundle、实际 bundled libvips 与第三方通知锁成一个复合候选；该候选只达到 source-resolved `candidate`，不是 Gate B。
2. 为 `NORMALIZE-DELIVER` 冻结 15 行格式政策、两份 metadata-only `CapabilityContract`、一个 QA profile、normalize / export 两份 operation-specific 五 partition lifecycle plan、两份预注册与一个 seal intent。
3. 将 Slice 03 的密封 schema / helper 只登记为 execution-envelope reference，并把独立来源分母、停止规则和角色冲突政策接入 seal intent；实际 runner、durable request ledger、trusted authority、角色分配与批准均未建立。具体一次性 request 保持 `not-issued-awaiting-custodian-bundle`。
4. 用严格 schema、validator 与负例证明这些 metadata 记录闭合、相互引用且 fail closed。

本切片没有适配器、执行器、命名硬件、codec smoke、输入解码、输出编码、质量 calibration 或正式结果，因此不能进入 Gate B，也不能把来源锁写成格式支持。

## 真实候选来源边界

`REG-NORM-SHARP` 冻结为一个复合候选：

- Sharp `v0.35.3`，上游 commit `1018449164723ba0203c1beffaba0e21f7829c18`；
- Sharp `0.35.3` npm 包及其 Windows x64 原生 bundle；
- `sharp-libvips` `1.3.2`，上游 commit `4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6`，包括 Windows x64 bundle、`versions.properties` 与 `THIRD-PARTY-NOTICES.md` 的冻结摘要；
- 上游 libvips `v8.18.3`，commit `3664cfc5dc2c5661288f5bf5a85ccc51c64c1626`，只用于解析 bundled libvips 的来源与许可边界。

六个下载物全部是 npm registry tarball：`sharp`、`@img/sharp-win32-x64`、`@img/sharp-libvips-win32-x64`、`@img/colour`、`detect-libc` 与 `semver`。它们只下载到仓库内未提交的临时 `.tmp/slice04-artifacts` 目录计算 SHA-256，并在 hash 完成后删除；没有解包、执行、安装、复制进项目制品或保留。Sharp、sharp-libvips 与 libvips 的 GitHub commit 只通过官方页面 / API 解析，没有下载 GitHub source archive 或 libvips tarball。项目依赖文件没有加入 Sharp 或 libvips，仓库中也没有第三方二进制、源码、模型、权重或示例图片。每个 npm tarball 的官方 URL、版本、取得日期、字节数与 SHA-256 以 Slice 04 candidate lock 和 [UPSTREAM.md](../UPSTREAM.md) 为准。

许可声明必须按制品分开记录：`sharp@0.35.3` 为 Apache-2.0；`@img/sharp-libvips-win32-x64@1.3.2` package metadata 为 LGPL-3.0-or-later；`@img/sharp-win32-x64@0.35.3` package metadata 为 Apache-2.0 AND LGPL-3.0-or-later；上游 libvips repo 为 LGPL-2.1-or-later。冻结的 `THIRD-PARTY-NOTICES.md` 说明 bundled LGPLv3 条目使用上游 v2 / v2.1 的 any-later 条款；不得把 package declaration 与上游 source license 合并成一个笼统标签。

candidate lock 还必须把 `versions.properties` 中的 28 个 native component 与 `THIRD-PARTY-NOTICES.md` 的逐组件 `usedUnder` 声明一一对应；只有总数或笼统的“见 notices”不够。两份 commit-fixed official raw metadata 曾临时取回到仓库根未提交的 `.tmp/slice04-metadata-audit` 做独立 hash 核对，随后整目录删除，未提交或保留：`versions.properties` 为 599 bytes / SHA-256 `cebb421de9568ae3ce8cfd66be62c3da53c2d549232c2e4327d9a9f97276c237`，`THIRD-PARTY-NOTICES.md` 为 4230 bytes / SHA-256 `25ffcfa69e28b1913ced27ec778b90f24911a1bb3021253577e8b0af55db0d49`。这不是 GitHub source archive 下载，也不改变六个 npm tarball 的 `.tmp/slice04-artifacts` 取得边界。

Sharp 与随 Windows x64 npm 交付物绑定的 libvips 是同一个复合候选，不得在对测或分母中算作两个独立比较臂。`REG-NORM-LIBVIPS` 仍是 standalone 路径，构建参数、链接 / 交付方式与实际格式库尚未锁定，继续保持 `research-only/pending-freeze`。

source-resolved `candidate` 只表示不可变来源与基础许可边界已锁，可在新的明确切片中开始适配器准备。它不表示依赖已经安装、API 可以调用、格式已经支持、性能可接受、Gate B 已通过或 C1 已取得。

## 机器制品合同

`research/slice-04/` 必须完整包含并严格验证：

- `candidate-locks/composite-sharp-win32-x64.v0.4.0.json`，ID `REG-NORM-SHARP@0.4.0`；
- `profiles/format-target.normalize-deliver.v0.4.0.json`，ID `FT-NORMALIZE-DELIVER@0.4.0`，内含 15 行矩阵；
- `contracts/cc-cap02-normalize-png.v0.4.0.json` 与 `contracts/cc-cap02-export-png.v0.4.0.json`，ID 分别为 `CC-CAP02-NORMALIZE-PNG@0.4.0`、`CC-CAP02-EXPORT-PNG@0.4.0`；
- `preregistrations/partition-plan.normalize-png.v0.4.0.json` 与 `preregistrations/partition-plan.export-png.v0.4.0.json`，ID 分别为 `PP-NORMALIZE-PNG@0.4.0`、`PP-EXPORT-PNG@0.4.0`；
- `preregistrations/qa-profile.normalize-deliver.v0.4.0.json`，ID `QA-NORMALIZE-DELIVER@0.4.0`；
- `preregistrations/preregistration.normalize-png.v0.4.0.json` 与 `preregistrations/preregistration.export-png.v0.4.0.json`，ID 分别为 `PREREG-NORMALIZE-PNG@0.4.0`、`PREREG-EXPORT-PNG@0.4.0`；
- `preregistrations/seal-intent.normalize-deliver.v0.4.0.json`，ID `SEAL-INTENT-NORMALIZE-DELIVER@0.4.0`；
- 上述记录所需的严格关闭 schema。

所有格式行继续固定 `productSupport=false`。任何 `probe-only`、`reject-only`、来源元数据、候选 API 声明或未来预期范围均不能写成 `implementationState=executable`、Gate B 或产品支持。Slice 02 的 `@0.2.0` 合同与 Slice 03 格式 / observer 记录保持不可变；Slice 04 必须使用新的 ID / version，不得回写旧制品。

两份 Slice 04 合同 `CC-CAP02-NORMALIZE-PNG@0.4.0` 与 `CC-CAP02-EXPORT-PNG@0.4.0` 只冻结输入输出、方向 / 色彩 / Alpha / metadata / 编码与失败语义、候选引用、QA 引用和证据状态。执行器、adapter hash、named hardware、实测资源、smoke 与 calibration 结果必须明确为未建立，并作为 Gate B 硬阻塞，不能用 Sharp 的官方功能说明代填。

## 两份 operation-specific 五 partition lifecycle

normalize 与 export 分别拥有一份完整计划；两份计划的 lifecycle 数量相同，但输入单位、类别、manifest、oracle prerequisite、hash 链与未来 C1 决策相互独立：

| Partition | 每项 operation 的 lifecycle 来源数 | Applicable / rejection | C1 / formal 角色 | Slice 04 实际资产状态 |
| --- | ---: | ---: | --- | --- |
| `dev/calibration` | 30 | 18 / 12 | open calibration；`formal=false`、排除于初始 C1 | `not-created` |
| `holdout` | 30 | 18 / 12 | sealed independent C1；`formal=true` | `not-created` |
| `defect/calibration` | 18 | 6 / 12 | open defect calibration；`formal=false`、排除于初始 C1 | `not-created` |
| `defect/holdout` | 18 | 6 / 12 | sealed independent C1 QA；`formal=true` | `not-created` |
| `escape` | event-driven，初始 0 | 0 / 0 | append-only diagnostic invalidation ledger；`formal=false`、排除于初始 C1 | `not-created` |

30 / 30 / 18 / 18 / 0 是每项 operation 的 lifecycle 计划，不代表文件、fixture、manifest 或 bundle 已存在，也不能把 normalize 与 export 两份计划合并成一份。每项合同的初始 C1 决策只计 sealed `holdout=30` 与 sealed `defect/holdout=18`，合计 48 个独立来源；open `dev/calibration`、open `defect/calibration` 和 escape 全部排除。两个 defect partition 必须使用未来项目原创、按 operation manifest 事前登记且专门注入该 operation 合同相关缺陷的独立来源；普通适用样本、自然失败或其他 partition 的重命名副本不能充数。

`escape` 固定 `formal=false`、`excludedFromInitialC1=true`、初始 0；它不支持成功、提前停止或 C1 分母。事件与复现尝试都 append-only；任何确认的 contract-relevant escape 都使依赖的 QA / C1 失效，并要求新版本和新的 sealed holdout，不能用复现成功、失败或驳回删除历史事件。Slice 03 的 25 个开放项目原创夹具与 Slice 02 的仓库可见 partition 资产只用于 structural rehearsal，均不得计入任一 Slice 04 计划。

每个未来来源必须具有唯一 `sourceFamilyId` 与 `captureSessionId`；exact hash、感知近重复、裁切、压缩、换色、连拍或其他同源派生不得跨 partition。`source`、`run`、`candidate` 与 reviewer rating 必须分开计数，正确拒绝、错误拒绝、错误放行、失败、超时、取消和缺失不得从声明分母静默删除。

`PP-NORMALIZE-PNG@0.4.0` 与 `PP-EXPORT-PNG@0.4.0` 都固定 `unitOfAnalysis=independent_source`。每个有限 partition 的每个来源计划 3 次运行，三次必须全部通过才算该来源通过；三个 repeat 不能当成三个独立来源，也不能只选最好一次。有限 stratum 只报告精确计数与描述率，不允许外推总体。

normalize 计划的来源单位是 raw source PNG bytes，适用 / 拒绝 / 困难类别围绕 source PNG contract；export 计划的来源单位是 `NormalizedImage.slice04.v0` artifact 及其绑定 RGBA pixel source，类别围绕 artifact shape、parent identity、file / pixel hash、color / Alpha / metadata contract。两份计划均为 dev / holdout 每个适用类别至少 6、每个拒绝类别至少 4，两个 defect partition 每个适用控制类别至少 2、每个注入缺陷类别至少 4；每个有限 partition 的三个交叉困难层各至少 2，不额外增加总分母。每个有限 partition 的 collection window 固定 `P14D`；10 个 operation-specific `FM-NORMALIZE-DELIVER-{OPERATION}-{PARTITION}@0.4.0` manifest 均为 `not-created-blocks-run`。

## QA 与两份预注册

Slice 04 只冻结离线 evidence QA 的 metadata 合同。QA 必须至少覆盖：

- 从实际输入与输出 bytes 重开核对格式、尺寸、方向、颜色、Alpha / premultiply、metadata、文件边界与规范像素；
- applicable 输入的错误拒绝与 defect 输入的错误放行分别计数；
- `unknown`、执行错误、超时、取消和缺失结果保持独立状态，不得按通过处理；
- 灾难失败、类别下限、总体门槛、确定性重复与容差规则；
- gold / reference 不能由被验收 candidate 或同一 QA 输出自证。

`QA-NORMALIZE-DELIVER@0.4.0` 事前冻结九项 byte-backed 检查：MIME / signature、dimensions、orientation、embedded sRGB、RGBA8、straight Alpha、metadata policy、文件 SHA-256 与 decoded-pixel SHA-256。门槛为 all categories must pass；applicable acceptance、defect rejection 与 identity match 必须精确为 1，false allow、false reject、failure、timeout、missing、unknown 与 catastrophic failure tolerance 必须精确为 0。它们是这一 metadata 版本的严格未来验收规则，不是已经测得的成绩。

Slice 03 `S03-TECHNICAL-OBSERVER@0.3.0` 及其实现 hash 只作为 byte-backed observer 的设计 lineage 被 pin；它硬编码 Slice 02 `CC-CAP02-NORMALIZE@0.2.0` 且只接受 `NormalizedImage`，与两份 Slice 04 合同并不兼容，不能充当正式 oracle。normalize 所需 `NormalizedImage.slice04.v0` artifact schema / independent oracle / gold 与 export 所需 `DeliveryArtifact.slice04.v0` artifact schema / independent oracle / gold 均为 `not-created-blocks-gate-b`。未来 gold 只能来自非 candidate team 的项目原创 independent source 或冻结 reference program；candidate 不能生成 gold、作为唯一 decoder oracle 或自证。

两份预注册分别绑定 normalize / export 合同与各自完整五 partition plan，并逐项冻结 suite、适用 / 拒绝 / 困难类别、lifecycle 与初始 C1 分母、重复次数、来源级聚合、主次 estimand、资格 / 排除 / 无效运行、missing / timeout / cancel、灾难失败、类别 / 总体阈值、置信方法、停止窗口、版本 hash 和治理角色槽位。

两份预注册还必须分别写明 `researchQuestion` 与 `decisionToInform`：normalize 只回答冻结 canonical PNG 输入能否生成合同一致的 `NormalizedImage.slice04.v0` 并正确拒绝不适用 / 缺陷输入，export 只回答冻结 normalized 输入能否生成可重开、byte / decoded-pixel / metadata 一致的 `DeliveryArtifact.slice04.v0` 并正确拒绝无效输入。两项结论分别服务各自合同的后续 C1 决策，不能互相继承，也不能用本切片 metadata validator 的通过代替。

本切片没有 calibration 结果。预注册中的阈值和停止规则是后续 calibration 的事前决策合同，不是已经通过的质量结论；任何需要依据 calibration 修改的字段都必须产生新的预注册与依赖 hash，不能覆盖本版本或把探索结果回填为事前冻结。

## 停止、重跑与密封意图

- 主估计量固定为注册独立来源的 3 / 3 planned repetitions 全部通过；在每来源整份计划的三次运行中最多允许 1 次合法 no-result replacement，替换后仍须 3 / 3 通过。有限 stratum 不允许人口总体推断，且不得看结果后选择较好口径。
- 有效 pass 或有效 non-pass 均不得重跑、覆盖或替换；合法 invalid 必须在产生结果前，且只允许 `runner-crash-before-result`、`custody-interruption`、`integrity-check-failure`。每来源跨三次 planned repetitions 合计最多 1 次 replacement，只能替换对应的 no-result attempt；全 attempt 历史必须保留。
- 样本不足、污染、执行中断或 custody 失败时，原计划关闭为 `inconclusive` 或 `failed`，发布新版本；不得追加到刚好过线。
- candidate、codec、contract、adapter、runner、QA、gold、阈值、分母、停止规则或正式格式边界任一改变，都要求新版本和新 hash 链。

两份预注册只预留 candidate author、QA author、oracle author、threshold author、stopping-rule author、independent approver 与 future custodian 七个互斥角色槽位及冲突政策；实际 identity assignment 与独立批准仍为 `not-assigned` / `not-approved`，因此 formal run 被阻塞。未来 custodian 不得与任何作者 / 调参者重合，candidate / QA 也不得成为自己的唯一 oracle。

Slice 04 seal intent 冻结于 `2026-08-15T00:20:45.916Z`，只 pin Slice 03 seal schemas / helper 作为 `execution-envelope-reference-only`，并固定：

```text
requestStatus=not-issued-awaiting-custodian-bundle
formalHoldoutStatus=not-created
formalDefectHoldoutStatus=not-created
actualRunnerState=not-created
durableCrossProcessConsumedRequestLedgerState=not-created
trustedAuthorityState=not-created
roleAssignmentState=not-assigned
approvalState=not-approved
formalRunBlocked=true
```

Slice 03 envelope pin 只说明未来 record 形状和 trusted-pin 要求，不是实际 runner、durable cross-process consumed-request ledger、trust authority、custody ledger、角色分配或批准。具体 request 必须绑定尚不存在的 `bundleId` 与 `bundleSha256`，因此不能在本切片签发。正式顺序只能是：

```text
preregistration / contract / candidate / QA / stopping rules frozen
→ independent custodian creates external bundle
→ external pins and isolation audit
→ issue one-time request bound to that exact bundle
→ append-only custody and run
```

下一切片也不直接创建正式 bundle；它只允许在新的范围合同下创建两项 operation artifact schema 与独立 oracle / gold、实现 adapter、冻结 named hardware 与运行语义、完成 smoke，并在项目原创开放集合上运行 calibration。只有这些 Gate B 阻塞项和 calibration 结果形成新冻结版本且通过独立审计后，才能另行授权 custodian 创建正式 holdout。

## 验收条件

- 所有 machine records 与 schemas 为严格关闭结构；关键属性全部 required，未知字段、未知 schema keyword、路径逃逸和未登记文件 fail closed。
- candidate lock 的六个 npm tarball URL / bytes / SHA-256、commit / tag / npm 版本、逐 package 许可与第三方通知相互一致；删除任一 artifact、声称下载过 GitHub source archive，或把 bundled libvips 伪装成独立候选时拒绝。
- 两份 official raw metadata 的 commit-fixed URL / bytes / SHA-256、28 项 native version 与逐组件许可必须闭合；只有汇总许可、缺项、重复组件或 notice 漂移时拒绝。
- 15 行格式矩阵完整、唯一、顺序与合同一致，且全部 `productSupport=false`；任何 executable / Gate B / C1 偷升均拒绝。
- 两份合同、QA、两份 operation-specific 五 partition plan、两份预注册与 seal intent 的 ID / version / hash 链闭合；未来时间的 `frozenAt`、两项 operation 共用一份 plan、把 open calibration / escape 纳入初始 C1、初始 C1 不是每项 48、defect 未声明 operation-specific 注入、escape 不是 append-only invalidation ledger、缺少研究问题 / 决策、分母变更、角色冲突、有效结果可重跑或提前签发 request 均拒绝。
- Slice 03 observer 被伪装成 Slice 04 compatible oracle，operation artifact schema / independent oracle / gold 被伪装成已创建，或 seal intent 声称 runner、durable ledger、trusted authority、角色 assignment / approval 已建立时拒绝。
- 仓库内没有 Slice 04 codec、adapter、正式 fixture pixels、holdout、defect-holdout、escape、bundle、request、receipt、result 或 EvidenceManifest pass 记录。
- 定向 Slice 04 测试和 `npm.cmd run verify` 全量通过；测试通过只证明 metadata 治理结构，不升级证据等级。

## 硬停止与非目标

- 不安装、解包、链接、导入或执行 Sharp、libvips 或任何 codec；不跑 API probe、smoke、benchmark 或 calibration。
- 不创建或查看正式 `dev/calibration`、`holdout`、`defect/holdout`、`escape` 像素、seed、生成器、bundle 或重建秘钥。
- 不使用真实用户照片、真人图、第三方样片、许可未解资产、模型或 checkpoint。
- 不修改 `/`、`/research/` 或其他产品 UI，不增加任务、catalog、下载或产品运行路径。
- 不进入 Matting、`MATTE-GT` / `MATTE-REAL` 扩展、主体能力或模型选择。
- 不授予 Gate B、C1、U1、E1、R1-pipeline、R1-product-validation、R1-product-release、O1、G1、V1 或 Release Gate；Release Gate 保持 `allowlist=none; registered=0; approved=0`。

越过任一硬停止项必须发布新的明确切片合同，不得以“继续 Slice 04”作为隐含授权。
