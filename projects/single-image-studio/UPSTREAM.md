# 来源与边界

## 项目来源

| 字段 | 记录 |
| --- | --- |
| 单一上游 | 不适用 |
| 本地前序项目 | `projects/visual-route-studio` |
| 前序精确版本 | commit `51a8469`，branch `codex/visual-route-r17-archive` |
| 记录日期 | 2026-08-12 |
| 前序许可 | 本地原创研究，许可证待定；第三方边界按下方固定研究账本审计 |

本文件是来源与复制边界的事实账本；候选是否可进入实验或产品由 [CAPABILITY_REGISTRY.md](./CAPABILITY_REGISTRY.md) 决定。2026-08-14 的能力重审只核对公开官方信息，没有下载、复制或提交任何第三方代码、模型权重、示例图、字体或数据集。

## 本地原创范围

本目录的产品定义、能力矩阵、候选收敛、第一版流程、研究计划、路线图和未来实现为新的本地工作。前序项目只提供问题背景与能力研究线索，不作为运行时依赖。

本轮只读研究还参考了前序项目的 `SKILL_COMPOSITION.md`、Revision 10–17 研究文档、`COMPOSITOR-CONTRACT.md`、`COMPOSITOR-VALIDATION.md` 与其 `UPSTREAM.md`。这些材料均以归档提交 `51a8469` 为边界；没有从中复制代码、Prompt 或图片资产。

2026-08-12 新增的 `web/`、`server/`、`tests/` 与项目内运行配置均为本项目原创实现。没有复制归档页面、旧应用脚本或其图片资产；仅依据冻结的产品 / 状态契约重新实现。服务端接口形状依据下方 OpenAI 官方图片文档重新编写，并保留服务端密钥、请求编号、运行状态、输入 / 输出指纹与失败不伪装成功的边界。

## 固定的 13 Skill 研究账本

本项目的 13 项能力判断还以归档提交 `51a8469` 中以下文件为审计入口：

- `projects/skill-zine-summary/UPSTREAM.md`
- `projects/skill-zine-summary/lab/SOURCES.lock.json`，`retrievedDate=2026-08-09`，汇总目录固定为 `tluy/skill-zine-summary@2c65c251bc6909f077ae9974e3251d164a07c924`

12 个仓库产生 13 项能力，是因为 gathered 仓库的历史快照包含两份 Skill。许可分类如下；这里只记录元数据，不复制第三方实现或资产。

| 分类 | 固定研究来源 | 本项目边界 |
| --- | --- | --- |
| MIT | `gc-minimal-zine-poster@4cb0396`、`photo-revival@ca4c3c6`、`pixel-style-poster-skill@b93066b`、`photo-relic-editorial@2232da1`、`photo-to-zine-postcard@0091403` | MIT 只覆盖仓库中明确纳入许可的代码/文档；示例照片、字体和模型输出仍需逐项清权 |
| 历史 MIT 快照 | `gathered-scenes-zine-skill@b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e` | 该提交仍含两份 Skill；后续改为个人非商业许可，当前 `598ce3c...` 又已删除实现。不得把某一提交的许可套到其他版本或示例资产 |
| 自定义限制 | `travel-photo-abstraction@96e3876` | 只允许未修改使用；禁止修改、衍生、再分发与再发布，因此仅作只读方法研究 |
| 无正式许可 | `daily-photo-playground@b987bbb`、`dyy_photo_deconstruct@42e637e`、`photo-distill@e2708ae`、`poetic-line-zine-poster@61514e0`、`photo-abstract-editorial@dada523` | 只读研究；不复制实现、Prompt 或样图 |

## 复用边界

- 当前没有复制前序项目代码或图片资产。
- 历史上游图库和前序项目生成图缺少逐图可再发布权、完整生成记录或两者兼具，因此只作研究引用，不复制、不热链，也不进入正式参考目录。
- 后续若复制文件，必须在本文件逐项记录来源路径、来源提交、许可和本地修改。
- 不通过相对路径依赖兄弟项目代码、样例或构建配置。
- 13 个 Skill 的代码、提示、模板和样图不能仅因被研究就视为可复制资产；需以各自来源许可为准。

## 基础能力候选官方来源账本

下表固定的是 `observed_at=2026-08-14` 的研究入口，不是已安装依赖。由于本轮未能为所有滚动分支可靠取得不可变 HEAD，精确提交统一记为 `pending-resolution`；不得编造 commit，也不得以 `main`、`master`、`latest` 或浮动包版本替代。首次安装前须在 [CAPABILITY_REGISTRY.md](./CAPABILITY_REGISTRY.md) 补齐精确 commit/tag、包版本、checkpoint 文件名、原始下载 URL 与 SHA-256。

| Registry ID | 官方来源 | 代码许可（官方仓库） | 权重 / 服务边界 | 本地复制 |
| --- | --- | --- | --- | --- |
| `REG-NORM-SHARP` | [lovell/sharp](https://github.com/lovell/sharp)、[sharp 文档](https://sharp.pixelplumbing.com/) | Apache-2.0 | 无模型；预编译包中的 libvips 与编解码依赖另审 | 无 |
| `REG-NORM-LIBVIPS` | [libvips/libvips](https://github.com/libvips/libvips)、[libvips.org](https://www.libvips.org/) | LGPL-2.1-or-later | 无模型；构建时启用的格式库另审 | 无 |
| `REG-VISION-OPENCV` | [opencv/opencv](https://github.com/opencv/opencv)、[OpenCV license](https://opencv.org/license/) | OpenCV 4.5.0 起主体为 Apache-2.0 | 核心原语无权重；数据文件、可选模块和第三方组件另审 | 无 |
| `REG-DETECT-GROUNDING-DINO` | [IDEA-Research/GroundingDINO](https://github.com/IDEA-Research/GroundingDINO) | Apache-2.0 | checkpoint 许可、训练数据、依赖与哈希未锁定，`research-only` | 无 |
| `REG-SEG-SAM2` | [facebookresearch/sam2](https://github.com/facebookresearch/sam2) | Apache-2.0；可选 `cc_torch` 为 BSD-3-Clause | 官方 README 明确 checkpoints、demo 与训练代码为 Apache-2.0；具体 SAM 2.1 文件与哈希待锁定 | 无 |
| `REG-MATTE-BIREFNET` | [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet) | MIT | 基础权重文件级许可与哈希未锁定；第三方 `briaai/RMBG-2.0` 明示仅非商业，判为 `no-go` | 无 |
| `REG-MATTE-MODNET` | [ZHKKKe/MODNet](https://github.com/ZHKKKe/MODNet) | Apache-2.0 | README 明确代码、模型与 demo（`doc/gif` 除外）为 Apache-2.0；checkpoint 与哈希待锁定 | 无 |
| `REG-RESTORE-REAL-ESRGAN` | [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | BSD-3-Clause | release 权重、BasicSR/GFPGAN/facexlib 与 NCNN 交付物逐项待审，`research-only` | 无 |
| `REG-RESTORE-RESTORMER` | [swz30/Restormer](https://github.com/swz30/Restormer) | MIT | Google Drive 预训练权重的文件级许可与哈希待锁定，`research-only` | 无 |
| `REG-INPAINT-LAMA` | [advimman/lama](https://github.com/advimman/lama) | Apache-2.0 | 旧分发链接与当前镜像并存；artifact 一致性、许可与哈希待锁定，`research-only` | 无 |
| `REG-GEN-DIFFUSERS` | [huggingface/diffusers](https://github.com/huggingface/diffusers)、[官方文档](https://huggingface.co/docs/diffusers/) | Apache-2.0（仅框架） | Hub 上每个模型及附加组件有独立许可；禁止未经登记的 `from_pretrained(...)` | 无 |
| `REG-CLOUD-OPENAI-IMAGE` | [GPT Image 2 模型页](https://developers.openai.com/api/docs/models/gpt-image-2)、[图片生成指南](https://developers.openai.com/api/docs/guides/image-generation) | 不适用（外部 API） | 后续实验目标为官方 snapshot `gpt-image-2-2026-04-21`；当前 R0 代码仍使用浮动别名 `gpt-image-2`，不能视为版本已锁定 | 无 |

### 锁定与许可规则

- “仓库有 LICENSE”只证明该 LICENSE 对仓库中被许可作品的声明；不自动授予外链 checkpoint、训练集、镜像文件、示例资产或依赖的权利。
- 同名 checkpoint 来自不同域名或镜像时，只有文件哈希相同且许可链完整，才能视为同一研究 artifact。
- `pending-resolution` 是硬停止条件。允许浏览文档，不允许把候选安装进产品环境或据此生成公开样例。
- Apache/MIT/BSD/LGPL 的简写只用于初筛，不是法律意见。真正分发前仍需保留原许可/NOTICE，并按实际链接、构建和修改方式审查义务。
- 市场产品页面只用于研究用户已经形成的能力预期；不得复制其页面、文案、示例图、模型、模板、品牌资产或交互实现。

## 市场官方研究入口

这些页面为会变化的在线产品说明，只固定核对日期和研究问题，不将其功能宣称转写为本项目已经拥有的能力。统一比较字段、当前覆盖与尚缺研究簇见 [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md)；本文件继续只维护来源事实和复制边界。

| 产品 / 官方页面 | 核对日期 | 研究用途 | 复制情况 |
| --- | --- | --- | --- |
| [Adobe Express Background Remover](https://www.adobe.com/express/feature/image/remove-background) | 2026-08-14 | 单图上传→自动抠图→透明 PNG→继续编辑的最低用户预期 | 未复制代码、文案或资产 |
| [Canva AI Photo Editor](https://www.canva.com/features/ai-photo-editing/) | 2026-08-14 | 综合编辑器中的背景、局部修改、增强与场景延展边界 | 未复制代码、文案或资产 |
| [Photoroom](https://www.photoroom.com/) 与 [Background Remover](https://www.photoroom.com/tools/background-remover) | 2026-08-14 | 商品图纵向能力、透明主体、背景和交付流程 | 未复制代码、文案或资产 |
| [Pixelcut](https://www.pixelcut.ai/) | 2026-08-14 | 面向普通用户的工具选择、场景结果与 AI 路由趋势 | 未复制代码、文案或资产 |
| [Picsart AI Photo Editor](https://picsart.com/ai-photo-editor/) | 2026-08-14 | 通用编辑工具墙的能力广度及其复杂度上限 | 未复制代码、文案或资产 |
| [Topaz Image Web Models](https://docs.topazlabs.com/cloud-apps/imageweb-models) | 2026-08-14 | 保真增强与生成式增强的分层、质量修复模型族 | 未复制模型、代码、文案或资产 |

市场页面只能支持“市场已出现此类入口/流程”的判断，不能证明其内部实现、质量、成本、许可或本项目可复现性。正式竞品结论必须保存核对日期，并在影响产品决策时重新核验。

## 本项目发布状态

- 本项目代码和资产尚未选择对外许可证；在明确授权前，第三方复制、再分发或拆分成独立仓库的权利未授予。这个状态不等于权利人不能托管展示自有材料。
- 用户可见托管展示或商业服务需另过逐图发布 allowlist，并审查输入授权、人物肖像/隐私、商标、艺术品、地点、模型条款/政策和适用法律。
- 每张来源图分别记录 `processing_allowed`、`public_display_allowed`、`commercial_marketing_allowed`。允许上传处理不等于允许公开展示；真实用户图默认不得进入公共参考目录。
- 若未来接受真实用户上传，需在实现前确定发送给模型服务的数据范围、保留/删除策略和用户告知/同意机制。

## 当前外部文档参考

| 资料 | 核对日期 | 用途 | 复制情况 |
| --- | --- | --- | --- |
| [OpenAI GPT Image 2 model](https://developers.openai.com/api/docs/models/gpt-image-2) | 2026-08-14 | 固定 `gpt-image-2-2026-04-21` snapshot、支持端点与限流入口 | 未复制代码或资产；仅记录公开服务边界 |
| [OpenAI Image generation guide](https://developers.openai.com/api/docs/guides/image-generation) | 2026-08-14 | 规划生成 / 编辑请求、mask、输出设置、透明背景与已知限制 | 未复制代码或资产；仅记录公开接口边界 |
| [OpenAI API pricing](https://openai.com/api/pricing/) | 2026-08-14 | 实验前核对动态价格；实际成本仍以每次 RunManifest / 账单为准 | 不在文档写死易变化价格 |
| [国家移民管理局：出入境证件“全程网办”照片提交指引](https://s.nia.gov.cn/mps/bszy/qcwbzpzy/zpzy/202405/t20240528_1001.html) | 2026-08-12 | 中国出入境证件照片的拍摄、背景、姿态、遮挡、像素与禁用美颜 / 滤镜 / 瘦脸边界 | 未复制图片或页面；仅作为 `CN-NIA` profile 的官方研究入口 |
| [国家移民管理局：出入境证件相片照相指引](https://www.nia.gov.cn/n741445/n763221/index.html) | 2026-08-12 | 中国出入境证件照片标准的官方入口；具体规则需按届时页面 / 附件重新核对 | 未复制图片或附件 |
| [U.S. Department of State: Passport Photos](https://travel.state.gov/en/passports/apply/help/photos.html) | 2026-08-12 | 美国纸质护照照片的现行官方规则、正反例与禁止数字 / AI 修改边界 | 未复制示例图片；仅作为 `US-DOS-PASSPORT-PAPER` profile 入口 |
| [U.S. Department of State: Uploading a Digital Photo](https://travel.state.gov/en/passports/renew-replace/online/upload-digital-photo.html) | 2026-08-12 | 美国护照在线续期数字照片的文件、背景、姿态、质量、裁切和人工复核边界 | 未复制示例图片；仅作为独立数字提交 profile 入口 |
| [OpenAI Services Agreement](https://openai.com/policies/services-agreement/) | 2026-08-14 | 核对 API 客户的输入责任、客户与 OpenAI 之间的输出权属、输出相似性与免责声明 | 未复制条款；发布前需重核当日版本 |
| [OpenAI Service Terms](https://openai.com/policies/service-terms/) | 2026-08-14 | 核对 API 的服务特定条款和第三方权利例外 | 未复制条款；发布前需重核当日版本 |
| [OpenAI Usage Policies](https://openai.com/policies/usage-policies/) 与 [图片/视频政策入口](https://openai.com/policies/) | 2026-08-14 | 核对允许内容、人物/安全与图片生成守则 | 未复制政策；每次实验与发布前按当日版本复核 |

### OpenAI 图片能力边界

2026-08-14 核对的官方文档支持以下规划判断：

- GPT Image 2 的官方模型页列出不可变 snapshot `gpt-image-2-2026-04-21`；研究和运行记录不得只写浮动别名 `gpt-image-2`。
- 当前 `server/server.mjs` 仍以浮动别名调用 R0 探针。本轮只重构文档、不改运行时代码；正式实验前必须改用 snapshot，并由新的运行证据取代旧探针记录。
- Image API 支持生成、整图编辑、一个或多个参考图，以及带 mask 的局部编辑。
- GPT Image 的 mask 是通过提示引导模型编辑的输入，模型不保证完全精确地遵循 mask 形状；因此 masked edit 不是像素级抠图、前景锁定或 mask 外零改动证据。
- `gpt-image-2` 当前不支持 `background: "transparent"`。透明 PNG 必须由本项目独立的分割 / Alpha Matting 与确定性 RGBA 合成链产生，不能把生成模型输出白底或近似主体边缘当成透明背景。
- `gpt-image-2` 的高输入保真也不等于输出像素锁定、身份保证、证件合规或可重复的发丝 Matting；每项仍需独立 QA。

API 文档只证明当前公开接口边界，不能倒推历史“OpenAI 内置 ImageGen”资产的发布权。OpenAI 与客户之间的 output ownership 不授予客户原本没有的第三方输入、肖像、商标或作品权利；输出也可能相似、并非唯一，服务没有一般性的非侵权保证。每个 pair 必须记录实际生成 surface/account terms（例如内置 ImageGen 或 API）、适用条款版本与核对日期，并由本项目自行审查输入权限和输出用途。

### 证件照片地区与 profile 边界

“证件照”不是一套跨地区、跨证件、跨提交渠道通用的规格。本项目只有在记录以下字段后，才能声明支持某个官方 profile：

```text
profile_id + jurisdiction + issuing_authority + document_type + submission_channel + profile_version + official_url + checked_at + acceptance_claim
```

- 中国国家移民管理局的出入境照片指引不能自动套用于居民身份证、考试、签证、学校报名或其他国家证件。
- 美国国务院的纸质护照与在线续期数字照片是不同提交 profile；也不能套用于美国签证、其他国家护照或一般报名照。
- 美国国务院当前页面要求提交原始、未编辑照片，并明确禁止软件、滤镜或 AI 数字修改；对这类 profile，本项目只能进行资格检查、官方允许的裁切 / 文件验证或提示重拍，不能用抠图换底、生成修脸或换装后声称合规。
- 国家移民管理局当前指引强调关闭美颜、滤镜和瘦脸，并说明人像特征失真会导致审核不通过；严格证件路径不得使用创意 Skill 或生成模型修改面部特征。
- 自动检查只能覆盖已经编码且在 `checked_at` 核对的公开规则。签发机关、受理人员或官方上传系统拥有最终决定权；没有真实受理证据时不得声称“审核必过”或“官方认证”。
- 普通报名照、简历头像和员工目录可另设“标准底色头像”任务，但必须明确它不是官方证件 profile。
