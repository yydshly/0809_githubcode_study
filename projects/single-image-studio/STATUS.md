# Single Image Studio 状态

> 本文件是项目状态的唯一事实来源（single source of truth）。其他文档负责说明目标、研究方法或历史记录；若其中的阶段、证据或发布表述与本文件冲突，以本文件为准。

最后核对：2026-08-16

## 一句话结论

`projects/single-image-studio` 已从“研究优先”转入“产品优先”，但现有网页仍只是可运行的 **R0 工程流程探针**，不是已经完成或可发布的图片产品。九类原子能力尚无一项取得 C1，实用效果 U1、创意效果 E1、R1-pipeline、R1-product-validation、R1-product-release、运维 O1、治理 G1、用户价值 V1 与逐项 Release Gate 均未取得。

## 当前产品执行方向（2026-08-16 重排）

`main@6ecd53c` 记录为从研究优先切换到产品优先的基线。Slice 01–11、SourceCard / Matting baseline、continuous-alpha 定义和候选元数据继续作为只读研究 lineage 保存，但不再自动决定下一次开发；不创建 Slice 12，也不继续为当前 MVP 获取 MODNet / RVM 权重或建设本地模型运行时。

当前 active plan 以 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) 为准：

1. 先完成不依赖模型的单图基础编辑闭环：正确预览、裁剪、旋转、尺寸、基础光色、格式 / 质量、比较与可靠导出；
2. 用项目提供图片完成基础编辑器的早期内部可用性走查，先解决导航、编辑理解和下载问题；
3. 再以可替换云端 `BackgroundRemovalProvider` 接入自动抠图，不要求用户安装模型；
4. 自动抠图必须配套最小保留 / 擦除修正、透明预览和纯色换底，并做独立的抠图可用性复核；
5. 只有真实产品数据证明成本、隐私、延迟或离线需求不可接受时，才恢复浏览器 / 本地模型路线；
6. C/U/E/R/O/G/V 与 Release Gate 继续约束公开声明和正式发布，但不阻止开发内部产品试用版和开展不使用参与者图片的早期内部可用性走查。

M0 产品基线已完成，M1a renderer 合同已经接入 R0 页面的本地“保真整理”路径：不可变 `EditState`、100-step 默认 / 200-step 硬上限 history、旋转 / 翻转 / 归一化裁切 / fit resize / RGB 调整 / PNG-JPEG 输出合同，以及“方向归一化 → 变换画布 → 输出画布 → 编码 bytes 独立重开”的执行路径。JPEG / PNG / WebP 的 EXIF orientation 1–8 已由独立容器解析器读取，受控 `ImageBitmap` 解码关闭浏览器自动旋转，再由透明 Canvas 使用冻结矩阵归一化。编码前后像素会核对 Alpha 与可见的预乘颜色；Alpha=0 的 hidden RGB 明确不作可见事实。最终 PNG / JPEG bytes 会拒绝 EXIF / XMP / IPTC / 文本 / 注释类私密 metadata，同时允许把 ICC / sRGB 颜色描述单独留待色彩核验。M1b 页面工作区按变换后的来源比例完整显示图片；固定比例裁剪、自由裁剪、旋转 / 翻转、最长边上限与最终 renderer 共享同一状态。用户已确认基础能力可作为继续工程推进的基线，但这不等于计划中的 5–8 人 M2 走查已经完成。M3a 已建立独立 `BackgroundRemovalProvider`、专用 run/status/cancel API、浏览器 client、PhotoRoom Basic 远程 adapter 与用户逐次同意界面；默认不会外发图片，只有密钥和 `PHOTOROOM_ENABLED=true` 同时存在才启用，fake provider 仅测试注入。请求绑定来源 hash、source / geometry revision 和本次明确同意；成功输出由服务端直接检查 PNG chunk/CRC、8-bit RGBA Alpha、尺寸与动画边界，拒绝、超时、取消、迟到响应和幂等冲突均 fail closed。M3b 的 [ProviderEvaluationPlan v0](PROVIDER_EVALUATION_PLAN.md) 仍冻结 12-source/24-call 最大分母、隐私/质量 no-go 和当前 0 美元授权。当前已用 1 个项目原创 synthetic 完成一次 PhotoRoom 免费沙盒协议探针，返回 RGBA PNG 且 Alpha 结构可复算；它带水印、没有供应商 receipt header，也未进入冻结 12-source 分母。当前仍没有正式 Alpha 质量证明、mask 修正或纯色换底能力。

## 当前冻结的产品环境

- 首轮验证、正式页面和邀请 beta 只以**桌面浏览器**为范围；当前基准为 Windows 桌面 Chromium，Chrome / Edge 最新稳定版是首批候选，精确版本由 `CompatibilityProfile` 冻结。
- 首轮视口候选为 `1280 × 720` 最小目标与 `1440 × 900` 常规审查；键盘、鼠标、缩放、DPR 与可访问性范围须逐项验收。
- Slice 01 已在 Codex 内置 Chromium 的实际 `1280 × 720` viewport 做可见检查，并以本机 Chrome `151.0.7922.138`、Edge `151.0.4129.78` 分别在 `1280 × 720` 与 `1440 × 900` 完成自动化主路径；空目录与 503 错误路径也已在真实浏览器注入复验。该结果只覆盖本次研究审阅 surface，不计入 R1-product 或未来正式产品的兼容支持；详见 [research/SLICE_01_EVIDENCE.md](research/SLICE_01_EVIDENCE.md)。
- 手机、平板、iPhone / HEIC、Safari、Firefox、触摸专属交互与完整响应式产品全部后置，不进入首轮 R1-product、O1 或 V1 声明。
- 同 Wi-Fi 手机入口继续保留为 R0 工程探针；它不是移动产品、正式兼容范围或发布证据。

## 当前快照

| 维度 | 当前状态 | 数量 / 等级 | 这代表什么 |
| --- | --- | --- | --- |
| 产品工程基线 + M3a Provider 边界 | M0 / M1a 完成；M1b 构图与导出已接入；M3a 接口、PhotoRoom adapter 与 fake provider 回归已完成 | 产品定向测试覆盖本地编辑、远程协议、显式启用与失败关闭；archived research 验证 Slice 01–11 | 基础编辑器保持本地可用；抠图卡只在服务明确启用后可运行，并要求逐次发送同意。真实供应商调用、质量评估、M2 多人走查和完整 Chrome / Edge E2E 仍未完成 |
| 历史研究快照 | SourceCard + Matting baseline、exposure signals、continuous-alpha、获取治理及候选运行时元数据定义均已闭合并转为 archival lineage | `6 synthetic sources / 12 assets / 10 registered upstream metadata texts / model HEAD 0 / model GET 0 / natural images 0 / model bytes 0 / installed candidate deps 0 / results 0` | SourceCard 语义 exposure 仍 unknown；simple matte 仍是下限。MODNet / RVM 未下载、安装或推理，当前 MVP 不继续该路线；需要本地 / 离线模型时必须按新产品版本重新立项 |
| 工程探针 | 可运行 | R0 | 可检查上传预检、任务状态、旧响应失效、失败门控、对比与下载等工程行为 |
| 研究审阅工具 | 可运行的方法演练 | `surface.research-review` Slice 01；3 fixtures / 18 assets | 可检查严格 catalog、六图加载、视图切换、结构化初判、锁定与解盲；提交不持久化，且不授予 C1、U1/E1 或 R1 |
| Slice 02 无界面参考设施 | 可运行的合同 / 隔离演练 | 4 contracts；2 suites × 5 partitions；10 fixtures / 30 assets | 只接受窄范围合成 fixture；全部资产 catalog-denied，仓库可见 holdout 不能用于未来 C1，simple baseline 不是产品 fallback |
| Slice 03 无界面研究设施 | 可运行的格式 / observer / 密封仪式演练 | 1 observer contract；15 format rows / 15 profiles；2 manifests；25 fixtures / 25 assets；6 seal schemas | 所有格式行均 `productSupport=false`；只使用开放项目原创校准夹具，正式 holdout 为 `not-created`，mock rehearsal 不构成密封证据 |
| Slice 04 metadata 研究设施 | 候选来源锁 / 预注册可验证 | 1 candidate lock；15 format rows；2 contracts；2 operation-specific five-partition plans；1 QA profile；2 preregistrations；1 seal intent | 10 records / 7 schemas，仅 metadata；normalize / export 每项 lifecycle 为 30 / 30 / 18 / 18 / 0，初始 C1 只计 sealed 30 + 18 = 48；artifact schema / oracle、runner、durable ledger、trust、角色 assignment / approval 均未建，全部格式 `productSupport=false`，非 Gate B |
| Slice 05 定义与 smoke | 定义已冻结；真实 smoke 已关闭且未过门 | definition：25 schemas / 6 manifests / 108 sources / 54 inputs / 54 gold；smoke：36 attempts、116 files、0 artifacts | normalize `6 pass / 12 non-pass`，export `9 pass / 9 non-pass`；两项 applicable attempts 共 18 次均以 `S05_OUTPUT_ORACLE_REJECTED` 结束，normalize 另有 3 次预期 `S05_INPUT_SRGB_REQUIRED`、实际 `S05_INPUT_CHUNK_PROFILE_INVALID`。两份 Gate B decision 均为 `denied-not-entered`，calibration 禁止；详见 [Slice 05 定义与真实 smoke 证据](research/SLICE_05_EVIDENCE.md) |
| Slice 06 诊断结果 | 唯一 registered invocation 已关闭；post-run validator 逐 byte 重算通过 | 152 files / 34 dirs / 583,198 bytes；24 requests + 24 claims + 24 results；84 ledger events；18 quarantine outputs；2 summaries + 2 closes；0 artifact / calibration / formal / holdout | result-tree SHA-256 `4c82a65083ccc1675a65d632010360d991171255ec5ef74b4a50092f701dd146`；normalize summary `70f80c7a…1900f`，export `1b60c9f1…829a0`；两项均 `9 oracle-non-pass + 3 preflight-pass`，Gate B authority=false、calibration=false、全部证据轴=0。详见 [Slice 06 evidence](research/SLICE_06_EVIDENCE.md) |
| Slice 07 Gate-B 结果 | 唯一 registered smoke 已关闭；两项均 denied | 150 files；36 requests/results；18 closures；result tree `80b242de…cf9c` | normalize/export 各 9 pass + 9 non-pass；applicable 18/18 oracle pass，rejection 0/18 exact pass，实际码均 `ERR_INVALID_ARG_TYPE`；calibration=false。详见 [Slice 07 result evidence](research/SLICE_07_RESULT_EVIDENCE.md) |
| Slice 08 结果 | 唯一 invocation 已关闭为 incomplete protocol failure | result tree `2dd9e53f…da0d6`；2 files / 3,779 bytes；normalize first request + started event；0 terminal / output / closure / oracle / summary / decision；export 未启动 | driver 错把 Slice 05 `goldRecordId` 读取为 `id`，在 worker 前 fail closed；中央验证 partial tree 为 0 issues，但没有 Gate B decision，calibration=false；详见 [Slice 08 evidence](research/SLICE_08_EVIDENCE.md) |
| Slice 09 结果 | 唯一 registered smoke 已关闭；两项 Gate B 均 pass | result tree `2f6bc6c2…cf451`；186 files / 29 dirs / 312,983 bytes；36 requests + claims + terminal results；18 closures；108 ledger events | normalize/export 各 18 / 18 pass、6 / 6 sources 3/3 deterministic；两 decision 均 `gateBPassed=true`，但 `calibrationAuthorized=false`、C1=0、productSupport=false。详见 [Slice 09 evidence](research/SLICE_09_EVIDENCE.md) |
| Slice 10 结果 | definition freeze `2026-08-15T18:03:39.680Z`；result tree `225847…ee9e`；4 files / 6,919 bytes | planned 96 / 288；actual normalize 1 terminal、export 0；pass 0 / protocol-failed 1 | `S10_EXPECTED_OUTPUT_INVALID` 在 worker 前触发；terminal 又错误记录 `workerInvoked=true`，central 以 `RESULT_WORKER_LIFECYCLE_INVALID` 拒绝。详见 [Slice 10 evidence](research/SLICE_10_EVIDENCE.md) |
| Slice 11 结果 | `@0.11.0`；definition freeze `2026-08-15T23:01:50.529Z` | planned 96 / 288；actual attempts 0；normalize startup failure，export 未启动 | 两文件结果树 SHA-256 `a638a17a…d3689`；相同 runtime JSON 因 freeze 不含换行、start check 含换行而误判 drift；central validator 将该精确形状封闭并拒绝 replay。详见 [evidence](research/SLICE_11_EVIDENCE.md) |
| SourceCard + Matting baseline | 3 个项目原创 `MATTE-GT dev/calibration` fixture | SourceCard technical 已知、quality/subject/content unknown；MATTE-SIMPLE 固定 10/88 | 4-file result tree `64227c66…04999`；hard/hole exact，soft-edge 明显硬化；只作 comparison lower bound。详见 [evidence](research/SOURCECARD_MATTING_BASELINE_EVIDENCE.md) |
| SourceCard exposure signals + Matting candidates | 4 个原创亮度 calibration + 3 个 MATTE-GT 应用；2 candidates | exposure signal 4/4；MODNet Apache-2.0、RVM GPL-3.0；两份权重均未下载 | `quality.exposure` 继续 unknown；候选只完成精确来源/许可/运行禁区登记，C1 与产品支持不变。详见 [evidence](research/SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md) |
| Continuous Alpha results-zero definition | 6 个原创 synthetic source / 12 assets / 4 strict schemas | 每 candidate 6×3=18；两候选 planned 36；threshold not-frozen；results 0 | binary IoU 与 boundary MAE 分开，禁止多数票和 valid rerun；自然人像扩展未创建。详见 [evidence](research/CONTINUOUS_ALPHA_EVALUATION_EVIDENCE.md) |
| Matting acquisition + natural-person governance | 4 strict schemas / 5 records / 10 files | dev/holdout planned 24/24；defect/defect-holdout 12/12；actual images/models/dependencies/results 全 0 | real user upload、抓取图片、不明权利与未成年人均禁；MODNet locator unresolved，RVM bytes/SHA/runtime/GPL 决策未闭合。详见 [evidence](research/MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md) |
| Matting runtime metadata results-zero definition | 4 strict schemas / 5 records / 10 files / 33,076 bytes | 10 registered official source texts；HEAD/GET/model bytes/dependencies/images/results 全 0 | MODNet 官方 folder 已解析但 object/hash 未解析；RVM requirements 有 direct pins 但没有 Python/platform wheel/transitive hash/SBOM；safe loader 未实现，请求模板未签发。详见 [evidence](research/MATTING_RUNTIME_METADATA_EVIDENCE.md) |
| 原子能力证据 | 未取得 | C1：合同 `0`；覆盖域 `0 / 9` | 尚无版本化 `CapabilityContract` 在独立 holdout 上通过；域覆盖率不代替合同数 |
| 实用效果证据 | 未取得 | U1：效果版本 `0` | 没有透明抠图、纯色换底或自然增强达到发布前质量门槛；报名头像是后置场景，不计作效果 |
| 创意效果证据 | 未取得 | E1：效果版本 `0` | 历史材料只有 E0 线索，没有冻结配方的稳定创意效果 |
| 研究管线闭环 | 未取得 | R1-pipeline：目标版本 `0` | 尚未用真实候选引擎完成可重复的处理、QA、产物与失败留证 |
| 验证界面闭环 | 未取得 | R1-product-validation：界面版本 `0` | 当前页面没有在冻结研究界面上通过真实能力与失败恢复验收；即使取得也不等于正式页面可发布 |
| 发布界面闭环 | 未取得 | R1-product-release：界面版本 `0` | 尚无正式桌面浏览器界面版本通过完整 acceptance matrix；首轮发布公式只接受冻结桌面范围 |
| 运维证据 | 未取得 | O1：`O1Profile` `0` | 持久任务、结构化日志、trace、metrics、告警 / runbook、成本、p50/p95、资源、并发与故障恢复均未冻结和验收 |
| 治理证据 | 未取得 | G1：治理范围 `0` | 候选代码、权重、数据、隐私、保留删除与日志边界尚未逐项完成审计 |
| 用户价值 | 未取得 | V1：`V1Scope` `0` | 尚无绑定效果版本和界面版本的目标用户完成与结果保留证据 |
| 公开发布资产 | 未取得 | Release Gate：allowlist `none`；登记 `0`；批准 `0` | 尚未建立冻结公开资产清单，也没有来源 / 参考 / 结果组合被批准为正式用户可见样例 |
| 产品发布 | 不允许 | `research-only` | 不应把当前链接、任务卡或演示结果称为正式产品、AI 推荐或已通过 QA 的能力 |

旧文档中的单一 `R1` 从本轮起先拆为 `R1-pipeline` 与 `R1-product`；其中 `R1-product` 又必须绑定具体界面版本，并区分研究验证范围 `R1-product-validation` 与正式发布范围 `R1-product-release`。当前三者均为 0，因此旧口径下的 R1 也仍为 0。未经范围限定的 `R1-product` 只表示证据轴名称，不能用于发布判定。各等级的完整定义见 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md)。

## R0 工程探针证明与不证明的内容

### 已经能够证明

- 单张图片的格式、大小、像素等输入预检可以运行。
- 来源确认、运行编号、任务状态、重复提交、换图和过期响应可以被工程化处理。
- 允许的本地画布操作能够产生真实文件，而不是把固定样图伪装成用户结果。
- 未连接真实服务、任务失败或结果关联不完整时，可以阻止伪成功与错误下载。
- 当前代码可作为未来真实能力接入前的状态机和接口探针继续保留。

### 尚不能证明

- 页面已经理解图片内容或生成了真实 `SourceCard`。
- 当前任务排序是基于图片内容的 AI 推荐。
- 浏览器中的亮度、对比度、饱和度和裁切已经构成“自然增强”能力。
- 已经具备主体检测、Alpha Matting、发丝 / 透明物边缘处理、透明 PNG 或可信换底。
- 文件 hash、运行编号和响应完整性检查等同于任务级图片质量 QA。
- 当前创意调用已经达到稳定效果、成本、治理或用户价值门槛。
- 当前页面可公开发布，或其中任何参考图 / 结果图已通过 Release Gate。

因此，当前页面及其手机局域网入口只能称为“R0 工程探针”或“工程预览”。

## 项目结构与边界

项目从本轮起统一采用四层结构：

```text
工程底座
  → 九类原子能力（CAP-01 ～ CAP-09）
    → 用户效果
      → 场景配方
```

- 九类能力及其依赖、输入输出和扩展规则见 [CAPABILITY_MAP.md](CAPABILITY_MAP.md)。
- 候选引擎、版本、权重、许可、硬件、成本与证据状态见 [CAPABILITY_REGISTRY.md](CAPABILITY_REGISTRY.md)。
- 用户效果与场景配方见 [TASK_CATALOG.md](TASK_CATALOG.md)。
- 证据等级、夹具隔离和发布公式见 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md)。
- 可填写的夹具、预注册、验收矩阵与证据记录见 [RESEARCH_RECORD_TEMPLATES.md](RESEARCH_RECORD_TEMPLATES.md)。
- 数据流、安全、保留删除和远程服务前置门见 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md)。
- 用户研究的抽样、分母、尝试次数、数据处理和 V1 判定见 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md)。
- 市场比较口径与当前研究空缺见 [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md)。
- 逻辑系统组件、状态归属、持久化与恢复原则见 [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)。
- UI surface、桌面交互与可访问性范围见 [UI_SURFACES_AND_ACCESSIBILITY.md](UI_SURFACES_AND_ACCESSIBILITY.md)。
- 日志、trace、metrics、错误、性能、告警与问题定位见 [OBSERVABILITY_AND_OPERATIONS.md](OBSERVABILITY_AND_OPERATIONS.md)。
- 浏览器、设备、文件、色彩与测试分层见 [QUALITY_AND_COMPATIBILITY.md](QUALITY_AND_COMPATIBILITY.md)。
- 部署、版本迁移、灰度、回滚与恢复见 [DEPLOYMENT_RELEASE_AND_RECOVERY.md](DEPLOYMENT_RELEASE_AND_RECOVERY.md)。
- 第三方来源及本地原创边界见 [UPSTREAM.md](UPSTREAM.md)。
- Slice 05 机器定义、runtime、真实 smoke non-pass、hash 与非证据边界见 [research/SLICE_05_EVIDENCE.md](research/SLICE_05_EVIDENCE.md)。
- Slice 06 两阶段 diagnostic characterization 授权、24 次计划分母、Phase B 协议、Phase C results-zero 定义与禁止边界见 [research/SLICE_06_CONTRACT.md](research/SLICE_06_CONTRACT.md) 和 [research/slice-06/README.md](research/slice-06/README.md)。

“证件照”“商品图”“旧照修复”等不是与 Matting、合成并列的底层能力，而是场景配方。普通报名头像可以在基础能力成熟后研究；任何官方证件 profile 仍需单独绑定地区、签发机关、证件类型、提交渠道、规则版本和官方来源，不属于当前发布承诺。

## 历史研究履历与产品转向

1. **已完成文档层**：状态、能力地图、注册表、效果 / 场景目录、证据、数据、安全、用户研究和来源账本已经相互引用；这不等于研究资产或能力证据已建立。
2. **已完成 Slice 01 方法层**：建立研究目录、schema、rights、严格 manifest validator、3 个原创 `MATTE-GT dev/calibration` fixture、18 个图层资产、catalog allowlist、只读本地资源服务和桌面研究审阅入口；这些只证明研究设施一致性，C1 仍为 0。
3. **已完成 Slice 02 合同 / 隔离层**：冻结 `CC-CAP02-NORMALIZE@0.2.0`、`CC-CAP02-EXPORT@0.2.0`、`CC-CAP03-SOURCE-CARD-V0@0.2.0` 与 `CC-CAP04-MATTE-SIMPLE@0.2.0`；加入无第三方依赖的本地参考适配器，并为两套 suite 建立 dev、holdout、defect/calibration、defect/holdout、escape 结构夹具。所有合同仍为 C1=0；仓库可见 holdout 只演练隔离，不能复用为质量证据。
4. **已完成 Slice 03 格式 / observer / 密封仪式准备层**：按 [Slice 03 范围合同](research/SLICE_03_CONTRACT.md) 冻结 15 行 `NORMALIZE-DELIVER` 格式政策矩阵、逐行 profile、独立 normalized-bytes technical observer，以及仓库外密封仪式 schema / mock rehearsal；只建立项目原创 `dev/calibration`、`defect/calibration` 格式夹具。JPEG / WebP 仍为 probe 后拒绝，所有格式行均 `productSupport=false`；正式 holdout 保持 `not-created`。验收见 [Slice 03 证据记录](research/SLICE_03_EVIDENCE.md)。
5. **已完成 Slice 04 候选锁 / 预注册 metadata 层**：按 [Slice 04 范围合同](research/SLICE_04_CONTRACT.md) 锁定 Sharp `v0.35.3`、Windows x64 npm / native bundle、`sharp-libvips@1.3.2` bundled libvips 来源与 libvips `v8.18.3` 上游边界；六个 npm registry tarball 只在仓库内未提交的临时 `.tmp/slice04-artifacts` 计算 SHA-256 后删除，没有解包、执行、安装或保留。Slice 04 冻结 15 行格式矩阵、两份 metadata-only 合同、normalize / export 两份各自 30 / 30 / 18 / 18 / 0 的 lifecycle plan、QA、两份预注册和 seal intent；每项初始 C1 只计 sealed 48，3 / 3 repeats 必须全过。Slice 03 observer / seal 仅作 design / envelope reference；正式 oracle、runner、durable ledger、trust、角色 assignment / approval 与所有像素仍为 `not-created`，验收见 [Slice 04 证据记录](research/SLICE_04_EVIDENCE.md)。
6. **已完成 Slice 05 定义冻结**：按 [Slice 05 合同](research/SLICE_05_CONTRACT.md) 建立 `REG-NORM-SHARP@0.5.0` installed runtime closure、normalize / export 两份 `@0.5.0` contract、25 份 strict schema、6 份 operation-specific manifest、108 个项目原创来源、54 份 export input artifact、54 份 independent gold、adapter / isolated worker、independent oracle、named hardware、local runner / fault semantics、Gate B plan 与两份开放 calibration 预注册。机器定义于 `2026-08-15T04:23:38.389Z` 冻结，definition index `contentHash=d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271`；冻结时 `results/` 不存在，定义验收见 [Slice 05 证据](research/SLICE_05_EVIDENCE.md)。
7. **Slice 05 已关闭为 non-pass，禁止 calibration**：定义基线提交 / 推送后，唯一注册的真实 smoke 形成 36 份 request、36 份 claim、36 份 terminal result 与 72 个 durable ledger event，但没有 artifact。normalize `6/18` pass、export `9/18` pass；两份 Gate B decision 均为 `denied-not-entered`、`calibrationAuthorized=false`。真实 smoke review 为 `P1/P2/P3=0/2/0`：两项 P2 分别是 generic oracle rejection 的诊断 / 确定性留存缺口，以及 normalize missing-sRGB error code 与预注册不符。首次未注册调用因 sandbox `mkdir EPERM` 在任何 request / claim / result 前停止；后续获批调用是唯一注册 smoke，不是选择性重跑。durable 证据只允许结论“worker IPC 返回并通过严格响应校验的 output bytes，随后被 precommit independent oracle 拒绝”；进程退出确认未持久化（`workerExitConfirmed=null`），具体 oracle 子因保持 unknown，不猜测、不重跑。
8. **已完成 Slice 06 Phase B / C 定义与唯一 registered diagnostic**：冻结定义所在提交先推送并在 clean admission 下通过，随后一次 invocation 顺序完成 normalize / export 共 24 attempts、零 replacement。18 个 applicable output 的 bytes、pixels、classification、oracle outcome、worker runtime 都 3 / 3 一致，exit 与 telemetry 完整；两项 sentinel 各 3 / 3 精确拒绝。post-run validator 对 152-file tree、84-event ledger、所有交叉引用与独立 oracle 重算为 0 issues。
9. **Slice 07 唯一 registered smoke 已关闭，不得重跑 Slice 05–07**：36 / 36 terminal，18 个 applicable 全部通过 candidate + independent oracle；18 个 rejection 因 driver 未传递 frozen classification fields 而统一得到 `ERR_INVALID_ARG_TYPE`。两项 Gate B 均 denied，calibration=false。任何修复必须新版本、新定义、新注册结果。
10. **Slice 08 已关闭为 protocol-failed，不得重跑**：results-zero definition 于 `2026-08-15T13:37:23.038Z` 冻结并以 commit `a8bcbe57278c7fd2620c16b39f1a939a1e3ccf89` 推送。唯一 registered invocation 写入首个 normalize request 与 `attempt-started` 后，actual-case driver 因把 Slice 05 的 `goldRecordId` 错读为 `id` 而在 worker 前抛出 `S08_CASE_MATERIAL_INVALID`。partial tree 为 2 files / 3,779 bytes，SHA-256 `2dd9e53fcd2163913a47c16f92f9a31733ef3ffc491949e6c1a31464774da0d6`；0 terminal / output / decision，export 未启动。central validator 对该不可重放 partial tree 返回 0 issues；这只证明失败记录一致，不是 Gate B pass。任何修复必须进入新版本、新定义和新完整分母，calibration 继续禁止。
11. **Slice 09 唯一 registered smoke 已关闭并推送**：results-zero definition 于 `2026-08-15T15:17:03.776Z` 冻结并以 commit `36d92844a2ea58113567a24482e5297ba8cdd9ab` 推送；随后唯一注册运行形成 36 / 36 terminal pass、18 identity-bound artifact closures 与两条 54-event ledger，结果 commit 为 `c91014c6bef8878277a8520d003b10684972087b`。normalize / export 各 9 applicable + 9 exact rejection pass，6 / 6 sources 均 3/3 deterministic，两项 Gate B 均 pass。按当时路线，calibration 原需后续切片另行冻结和授权；当前路线已将其归档且不创建 Slice 12。不得重跑或补跑，C1=0、productSupport=false。
12. **Slice 10 唯一 registered calibration 已关闭，不得重跑**：results-zero definition 已先以 commit `86543a47bb5eea6a287861bf587fbffc3014ba1f` 推送；唯一 invocation 随后只注册并终结首个 normalize attempt。完整 gold expected 被直接传给只接受 12 个 canonical output keys 的 Slice 07 adapter，故以 `S10_EXPECTED_OUTPUT_INVALID` 在 `spawnWorker()` 前停止；export、output、oracle、artifact、summary 与 runtime-end 均为 0。不可变 terminal 又把该 pre-worker 路径误记为 `workerInvoked=true`，central 因 `RESULT_WORKER_LIFECYCLE_INVALID` fail closed。4-file result tree SHA-256 为 `225847d125c58ee6affaa087746101d469d7ae04109504f0bd6781f593b9ee9e`。不得补跑剩余 287 slots；任何修复必须进入 Slice 11 / `@0.11.0` 新定义。
13. **Slice 11 唯一 registered invocation 已在任何 candidate attempt 前关闭，不得重跑**：definition 先以 commit `33f24395e9ad2cd672d156a6f491e02118a62ed1` 推送。运行只写入 normalize operation claim 与 runtime start observation（937 + 28,684 bytes；result tree `a638a17afa69ab41015181b61ef7a64fa58e9057a9f64f7bc29bfe2f35dd3689`），随后以 `S11_RUNTIME_START_DRIFT` 停止。解析后的冻结/观测 runtime JSON 逐字段相同；误判来自 freeze SHA 对 canonical JSON 不加换行，而 start checker 加换行。actual request / attempt / worker / pixel / terminal / export 均为 0。central validator 将这一精确两文件形状封闭为 `startup-runtime-drift` 并拒绝 replay；Slice 11 fake-only tests为 43 / 43，全量验证 522 / 522。该失败不授予 C1 或产品支持，也不再触发 Slice 12。
14. **研究切片在此转入 archival 状态**：不创建 Slice 12，不修补或重跑 Slice 05–11，不以继续扩 schema / runner / seal 作为产品进度。
15. **当前工程主线切到基础编辑器**：正确预览、裁剪、旋转、尺寸、基础光色、格式 / 质量、比较与可靠导出；先取得内部产品试用版的真实用户流程，再讨论公开能力等级。
16. **抠图进入第二阶段**：先冻结可替换云端 Provider 边界，再增加透明预览、保留 / 擦除修正和换底。基础编辑器在 Provider 不可用时仍必须完整可用。
17. **本地 Matting 研究按需恢复**：只有实际使用数据证明云端成本、隐私、延迟或离线需求构成阻塞，才另行恢复候选权重、自然图片治理与 continuous-alpha 对测；simple baseline 永远只作下限。
18. **正式发布仍使用完整证据门**：当内部产品试用版已证明任务有价值并准备公开 beta 时，再冻结相应 C1、U1 / E1、R1、O1、G1、V1 与 Release Gate 范围；这些门不再作为开始构建产品 UI 的前置条件。

手机 / 平板产品、其他桌面浏览器、多图逐张、多图合集、商品套件、自由画布、公共部署以及未经独立验证的官方证件 profile 继续后置。

## 状态更新规则

- 任何等级只能引用一份冻结的 `EvidenceManifest`；口头判断、页面截图、单次成功或自动测试数量不能升级等级。
- 调整能力合同、模型 / checkpoint、配方、关键参数、QA profile、界面 build、适用分母或用户研究范围后，相关证据版本必须重新计算；不得沿用旧版本等级。
- `C1` 只证明原子能力；`U1` / `E1` 只证明一个效果；`R1-pipeline`、`R1-product-validation`、`R1-product-release`、`O1`、`G1`、`V1` 与 Release Gate 均不能由前述等级自动推出。
- 依赖能力失效时，引用它的效果和场景自动回退为不可发布状态。
- C1 以通过的合同版本计数，同时单独报告九类 CAP 域覆盖；U1 / E1 以效果版本计数；R1 以目标与 build 版本计数；O1、G1、V1 分别以冻结 profile / scope 计数。不同单位不得相加或互相替代。
- Release Gate 状态必须同时记录 `allowlist_version`、登记资产 / 组合数和批准数；清单尚未冻结时不得用 `0 / 0` 表示全部通过。
- 每次升级本文件时，应同时记录证据 manifest ID / 版本、目标版本、核对日期和责任人；没有可追溯证据时维持 0。
