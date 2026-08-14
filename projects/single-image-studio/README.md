# Single Image Studio

> 一个“单图能力底座”研究项目。目标是先证明可复用的图片能力、效果合同与质量门禁，再设计面向普通用户的单图智能处理产品。

## 当前状态

本目录目前包含一套可运行的 **R0 工程探针**，用于验证单文件输入、来源绑定、任务状态、服务请求、失败恢复、比较与下载等工程约束。它不是产品首版，也不证明图片理解、推荐、抠图、自然增强、创意效果或任务专属 QA 已经成立。

| 维度 | 当前结论 |
| --- | --- |
| 研究阶段 | Slice 01 研究基础设施、Slice 02 合同 / partition 隔离骨架与 Slice 03 格式 / observer / 密封仪式准备可运行；真实候选对测与 C1 取证尚未开始 |
| 工程与研究工具 | R0 探针、桌面研究审阅入口以及无界面的 Slice 02 / 03 参考设施可运行；自动测试覆盖工程约束、研究清单、合同、格式政策、隔离、密封仪式、资源与交互边界 |
| 原子能力证据 | `C1 = 0` |
| 实用 / 创意证据 | `U1 = 0`、`E1 = 0` |
| 运行 / 用户证据 | `R1-pipeline = 0`、`R1-product-validation = 0`、`R1-product-release = 0`、`V1 = 0` |
| 运维 / 治理证据 | `O1 = 0`、`G1 = 0` |
| 发布状态 | 未发布；没有正式任务目录或可公开产品样例 |

所有状态以 [STATUS.md](STATUS.md) 为唯一事实源。历史材料中的“可运行”“pass”若未特别说明，只代表 R0 工程检查，不代表能力或产品门槛通过。

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

九类是研究地图，不是九个要同时开发的页面入口。第一条纵向链仍是：

```text
输入归一化 → 主体检测 → Alpha Matting → 边缘净化
→ 透明主体 → 纯色换底 → 任务 QA
```

自然增强和 CR1 / CR2 创意对测是另外两条独立研究链。首个混合邀请 beta 要求质量、主体 / 背景、创意三个方向各至少一个效果满足完整发布公式；验证壳达标只允许正式页面进入设计与复验。

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

## 运行 R0 工程探针

需要 Node.js 22 或更高版本。本项目当前没有运行时第三方依赖，也不依赖兄弟项目。

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
| [UPSTREAM.md](UPSTREAM.md) | 第三方来源、精确版本、市场入口、许可和本地复制边界的事实账本 |
| [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md) | 市场比较口径、已固定入口、空缺研究簇与产品决策规则 |

[CAPABILITY_REVIEW.md](CAPABILITY_REVIEW.md)、[EFFECT_SHORTLIST.md](EFFECT_SHORTLIST.md) 与 [PORTRAIT_PARAMETERS.md](PORTRAIT_PARAMETERS.md) 分别是历史 Skill 审计、创意实验附录和报名头像场景草案，不覆盖上述当前规范。[DELIVERY_CONTRACT.md](DELIVERY_CONTRACT.md) 与 [BROWSER_VALIDATION.md](BROWSER_VALIDATION.md) 只记录 R0 工程探针。

## 研究边界

- 当前只增加研究设施、项目原创合成夹具和独立研究审阅 surface；不扩正式产品页面、任务卡，不下载模型 / 权重，也不引入运行时第三方依赖。
- 首轮验证和发布只声明冻结的桌面浏览器环境；移动与未验收桌面浏览器不得从 R0 样式或代码存在推导为支持。
- `single-image-studio` 不通过相对路径导入兄弟项目代码或资产。
- GitHub 仓库代码许可不自动覆盖模型权重、训练数据或输出用途。
- 未进入发布 allowlist 的来源、参考、结果和失败图不得作为产品样例。
- 普通报名头像是场景配方；官方护照、签证或证件 profile 继续独立验证。
- 多图逐张、多图合集、商品套件和产品模板均后置。

来源和许可边界见 [UPSTREAM.md](UPSTREAM.md)。
