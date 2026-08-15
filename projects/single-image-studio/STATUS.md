# Single Image Studio 状态

> 本文件是项目状态的唯一事实来源（single source of truth）。其他文档负责说明目标、研究方法或历史记录；若其中的阶段、证据或发布表述与本文件冲突，以本文件为准。

最后核对：2026-08-15

## 一句话结论

`projects/single-image-studio` 当前是一个**单图能力研究项目**。现有网页是可运行的 **R0 工程流程探针**，不是已经完成或可发布的图片产品；九类原子能力尚无一项取得 C1，实用效果 U1、创意效果 E1、R1-pipeline、R1-product-validation、R1-product-release、运维 O1、治理 G1、用户价值 V1 与逐项 Release Gate 均未取得。

## 当前冻结的产品环境

- 首轮验证、正式页面和邀请 beta 只以**桌面浏览器**为范围；当前基准为 Windows 桌面 Chromium，Chrome / Edge 最新稳定版是首批候选，精确版本由 `CompatibilityProfile` 冻结。
- 首轮视口候选为 `1280 × 720` 最小目标与 `1440 × 900` 常规审查；键盘、鼠标、缩放、DPR 与可访问性范围须逐项验收。
- Slice 01 已在 Codex 内置 Chromium 的实际 `1280 × 720` viewport 做可见检查，并以本机 Chrome `151.0.7922.138`、Edge `151.0.4129.78` 分别在 `1280 × 720` 与 `1440 × 900` 完成自动化主路径；空目录与 503 错误路径也已在真实浏览器注入复验。该结果只覆盖本次研究审阅 surface，不计入 R1-product 或未来正式产品的兼容支持；详见 [research/SLICE_01_EVIDENCE.md](research/SLICE_01_EVIDENCE.md)。
- 手机、平板、iPhone / HEIC、Safari、Firefox、触摸专属交互与完整响应式产品全部后置，不进入首轮 R1-product、O1 或 V1 声明。
- 同 Wi-Fi 手机入口继续保留为 R0 工程探针；它不是移动产品、正式兼容范围或发布证据。

## 当前快照

| 维度 | 当前状态 | 数量 / 等级 | 这代表什么 |
| --- | --- | --- | --- |
| 研究阶段 | Slice 05 范围已冻结；implementation 尚未开始 | `scope-frozen / implementation-not-started` | 范围自包含 [Slice 05 合同](research/SLICE_05_CONTRACT.md) 的 Git commit 起生效；机器预注册、fixture、artifact schema / oracle、adapter、named hardware、smoke 与 calibration 均尚未建立。normalize / export 必须分别通过 Gate B smoke 后才能各自运行开放 30 + 18 calibration；这不构成格式支持或能力证据 |
| 工程探针 | 可运行 | R0 | 可检查上传预检、任务状态、旧响应失效、失败门控、对比与下载等工程行为 |
| 研究审阅工具 | 可运行的方法演练 | `surface.research-review` Slice 01；3 fixtures / 18 assets | 可检查严格 catalog、六图加载、视图切换、结构化初判、锁定与解盲；提交不持久化，且不授予 C1、U1/E1 或 R1 |
| Slice 02 无界面参考设施 | 可运行的合同 / 隔离演练 | 4 contracts；2 suites × 5 partitions；10 fixtures / 30 assets | 只接受窄范围合成 fixture；全部资产 catalog-denied，仓库可见 holdout 不能用于未来 C1，simple baseline 不是产品 fallback |
| Slice 03 无界面研究设施 | 可运行的格式 / observer / 密封仪式演练 | 1 observer contract；15 format rows / 15 profiles；2 manifests；25 fixtures / 25 assets；6 seal schemas | 所有格式行均 `productSupport=false`；只使用开放项目原创校准夹具，正式 holdout 为 `not-created`，mock rehearsal 不构成密封证据 |
| Slice 04 metadata 研究设施 | 候选来源锁 / 预注册可验证 | 1 candidate lock；15 format rows；2 contracts；2 operation-specific five-partition plans；1 QA profile；2 preregistrations；1 seal intent | 10 records / 7 schemas，仅 metadata；normalize / export 每项 lifecycle 为 30 / 30 / 18 / 18 / 0，初始 C1 只计 sealed 30 + 18 = 48；artifact schema / oracle、runner、durable ledger、trust、角色 assignment / approval 均未建，全部格式 `productSupport=false`，非 Gate B |
| Slice 05 范围合同 | 范围已冻结，未实施 | 1 human-readable scope contract；machine records `0`；fixtures / runs `0` | 只授权 canonical PNG normalize / export 的 operation-specific Gate B 准备、smoke 与通过后的开放 calibration；当前没有安装或执行 codec，没有 machine prereg freeze、Gate B 决定或 calibration 结果，正式 holdout / defect-holdout / escape 全部禁止且保持 `not-created` |
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

“证件照”“商品图”“旧照修复”等不是与 Matting、合成并列的底层能力，而是场景配方。普通报名头像可以在基础能力成熟后研究；任何官方证件 profile 仍需单独绑定地区、签发机关、证件类型、提交渠道、规则版本和官方来源，不属于当前发布承诺。

## 当前冻结的研究顺序

1. **已完成文档层**：状态、能力地图、注册表、效果 / 场景目录、证据、数据、安全、用户研究和来源账本已经相互引用；这不等于研究资产或能力证据已建立。
2. **已完成 Slice 01 方法层**：建立研究目录、schema、rights、严格 manifest validator、3 个原创 `MATTE-GT dev/calibration` fixture、18 个图层资产、catalog allowlist、只读本地资源服务和桌面研究审阅入口；这些只证明研究设施一致性，C1 仍为 0。
3. **已完成 Slice 02 合同 / 隔离层**：冻结 `CC-CAP02-NORMALIZE@0.2.0`、`CC-CAP02-EXPORT@0.2.0`、`CC-CAP03-SOURCE-CARD-V0@0.2.0` 与 `CC-CAP04-MATTE-SIMPLE@0.2.0`；加入无第三方依赖的本地参考适配器，并为两套 suite 建立 dev、holdout、defect/calibration、defect/holdout、escape 结构夹具。所有合同仍为 C1=0；仓库可见 holdout 只演练隔离，不能复用为质量证据。
4. **已完成 Slice 03 格式 / observer / 密封仪式准备层**：按 [Slice 03 范围合同](research/SLICE_03_CONTRACT.md) 冻结 15 行 `NORMALIZE-DELIVER` 格式政策矩阵、逐行 profile、独立 normalized-bytes technical observer，以及仓库外密封仪式 schema / mock rehearsal；只建立项目原创 `dev/calibration`、`defect/calibration` 格式夹具。JPEG / WebP 仍为 probe 后拒绝，所有格式行均 `productSupport=false`；正式 holdout 保持 `not-created`。验收见 [Slice 03 证据记录](research/SLICE_03_EVIDENCE.md)。
5. **已完成 Slice 04 候选锁 / 预注册 metadata 层**：按 [Slice 04 范围合同](research/SLICE_04_CONTRACT.md) 锁定 Sharp `v0.35.3`、Windows x64 npm / native bundle、`sharp-libvips@1.3.2` bundled libvips 来源与 libvips `v8.18.3` 上游边界；六个 npm registry tarball 只在仓库内未提交的临时 `.tmp/slice04-artifacts` 计算 SHA-256 后删除，没有解包、执行、安装或保留。Slice 04 冻结 15 行格式矩阵、两份 metadata-only 合同、normalize / export 两份各自 30 / 30 / 18 / 18 / 0 的 lifecycle plan、QA、两份预注册和 seal intent；每项初始 C1 只计 sealed 48，3 / 3 repeats 必须全过。Slice 03 observer / seal 仅作 design / envelope reference；正式 oracle、runner、durable ledger、trust、角色 assignment / approval 与所有像素仍为 `not-created`，验收见 [Slice 04 证据记录](research/SLICE_04_EVIDENCE.md)。
6. **已冻结 Slice 05 Gate B / 开放 calibration 范围，implementation 尚未开始**：范围以 [Slice 05 合同](research/SLICE_05_CONTRACT.md) 为准，并自包含该文件的 Git commit 起生效；尚未发生 machine prereg freeze。后续只允许为已锁复合候选创建 normalize / export artifact schema 与独立 oracle / gold、实现 adapter、冻结执行位置 / named hardware / 资源与运行语义，并对两项 operation 分别完成 codec smoke。只有某一 operation 的 Gate B smoke 全项通过后，才可运行该 operation 的项目原创开放 `dev/calibration=30` 与 `defect/calibration=18`；smoke 与开放 calibration 均不能升级能力。该切片不得创建正式 holdout / defect-holdout / escape，不得扩 UI、Matting、真实照片或模型权重；candidate / QA / 阈值若因 calibration 改变，必须发布新版本与新预注册。
7. **再后续才可建立正式 bundle**：最终 candidate、合同、QA、阈值、分母、指标与停止规则经 calibration 后重新冻结并通过独立审计，才由独立 custodian 在仓库外建立真正密封的 `NORMALIZE-DELIVER` holdout / defect-holdout；随后 external pins / isolation audit 完成，才能签发绑定具体 bundle 的一次性 request 并运行。Slice 04 的 request 只是 policy/template，状态固定为 `not-issued-awaiting-custodian-bundle`。
8. 更后续才可另行冻结 Matting 范围，扩 `MATTE-GT / MATTE-REAL` 独立来源并锁定许可允许研究、真正输出连续 Alpha 的至少两个候选与可用市场基准。市场基准缺席需事前预注册；simple baseline 只作比较下限，不进入产品 fallback。
9. 跑通“主体区域 → 边缘净化 → 透明主体 → 纯色换底 → 任务 QA”的第一条纵向链。
10. 独立验证自然增强的退化 / no-op 协议，并完成 CR1 / CR2 真实创意对测。
11. 先用真实管线完成形成性研究并冻结验证契约，再由最小冻结研究界面取得 R1-product-validation 和按效果划分的 V1-validation，作为是否进入正式产品设计的决策输入。
12. 只有质量、主体 / 背景、创意三个方向各至少一个效果取得依赖 C1、U1 / E1、R1-pipeline、R1-product-validation、研究目标 O1 / G1、对应验证范围 V1，且研究界面可见资产通过所需 Release Gate，才进入正式桌面浏览器产品界面设计；正式界面仍须另取 R1-product-release，并让发布所用 V1 精确绑定该界面版本，或通过有效 `V1MigrationManifest` 完成等价迁移。
13. 正式桌面页面完成后复核冻结 Windows / Chromium 环境的 O1、治理范围的 G1，以及每项新增用户可见资产与组合的 Release Gate；任何研究界面的 R1 / V1 不自动继承到正式发布界面。

手机 / 平板产品、其他桌面浏览器、多图逐张、多图合集、商品套件、自由画布、公共部署以及未经独立验证的官方证件 profile 继续后置。

## 状态更新规则

- 任何等级只能引用一份冻结的 `EvidenceManifest`；口头判断、页面截图、单次成功或自动测试数量不能升级等级。
- 调整能力合同、模型 / checkpoint、配方、关键参数、QA profile、界面 build、适用分母或用户研究范围后，相关证据版本必须重新计算；不得沿用旧版本等级。
- `C1` 只证明原子能力；`U1` / `E1` 只证明一个效果；`R1-pipeline`、`R1-product-validation`、`R1-product-release`、`O1`、`G1`、`V1` 与 Release Gate 均不能由前述等级自动推出。
- 依赖能力失效时，引用它的效果和场景自动回退为不可发布状态。
- C1 以通过的合同版本计数，同时单独报告九类 CAP 域覆盖；U1 / E1 以效果版本计数；R1 以目标与 build 版本计数；O1、G1、V1 分别以冻结 profile / scope 计数。不同单位不得相加或互相替代。
- Release Gate 状态必须同时记录 `allowlist_version`、登记资产 / 组合数和批准数；清单尚未冻结时不得用 `0 / 0` 表示全部通过。
- 每次升级本文件时，应同时记录证据 manifest ID / 版本、目标版本、核对日期和责任人；没有可追溯证据时维持 0。
