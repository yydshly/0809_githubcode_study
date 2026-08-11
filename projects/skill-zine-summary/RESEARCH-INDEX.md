# Skill Zine Summary 研究总索引

这份文档是本项目网页、研究文档与实验记录的统一入口。它回答四个问题：从哪里开始看、如何从真实任务反选 Skill、网页中的结论由哪些文档支撑，以及下一步应进入单个 Skill、横向比较还是复现实验。

> 当前 Web 入口均为本地地址，需要先按 [Web 研究站说明](lab/web/README.md) 启动服务。公开部署仍受上游许可、样例素材和生成资产再发布权利约束。

## 从哪里开始

| 你的目标 | 建议入口 | 接着阅读 |
| --- | --- | --- |
| 第一次接触这些 Skill，不知道应先理解什么 | [公开新人学习入口](https://yydshly.github.io/0809_githubcode_study/start/) | [新人学习指南](BEGINNER-GUIDE.md) → [技术架构图](TECHNICAL-MAP.md) |
| 快速了解整个研究 | [研究总索引 `/research`](http://localhost:4317/research) | [项目总览](README.md) → [项目清单](INVENTORY.md) |
| 已有真实任务，但不知道该选哪个 Skill | [Skill 选择器 `/choose`](http://localhost:4317/choose) | [Revision 13 选型说明](lab/web/REVISION13-SKILL-CHOOSER.md) → 对应的 [多原图证据](http://localhost:4317/labs/multi-source) |
| 逐个理解 Skill | [13 个 Skill 目录 `/`](http://localhost:4317/) | 选择一个 [`/skills/<slug>`](http://localhost:4317/skills/photo-distill) → 对照 [原始样例](lab/ORIGINAL-SAMPLES.md) |
| 比较同一输入下的路线差异 | [统一原图横评 `/comparison`](http://localhost:4317/comparison) | [技术架构图](TECHNICAL-MAP.md) → [研究日志](RESEARCH.md) |
| 用更多原图观察适用场景 | [多原图实验室 `/labs/multi-source`](http://localhost:4317/labs/multi-source) | 查看 [Revision 12 完整产品系统](lab/web/REVISION12-PRODUCT-SYSTEMS.md) → [Revision 11](lab/web/REVISION11-STRESS-AND-APPLICATIONS.md) → [Revision 10](lab/web/REVISION10-INDEPENDENT-SOURCES.md) |
| 审阅 Revision 7 的跨题材结论 | [可浏览报告 `/reports/revision-7`](http://localhost:4317/reports/revision-7) | [研究报告](lab/web/REVISION7-RESEARCH.md) → [资产记录](lab/web/REVISION7-ASSETS.md) |
| 复现或继续实验 | [实验室说明](lab/README.md) | [运行手册](lab/RUNBOOK.md) → [实验记录模板](lab/records/README.md) |
| 判断能否公开发布 | [上游与许可](UPSTREAM.md) | [Revision 7 资产记录](lab/web/REVISION7-ASSETS.md) → [Revision 10](lab/web/REVISION10-INDEPENDENT-SOURCES.md) → [Revision 11](lab/web/REVISION11-STRESS-AND-APPLICATIONS.md) → [Revision 12](lab/web/REVISION12-PRODUCT-SYSTEMS.md) → 本文的[发布边界](#当前发布与权利边界) |

## 为什么是 12 个仓库、13 个 Skill

这里有三个不同的计数口径，不能互换：

- 主上游目录有 **14 个展示条目**；其中 `gathered-scenes-zine-skill`、`scenes-gathered-zine-v1-3` 和 `scene-distillation-zine-v1-3` 实际指向同一个仓库，因此去重后是 **12 个上游仓库**。
- 研究站把 `gathered-scenes-zine-skill` 历史快照里的两份方法分别作为独立目标：保留现场的 `scenes-gathered-zine-v1-3`，以及完全蒸馏现场的 `scene-distillation-zine-v1-3`。
- 其余 11 个仓库各对应一个目标，所以 Web 中是 **13 个 Skill 研究页**，而不是 12 或 14 个。

原始条目、规范化仓库名与固定提交的完整映射见 [INVENTORY.md](INVENTORY.md)；历史实现与许可证随 commit 变化的说明见 [UPSTREAM.md](UPSTREAM.md)。

## Web 入口地图（7 类核心入口）

| Web 入口 | 作用 | 适合回答 | 关联文档 |
| --- | --- | --- | --- |
| [`/research`](http://localhost:4317/research) | 研究入口与网页／文档关系索引 | “整个项目有哪些材料，我该从哪里看？” | 本文、[README.md](README.md)、[lab/web/README.md](lab/web/README.md) |
| [`/choose`](http://localhost:4317/choose) | 从用途、真实性、技术路径和产品化形态反选 13 个 Skill | “面对当前任务，应先研究哪条路线，并到哪里核对证据？” | [REVISION13-SKILL-CHOOSER.md](lab/web/REVISION13-SKILL-CHOOSER.md)、[TECHNICAL-MAP.md](TECHNICAL-MAP.md) |
| [`/`](http://localhost:4317/) | 13 个独立研究目标目录 | “有哪些 Skill，它们大致解决什么问题？” | [INVENTORY.md](INVENTORY.md)、[TECHNICAL-MAP.md](TECHNICAL-MAP.md) |
| [`/skills/<slug>`](http://localhost:4317/skills/photo-distill) | 单个 Skill 的上游证据、本地效果、场景、边界与扩展方向 | “这个 Skill 到底能做什么，适合什么，不适合什么？” | [ORIGINAL-SAMPLES.md](lab/ORIGINAL-SAMPLES.md)、[UPSTREAM.md](UPSTREAM.md)、[REVISION7-RESEARCH.md](lab/web/REVISION7-RESEARCH.md) |
| [`/comparison`](http://localhost:4317/comparison) | 同一张合成原图驱动 13 个 Skill 的受控横评 | “控制输入后，各路线的信息选择有何不同？” | [TECHNICAL-MAP.md](TECHNICAL-MAP.md)、[RESEARCH.md](RESEARCH.md) |
| [`/labs/multi-source`](http://localhost:4317/labs/multi-source) | 汇集多原图 SOURCE → EFFECT 与完整产品系统，按 Skill 查看 | “换题材后能力是否仍成立，效果又如何进入产品与生产流程？” | [REVISION12-PRODUCT-SYSTEMS.md](lab/web/REVISION12-PRODUCT-SYSTEMS.md)、[REVISION11-STRESS-AND-APPLICATIONS.md](lab/web/REVISION11-STRESS-AND-APPLICATIONS.md)、[REVISION10-INDEPENDENT-SOURCES.md](lab/web/REVISION10-INDEPENDENT-SOURCES.md)、[RUNBOOK.md](lab/RUNBOOK.md) |
| [`/reports/revision-7`](http://localhost:4317/reports/revision-7) | 7 张来源、12 个目标 Skill、24 组实验的文字型报告 | “这轮具体做了什么，成立与部分成立的结论是什么？” | [REVISION7-RESEARCH.md](lab/web/REVISION7-RESEARCH.md)、[REVISION7-ASSETS.md](lab/web/REVISION7-ASSETS.md) |

Revision 7 报告路由继续保留，并仍由研究总索引、单 Skill 页和文档地图关联；主导航把这个位置交给更常用的 `/choose`，不表示 R7 被删除或降级为无效证据。

公开新人学习页与本地 7 类核心 Web 入口分开部署，不加载上游或本地生成图片；本地研究总索引只保留一个跳转入口，因此不会把学习说明混入现有样例阅读流。

多原图实验室当前聚合 **127 组图片 SOURCE → 图片 EFFECT**：13 组 Revision 12 产品系统实验、13 组 Revision 11 反向题材压力测试、13 组 Revision 10 独立原图扩样、37 组统一原图基线、20 组图片计划交付、4 组 Photo Relic 受控配对和 27 组跨题材探索。它们来自 **57 个不同图片来源路径**；另有 2 个文字驱动静态效果与 2 个实时交互，因此总口径为 **129 个静态／131 个效果证据**。Revision 12 的 13 个完整产品系统数字预演复用对应 EFFECT，不重复计数。Revision 13 只把这些既有证据组织成任务选型入口，不新增效果图片、SOURCE、产品预演或证据项，也不是质量排名，因此上述口径保持不变。

`/skills/<slug>` 当前包含以下 13 个研究页：

| 路线 | Skill 页面 |
| --- | --- |
| 高饱和编辑重构 | [`daily-photo-playground`](http://localhost:4317/skills/daily-photo-playground) |
| 最少必要记号／剪影 | [`dyy-photo-deconstruct`](http://localhost:4317/skills/dyy-photo-deconstruct) |
| 原照 + 抽象关系面板 | [`travel-photo-abstraction`](http://localhost:4317/skills/travel-photo-abstraction) |
| 保留现场的实景拼贴 | [`scenes-gathered-zine`](http://localhost:4317/skills/scenes-gathered-zine) |
| 移除照片的现场蒸馏 | [`scene-distillation-zine`](http://localhost:4317/skills/scene-distillation-zine) |
| 极简隐喻海报 | [`gc-minimal-zine-poster`](http://localhost:4317/skills/gc-minimal-zine-poster) |
| 记忆式全量重绘 | [`photo-revival`](http://localhost:4317/skills/photo-revival) |
| 点阵／半调材料语言 | [`pixel-style-poster`](http://localhost:4317/skills/pixel-style-poster) |
| 照片 + 记忆遗物版画 | [`photo-relic-editorial`](http://localhost:4317/skills/photo-relic-editorial) |
| Code-native 蒸馏 | [`photo-distill`](http://localhost:4317/skills/photo-distill) |
| 原照 + 诗性线条面板 | [`poetic-line-zine-poster`](http://localhost:4317/skills/poetic-line-zine-poster) |
| 原照 + 关系抽象面板 | [`photo-abstract-editorial`](http://localhost:4317/skills/photo-abstract-editorial) |
| 双面 Zine 明信片 | [`photo-to-zine-postcard`](http://localhost:4317/skills/photo-to-zine-postcard) |

## Markdown 文档地图（20 份核心文档）

### 1. 项目定位与上游事实

| 文档 | 负责什么 | 何时阅读 | 主要关联网页 |
| --- | --- | --- | --- |
| [根仓库 README](../../README.md) | 整个多项目研究仓库的目录 | 想从更大的项目集合进入本研究时 | `/research` |
| [RESEARCH-INDEX.md](RESEARCH-INDEX.md) | 网页与 Markdown 的离线总地图，也是 `/research` 的长期文档镜像 | 不知道该从哪一份材料开始时 | `/research` |
| [README.md](README.md) | 本项目结论、技术路线、进度与安全边界 | 第一次进入项目 | `/research`、`/` |
| [UPSTREAM.md](UPSTREAM.md) | 主上游、12 个目标仓库的固定版本、许可证与可执行边界 | 获取代码、复制素材或考虑发布前 | 所有页面的来源／权利说明 |
| [INVENTORY.md](INVENTORY.md) | 14 个展示条目到 12 个仓库的映射与逐库技术卡 | 选择研究目标或核对计数时 | `/`、`/skills/<slug>` |

### 2. 技术理解与学习计划

| 文档 | 负责什么 | 何时阅读 | 主要关联网页 |
| --- | --- | --- | --- |
| [TECHNICAL-MAP.md](TECHNICAL-MAP.md) | 统一技术分层、中间表示、渲染后端、真实性策略与 QA | 想跨 Skill 提炼可复用能力时 | `/comparison`、`/skills/<slug>` |
| [LEARNING-ROADMAP.md](LEARNING-ROADMAP.md) | 分阶段实验、产出和验收标准 | 准备制定下一轮实现顺序时 | `/research`、`/labs/multi-source` |
| [RESEARCH.md](RESEARCH.md) | 研究问题、证据、决定、开放问题与后续日志 | 想知道结论如何形成、还有什么没回答时 | `/comparison`、`/labs/multi-source` |

补充学习文档：[BEGINNER-GUIDE.md](BEGINNER-GUIDE.md) 负责新人心智模型、13 个 Skill 快速卡、输入预检、失败类型与第一次实验。它不纳入上述 20 份核心审计文档计数，避免改变现有 Web 文档地图口径。

### 3. 上游获取、原始证据与复现

| 文档 | 负责什么 | 何时阅读 | 主要关联网页 |
| --- | --- | --- | --- |
| [lab/README.md](lab/README.md) | 研究实验室目录、12 个固定检出与安全边界 | 准备在本地运行或检查上游前 | `/skills/<slug>` |
| [lab/ORIGINAL-SAMPLES.md](lab/ORIGINAL-SAMPLES.md) | 固定提交上的上游样例与路径 | 区分“上游展示”与“我们的效果”时 | `/skills/<slug>` |
| [lab/RUNBOOK.md](lab/RUNBOOK.md) | 获取、核验、运行、记录和失败处理流程 | 真正开始复测时 | `/labs/multi-source` |
| [lab/records/README.md](lab/records/README.md) | 实验记录模板及字段说明 | 新增可复核实验记录时 | `/labs/multi-source` |

### 4. Web 研究站、结论与资产审计

| 文档 | 负责什么 | 何时阅读 | 主要关联网页 |
| --- | --- | --- | --- |
| [lab/web/README.md](lab/web/README.md) | 页面结构、启动方式、能力证据与数量口径 | 启动或理解 Web 研究站时 | 全部 Web 路由 |
| [lab/web/REVISION7-RESEARCH.md](lab/web/REVISION7-RESEARCH.md) | Revision 7 的目的、24 组逐项结论、跨路线观察与边界 | 审阅跨题材能力结论时 | `/reports/revision-7`、`/labs/multi-source` |
| [lab/web/REVISION7-ASSETS.md](lab/web/REVISION7-ASSETS.md) | 7 张来源、24 张效果、复用关系、提示摘要与 SHA-256 | 核对某张图的来源、路径或完整性时 | `/reports/revision-7`、`/skills/<slug>` |
| [lab/web/REVISION10-INDEPENDENT-SOURCES.md](lab/web/REVISION10-INDEPENDENT-SOURCES.md) | 13 张独立来源、对应效果、能力问题、用途、结论与生产边界 | 核对本轮如何真正扩大来源多样性时 | `/labs/multi-source`、`/skills/<slug>` |
| [lab/web/REVISION11-STRESS-AND-APPLICATIONS.md](lab/web/REVISION11-STRESS-AND-APPLICATIONS.md) | 13 个反向题材、对应效果、产品画布、环境语境与生产下一步 | 核对第二轮如何从不同角度测试并解释真实用途时 | `/labs/multi-source`、`/skills/<slug>` |
| [lab/web/REVISION12-PRODUCT-SYSTEMS.md](lab/web/REVISION12-PRODUCT-SYSTEMS.md) | 13 个新题材、对应效果、完整产品表面、使用环境、生产步骤与边界 | 核对效果如何从单图继续进入完整产品系统时 | `/labs/multi-source`、`/skills/<slug>` |
| [lab/web/REVISION13-SKILL-CHOOSER.md](lab/web/REVISION13-SKILL-CHOOSER.md) | `/choose` 的四维选型契约、13 Skill 映射、证据边界与后续可证伪实验 | 已有任务约束，需要反选 Skill 并定位既有证据时 | `/choose`、`/labs/multi-source` |
| [lab/web/REFINEMENT.md](lab/web/REFINEMENT.md) | 各轮页面改进契约、覆盖状态、验证与发布阻塞 | 审阅“网页为何这样设计、验收过什么”时 | 全部 Web 路由 |

`lab/sources/` 下的 README、SKILL 和 references 属于本地固定的第三方上游快照，不是本项目原创研究文档，因此不在这里逐文件列出。请通过 [UPSTREAM.md](UPSTREAM.md)、[ORIGINAL-SAMPLES.md](lab/ORIGINAL-SAMPLES.md) 和锁文件 [`lab/SOURCES.lock.json`](lab/SOURCES.lock.json) 定位，并继续遵守各自许可证与署名要求。

## 网页与文档如何配合

网页和 Markdown 不是两套互相替代的内容：

- **网页负责看效果与走路径**：完整 SOURCE／EFFECT、产品语境、页面内导航和跨 Skill 跳转。
- **Markdown 负责可审计解释**：固定 commit、许可、数量口径、研究问题、方法、结论边界、资产指纹和复现步骤。
- **`/choose` 负责从任务反选路线**，单个 Skill 页负责纵向深挖，`/comparison` 负责同源横评，`/labs/multi-source` 负责多原图迁移观察，`/reports/revision-7` 负责 R7 汇总结论。
- 任何网页效果都不应单凭视觉相似度升级为“上游原生输出”“稳定能力”或“可生产交付”；应沿页面链接回到来源、方法和边界记录。

建议维护关系如下：

1. 新增或重做实验时，先补来源、方法、输出与边界记录，再让页面读取或关联它；
2. 新增网页入口、报告或关键数据口径时，同步更新本文和 [lab/web/README.md](lab/web/README.md)；
3. 上游 commit、许可证或素材权利变化时，先更新 [UPSTREAM.md](UPSTREAM.md) 与 [INVENTORY.md](INVENTORY.md)；
4. 页面验收、响应式或交互约束变化时，记录到 [REFINEMENT.md](lab/web/REFINEMENT.md)；
5. 新增项目、独立仓库或演示 URL 时，同时更新根仓库 [README.md](../../README.md) 的项目表。

## 证据等级

这些等级描述“结论有多强”，不是审美质量排名：

| 等级 | 证据 | 可以说明 | 不能据此说明 |
| --- | --- | --- | --- |
| E0 · 目录线索 | 主上游文字、链接、缩略图或展示条目 | 某个仓库／Skill 值得定位研究 | 实现仍存在、可以运行或拥有再发布权利 |
| E1 · 固定上游证据 | 固定 commit 的 README、SKILL、脚本与原始样例 | 上游在该快照声明或展示过什么 | 当前版本仍相同、输出稳定或适合生产 |
| E2 · 本地概念效果 | 依据规则理解生成或构建的本地效果 | 某种视觉语法和场景假设值得继续验证 | 实际运行上游 Skill 得到同样结果 |
| E3 · 受控 SOURCE → EFFECT 实验 | 完整输入、完整结果、方法、观察和限定结论 | 在该输入与该轮条件下观察到的取舍 | 跨题材稳定性、统计显著性或真实业务可用性 |
| E4 · 产品语境／数字预演 | 版面、屏幕、包装、展览或环境中的应用示意 | 结果可能如何进入真实载体、还需怎样处理 | 已印刷、已投放、已部署、客户采用或现场验证 |
| E5 · 生产验证 | 权利清楚的真实打印、部署、跨环境复测与验收记录 | 指定生产条件下可交付 | 自动推广到其他规格、输入或渠道 |

当前站点主要覆盖 E1–E4；E5 只应在真实生产证据、明确环境和权利记录都齐全时标记。Revision 7 的 24 张效果属于 E2，带完整结论结构的 SOURCE → EFFECT 卡可形成限定的 E3 观察，其 HTML/CSS 产品语境属于 E4 预演，不是实体证明。

Revision 13 只是把现有 E1–E4 材料按任务约束重新路由，不新增证据等级、效果图片或产品系统，也不能把筛选结果解释为跨 Skill 质量分数。

## 推荐阅读路径

### 十分钟快速理解

1. [项目 README](README.md)：先看结论、路线和许可概况；
2. [Web 研究入口](http://localhost:4317/research)：了解所有页面与资料关系；
3. [Skill 选择器](http://localhost:4317/choose)：按用途、真实性、技术路径和产品化形态缩小候选；
4. [13 Skill 目录](http://localhost:4317/)：进入候选 Skill 的完整研究页；
5. [多原图实验室](http://localhost:4317/labs/multi-source)：观察换输入后结论是否仍成立。

### 深入一个 Skill

1. 从 [`/skills/<slug>`](http://localhost:4317/skills/photo-distill) 看能力、场景、完整图和边界；
2. 回到 [INVENTORY.md](INVENTORY.md) 核对目标仓库、固定提交和技术卡；
3. 用 [ORIGINAL-SAMPLES.md](lab/ORIGINAL-SAMPLES.md) 区分上游原始证据与本地效果；
4. 用 [UPSTREAM.md](UPSTREAM.md) 检查许可证和允许的操作；
5. 按 [RUNBOOK.md](lab/RUNBOOK.md) 复测，并用 [实验记录模板](lab/records/README.md) 沉淀结果。

### 做跨 Skill 选型

1. [`/choose`](http://localhost:4317/choose)：从当前任务约束得到候选路线，不按图片数量或审美打分；
2. [REVISION13-SKILL-CHOOSER.md](lab/web/REVISION13-SKILL-CHOOSER.md)：核对四个筛选维度、每条路线仍未证明什么；
3. [TECHNICAL-MAP.md](TECHNICAL-MAP.md)：按保留原照、完全重绘、Hybrid、Code-native 复核后端契约；
4. [`/comparison`](http://localhost:4317/comparison)：控制同一输入观察差异；
5. [`/labs/multi-source`](http://localhost:4317/labs/multi-source)：检查更多题材下的适用场景与失败边界；
6. [RESEARCH.md](RESEARCH.md)：把选择记录为可推翻的研究决定，而不是风格偏好。

### 审计 Revision 7

1. [`/reports/revision-7`](http://localhost:4317/reports/revision-7)：先读汇总结论；
2. [REVISION7-RESEARCH.md](lab/web/REVISION7-RESEARCH.md)：核对 7／12／24 口径和逐项结论；
3. [REVISION7-ASSETS.md](lab/web/REVISION7-ASSETS.md)：核对来源复用、效果路径和指纹；
4. 回到对应 Skill 页面查看完整 SOURCE／EFFECT，而不是只读总结。

## 当前发布与权利边界

- 当前 Web 研究站和 `lab/web/public/generated/` 中的效果资产均按**本地研究**管理；生成目录被忽略，不应因为本地可见就推断为可公开再分发。
- 当前 12 个目标仓库中，快照口径为 5 个 MIT、2 个自定义限制许可、5 个无正式许可证；主汇总库也未声明许可证。许可证结论以 [UPSTREAM.md](UPSTREAM.md) 的逐项记录为准。
- 仓库代码许可证不自动覆盖 README 样例图、照片、字体、Logo、模型输出或人物肖像；这些素材需要逐项权利核对。
- Revision 7 和其他本地效果不是上游 Skill 原生运行输出；页面、报告和对外说明必须继续保留这条来源边界。
- 公开托管、复制第三方资产或发布可下载生成图，均保持阻塞，直到上游代码、样例素材和生成资产的发布权利得到明确确认。
- 权利清理完成后，也应先做 E5 所需的真实部署／打印／跨环境验证，再把数字预演描述为生产案例。

## 维护本索引

新增研究材料时，按以下最小规则保持关联完整：

- 新增 Skill：更新 [INVENTORY.md](INVENTORY.md)、[UPSTREAM.md](UPSTREAM.md)、本文的 Skill 路由表和 Web 首页；
- 新增实验：记录来源、完整输入／效果、方法、证据等级、结论与未证明事项，并关联单 Skill 页和多原图实验室；
- 新增报告或 Markdown：在本文的文档地图和相关 README 中增加入口；
- 更改数量口径：同步更新网页报告、研究报告与资产记录，不只改展示文案；
- 开放公共演示：先完成权利复核，再更新 [README.md](README.md)、根仓库 [README.md](../../README.md) 与本文的发布状态。
