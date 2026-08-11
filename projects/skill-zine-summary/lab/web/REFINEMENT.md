# Immersive research refinement

## Revision 17：在线文档中心

- Entry mode: scope-reduction-led.
- Request revision: 2026-08-11；用户明确不需要继续补上游安装、真实运行或生产验证，只要求把现有研究文档在线梳理和关联。
- Scope: 不新增 Skill、SOURCE、EFFECT、产品预演或实验结论；只新增 `/documents`，整理现有 20 份一方 Markdown，并为每份文档提供 GitHub 在线全文与对应研究网页入口。
- Information architecture: 文档按“入口与范围 / 来源与方法 / 实验运行 / 结果与维护”四组展示，并提供“第一次理解项目 / 核对来源与许可 / 继续一次实验 / 复盘各轮结果”四条阅读路径。
- Navigation: 不扩大六项主导航；`/documents` 归入“研究总索引”状态，只从 `/research` 与文档说明进入。
- Publishing: GitHub Pages 静态导出新增 `/documents/`；Sites 使用同一路由与数据。文档全文继续由 GitHub 原生 Markdown 页面呈现，研究站负责梳理和关联。

### Revision 17 coverage

| Coverage item | Target | Status |
| --- | --- | --- |
| 文档数量 | 恰好 20 份一方研究文档 | pass |
| 在线全文 | 每份文档有唯一 GitHub `blob/main` 阅读入口 | pass |
| 阅读结构 | 4 个分组与 4 条任务导向阅读路径 | pass |
| 网页关联 | 每份文档保留至少一个对应研究网页入口 | pass |
| 内容边界 | 不新增图片、实验、安装或生产验证 | pass |
| GitHub 导出 | 36 份 HTML，包含 `/documents/index.html` | pass |
| 线上发布 | GitHub Pages 与 Sites 更新后核验 | pending |

## Revision 16：GitHub Pages 完整研究站与子链接修复

- Entry mode: deployment-repair-led.
- Request revision: 2026-08-11；用户要求把完整研究站部署到 GitHub，并反馈现有 Sites 公开站的子链接点击后无法打开。
- Baseline evidence: Sites 的 `/skills` 正常展示 13 张卡，详情 URL 直接访问也返回完整页面；但点击卡片时，Vinext 的客户端 `next/link` 预取脚本报 `TypeError` 并吞掉导航，因此问题不是页面或研究内容丢失，而是托管运行时的客户端跳转故障。
- Repair: 全站内部导航统一改为普通 `<a>` 文档跳转，保留相同 URL、键盘语义与页面内容；GitHub Pages 通过自定义 Actions 工作流构建并导出完整静态快照。
- GitHub snapshot: 导出 33 条应用路由（核心入口、13 个 Skill 详情、13 个按 Skill 固定的多原图实验页），再加 `/start` 与 `404.html`，共 35 份 HTML；仓库子路径统一为 `/0809_githubcode_study/`。
- Asset boundary: GitHub Pages 承载完整页面、样式和脚本；体积较大的研究证据图继续从公开 Sites 资源地址读取，不在 GitHub 构建产物中复制第二份。`/choose` 的动态 GET 筛选继续跳转到 Sites，静态 GitHub 快照保留说明与稳定入口。

### Revision 16 coverage

| Coverage item | Target | Status |
| --- | --- | --- |
| 子链接修复 | Sites 与静态预览中的普通页面跳转不再依赖故障预取脚本 | pass |
| 13 个独立页 | GitHub 导出恰好包含 13 条 `/skills/<slug>/` | pass |
| 多原图实验 | 每个 Skill 有独立静态实验页，查询入口被改写为目录路由 | pass |
| 仓库子路径 | 所有内部链接与静态资源带 `/0809_githubcode_study/` 前缀 | pass |
| 本地导出 | 35 份 HTML、13 个 Skill、13 个实验变体与无 Jekyll 标记通过验证 | pass |
| GitHub Actions | 自定义 Pages workflow 构建、验证并上传静态 artifact | pass |
| 线上核验 | GitHub Pages 与重新部署后的 Sites 均点击代表子链接复核 | pass |

### Revision 16 completion evidence

- 本地 GitHub Pages 预览已从 `/0809_githubcode_study/skills/` 点击进入 `daily-photo-playground` 详情，再返回 13 Skill 目录；浏览器控制台无导航报错。
- GitHub Actions run `31476465349` 已完成构建、导出、路由验证、artifact 上传与 Pages 发布；公开 `/skills/` 显示 13 张卡，点击后进入 `daily-photo-playground`，并确认 20 份可沉浸查看证据。
- Sites Version 4 已重新部署；公开 `/skills` 同样显示 13 张卡，点击普通链接后进入相同详情页，不再停留在目录页。
- GitHub 导出不把 `public/generated/` 复制进仓库或 Pages artifact；页面中的研究证据仍明确来自公开研究站资源，避免把未完成逐项发布清单的素材伪装为 GitHub 自有资产。
- GitHub Pages 是静态快照：单 Skill、横评、报告与按 Skill 展开的实验可以直接阅读；需要服务器按查询计算的 Skill 选择器继续使用 Sites 动态入口。

## Revision 15：13 个独立研究页直接目录

- Entry mode: repair-led.
- Request revision: 2026-08-11；用户在公开站反馈本地曾经存在的每个 Skill 独立研究页难以找到，并询问当前部署位置及内容是否丢失。
- Baseline evidence: 公开首页实际仍渲染 13 张 Skill 卡，13 条详情路由均保留；但第一张目录卡位于页面约 3770px 处，主导航没有“13 个 Skill”直达项，`/research` 首先呈现的是网页与文档关系，因此内容存在但可发现性不足。
- Target: 新增 `/skills` 直接目录，打开后立即列出全部 13 个独立研究页，并为每个 Skill 直达上游 Demo、扩展实验、使用场景、产品应用和多原图实验；首页、研究索引、详情页返回链和主导航统一关联。
- Content boundary: 不删除、不复制、不重新生成研究内容；新页面只索引现有 13 张长页和已有章节。图片继续使用既有本地效果首图并完整 contain 显示。
- Deployment clarification: 完整图片研究站部署在 OpenAI Sites 的 `skill-zine-private-lab.yydshly.chatgpt.site`；GitHub Pages 保留轻量新人目录，两者用途不同。

### Revision 15 coverage

| Coverage item | Target | Status |
| --- | --- | --- |
| 13 个独立页 | `/skills` 恰好列出 13 张研究卡及 13 条详情路由 | pass |
| 章节直达 | 每张卡关联上游、扩展、使用场景、产品应用和多原图实验 | pass |
| 全局入口 | 首页首要按钮、6 项主导航、研究索引和详情页返回链指向 `/skills` | pass |
| 响应式 | 桌面与移动端无横向溢出；6 项导航在窄屏按 2×3 排列 | pass |
| Delivery | build、test、lint、公开部署和线上代表页检查通过 | pass |

### Revision 15 completion evidence

- 新增 `/skills` 独立目录：公开 SSR 与浏览器均确认恰好 13 张 `data-skill-directory` 卡、78 个现有章节入口和 6 项稳定主导航；详情页仍保留上游 Demo、扩展实验、跨题材、场景库与产品系统。
- 公开站 `/skills/photo-relic-editorial#capability-explorations` 仍有 6 个上游样例、4 个交付实验、2 个跨题材案例、5 个应用场景和 2 个产品案例；代表 SOURCE／EFFECT 公开加载为 900×1350 等比例部署副本，完整画幅未裁切。本地源图保持原始分辨率。
- 1280×720 与 430×900 浏览器复核均为 13 张卡、零水平溢出；移动主导航修正为正常的 2×3、146px 高布局，不再继承平板断点的 540px flex basis。
- Vinext build、ESLint 与 23／23 项 SSR／数据／资产测试通过；源代码已推送 GitHub `main`，Sites version 3 已更新到原公开地址。

## Revision 14：公开站完整研究入口修复

- Entry mode: repair-led.
- Request revision: 2026-08-11；公开站已部署，但用户反馈“以前很多研究看不到了”。
- Target user and context: 已经参与过多轮研究，希望在公开站快速确认旧研究没有被替换，并能直接进入 13 个 Skill、127 组 SOURCE→EFFECT、131 项效果证据和研究文档的使用者。
- Desired first impression: 第一屏明确告诉读者“完整研究仍在”，并把总档案、批量实验和 13 个 Skill 入口作为主路径，而不是让内容分散在多个路由后看似消失。
- Visual ambition: Functional editorial repair；保留现有纸面、墨色、信号红和酸黄色系统。
- Experience architecture: Editorial Flow；不新建第二套研究内容，只修复首页、研究索引和多原图实验室的入口说明。
- Information constraints: 不夸大计数；使用现有数据源显示 13 个研究目标、127 组图片配对、57 个来源路径、129 个静态效果、131 项总效果证据和 20 份文档。明确多原图实验室一次只展开一个 Skill 是性能策略，不代表其他研究缺失。
- Operation constraints: 入口必须直达 `/research`、`/labs/multi-source#skill-selector` 与 13 个现有详情页；不复制图片、不删除旧页面、不改变实验数据。
- Environment constraints: 本地 `http://localhost:4317` 与公开站 `https://skill-zine-private-lab.yydshly.chatgpt.site/`；公开站图片继续懒加载，上游样例保留固定提交与来源链接。
- Primary journey: 打开首页 → 看到完整研究档案数量 → 进入全部研究索引或批量实验室 → 选择任一 Skill → 查看旧有上游、扩展、跨题材、产品应用和技术边界。
- Autonomy authorization: 用户明确指出公开站研究不可见；本轮仅修复现有站点的可发现性与说明，不扩大研究范围。
- Observable completion criteria: 首页首屏附近出现完整研究总账与直达入口；研究索引明确显示完整档案口径；多原图实验室明确说明默认只展开一个 Skill 并提供跳转到 13 项选择器；本地与公开代表路由内容数量一致；构建、测试、lint 与桌面/移动浏览器检查通过。

### Revision 14 baseline and coverage

| Coverage item | Baseline evidence | Target | Status | Next action |
| --- | --- | --- | --- | --- |
| Public/local parity | `/research` 与 `/labs/multi-source` 的 Skill 链接、正文长度、图片数和 Revision 10–12 标记一致 | 保持数据与路由不变 | pass | — |
| Deep-page assets | `photo-relic-editorial#upstream` 的 6 张固定提交样例滚动后全部加载；详情页章节完整 | 保持懒加载与全图显示 | pass | — |
| Homepage discoverability | 首页有 13 个详情卡，但首要按钮未指向完整总索引，未显示 127／57／129／131 总账 | 增加完整档案摘要与入口 | pass | 首页现显示 13／127／131／20 总账与三个直达入口 |
| Research-index clarity | `/research` 有 13 Skill、7 类网页和 20 文档，但首屏只显示 12／13／7／20 | 增加批量证据总账与“旧研究仍保留”说明 | pass | 索引现明确列出 127／57／129／131 并保留 13 张关联卡 |
| Lab selection clarity | `/labs/multi-source` 默认展开第一个 Skill；一次只展开一个的说明位于首屏以下 | 首屏说明性能策略并直达 13 项选择器 | pass | 首屏解释单 Skill 加载策略并直达 13 项选择器 |
| Cross-surface | 当前桌面首屏无溢出；新入口将进入共享响应式布局 | 桌面与窄屏入口可读、可点击 | pass | 默认桌面与 430×900 均无水平溢出，移动按钮高度 44px |
| Delivery | 当前公开版本可访问但入口语义不足 | build/test/lint、重新部署、公开站复核 | pass | 22／22 测试、lint、公开首页／索引／实验室／深度页浏览器复核通过 |

### Revision 14 completion evidence

- 公开首页现在首先提供“查看全部研究档案”，并在首屏之后明确显示 **13 个深度页／127 组图片配对／131 项总效果证据／20 份核心文档**；旧有 13 张 Skill 视觉卡、横评、报告和图片资产没有被删除或重新计数。
- `/research` 继续保留 13 张 Skill 关联卡、7 类网页入口和 20 份文档，同时增加 127／57／129／131 批量证据总账；`/labs/multi-source` 明确说明默认只展开第一个 Skill 是图片性能策略，并提供 13 项选择器锚点。
- 公开站浏览器复核：首页 13 张 Skill 卡与新增总账存在；研究索引为 13 Skill／20 文档；实验室为 13 个选择项、默认 Daily 10 个案例；`photo-relic-editorial#capability-explorations` 的首组 SOURCE／EFFECT 均从公开地址加载为 1024×1536。所有代表页面水平溢出为 0。
- 本地与公开 430×900 移动视口均保持单列入口布局、两列数字总账、44px 操作按钮和零水平溢出。Vinext build、ESLint 与 **22／22** 项 SSR／数据／资产测试通过；修复版本已发布到原公开站地址。

## Revision 13：从样例库到 Skill 选择工作台

- Entry mode: revision-led implementation.
- Request revision: 2026-08-10；用户在全 13 个 Skill 完成多原图与产品系统扩样后再次要求“继续”。本轮承接“用更多角度理解能力、作用、场景和真实生产”的目标，但不再机械增加同规格漂亮图片，而是解决现有 131 项证据仍无法直接回答“当前任务该选哪个 Skill”的缺口。
- Target user and context: 已经拥有明确任务、真实性要求或产品目标，希望从 13 个 Skill 中快速选择主路线、备选路线，并知道为何匹配、差在哪一项、对应证据在哪里的研究者。
- Desired first impression: 第一屏先让读者决定“必须保留什么”，随后用任务、真实性契约、技术路径和产品化形态筛选；结果不做质量排名，而是显示完全匹配、最接近项、明确差异与可直达的 SOURCE→EFFECT 证据。
- Visual ambition: Editorial decision workspace.
- Experience architecture: 新增 `/choose` 独立编辑流。页面顺序为常见任务快捷入口 → 四维原生 GET 筛选 → 匹配／近似结果 → 13 Skill 证据地图 → 共同生产与许可边界。初始页不加载生成图片，证据图继续由 `/labs/multi-source?skill=<slug>#<experiment-id>` 按单 Skill 懒加载。
- Visual constraints: 延续现有纸面、墨色、信号红与酸黄色系统；桌面结果两列、720px 以下单列；不增加横向滚动大表，不以色彩单独表达匹配状态，所有交互目标至少 44px。
- Information constraints: 选择器只使用可追溯的分类与本地证据，不产生星级、总分或“最佳”排名。每张结果卡必须并列展示目标真实性契约、本地 R12 结论、匹配原因、差异／风险、R10／R11／R12 三条代表案例、上游仓库与许可、下一项可证伪实验、证据对数、不同来源数和三条入口；上游目标能力不得冒充本地已经兑现的能力。
- Operation constraints: 使用原生 `<form method="get">`、`fieldset`、`legend` 与 `<select>`，不新增客户端状态、后端、数据库或依赖。给实验卡增加稳定 `id` 以支持深链；不复制 SOURCE/EFFECT 路径到选择器数据，不把决策层计作新效果证据。
- State constraints: 支持默认、完全匹配、部分筛选、无完全匹配但有最接近项、无效查询回退五类状态；筛选维度为用途、真实性、技术路径和产品化形态。13 个 Skill 必须全部进入证据地图，每个 Skill 恰好关联一项 R10、一项 R11 与一项 R12 代表证据。
- Environment constraints: canonical runtime `http://localhost:4317`；沿用 Vinext/React 与现有 Sites 配置。当前明确保持本地研究站，不进入公开托管；`public/generated/` 的逐项权利 allowlist 仍未完成。
- Primary journey: 打开 `/choose` → 选择常见任务或四维条件 → 阅读完全匹配或最接近项及差异 → 对照对应 R10／R11／R12 SOURCE→EFFECT → 核对仓库、许可与下一项可证伪实验 → 阅读单 Skill 深度页或统一原图横评 → 返回选择器调整条件。
- Required artifacts: `skill-selection-guide` 数据与 fail-closed 检查、`/choose` 页面、39 个 R10／R11／R12 稳定深链、主导航与研究总索引入口、Revision 13 Markdown 决策说明、筛选／无精确匹配／移动端／可访问性／计数回归。
- Autonomy authorization: 用户再次明确“继续”；本轮均为现有本地研究站内可逆的数据、页面、导航与文档改动，不需要重复确认。
- User-decision boundary: 不把选择结果称为客观质量结论；不执行上游受限代码；不使用真实业务、人物或客户数据；不生成新的图片来制造样本数量；不公开发布。
- Observable completion criteria: `/choose` 覆盖 13/13 Skill、5 个常见任务和四类筛选；每个 Skill 与唯一 R10、R11、R12 实验深链关联；完全匹配与近似结果都说明原因、差异、许可和下一验证；研究索引按 7 类 Web 入口、20 份一方文档更新；现有 127／57／129／131 证据计数保持不变；build、test、lint、链接、SSR/HTTP 与运行态检查通过。

### Revision 13 coverage

| User phase | Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 选择模型 | 13 个 Skill 有可追溯分类且不做伪评分 | data | 13 唯一 slug、R12 一一关联、目标契约与本地状态分列 | 0 / 3 | pass | fail-closed 数据关联与禁用评分字段断言已生效 |
| 常见任务 | 从五类真实问题直接进入筛选 | `/choose` shortcuts | 5 个唯一任务入口及选择说明 | 3 / 4 | pass | 5 个快捷任务均生成可复查的四维 GET 查询 |
| 四维筛选 | 用途、真实性、技术路径、产品化形态可组合 | GET form | 原生表单、有效值回退、完全匹配与近似匹配 | 4 / 6 | pass | all／exact／nearest／无效值回退均已通过 SSR 回归 |
| 证据深链 | 每个结果直达对应完整 SOURCE→EFFECT | chooser → lab | 39 个 R10／R11／R12 稳定实验锚点、详情页与横评链接 | 4 / 5 | pass | 每个 Skill 的独立来源、压力测试与产品系统案例均可直达 |
| 全量能力地图 | 不筛选时仍能看见全部 13 条路线 | `/choose` atlas | 13 卡、12 个唯一仓库、契约、许可、形态与计数 | 3 | pass | 默认紧凑地图覆盖 13/13 Skill 与 12 个仓库，且不按质量排序 |
| 入口与文档 | 新页面进入统一导航和研究索引 | nav / research / Markdown | 5 项主导航、7 类 Web 入口、20 份文档 | 3 / 9 | pass | 主导航、首页、研究索引和 20 份一方文档已完成关联 |
| Cross-surface | 桌面双列、移动单列、键盘和文字状态成立 | CSS / SSR | 44px 控件、fieldset/legend、无横向表、文字匹配状态 | 7 | pass | 桌面双列、720px 单列、44–48px 控件与文字状态已进入回归 |
| Delivery | 页面、文档与 4317 运行态一致 | tests / docs / runtime | build、test、lint、links、HTTP | 9 | pass | build、21/21 tests、lint、20 文档链接与 5 条 HTTP 核验通过 |
| Publishing | 公开发布生成资产与研究站 | hosted site | 逐项权利清单与发布 allowlist | 9 | blocked | 继续保持本地研究站 |

### Revision 13 completion evidence

- `/choose` 初始态不再重复铺开 13 张长结果卡，只保留一个引导状态和 13 条紧凑证据地图；选择任一快捷任务或组合条件后再展开详细候选。四个原生 `<select>` 分别约束用途、真实性、技术路径和产品化形态，不新增客户端状态或依赖。
- 匹配逻辑支持 `all`、`exact` 与 `nearest`。无完全匹配时只返回不一致维度最少的候选，并逐项显示“所选条件／此路线”；无效查询安全回退为 `all`。选择结果不包含总分、星级、成功率或“最佳”排序。
- 13 个结果各自关联 R10 独立来源、R11 反向题材和 R12 产品系统三条代表案例，以及单 Skill 深度页和统一原图横评；R10–R12 实验卡均通过稳定 `id` 深链抵达。每条候选同时显示上游仓库、当前许可判断和下一项可证伪实验。选择器不复制 SOURCE／EFFECT 路径，也不把决策层计入效果证据。
- `/research` 现索引 7 类 Web 入口、13 个 Skill 和 20 份一方 Markdown 文档；20 份文档的本地相对链接检查为 `0` 缺失。Revision 7 报告继续保留，只是不再占用主导航位置。
- 全量构建、lint 与 **21／21** 项 SSR／数据／资产回归通过；本地 `http://localhost:4317` 已刷新，并对 `/choose` 默认、精确、最近候选、`/research` 和 R12 深链执行 5 条 HTTP 检查，全部为 `200` 且命中最新标记。
- 本轮没有新增图片：仍为 **127 组图片配对／57 个来源路径／129 个静态效果／131 个总效果证据／13 个数字产品系统**。公开托管继续因资产权利清单与发布 allowlist 未完成而阻塞。

## Revision 12：从单张效果到完整产品系统

- Entry mode: revision-led implementation.
- Request revision: 2026-08-10；用户再次要求“继续”，承接“不要只围绕单个 Skill 或微小细节，而要让 12 个上游仓库对应的 13 个 Skill 一起增加更多不同素材、更多能力角度、实际使用场景和真实生产处理”的方向。
- Target user and context: 需要用大量独立 SOURCE→EFFECT 证据判断每个 Skill 的适用范围，并进一步理解同一效果如何进入品牌、出版、展览、活动、空间、数据故事或实体沟通物的研究者。
- Desired first impression: 选择任何一个 Skill，都先看到一组此前未使用的新题材和完整 SOURCE/EFFECT，再看到同一 EFFECT 被组织成不少于三种产品表面与一个使用环境，而不是只看到一张孤立海报。
- Visual ambition: Editorial product system.
- Experience architecture: 沿用 `/labs/multi-source` 的按 Skill 单页加载；Revision 12 为每个 Skill 增加一个 `product-system` 实验卡。卡片顺序固定为研究问题 → 完整 SOURCE/EFFECT → 结论与边界 → 完整产品系统 → 使用环境 → 四步生产路径。
- Visual constraints: 13 个 SOURCE 题材彼此区分，并避开 Revision 10/11 的核心题材；人物均为虚构成年人，优先有故事、色彩丰富且与环境匹配的女性；同时保留工业、空间、物件、自然与数据型非人物输入。所有 SOURCE/EFFECT 与产品嵌图均使用完整 `contain`，不得用裁切制造效果。
- Information constraints: 每组必须回答能力问题、处理方法、实际发现、适合/不适合、目标受众、产品载体、输出规格、生产下一步与诚实边界。产品系统必须显式复用同一 EFFECT，不计作新的效果证据，也不得冒充实体打样、客户项目、现场部署或真实业务指标。
- Operation constraints: 栅格 SOURCE 必须从零生成并先以项目内原始尺寸检查，再作为对应 EFFECT 的唯一编辑输入；Photo Distill EFFECT 采用不嵌照片像素的确定性 SVG。不得通过复制、改名或重新引用旧图制造样本数量。
- State constraints: 13 个 Skill 恰好各新增 1 组 Revision 12；预计总计由 114 组图片配对／44 个来源路径／116 个静态效果／118 个总效果证据，提升到 127／57／129／131。13 个产品系统数字预演单独计数，不计入效果。
- Environment constraints: canonical runtime `http://localhost:4317`；沿用 Vinext/React、沉浸查看器和本地研究边界，不新增后端、数据库或运行依赖；未进入逐项权利 allowlist 的资产不得公开发布。
- Primary journey: 打开多原图实验室 → 选择 Skill → 查看 R12 完整 SOURCE/EFFECT → 阅读成立程度与边界 → 查看产品系统与使用环境 → 理解真实生产步骤 → 返回 Skill 深度页或研究总索引。
- Required artifacts: 13 张新 SOURCE、13 张新 EFFECT、Revision 12 结构化数据、复用现有产品系统组件的嵌入模式、13 个产品系统数字预演、Revision 12 报告、研究索引与统计更新、资源／计数／完整画幅／语义边界回归。
- User-decision boundary: 不使用真实客户、未授权真人、真实患者、真实参会者或外部运营数据；不执行许可边界不清的上游代码；不声称实体印刷、投放、安装、邮寄、业务结果或法规合规；不公开部署。
- Observable completion criteria: 13/13 Skill 各有唯一的新 SOURCE/EFFECT 与产品系统；13 个 SOURCE、13 个 EFFECT、13 个实验 ID 均唯一且不与 R10/R11 重叠；每个产品系统至少 3 个表面、4 个生产步骤、一个使用环境、输出规格、受众和边界；统计为 127／57／129／131；build、test、lint、资源、文档、SSR/HTTP 与运行路由检查通过。

### Revision 12 coverage

| User phase | Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 全 Skill 新题材 | 13 个 Skill 各新增一个真正独立 SOURCE | generated assets | 13 个唯一来源、题材矩阵、完整画幅检查 | 3 | pass | 13/13 SOURCE 已逐张原尺寸检查 |
| Skill-specific EFFECT | 每个来源形成对应能力处理 | generated assets | 13 个唯一效果、唯一输入链、Photo Distill 确定性 SVG | 3 | pass | 13/13 EFFECT 已逐张检查并完成文图复核 |
| 产品系统 | 同一 EFFECT 进入不少于三种产品表面与使用环境 | multi-source case | effect 路径复用、13 个产品系统、数字预演披露 | 4 | pass | 13/13 系统均复用对应 EFFECT，不增加证据计数 |
| 能力与生产解释 | 回答适合、不适合和真正落地步骤 | data / report | 13 组结论、4 步流程、规格、受众、边界 | 3 / 4 | pass | 页面与 Revision 12 报告使用同一实验数据 |
| 真实计数 | 不把产品预演重复计作效果 | stats / tests | 127 配对、57 来源、129 静态、131 总证据、13 产品系统 | 7 | pass | 运行态、适配器与自动回归口径一致 |
| Cross-surface | 单 Skill 加载、全图、移动端不溢出 | lab / CSS / SSR | contain、lazy、async、responsive、heading checks | 7 / 8 | pass | CSS、SSR 与回归覆盖全图、懒加载、标题层级和移动单列 |
| Delivery | 页面、文档、资源和 4317 运行态一致 | tests / docs / runtime | test、lint、diff、links、HTTP | 9 | pass | 20/20 tests、lint、链接与 4317 代表路由检查通过 |
| Publishing | 公开发布生成资产 | hosted site | 逐项权利清单与发布 allowlist | 9 | blocked | 继续保持本地研究站 |

### Revision 12 completion evidence

- 13 个 Skill 各新增 1 个唯一 SOURCE 与 1 个唯一 EFFECT，共 26 条唯一资产路径；25 张 PNG 均为 1024×1536，Photo Distill EFFECT 为 1200×1600 自足、零照片像素的确定性 SVG。栅格 SOURCE 先落盘并原尺寸检查，再作为对应 EFFECT 的唯一编辑输入；全批次又通过 SOURCE / EFFECT 联系表复核完整画幅与题材差异。
- `/labs/multi-source` 对每个 Skill 恰好渲染 1 个 Revision 12 案例和 1 套完整产品系统。每套系统包含 4–5 个产品表面、一个使用环境、四步生产路径、输出规格、受众与诚实边界；所有产品预演都复用同一 EFFECT，使用 `contain`、lazy 与 async，且不进入图片证据或沉浸查看器计数。
- 研究账本最终为 127 组 SOURCE→EFFECT 图片配对、57 个不同来源路径、129 项静态效果与 131 项总效果证据，另列 13 套产品系统数字预演。研究总索引关联 6 类 Web 入口、13 个 Skill 目标与 19 份一方研究文档。
- 完整 Vinext 五阶段构建与 20/20 回归通过，lint 通过；Markdown 相对链接、资源存在性、确定性 SVG 契约、全图 `contain`、移动端单列、可访问标题层级与产品复用口径均通过检查。`http://localhost:4317` 已刷新，研究总索引、Daily、Photo Distill、Postcard、Pixel 代表页和 Revision 12 SVG 均返回 200。
- 本轮遵守 Sites 的非显式浏览器操作边界：没有额外执行浏览器点击或截图；视觉证据来自落盘后的原尺寸图像检查与批次联系表，跨尺寸证据来自响应式 CSS、SSR 与自动回归。公开发布仍因生成资产未完成逐项权利 allowlist 而保持 `blocked`，本轮交付仅用于本地研究。


## Revision 11：反向题材压力测试与产品语境预演

- Entry mode: revision-led implementation.
- Request revision: 2026-08-10；用户再次要求“继续”，承接“全 13 个 Skill 一起扩样、从不同角度理解能力、展示真实使用场景”的方向。本轮不继续微调 Revision 10，而是为每个 Skill 再增加一个与上一轮题材或密度相反的输入，并把同一 EFFECT 放入明确产品载体和使用环境中预演。
- Target user and context: 希望用足够多、足够不同的 SOURCE→EFFECT 对照判断每个 Skill 适用范围，并理解效果进入出版、展览、活动、产品和空间之前还缺哪些生产步骤的研究者。
- Desired first impression: 选择任一 Skill 后，先看到一组新的反向题材压力测试，再同时看到完整 SOURCE、完整 EFFECT、明确结论与一个真实用途的数字应用语境。
- Visual ambition: Editorial.
- Experience architecture: Editorial Flow；继续使用 `/labs/multi-source` 的按 Skill 单次展开结构，在新实验卡内追加产品画布和使用环境两种 HTML/CSS 数字预演。
- Visual constraints: 13 个新 SOURCE 不复用 Revision 10；题材同时覆盖人物与非人物、室内与室外、稀疏与密集、日景与夜景、静态与运动。人物均为虚构成年人，优先采用有故事、色彩丰富且与环境匹配的女性角色；所有 SOURCE／EFFECT 继续完整 `contain` 展示。
- Information constraints: 每组必须说明“为什么这是反向题材”、方法、实际发现、适用与不适用、产品载体、使用环境和生产下一步。产品预演明确复用同一 EFFECT，只说明可能用途，不冒充实体打样、客户项目或现场投放。
- Operation constraints: 栅格 SOURCE 先从零生成并以原始尺寸检查，再作为唯一编辑输入生成 EFFECT；Photo Distill 使用符合其代码原生边界的确定性 SVG。不得复制旧文件、改名或复用同一路径制造独立样本。
- State constraints: 每个 Skill 恰好 1 个 Revision 11 stress case；新批次固定增加 13 个图片配对和 13 个来源路径；一次只加载所选 Skill 的大图，产品预演复用 EFFECT，不计为新效果图。
- Environment constraints: canonical runtime `http://localhost:4317`；保留 Vinext／React、沉浸查看器和本地研究边界，不新增后端、数据库或依赖，不公开发布未进入权利 allowlist 的生成资产。
- Primary journey: 打开多原图实验室 → 选择 Skill → 查看 Revision 11 反向题材 SOURCE／EFFECT → 阅读结论与边界 → 查看产品画布和环境数字预演 → 判断生产下一步 → 返回单 Skill 深度页。
- User-defined phases: 全 13 个一起补充更多不同原图；从相反题材或约束理解能力；说明适用场景；展示效果如何进入真实产品语境；沉淀网页与文档证据。
- Required artifacts: 13 张新 SOURCE、13 张新 EFFECT、Revision 11 结构化数据、可复用数字应用预演组件、实验室第六批次统计、Revision 11 报告、资源／计数／完整画幅／应用披露回归。
- Autonomy authorization: 用户再次明确“继续”；本轮属于已授权本地研究站内的可逆扩样与展示工作，不需要重复确认。
- User-decision boundary: 不使用真实客户、未授权真人或外部服务数据；不执行许可边界不清的上游代码；不把数字预演称为已印刷、已安装、已投放或已部署。
- Observable completion criteria: 13／13 Skill 各新增 1 个唯一 SOURCE 和 EFFECT；实验室达到 114 组图片配对／44 个来源路径、116 个静态／118 个总效果证据；每个新案例都有反向变量、结论、用途、数字产品画布、环境语境和生产下一步；build、test、lint、资源与运行路由检查通过。

### Revision 11 coverage

| User phase | Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 反向题材扩样 | 13 个 Skill 各新增一个与 R10 不同的 SOURCE | generated assets | 13 个新来源、题材轴矩阵、原图检查 | 3 | pass | 13／13 SOURCE 已逐张原尺寸检查 |
| Skill 效果 | 每个新 SOURCE 得到对应 EFFECT | generated assets | 13 个唯一效果、Skill-specific 处理、完整画幅 | 3 | pass | 13／13 EFFECT 已逐张检查；Photo Distill 为确定性 SVG |
| 能力结论 | 说明反向变量、发现、适用与不适用 | experiment data | 13 组结构化结论与诚实披露 | 3 | pass | 数据、报告与页面共用同一实验 ID |
| 产品语境 | 同一 EFFECT 进入产品画布与环境预演 | multi-source case | 13 个产品载体、13 个环境语境、生产下一步 | 3 / 4 | pass | 每个 Skill 恰好 1 个数字应用预演，且不重复计图 |
| 真实计数 | 新增样本不混入预演重复图 | stats / selector | 114 配对、44 来源、116／118 效果 | 4 | pass | 运行时与自动回归均匹配该口径 |
| Cross-surface | 一次只加载一个 Skill，大图懒加载且全图展示 | desktop / tablet / mobile | contain、lazy、responsive、heading checks | 7 / 8 | pass | CSS、SSR 与回归覆盖 contain、lazy、响应式和标题层级 |
| Delivery | 页面、报告和索引口径一致 | tests / docs / runtime | test、lint、资源、路由与文档检查 | 9 | pass | 19／19 tests、lint、diff check 与 4317 路由检查通过 |
| Publishing | 公开发布生成资产 | hosted site | 权利清单与发布 allowlist | 9 | blocked | 继续保持本地研究站 |

### Revision 11 completion evidence

- 13 个 SOURCE 与 13 个 EFFECT 共 26 条唯一路径、26 个唯一 SHA-256；25 张 PNG 均为 1024×1536，Photo Distill EFFECT 为 1200×1600 自足 SVG。
- 栅格 SOURCE 全部先落盘并原尺寸检查，再作为对应 EFFECT 的唯一编辑输入；Photo Distill SOURCE 与 SVG 也分别检查，SVG 连续生成两次哈希均为 `1c01d4f1d4b9922b42e547db92c976a35303ebf8936937bc2721b2b26ea61709`。
- `/labs/multi-source` 对每个 Skill 恰好渲染 1 个 Revision 11 stress case 和 1 个数字应用预演；产品画布与环境画面复用同一 EFFECT，明确不属于新增效果或实体证明。
- 完整构建与回归为 19／19 通过，lint 通过，`git diff --check` 无内容错误；运行服务已更新到 `http://localhost:4317`，研究索引、Daily／Photo Distill 实验页和代表性 PNG／SVG 均返回 200。
- 本轮遵守 Sites 的非显式浏览器操作边界，未额外执行浏览器截图或点击流程；跨尺寸证据来自响应式 CSS、SSR 结构与自动回归。公开发布仍因生成资产权利 allowlist 未完成而保持 blocked。

## Revision 10：13 个 Skill 的独立原图扩样

- Entry mode: revision-led implementation.
- Request revision: 2026-08-10；用户在完成统一研究入口后要求“继续”，结合上一轮已经明确的方向，本轮不再复用少量来源制造数量感，而是为全部 13 个 Skill 各增加一组独立 SOURCE→EFFECT。
- Target user and context: 希望从更多题材、更多人物／物件／环境和更多真实用途理解每个 Skill 能力边界的研究者。
- Desired first impression: 选择任一 Skill 后，都能看到一张此前未在该批次复用的新输入、一张按该 Skill 规则制作的完整效果，以及它适合和不适合的具体场景。
- Visual ambition: Editorial.
- Experience architecture: Editorial Flow；新增批次接入既有 `/labs/multi-source`，按 Skill 单次展开，保留 SOURCE／EFFECT 沉浸查看与文字结论。
- Visual constraints: 13 张 SOURCE 题材互不重复；人物均为虚构成年人，优先有故事、色彩丰富且与环境匹配的女性角色；SOURCE 与 EFFECT 都展示完整画幅并保留安全边距，不用裁切制造效果。
- Information constraints: 每组必须说明研究问题、处理方法、实际发现、适用场景、为什么适合、不能证明什么和资产来源；生成式概念效果不得冒充上游仓库实际运行结果、客户项目、纪实照片或实体产品。
- Operation constraints: 使用内置图像生成能力创建项目内资产；每个栅格 SOURCE 落盘后先检查完整画幅，再作为唯一编辑输入生成对应 EFFECT；Photo Distill 可以使用更符合其能力边界的确定性 SVG 效果。不得用已有图片改名冒充新实验。
- State constraints: 新批次固定为 13 组、每个 Skill 恰好 1 组；实验室同时公开总效果对数量与不同来源路径数量，避免再次夸大样本独立性。
- Environment constraints: canonical runtime `http://localhost:4317`；保留 Vinext／React 架构，不新增后端和依赖；素材权利未清前继续只做本地研究站。
- Primary journey: 打开多原图实验室 → 选择一个 Skill → 查看新的完整独立 SOURCE → 查看完整 EFFECT → 阅读成立／部分成立结论 → 判断实际用途和生产下一步 → 返回单 Skill 深度页。
- User-defined phases: 为每个 Skill 扩大独立输入；生成对应效果；连接能力、使用场景与真实生产边界；沉淀到统一网页与文档入口。
- Required artifacts: 13 张独立 SOURCE、13 张对应 EFFECT、Revision 10 结构化实验数据、实验室第五批次统计与说明、资产账本、自动资源／计数／完整画幅回归。
- Autonomy authorization: 用户明确要求“继续”，且上一轮已确认下一步是为全部 Skill 扩大不同原图测试；本轮均为现有本地研究站内可逆改动。
- User-decision boundary: 不使用真实客户或可识别真人素材，不安装或执行许可边界不清的上游 Skill，不宣称实体印刷／现场投放，不公开部署。
- Observable completion criteria: 13／13 Skill 各新增 1 个唯一 SOURCE 路径与 1 个唯一 EFFECT 路径；每个项目资产可读取并经完整画幅检查；实验室统计由 88 组／18 来源提升为 101 组／31 来源；13 个新案例均有方法、结论、用途和边界；build、test、lint 与资产检查通过。

### Revision 10 coverage

| User phase | Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 独立输入扩样 | 13 个 Skill 各一张不复用的新 SOURCE | generated assets | 13 个唯一来源路径、完整画幅、题材矩阵 | 3 | pass | — |
| Skill 效果 | 每张 SOURCE 形成对应完整 EFFECT | generated assets | 13 个唯一效果路径、完整画幅、Skill-specific 处理 | 3 | pass | — |
| 能力解释 | 每组回答做了什么、证明与不证明什么 | experiment data | 13 组结构化结论和来源披露 | 3 | pass | — |
| 实际用途 | 每组给出适合场景与生产下一步 | multi-source lab | 场景、fit、boundary 可见 | 3 | pass | — |
| 真实计数 | 区分效果数与独立来源数 | stats / selector | 101 配对、31 来源、每 Skill +1 | 4 | pass | — |
| Adjacent routes | 不回归研究索引、13 Skill、查看器 | existing routes | build／route／contain／count checks | 7 | pass | — |
| Delivery | 文档、资产和页面口径一致 | tests / docs | test、lint、资产账本 | 9 | pass | — |
| Publishing | 公开发布研究资产 | hosted site | 权利清单与发布 allowlist | 9 | blocked | 继续保持本地研究站 |

### Revision 10 final evidence

- 13／13 个 Skill 均新增一组独立 SOURCE→EFFECT；13 个 SOURCE 路径与 13 个 EFFECT 路径各自唯一，实验数据对缺失、重复路径和错误 Skill 映射 fail-close。最终 26 个资产路径均可解码：25 个 PNG 为 1024×1536，Photo Distill SVG 为 1200×1600。
- 12 组栅格 EFFECT 以各自 SOURCE 作为唯一编辑输入生成；Photo Distill 使用不含照片像素、外部引用和文字的 clean-room 自足 SVG。所有栅格资产均从项目目标路径以原始尺寸检查，人物、主要物件和画面四边完整。
- 新题材覆盖多人协作、人物近景、全身动作、旅行地貌、科学场景、静物、记忆叙事、建筑空间、海事、演奏、盐田关系和双面产品；每组都公开方法、实际发现、适用场景、Skill fit、不能证明的事项和本地概念研究披露。
- `/labs/multi-source` 现在按 Skill 一次展开一组证据集合，并把 Revision 10 独立输入放在最前；总口径由 88 组／18 来源提升为 101 组图片配对／31 个来源路径，另有 2 个文字驱动静态效果与 2 个实时交互，形成 103 个静态／105 个总效果证据。
- `/research`、全局五入口导航、13 个详情页、统一横评、Revision 7 报告与 17 份核心研究文档保持关联；`REVISION10-INDEPENDENT-SOURCES.md` 保存题材矩阵、资产路径、方法和生产边界。
- `npm test` 完成 Vinext 五阶段生产构建并通过 18／18 回归；资源存在性、13 路由、101／31 计数、每 Skill 恰好一个独立批次、沉浸查看器和全站 `contain` 全画幅规则均通过。`npm run lint` 与 `git diff --check` 通过。
- 公开发布仍被逐项权利清单和发布 allowlist 阻断；`public/generated/` 继续作为本地研究资产，不把生成式概念效果表述为上游官方输出、真实客户项目或实体成品。

## Revision 9：建立统一研究入口与多原图批量实验室

- Entry mode: revision-led implementation.
- Request revision: 2026-08-10；用户要求整理并关联现有网页与 Markdown，提供一个索引式入口；同时希望把过去每个 Skill 使用不同原图测试的工作集中成一个以数量和题材多样性帮助理解能力的新网页。
- Target user and context: 需要在“项目文档、研究报告、单 Skill 页面、横向对照与大量 SOURCE→EFFECT 实验”之间快速定位证据的研究者。
- Desired first impression: 先看到一张清楚的研究地图，再进入一页可按 Skill 阅读的大规模真实配对实验，而不是继续在长页面和不同 Markdown 中寻找入口。
- Visual ambition: Editorial.
- Experience architecture: Editorial Flow；研究总索引负责导航关系，多原图实验室负责批量浏览，单 Skill 页面继续负责深度解释。
- Visual constraints: 沿用纸张、边框、编号与 `contain` 全图规则；批量页优先信息密度和完整画幅，不把 88 组图片对照同时做成超长大图；不增加装饰性图片。
- Information constraints: 网页与 Markdown 必须标明各自职责、上下游关系与推荐阅读顺序；批量实验只收录真实存在的 image SOURCE→image EFFECT 配对，文本输入、交互效果和无来源结果不得冒充图片配对。
- Operation constraints: 不重新生成图片凑数量；聚合 Revision 3–7 已存在的成对证据并建立可扩展适配器；不新增后端、数据库或运行依赖。
- State constraints: 批量页至少展示 13 个 Skill 的覆盖数量、来源多样性、实验批次、用途与边界；每个实验可回到对应单 Skill 深度页面；Photo Distill 的交互实验在索引中说明但不冒充静态图片配对。
- Environment constraints: canonical runtime `http://localhost:4317`；现有 Vinext/React 架构与 `.openai/hosting.json` 保持不变；素材权利未清前继续只做本地研究站。
- Primary journey: 进入研究总索引 → 理解网页与文档的关系 → 打开多原图实验室 → 选择一个 Skill → 浏览多组完整 SOURCE/EFFECT 与适用场景 → 回到单 Skill 页面阅读方法和边界。
- User-defined phases: 整理已有网页和 Markdown；建立索引式入口与关联介绍；新建多原图批量测试页面；用不同题材与对应效果帮助理解能力和场景。
- Required artifacts: `/research` 研究总索引、统一研究目录数据、`/labs/multi-source` 批量实验室、静态图片配对适配器、导航与首页入口、Markdown 交叉链接、自动回归与运行记录。
- Autonomy authorization: 用户明确要求“进行整理并关联”并授权在有精力时新建批量实验页面；这些均为现有站点内可逆的信息架构改动。
- User-decision boundary: 本轮不执行 13 个上游 Skill、不新增第三方图片、不生成新研究资产、不公开部署；后续真正扩大图片样本库时按单批次另行记录生成和授权。
- Observable completion criteria: `/research` 能索引所有核心网页、15 份子项目 Markdown 与根仓库目录 README；批量页只依据真实成对数据，覆盖 13 个 Skill，并同时公开 88 组图片配对与 18 个图片来源路径的真实口径；所有图片保持完整 `contain`；网页、Markdown、导航和测试口径一致；build、lint、路由与资源检查通过。

### Revision 9 runnable baseline

- 2026-08-10，`/`、`/reports/revision-7` 与 `/skills/pixel-style-poster` 均返回 200；站点已有目录、统一原图横评、单 Skill 页与 Revision 7 报告，但没有集中解释这些网页和 14 份 Markdown 各自职责的入口。
- 现有数据已经包含跨题材探索、计划实验和 Photo Relic 受控配对；它们分散在三个数据边界与 13 个详情页中，尚无按“真实 image SOURCE→image EFFECT”统一聚合的批量页面。

### Revision 9 coverage

| User phase | Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 网页与文档整理 | 解释各入口职责与推荐阅读顺序 | `/research` | 网页目录、文档目录、关系流程、关联链接 | 3 | pass | — |
| Markdown 关联 | 核心文档能返回研究入口并互相定位 | README / research docs | 标准“关联入口”与职责说明 | 3 | pass | — |
| 多原图批量实验 | 聚合真实 image→image 配对 | `/labs/multi-source` | 13 Skill、88 配对／18 来源路径、逐项 SOURCE/EFFECT/场景/边界 | 3 | pass | — |
| 可扩展性 | 后续新增批次不重写页面 | data adapter | baseline / delivered / controlled / capability 四类统一模型 | 4 | pass | — |
| 导航与发现 | 首页和全站头部可进入两个新入口 | shared navigation | 5 个稳定入口、窄屏两列布局、唯一当前项 | 4 / 7 | pass | — |
| Adjacent routes | 不回归 13 Skill、横评、报告和查看器 | existing routes | 路由、图片 contain、计数、键盘语义 | 7 | pass | — |
| Delivery | 文档、数据、页面和统计一致 | tests / runtime | build、lint、route/resource/content checks | 9 | pass | — |
| Publishing | 公开发布研究资产 | hosted site | 权利清单与发布 allowlist | 9 | blocked | 继续保持本地研究站 |

### Revision 9 final evidence

- 新增文字优先的 `/research`：6 类核心网页入口、13 个 Skill 关联项，以及 15 份子项目 Markdown 与根仓库 README 共 16 个文档条目均可从同一页定位；每个 Skill 可继续进入详情、同源横评、多原图证据、结论和上游仓库。
- 新增 `/labs/multi-source` 与统一适配器：37 组统一湖岸基线、20 组图片计划交付、4 组 Photo Relic 受控配对、27 组跨题材探索，共 88 组图片 SOURCE → 图片 EFFECT；另明确披露 2 个文字驱动静态效果与 2 个实时交互，形成 90 个静态／92 个总效果证据。
- 页面同时显示 88 组效果对与 18 个图片来源路径，避免把重复使用的湖岸、相机店、花艺师等输入冒充 88 张独立原图；一次只展开一个 Skill，13 个 Skill 的配对数与来源数均有独立回归。
- 全局导航现在固定为“首页／研究总索引／统一原图横评／多原图实验室／R7 报告”，每页只有一个当前项；窄屏导航使用两列并保持 44px 点击目标。
- 新增 `RESEARCH-INDEX.md` 作为离线文档镜像；项目、实验室、运行手册、来源、技术地图、研究记录、结果报告与资产账本均补充返回入口。15 份一方子项目 Markdown 的相对链接检查通过。
- `npm test` 完成 Vinext 五阶段生产构建并通过 17／17 回归；`npm run lint` 通过；最终 4317 运行进程中首页、两个新入口、横评、报告与代表性详情页均返回 200。
- 本轮没有生成新图片或把产品数字预演表述为实物。按站点构建约束未新增浏览器截图／点击式 QA；视觉完整性由既有 `contain` 契约、HTML/CSS 回归与实际 HTTP 路由检查覆盖。公开发布仍受生成资产权利清单与发布 allowlist 阻断。

## Revision 8：把“新增了什么”讲清楚并形成正式研究报告

- Entry mode: revision-led implementation.
- Request revision: 2026-08-10；用户指出 Revision 7 虽然新增了大量素材，但页面没有清楚回答“这是什么意思、具体做了什么”，并要求形成可持续维护的文档沉淀。
- Target user and context: 正在单个 Skill 页面阅读效果、但不应先理解内部版本编号或实现结构的研究者。
- Desired first impression: 进入“跨题材能力探索”后，先用一屏说明看懂研究动作，再从每组案例直接得到“做了什么、结果如何、证明什么、不证明什么”。
- Visual ambition: Editorial.
- Experience architecture: Editorial Flow；沿用现有长篇研究页，在跨题材章节补充解释层和明确结论，不改变图片证据与后续产品展示顺序。
- Visual constraints: 保持现有纸张、边框与编号语言；解释层必须比图片更短、更易扫描；不新增装饰性图片，不改变所有图片 `contain` 规则。
- Information constraints: 明确区分“新增输入／效果资产”“本地概念研究”“上游官方运行”“产品数字预演”；每个 Revision 7 案例必须有结论状态、实际动作、能力结论和限制。
- Operation constraints: 不重新生成图片，不重做既有产品外壳；复用 Revision 7 数据形成页面说明与报告；保留 13 个 Skill 页面及现有路由。
- State constraints: Photo Distill 的 3 组既有探索继续保留；Revision 8 明确说明本轮 24 组只覆盖其余 12 页。GC 与 Pixel 的五人输入／四人结果继续显示为部分成立，不得弱化。
- Environment constraints: canonical runtime 为 `http://localhost:4317`；本地研究站，不公开部署未完成权利复核的资产。
- Primary journey: 进入 Skill 页 → 阅读“本轮到底做了什么” → 查看 SOURCE／EFFECT → 阅读明确结论与边界 → 进入完整 Revision 7 报告查看 12 个 Skill 汇总。
- User-defined phases: 解释具体工作；改进页面描述；形成文档沉淀。
- Required artifacts: 跨题材章节方法说明、24 个案例的结构化结论、可浏览的 Revision 7 报告页、Markdown 研究报告、README／测试更新。
- Autonomy authorization: 用户要求“请做好描述，并且应该有文档沉淀”，授权在现有页面与文档范围内直接完善。
- User-decision boundary: 不新增第三方素材、不执行真实 Skill 安装、不做实体印刷或公开部署。
- Observable completion criteria: 12 个 Revision 7 页面均显示两组明确结论；Pixel 两组分别显示“部分成立”与“成立”；报告页汇总 12 个 Skill、24 个新效果和方法边界；Markdown 报告可独立阅读；构建、lint、路由和资源回归通过。

### Revision 8 runnable baseline

- 2026-08-10，`http://localhost:4317/skills/pixel-style-poster#capability-explorations` 返回 200，页面已有 SOURCE／EFFECT、保留／删除、产品方向和处理步骤。
- 当前缺口：章节只用一段抽象文字解释“跨题材”，没有说明 Revision 7 的具体工作量与方法；单卡只有研究问题，没有独立的结论状态和“不证明什么”；完整信息分散在 `README.md`、`REFINEMENT.md` 与 `REVISION7-ASSETS.md`，缺少人类可读的研究报告入口。

### Revision 8 coverage

| User phase | Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 解释具体工作 | 在章节开头说明范围、方法和证据组成 | Capability exploration heading | 7 来源／24 实验口径、四步方法、三种证据与报告入口 | 3 | pass | — |
| 改进案例描述 | 每组明确“做了什么、结论、证明／不证明” | 24 Revision 7 cards | 24／24 conclusion；19 成立、5 部分成立；Photo Distill 3 组同步采用结论结构 | 3 | pass | — |
| 文档沉淀 | 形成可独立阅读的研究报告 | Markdown + web report route | `REVISION7-RESEARCH.md` 与 `/reports/revision-7`，12 Skill／24 案例可追溯 | 3 | pass | — |
| Adjacent routes | 不回归 Photo Distill、既有产品展示和图片查看器 | 13 Skill pages | 12 页各 2 组、Photo Distill 3 组；完整回归 13／13 通过 | 7 | pass | — |
| Delivery | 文档、代码和运行结果一致 | tests / README / runtime | production build、13／13 tests、lint、首页／Pixel／报告路由均 200 | 9 | pass | — |
| Publishing | 公开发布研究图 | hosted site | 权利清单与发布 allowlist | 9 | blocked | 继续保持本地研究站 |

### Revision 8 final evidence

- 共享跨题材章节现在先说明“这部分到底是什么意思”，明确 7 张来源复用为 24 个 Skill-specific 问题；SOURCE、EFFECT 和 PRODUCT PREVIEW 三层证据不再混称。
- 24 个 Revision 7 案例与 3 个 Photo Distill 既有案例都显示具体动作、文字状态、实际发现，以及“证明／未证明／生产下一步”。GC 与 Pixel 的五人变四人继续公开为部分成立。
- 新增文字型 `/reports/revision-7` 路由：12 个 Skill、24 个案例、19 个成立与 5 个部分成立均可从总览追溯回图片页；人类可读报告保存在 `REVISION7-RESEARCH.md`。
- Vinext 五阶段 production build 通过，13／13 自动回归通过，ESLint 通过；`http://localhost:4317/`、Pixel 详情页与报告页均返回 200。
- 本轮没有重新生成图片，也没有把 HTML/CSS 数字预演升级表述为真实产品。没有执行新的交互式多视口视觉测试；公开发布仍受资产权利清单和 allowlist 阻断。

## Revision 7：复用七个来源扩展逐 Skill 能力问题

- Entry mode: revision-led implementation.
- Request revision: 2026-08-10；用户确认此前只有 Photo Distill 真正新增跨题材效果，本轮要把相同研究深度扩展到其余 12 个 Skill。
- Target user and context: 希望通过多个完整输入与完整效果理解每个 Skill 的迁移能力、适用题材、产品方向和处理方法的研究者。
- Desired first impression: 进入任一 Skill 页面，都能直接看到它在不同人物、群体、城市、建筑、景观或物件上的能力差异，而不是旧图片换一层产品外壳。
- Visual ambition: Editorial.
- Experience architecture: Editorial Flow；沿用现有“能力 → SOURCE / EFFECT → 保留与删除 → 产品方向 → 处理步骤”的长篇研究结构。
- Visual constraints: 每组 SOURCE 与 EFFECT 均完整 `contain`；同一页面的两组新增题材必须明显不同；人物只使用虚构成年人，并优先选择有故事、色彩丰富且与环境关系清晰的场景。
- Information constraints: 每组必须回答一个新的能力问题，列出实际保留、主动删除、三个产品方向和三步处理方式；必须标明本地研究效果，不冒充上游官方输出。
- Operation constraints: 12 个页面各新增 2 组，共 24 组；复用 7 张已存在的合成 SOURCE，效果必须是本轮新生成或新构建的资产，不用旧效果重命名；不生成独立产品 mockup 图片，只以复用同一 EFFECT 的轻量 HTML/CSS 语境说明可能的产品用途。
- State constraints: 新组接入现有 `CapabilityExplorationSection`；页面原有 Demo、交付实验、产品应用和未来问题保持不变。
- Environment constraints: canonical runtime 为 `http://localhost:4317`；现有 Vinext / React 结构保持不变；生成资产在权利分区完成前继续只用于本地研究站。
- Primary journey: 选择一个 Skill → 阅读两个新能力问题 → 对照完整 SOURCE 与完整 EFFECT → 理解保留／删除 → 判断适用产品与处理方法。
- User-defined phases: 从 Pixel 开始；逐个覆盖其余 11 页；每页增加不同题材；同时说明真实使用方向。
- Required artifacts: 24 张本轮新效果资产、24 组跨题材探索数据、12 个页面各 2 组可见探索、更新后的研究与运行记录。
- Autonomy authorization: 用户明确回复“确定”，授权按上一轮提出的 12 页逐页补齐方向继续执行。
- User-decision boundary: 真实客户素材、实体印刷、现场展陈、公开发布和无正式许可上游的代码／资产复制仍不在本轮授权内。
- Observable completion criteria: 除 Photo Distill 外 12／12 页面各出现 2 个新增 `data-capability-exploration`；24 个 effect 路径均为本轮新资产且可读取；所有 SOURCE／EFFECT 完整显示；页面原有 26 个产品场景与查看器不回归；构建、lint 与最小回归通过。

### Revision 7 runnable baseline

- 2026-08-10，本地 production server 继续运行于 `http://localhost:4317`；Pixel 页面可访问，但本轮开始前没有 `CapabilityExplorationSection`，真正的跨题材能力探索仅存在于 Photo Distill 的三组。
- 既有 12 个目标页面都已有五项本地效果和两个产品应用；这些旧证据保留，但不计入本轮“新题材素材”数量。

### Revision 7 coverage

| User phase | Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 从 Pixel 开始 | 新增多人层级与物件材料两种题材 | Pixel detail page | 2 个新 SOURCE→EFFECT 与完整研究说明 | 3 | pass | 五人输入被重构成四人的局限已明确公开 |
| 编辑／提示编译路线 | Daily、GC、Photo Revival 各新增两种题材 | 3 detail routes | 6 个新效果与 6 组研究说明 | 3 | pass | — |
| 抽象／重绘路线 | DYY、Scenes、Scene Distillation、Photo Relic 各新增两种题材 | 4 detail routes | 8 个新效果与 8 组研究说明 | 3 | pass | — |
| 保真／混合路线 | Travel、Poetic、Photo Abstract、Postcard 各新增两种题材 | 4 detail routes | 8 个新效果与 8 组研究说明 | 3 | pass | 像素保真与实体打印仍按页面边界保留 |
| 全站接入 | 12 页各出现 2 组跨题材探索 | 12 detail routes | 24 个 article、48 个完整 SOURCE／EFFECT figure | 3 | pass | — |
| Cross-surface | 保持完整画幅和现有响应式结构 | shared section / viewer | `contain`、无 `cover`、移动断点和沉浸入口不回归 | 7 | partial | 静态规则与构建回归通过；本轮未另做交互式多视口视觉检查 |
| Delivery | 页面、资源和文档可复现 | build / tests / lint / README | 24 路径存在、构建与回归通过 | 9 | pass | — |
| Publishing | 公开发布新增研究图 | hosted site | 逐项权利清单和发布 allowlist | 9 | blocked | 权利分区完成后另行授权部署 |

### Revision 7 runtime evidence

- 24／24 个新 effect 路径存在、均可解码为 `1024 × 1536` PNG；最终路径、来源和提示摘要见 [REVISION7-ASSETS.md](REVISION7-ASSETS.md)。
- 本地 production server 的 13／13 个 Skill 路由返回 200。除 Photo Distill 保留 3 组代码原生探索外，其余 12 页各渲染 2 个 `data-capability-exploration` 和 2 个效果到产品应用预演。
- 逐页汇总得到 175 个唯一 `/generated/` 资源引用，HEAD 检查 175／175 返回 200；24 个新增效果没有断图。
- `npm test` 完成 Vinext 五阶段构建并通过 12／12 项回归；`npm run lint` 与 `git diff --check` 通过。
- 全站现在合计 90 张完整静态效果与 2 个实时效果，即 92 项本地效果证据；其中 27 张属于跨题材能力探索。
- 本轮没有用截图冒充真实应用，也没有执行公开部署。产品环境均标注为数字预演；发布仍受资产权利分区与 allowlist 阻断。

## Revision 6：从“效果证据”转向单 Skill 产品化探索

- Entry mode: revision-led implementation.
- Request revision: 2026-08-09；用户明确指出不应继续陷入验证细节，而应以每个 Skill 为独立研究对象，增加多角度素材，并展示生成效果如何进入真实产品与使用环境。
- Target user and context: 希望逐个理解 13 个 Skill 的能力差异、适用任务、产品形态与实际处理方法的研究者。
- Desired first impression: 每个页面像一间围绕该 Skill 展开的视觉研究工作室，而不是一份以 PASS、哈希和契约为主的检查报告。
- Visual ambition: Editorial + Product-oriented.
- Experience architecture: 保留现有 Editorial Flow、完整图片与沉浸查看器；在单 Skill 页面增加“能力角度 → 产品成品 → 真实环境 → 处理流程”的可视化段落。
- Visual constraints: 原始效果始终完整 `contain` 展示；产品版面和环境预览不得替代或裁掉原效果；不同 Skill 使用与其能力匹配的产品形态，不套同一个装饰模板。
- Information constraints: 每个产品应用必须回答真实任务、目标用户、为什么适合该 Skill、成品由什么组成、如何从效果处理到交付，以及哪些部分仍需人工或外部生产。
- Operation constraints: 优先复用已有 5 项本地效果形成更完整的产品链路；只有能力角度确实缺失时再生成新素材。自动检查只保留防止断图、裁切和页面回归的最小集合，不再扩张为研究主线。
- State constraints: 每个产品应用同时包含完整效果、完整产品版面、环境预览和处理步骤；实体印刷、真实广告投放或跨浏览器结论不得用数字预览冒充。
- Environment constraints: 现有 Vinext / React 本地研究站，canonical runtime 为 `http://localhost:4317`；权利分区完成前不公开发布研究资产。
- Primary journey: 选择一个 Skill → 浏览不同能力角度 → 选择一个效果 → 看它被组装成真实产品 → 看产品进入环境后的完整预览 → 理解处理流程与交付边界。
- User-defined phases: 以单个 Skill 深挖；增加更多素材；从不同角度展示能力；扩展真实产品用途；说明如何处理与落地。
- Required artifacts: 13 个页面各 2 个贴合自身能力的产品应用场景；每个场景包含效果、产品成品、使用环境与处理流程；先完成可复用展示结构和 Photo Distill 深度样板，再扩展到其余页面。
- Autonomy authorization: 用户已明确给出新的内容方向并要求继续按该方向补充。
- User-decision boundary: 真实印刷、实地投放、真实客户素材和公开部署仍需要外部生产条件、授权或发布权利清单。
- Observable completion criteria: 每个页面至少出现 2 个非重复的产品化应用；完整效果与产品成品都可直接查看；处理步骤与边界清楚；桌面和手机无裁切或横向溢出；现有页面、查看器、构建与最小回归检查保持可用。

### Revision 6 baseline

- 2026-08-09，`http://localhost:4317/skills/photo-distill`，1280×720：页面已有 5 项本地效果、3 张文字为主的应用卡和 2 个交付实验，但没有“产品成品 + 真实环境”可视化，`[data-product-scene]` 数量为 0；页面总高度约 16,327px，横向溢出为 0。
- 当前 13 页已经解决“是否有能力证据”，本轮不再以把 5 增加到 6 为唯一目标，而是把已有结果组织为可理解、可选择、可落地的产品链路，并仅针对真正缺失的能力角度追加新素材。

### Revision 6 coverage

| User phase | Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 单 Skill 深挖 | 为 13 个 Skill 选择各自不同的产品方向 | content matrix | 26 个场景与现有效果路径、任务、流程和边界 | 3 | pass | — |
| 产品化展示 | 同时看到效果、成品和环境 | shared product studio | 完整效果、产品版面、环境预览、处理流程 | 3 | pass | — |
| 深度样板 | Photo Distill 从代码图形进入真实产品 | `/skills/photo-distill` | 2 个完整产品场景 + 3 个跨题材能力探索 | 3 | pass | — |
| 全站扩展 | 每页 2 个非重复产品场景 | 13 Skill routes | 26 个完整场景，产品类型与 Skill 能力匹配 | 3 | pass | — |
| 多样素材 | 只为未覆盖能力角度新增素材 | Photo Distill cross-subject studies | 人物、复杂城市、四季系列三组完整 SOURCE → EFFECT | 3 | pass | 后续按单个 Skill 的新能力问题继续追加，不做同图变体凑数 |
| Cross-surface | 桌面、手机和查看器保持完整 | responsive CSS + full-frame viewer | 共享组件保留 `contain`、桌面／平板／手机断点与沉浸入口 | 7 | partial | 本轮未主动执行交互式屏幕测试；用户需要时再做指定页面视觉复核 |
| Delivery | 页面可运行且最小回归通过 | build / tests / lint | 构建、相关测试、lint | 9 | pass | — |
| Publishing | 公开发布研究资产 | hosted site | 权利清单与发布 allowlist | 9 | blocked | 完成逐项权利分区后再部署 |

### Revision 6 runtime evidence

- production build 与 ESLint 通过，12／12 自动回归通过；测试继续限制全站不得使用 `cover`，并确认 13 个页面均有 2 个产品应用和 8 个处理步骤。
- 本地 production server 上 13／13 个 Skill 路由返回 200；逐页实际 HTML 均包含 2 个 `data-product-scene` 与 8 个 `data-process-step`，Photo Distill 另外包含 3 个 `data-capability-exploration`。
- 26 个案例现有 26 个不同的 `data-product-presentation`；每个案例按照自身交付物显示 3–8 个产品表面，区分八折册、三封面套组、声音展入口、互动墙、四季档案墙、包装系统、票务系统和明信片产品，而不是只按八个大类复用同一外壳。
- 从 13 个运行页面收集到的 151 个唯一 `/generated/` 资源全部返回 200，没有断图路径。
- 产品环境是 HTML／CSS 数字预演，明确不冒充实体印刷、真实户外投放、客户项目或已经部署的交互装置；公开托管仍因素材权利分区未完成而保持 blocked。

## Revision 5：把九个四项页面补齐到五项

- Entry mode: revision-led implementation.
- Request revision: 2026-08-09；用户再次要求“继续补充”，沿用“完整输入 → 完整效果 → 使用场景 → 验收与边界”的研究标准，不以重复装饰图凑数。
- Target user and context: 希望横向比较 13 个 Skill、同时能深入理解每个 Skill 第二种能力轴的研究者。
- Desired first impression: 13 个页面不再有明显的本地证据数量落差；新增内容能说明“为什么用、如何验收、还能往哪里扩展”。
- Visual ambition: Editorial + Evidence-led + Immersive.
- Experience architecture: 继续使用现有长篇 Editorial Flow 与全站沉浸式图片查看器；不重构已经通过验收的页面骨架。
- Visual constraints: 新 SOURCE / EFFECT 全量显示；页面继续禁止 `cover` 裁切；人物输入只使用虚构成年人并保留动作、环境与故事关系；多图套系必须让每个成员完整可见。
- Information constraints: 每项仍需保存原计划原文、实验问题、来源事实、方法、逐项验收、完整八字段应用场景和来源披露；复用输入时必须说明它隔离了哪个变量。
- Operation constraints: ImageGen 只用于确实需要的新摄影或手绘资产；可由代码准确表达的对照板使用 clean-room SVG/Canvas；不得用数字 mockup 冒充物理打印，不得用单一 Chromium 冒充跨浏览器完成。
- State constraints: Daily、DYY、Travel、Scenes、Scene Distillation、GC 与 Photo Revival 的第二计划完成后从队列移除；Postcard 的“三张旅行套系”完成但“真实印刷校样”继续开放；Photo Distill 的 Chromium 基线标记 `partial`，跨浏览器计划继续开放。
- Environment constraints: 现有 Vinext / React 本地研究站，canonical runtime 为 `http://localhost:4317`；生成及上游资产在发布权利分区完成前继续保持本地，不进行公开托管。
- Primary journey: 进入任一欠覆盖页面 → 阅读原第二计划 → 检查完整 SOURCE / EFFECT 或实时效果 → 阅读方法与验收 → 理解完整应用场景 → 判断计划是否完成或仍开放。
- User-defined phases: 继续补充；内容全面；多样化演示；完整展示能力、作用、使用场景和扩展方向。
- Required artifacts: 9 个新 delivered experiment；Daily 低饱和对照、DYY 动作极简、Travel 夜景平衡、Scenes 四季套系、Scene Distillation 空雪场、GC 同题三变体、Photo Revival 单一静物、Photo Distill 渲染指纹基线、Postcard 三站套系；同步页面状态、测试、浏览器证据和文档。
- Autonomy authorization: 用户明确说“继续补充”。
- User-decision boundary: 真实明信片打样需要打印、裁切和扫描／拍摄设备；完整跨浏览器结论需要可受控的独立渲染引擎；公开部署需要逐项资产权利清单与发布 allowlist。
- Observable completion criteria: 13/13 页面均至少 5 项本地效果；新增多图套系每个成员完整可见；本轮九页中仅 Postcard 物理打样与 Photo Distill 跨浏览器仍显示开放；全站另外保留 Pixel、Poetic、Photo Abstract 的各 1 项和 Photo Relic 的 3 项未来研究；桌面与手机无横向溢出；沉浸查看器可打开新静态效果；构建、测试、lint 与最终真实性审查通过。

### Revision 5 baseline

- 2026-08-09，`http://localhost:4317/skills/daily-photo-playground#delivered-experiments`：1 个 delivered experiment、1 个未来计划“低饱和雨景”、无 `OPEN AFTER PARTIAL`、横向溢出为 0。
- 全站基线为 56 项本地效果证据：55 张图 + 1 个 Photo Distill 交互实验。Daily、DYY、Travel、Scenes、Scene Distillation、GC、Photo Revival、Photo Distill、Postcard 各 4 项；Pixel、Photo Relic、Poetic、Photo Abstract 各 5 项。

### Revision 5 coverage

| User phase | Requirement | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 继续补充 | 低饱和输入仍能建立编辑色场 | Daily second plan | 完整低饱和 SOURCE、完整效果、来源色角色与人物证据窗 | 7 | pass | — |
| 继续补充 | 单人动作压缩为最少 mark | DYY second plan | 完整动作 SOURCE、无字零照片像素 SVG、mark 对应 | 7 | pass | — |
| 继续补充 | 暗照片与浅面板的平衡 | Travel second plan | 原图字节锁定、三档亮度对照、完整照片四边 | 7 | pass | — |
| 继续补充 | 四季同地点形成系列 | Scenes second plan | 四季完整画面、固定结构与单一连接色 | 7 | pass | — |
| 继续补充 | 极少信息形成中心张力 | Scene Distillation second plan | 完整雪原输入、三角色抽象、大片空白 | 7 | pass | — |
| 继续补充 | 同主题只改变版式轴 | GC second plan | 同一文本、三张完整变体、等 mark / 色板预算 | 7 | pass | — |
| 继续补充 | 单一静物只选择两处记忆细节 | Photo Revival second plan | 完整静物 SOURCE、手绘效果、两处细节与大留白 | 7 | pass | — |
| 继续补充 | 建立跨浏览器比较基线 | Photo Distill second plan | 当前引擎真实 hash / 像素指标、明确 unavailable 与 partial | 6 | partial | 在真实 Firefox 与 WebKit 中复跑相同 fixture |
| 继续补充 | 三张旅行卡形成产品家族 | Postcard second plan | 三个完整来源、六个完整产品表面、确定性背面系统 | 7 | pass | — |
| Cross-surface | 全图、查看器与窄屏保持可用 | 9 pages / desktop + mobile | DOM、computed layout、viewer interaction | 7 | pass | — |
| Delivery | 65 项效果证据与文档一致 | data / tests / docs | build、tests、lint、终审 | 9 | pass | — |
| Publishing | 研究资产公开发布 | Hosted site | 权利清单与发布 allowlist | 9 | blocked | 完成逐项权利分区后再部署 |

### Revision 5 browser evidence

- 1280×720 实际浏览器逐页检查了 9 个新增实验页：每页均有 2 个 delivered experiment、总计 5 项本地效果，已完成的第二计划从队列移除；Photo Distill 保留“跨浏览器渲染”，Postcard 保留“真实印刷校样”，其余 7 页没有旧计划残留。9 页横向溢出均为 0。
- 所有新增静态 SOURCE / EFFECT 在滚动触发惰性加载后均可解码，computed `object-fit` 只有 `contain`，页面渲染比例与文件自然比例一致。四季输入／效果为 1024×1536 与 2200×1800，雪原为 1024×1536 与 1400×1900，三站明信片为 2400×1500 与 2400×2600，均完整显示。
- 430×900 复核 Daily、Scenes、Photo Distill 与 Postcard：Daily 两图分别为 345×460、345×453；四季两图为 345×518、345×282；明信片两图为 345×216、345×374；四页都单列且横向溢出为 0。
- 当前 Chrome / Chromium 会话的引擎基线为 SVG SHA-256 `07d5d7066de57584`、像素 SHA-256 `d1018f0d05b74f15`、4.10%（4,918／120,000 px）着墨率。Firefox／Gecko 与 Safari／WebKit 显示 `UNAVAILABLE · 本会话未运行`，因此该计划保持 `partial`。
- 在 430px 下打开 2400×2600 明信片套系效果，沉浸查看器以 410×444、`contain` 显示；ArrowLeft 切换到 2400×1500 来源板，Escape 关闭后恢复滚动并把焦点还给原触发按钮。临时视口已经恢复到 1280×720。
- Revision 5 生成器可重建 9 个 SVG，并在写出前校验 XML、尺寸／viewBox、0 外部图片引用、0 `slice`、来源字节、mark／角色／成员／正反面数量；9/9 输出通过。
- 最终 Vinext 五阶段 production build 通过，12／12 页面、资产、完整画幅、交互状态与确定性契约测试通过，ESLint 通过；测试会逐页确认 13/13 均为 5 项效果、完整使用场景覆盖和正确开放队列。

## Revision 4：关闭可验证的部分证据缺口

- Entry mode: revision-led implementation.
- Request revision: 2026-08-09，继续补充已经标记为 `OPEN AFTER PARTIAL` 的研究计划，而不是新增无验收标准的装饰图片。
- Target user and context: 需要通过完整原图、完整效果、技术方法、验收结果和真实使用场景理解每个 Skill 的研究者。
- Desired first impression: 页面清楚区分“初次尝试”“补证完成”和“受现实条件限制仍开放”的问题。
- Visual ambition: Editorial + Evidence-led + Immersive.
- Experience architecture: 保持现有长篇研究流；在 Pixel、Photo Distill、Poetic 和 Photo Abstract 页面追加可独立检查的补证实验。
- Visual constraints: 所有新 SOURCE / EFFECT 全量展示并可沉浸查看；人物演示使用虚构成年人、完整叙事环境和丰富但受控的颜色；代码生成对照图不得伪装成上游官方输出。
- Information constraints: 保留原计划文字和第一次部分实验；补证实验必须说明它具体关闭了哪一条验收缺口，并提供完整使用场景与边界。
- Operation constraints: Photo Distill 的着墨率必须来自浏览器实际栅格像素采样；Poetic 的照片保真必须能由嵌入源图字节验证；Photo Abstract 必须使用同一输入与等量 mark budget；实体印刷不得用生成 mockup 冒充。
- State constraints: Pixel、Photo Distill、Poetic、Photo Abstract 从 `OPEN AFTER PARTIAL` 转为已回答；Postcard 的实体打印仍保持开放。
- Environment constraints: 现有 Vinext / React 站点，不新增运行依赖；本地生成资产在公开发布权利澄清前继续忽略；当前环境没有实体打印、裁切和扫描能力。
- Primary journey: 进入一个 Skill 页面 → 看第一次部分实验 → 看针对缺口的补证实验或实时测量 → 对照方法与验收 → 阅读完整使用场景 → 判断能力和边界。
- User-defined phases: 继续补充；覆盖更全面；用完整效果说明能力、用途、使用场景和扩展方向。
- Required artifacts: Pixel 真正人物大近景 SOURCE→EFFECT；Photo Distill 实际像素着墨率；Poetic 确定性照片保真合成；Photo Abstract 等预算轮廓/关系对照；状态队列、测试、浏览器证据和文档更新。
- Autonomy authorization: 用户明确要求“继续补充”。
- User-decision boundary: 实体明信片打印需要真实打印设备与扫描/拍摄证据；公开部署需要上游与生成资产发布权利明确。
- Observable completion criteria: 四个可在浏览器内验证的问题不再显示 `OPEN AFTER PARTIAL`；Postcard 仍诚实开放；新图均存在、完整显示并可打开；Photo Distill 三种预设显示实际栅格着墨率且数值随参数变化；桌面/窄屏无横向溢出；构建、测试、lint 和最终只读审查通过。

### Revision 4 baseline

- 记录视口约 960px；四个目标页面均为 1 个 delivered experiment、2 个 future plan，并显示 `OPEN AFTER PARTIAL`。
- Pixel 仍是全身人物而非真正大近景；Photo Distill 只有几何面积公式；Poetic 未证明照片像素保真；Photo Abstract 没有同输入、等预算的轮廓路线对照。
- 四页基线均无横向溢出；本轮保留这一既有通过证据，并在改动后重新检查。

### Revision 4 coverage

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Pixel 补证 | 真正人物大近景与细点阵层级 | Pixel delivered experiments | 独立 SOURCE→EFFECT、完整使用场景、浏览器完整显示 | 3 / 7 | pass | — |
| Photo Distill 补证 | 实际栅格像素着墨率而非几何代理 | Interactive code-native lab | Canvas 像素采样、三预设、状态与阈值说明 | 4 / 6 | pass | — |
| Poetic 补证 | 确定性照片保真与抽象面板共存 | Poetic delivered experiments | 自包含 SVG、源字节校验、完整显示 | 3 / 7 | pass | — |
| Photo Abstract 补证 | 同输入、等 mark budget 的两条路线 | Photo Abstract delivered experiments | 轮廓 vs 关系对照、自定义结构 rubric | 3 / 7 | pass | — |
| Honest boundary | 实体印刷不以 mockup 代替 | Postcard open plan | `OPEN AFTER PARTIAL` 与缺失能力说明 | 6 / 9 | pass | — |
| Cross-surface | 完整图片、无裁剪、无溢出、查看器可用 | Desktop / tablet / mobile / viewer | 实际浏览器观察与交互 | 7 | pass | — |
| Delivery | 文档、资产、build、tests、lint、终审 | Project | 可复现检查结果 | 9 | pass | — |
| Publishing | 公开站点 | Hosted site | 权利明确后的部署 | 9 | blocked | 澄清上游与生成资产发布权利 |

### Revision 4 browser evidence

- Pixel 新增 1024×1536 真正头肩／上胸大近景和同输入 fine-halftone 效果。1280px 页面中两图都以 557×836、`object-fit: contain` 展示；430px 页面中两图都以 345×518 单列完整展示。第一次全身人物尝试仍保留为 `partial`，第二次补证为 `complete`，原计划不再出现在开放队列。
- Photo Distill 会把当前 SVG 序列化为 Blob，并真正绘制到 300×400 离屏 Canvas。当前 Chromium 实测：安全范围 4.14%（4,972／120,000 px，PASS）、超限示例 5.41%（6,494／120,000 px，越过本研究 5% 上限并触发 RASTER INK FAIL）、最小可见锚 3.65%（4,377／120,000 px，PASS）。采样失败会明确显示 `UNAVAILABLE / N/A`，不再永久冒充测量中；820px 与 430px 均单列、无横向溢出。
- Poetic 自包含 SVG 为 1400×3000；照片窗嵌入 PNG 与来源文件 SHA-256 同为 `cc0a4654b48fb8d7da01f48b24f314ae7a4ac8663da5e91fd4864d704cc36c4b`。1280px 与 430px 都完整加载并使用 `contain`，长哈希文字引起的 10px 溢出已用局部 `overflow-wrap` 修复为 0。
- Photo Abstract 自包含 SVG 为 1920×1320；A／B 两条路线各有 8 个主要 mark，嵌入源图与来源 SHA-256 同为 `37ab43d3a5ee11f8b23d0342d1c871768257a0232c12531cc8b694a0785a9a65`。大型 SVG 首次惰性解码需要数秒；加载后桌面为 557×383、手机为 345×237，均完整显示、无裁切和溢出。
- 1280×900 统一检查覆盖 Pixel、Photo Distill、Poetic、Photo Abstract 与 Postcard：前四页只有 1 个新 future plan，不再显示 `OPEN AFTER PARTIAL`；Postcard 保持 1 个 `partial` experiment、2 个 future plan 和明确开放标记。所有已触发加载的 scoped images 均无破图且 computed `object-fit` 只有 `contain`。
- 新 Pixel effect 在沉浸查看器中以正确的 `OUR IMAGE-GENERATED STUDY EFFECT · 02` 语境打开，ArrowLeft 切到对应来源（11／11 → 10／11），Escape 关闭后恢复 document/body 滚动并把焦点送回原触发按钮。临时 1280／820／430 视口均已撤销，验收标签已关闭。
- 最终 Vinext 五阶段 production build 通过，10／10 页面与资产契约测试通过，ESLint 通过，`git diff --check` 无空白错误。确定性测试会解码 Poetic 与 Photo Abstract 自包含 SVG 的 data URI，并把实际 SHA-256 与各自源 PNG 逐字节比较；分享元数据测试还要求正式 origin 可由部署环境注入。

## Revision 3：兑现跨页面“下一轮演示计划”

- Entry mode: revision-led implementation.
- Request revision: 2026-08-09, continue supplementing the full research atlas with independent subjects instead of only shared-source variants.
- Target user and context: a researcher who needs to judge each Skill from a concrete question, a complete source, a complete result, an acceptance record, and a practical use case.
- Desired first impression: every page now contains a real plan experiment, not only a future-plan card; incomplete acceptance remains visibly open.
- Visual ambition: Editorial + Evidence-led + Immersive.
- Experience architecture: long-form study page with a dedicated delivered-plan section; Photo Distill also gains a real code-native parameter lab.
- Visual constraints: all SOURCE and EFFECT files remain uncropped by the page and open in the immersive viewer; any crop inside an effect composition is disclosed; story-rich fictional adults are preferred where people are the relevant test subject.
- Information constraints: each experiment preserves the original plan wording, lists observed source facts, explains its routing method, records pass/qualified outcomes, distinguishes complete from partial plan coverage, and embeds a complete real-use brief.
- Operation constraints: no collapsed evidence, no fake browser/print proof, no implied upstream output, and no fidelity claim when a generated concept does not preserve source pixels.
- State constraints: 11 visual study pages receive one independent SOURCE→EFFECT experiment; Photo Distill receives a functional parameter lab; Photo Relic retains four previously delivered controlled pairs as the depth benchmark.
- Environment constraints: existing Vinext/React site, no new runtime dependency, generated/right-sensitive assets remain local and ignored until publication rights are cleared.
- Primary journey: choose a Skill → inspect upstream capability → inspect common-source baseline → open the delivered-plan source/effect pair → read method and acceptance evidence → understand a complete application scenario → continue into future research directions.
- User-defined phases: continue supplementing; favor broad and detailed understanding; connect every generated effect to its use; show complete effects without crop.
- Required artifacts: independent multi-subject sources, 11 new visual results, a reusable delivered-experiment data boundary and component, one interactive code-native lab, updated future-plan states, tests, browser evidence, and handoff documentation.
- Autonomy authorization: “继续补充”.
- User-decision boundary: public hosting remains blocked until upstream and generated-asset publication rights are explicitly cleared.
- Observable completion criteria: each of the 13 routes has plan-experiment evidence; all new images exist and render with natural ratio; the Photo Distill controls visibly change measured output; fully answered plans leave the queue while partial plans remain `OPEN AFTER PARTIAL`; desktop and narrow layouts have no horizontal overflow; viewer, build, tests, lint, and asset audit pass.

### Revision 3 baseline

- Canonical route: `http://localhost:4317/skills/gc-minimal-zine-poster` at 1280 × 720.
- Before this revision: 6 upstream figures, 3 common-source effects, 3 application cards, 13 immersive figures in total, and `6 upstream · 3 extension` in the hero.
- The page height was 12,597px with no horizontal overflow, but it contained zero delivered-plan experiments; both “纯文本主题” and “同主题三变体” still appeared only as `PLANNED` cards.

### Revision 3 coverage

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Independent subjects | Replace shared-lake-only evidence with a page-specific planned experiment | 11 visual Skill routes | New synthetic SOURCE→EFFECT pairs tied to frozen plan questions | 3 | pass | — |
| Story-rich people | Use fictional adult women with color, action, and environment when people are the relevant stress test | Daily, Pixel, Scenes, Revival, Poetic | Florist, reunion, family-memory, and last-tram narrative inputs | 3 | pass | — |
| Plan delivery | Turn an old planned question into visible evidence without hiding unfinished acceptance | All 13 routes | Seven answered plans, five partial plans retained as open, plus four existing Photo Relic pairs | 3 | pass | — |
| Complete applications | Explain where the new result is used and show the whole result | Delivered experiment cards | Eight-field scenario brief embedded beside evidence | 3 | pass | — |
| Deterministic research | Deliver a real code-native parameter experiment | Photo Distill | Interactive SVG/CSS controls and live geometric metrics, not a generated screenshot | 4 | pass | — |
| Honest evidence | Avoid fake print, browser, source-fidelity, or upstream claims | Provenance and acceptance records | `pass` and `qualified` statuses with explicit boundaries | 3 | pass | — |
| Cross-surface | Preserve complete images and readable evidence on long desktop/mobile pages | Desktop, tablet, narrow viewport, immersive viewer | Full-frame media, no crop, no horizontal overflow, keyboard and focus behavior | 7 | pass | — |
| Delivery | Build, tests, lint, assets, and documentation | Project | Reproducible local checks | 9 | pass | — |
| Publishing | Public hosted URL | Hosted site | Rights-cleared deployment | 9 | blocked | Clear upstream and generated-asset publication rights before hosting |

### Revision 3 final evidence

- Twelve routes now show one new independent plan experiment; `photo-relic-editorial` keeps its four delivered controlled pairs. Seven of the new plans are marked answered. Pixel close-up, Photo Distill ink coverage, Poetic photo fidelity, Photo Abstract outline comparison, and Postcard physical proof are explicitly partial and remain `OPEN AFTER PARTIAL`. Each card exposes the exact original plan wording, narrower experiment question, complete input/effect, method, pass/qualified evidence, full eight-field use case, effect construction type, and provenance boundary.
- The Revision 3 dataset references 19 new local assets: 17 raster images and two self-contained SVG composites. The SVGs embed their source pixels instead of depending on a fragile nested file URL. The complete asset check reports no missing path, and the rendered-page test keeps every research image on `object-fit: contain`.
- A live 1280px browser pass covered all 13 routes. The twelve new routes each exposed one plan experiment and application; answered routes retained one future question, partial routes retained the original open question plus one future question, and Photo Relic exposed four legacy pairs plus three future questions. Every scoped image loaded, all media computed to `contain`, and no route had horizontal overflow.
- At 820 × 900, the Photo Distill experiment pair and its three metrics stacked to one column with no overflow. At 430 × 900, the Scenes source rendered its complete 1024 × 1536 file at 345 × 518 with `contain`; the frozen plan, question, source label, caption, and effect order remained readable.
- The Photo Distill presets were exercised in the live browser. `安全范围` produced `4.42px / 0.67% / 14.7px` and PASS; `超限示例` produced `6.18px / 1.40% / 13.3px` and correctly failed line width and anchor area; `最小可见锚` produced `3.76px / 0.40% / 15.6px` and PASS. These are deterministic SVG geometry calculations under explicitly local QA thresholds, not claimed pixel measurements or upstream standards.
- The Postcard preflight now uses 15 SVG units for a 3 mm bleed when 500 units represent 100 mm. A scaled artwork layer extends through the bleed clip, while the unscaled layer preserves the exact trim composition; the page still labels this as digital preflight, not physical proof.
- Photo Relic still renders 21 figure triggers because complete effects intentionally reappear beside their use cases, but the immersive viewer now deduplicates them to 16 unique source files. Opening the last duplicate keeps its `APPLICATION EFFECT · 05` context, ArrowLeft moves through unique images only, and Escape restores scrolling and focus to the initiating trigger.
- Final project checks: Vinext production build passed, all 8 rendered/source tests passed, and ESLint passed. The public deployment row remains blocked until upstream and generated-image publication rights are cleared.

## Revision 2 · comprehensive effect applications

- Entry mode: revision-led implementation.
- Request revision: 2026-08-09, expand all 13 Skill pages beyond structural completeness.
- Target user and context: a researcher who needs enough visual evidence to understand capability, practical value, concrete usage scenarios, boundaries, and extension potential without reading upstream code first.
- Desired first impression: every local effect is immediately paired with a credible use case and remains available as a complete, uncropped visual artifact.
- Visual ambition: Editorial + Immersive.
- Experience architecture: Hybrid Workspace — long-form capability research with the existing full-screen evidence viewer.
- Visual constraints: preserve the paper/ink system; show complete images; do not economize by hiding descriptions, collapsing evidence, or substituting thumbnails for final effects.
- Information constraints: every local effect must disclose that it is our study output, name a practical scenario, explain why the Skill fits, identify likely deliverables and audiences, and state at least one extension direction.
- Operation constraints: all effect images retain immersive viewing, keyboard navigation, direct-file access, and provenance labels.
- State constraints: pages with one or two local effects must reach at least three complete effects; `photo-relic-editorial` retains its deeper controlled-pair evidence.
- Environment constraints: existing Vinext/React site, project-local assets, no new dependency, generated/right-sensitive assets remain local and ignored until publication rights are cleared.
- Primary journey: select a Skill → understand its capability → compare upstream evidence → inspect at least three complete local effects → connect each effect to a usage scenario → evaluate boundaries and expansion directions.
- User-defined phases: (1) continue supplementing all remaining pages; (2) add the usage scenario for each generated effect; (3) show the complete effect for that scenario; (4) favor comprehensive coverage over brevity.
- Required artifacts: effect-application data model, at least three local effects per Skill, application scenario panels for every local effect, expanded test coverage, browser evidence, and updated documentation.
- Autonomy authorization: “继续补充”, “可以多一些展示，不要为了简单而节省或者省略内容”.
- User-decision boundary: public hosting remains blocked until upstream and generated-asset publication rights are explicitly cleared.
- Observable completion criteria: 13/13 routes have at least three local effects; every local effect has a complete application panel; images remain uncropped; application copy distinguishes upstream from local study work; representative desktop and narrow browser checks pass; build/test/lint and asset audit pass.

### Revision 2 coverage

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Comprehensive coverage | At least three complete local effects on every Skill page | 13 detail routes | 37 result images plus four controlled Photo Relic effects; 41 application cards | 3 | pass | — |
| Usage scenarios | Every local effect names a concrete use case and audience | Effect application section | 41/41 unique effect paths mapped; missing, duplicate, and orphan records all zero | 3 | pass | — |
| Capability explanation | Explain why the Skill fits, likely deliverables, boundaries, and expansion | Effect application section | All 41 records contain eight non-empty fields; each rendered card exposes six detail blocks | 3 | pass | — |
| Full effect display | Show each scenario's complete uncropped result | Application cards and immersive viewer | Representative images preserve natural ratio with computed `object-fit: contain`; viewer also uses `contain` | 2–7 | pass | — |
| Honest provenance | Mark local study outputs and fictional/generated inputs accurately | All new effects | Shared local-study disclosure, concept-only fidelity notes, and fictional-person boundary appear in rendered pages | 3 | pass | — |
| Cross-surface | Preserve reading order and complete visuals on wide and narrow layouts | Desktop and 500px responsive override | 1280px and 500px live checks both show zero horizontal overflow; mobile cards and briefs stack to one column | 7 | pass | — |
| Delivery | Build, rendered-route tests, lint, and asset audit | Project | Vinext build, 6/6 rendered tests, ESLint, 39 PNG decodes, and two SVG parses pass | 9 | pass | — |
| Publishing | Public hosted URL | Hosted site | Rights-cleared deployment | 9 | blocked | Clear upstream and generated-asset publication rights before hosting |

### Revision 2 final evidence

- All 13 routes now expose at least three local effects. Twelve routes contain three unified-source effects; `photo-relic-editorial` contains one baseline plus four controlled source/effect studies, for 41 application effects overall.
- The application map has 41 unique keys and 41 complete records. Every record includes scenario, audience, job, deliverables, fit rationale, extensions, and boundary copy; the page throws during rendering if a future effect lacks a record.
- The 39 PNG application assets decode successfully. Both `photo-distill` SVG variants parse as 1086 × 1448 documents with matching view boxes.
- At 1280 × 720, daily, travel, photo-distill, photo-relic, and postcard representative pages showed the expected 3 / 3 / 3 / 5 / 3 application cards, six detail blocks per card, computed `contain`, preserved aspect ratios after lazy loading, and zero horizontal overflow.
- The story-rich fictional adult woman effect rendered at 1024 × 1536 and 628 × 942, preserving its ratio. Its application card explicitly covers audience, three deliverables, why the color and environment work, two narrative extensions, and the identity/authorization boundary.
- On `photo-relic-editorial`, the viewer exposed 21 evidence triggers. Opening the last application effect focused the close button, locked root and body scrolling, ArrowLeft changed 21/21 to 20/21, ArrowRight restored it, and Escape closed the dialog, restored scrolling, and returned focus to the initiating trigger.
- With the in-app browser's viewport override set to 500 × 900, `photo-to-zine-postcard` rendered three applications, a 415 × 623 complete 1024 × 1536 image with `contain`, single-column card and brief layouts, a two-column chapter navigator, and zero horizontal overflow. The temporary viewport override was reset after verification.

## Design contract

- Entry mode: revision-led implementation.
- Request revision: 2026-08-09, planned `photo-relic-editorial` demos plus immersive viewing.
- Target user and context: a researcher comparing complete upstream and local visual evidence in a browser.
- Desired first impression: the image becomes the visual anchor without losing provenance, captions, or the surrounding study.
- Visual ambition: Immersive.
- Experience architecture: Hybrid Workspace — the research page remains an editorial flow; a modal image stage temporarily becomes the viewing surface.
- Visual constraints: preserve the existing paper/ink system; never crop research images; keep controls subordinate to the artwork; support extreme portrait and landscape ratios.
- Information constraints: keep upstream and local work explicitly labeled; every planned experiment must show its own generated input and effect as a pair.
- Operation constraints: click, Enter, or Space opens; Arrow keys browse; Escape/backdrop/close dismiss; focus returns to the trigger; direct-file links remain available.
- State constraints: closed, open, previous/next selection, reduced-motion, missing-image fallback, and route cleanup.
- Environment constraints: Vinext/React client boundary, no new dependency, local server at `http://localhost:4317`.
- Primary journey: choose any research image → inspect it uncropped on a dark stage → browse adjacent evidence → read provenance/caption → close and continue at the same page position.
- User-defined phases: (1) execute the current `photo-relic-editorial` plan; (2) add immersive viewing to research images.
- Required artifacts: four source/effect pairs, shared viewer, responsive and keyboard behavior, automated checks, browser evidence, updated research copy.
- Autonomy authorization: “按计划进行补充”.
- User-decision boundary: public deployment remains outside scope until third-party image publication rights are cleared.
- Observable completion criteria: the planned series and person migration are visible as honest pairs; every `DemoFigure` opens the viewer; images remain `contain`; no horizontal overflow; foreground controls and focus behavior work; build/test/lint pass.

## Coverage record

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Planned demos | Three coherent fictional-city studies | Photo relic extension | Three 1536×1024 source / 1024×1536 effect pairs, captions, facts, recipes, and checks | 3 | pass | — |
| Planned demos | Story-rich adult woman in an environment-matched scene | Photo relic extension | “末班车之前” source/effect pair with adult, story, color, and environmental evidence | 3 | pass | — |
| Immersive viewer | Full-frame modal stage | All `DemoFigure` instances | 16 triggers on the canonical route; 1024×1536 image rendered 462×693 with computed `contain` | 2–5 | pass | — |
| Immersive viewer | Previous/next, close, direct-file action | Open dialog | Browser navigation changed 14/16 → 15/16 → 14/16; close and direct-file controls visible | 4–5 | pass | — |
| Immersive viewer | Keyboard, focus return, scroll lock | Open/closed dialog | Arrow keys and Escape exercised; body/root lock cleared, scroll restored to 8396.67, focus returned to original trigger | 5–7 | pass | — |
| Cross-surface | No crop/overflow at supported breakpoints | Desktop and narrow layouts | 818px live route had zero horizontal overflow; 500px Chrome capture passed; CSS/render tests enforce `contain` and mobile stacking | 7 | pass | — |
| Delivery | Build, rendered HTML tests, lint, asset audit | Project | Vinext build plus 5/5 tests pass, ESLint passes, 97 asset references with 0 missing | 9 | pass | — |
| Publishing | Public hosted URL | Hosted site | Rights-cleared deployment | 9 | blocked | Clear upstream image publication rights before hosting |

## Baseline

- Canonical route: `http://localhost:4317/skills/photo-relic-editorial`.
- Recorded viewport: 1280 × 720.
- Baseline evidence: 8 figures and 8 direct-file links; no immersive trigger or dialog; no horizontal overflow.

## Final browser evidence

- Canonical route after refinement: 16 research figures, 16 immersive triggers, four controlled source/effect pairs, and zero horizontal overflow at the live 818px viewport.
- The story-rich person pair preserves the source at 1536×1024 and the study effect at 1024×1536; rendered aspect ratios match the natural files.
- The viewer opened the selected 1024×1536 effect at 462×693 with `object-fit: contain`, then completed previous/next, Arrow keys, Escape, scroll restoration, and focus-return checks.
- A separate local Chrome pass at 500×900 confirmed the long repository title wraps within the narrow layout. The 390px command-line window was rejected as evidence because Windows Chrome enforced a wider internal layout viewport.
