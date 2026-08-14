# 上游与研究来源记录

## 基本信息

- 单一上游仓库：不适用
- 本地产品工作名：Target Studio（StoryFold 为历史纵向实验）
- 目录历史名：Visual Route Studio
- 建立日期：2026-08-11
- 建立时根仓库提交：`8134995dcbfd935b70c5d4a122d0b037a11d36ea`
- 当前许可证：尚未确定
- 上游代码或资产复制：无

## Target Studio 本轮 ImageGen 资产

以下四个 contact sheet 是 2026-08-11 为本项目全新生成的本地测试资产，不来自兄弟项目、既有线程图片或网络下载：

| 文件 | 生成方式 | 提示主题摘要 | 使用边界 |
| --- | --- | --- | --- |
| `target-studio/assets/ceramic-studio-source.png` | OpenAI 内置 ImageGen | 虚构陶艺工作室的空间、匿名创作者、手部、器物和夜间店面 | 仅作产品研究与本地探测；无可读文字、品牌或真实身份 |
| `target-studio/assets/wind-robotics-source.png` | OpenAI 内置 ImageGen | 虚构沿海风能基地、匿名工程师、检查机器人和运行现场 | 仅作产品研究与本地探测；不表示真实设备或机构 |
| `target-studio/assets/cellist-stage-source.png` | OpenAI 内置 ImageGen | 虚构黑盒剧场、大提琴手、器乐细节和红色投影 | 仅作产品研究与本地探测；无真实演出或人物身份 |
| `target-studio/assets/alpine-seed-library-source.png` | OpenAI 内置 ImageGen | 虚构高山种子馆、匿名研究者、种子档案和建筑 | 仅作产品研究与本地探测；无真实地点、标签或机构 |

2026-08-11 的修订 3 继续使用上述 contact sheet 作为参考输入，并生成四张“已经完成的目标结果”，用于在网页中明确区分输入、能力组合和结果：

| 文件 | 生成方式 | 输入角色 | 结果目标 |
| --- | --- | --- | --- |
| `target-studio/assets/ceramic-postcards-result.png` | OpenAI 内置 ImageGen | 陶艺 contact sheet 作为主体、色彩与材质参考 | 三张边缘完整可见的明信片系列 |
| `target-studio/assets/robotics-cover-result.png` | OpenAI 内置 ImageGen | 风能机器人 contact sheet 作为场景与主体参考 | 单幅 16:9 文章封面视觉 |
| `target-studio/assets/performance-carousel-result.png` | OpenAI 内置 ImageGen | 实验音乐 contact sheet 作为人物、乐器与灯光参考 | 单幅方形轮播首图 |
| `target-studio/assets/alpine-relic-result.png` | OpenAI 内置 ImageGen | 高山种子 contact sheet 作为标本、空间与档案参考 | 边缘完整可见的竖版档案卡 |

结果图均要求无可读文字、品牌、水印和浏览器界面；网页标题仍由本地 Canvas 文字层管理。内置 ImageGen 输出原件保留在其默认生成目录，项目消费副本保存在上述路径。

## Image Product Studio 独立成品封面

| 本地文件 | 生成方式 | 输入与目标 | 边界 |
| --- | --- | --- | --- |
| `samples/rainy-bookstore/route-memory-cover-v3.png` | 2026-08-12，OpenAI 内置 ImageGen | 参考本项目雨夜书店六图 SOURCE 与既有记忆叙事概念板，重新生成单张 4:5 编辑封面；深蓝雨夜、暖灯书店、青绿雨伞、旧纸与植物标本关系 | 全新本地研究资产；无文字、品牌、水印、UI、设备框或接触表；真实中文由 Canvas 叠加 |

这些文件属于本地生成测试材料，不建立外部 URL、tag、commit 或兄弟目录运行依赖。项目许可证仍未确定；公开部署与商业使用前仍需按届时适用条款复核。

## Revision 4 统一 SOURCE 与多 Skill 组合结果

2026-08-11 为开放能力编排器再次生成一张统一 SOURCE，并从它产生四张不同组合结果。它们均是本项目全新 ImageGen 测试资产，不使用既有线程图片、网络图片或上游示例图。

| 文件 | 生成方式 | 能力组合主题摘要 | 使用边界 |
| --- | --- | --- | --- |
| `target-studio/assets/skill-composer-source.png` | OpenAI 内置 ImageGen | 虚构雨夜自行车修理店、匿名维修者、钴蓝自行车、暖灯与红凳；单张完整照片 | 统一研究 SOURCE；无品牌、可读文字、水印或真实身份 |
| `target-studio/assets/composer-memory-archive.png` | OpenAI 内置 ImageGen，参考统一 SOURCE | Photo Revival 的记忆重绘 + Photo Relic Editorial 的遗物锚点 + Postcard 的产品分区 | 周年记忆档案样例；不是对应 Skill 原图、模板或 Prompt 的复制 |
| `target-studio/assets/composer-material-campaign.png` | OpenAI 内置 ImageGen，参考统一 SOURCE | Pixel Style 的材料化 + Daily Photo 的编辑节奏 + GC Minimal 的概念减法 | 材料化发布套件样例；无可读文字与真实品牌 |
| `target-studio/assets/composer-poetic-report.png` | OpenAI 内置 ImageGen，参考统一 SOURCE | Travel Abstraction 的路径 + Poetic Line 的线索 + Photo Abstract 的关系面 + Scenes Gathered 的映射 | 摄影解释特刊样例；完整照片作为证据区 |
| `target-studio/assets/composer-postcard-system.png` | OpenAI 内置 ImageGen，参考统一 SOURCE | Postcard 的功能分区 + Photo Relic Editorial 的系列锚点 + Daily Photo 的变化节奏 | 三张完整卡片系统样例；文字区刻意留白 |
| `target-studio/assets/composer-visual-fingerprint.svg` | 本地原创 SVG | Photo Distill 的视觉指纹 + DYY Deconstruct 的结构拆解 + Photo Abstract 的参数关系 | 代码原生组合预演；未复制第三方 SVG、代码或模板 |

上述 Skill 名称只记录高层研究能力如何影响本地原创方案。具体图片提示由本项目重新编写，没有复制上游 `SKILL.md`、Prompt、示例图、代码或专有模板。ImageGen 输出原件保留在其默认生成目录，项目消费副本保存在表中路径。

## 为什么没有单一上游

StoryFold 是基于本仓库多项 Skill 研究提出的原创产品组合，不是任何单一 Skill、仓库或现有产品的分支、移植或再包装。

前置研究中的公开 Skill 和示例仓库只用于理解能力：照片分析、场景排序、记忆重绘、关系抽象、材料化、确定性拼版、产品封装和 QA。它们不是 StoryFold 的默认运行时依赖，也不会自动成为本产品的代码、Prompt、图片、字体或训练素材。

## 研究输入

| 输入 | 精确版本 | 用途 | 本地边界 |
| --- | --- | --- | --- |
| `yydshly/0809_githubcode_study` 中的 Skill Zine Summary | 根仓库 `8134995dcbfd935b70c5d4a122d0b037a11d36ea` 及当前未提交研究增量 | 归纳 13 个 Skill 的能力链、SOURCE → EFFECT、产品系统与验证方法 | 只通过文档引用；不建立兄弟目录源码依赖 |
| `projects/skill-zine-summary/INVENTORY.md` | 本地当前版本，核对于 2026-08-11 | 记录 12 个去重仓库、13 个 Skill 与对应版本 / 许可 | StoryFold 不以“13 个 Skill 安装包”方式分发 |
| `projects/skill-zine-summary/TECHNICAL-MAP.md` | 本地当前版本，核对于 2026-08-11 | 提炼输入、结构、视觉语法、渲染、合成和 QA 六层模型 | 只采用可概括的高层架构，产品实现必须原创 |
| `projects/skill-zine-summary/lab/web/REVISION12-PRODUCT-SYSTEMS.md` | 本地当前版本，核对于 2026-08-11 | 观察 13 个 Skill 向海报、页面、展板和明信片等产品表面的延伸 | 数字预演不是生产证明；样图进入产品前逐项核对权利 |
| `projects/skill-zine-summary/lab/web/REVISION13-SKILL-CHOOSER.md` | 本地当前版本，核对于 2026-08-11 | 理解任务、保真、实现路径与产品载体的选择关系 | 只用于后台编排；不把 Skill 名称变成用户主导航 |
| 前置研究收录的公开仓库 | 精确 URL、tag / commit、检索日期和许可证见 Skill Zine Summary 的 [UPSTREAM.md](../skill-zine-summary/UPSTREAM.md) | 理解公开 Skill 所描述的能力域 | 不复制第三方代码、Skill 文本、Prompt、模板或样图 |
| 公开 UX、竞品和社区二手材料 | URL 与日期见 [PUBLIC_EVIDENCE_SCAN.md](PUBLIC_EVIDENCE_SCAN.md)，检索于 2026-08-11 | 保留市场边界和后续研究问题 | 不是 StoryFold 主方向依据，也不计为 D1 用户证据 |
| 本项目后续受控样本与用户研究 | 待逐项记录 | 验证能力组合、图片成品与用户价值 | 只使用自有、合成或明确授权材料 |

若未来直接引入任何第三方代码或资产，必须在本文件新增来源 URL、精确 tag / commit、获取日期、许可证、使用范围和归属，不得只引用前置研究结论。

## 本地原创内容

- StoryFold 产品定位、六页产品单位与“现场叙事 / 记忆叙事”两套路线。
- Visual Skill Composer 的能力编排逻辑。
- Story Card、Evidence Card、Storyboard、Page Recipe、Page Version 与 Export Bundle 数据结构。
- 封面、原照、记忆、关系等页面职责和共享 token 体系。
- 无字视觉层与真实照片 / 文字分离的确定性 compositor。
- 来源、锁定照片区、顺序、尺寸、文字和结构 QA。
- 产品界面、交互、测试夹具、研究记录和未来实现。

## 不会继承的内容

未经逐项授权与记录，本项目不会复制或打包：

- 第三方 `SKILL.md`、代码、脚本、Prompt、模板或参考图。
- 上游示例照片、生成结果、字体、品牌素材或专有表达。
- 限制修改、限制衍生、限制商用或仅供个人使用的实现。
- 没有明确许可证仓库中的代码和资产。
- 研究站内尚未逐项确认公开权利的 SOURCE、EFFECT 或生成素材。

公开仓库不等于可自由再发布；MIT 等代码许可证也不自动覆盖仓库中的照片、字体、模型输出与第三方素材。

## 与前置研究的关系

Skill Zine Summary 继续承担“理解和比较已有方法”的职责；StoryFold 承担“把多种能力组合为一个独立图片产品”的职责。

两者可以通过文档链接相互引用，但 StoryFold 不通过相对路径导入兄弟目录源码、数据或构建产物。未来即使拆成独立仓库，产品也应能够独立运行、测试和理解。

## 后续引入检查表

- [ ] 已记录来源 URL 与精确 tag / commit。
- [ ] 已记录获取日期和许可证文本。
- [ ] 已确认许可证覆盖所用的具体代码或资产。
- [ ] 已保留必要的版权和归属声明。
- [ ] 已说明它是研究参考、运行依赖还是直接衍生。
- [ ] 已确认模型条款、公开部署和商业使用边界。
- [ ] 已确认输入照片与测试素材可用于对应环境。
- [ ] 已确认项目拆分后不依赖兄弟目录。

## 同步日志

| 日期 | 来源版本 | 说明 |
| --- | --- | --- |
| 2026-08-11 | 根仓库 `8134995d` | 建立原创产品研究目录；未复制任何第三方代码或资产 |
| 2026-08-11 | Skill Zine Summary 当前本地版本 | 完成 13 个 Skill 的产品能力组合；选择 StoryFold，未引入第三方运行依赖 |
| 2026-08-11 | 本项目方向修订 | Route Contract 与交付预检由独立产品方向降为 StoryFold 内部合成 / QA 能力 |
| 2026-08-11 | Target Studio revision 2 | 使用 ImageGen 全新生成四组开放题材原图；实现目标推荐、十二预设、目标定制、能力组合与桌面成品预览 |
| 2026-08-11 | Target Studio revision 4 | 使用统一 ImageGen SOURCE 与四张组合结果，加一张本地 SVG 结果；改为开放目标驱动的多 Skill 组合与扩展 |
