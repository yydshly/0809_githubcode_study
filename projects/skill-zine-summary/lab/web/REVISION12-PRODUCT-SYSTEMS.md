# Revision 12：从单张效果到完整产品系统

> 关联入口：[研究总索引](../../RESEARCH-INDEX.md) · [Skill 选择器](http://localhost:4317/choose) · [多原图实验室](http://localhost:4317/labs/multi-source) · [Revision 13 选型说明](REVISION13-SKILL-CHOOSER.md) · [Revision 11](REVISION11-STRESS-AND-APPLICATIONS.md) · [运行手册](../RUNBOOK.md)

## 这轮解决什么

前两轮已经让全部 13 个 Skill 分别拥有独立输入与反向题材，但“效果可能用于某个场景”仍主要停留在一句说明或轻量 HTML/CSS 外壳。Revision 12 再为每个 Skill 新增一组独立 SOURCE→EFFECT，并把同一 EFFECT 继续处理成：

1. 不少于三种明确产品表面；
2. 一个具体使用环境；
3. 四步生产路径：保留、适配、生产、应用；
4. 目标受众、输出规格和不能证明的事项。

产品系统中的所有缩略图都复用对应 EFFECT。它们不重复计为新效果，也不代表实体打样、真实客户、现场投放或业务结果。

## 统一证据方法

每组栅格实验采用同一顺序：新建虚构 SOURCE → 在项目路径按原始尺寸检查完整画幅 → 以该 SOURCE 为唯一编辑输入制作 Skill-specific EFFECT → 再次检查完整画幅 → 形成能力结论与产品系统。Photo Distill 使用同样的新 SOURCE，但 EFFECT 是不嵌入照片像素、外部资源和可见文字的确定性 SVG。

页面固定把证据分为四层：

- SOURCE：本项目新生成的虚构、可控研究输入；
- EFFECT：依据公开高层规则制作的本地概念研究；
- PRODUCT SYSTEM：同一 EFFECT 在多种产品表面中的数字排版；
- IN-CONTEXT PREVIEW：这些表面进入一个使用环境的 HTML/CSS 预演。

## 13 个 Skill 的新题材与产品系统

| Skill | 新能力问题 | 产品系统 | 概念结论 | 生产前最重要的一步 |
| --- | --- | --- | --- | --- |
| Daily Photo Playground | 大型花车、人物和密集零件能否仍保持一个故事中心 | 招聘首页、案例跨页、社交卡、开放日海报 | 成立 | 肖像／场地授权与多尺寸可访问文字层 |
| DYY Photo Deconstruct | 五类 mark 能否表达三台机器的汇入、让行、载荷和停靠 | 年报章节、创新展卡、演讲屏、方法手册 | 成立 | 由业务专家确认五个事实并做无标题盲读 |
| Travel Photo Abstraction | 不美化房源照片时能否解释采光、动线、折叠与储物 | 房源网页、三折页、样板间屏、销售卡 | 部分成立 | 确定性嵌入授权照片并做像素校验 |
| Scenes Gathered | 三个服务时段能否形成旅程且不消费人物隐私 | 年报、赞助人展墙、服务折页、培训屏 | 部分成立 | 知情同意、健康信息排除与隐私审查 |
| Scene Distillation | 积极商业事件删除对象后能否仍表达“第一次交付” | 创办人信、年度信、发布屏、包裹内页 | 成立 | 由创办团队确认命题，事实文字独立审核 |
| GC Minimal Poster | 技术主题能否压成一个未接通链路隐喻并容纳真实议程 | 峰会海报、白皮书、落地页、议程屏、社交卡 | 成立 | 真实活动信息由可访问文字层排版 |
| Photo Revival | 人物和密集工具能否由钥匙与旧钥匙机唤回小店记忆 | 周年小书、感谢卡、故事墙、纪念标签 | 成立 | 档案与肖像授权、访谈核对和纸张打样 |
| Pixel Style Poster | 网频能否区分钢材、网栏、烟雾和火花 | 展会海报、产品页、年报、演讲屏、技术卡 | 成立 | 最小网点、摩尔纹、套印和纸张吸墨测试 |
| Photo Relic Editorial | 品牌档案中能否只让一个钴蓝瓶承担跨区记忆 | 周年刊、展柜标签、历史墙、网页、礼盒说明 | 部分成立 | 授权档案照片像素锁定与藏品信息核验 |
| Photo Distill | 两个方向、四种密度和一个异常能否形成可回归图形 | 复盘封面、章节屏、大屏待机、方法卡 | 成立 | 接入匿名真实数据并定义字段、阈值和回归 |
| Poetic Line Poster | 工业海景能否形成 gesture/mass/rhythm/path 分工 | 年报、投资人演示、展厅屏、折页、网页 | 部分成立 | 锁定照片区，数据与绿色主张独立审计 |
| Photo Abstract Editorial | 吊装现场能否用有限关系而非设备轮廓解释 | 案例网页、复盘册、教育墙、提案卡 | 部分成立 | 项目与安全负责人确认事实；不得替代工程文件 |
| Photo to Zine Postcard | 固定双面系统能否承载变量姓名、场次和链接 | 感谢卡、变量背面、讲者礼盒卡、VIP 套封、CRM 预览 | 部分成立 | 肖像同意、数据清洗、二维码验证和实体邮寄测试 |

## 资产路径

| Skill | SOURCE | EFFECT |
| --- | --- | --- |
| Daily | `public/generated/source/revision12/daily-parade-float-mechanic-source.png` | `public/generated/studies/daily-photo-playground/revision12-parade-float-editorial-effect.png` |
| DYY | `public/generated/source/revision12/dyy-warehouse-robots-source.png` | `public/generated/studies/dyy-photo-deconstruct/revision12-warehouse-five-mark-effect.png` |
| Travel | `public/generated/source/revision12/travel-micro-apartment-source.png` | `public/generated/studies/travel-photo-abstraction/revision12-micro-apartment-relations-effect.png` |
| Scenes Gathered | `public/generated/source/revision12/scenes-mobile-clinic-source.png` | `public/generated/studies/scenes-gathered-zine/revision12-mobile-clinic-journey-effect.png` |
| Scene Distillation | `public/generated/source/revision12/distillation-first-order-source.png` | `public/generated/studies/scene-distillation-zine/revision12-first-order-distillation-effect.png` |
| GC Minimal | `public/generated/source/revision12/gc-broken-fiber-source.png` | `public/generated/studies/gc-minimal-zine-poster/revision12-broken-fiber-anchor-effect.png` |
| Photo Revival | `public/generated/source/revision12/revival-hardware-store-source.png` | `public/generated/studies/photo-revival/revision12-hardware-store-memory-effect.png` |
| Pixel | `public/generated/source/revision12/pixel-robot-welding-source.png` | `public/generated/studies/pixel-style-poster/revision12-robot-welding-halftone-effect.png` |
| Photo Relic | `public/generated/source/revision12/relic-perfume-archive-source.png` | `public/generated/studies/photo-relic-editorial/revision12-blue-bottle-relic-effect.png` |
| Photo Distill | `public/generated/source/revision12/photo-distill-fulfillment-source.png` | `public/generated/studies/photo-distill/revision12-fulfillment-wave-effect.svg` |
| Poetic Line | `public/generated/source/revision12/poetic-wind-inspection-source.png` | `public/generated/studies/poetic-line-zine-poster/revision12-wind-inspection-poetic-effect.png` |
| Photo Abstract | `public/generated/source/revision12/abstract-exhibition-install-source.png` | `public/generated/studies/photo-abstract-editorial/revision12-exhibition-install-relations-effect.png` |
| Postcard | `public/generated/source/revision12/postcard-conference-designer-source.png` | `public/generated/studies/photo-to-zine-postcard/revision12-conference-thank-you-card-effect.png` |

`scripts/generate-revision12-photo-distill.mjs` 可重建 Photo Distill 的自足 SVG；`scripts/render-revision12-contact-sheets.mjs` 可在 `.tmp/` 生成 SOURCE 与 EFFECT 接触表，用于统一检查题材重复、完整画幅和明显语义漂移。接触表只是本地 QA 产物，不属于效果证据。

## 从效果进入产品时实际增加了什么

这轮不是给效果套一个通用相框。每个产品系统都明确增加：

- 信息责任：哪些事实由图片承担，哪些必须由文字、数据或正式档案承担；
- 载体差异：网页、跨页、海报、屏幕、卡片、标签或包装的尺寸与阅读距离；
- 生产检查：像素锁定、字段清洗、无障碍、网点、出血、二维码、纸张或环境测试；
- 现实边界：适合传播和解释的视觉，不自动升级为工程、医疗、档案、运营或合规证据。

页面里的“完整产品系统”表示产品表面和信息结构已被完整画出；“数字环境预演”表示它们进入了一个可讨论的环境画面。两者都不等于实物、现场或真实业务验证。

## 计数口径

Revision 12 新增 13 个图片 SOURCE→图片 EFFECT 配对和 13 个不同 SOURCE 路径。完成后多原图实验室的统一口径为：

- 127 组图片 SOURCE→图片 EFFECT；
- 57 个不同图片来源路径；
- 129 个静态效果，包含 2 个文字驱动静态效果；
- 2 个实时交互，共 131 个总效果证据；
- 13 个完整产品系统数字预演，因复用 EFFECT 而单独披露、不计入效果。

## Revision 13 如何使用本轮证据

[Revision 13](REVISION13-SKILL-CHOOSER.md) 没有继续为 13 个 Skill 各增加图片，而是新增 `/choose`，让读者按用途、真实性、技术路径和产品化形态从任务反选 Skill，再回到本轮的具体 SOURCE → EFFECT 与产品系统核对判断。它不新增 SOURCE、EFFECT、产品表面、产品预演或证据项，也不是作品质量排名，因此 **127 / 57 / 129 / 131** 与 13 个产品系统的口径保持不变。

Revision 7 报告仍完整保留，并继续由研究总索引和单 Skill 页关联；只是主导航把原来的 R7 入口位置交给 `/choose`，让首次访问者先完成任务选型，再按需进入历史报告。

## 发布与许可边界

站点继续是本地研究站。上游许可只约束可依法使用的上游内容，不自动授权上游样例、字体、照片或模型输出；本地生成素材也尚未进入逐项发布 allowlist。Travel Photo Abstraction、Scenes Gathered 及若干无正式许可证项目尤其需要保守处理。公开 GitHub Pages、Sites 或其他托管前，必须先完成逐项权利清单、资产物理分区和发布 allowlist。
