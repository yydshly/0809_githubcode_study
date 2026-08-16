# Single Image Studio

> 一个从能力研究转入产品实现的单图工作室。当前先完成真实可用的基础编辑与导出，再用可替换能力增加自动抠图；历史研究继续约束公开声明，但不再代替产品学习。

## 当前状态

本目录目前包含一套可运行的 **R0 工程探针**，用于验证单文件输入、来源绑定、任务状态、服务请求、失败恢复、比较与下载等工程约束。它不是产品首版，也不证明图片理解、推荐、抠图、自然增强、创意效果或任务专属 QA 已经成立。

| 维度 | 当前结论 |
| --- | --- |
| 研究阶段 | Slice 01–11、SourceCard / Matting baseline、continuous-alpha 和候选元数据已封存为历史 lineage。MODNet / RVM 仍是 metadata-only；模型 bytes、候选依赖安装、自然图片和推理 results 全为 0。当前不继续扩 Slice 或本地模型，C1 与产品支持仍为 0 |
| 工程与研究工具 | R0 探针、桌面研究审阅入口以及无界面的 Slice 02–05 研究设施可运行；Slice 06 的定义、诊断 runner 与 post-run validator 已闭合。结果含 24 个 terminal attempt、两条各 42-event ledger、18 份 quarantine output 和 0 artifact；全部 applicable output 的像素与 bytes 均 3/3 确定，但独立 oracle 以缺少 `sRGB` 且包含 `pHYs` 拒绝。研究结果不构成 codec 能力或产品功能 |
| 原子能力证据 | `C1 = 0` |
| 实用 / 创意证据 | `U1 = 0`、`E1 = 0` |
| 运行 / 用户证据 | `R1-pipeline = 0`、`R1-product-validation = 0`、`R1-product-release = 0`、`V1 = 0` |
| 运维 / 治理证据 | `O1 = 0`、`G1 = 0` |
| 发布状态 | 未发布；没有正式任务目录或可公开产品样例 |

所有状态以 [STATUS.md](STATUS.md) 为唯一事实源。历史材料中的“可运行”“pass”若未特别说明，只代表 R0 工程检查，不代表能力或产品门槛通过。

## 当前执行重排

从 `main@6ecd53c` 起，项目暂停继续扩展研究 Slice 和本地 Matting 模型获取，转而先完成一个用户真正能使用的单图基础编辑器。当前优先级是：

```text
基础编辑闭环
→ 产品浏览器验收
→ 基础编辑器早期内部可用性走查
→ 可替换云端抠图 Provider
→ 保留 / 擦除修正与换底
→ 抠图专项可用性走查与 beta readiness 决策
```

抠图是第二阶段的核心增强，不是产品底座；当前不要求用户安装 MODNet、RVM、SAM 或其他模型。Slice 01–11、SourceCard / Matting baseline、continuous-alpha 和候选元数据全部保留为历史研究资产，但不再自动驱动下一次提交。具体动作、里程碑、验收和恢复本地模型研究的条件见 [当前执行计划](IMPLEMENTATION_PLAN.md)。

当前 R0 页面真实可运行的用户路径仍是本地“保真整理”和可选的创意 API 工程路径；用户已确认基础编辑能力可作为下一阶段工程基线，但计划中的 5–8 人 M2 走查尚未完成。M3a 已实现独立 `BackgroundRemovalProvider` 边界、专用 status/run/cancel API、浏览器 client 与 fake-only 回归；生产默认未配置真实 Provider，不会上传图片，页面也没有抠图按钮。服务端直接验证输出 PNG 的 CRC、结构、8-bit RGBA Alpha 和尺寸，而非只相信供应商的 `hasAlpha` 声明；来源/构图版本、明确同意、幂等、拒绝、超时、取消和迟到结果均有关闭测试。这证明接口安全边界，不证明抠图质量或真实供应商可用。[ProviderEvaluationPlan v0](PROVIDER_EVALUATION_PLAN.md) 已把候选收窄为 Photoroom Basic 与 remove.bg 1.0，并冻结 12 个 source unit、最多 24 次调用、隐私/质量 no-go 和当前 0 美元授权；在账户侧 DPA、地域、训练、删除边界和密钥获得明确授权前仍不会真实调用。基础编辑器在 Provider 不可用时不受影响。

首轮产品范围已经冻结为**桌面浏览器优先**：以 Windows 桌面 Chromium 为当前基准，Chrome / Edge 的精确稳定版本、`1280 × 720` 最小视口与 `1440 × 900` 常规视口由后续 `CompatibilityProfile` 验收。手机、平板、iPhone / HEIC、Safari、Firefox 与完整响应式产品后置，不进入首轮 R1-product、O1 或 V1。

## 目标产品

未来产品面向想快速处理或改造一张现有图片、但不想理解模型、Prompt、Skill 或图像管线的普通用户：

1. 上传一张图；
2. 系统生成只包含可观察事实的 `SourceCard`；
3. 过滤不适用或未发布的效果；
4. 展示最多四个有真实参考对和变化合同的结果选项；
5. 执行确定性处理、视觉模型或生成模型组合；
6. 通过任务专属 QA 后比较并下载。

目标结构不是工具墙，而是：

```text
工程底座 → 九类原子能力 → 用户效果 → 场景配方
```

完整产品假设见 [PRODUCT.md](PRODUCT.md)，能力依赖见 [CAPABILITY_MAP.md](CAPABILITY_MAP.md)。

## 九类能力研究

1. 来源与资产；
2. 归一化与交付；
3. 图片理解；
4. 主体与区域；
5. 几何与确定性合成；
6. 质量与修复；
7. 生成式编辑；
8. QA、证据与来源；
9. 编排与推荐。

九类是研究地图，不是九个要同时开发的页面入口。长期能力研究中的主体 / 背景链为：

```text
输入归一化 → 主体检测 → Alpha Matting → 边缘净化
→ 透明主体 → 纯色换底 → 任务 QA
```

自然增强和 CR1 / CR2 创意对测是另外两条独立研究链。未来 mixed beta 要求质量、主体 / 背景、创意三个方向各至少一个效果满足完整发布公式；这不是当前 MVP-B 的 beta-readiness 决策，验证壳达标也只允许正式页面进入设计与复验。

## 运行 Slice 01 研究设施

Slice 01 已建立 3 个本项目原创的 `MATTE-GT dev/calibration` 合成 fixture、18 个 PNG 图层、rights record、FixtureManifest、严格 catalog allowlist 和只读研究入口。它们只用于验证研究方法、目录、hash、资源隔离和审阅交互，证据状态固定为 `C1=0 / method-rehearsal`。

首次运行或生成器变更后：

```powershell
cd projects/single-image-studio
npm.cmd run research:prepare
```

启动本地服务：

```powershell
npm.cmd start
```

打开 `http://127.0.0.1:4177/research/`。该入口只在本机模式读取 catalog 明确列出的 `public-synthetic` PNG；LAN 模式会拒绝研究 catalog 和资源。它支持来源、Alpha、前景、黑 / 白 / 高饱和彩底检查、结构化缺陷初判和提交后解盲，但当前提交不持久保存，也不代表真实 Matting、QA 或产品闭环已成立。

研究目录、生成与验证边界见 [research/README.md](research/README.md)，本次实现和覆盖合同见 [research/SLICE_01_CONTRACT.md](research/SLICE_01_CONTRACT.md)，实际自动化、HTTP 与浏览器结果见 [research/SLICE_01_EVIDENCE.md](research/SLICE_01_EVIDENCE.md)。

## 运行 Slice 02 合同与隔离夹具

Slice 02 冻结了输入归一化、正式 PNG `DeliveryArtifact` 导出、`SourceCard.v0` 和受控合成背景 Matting simple baseline 的四份研究合同；同时为 `NORMALIZE-DELIVER` 与 `MATTE-GT` 建立五 partition 的项目原创合成结构夹具。它没有扩展 `/` 或 `/research/` UI，也没有引入模型、权重、第三方图片或真实用户照片。

```powershell
npm.cmd run research:prepare
npm.cmd run verify
```

参考适配器只接受窄范围、最大 `1 MiB` / `256 × 256` 的 RGBA8 filter-0 PNG fixture；超出范围会拒绝。仓库可见 holdout 只证明隔离机制，不能充当未来 C1 的密封质量 holdout。完整边界见 [research/SLICE_02_CONTRACT.md](research/SLICE_02_CONTRACT.md)，验收记录见 [research/SLICE_02_EVIDENCE.md](research/SLICE_02_EVIDENCE.md)。

## 运行 Slice 03 格式、observer 与密封仪式研究

Slice 03 冻结 15 行 `NORMALIZE-DELIVER` 格式矩阵、逐行 profile 和独立 byte-backed technical observer，并用 25 个项目原创开放夹具检查 canonical PNG 与格式拒绝边界。JPEG / WebP 仅做 header probe 后稳定拒绝；所有矩阵行均为 `productSupport=false`，没有实现正式解码、归一化或导出。

密封仪式测试只在系统临时目录生成 mock metadata，校验角色、hash 链、一次性运行、逐 attempt custody、外部 trusted pins 与完整 Git 仓库真实路径边界后立即清理。仓库中没有正式 holdout / defect-holdout / escape，正式 holdout 状态仍为 `not-created`。

```powershell
npm.cmd run research:prepare
npm.cmd run verify
```

完整边界见 [research/SLICE_03_CONTRACT.md](research/SLICE_03_CONTRACT.md)，验收记录见 [research/SLICE_03_EVIDENCE.md](research/SLICE_03_EVIDENCE.md)。该切片没有扩展 `/` 或 `/research/` UI，也没有使用真实照片、模型权重或第三方图像依赖。

## 验证 Slice 04 候选锁与预注册 metadata

Slice 04 把 `REG-NORM-SHARP` 锁为 source-resolved 复合候选：Sharp `v0.35.3`、Windows x64 npm / native bundle、`sharp-libvips@1.3.2` 的 bundled libvips 来源与通知，以及上游 libvips `v8.18.3`。Sharp 与 bundled libvips 是一个候选，不是两个比较臂；standalone `REG-NORM-LIBVIPS` 仍为 `research-only/pending-freeze`。

六个 npm registry tarball 只下载到仓库内未提交的临时 `.tmp/slice04-artifacts` 计算 SHA-256，随后删除；没有解包、执行、安装或保留，GitHub commits 只经官方页面 / API 解析，项目依赖也没有增加 Sharp / libvips。Slice 04 机器记录为 10 records / 7 schemas：1 candidate lock、15 行格式矩阵、2 份 metadata-only 合同、normalize / export 各 1 份五 partition plan、1 份 QA profile、2 份预注册和 1 份 seal intent。全部格式仍为 `productSupport=false`。

```powershell
npm.cmd run research:prepare
node --test tests/research-slice04.test.mjs
npm.cmd run verify
```

normalize / export 每项都计划 `30 dev/calibration + 30 holdout + 18 defect/calibration + 18 defect/holdout + event-driven-0 escape`；初始 C1 只计 sealed holdout 30 + sealed defect-holdout 18 = 48，open calibration 与 append-only escape 排除。有限来源必须 3 / 3 repeats 全过，每来源跨三次最多一次仅替代 no-result invalid。Slice 03 observer 与 seal 只作不兼容 design lineage / execution-envelope reference；operation artifact schema / oracle、runner、durable ledger、trusted authority、角色 assignment / approval 与所有像素均未创建，request 为 `not-issued-awaiting-custodian-bundle`，因此非 Gate B。

完整边界见 [research/SLICE_04_CONTRACT.md](research/SLICE_04_CONTRACT.md)，实际 hash 与验收结果见 [research/SLICE_04_EVIDENCE.md](research/SLICE_04_EVIDENCE.md)。后续边界由 [Slice 05 范围合同](research/SLICE_05_CONTRACT.md) 冻结；该合同保留当时 `implementation-not-started` 的历史事实，当前进度见 [Slice 05 定义冻结证据](research/SLICE_05_EVIDENCE.md)。

## Slice 05 定义冻结与真实 smoke 结果

[Slice 05 范围合同](research/SLICE_05_CONTRACT.md) 将范围收窄为 canonical PNG 的 normalize / export 两项独立 operation；该合同不原地改写。当前新的 `@0.5.0` machine definition 已于 `2026-08-15T04:23:38.389Z` 冻结：25 份 strict schema、6 份 operation-specific manifest、108 份 source record / raw open asset、54 份 export `NormalizedImage` 输入和 54 份 independent gold。definition index `contentHash` 为 `d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271`，完整 368-file tree SHA-256 为 `108812d4eec84fa3037f8540d8fb273748982beb5e5f28a07eb7cda93e1218f2`。

定义树还 pin `REG-NORM-SHARP@0.5.0` installed runtime closure、normalize / export 两份 `CapabilityContract@0.5.0`、独立 oracle / gold、candidate adapter / isolated worker、named hardware、local runner / fault semantics、Gate B plan 和两份开放 calibration preregistration。runtime inventory 阶段只导入 Sharp 读取版本，没有处理图片；该定义基线提交 / 推送后，唯一注册的真实 smoke 于 `2026-08-15T04:52:05.490Z` 至 `2026-08-15T04:52:10.426Z` 运行并持久化 116 files / 8 directories / 357303 bytes，result tree SHA-256 为 `e6cd4aea45419cc4fd02724555fb439191162ca4f5aaab6a00834f8898d8256b`。

normalize summary 为 `6 pass / 12 non-pass`：9 次 applicable attempt 全部 `S05_OUTPUT_ORACLE_REJECTED`，另 3 次 sRGB rejection 预期 `S05_INPUT_SRGB_REQUIRED`、实际 `S05_INPUT_CHUNK_PROFILE_INVALID`。export summary 为 `9 pass / 9 non-pass`：9 次 applicable attempt 全部 `S05_OUTPUT_ORACLE_REJECTED`，9 次 rejection 全部按预期通过。两份 Gate B decision 均为 `denied-not-entered`，`calibrationAuthorized=false`；36 次 attempt 没有发布任何 artifact。fault semantics 注入场景 `6/6` 通过；两份 operation summary 的 registered candidate-attempt counters 中 invalid / timeout / cancelled / unknown reconciliation / replacement 均为 0。

首次未注册调用因 sandbox `mkdir EPERM` 在任何 request / claim / result 之前停止；随后获批调用是唯一注册 smoke，不是根据结果选择的重跑。持久化记录只能证明 worker IPC 返回并通过严格响应校验的 output bytes，随后被 precommit independent oracle 拒绝；进程退出确认未持久化（`workerExitConfirmed=null`），具体 oracle 子因保持 unknown，不补猜也不重跑。当前版本的 normalize / export calibration 均被禁止。

下一步不是修补或重跑 `@0.5.0`、`@0.6.0` 或 `@0.7.0`。Slice 06 已定位 Sharp PNG profile 缺陷；Slice 07 的复合候选随后证明 18 / 18 applicable outputs 可以满足 closed PNG contract，但 frozen rejection driver binding 失配，Gate B 仍双拒绝。任何修正都必须进入新版本、新定义和新的 registered evaluation。

Slice 05 继续禁止正式 holdout、defect-holdout、escape、formal bundle / request / receipt / result / EvidenceManifest，也不扩产品 UI、server 运行路径、Matting、真实照片或模型权重。定义冻结、自动测试和这次失败的真实 smoke 都不能据此声称真实归一化、正式导出或产品能力；完整 pins、结果与限制见 [research/SLICE_05_EVIDENCE.md](research/SLICE_05_EVIDENCE.md)，全部证据轴继续为 0。

## Slice 06 diagnostic characterization 已闭合

[Slice 06 范围合同](research/SLICE_06_CONTRACT.md) 冻结的是一个两阶段桥接边界，不是新的 Gate-B smoke。canonical definition 于 `2026-08-15T08:17:06.288Z` 冻结；随后唯一注册 invocation 顺序完成 normalize / export 各 12 次，共 24 次、零 replacement。post-run 树为 152 files / 34 directories / 583,198 bytes，SHA-256 `4c82a65083ccc1675a65d632010360d991171255ec5ef74b4a50092f701dd146`；完整事实与 pins 见 [Slice 06 evidence](research/SLICE_06_EVIDENCE.md)。

两项 summary 都是 `characterization-complete`：各 `9` 个 oracle non-pass + `3` 个精确 worker-free preflight rejection，且 `inconclusive=0 / protocol-failed=0`。18 份 candidate output 均 `workerExitConfirmed=true`、telemetry 完整、bytes / pixels / classification / oracle outcome / runtime 三次一致；独立重开一致得到 `IHDR,pHYs,IDAT,IEND`、filter 仅为 `0`、像素 hash 与预期相同，primary code 均为 `S06_ORACLE_PNG_SRGB_REQUIRED`。这不产生 Gate B、calibration、artifact、C1 或产品支持。

诊断只允许保存标记为非产品、排除于 Gate B 的 output specimen / quarantine，以及完整 worker observation、精确 independent-oracle 子因和 terminal closure。它没有 Gate B decision authority，`calibrationAuthorized=false` 固定不变；即使 24 次全部闭合，也只供下一切片选择或修正 candidate，并由下一切片另行冻结正式 Gate-B smoke。`@0.5.0` 不得重跑或进入 calibration；本切片不使用真实照片、第三方图片、模型权重，不创建 holdout / defect-holdout / escape，也不修改产品 UI / server。

## Slice 07 canonical PNG candidate 范围已冻结

[Slice 07 范围合同](research/SLICE_07_CONTRACT.md) 计划 `REG-NORM-SHARP-CANONICAL-PNG@0.7.0`：worker 返回 RGBA8 与尺寸，候选自有 encoder 只写 `IHDR,sRGB,IDAT,IEND`、filter 0，不得调用 Sharp PNG encoder 后再 patch，也不得复用 independent oracle / reference encoder。normalize / export 各冻结 3 applicable + 3 rejection sources、每个 3 次，共 36 attempts；两项 Gate B 都 pass 后，才可在后续切片讨论 calibration。

Slice 07 results-zero definition 提交 / 推送后，唯一 registered smoke 已闭合：36 / 36 terminal，normalize / export 各 9 pass + 9 non-pass。18 / 18 applicable attempts 的 canonical PNG 全部通过 independent oracle；18 个 rejection 因 driver executor binding 漏传分类字段而全部得到 `ERR_INVALID_ARG_TYPE`，不是候选像素或 encoder 失败。两项 Gate B 均 `denied-closed-non-pass`，calibration 禁止，不得重跑。详见 [Slice 07 result evidence](research/SLICE_07_RESULT_EVIDENCE.md)。

## Slice 08 已关闭为 fail-closed protocol failure

[Slice 08 范围合同](research/SLICE_08_CONTRACT.md) 版本化 runner → driver 的 closed `caseContext` 边界。results-zero definition 于 `2026-08-15T13:37:23.038Z` 冻结并推送；唯一 registered invocation 随后写入首个 normalize request 与 `attempt-started`，但 actual-case driver 把 Slice 05 gold 的 `goldRecordId` 错读为 `id`，因此以 `S08_CASE_MATERIAL_INVALID` 在 Sharp worker 前停止。不可重放的 partial tree 只有 2 files / 3,779 bytes，SHA-256 `2dd9e53fcd2163913a47c16f92f9a31733ef3ffc491949e6c1a31464774da0d6`；terminal、output、closure、oracle、summary、decision 均为 0，export 未启动。中央验证能重开 request 与 sole ledger event 并返回 0 issues，但没有 Gate B decision，calibration 继续禁止。任何修复必须进入新版本；详见 [Slice 08 evidence](research/SLICE_08_EVIDENCE.md)。

## Slice 09 registered Gate-B smoke 已关闭并双 pass

[Slice 09 合同](research/SLICE_09_CONTRACT.md) 要求 production runner / resolver / driver 只通过 closed、self-hashed `goldIdentity` 使用真实 `goldRecordId`，并绑定 content / file / pixel / source / manifest identity；明确禁止 `.id` fallback。[Gold identity](scripts/research-gateb-gold-identity-slice09.mjs)、[case context](scripts/research-gateb-case-context-slice09.mjs)、[actual-case driver](scripts/research-gateb-driver-slice09.mjs)、[durable operation runner](scripts/research-gateb-runner-slice09.mjs)、[registered admission](scripts/research-run-slice09.mjs)、[definition generator](scripts/research-generate-slice09.mjs) 和 [central validator](scripts/research-validate-slice09.mjs) 已实现。canonical definition 于 `2026-08-15T15:17:03.776Z` 冻结并推送；唯一 registered smoke 随后闭合为 186 files / 36 terminal results / 18 artifact closures。normalize / export 各 9 applicable artifact pass + 9 exact rejection pass，6 / 6 sources 均 3/3 deterministic，两项 Gate B decision 均为 pass。结果树 SHA-256 为 `2f6bc6c2d7490568db0facd8b2615f74294fbb6e1b3a09828bf7a654750cf451`。不得重跑；`calibrationAuthorized=false`、C1=0、productSupport=false，详见 [Slice 09 evidence](research/SLICE_09_EVIDENCE.md)。

## Slice 10 open calibration 已 fail closed

[Slice 10 合同](research/SLICE_10_CONTRACT.md) 新建 `@0.10.0` calibration identity，不改写 Slice 09。normalize / export 各冻结 48 sources × 3，合计 96 / 288，零 retry / replacement；results-zero definition 已先提交推送。唯一 registered invocation 随后在首个 normalize applicable request 以 `S10_EXPECTED_OUTPUT_INVALID` 停止：case driver 把完整 gold expected object 交给只接受 12 个 canonical output keys 的 Slice 07 raw adapter，故在启动 Sharp worker 前 fail closed。export 未启动，output / artifact / oracle / summary / runtime-end 均为 0。不可变 terminal 还把该路径错误记成 `workerInvoked=true`，central 因 `RESULT_WORKER_LIFECYCLE_INVALID` 拒绝整份结果。Slice 10 不得重跑；完整树 pins、时序与后续 Slice 11 边界见 [Slice 10 evidence](research/SLICE_10_EVIDENCE.md)。

## Slice 11 scope 已冻结

[Slice 11 合同](research/SLICE_11_CONTRACT.md) 建立 `@0.11.0` 新身份，只修 gold-to-adapter projection 与真实 worker lifecycle。results-zero definition 于 `2026-08-15T23:01:50.529Z` 冻结并以 commit `33f24395e9ad2cd672d156a6f491e02118a62ed1` 推送。唯一 registered invocation 只产生 operation claim 与 runtime start observation，随后因 canonical JSON SHA 的末尾换行口径不一致而以 `S11_RUNTIME_START_DRIFT` 停止；actual request / attempt / worker / pixel / terminal / export 均为 0。两文件 result tree SHA-256 为 `a638a17afa69ab41015181b61ef7a64fa58e9057a9f64f7bc29bfe2f35dd3689`。central validator 将该形状封闭并拒绝 replay；43 / 43 Slice 11 tests 与 522 / 522 全量测试通过。精确 pins 与执行边界见 [Slice 11 evidence](research/SLICE_11_EVIDENCE.md)。

## SourceCard.v0 + Matting baseline 纵向结果

现有 3 个项目原创 `MATTE-GT dev/calibration` 场景已通过同一条研究路径生成严格 `NormalizedImage`、`SourceCard.v0`、fixture-known `SubjectMap` 与 `AlphaMatte.v0`。SourceCard 只确认 byte-backed 技术事实，语义观察保持 explicit unknown。固定 10/88 的 color-distance baseline 对 hard-edge 与 interior-hole 完全一致；soft-edge MAE 为 `6.93140625`、IoU@128 为 `0.922269839`，视觉上明显把羽化边缘变硬。因此它只作为比较下限，不是产品 fallback。完整报告、文件 hash 与非证据边界见 [SourceCard + Matting baseline evidence](research/SOURCECARD_MATTING_BASELINE_EVIDENCE.md)。

后续的 `SCO-EXPOSURE-SIGNALS@0.1.0` 已把亮度均值、分位数和极暗/极亮比例冻结为可复算的客观信号；四个原创 pattern 4 / 4 符合预期，三个 MATTE-GT 输入均落在 `balanced`。但自然图片校准尚未冻结，所以 `quality.exposure` 仍必须是 `unknown`。同时 MODNet 与 RVM MobileNetV3 已登记为连续 Alpha 候选；只有来源与许可已解析，模型文件仍 `not-downloaded`。详见 [exposure observer 与候选 evidence](research/SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md)。

候选中立的 `CC-CAP04-CONTINUOUS-ALPHA-EVAL@0.1.0` 也已冻结：6 个原创 synthetic 来源覆盖 hard、hole、radial soft、diagonal feather、thin structure 与 semi-transparent；每候选固定 3 次冷启动，共 18 次，两个候选 planned 36 次。定义特别把 boundary MAE 与二值 IoU 分开，避免硬化 Alpha 后仍靠阈值分数过关。当前结果数为 0，阈值和自然人像集均未创建。见 [Continuous Alpha evaluation evidence](research/CONTINUOUS_ALPHA_EVALUATION_EVIDENCE.md)。

后续的 `DEF-MATTE-ACQUISITION-GOVERNANCE@0.1.0` 只冻结获取与隐私治理：自然人像 planned minimum 为 dev/holdout 24/24、defect/defect-holdout 12/12，所有实际 material 仍未创建；MODNet 因官方 immutable direct artifact 未解析而硬阻断，RVM 虽有官方 release URL，仍因 bytes/SHA/SBOM/runtime/GPL 决策缺失而禁止获取。见 [Matting acquisition governance evidence](research/MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md)。

## 运行 R0 工程探针

需要 Node.js 22 或更高版本。本项目不依赖兄弟项目；`package.json` 现仅为 Slice 05 本地开放研究精确声明 `sharp@0.35.3` 与 `@img/sharp-win32-x64@0.35.3` 两项 devDependency。R0 server / web 路径没有接入该 candidate，`node_modules/` 不提交，依赖存在不表示产品 runtime 或格式支持。

```powershell
cd projects/single-image-studio
npm.cmd start
```

打开 `http://127.0.0.1:4177/`。未配置密钥时，可用合成演示图验证本地 Canvas 处理和工程状态闭环；这只是确定性画布探针，不是已经验证的“自然增强”。

若服务端环境中设置 `OPENAI_API_KEY`，R0 探针可发送 CR1 图片编辑请求。当前路径没有真实 Source Card、冻结参考对或创意内容 QA，不能升级为 E1 或 R1-product 证据，也不应用敏感真人图测试。

### 手机局域网探针

电脑与手机连接同一个可信私人 Wi-Fi 后，可运行：

```powershell
npm.cmd run mobile
```

该模式只用于历史小屏与局域网访问探测，会强制关闭 AI 接口；它不是首轮产品范围、正式移动端验收、HTTPS 部署或产品发布。局域网传输使用明文 HTTP，本轮只允许合成图或确认不含真人、位置、证件、品牌和其他敏感信息的测试图，不应用真实用户照片验证。

工程检查：

```powershell
npm.cmd run verify
```

`verify` 会先核对研究资产和 manifest，再运行全量测试及语法检查。R0 的浏览器证据边界见 [BROWSER_VALIDATION.md](BROWSER_VALIDATION.md)。

## 文档权威顺序

| 文档 | 角色 |
| --- | --- |
| [STATUS.md](STATUS.md) | 当前研究、工程、能力和发布状态的唯一事实源 |
| [CAPABILITY_MAP.md](CAPABILITY_MAP.md) | 九类原子能力、产物和依赖 |
| [CAPABILITY_REGISTRY.md](CAPABILITY_REGISTRY.md) | 候选引擎、精确版本、许可、资源和证据状态 |
| [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md) | C/U/E/R/O/G/V 与发布门禁 |
| [RESEARCH_RECORD_TEMPLATES.md](RESEARCH_RECORD_TEMPLATES.md) | 夹具、预注册、R1、O1、证据和 Release Gate 的可填写模板 |
| [TASK_CATALOG.md](TASK_CATALOG.md) | 用户效果、场景配方和旧探针 ID 映射 |
| [PRODUCT.md](PRODUCT.md) | 目标产品与体验假设 |
| [V1_FLOW.md](V1_FLOW.md) | 未来最小冻结验证界面与目标产品交互契约；不代表 R0 已实现 |
| [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md) | 数据流、最小留存、删除、安全与远程服务前置门槛 |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | 桌面首轮的逻辑组件、状态归属、持久化、队列、对象与恢复原则 |
| [UI_SURFACES_AND_ACCESSIBILITY.md](UI_SURFACES_AND_ACCESSIBILITY.md) | R0、研究审阅、验证、正式桌面与运维支持 surface 的边界 |
| [OBSERVABILITY_AND_OPERATIONS.md](OBSERVABILITY_AND_OPERATIONS.md) | Run 事件、错误、日志、trace、metrics、性能、告警与问题定位 |
| [QUALITY_AND_COMPATIBILITY.md](QUALITY_AND_COMPATIBILITY.md) | 桌面浏览器、文件、色彩、测试分层和兼容性 profile |
| [DEPLOYMENT_RELEASE_AND_RECOVERY.md](DEPLOYMENT_RELEASE_AND_RECOVERY.md) | 部署版本、运行态迁移、灰度、回滚、备份与恢复 |
| [RESEARCH.md](RESEARCH.md) | 待回答问题、研究设计和用户研究 |
| [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) | 形成性测试和冻结 V1 验证的参与者、任务分配、同意与数据协议 |
| [ROADMAP.md](ROADMAP.md) | 从文档归一到邀请测试的阶段顺序 |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | 下一阶段研究工作包与退出条件 |
| [research/README.md](research/README.md) | 可执行研究目录、合成夹具、生成与校验命令 |
| [research/SLICE_01_CONTRACT.md](research/SLICE_01_CONTRACT.md) | 第一刀实现授权、范围、桌面研究 UI 与覆盖矩阵 |
| [research/SLICE_01_EVIDENCE.md](research/SLICE_01_EVIDENCE.md) | Slice 01 自动化、HTTP、浏览器主路径、错误路径与兼容限制 |
| [research/SLICE_02_CONTRACT.md](research/SLICE_02_CONTRACT.md) | Slice 02 四份冻结研究合同、参考适配器与五 partition 隔离边界 |
| [research/SLICE_02_EVIDENCE.md](research/SLICE_02_EVIDENCE.md) | Slice 02 确定性生成、合同 / 资产 hash、隔离与负例验收记录 |
| [research/SLICE_03_CONTRACT.md](research/SLICE_03_CONTRACT.md) | Slice 03 格式政策、字节级技术 observer 与仓库外密封仪式的冻结范围 |
| [research/SLICE_03_EVIDENCE.md](research/SLICE_03_EVIDENCE.md) | Slice 03 矩阵 / profile、开放夹具、observer、密封仪式和 fail-closed 验收记录 |
| [research/SLICE_04_CONTRACT.md](research/SLICE_04_CONTRACT.md) | Slice 04 Sharp 复合候选来源锁、完整预注册与未签发 seal request 边界 |
| [research/SLICE_04_EVIDENCE.md](research/SLICE_04_EVIDENCE.md) | Slice 04 metadata 制品、上游 hash、负例和非 Gate B 验收记录 |
| [research/SLICE_05_CONTRACT.md](research/SLICE_05_CONTRACT.md) | Slice 05 operation-specific Gate B smoke 与开放 calibration 的历史范围冻结；不随当前进度原地改写 |
| [research/SLICE_05_EVIDENCE.md](research/SLICE_05_EVIDENCE.md) | Slice 05 machine definition、runtime closure、真实 smoke non-pass、hash、Gate B 拒绝与 calibration 禁止边界 |
| [research/SLICE_06_CONTRACT.md](research/SLICE_06_CONTRACT.md) | Slice 06 新版本开放 diagnostic characterization、24 次计划分母、无 Gate B authority 与禁止 calibration 的范围冻结 |
| [research/SLICE_06_EVIDENCE.md](research/SLICE_06_EVIDENCE.md) | Slice 06 唯一注册 diagnostic 的结果树、oracle 子因、determinism、ledger 与 non-capability 边界 |
| [research/slice-06/README.md](research/slice-06/README.md) | Slice 06 Phase B protocol、Phase C results-zero definition、机器树 pins、fake-only 验收与未来 result 边界 |
| [research/SLICE_07_CONTRACT.md](research/SLICE_07_CONTRACT.md) | Slice 07 Sharp 像素处理 + candidate-owned canonical PNG encoder、36-attempt Gate-B smoke 与禁止 calibration 的范围合同 |
| [research/SLICE_07_EVIDENCE.md](research/SLICE_07_EVIDENCE.md) | Slice 07 results-zero definition pins、计数、校验与证据边界 |
| [research/SLICE_07_RESULT_EVIDENCE.md](research/SLICE_07_RESULT_EVIDENCE.md) | Slice 07 唯一 registered smoke、Gate-B 双拒绝与 driver binding 根因 |
| [research/slice-07/README.md](research/slice-07/README.md) | Slice 07 frozen definition workspace 与执行前硬停止 |
| [research/SLICE_08_CONTRACT.md](research/SLICE_08_CONTRACT.md) | Slice 08 typed case-context、新 36-attempt 分母与禁止选择性补跑的 scope-only 合同 |
| [research/SLICE_08_EVIDENCE.md](research/SLICE_08_EVIDENCE.md) | Slice 08 results-zero definition 与已封存 partial protocol-failure 的 UTC、tree pins、分母、验证和硬停止 |
| [research/slice-08/README.md](research/slice-08/README.md) | Slice 08 typed protocol / runner / definition tooling workspace 与定义前硬停止 |
| [research/SLICE_09_CONTRACT.md](research/SLICE_09_CONTRACT.md) | Slice 09 gold identity、新 36-attempt 分母与禁止重放的 scope-only 合同 |
| [research/SLICE_09_EVIDENCE.md](research/SLICE_09_EVIDENCE.md) | Slice 09 definition、唯一 registered Gate-B smoke、结果树、ledger、双 pass 与非产品边界 |
| [research/slice-09/README.md](research/slice-09/README.md) | Slice 09 已冻结的 definition 与 registered result workspace |
| [research/SLICE_10_CONTRACT.md](research/SLICE_10_CONTRACT.md) | Slice 10 开放 calibration 的 96-source / 288-attempt 分母、零重试、停止规则与非 C1 边界 |
| [research/SLICE_10_EVIDENCE.md](research/SLICE_10_EVIDENCE.md) | Slice 10 唯一 registered invocation 的 4-file failure tree、协议根因、lifecycle 失真与禁止重跑边界 |
| [research/slice-10/README.md](research/slice-10/README.md) | Slice 10 已冻结的 results-zero machine definition workspace（保持其冻结时口径） |
| [research/SLICE_11_CONTRACT.md](research/SLICE_11_CONTRACT.md) | Slice 11 expected projection、worker lifecycle、新 96 / 288 分母与非 C1 边界 |
| [research/slice-11/README.md](research/slice-11/README.md) | Slice 11 冻结 definition workspace；运行后的不可变 startup-failure 事实见外部 evidence |
| [research/SOURCECARD_MATTING_BASELINE_EVIDENCE.md](research/SOURCECARD_MATTING_BASELINE_EVIDENCE.md) | 3 个原创合成场景的 SourceCard.v0 + MATTE-SIMPLE 纵向报告与精确指标 |
| [research/SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md](research/SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md) | 客观 exposure-signal observer 与 MODNet / RVM 连续 Alpha 候选许可登记 |
| [research/CONTINUOUS_ALPHA_EVALUATION_EVIDENCE.md](research/CONTINUOUS_ALPHA_EVALUATION_EVIDENCE.md) | 6-source / 12-asset continuous-alpha results-zero 合同、分母、指标与精确 pins |
| [research/MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md](research/MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md) | 自然人像分区/权利/隐私治理与 MODNet/RVM 获取、runtime 硬停止条件 |
| [UPSTREAM.md](UPSTREAM.md) | 第三方来源、精确版本、市场入口、许可和本地复制边界的事实账本 |
| [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md) | 市场比较口径、已固定入口、空缺研究簇与产品决策规则 |

[CAPABILITY_REVIEW.md](CAPABILITY_REVIEW.md)、[EFFECT_SHORTLIST.md](EFFECT_SHORTLIST.md) 与 [PORTRAIT_PARAMETERS.md](PORTRAIT_PARAMETERS.md) 分别是历史 Skill 审计、创意实验附录和报名头像场景草案，不覆盖上述当前规范。[DELIVERY_CONTRACT.md](DELIVERY_CONTRACT.md) 与 [BROWSER_VALIDATION.md](BROWSER_VALIDATION.md) 只记录 R0 工程探针。

## 研究边界

- Slice 01–11 的研究设施、项目原创合成夹具、codec lineage 与不可变结果保持只读。Slice 09 两项 Gate B 均通过；Slice 10 在 1 / 288、Slice 11 在 0 / 288 处分别因协议错误 fail closed；这些都不是 formal holdout、C1 或产品支持。项目停止新增 normalize / export runner slice和当前 MVP 的模型 / 权重获取；下一步建设基础编辑器产品路径，任何历史 research candidate 若未来接入 server / web 都必须以新的产品合同和测试重新登记。
- 首轮验证和发布只声明冻结的桌面浏览器环境；移动与未验收桌面浏览器不得从 R0 样式或代码存在推导为支持。
- `single-image-studio` 不通过相对路径导入兄弟项目代码或资产。
- GitHub 仓库代码许可不自动覆盖模型权重、训练数据或输出用途。
- 未进入发布 allowlist 的来源、参考、结果和失败图不得作为产品样例。
- 普通报名头像是场景配方；官方护照、签证或证件 profile 继续独立验证。
- 多图逐张、多图合集、商品套件和产品模板均后置。

来源和许可边界见 [UPSTREAM.md](UPSTREAM.md)。
