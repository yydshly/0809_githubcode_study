# 用户效果与场景配方目录

> 文档角色：目标产品的效果与场景事实源。它不是当前 R0 网页的运行目录，也不包含原子能力定义。九类底座见 [CAPABILITY_MAP.md](CAPABILITY_MAP.md)，当前发布状态见 [STATUS.md](STATUS.md)。

## 分类规则

本项目只使用三类 ID：

- `CAP-*`：可复用原子能力；
- `effect.*`：用户可直接选择的单图结果；
- `scene.*`：组合多个能力 / 效果和规格的场景配方。

代码中的 `UT-*`、`CR*` 仅作为 R0 工程探针或历史研究 ID，不再决定产品分类。

每个效果把三类依赖分开记录：`execution_dag` 只包含从输入到用户结果的数据处理节点；`execution_control` 使用 `CAP-09.execute` 管理计划、状态与 fallback，但不作为像素 DAG 末端；`selection_dependencies` 使用 `SourceCard.v0 + CAP-09.recommend` 生成产品选择建议。后者不阻塞效果先取得 U1 / E1，但会阻塞该效果进入正式推荐流程。

### 生命周期

| 状态 | 含义 |
| --- | --- |
| `research-candidate` | 只有研究合同或校准实验，不可进入产品模式 |
| `validated-internal` | 能力 / 效果达到内部证据门槛，仍未取得完整发布资格 |
| `released` | 所有依赖、运行、运维、治理、用户和发布门槛齐全 |
| `parked` | 明确后置，不进入当前实验预算 |
| `no-go` | 许可、风险或结果边界不允许产品化 |

当前没有 `released` 效果或场景。

Slice 02 已冻结 `CC-CAP02-NORMALIZE@0.2.0`、`CC-CAP02-EXPORT@0.2.0` 与 `CC-CAP03-SOURCE-CARD-V0@0.2.0`，但它们只覆盖项目原创小尺寸 RGBA8 fixture，且 C1=0。下列研究态 DAG 用精确版本引用它们，只表示结构依赖可解析；真实用户分母不满足其 eligibility，因此效果仍不可执行、不可进入验证 surface。扩大格式、观察器或分母必须创建新合同版本，不能静默扩写 `0.2.0`。

生命周期不等同于所有 surface 共用一份目录。受控验证 surface 只能从达到研究可见门槛的 `validated-internal` allowlist 中选择；正式产品 surface 只能从 `released` allowlist 中选择。`CAP-09.recommend` 在对应 allowlist 内排序，不能用正式发布门槛反向阻塞 V1-validation。

## 用户效果

### effect.subject-background

用户目标：把一个可可靠分离的主体输出为透明图，或确定性合成到指定纯色背景。

| 字段 | 契约 |
| --- | --- |
| 状态 | `research-candidate`；第一条纵向链 |
| `execution_dag` | `CC-CAP01-INGEST@planned → CC-CAP02-NORMALIZE@0.2.0 → CC-CAP03-SOURCE-CARD-V0@0.2.0 → CC-CAP04-DETECT@planned → CC-CAP04-SEGMENT@planned → CC-CAP04-MATTE@planned → CC-CAP04-EDGE-REFINE@planned → [CC-CAP04-CORRECT@planned，可选] → CC-CAP05-COMPOSE-SUBJECT-BG@planned → CC-CAP02-EXPORT@0.2.0 → CC-CAP08-RUNTIME-SUBJECT-BG@planned` |
| `execution_control` | `CC-CAP09-EXECUTE@planned`；它包裹并记录执行，不作为 Alpha / 像素处理节点 |
| `selection_dependencies` | `SourceCard.v0 + CC-CAP09-RECOMMEND@planned`；只在可见效果已达门槛后生成推荐，不计入本效果 U1 |
| 必须保留 | 主体类别、数量、几何、可见部件、前景核心像素；合格输入中的发丝、毛发、孔洞和软边 |
| 允许改变 | 背景 Alpha；`solid` variant 的指定背景色；用户明确选择的透明外边距裁切 |
| 禁止 | 用生成模型重画主体；白底冒充透明；隐藏边缘失败；把无法可靠区分的半透明物强行判为成功 |
| fallback | 同合同备用 Matting 引擎一次；最小擦除 / 恢复修正；仍失败则拒绝 |

第一次自动输出与经过用户修正的输出必须分别记录 `first-pass` / `corrected-pass`，保留父 `AlphaMatte`、`MatteRevision`、修正次数 / 面积和两次 QA；具体上限仍为 `pending-definition`，不得用无限手工修图证明自动能力。两个 variant 可以共享同一冻结 `AlphaMatte` / `ForegroundLayer`，但证据和 QA 分开记录：

| Variant | 输出 | 独立 QA |
| --- | --- | --- |
| `transparent` | 原尺寸或声明裁切的 RGBA `DeliveryArtifact` | Alpha、边缘、孔洞、色边、主体误删、透明通道、ICC、premultiply、元数据、尺寸与文件重开 |
| `solid` | PNG / JPEG `DeliveryArtifact` + 精确背景颜色记录 | 继承 Alpha QA；目标颜色、背景均匀度、前景核心像素、边缘复合、编码与文件重开 |

### effect.natural-enhance

用户目标：在不补画内容的情况下，克制地改善光线、白平衡、对比、噪声或轻度清晰度问题。

| 字段 | 契约 |
| --- | --- |
| 状态 | `research-candidate`；旧 Canvas 路径不构成 U1 |
| `execution_dag` | `CC-CAP01-INGEST@planned → CC-CAP02-NORMALIZE@0.2.0 → CC-CAP03-SOURCE-CARD-V0@0.2.0 → CC-CAP06-NATURAL-ENHANCE@planned → CC-CAP02-EXPORT@0.2.0 → CC-CAP08-RUNTIME-NATURAL-ENHANCE@planned` |
| `execution_control` | `CC-CAP09-EXECUTE@planned`；只管理已选任务执行与 no-op / fallback |
| `selection_dependencies` | `SourceCard.v0 + CC-CAP09-RECOMMEND@planned`；不计入本效果 U1 |
| 必须保留 | 几何、主体、文字、面部结构和来源事实 |
| 允许改变 | 冻结限幅内的全局光色与经过诊断支持的非生成式降噪 / 清晰度 |
| 禁止 | 强制处理已良好图片；生成伪细节；局部重绘人脸；无预览裁去主体 |
| fallback | 没有可信改善时返回“不建议处理”或原图；确定性缩放不冒充超分修复 |

研究必须包含合成退化真值、真实授权图和 already-good / no-op 三组，不能把用户手调滤镜当作自动自然增强。

当前内部产品页另有 `UT-ENHANCE@local-natural-enhancement-v1` 手动可解释路径：五个固定预设只映射到可见的全局亮度 / 对比度 / 饱和度参数，并复用本地编辑器的撤销、比较、输出重开与下载。它用于产品操作验证，不执行内容分析或自动推荐，不改变本节 `effect.natural-enhance` 的 `research-candidate` 状态，也不授予 U1。

### effect.cleanup

用户目标：删除明确选中的小面积物体或杂物，并只在允许区域内补全。

| 字段 | 契约 |
| --- | --- |
| 状态 | `parked`，等待主体 / 区域与 QA 底座 |
| `execution_dag` | 研究域目标：`CAP-01 → CAP-02.normalize → CAP-03 → CAP-04 → CAP-07 → CAP-02.export → CAP-08`；尚未解析到版本化合同 |
| `execution_control` | 未来使用 `CAP-09.execute`，不作为像素节点 |
| `selection_dependencies` | `SourceCard.v0 + CAP-09.recommend`；后置且不计入效果证据 |
| 必须保留 | mask 外来源像素、主体、透视和已有事实 |
| 允许改变 | 用户选择 mask 与必要羽化边界内的推测性填补 |
| 禁止 | 把补全称为真实历史；扩大 mask 隐藏失败；无提示改动主体 |
| fallback | 缩小选择、撤销、一次明确重试或拒绝 |

### effect.scene-background

用户目标：保留已验证前景，替换为用户图片或生成背景。

| 字段 | 契约 |
| --- | --- |
| 状态 | `parked`，等待 `effect.subject-background` 达到 U1 |
| `execution_dag` | 研究域目标：`CAP-01 → CAP-02.normalize → CAP-03 → CAP-04 → CAP-05 → CAP-07 → CAP-02.export → CAP-08`；尚未解析到版本化合同 |
| `execution_control` | 未来使用 `CAP-09.execute`，不作为像素节点 |
| `selection_dependencies` | `SourceCard.v0 + CAP-09.recommend`；后置且不计入效果证据 |
| 必须保留 | 已锁定前景、主体数量与身份敏感像素 |
| 允许改变 | 独立背景、显式选择的接触阴影和全局匹配层 |
| 禁止 | 全图重画后声称前景原样；暗示人物真实到过新地点；参考人物 / 商品 / 商标泄漏 |
| fallback | 用户图片背景、纯色、背景虚化或拒绝 |

### effect.subject-focus

用户目标：只通过背景景深、明暗或克制色彩变化突出主体。

状态为 `parked`。其 `execution_dag` 研究域目标为 `CAP-01 → CAP-02.normalize → CAP-03 → CAP-04 → CAP-05 → CAP-02.export → CAP-08`，`execution_control=CAP-09.execute`，`selection_dependencies=SourceCard.v0 + CAP-09.recommend`；其中必须使用合格 `AlphaMatte` 与确定性合成。历史 R17 的外围压暗只能作为交互线索，不能作为能力证据。

## 创意效果

创意方向允许重构视觉媒介，但必须显式说明不保证人脸或像素级身份一致。完整实验细节见 [EFFECT_SHORTLIST.md](EFFECT_SHORTLIST.md)。

| Effect ID | 历史 ID | 用户结果 | 当前角色 | `execution_dag` 研究域目标 |
| --- | --- | --- | --- | --- |
| `effect.creative.memory` | `CR1` | 手绘记忆重构 | `research-candidate`，首轮对测 | `CAP-01 → CAP-02.normalize → CAP-03 → CAP-07 → CAP-02.export → CAP-08` |
| `effect.creative.halftone` | `CR2` | 结构套色 / 半调重组 | `research-candidate`，首轮对测 | `CAP-01 → CAP-02.normalize → CAP-03 → CAP-04 → CAP-07 → CAP-02.export → CAP-08` |
| `effect.creative.ink-relationship` | `CR3` | 极简墨迹关系 | `parked` | `CAP-01 → CAP-02.normalize → CAP-03 → CAP-07 → CAP-02.export → CAP-08` |
| `effect.creative.imprint` | `CR4` | 原照与记忆印记 | `parked` | `CAP-01 → CAP-02.normalize → CAP-03 → CAP-05 → CAP-07 → CAP-02.export → CAP-08` |

四个创意效果统一使用 `execution_control=CC-CAP09-EXECUTE@planned`，`selection_dependencies=SourceCard.v0 + CC-CAP09-RECOMMEND@planned`；推荐不计入 E1。CR1 / CR2 进入正式对测前，还必须把上述域目标分别解析到 `CC-CAP07-CREATIVE@planned`、对应 runtime QA 等合同，并在 Gate B 前替换为冻结版本。CR1 与 CR2 先用六张开发图低成本筛选。入围者必须使用全新的六类 × 三张 holdout，并在同一冻结配方下独立运行至少两次。达到 E1 后仍需 R/O/G/V 与 Release Gate，不能直接成为产品卡片。

## 场景配方

下列条目只有在依赖 DAG 明确且所有节点均解析到已发布版本后，才能成为可执行 `SceneRecipe`。每个引用必须写成 `effect_ref=(effect_id + effect_version + variant)`，并声明 `output_selector` 与 `additional_capability_contracts`。effect 只展开一次；只有合同版本、父输入和参数完全相同的节点才能复用，否则编排器必须报冲突。未由 EffectDefinition 暴露的中间产物不能靠路径猜测读取。标记 `dependency_dag=pending-definition` 的条目只是方向占位，不得进入验证界面或用于依赖传播。

### scene.registration-portrait

普通简历、员工目录或非官方报名头像。它不是护照、签证、身份证或“审核必过”能力。

当前内部试用页已提供一条窄工程路径：本地冻结 1:1 / 4:5 构图后复用远程背景移除，再在本地修正 Alpha 和合成纯色 JPEG。它只验证用户路径和工程组合，不改变下表的正式产品 / 发布状态；人像资格、自然任务质量与机构规格仍未取得证据。

| 字段 | 契约 |
| --- | --- |
| 状态 | `parked`，等待人像资格、Matting、合成与几何能力 C1，以及所引用效果达到 released |
| 候选 `effect_ref` | `effect.subject-background#transparent@pending-released-version`；当前版本不存在，不能执行 |
| `output_selector` | 候选为该效果显式暴露的 `intermediate.foreground_layer`；若最终 EffectDefinition 不暴露它，本场景必须直接引用同一冻结 CAP-04 合同，不能从成品 PNG 反推 Alpha |
| `additional_capability_contracts` | 人像头肩 placement、场景导出与人脸 / 边缘 / 构图 QA 均为 `pending-definition`；执行控制使用 `CAP-09.execute`，正式场景推荐另依赖 `CAP-09.recommend` |
| 允许 | 版本化通用规格或自定义像素；纯色底；RGBA 前景等比缩放 / 平移；格式和文件上限 |
| 禁止 | 换脸、瘦脸、生成耳朵 / 头发 / 正装、强美颜、旋转 / 拉伸人物、推断成年 |
| 拒绝 | 用户无法确认成年与处理权；多人、严重侧脸 / 遮挡、过低分辨率、来源头肩截断 |

参数草案见 [PORTRAIT_PARAMETERS.md](PORTRAIT_PARAMETERS.md)。其中数值仍需随实际能力校准，不能先于依赖能力冻结为产品承诺。

### scene.official-id-photo

状态为 `parked`，`dependency_dag=pending-definition`，当前不是可执行 `SceneRecipe`。每个官方 profile 必须独立记录地区、签发机构、证件类型、提交渠道、版本、官方来源、核对时间和受理承诺，然后按该 profile 定义允许的效果 / CAP DAG。规则禁止数字处理时，只能检查、执行允许的确定性操作或提示重拍。

### scene.product-main-image

状态为 `parked`。候选 `effect_ref=effect.subject-background#solid@pending-released-version`，`output_selector=output.delivery_artifact`；商品专属资格、构图 / 平台导出与 QA 作为 `additional_capability_contracts=pending-definition`，执行控制与推荐分别使用 `CAP-09.execute` / `CAP-09.recommend`。只有引用版本发布、附加合同冻结且没有重复执行归一 / 合成 / QA 后，才形成 `SceneRecipe`。AI 场景背景、批量、品牌规则与平台发布不是首轮范围。

### scene.old-photo

状态为 `parked`。候选 `effect_ref=effect.natural-enhance@pending-released-version`，`output_selector=output.delivery_artifact`；去噪、去模糊、超分与局部修补只能作为版本化 `additional_capability_contracts` 逐项追加，不得重复运行自然增强内部 CAP-06。执行控制与推荐分别使用 `CAP-09.execute` / `CAP-09.recommend`。人脸恢复是高风险显式步骤，不得混入普通增强或证件路径。

### scene.social-image

状态为 `parked`，`effect_ref=pending-definition`、`output_selector=pending-definition`。候选 `additional_capability_contracts` 覆盖主体感知裁切、比例、扩图 / 背景填充与平台导出；执行控制与推荐分别使用 `CAP-09.execute` / `CAP-09.recommend`。在先定义用户可选 effect 之前不得直接把一串 CAP 域当作可执行场景，不引入模板、文字排版或社交发布。

当前内部产品页另有 `UT-TEMPLATE@local-scene-template-v1` 确定性工程路径：方形分享、竖版分享、横版封面、竖屏故事与商品方图只映射到公开的画面比例和最长边上限，并允许继续移动裁剪框和手调设置。它不读取平台规则、不做主体感知裁切 / 扩图 / 排版 / 发布，也不改变本节 `scene.social-image` 的 `parked` 状态。

### scene.memory-keepsake

状态为 `parked`。候选 `effect_ref` 只允许选择已发布版本的 `effect.creative.memory` 或 `effect.creative.halftone`，`output_selector=output.delivery_artifact`；后续确定性构图 / 交付 / QA 只能写入版本化 `additional_capability_contracts`，不得重复展开 effect 内部节点。执行控制与推荐分别使用 `CAP-09.execute` / `CAP-09.recommend`。实际胜者未发布前不形成 `SceneRecipe`。多页故事、合集和印刷产品继续后置。

## R0 旧 ID 映射

| R0 / 历史 ID | 当前规范 | 说明 |
| --- | --- | --- |
| `UT-CUTOUT` | `effect.subject-background#transparent` | 旧代码仍可保留该 ID，但不代表效果已验证 |
| `UT-SOLID-BG` | `effect.subject-background#solid` | 与透明 variant 共用 Alpha，证据独立 |
| `UT-TUNE` | `effect.natural-enhance` | 当前 Canvas 实现只是工程探针 |
| `UT-ENHANCE` | `effect.natural-enhance` | 内部页的手动可解释光色路径，不授予 U1 |
| `UT-TEMPLATE` | `scene.social-image` | 内部页的确定性比例 / 尺寸起点，不是平台规范或正式 SceneRecipe |
| `UT-PORTRAIT` | `scene.registration-portrait` | 从效果层降为场景配方 |
| `UT-OFFICIAL-ID` | `scene.official-id-photo` | 严格按 profile 独立验证 |
| `UT-CLEANUP` | `effect.cleanup` | 后置 |
| `UT-SCENE-BG` | `effect.scene-background` | 后置 |
| `UT-FOCUS` | `effect.subject-focus` | 后置 |
| `CR1–CR4` | `effect.creative.*` | 历史研究 ID，不是当前发布状态 |

本轮不修改 R0 `/` 页面、`server/server.mjs` 的旧任务路径或正式产品调用链；Slice 02 / 03 只在各自隔离的 research workspace、生成器、validator、测试与 reference adapter / 密封仪式 helper 中增加研究代码。R0 网页继续使用旧 ID，但所有产品与研究结论以本文件的新分类为准。

## 可见与发布规则

产品模式只允许加载同时满足以下条件的效果：

```text
execution_dag 中全部 CapabilityContract 取得 C1
+ 自身 U1 或 E1
+ execution_control 的 CapabilityContract 取得 C1，且目标效果取得 R1-pipeline
+ 若进入推荐入口，selection_dependencies 全部取得 C1
+ R1-product-release（精确正式界面 build）
+ CompatibilityProfile 与 TestEvidenceManifest（同一 build、声明范围，决定为 pass）
+ O1
+ G1
+ 对同一正式界面 build 与效果版本有效的 V1，或已批准的 `V1MigrationManifest`
+ ReleaseManifest（同一制品、配置、schema、供应商与数据策略；部署 / 回滚 / 恢复硬门通过）
+ 每个用户可见来源 / 结果资产通过 Release Gate
= 可发布
```

`CAP-09.recommend` 不参与 U1 / E1 的像素质量结论，但缺少它时效果只能在受控研究中被显式选中，不能以“AI 推荐”进入产品入口。

实验模式可运行候选，但必须显示“实验结果”，不能使用正式推荐、正式 QA 或发布样例语言。当前 R0 探针不属于产品模式。
