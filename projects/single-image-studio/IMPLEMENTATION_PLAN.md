# 下一阶段实施计划

## 当前授权与状态

当前实现只按 **R0 工程探针**管理。下一阶段批准的是研究设施、四套互斥夹具集合、原子能力对测、真实无界面任务管线、运维治理和形成性测试；不是继续扩展或美化现有产品页面。

当前代码可以作为上传校验、任务快照、服务代理、错误状态和下载契约的参考实现，但所有用户可见结果仍要用新的能力与证据重新取得。不得因自动测试通过、页面可点击或本地滤镜有输出，就提前标记 C1、U1、E1、R1-pipeline、R1-product、O1、G1 或 V1。

截至 2026-08-15，Slice 05 的唯一注册真实 smoke 已关闭为 non-pass，Slice 06 唯一 diagnostic 已定位缺 `sRGB` / 禁止 `pHYs`。Slice 07 新复合候选的唯一 registered smoke 也已闭合：36 / 36 terminal，18 / 18 applicable candidate outputs 全部通过独立 oracle，但 18 个 rejection 因 driver executor binding 漏传 frozen classification fields 而全部 non-pass。两项 Gate B 均 denied，calibration 与任何 C1 判定仍未开始。

立即后续禁止重跑 `@0.5.0` / `@0.6.0` / `@0.7.0` / `@0.8.0` 或运行旧 calibration。Slice 08 definition 已提交推送，但唯一 registered invocation 在首个 normalize applicable attempt 的 worker 前因 gold 主键读取错误而 protocol-failed，只留下 1 request、1 started event、0 terminal / output / decision。[Slice 09 合同](research/SLICE_09_CONTRACT.md) 把下一步收紧为新 `@0.9.0` gold-identity boundary：identity、closed case context 与 actual-case driver 已直接以真实 normalize / export `goldRecordId` shape 通过 14 / 14 fake-only tests，不允许 `.id` fallback。下一实现步骤是 durable runner / registered admission / result validator，之后才能冻结新 results-zero definition 与 36-attempt 分母。两项 Gate B 都通过前 calibration 继续禁止。

首轮实施与证据只覆盖冻结的 Windows 桌面 Chromium 环境。Chrome / Edge 精确版本、`1280 × 720` 与 `1440 × 900` 视口、键盘 / 鼠标 / 缩放范围由 CompatibilityProfile 冻结；手机、平板、Safari、Firefox、iPhone / HEIC 和完整响应式产品不进入本计划的首轮 R1-product、O1 或 V1。

## 总体实施顺序

```text
证据 schema、候选来源锁与预注册
→ Gate B adapter / smoke 与开放 calibration
→ dev/calibration、holdout、defect、escape 四套互斥集合
→ 主体 / 背景 C1 与 U1
→ 自然增强 C1 / U1 + CR1 / CR2 E1 对测
→ R1-pipeline
→ O1 + G1
→ 6–8 人形成性测试
→ 冻结任务与验证契约
→ 最小冻结验证界面与 R1-product-validation
→ 至少 18 人冻结验证与 V1-validation
→ 混合产品设计入场门
→ 正式桌面浏览器产品页面
→ R1-product-release + V1 迁移审计 / 复验
→ 混合邀请 beta
```

CR1 / CR2 没有达到 E1 时不影响主体 / 背景与自然增强的 C1 / U1、R1-pipeline、O1、G1 和形成性研究；但会阻塞混合邀请测试和正式桌面产品页面，除非用户另行批准改为纯实用产品。

## WP0 · 统一证据与目录

在项目内部建立自足研究结构；不得通过相对路径依赖兄弟项目。

```text
research/
├── fixtures/
│   ├── dev/
│   │   └── calibration/     # 下设各 fixture suite
│   ├── holdout/             # 与开发来源完全隔离
│   ├── defect/              # 人工注入的可定位坏结果
│   └── escape/              # 真实漏检的最小复现
├── manifests/               # ImageAsset、SourceCard、权限与冻结分母
├── adapters/                # 统一原子能力接口
├── runs/                    # 请求、参数、指标、失败和 hash
├── outputs/                 # 原始结果；默认不公开
├── reviews/                 # 双人复核与淘汰理由
├── releases/                # 仅通过发布 allowlist 的参考对
└── README.md
```

每次运行至少记录：

- `source_id`、夹具集与版本、来源与规范化输入 SHA-256；
- `source_family_id`、`capture_session_id`、派生链与感知去重结果，防止裁切、调色、连拍或近重复跨集合；
- 原子运行记录 `capability_id + capability_version`；效果 / 场景运行记录 `target_kind: effect | scene`，以及对应 `effect_id + effect_version` 或 `scene_id + scene_version`；R0 旧接口名只可放在 `legacy_probe_id` 映射中；
- 上游仓库 / 服务、精确 commit / tag / model、许可证、取得日期和本地修改；
- 完整参数、seed、输入角色、配方 / Prompt hash、输出规格和 QA 版本；
- 开始 / 结束时间、请求 ID、attempt、幂等键、延迟、资源 / 外部成本与错误分类；
- 对项目自有 / 明确授权研究夹具保留所有输出与中间资产 hash，不覆盖失败或旧版本；真实用户运行只按冻结 `DataPolicy` 保留最小 manifest，不默认留存原图、失败图或后台完成结果；
- 客观指标、人工复核、拒绝原因和证据等级；
- `processing_allowed`、`public_display_allowed`、`commercial_marketing_allowed`。

交付：能力注册 schema、任务注册 schema、`ImageAsset` manifest、Source Card、运行记录、复核记录、发布清单和证据状态清单；同时冻结 [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)、[OBSERVABILITY_AND_OPERATIONS.md](OBSERVABILITY_AND_OPERATIONS.md)、[QUALITY_AND_COMPATIBILITY.md](QUALITY_AND_COMPATIBILITY.md) 与 [DEPLOYMENT_RELEASE_AND_RECOVERY.md](DEPLOYMENT_RELEASE_AND_RECOVERY.md) 所需的首批合同。填写骨架统一使用 [RESEARCH_RECORD_TEMPLATES.md](RESEARCH_RECORD_TEMPLATES.md)，不得为每个实验另造不兼容字段。

## WP1 · 建立四套互斥集合与 fixture suite

四套权威集合为：

- `dev/calibration`：候选筛选、指标与阈值校准、失败分类、配方和 QA 调整。
- `holdout`：合同、候选、版本、分母、阈值和停止规则冻结后的独立正式验收。
- `defect`：注入毛边、色边、孔洞、主体误删、身份 / 数量漂移、假文字、水印和参考泄漏等可定位缺陷，验证 `CAP-08` 会拒绝坏结果。
- `escape`：保存真实运行中被既有 QA 漏过、经权利和隐私处理的最小复现，供下一版本回归。

以下名称只表示跨集合的题材 / 任务 fixture suite：

- `NORMALIZE-DELIVER`：EXIF orientation 1–8、ICC / sRGB / Display-P3 / CMYK、位深 / HDR 策略、预乘 Alpha、透明 / 动画输入策略、合法与损坏编码、尺寸与文件体积边界；验收以规范解码像素、输出合同和重开文件结果为准，不只比较文件 hash。
- `MATTE-GT`：可追踪 Alpha 真值，覆盖人物、硬边物件、发丝 / 毛发、孔洞、细结构和半透明；保存前景、Alpha、受控背景、合成过程与 hash。
- `MATTE-REAL`：真实授权困难边缘，覆盖卷发、眼镜、帽饰、低对比、反光、阴影、细杆、白物白底、运动模糊和复杂背景。
- `NATURAL-DEGRADE`：清洁原图及版本化脚本生成的曝光、白平衡、低对比、噪声、轻度模糊和压缩退化对；保存参数与 seed，生成式结果不得充当真值。
- `CREATIVE-COVERAGE`：近景人物、动作人物、单物 / 商品、动物、建筑 / 室内、风景和密集现场；冻结 must-keep、允许改变、主体数量、关键物件、文字和参考泄漏风险。

每个 suite 必须以不同来源分别分配到 `dev/calibration` 和独立 `holdout`；相应坏结果进入 `defect`，真实漏检进入 `escape`。四个集合按内容来源互斥，同图、近重复图、同一拍摄序列、裁切、压缩、换色或其他同源衍生版本不得跨集合。`holdout` 在预注册冻结前不可用于演示、调参、Prompt 或阈值选择；`escape` 不能重写历史 holdout。

退出检查：每个 manifest 同时记录 suite 与唯一集合；权利和来源字段完整；每个 `suite × partition` 的独立来源数、困难类别下限、适用 / 拒绝分母、重复运行数、有效 / 无效样本、灾难失败上限、停止规则和隔离关系均在首次运行前冻结；私密 EXIF 已按“先隔离原件、再生成研究副本”的顺序清理；真实身份与品牌展示边界明确。材料不足时停在研究准备，不用网上随手图或旧概念图补位。

## WP2 · 原子能力候选与适配层

九类能力只使用 [CAPABILITY_MAP.md](CAPABILITY_MAP.md) 的 `CAP-01`～`CAP-09`，并通过小接口协作，不让任务直接绑定某个模型或仓库：

- `CAP-01` 来源资产与 `CAP-02` 归一交付：`ingest / normalize / deliver`
- `CAP-03` 图片理解：`analyze(source) → observable_facts + eligibility_signals`
- `CAP-04` 主体区域：`segment(source, config) → foreground + alpha + diagnostics`
- `CAP-05` 几何合成：`compose / crop / place`
- `CAP-06` 质量修复：`enhance-natural / restore`
- `CAP-07` 生成编辑：`cleanup / expand / generate-creative`
- `CAP-08` QA 证据：`validate-result / build-evidence`
- `CAP-09.execute` 执行控制：`plan-dag / run / retry / invalidate`，作为控制面包裹效果的数据 DAG，不作为 U1 / E1 的末端像素依赖
- `CAP-09.recommend` 后置推荐：`filter / rank / explain`，只对已经取得对应质量证据的效果排序

候选可以来自开源库、独立权重或托管 API，但必须满足：

- 输入输出、色彩空间、分辨率和 Alpha 语义一致；
- 精确版本可固定，失败和资源用量可观察；
- 上游许可证和模型 / 服务条款允许当前研究方式；
- 第三方代码或资产复制前更新项目 `UPSTREAM.md` 并保留许可证；
- 适配器不把生成式结果伪装成确定性结果。
- 任何云端夹具上传前通过 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md) 的 remote-service preflight；完整 G1 虽可在后续取得，但未知发送、保留、地区或删除边界会在此处阻断调用。

候选比较按能力性质分轨：

- 对 CAP-03 / CAP-04 / CAP-06 / CAP-07 等经验型视觉能力，在相同适用分母上尽量比较 **至少 2 个可研究候选 + 1 个简单基线 + 1 个可用市场基准**；候选必须真正输出该合同要求的产物，例如粗分割不能冒充连续 Alpha Matting。
- 对 CAP-01 / CAP-02 / CAP-05 / CAP-08 / CAP-09 的确定性、治理或控制合同，用规范 golden、性质测试、替代实现、故障注入与安全不变量验收，不为凑数强行寻找两个模型。
- 市场基准无法合法或技术取得时，在预注册前固定缺席原因与替代比较臂；不能在看到本项目结果后临时取消，也不能用宣传图、README 指标或主观印象代替。

注册表门分为“来源 / 许可可锁定”“可进入 calibration”“C1 / O1 已取得”三层；性能和 EvidenceManifest 结果由对测产生，不能反过来作为进入对测的前置。本工作包只产生候选清单、预注册地址和可重复调用，不授予 C1。

### 2.1 Slice 04 已完成的 metadata 入场层

Slice 04 按 [范围合同](research/SLICE_04_CONTRACT.md) 完成 `REG-NORM-SHARP` 的 Gate A / source-resolved 锁定：Sharp `v0.35.3` / commit `1018449164723ba0203c1beffaba0e21f7829c18`、Windows x64 npm / native bundle、`sharp-libvips@1.3.2` / commit `4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6`，以及 libvips `v8.18.3` / commit `3664cfc5dc2c5661288f5bf5a85ccc51c64c1626`。六个 npm registry tarball 只在仓库内未提交的临时 `.tmp/slice04-artifacts` 计算 SHA-256 后删除，未解包、执行、安装或保留；GitHub commit 只经官方页面 / API 解析，没有下载 source archive。28 项 native version / 逐组件许可由 commit-fixed raw metadata 锁定且 future distribution review 仍阻塞发布。Sharp 与 bundled libvips 是一个复合候选；standalone `REG-NORM-LIBVIPS` 仍未冻结。

同一切片只以 metadata 冻结 15 行格式矩阵、normalize / export 两份合同及各自 30 / 30 / 18 / 18 / event-driven-0 的五 partition lifecycle、QA、两份预注册和 seal intent。每项初始 C1 只计 sealed 30 + 18 = 48；open calibration 与 append-only escape 排除，有限来源要求 3 / 3 repeats 全过。所有像素和 operation oracle 均为 `not-created`；seal 只 pin Slice 03 envelope，actual runner、durable ledger、trust、角色 assignment / approval 未建，request 状态 `not-issued-awaiting-custodian-bundle`。

这在 Slice 04 关闭时不是 Gate B：当时 operation artifact schema / independent oracle / gold、adapter、执行位置、named hardware、资源 guardrail、幂等 / timeout / retry / reconciliation、实际输入输出 smoke 与开放 calibration 都未建立。Slice 05 把开放定义条件冻结为新 `@0.5.0` 版本；这不倒写 Slice 04，也不授予 Gate B。该版本后续实际 smoke 已明确 non-pass，禁止进入 calibration；正式 bundle 和一次性正式运行只能等待另一个新版本通过自己的 smoke、开放 calibration，以及 calibration 后最终版本、阈值与预注册的独立审计。

### 2.2 Slice 05 定义已冻结，真实 smoke 已关闭为 non-pass

Slice 05 的历史范围自包含 [SLICE_05_CONTRACT.md](research/SLICE_05_CONTRACT.md) 的 Git commit 起生效；该合同保持原样。当前 machine definition 于实际 UTC `2026-08-15T04:23:38.389Z` 冻结，definition index `contentHash=d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271`、file SHA-256 `8cbf1f0aaf018c54b95eaa5ef0f3a2f6cb11dc60529ea569408496514d582d96`，366-file descendant tree 为 `8b340918e423043538997250c63b9b49b175b2d2b349c4835de48dd017ed82c0`，368-file full tree 为 `108812d4eec84fa3037f8540d8fb273748982beb5e5f28a07eb7cda93e1218f2`。

冻结树含 25 份 strict schema、6 份 operation-specific manifest、108 份 source provenance / raw asset、54 份 independent export input artifact 与 54 份 independent gold；在 definition freeze 时 results 为 0。随后唯一注册 smoke 于 `2026-08-15T04:52:05.490Z` 至 `2026-08-15T04:52:10.426Z` 生成独立的 116-file result tree（SHA-256 `e6cd4aea45419cc4fd02724555fb439191162ca4f5aaab6a00834f8898d8256b`）：36 request、36 claim、36 terminal result、72 ledger event、各两份 summary、decision 与 session audit，以及一份 fault result，artifact 为 0。normalize `6 pass / 12 non-pass`，export `9 pass / 9 non-pass`；18 次 applicable attempt 全部为 `S05_OUTPUT_ORACLE_REJECTED`，normalize 另有 3 次 sRGB rejection code mismatch。fault semantics 注入场景 `6/6` 通过；两份 operation summary 的 registered candidate-attempt counters 中 invalid / timeout / cancelled / unknown reconciliation / replacement 均为 0。

两项 decision 均为 `denied-not-entered`、`calibrationAuthorized=false`，因此当前版本的 96 个开放 calibration 来源 / 288 个 planned repetition 全部不得运行。首次未注册调用因 sandbox `mkdir EPERM` 在任何 request / claim / result 之前终止；随后获批调用是唯一注册 smoke，不是选择性重跑。durable 记录只能证明 worker IPC 返回并通过严格响应校验的 output bytes，随后被 precommit independent oracle 拒绝；进程退出确认未持久化（`workerExitConfirmed=null`），具体 oracle 子因保持 unknown，不得补猜或通过重跑挑选解释。所有格式继续 `productSupport=false`，正式 holdout、defect-holdout、escape、bundle、request、receipt、formal runner / trusted authority 继续为 `not-created`；C1、U1、E1、R1-pipeline、R1-product-validation、R1-product-release、O1、G1、V1 与 Release Gate 全部维持 0。完整验收与非能力边界见 [Slice 05 证据](research/SLICE_05_EVIDENCE.md)。

### 2.3 Slice 06 先诊断、后选候选；本切片不做 Gate B

Slice 06 Phase A 冻结 [scope contract](research/SLICE_06_CONTRACT.md)；Phase B 已实现 strict adapter、isolated worker、independent PNG diagnostic oracle、durable runner、3 份落盘 oracle record schema、10 份 runner-exported strict schema document 与 3 组 fake-only tests。pre-definition lifecycle patch 后 oracle / runner / runtime 合计 `46 / 46`，4 个脚本语法检查通过，独立审计 `P1 / P2 / P3 = 0 / 0 / 0`，10-file deterministic set SHA-256 为 `b6371a5c09a9c834dc24f508df672b5c26adfd65684cadc6401108b12c4f0da4`。这些测试只在内存构造 synthetic PNG bytes、在系统临时目录构造 fake closure / result tree；没有运行真实 Sharp 图片路径，也没有创建或提交 canonical repository output、fixture wrapper 或 result。

Phase C 已冻结 `REG-NORM-SHARP@0.6.0`、normalize / export 两份 `CapabilityContract@0.6.0`、两份 operation-specific diagnostic preregistration、fresh runtime / hardware、rights / retention / error registry、2 份 manifests 与 8 个 lineage wrapper。计划分母固定为 8 个既有 public-synthetic regression source unit，每项 3 次，共 24 次：normalize / export 各 3 个 opaque / partial-alpha / alpha-holes applicable lineage，另分别增加 missing-sRGB 与 invalid-artifact preflight sentinel；这些 wrapper 只引用既有公开 synthetic bytes，不复制图片进入 Slice 06 tree。

results-zero definition 已以真实 UTC `2026-08-15T08:17:06.288Z` 冻结：26 schemas、23 个非 index records、49 descendants、50 machine files，连同 README 为 51 files；index content / file SHA-256 为 `d537199c8bc6147761da297daeddb03e1ff837a83c8d2c57af29c9e5b9b67e08` / `1cb934a1d870a62e9ccb706e3c21dcdbb54de55f027a325e31230ac4bf3cb20c`，full-tree SHA-256 为 `19a42a2e63b73fb0971e7038e4470c02551dce9b0ddba2dfc87dd3e5780d47b3`。冻结后唯一 invocation 的 result tree 为 152 files / 34 dirs / 583,198 bytes，SHA-256 `4c82a65083ccc1675a65d632010360d991171255ec5ef74b4a50092f701dd146`。

该唯一 invocation 已按顺序完成 normalize / export 各一个 operation run。每项 3 个 applicable source 均 3 / 3 `characterized-oracle-non-pass`；对应输出的 decoded pixel hash 与 gold 相同、filter 均为 0，但 chunk 顺序为 `IHDR,pHYs,IDAT,IEND`，因此 primary code 固定为 `S06_ORACLE_PNG_SRGB_REQUIRED`，并记录 `S06_ORACLE_PNG_METADATA_FORBIDDEN`。normalize missing-sRGB 与 export invalid-artifact sentinel 各 3 / 3 在 worker 前按精确 code 拒绝。Slice 06 到此关闭，禁止重跑；所有 output 仍只是 quarantine diagnostic bytes，Gate B / calibration / C1 / productSupport 不变。下一切片应重新版本化并评估 candidate-owned canonical encoder，而不是放宽合同或让 oracle 修补输出。

## WP3 · 主体 / 背景纵深

### 3.1 原子能力对测

1. 先用 `NORMALIZE-DELIVER` suite 固定解码、方向、颜色空间、Alpha 与正式导出合同；所有候选只接收同一 `NormalizedImage`。
2. 在 `MATTE-GT` / `MATTE-REAL` suite 的 `dev/calibration` 来源上确认指标实现、视觉锚点、适用 / 拒绝边界和合理阈值区间。
3. 冻结引擎配置、正式阈值、适用分母、困难类别、重复次数、人工修正预算和灾难性失败。
4. 一次性运行两个 suite 的全新独立 `holdout`，保存全部成功、正确拒绝和失败。
5. 同一来源按预注册次数重复；确定性阶段比较规范解码后的像素 / 区域 hash，非确定性服务要求差异落在冻结容差内。

`dev/calibration` 的正式 Matting 比较臂必须在**同一个声明分母**上至少包含两个已锁版本且许可允许当前研究的连续 Alpha 候选，以及一个已登记的简单基线；SAM 2 一类粗分割 / 交互 mask 只能作为上游区域候选，不能充当 Alpha 比较臂。市场基准可合法调用时登记服务、条款日期、输入输出、尝试预算、成本与实测协议；不可取得时按 WP2 预注册缺席。若只能找到两个共同支持人像的 Alpha 候选，就把首次 C1 明确缩为人像分母，并对商品、动物和其他对象 fail closed，不用不同候选各自擅长的子集拼成“通用 Matting”。

内部链固定为：

```text
normalize
→ detect / select
→ segment
→ matte
→ edge-refine / decontaminate
→ 黑、白、高饱和彩底预检
→ 可选 erase / restore correction，生成 MatteRevision
→ 重跑 runtime QA
→ transparent / solid render
→ export DeliveryArtifact
→ 重开文件、像素 / alpha / ICC / metadata / bytes / hash 最终 QA
```

首次自动结果与修正后结果分别报告；预注册最多修正次数、允许修正面积、父 matte / revision 关系和超限回退，不能只报告修正后的最好结果。记录前景 IoU、Alpha MAE、normalized SAD / MSE、gradient / connectivity、按输出尺度归一的边界指标、分辨率 / 通道、运行时间和资源；这些指标及任何示例数值都只是**候选阈值**，必须先与视觉可用性、分辨率、主体类别和市场基准校准。真实图由独立评审检查发丝、毛边、色边、孔洞、透明结构和背景残留。主体大块误删、关键人物 / 商品缺失或错误主体选择属于灾难性失败，不能被平均分抵消。

离线 evidence QA 使用 Alpha 真值和人工金标判定能力；运行时 product QA 只能使用真实上传时可获得的输入与派生产物。二者必须登记为不同 QA contract，离线 IoU / MAE 不得伪装成任意用户图片的下载门禁。CAP-08 自身的 C1 由独立金标和密封 defect-holdout 验收，不能由同一 QA 输出自我证明。

满足预注册指标、困难类别与灾难性失败上限后，版本化的检测 / 分割 / Matting 原子能力才取得 C1。

### 3.2 用户可见实用效果

- 透明主体：输出原尺寸 RGBA PNG，Alpha 与本次 C1 管线可追踪。
- 纯色换底：复用同一 Alpha，通过确定性合成生成；检查背景颜色、安全前景内部像素和边缘融合。
- 下载资产使用独立 `DeliveryArtifact`，记录 MIME、尺寸、ICC、Alpha / premultiply、元数据、字节数与 hash；`NormalizedImage` 只作规范输入，不能兼任交付物。
- 不用生成背景、美化、裁切或锐化改善分割评分。
- 正确拒绝是结果的一部分；未通过 QA 的结果不进入下载或参考样例。

透明主体和纯色换底分别按自己的生产等价任务契约取得 U1。两者共享 C1 底座，但证据和下载契约不能互相代替。

## WP4 · 自然增强

1. 先在注册表冻结本地非生成 `CAP-06.enhance-natural` 合同：只含曝光、白平衡、对比、色彩、降噪、轻度去模糊和适度锐化，并明确限幅、no-op、颜色空间、确定性与像素保护；底层可使用已锁定的 Sharp / OpenCV 原语，但合同版本独立于库版本。
2. 再接入学习型候选；任何会生成细节的模型必须单独标记，默认不进入自然增强。
3. 在校准集冻结每种退化的适用范围、增强上限、拒绝 / 警告条件和指标。
4. 先在 `NATURAL-DEGRADE` suite 的 `dev/calibration` 上校准，再以不同来源的独立 `holdout` 测恢复误差、结构 / 感知相似度、颜色锚、噪声与清晰度，并按冻结裁决规则做至少三人盲评；两名首评不一致时触发第三评审，无法裁决按失败处理。
5. 检查人物身份、物件、文字、几何、边界和裁切没有变化；高质量原图进入 no-op / 轻处理组，防止“为了明显而过度处理”。

原子步骤满足冻结指标后记录 C1；完整“自然增强”效果以生产等价契约通过冻结质量、任务 QA、重复性和适用 / 拒绝门槛后记录 U1。离线证据 QA 与运行时过度处理 / no-op / 文件完整性 QA 分开注册。参考对的 Release Gate 另行判断，不耦合进 U1。

超分辨率、旧照修复、严重失焦和人脸恢复仍属于 `CAP-06`，但要登记为独立的重建型效果并单独取证，不借用自然增强 U1。

## WP5 · CR1 / CR2 创意对测

- CR1：手绘记忆重构。
- CR2：结构套色重组。

实施约束：

1. 两者先使用 `CREATIVE-COVERAGE` suite 中同一组 **6 张 `dev/calibration` 来源**、同一生产输入角色、模型质量、画幅和尝试预算。
2. 冻结模型 / 服务版本、配方、Prompt、参考角色与输出规格；实验载荷必须与未来任务相同。
3. 每个正式组合先运行一次；允许一次针对单一已记录失败原因的诊断重试，但原始失败保留，诊断输出不冒充首轮正式成功。
4. 记录来源可辨认、主体数量、关键物件、must-keep、变化幅度、审美完整性、效果身份、假文字 / 水印、参考泄漏、延迟和成本。
5. 只有达到预注册初筛门槛的方向才冻结新版本；正式复验使用全新的 **6 类 × 每类 3 张 = 18 张 `holdout` 来源**，每张以同一冻结版本至少独立运行 2 次。
6. 在看 holdout 前冻结 `primary_estimand`、来源级双次运行聚合规则、总体与类别下限、资格 / 拒绝分母、灾难失败上限和置信区间；`first-pass` 默认作为能力稳定性的主估计量，`success-within-2` 作为生产策略补充，除非预注册另有更严格定义。
7. 分别报告 `first-pass` 和 `success-within-2`，不得只报告两次内最好结果；修改 Prompt、参考角色、模型、配方、正式重试策略或关键参数即创建新版本并完整重跑 holdout。

“最多两次”统一指用户明确发起的 `user_execution`；一次用户执行可包含版本化管线的有限 `pipeline_attempt`，每个 attempt 又可包含一个或多个可计费 `provider_call`。三层计数全部进入 manifest，按错误类别冻结重试上限；系统内部重试不能把第二次用户执行藏起来，也不能在 `UNKNOWN` 时自动重提。

盲评使用随机化 ID 与顺序并隐藏候选 / 引擎。至少两名首评独立作答；任何主判定分歧触发第三评审，仍无法裁决则按失败而不是从分母删除。评审一致性指标与最低接受值必须在 holdout 前冻结。

满足冻结适用分母、最低成功率、跨类别和重复性要求后才记录 E1。CR1 或 CR2 可以单独入选；两者都失败时，混合产品门不通过，其他基础工作包继续。

## WP6 · 生产等价无界面管线

为每个计划进入研究或形成性测试的任务实现：

```text
输入与权利快照
→ 归一与 Source Card
→ 资格过滤
→ CAP-09.execute 生成冻结 ExecutionPlan
→ 原子能力数据 DAG / 任务执行
→ 任务专属 QA
→ ReferencePair / ComparisonBundle
→ DeliveryArtifact
```

`CAP-09.recommend` 不在效果质量 DAG 内；只有自动从多个已达标效果中排序时才作为选择依赖。用户或研究协议直接指定效果时，可以验证 U1 / E1 与 R1-pipeline 而不先证明推荐价值。

每次运行冻结：

```text
source_revision + normalized_source_hash
consent_snapshot + data_notice_version
analysis_id + analyzer_version + catalog_version
target_kind(effect|scene)
effect_id + effect_version 或 scene_id + scene_version
settings_hash
pipeline_or_recipe_version + engine_config_hash
reference_hashes + output_spec_hash + qa_profile_version
run_id + active_run_id + attempt + idempotency_key
```

为每个 `effect_id + version + pipeline_version + surface_stage` 冻结 R1 acceptance matrix，至少包含：初始页面 / 任务状态、注入故障、预期用户状态、预期后台状态、可恢复动作、重复次数、允许失败数和证据 run。覆盖成功、正确拒绝、QA 拒绝、输入错误、安全阻断、限流、瞬时错误、永久错误、超时 / `UNKNOWN`、换图、换任务、设置变化、过期响应、错误下载、重复提交和服务重启。超时不得自动重提；旧响应只进入审计，不能污染当前结果。错误来源 / 效果下载、stale state 回填、重复计费或未授权外发属于安全不变量，允许失败数为 0。

所有计划给用户使用的任务完成该闭环后，分别记录 R1-pipeline。mock、预置结果或只跑成功路径不能取得该证据。

## WP7 · O1：Operational 运维

每个目标环境先冻结版本化 `O1Profile`：`profile_id/version`、效果 / pipeline scope、硬件与软件环境、输入像素 / 格式分层、冷 / 热启动、并发级别、每格运行数、观察窗口、重试政策、p50 / p95 与成功成本上限、峰值内存 / 显存、错误预算、恢复时限和总体通过公式。没有这些分母与阈值时只能记录观测，不能授予 O1。

O1 至少覆盖：

- 在目标环境预先冻结 p50 / p95 时延、单次与可用结果成本、内存 / 显存、并发、冷启动、限流和故障恢复目标；
- 持久任务状态、幂等键和重复请求去重；
- 有上限且按错误类别执行的重试，`UNKNOWN` 查询与用户明确重试；
- 队列、并发、背压、超时、取消等待和服务重启恢复；
- CPU / GPU / 内存、延迟、外部调用、单次与可用结果成本监测；
- 结构化脱敏日志、请求关联、错误聚合、告警和健康检查；
- 临时输入、中间资产、失败结果和下载资产的保留 / 删除任务；
- 备份范围、恢复演练、版本回滚和供应商不可用降级；
- 失败结果隔离，QA 未通过的资产不能被下载或发布。

通过冻结 O1Profile、故障注入和恢复清单后记录 O1。自动测试数量、一次成功运行或“本机能启动”都不等于 O1。

## WP8 · G1：Governance 治理

G1 的数据与安全合同见 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md)，研究参与者与真实用户数据边界见 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md)。任何远程服务的 `dev/calibration` 调用也必须先完成轻量 remote-service preflight，不能等到完整 G1 才说明图片发给谁、保留多久或如何删除。

G1 至少覆盖：

- 每个第三方库、精确权重 / checkpoint、模型、训练 / 测试数据、服务和素材的来源、版本、许可证 / 条款与本地边界；
- 用户在上传或网络内容分析前确认有权处理，看到数据发送对象、用途、保留 / 删除策略；换图后确认失效；
- 处理权、公开展示权与商业宣传权分开，不从上传行为自动推导发布许可；
- 人像、未成年人、商标、艺术品、地点、敏感图片和模型安全策略；不从脸部推断年龄；
- API 密钥只在服务端，日志 / 前端 / 记录中不出现秘密或原始私人路径；
- 资产账本 100% 可对账、零未知许可、审批人 / 复查期限与删除演练可验证；参考来源、结果、失败图和营销样例是否可见则逐项进入独立发布 allowlist，不把“全部资产已获发布权”设为 G1 本身的条件；
- 任务、引擎、配方、Prompt、QA、输出、文案与条款版本可审计；
- 用户图片不默认用于训练、夹具、公开参考或商业宣传；删除请求和留存任务可验证。

完成书面检查、全量账本对账、抽样审计和删除 / 权限演练后记录 G1。G1 证明治理机制成立；单张资产的 Release Gate 仍可独立为 0 或被撤销。

通用底色头像与官方证件照明确分开。护照、签证、身份证、考试或机构照片在本计划中不实现；未来必须有完整的地区、签发机构、证件类型、提交渠道、规则版本、官方来源、核对时间和受理声明，且遇到禁止数字修改的规则应拒绝处理。

## WP9 · 6–8 人形成性测试

### 入场条件

- 只使用已取得 U1 / E1 的任务。
- 相应任务已有 R1-pipeline，整体 O1 与 G1 已完成。
- 所有参考对有发布权限，测试输入有处理许可。

### 方法

- 按 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) 招募 6–8 名目标用户；记录其实际图片任务，不让其评价虚构功能清单。
- 可以使用研究员主持的低保真壳层，但必须调用真实管线并展示真实等待、失败和结果。
- 要求用户自行解释每张任务卡会保留什么、改变什么，再完成选择、执行、比较和下载。
- 记录总用时、真实执行次数、求助、误选、失败恢复、可用性判断和主动下载。
- 这一轮允许修改任务命名、规则、排序、参考、必要设置、错误文案和恢复路径；所有修改都有版本记录。

退出：高频理解问题已处理，未解决风险可接受或明确移除；形成性参与者和数据不进入 V1 分母。

## WP10 · 冻结与最小冻结验证界面

形成性测试后一次性冻结：

- 本轮冻结验证范围和每项证据状态；
- 资格 / 拒绝规则、推荐理由和任务去重；
- 参考对、任务契约、必要设置和输出格式；
- 引擎 / 配方 / Prompt、QA、运行和恢复行为；
- 核心文案、数据告知、主流程和用户成功定义。

然后只开发支撑真实任务验证所需的最小冻结验证界面：

1. 单图选择与版本化处理权 / 数据告知。
2. 图片摘要和最多少量合格任务；不显示未达证据门槛的卡片。
3. 为什么适合、会保留什么、会改变什么、预计等待与格式。
4. 仅显示任务必需设置。
5. 真实执行与真实状态，不虚构进度。
6. 任务 QA；失败结果不能下载。
7. 原图 / 参考 / 结果比较，以及同一任务一次明确重试或换任务。
8. 按冻结格式下载。

该界面是桌面研究壳，不是正式桌面产品页面：不投入品牌重设计、完整视觉系统、移动 / 平板断点、营销入口或完整目录。创意方向没有 E1 时，可以继续对已达标实用任务做冻结研究，但不得称为混合邀请测试，也不得用 E0 概念图补卡。完成冻结 Windows / Chromium 范围的桌面主路径、键盘、缩放、错误、`UNKNOWN`、过期响应、刷新恢复和真实下载验证后，记录绑定 `surface_stage=validation` 与精确界面版本的 `R1-product-validation`；它不得自动继承给正式页面。

## WP11 · 至少 18 人冻结验证

### 参与者与版本

- 至少 18 名符合目标用户定义且未参加形成性测试的参与者；“至少 18 名”只是总体起点，不自动证明每个待发布效果都有足够分母。
- 全部使用同一冻结验证界面、任务范围、模型 / 管线、参考、QA 和文案。
- 正式开始前按 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) 冻结 `V1Scope`：每个 effect / variant 的最小有效人数和分配方式、ITT 与 eligible 分母、资格拒绝、退出、无效会话、主成功率、置信区间、分组观察、停止规则、主持人介入上限和数据处理方式。

### 核心成功事件

从用户选择图片开始计时，必须同时满足：

1. 三分钟内完成。
2. 最多两次真实执行；查看、比较和下载不另计执行。
3. 最终结果通过任务 QA。
4. 用户明确判断结果可用于其原始任务。
5. 用户主动下载结果。

记录资格拒绝、任务选择、每次执行、等待、QA、恢复、完成时间、可用性判断和下载事件。研究员代替点击、口头告诉正确任务或手工修图的会话不能计为独立成功。

达到预注册总体与每个 scope 门槛后记录绑定 `surface_stage=validation` 的 `V1-validation`。验证中发生实质修改时停止当前版本，为新版本重新招募；不得把形成性样本、旧版本样本或内部团队数据合并进冻结分母。主动下载是联合成功事件的一部分，不单独作为需求代理；同时记录独立可用性判断、原始用途完成和主持人介入。

## WP12 · 混合产品设计入场门与正式桌面页面

开始“质量 + 主体 / 背景 + 创意”的正式桌面浏览器产品页面设计前必须同时满足：

1. `effect.natural-enhance` 取得 U1。
2. `effect.subject-background` 至少一个透明或纯色 variant 取得 U1。
3. CR1 / CR2 至少一个取得 E1。

每个方向都必须满足完整公式：

```text
全部依赖能力 C1
+ 对应效果 U1 或 E1
+ R1-pipeline
+ R1-product-validation
+ O1
+ G1
+ 对应冻结范围 V1-validation
+ 验证界面每项用户可见资产 Release Gate
= 进入正式页面设计的资格
```

全部达标后，先在正式页面实现前冻结 `V1MigrationManifest` 的等价规则、允许变化清单、不可迁移项和最小桥接测试，再把经过冻结验证的任务和行为迁入正式桌面页面，开展品牌、桌面信息结构、`1280 × 720` / `1440 × 900` 视觉和无障碍设计。此门只允许设计与复验，不等于已经可以开放邀请 beta。正式页面不能改变任务合同、QA 或成功定义；确需改变时先创建新版本并重新取得受影响证据。移动、平板和其他浏览器不随之纳入。

若 CR1 / CR2 都没有 E1，主体 / 背景、自然增强、R1-pipeline、O1、G1 和形成性研究继续，但 WP12 保持未启动。要把产品改为纯实用方向，必须另行获得用户批准、更新范围并重新冻结相应验证，不能由团队自行降格上线。

## WP13 · Release surface 复验与混合邀请 beta

正式桌面页面完成后：

1. 以 `surface_stage=release` 和精确构建版本完整重跑受影响 R1 acceptance matrix，取得 `R1-product-release`。
2. 对照 WP12 事前冻结的等价规则审计实际差异，并执行定向桥接测试；结论逐 scope 记录为 `migrate / partial-rerun / full-rerun`。超出预注册范围的变化必须为受影响 effect / variant 重新招募并取得 `V1-release`，不得事后扩写等价范围。
3. 在冻结 Windows / Chromium、`1280 × 720` 与 `1440 × 900` 桌面环境复核 O1、G1、可访问性、真实下载和新增用户可见资产 Release Gate。

混合邀请 beta 的发布公式为：

```text
全部依赖能力 C1
+ 对应效果 U1 或 E1
+ R1-pipeline
+ R1-product-release
+ CompatibilityProfile 与 TestEvidenceManifest（同一 build、声明范围，决定为 pass）
+ O1
+ G1
+ V1-release（或通过预注册等价迁移的 V1）
+ ReleaseManifest（同一制品、配置、schema、供应商与数据策略；部署 / 回滚 / 恢复硬门通过）
+ 每项用户可见资产 Release Gate
= 可进入混合邀请 beta
```

验证壳上的 `R1-product-validation` / `V1-validation` 不得仅通过改名升级。

## 冻结验证界面前的检查清单

- [ ] `dev/calibration`、`holdout`、`defect`、`escape` 四套集合与 suite 分配可审计，来源与权利完整。
- [ ] 主体 / 背景原子底座至少取得 C1。
- [ ] 验证范围内的实用效果取得 U1，创意效果取得 E1；未达标任务不进入研究界面。
- [ ] 每个可见任务取得 R1-pipeline。
- [ ] O1 与 G1 完成。
- [ ] 6–8 人形成性测试完成并有修改记录。
- [ ] 任务、参考、版本、QA、核心文案和成功定义已经冻结。

## 正式桌面页面设计前的检查清单

- [ ] 自然增强 U1、主体 / 背景至少一个 variant U1、CR1 / CR2 至少一个 E1。
- [ ] 三个方向的依赖 C1、R1-pipeline、R1-product-validation、O1、G1、V1-validation 和验证资产 Release Gate 均完整。
- [ ] 至少 18 人冻结验证达到预注册门槛。
- [ ] 没有用形成性参与者、旧版本、内部人员或 E0 样例补足分母和卡位。
- [ ] 优先市场研究簇已按统一任务与字段形成“用户预期 → CAP / effect / scene → 采纳、基准或后置”决定；`pending-source` 不被写成竞品结论。

## 混合邀请 beta 前的检查清单

- [ ] 正式页面取得 R1-product-release；冻结 Windows / Chromium 版本与两个目标桌面视口均在 acceptance matrix 内。
- [ ] V1 已按等价变更规则迁移，或受影响 scope 已重新取得 V1-release。
- [ ] O1 / G1 变更审计通过；全部用户可见资产处于有效 Release Gate allowlist。

## 明确不在本计划实施

- 多图上传、多图逐张、批量、ZIP 或目录工作流。
- 多个结果组成合集、轮播、网页、故事或档案。
- 海报、封面、故事册、模板、自由画布、字体 / 贴纸 / 素材库。
- 自由 Prompt、模型选择、Skill 选择器、模型市场。
- 视频、音频、社交发布、团队、品牌套件、计费和公共部署。
- 官方护照、签证、身份证、考试或机构证件照。
- 手机、平板、Safari、Firefox、iPhone / HEIC、触摸专属交互和完整响应式产品。

这些方向不是永久否定；只有冻结单图验证取得 V1，并出现可观察的用户需求后，才按九类能力地图重新立项和取证。

## 会改变研究路线的真实阻塞

- 无法按来源隔离规则建立覆盖充分的 `dev/calibration`、独立 `holdout` 与 `defect`，或无法安全维护 `escape` 回归记录。
- 所有分割 / Matting 候选都无法提供可测 Alpha，或困难边缘存在系统性灾难失败。
- 自然增强在冻结集上频繁改变身份、事实、文字或产生伪细节。
- 当前服务无法冻结版本、取得必要日志，或成本 / 延迟无法进入形成性测试。
- O1 或 G1 无法满足，尤其是任务幂等、超时恢复、数据删除、来源许可或人像处理边界。

CR1 / CR2 均未达到 E1 不属于基础研究阻塞，但会使混合邀请门和正式桌面页面保持未启动；是否改为纯实用产品必须由用户另行批准。移动、多图、合集或官方证件需求也不扩张当前授权，应另行确认后再立项。
