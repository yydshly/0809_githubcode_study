# 报名头像参数草案

> 文档角色：`scene.registration-portrait` 的报名头像场景草案，不是官方证件规范、原子能力、当前纵向主线或已经实现的参数面板。人物资格、Matting、合成与几何能力达到 C1 前，本文数值不得成为产品承诺。文件名为历史兼容保留。  
> 状态：后置研究草案。  
> 日期：2026-08-12  
> 范围：单张成年人物照片的候选合同；若未来发布，只覆盖通用头像 / 报名照，不承诺任何机构受理。

## 设计结论

用户应该能够选择结果规格，但不应该面对一张摄影工程参数表。配置采用渐进展开：

1. 先选**用途预设**。
2. 再选**纯色背景**。
3. 只有选择“自定义像素”时才展开宽、高；三种候选用途都可按需展开“更多文件要求”。
4. 处理后才提供受安全边界约束的**调整构图**。
5. 全产品在上传 / 分析前已完成处理权确认与数据处理告知；头像任务只额外确认照片中的人物已成年，系统不从面孔推断年龄。
6. 未来官方证件只允许选择完整 profile；用户不能覆盖 profile 锁定项。

标准底色头像不提供透明底；需要透明 PNG 时回到“主体与背景”任务，避免把同一抠图能力重复包装成两项产品功能。

## 用户看到的配置顺序

### 1 · 用途

候选交互使用三张单选卡；只有场景依赖和证据齐全后才能进入用户界面：

| 选项 | 候选默认值 | 用户可继续修改 | 对外表述 |
| --- | --- | --- | --- |
| 方形头像 | `1:1`、`1024 × 1024 px`、白底、JPEG | 背景、更多文件要求、构图 | 通用头像，不代表机构受理 |
| 竖版报名照 | `3:4`、`768 × 1024 px`、白底、JPEG | 背景、更多文件要求、构图 | 通用报名照，不代表机构受理 |
| 自定义像素 | 默认继承 `768 × 1024 px` | 宽、高、背景、更多文件要求、构图 | 按自定义规格导出，不转化为官方规格 |

这些尺寸是待验证的研究候选默认值，不是任何官方标准。参数只有在全部依赖能力取得 C1、所引用实用效果取得 U1、场景自己的资格 / 参数 / QA 通过验证，并满足 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md) 的完整发布公式后才可发布；其中包括 R1-pipeline / R1-product-release、同 build 的 CompatibilityProfile / TestEvidenceManifest、O1、G1、有效 V1（或已批准的 `V1MigrationManifest`）、ReleaseManifest 与逐资产 Release Gate。

未来可增加第四个入口“官方证件规格”，但在没有已验证 profile 时只显示低干扰说明，不显示可选的假规格。

全产品的“我有权处理这张图片”与数据处理告知必须在网络上传或内容分析前完成。用户明确选择文件后，客户端只做格式 / 大小预检和本地 hash，再把确认绑定到来源 hash / revision、告知文案版本与时间；确认前不发送图片，也不做内容分析。换图即失效。进入头像用途时只增加“照片中的人物已成年”确认，也绑定同一来源 revision。两类确认不能互相替代，也不等于系统完成年龄识别、肖像权判断或公开展示授权。

### 2 · 背景

- 快捷色候选值：白 `#FFFFFF`、浅蓝 `#DDEEFF`、蓝 `#4A90E2`、红 `#D84A4A`。
- 自定义：颜色选择器 + 可复制的 sRGB HEX。
- 每个快捷色解析为版本化的精确 sRGB 值；最终值在证据复验前冻结。
- 候选头像背景只允许不透明纯色。透明底属于 `effect.subject-background#transparent`，不在本场景重复提供。
- 修改背景只复用已通过 QA 的 Alpha 重新合成，不重新分割，也不重画人物。
- 自定义色只接受六位 sRGB HEX，解析后统一为大写 `#RRGGBB`；不接受 alpha、颜色名称或超出 sRGB 的值。

快捷色名称只是通用结果语言，不暗示符合任何证件机构的背景要求。

所有模式共用 `spec_id: portrait-solid-srgb`、`spec_version: "1"` 的颜色子契约；其不可变 payload 和 hash 被包含进最终头像规格快照。任意 HEX 的解析、色值与合成性质只在这份共享契约中验证一次，再分别对方形、竖版和自定义像素做集成覆盖，避免固定预设绕过任意色验收。

### 3 · 自定义像素

仅在选择“自定义像素”时展开：

- 宽度与高度，单位固定为 `px`。
- 每边允许 `320–4096 px`；长宽比限制在 `1:3–3:1`。这些是产品输入保护范围，不是官方规则。
- 输入尺寸后，画布比例立即更新并锁定；构图规则继续继承 `spec_id: custom-pixels`、`spec_version: "1"` 的通用人像契约，不能靠改尺寸关闭单脸、头肩完整或原貌保护要求。
- 当来源分辨率接近安全边界时警告，越过拒绝边界时停止；不使用生成式补头顶、补肩膀或补五官来满足尺寸。
- 候选场景不暴露厘米、英寸或 DPI。数字图片的像素尺寸是主规格；印刷尺寸与 DPI 在真实需求验证后另设打印 profile。

### 3.1 · 输入分辨率与放大边界

产品不把任意大像素尺寸等同于更高质量。首轮候选通用构图把目标人脸框短边设为画布短边的 `0.32`，手动构图允许在 `0.28–0.38` 内移动；精确构图值最终随 spec payload 冻结。低清判定使用：

`target_face_short_edge_px = round_half_up(min(canvas.width, canvas.height) × target_face_ratio)`  
`required_scale = target_face_short_edge_px ÷ source_face_short_edge_px`

`source_face_short_edge_px` 是 EXIF 方向纠正后，冻结版本的单脸检测器在置信度 `≥ 0.90` 时输出的轴对齐人脸框短边；检测不到唯一稳定人脸就拒绝。比较使用未舍入的 `required_scale`，只有目标像素值按 half-up 舍入。首轮预注册候选边界为：

- 来源人脸框短边小于 `160 px`：拒绝头像任务。
- 结果中人脸框短边小于 `96 px`：拒绝当前自定义尺寸或构图。
- `required_scale ≤ 1.25`：正常处理。
- `1.25 < required_scale ≤ 2.0`：明确显示低分辨率警告；只有版本化的边缘、清晰度与面部结构 QA 全部通过才允许下载。
- `required_scale > 2.0`：拒绝放大，建议选择更小尺寸或更换照片。
- 来源已经截断头顶、下巴或任务要求保留的肩部时，无论像素多少都拒绝；不能用纯色留白或生成内容冒充完整人物。

这些是内部研究候选阈值，不是官方标准。人脸检测器、关键点 / 构图器、Matting、重采样器和低清复核协议的精确版本必须写入 validator bundle。它们必须在查看正式实验结果前冻结；若夹具校准要求修改，则发布新的任务契约版本并重跑全部 U1 分母，不能在运行中静默调参。

处于警告区间的 `dev/calibration` 夹具还必须通过同一协议：确定性前景与冻结重采样参考逐像素一致；两名独立评审在输出原始像素 `100%` 视图检查双眼、鼻口边界、块状 / 振铃伪影和边缘光晕，二人均通过才计为实验成功，分歧即失败。该人工协议有独立版本，并保存每位评审的原始结论。进入独立 `holdout` 与 R1-pipeline 前必须据此冻结并复验自动 QA 阈值；若自动 QA 尚未达标，生产契约把整个警告区间改为拒绝，不能让真实用户等待人工评审。

### 4 · 文件要求

默认折叠在“更多文件要求”中：

- 格式：JPEG（默认）或 PNG。
- 色彩空间固定为 sRGB，不提供用户覆盖。
- 自动移除 EXIF / GPS，不提供保留开关。
- 可选“文件不超过”：用户填写 `20–20480 KB` 的整数上限；留空则不主动压缩到目标体积。该范围是产品输入保护，不是机构标准。
- PNG 在本任务中仍带不透明纯色背景；选择 PNG 不会把头像切换成透明底。
- 文件体积调整只允许改变编码质量，不允许拉伸比例、减少画面内容或局部重画人物。
- 若在冻结的最低质量下仍无法达到上限，明确失败并建议提高上限；不能静默输出不合格文件。
- JPEG 的编码器、版本与质量值进入运行记录，不能只记录一个不可比较的“质量 90”。

### 5 · 调整构图

处理前只显示输出比例示意、来源图与资格提示，不显示会被误解为最终结果的“假取景框”。首次真实 matting 完成后，管线固定为：`来源像素 + Alpha → RGBA 前景 → 等比缩放 / 平移 → 纯色画布确定性合成`。此时才提供“调整构图”：

- 用户可拖动、等比缩放人物在画布中的位置。
- 不允许旋转、拉伸、局部变形或移动五官。
- 纯色画布可提供背景留白，但不能补画被来源截断的头顶、下巴、肩部或其他人物像素。
- 调整必须实时通过头顶、下巴、肩部、单脸、最小有效人脸像素和最大放大倍数边界；有效人脸比例下界为 `max(0.28, 96 ÷ 画布短边)`，因此最小 `320 px` 画布的实际下界是 `0.30`。只有当前已解析 spec 明确允许时，画布才可裁掉肩部以下的前景。越界时阻止提交并说明原因。
- 缩放使用版本化的确定性重采样器；QA 将结果前景与同一 Alpha 经该变换得到的参考逐像素比较，不能把局部重绘伪装成缩放。
- 方形头像可额外显示圆形使用预览，但下载文件仍保持方形。

## 参数联动

| 变化 | 系统行为 |
| --- | --- |
| 更换用途预设 | 更新画布、比例、默认背景与导出摘要；保留原图，重新验证构图与放大可行性 |
| 修改宽 / 高 | 更新并锁定画布比例；重新计算目标头部像素与 `required_scale`，不生成缺失画面 |
| 修改背景色 | 复用同一合格 Alpha，仅重新确定性合成 |
| JPEG ↔ PNG | 只重新编码；人物、Alpha 和构图变换不变 |
| 修改文件上限 | 只重跑编码与文件体积 QA |
| 调整构图 | 只更新 RGBA 前景的等比缩放 / 平移与确定性合成；不重新分割或生成人物 |
| 更换来源图 | 旧 Alpha、构图、确认、预览与结果全部失效；保留用户选择的非官方预设作为新图初始值 |
| 任务、schema、spec、官方 profile、validator bundle 或处理管线版本变化 | 旧结果仍可审计，但不能冒充新版本结果；当前结果标记过期，必须按新的不可变快照创建新 run |

任何只影响合成或编码的参数变化都不应重新调用生成模型。

## 用户不能选择的项目

以下不是证件 / 报名头像参数：

- 瘦脸、磨皮、美白、五官调整、换脸、表情修改。
- 生成耳朵、头发、肩膀、服装或正装。
- 发型、妆容、年龄、性别表达或身份特征“修复”。
- 生成式换背景、虚构拍摄环境或创意 Skill。
- 模型、Prompt、Matting 权重、身份相似度分数。

这些能力即使未来存在，也必须作为其他创意任务研究；不能叠加后再称为证件 / 报名头像。

## 官方 profile 的未来选择方式

官方证件不是“自定义参数”的另一个名字。未来入口按以下顺序选择：

1. 国家 / 地区。
2. 签发机构。
3. 证件类型。
4. 提交渠道，例如数字上传或纸质照片。
5. 已验证且仍有效的 profile；当前有效版本由系统解析并展示，用户不能选择旧版本。

选中后，界面展示规则摘要与官方来源链接，但以下内容必须由 profile 锁定：

- 画布尺寸、比例、单位与舍入规则。
- 头部占比、眼线、上边距、姿态、表情、遮挡和肩部规则。
- 背景策略、允许颜色与容差，是否允许换底或任何数字修改。
- 文件格式、色彩空间、压缩、文件体积、EXIF / ICC 规则。
- 允许和禁止的处理操作。

统一 profile schema：

```text
profile_id + jurisdiction + issuing_authority + document_type
+ submission_channel + profile_version + official_url + checked_at
+ status + valid_until + next_review_at + reviewed_by
+ rule_evidence_version + revoked_at + revocation_reason + replacement_profile_id
+ acceptance_claim
```

用户只能选择 `status=active` 且仍在 `valid_until` 内的 profile 明确允许的变体，不能自由覆盖锁定值，也不能混搭不同 profile。`checked_at` 只记录一次核对时间，不能代替有效期、复核责任人或规则证据版本。自定义像素即使碰巧等于某个官方尺寸，也不会获得官方标记。

当官方来源变化、无法访问、规则冲突、复核到期或真实受理证据被撤销时，系统把 profile 原子地切换为 `paused`、`expired` 或 `revoked`，记录 `revoked_at + revocation_reason + replacement_profile_id`，停止新 run，并使依赖该版本的推荐与未执行结果失效。历史运行保留当时冻结的 profile 快照用于审计，但不得继续对外宣称当前有效。

若规则禁止数字换底或 AI 修改，产品只做资格检查、允许范围内的确定性裁切 / 文件验证，或提示重新拍摄。界面只能写“按已编码规则检查”，且持续显示“最终是否受理由对应机构决定”。

## 参数模型

```yaml
portrait_selection:
  portrait_schema_version: "1"
  mode: generic_preset | custom_pixels | official_profile
  spec_id: avatar-square | registration-portrait-3x4 | custom-pixels | string
  # 用户不提交版本；服务端把当前有效契约解析到 portrait_resolution。
  attestations:
    adult_confirmed: true
    accepted_at: datetime
    text_version: string
  canvas:
    width_px: integer
    height_px: integer
  background:
    preset_id: white | light_blue | blue | red | custom
    color_srgb_hex: string
  export:
    format: jpeg | png
    max_bytes: integer | null
    color_space: srgb
    strip_exif: true
  placement:
    scale: number
    offset_x_ratio: number
    offset_y_ratio: number
portrait_resolution:
  portrait_schema_version: "1"
  spec_id: string
  spec_version: string
  spec_payload_hash: sha256
  effective_canvas:
    width_px: integer
    height_px: integer
  effective_background:
    color_srgb_hex: string
  effective_export:
    format: jpeg | png
    max_bytes: integer | null
  effective_placement:
    scale: number
    offset_x_ratio: number
    offset_y_ratio: number
  official_profile:
    profile_id: string | null
    profile_version: string | null
    checked_at: date | null
    status: string | null  # active | paused | expired | revoked
    valid_until: date | null
    next_review_at: date | null
    reviewed_by: string | null
    rule_evidence_version: string | null
    revoked_at: datetime | null
    revocation_reason: string | null
    replacement_profile_id: string | null
  allowed_user_overrides: [field_path]
  validator_bundle_version: string
  algorithms:
    face_detector: string
    landmark_composer: string
    matting: string
    clarity_qa: string
    resampler: string
upload_consent_snapshot:
  consent_id: uuid
  source_input_hash: sha256
  source_revision: integer
  rights_text_version: string
  data_notice_version: string
  accepted_at: datetime
```

`portrait_selection` 只保存用户提交值；`portrait_resolution` 是服务端依据不可变 payload 解析出的实际生效快照。`allowed_user_overrides` 是服务端白名单：通用规格按本文件开放背景、格式、文件上限和构图，自定义规格再开放宽高；官方 profile 只开放其 payload 明确允许的字段，其他提交值拒绝而不是覆盖锁定规则。

`spec_id + spec_version` 是运行规格的统一版本键。官方模式中 `spec_id = profile_id` 且 `spec_version = profile_version`，不存在第二条独立映射；通用规格的 `official_profile` 全为 `null`。一个版本号的 payload 一经发布不可改写，内容由 `spec_payload_hash` 校验。用户只选择当前可用的 `spec_id`，服务端在运行开始时原子解析当前版本；解析后即使目录更新，本次 run 仍使用冻结快照。每次运行冻结 `source_hash + upload_consent_snapshot + portrait_selection + portrait_resolution + task_contract_version + alpha_hash + placement_transform + encoder_version + output_hash`。

## 预览与结果摘要

处理前：

- 原图 + 输出比例示意；不暗示已经完成抠图或构图。
- 一句资格提示，例如“检测到单人正面照片，可制作通用竖版报名照”。
- 当前选择摘要：`3:4 · 768 × 1024 px · 白底 · JPEG`。

处理后：

- 默认显示真实结果，可切换原图 / 结果。
- “检查边缘”放大发丝、耳朵、眼镜与肩部。
- “调整构图”在安全边界内拖动 / 缩放 RGBA 前景。
- 显示像素、比例、背景、格式、最终文件体积和“不代表机构受理”。
- 只有任务 QA 全部通过才启用下载。

## 错误与恢复

| 问题 | 用户提示 | 恢复 |
| --- | --- | --- |
| 上传前未确认处理权 | 请确认你有权处理这张图片，并阅读数据处理说明 | 无法确认则不上传或分析；客户端只做绑定确认所需的格式 / 大小预检与本地 hash，换图后重做 |
| 头像阶段未确认成年 | 请确认照片中的人物已成年 | 确认后继续；无法确认则退出头像任务 |
| 未检测到单一清晰人物 | 请上传一张正面、清晰的单人照片 | 换图 |
| 多人照片 | 当前头像任务只支持单人照片 | 换图；首版不增加选人流程 |
| 头顶、下巴或肩部被截断 | 来源人物像素已缺失，或当前构图会截断必须保留的部位 | 调整构图或换图；不生成缺失内容 |
| 严重模糊、遮挡、反光或极端侧脸 | 当前照片无法可靠保留人物原貌与五官结构 | 换图 |
| 发丝缺失、光晕或背景残留 | 主体边缘未通过检查 | 定向重试一次或换图；失败结果不可下载 |
| 面部结构出现局部变化 | 结果未通过原貌保护检查 | 立即拒绝结果；重试或换图 |
| 自定义尺寸无效 | 显示具体范围或比例冲突 | 修正宽高；保留其他选择 |
| 来源分辨率不足或需要超过 2 倍放大 | 当前照片无法安全达到所选尺寸 | 选择更小尺寸或换图；不生成补全 |
| 文件体积无法达到 | 当前格式在安全质量下无法满足上限 | 提高上限或改用允许的格式 |
| 官方 profile 过期 / 暂停 | 当前规格需要重新核对，暂不可用 | 选择普通头像或等待 profile 更新 |

失败时保留来源与用户选择，不把失败输出设为当前结果。

## 验收补充

### 公平性与覆盖

报名头像的检测、Matting、构图和拒绝策略必须在有明确研究授权的夹具上覆盖不同肤色在多种光线下的成像、直发 / 卷发 / 紧密卷发、浅色 / 深色发丝、宗教或文化头饰、眼镜与反光、面部毛发、轮椅头枕等辅助设备，以及不同手机、压缩和白平衡条件。覆盖用于发现系统性误删、边缘失败和误拒绝，不用于给用户贴人口属性标签。

- 分别报告单脸检测失败、错误拒绝、Alpha 边缘失败、构图失败和灾难性原貌变化；总体平均值不能掩盖任一覆盖组的系统性失败。
- 分层标签只存在于受控、获同意的研究 manifest，具有最小访问权限和独立删除期限；生产运行不推断、记录或显示种族、民族、宗教、健康、残障、性别或其他敏感属性。
- 某类输入样本不足或失败率明显偏高时，能力合同必须收窄适用范围、改为人工不可用提示或继续研究，不得用“适用于所有人”的文案覆盖证据空白。
- 公平性门槛、最低覆盖量、分歧处理和停止规则必须在独立 holdout 前预注册；更换人脸检测器、Matting、构图器或拒绝阈值后重新取证。

除现有成年肖像、困难边缘和拒绝夹具外，参数层必须增加一份随 `spec_version` 保存的冻结 manifest。首轮最小 U1 分母为：

- 固定预设集成分母：`8` 张 PORTRAIT-PASS × `2` 个固定尺寸 × `4` 个快捷色 × `2` 种格式 = `128` 个基础运行；其中每个“来源 × 尺寸”再追加 `1` 个已预验证可达和 `1` 个不可达文件上限，共 `32` 个文件上限运行。placement 不做笛卡尔积，而是在每个尺寸上用 `4` 张冻结来源分别覆盖默认、最小允许人脸、最大允许人脸和越界阻止，共 `8` 个运行。
- 共享颜色子契约分母：合法等价类 `#000000`、`#FFFFFF`、灰阶、三种单通道极值、三种双通道极值和一个混合色，共 `10` 个；非法类覆盖短 / 长 HEX、非十六进制、alpha、颜色名称和前后空白，共 `6` 个。合法值必须精确解析并满足背景 `ΔE00 ≤ 2`，非法值 `100%` 拒绝。方形、竖版、自定义各至少用 `1` 张来源集成一个非快捷 HEX。
- `custom-pixels` 分母：边长 `{319, 320, 321, 4095, 4096, 4097}`、比例边界内 / 正好 / 外各方向、JPEG / PNG、文件上限低于 / 正好 / 高于可达值，以及 placement 和 `1.25 / 2.0` 放大边界的冻结等价类。合法边界每类至少 `2` 个例，非法边界每类至少 `1` 个例；另用固定种子 `20260812` 从合法整数宽高域和合法 HEX 域生成 `200` 个性质用例。manifest 保存实际输入、生成器版本、种子与迭代数，任何失败保存最小反例并可按输入逐项重放。
- 自动构图、RGBA 前景等比缩放 / 平移、越界阻止、确定性重采样与来源人物截断；来源脸框 `<160 px`、结果脸框 `<96 px`、放大 `≤1.25`、`(1.25,2.0]` 和 `>2.0` 都有阈值下 / 正好 / 阈值上夹具。
- 参数变化复用 Alpha、只重新合成 / 编码，以及换图后全部中间结果失效。
- schema / spec / payload hash / validator bundle / 算法版本变更、官方 profile 的缺字段、过期、暂停、渠道不匹配、禁止换底和自定义参数冒充官方规格。

固定预设与 `spec_id: custom-pixels`、`spec_version: "1"` 分别验收；若界面需要展示版本，可由二者派生显示标签，但不得将显示标签作为第二个 ID 入库。所有合法基础 / 边界 / 性质用例必须 `100%` 满足前景不被重画、几何不扭曲、色值准确、输出规格匹配和失败关闭；所有预期拒绝必须 `100%` 拒绝，局部面部重绘、人物像素补画、错误来源关联和未阻止的越界均为灾难失败，容许数为 `0`。视觉边缘评审只允许二人均通过，分歧算失败。任一失败都不允许以平均分掩盖，也不能把分别通过的字段任意拼成一个“已验证官方规格”。
