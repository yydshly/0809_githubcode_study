# Image Product Studio 设计契约

## Active contract

| 字段 | 决定 |
| --- | --- |
| Entry mode | revision-led implementation |
| Request revision | 17（上传新图后以可见样例驱动真实 AI 编辑；生成前展示参考，生成后进入三方对比、结果库和产品适配） |
| Target user and context | 希望从一张或多张图片直接获得可用图片产品、不需要理解 Skill、模型或 Prompt 的电脑网页用户 |
| Desired first impression | 先说明“这些图片怎样处理”，再让用户看到少量清晰推荐与真实交付结果；选择路径简单、结果差异明确 |
| Visual ambition | Editorial |
| Experience architecture | Hybrid Workspace：左侧完成处理单位、图片处理与产品选择；中央持续预览当前成品；右侧显示交付文件 |
| Visual constraints | 保留现有深色三栏工作台、纸张画布、克制细边框与成品为中心的层级；不改成 Skill 控制台或密集卡片仪表盘 |
| Information constraints | Skill 只作为后台图片处理手段；用户界面只表达处理单位、可见图片效果、产品场景与交付结构 |
| Operation constraints | 原生 HTML/CSS/JavaScript + Canvas + Node 本地安全代理；支持 1–12 张本地图片和内置样例；浏览器不得接触 API 密钥 |
| State constraints | 单图、逐张、合集三种模式；新增原图编辑增强、主体提炼、局部证据三种图片处理；每种模式独立白名单；新增主体主视觉、系列标准图、视觉图鉴三种产品；模式切换自动清理无效选择；生成与下载状态保持一致 |
| Environment constraints | 静态本地服务器；只验收电脑网页版，重点为 1280×720；单一深色主题 |
| Primary journey | 导入新图 → 选择参考样例 → 生成前查看参考 → AI 生成 → 原图 / 参考 / 结果对比 → 结果库选择 → 产品适配与下载 |
| User-defined phases | 第一：继续优化最终产品效果；第二：补齐可优化和补充的产品方向；第三：核心仍是图片采用了什么不同处理逻辑，而不是增加空壳产品名称；第四：继续遵守 02 对 03 / 04 的按需约束 |
| Required artifacts | `compositor/index.html`、`styles.css`、`app.js`、README、契约与浏览器验证记录 |
| Autonomy authorization | 用户明确要求“做好区分”“增加按钮”“恢复纵向列表”“进行产品单一化”，授权在现有电脑网页原型内直接设计、实现和验证 |
| User-decision boundary | 接入真实图片编辑 API；账户、云存储、费用界面、任务队列与公网部署仍不在本轮范围。真实调用需要用户在本机服务端配置自己的 API 密钥 |

## Observable completion criteria

- 一张图片只可进入“单图成品”；多张图片可明确选择“逐张独立”或“组合合集”，也可只取当前主图。
- 单图只交付一个成品文件；逐张模式按图片数量交付同一种产品的独立结果；合集模式交付一个含多文件/多页面的完整产品。
- 图片处理方向位于产品推荐之前，且切换它只改变核心图片视觉处理，不改变处理单位。
- 单图只显示记忆、材料、诗性三种图片效果和封面/海报/明信片/档案卡四种成品用途；逐张只显示系列卡、材料、视觉指纹三种图片效果和四种可重复批次产品；合集只显示记忆、诗性、视觉指纹、材料四种效果和档案/故事/轮播/网页故事/展览五种合集产品。
- 切换处理单位时，03 与 04 的数量、名称、说明和更多产品弹窗立即更新；上一模式中不适用的图片效果或产品不得残留。
- 新增“原图编辑增强”：保留照片真实性，通过统一光色、层级和安全裁切改善可用性；新增“主体提炼”：以聚焦、背景减法和轮廓符号强化单图主体；新增“局部证据”：把局部放大、编号和来源标注用于多图研究/合集。
- 图片效果卡必须解释“保留什么、改变什么”，中央结果与右侧摘要同步显示该处理逻辑；新增方向不能只是换名称或换边框。
- 单图新增“主体主视觉”，逐张新增“系列标准图”，合集新增“视觉图鉴”；三者必须具有独立 Canvas 构图和真实交付结构。
- 页面内只纵向展示三项首选产品；“查看全部产品”打开可预览的弹窗。
- 弹窗内选择产品后，它成为当前首选、回到纵向列表首位，并同步中央预览与右侧交付文件。
- 产品建议与模式匹配：单图优先封面/海报/卡片；逐张优先同规格卡片/封面/发布图；合集优先档案/故事/轮播。
- 中央预览与右侧文件结构能直观看出三种处理单位的差异，而不只是更换名称。
- 样例的已有生成视觉只作为参考效果；用户上传后的结果区必须等待真实 API 响应，不能展示 Canvas 设计预演或旧样例成品。
- 真实生成后可下载当前结果 PNG；选中真实结果后，产品适配可下载当前成品或与实际文件数一致的 ZIP。
- 1280×720 电脑网页无横向溢出、关键控件遮挡或不可达；弹窗支持关闭、Escape 与焦点返回。
- 空态、载入态、生成态和来源失败均保持可恢复；语义按钮与可见焦点保留。

## Coverage manifest

| User phase | Requirement / artifact | Surface / state | Evidence needed | Owning stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 基线 | 当前三栏工作台可运行 | `/compositor/` | 浏览器与 DOM | Stage 1 | pass | 保留中央画布和右侧文件结构 |
| 处理单位 | 单图、逐张、合集三种按钮及默认逻辑 | single / multi sample / multi upload | DOM、交互 | Stage 3–5 | pass | 单图锁定；样例多图默认合集；上传多图默认逐张 |
| 图片处理差异 | 新增三种处理逻辑并让卡片、中央 Canvas、右侧摘要均能辨认 | single / batch / collection | DOM、Canvas 状态、交互 | Stage 2–6 | pass | 三种新逻辑均有独立 Canvas 处理与保留/改变说明 |
| 核心图片处理 | 03 仍只显示当前处理单位适用的图片效果 | single / batch / collection | DOM、切换状态、Canvas 状态 | Stage 3–5 | pass | 单图 5、逐张 4、合集 5，模式切换无无效方向残留 |
| 产品方向补充 | 单图主体主视觉、逐张系列标准图、合集视觉图鉴 | each mode / selected | Canvas、文件结构、产品切换 | Stage 3–6 | pass | 1 个主体文件、六个独立系列文件、八页动态视觉图鉴均验证 |
| 纵向推荐 | 04 只显示当前处理单位适用的三个首选 | single / batch / collection | DOM、computed style | Stage 3–4 | pass | 三个新产品进入各自模式首选，其他模式不可见 |
| 更多产品 | 弹窗只列当前模式的全部适用产品，仍可提升首选、关闭和返回焦点 | dialog open / selected | 交互、DOM | Stage 4–7 | pass | 5/5/6 项适用目录、双列布局、Escape 与焦点返回通过 |
| 单图成品 | 一个图片处理为一个产品文件 | repair sample / single mode | Canvas 状态、文件数、下载状态 | Stage 5–6 | pass | 1 项且 ZIP 隐藏 |
| 多图逐张 | 每张图片独立成为同一种产品结果 | six-image sample / batch mode | 逐项来源、文件数 | Stage 5–6 | pass | 六个同规格结果分别映射六张来源图 |
| 多图合集 | 多张图组合为档案/故事/轮播等完整合集 | six-image sample / collection mode | Canvas 状态、多页结构、文件数 | Stage 5–6 | pass | 档案 4 页、轮播/网页 5 页、故事 7 页、图鉴 8 页，均覆盖 6 / 6 |
| 生成与下载 | PNG/ZIP 数量与当前模式一致 | generated | 浏览器状态、ZIP 结构代码 | Stage 5–6 | pass | 按动态文件数生成；单项仅 PNG，多项启用 ZIP |
| 错误恢复 | 空态与来源失败安全关闭生成下载 | empty / missing | DOM 状态 | Stage 6 | pass | error 状态下生成、下载、更多与模式均禁用，可由六个样例恢复 |
| 标准桌面 | 三栏、扩展效果卡与按需弹窗无裁切/横向溢出 | 1280×720 | DOM、computed style、overflow | Stage 7 | pass | body 1280/1280，三栏独立滚动，推荐横向差值为 0 |
| 可访问性 | 语义、焦点、dialog Escape/焦点返回、reduced motion | keyboard / dialog | 浏览器观察 | Stage 7 | pass | Escape 关闭且焦点回到打开按钮；语义与 CSS 保留 |
| 工程检查 | 脚本语法与差异检查 | files | 命令输出 | Stage 9 | pass | `node --check`、`git diff --check`、三个 HTTP 入口 200 |
| 交付记录 | README、契约、验证记录同步 | files | 文件检查 | Stage 9 | pass | Revision 16 README、契约、Skill 映射与验证记录已同步 |

## Design direction

| 决定 | 选择 | 可观察约束 |
| --- | --- | --- |
| Composition | 左侧按“图片 → 处理单位 → 图片处理 → 产品推荐”纵向阅读；中央成品；右侧产品适配文件 | 操作顺序不依赖用户理解内部 Skill |
| Focal hierarchy | 中央当前成品第一，处理单位和首选产品第二，内部能力说明第三 | 弹窗只在用户主动查看更多时出现 |
| Typography | 中文无衬线界面 + Canvas 衬线标题 | 模式、处理、产品、文件四类角色清晰 |
| Palette | 延续雨蓝、琥珀、纸白、青绿 | 选中态同时依赖边框、背景和文本，不只依赖颜色 |
| Material | 暗色编辑器、纸张结果、细边框、克制阴影 | 推荐纵向列表紧凑，弹窗承担更多预览密度 |
| Density | 默认只显示三个首选；更多产品移入宽弹窗 | 左栏不再出现八项横向产品轨道 |
| Motion | 仅用于选择反馈、弹窗与生成状态 | reduced-motion 下立即完成且不隐藏信息 |

## Capability boundary

本轮提供可运行的产品结构与视觉预演。内置样例可复用已生成视觉层；用户上传图片使用浏览器 Canvas 展示处理与产品适配关系。真实生产版仍需要后端图片理解、生成队列、质量检查、认证、费用与内容安全能力。

## Revision 11 delta · 处理效果可判断

本轮只增强现有图片处理闭环，不增加新的产品名称：

- 中央预览提供“处理后 / 原图”即时切换；原图视图必须明确标注仅用于对照，不带图片效果和产品适配。
- 提供“轻量保真 / 平衡推荐 / 强表达”三档改造强度；强度只改变当前图片处理的表达程度，不改变处理单位、产品目标或交付文件数量。
- 切换处理方向、产品或强度后，中央预览回到“处理后”，避免用户误把原图当成选中结果。
- 即使中央正在查看原图，“下载当前文件”和 ZIP 仍必须输出处理后的产品文件，原图查看状态不得污染导出。
- 无图片时，对照和强度控件禁用；载入图片后恢复。

| Requirement | Surface / state | Evidence needed | Status | Next action |
| --- | --- | --- | --- | --- |
| 原图 / 处理后对照 | central preview / loaded | DOM、Canvas 状态、说明文案 | pass | 双态切换、来源名与恢复已验证 |
| 三档改造强度 | effect selection / loaded | DOM、Canvas 差异、右侧摘要 | pass | 三档与当前处理叠加，摘要同步，产品与文件数不变 |
| 导出不受原图查看污染 | source preview / generated | 下载实现与交互状态 | pass | 当前 PNG 和 ZIP 均使用独立结果画布 |
| 空态与桌面适配 | empty / 1280×720 | disabled 状态、overflow | pass | 空态禁用；body 与 workspace 均为 1280 / 1280 |
| 工程与记录 | files | 语法、差异、README、验证记录 | pass | Revision 13 README、Revision 11 验证与检查已同步 |

## Revision 12 delta · 合集页数与原图覆盖

本轮保留“收藏档案卡为四页”的产品结构，但不再让四页看起来像遗漏两张输入图：

- 右侧必须直接显示“输入 N 张原图 → 生成 M 个成品页”以及“已覆盖 N / N 张”。
- 收藏档案卡四页分别承担主档案、双图细节、材料组和全组索引；六张原图必须在四页中全部可见，不要求一图等于一页。
- 每个交付文件标出使用的原图编号；文件数量和来源覆盖是两个独立信息。
- 合集页数由产品结构决定：图片故事册按来源扩展为“封面 + 每图一页”，视觉图鉴扩展为“封面 + 总览 + 每图一页”；轮播、网页故事、展览和档案按产品职责组合多图。
- 单图与多图逐张模式保持原有文件数量逻辑，不受合集规划影响。

| Requirement | Surface / state | Evidence needed | Status | Next action |
| --- | --- | --- | --- | --- |
| 输入 / 输出数量区分 | collection / selected | DOM、说明文案 | pass | 6 张输入与 4/5/7/8 个成品页分别显示 |
| 文件级原图映射 | collection / file list | DOM、文件切换 | pass | 每页显示原图编号并进入 Canvas 说明 |
| 四页档案覆盖六图 | archive / six-image sample | Canvas、覆盖统计 | pass | 四页职责重排，主图/双图/三图材料/全组索引覆盖 6 / 6 |
| 产品化动态页数 | story / lookbook / six-image sample | 产品切换、文件数、Canvas | pass | 故事册 7 页、图鉴 8 页，动态末页与 ZIP 均验证 |
| 相邻合集覆盖 | carousel / webstory / exhibition | 覆盖统计、Canvas | pass | 三者均显示并渲染 6 / 6 覆盖 |
| 单图与逐张回归 | single / batch | 文件数、交互 | pass | 单图 1 个成品；逐张 6 个独立成品 |
| 桌面与工程记录 | 1280×720 / files | overflow、日志、语法、HTTP、文档 | pass | 1280 / 1280、日志为空、语法与 HTTP 通过，Revision 14 / 12 已同步 |

## Revision 13 delta · 可解释的差异化推荐

本轮不增加新产品，修正“所有样例得到同一固定排序”的核心推荐缺陷：

- 六组内置样例按各自图片关系、主体和使用场景，在单图、逐张、合集三种处理单位下获得不同的产品顺序。
- 推荐卡直接显示一条结果导向的推荐依据，不显示伪造的精确分数，也不暴露内部 Skill。
- 左侧显示本次推荐实际使用的 2–3 个信号；选择不同样例后，信号、首选产品、卡片理由、中央结果和右侧文件结构同步变化。
- 对用户上传图片保持诚实：本地探测版只依据图片数量与处理单位推荐产品结构，明确显示“未进行在线视觉理解”，不假装已经完成 AI 识图。
- 用户从更多产品中提升首选的行为继续保留；这是人工选择，不应被重新标成自动首选。

| Requirement | Surface / state | Evidence needed | Status | Next action |
| --- | --- | --- | --- | --- |
| 样例差异化排序 | six samples / collection | 样例切换、前三产品、中央结果 | pass | 六组首选分别为故事册、图鉴、展览板、轮播组、档案卡、主体主视觉 |
| 三种处理单位推荐 | single / batch / collection | 模式切换、产品白名单 | pass | 样例均有分模式顺序；舞台样例在合集 / 逐张 / 单图间切换为轮播组 / 发布图批次 / 活动海报 |
| 卡片推荐依据 | recommendation list / selected | DOM、可见文案 | pass | 三张首选卡均直接显示结果导向理由，语义名称同步包含理由 |
| 推荐信号可见 | sample / upload | DOM、状态切换 | pass | 六组样例信号随输入变化；上传分支明确显示图片数、处理单位与“未进行在线视觉理解” |
| 人工提升首选 | product catalog / promoted | 交互、排序、焦点 | pass | 目录选择回到纵向首位并标记“人工选择”，中央与右栏同步 |
| 下游结果一致 | product / coverage / canvas / export | 文件数、覆盖、生成状态 | pass | 六组默认结果分别为 7 / 8 / 4 / 5 / 4 / 1 项；故事册生成后 PNG 与 ZIP 可用 |
| 桌面与工程记录 | 1280×720 / empty / files | overflow、日志、语法、HTTP、文档 | pass | 1280×720 三栏可用、空状态安全；语法、差异与 HTTP 通过，Revision 16 已同步 |

## Revision 16 delta · 从模板效果到图片再创造

本轮修正“选择核心图片方向仍像套模板和简单优化”的问题，不增加新的产品目标，先扩展图片本身能发生的变化：

- 把 13 个 Skill 研究能力转译为用户可理解的结果方向，例如实景编辑、结构拆解、空间重绘、连续场景拼合、隐喻重构、记忆重生、材料转译、关系抽象与视觉指纹；界面不要求用户理解 Skill 名称。
- 主界面只显示当前处理单位下最适用的三个方向，完整方向进入可预览目录；选中目录项后返回首位并同步中央成品与右侧摘要。
- 每个方向必须写清结果类型、保留什么、重建什么，并在 Canvas 中呈现不同的图像组合或重构逻辑，而不只是换边框、文字和颜色。
- 单图、逐张和合集使用不同白名单：单图允许主体、场景与记忆重构；逐张只保留可稳定复用的系列能力；合集加入多图叙事拼合与多图关系抽象。
- 浏览器探测版继续诚实标注：这些是基于现有 Skill 研究归纳的可见结果预演，真实上传图片的语义理解与生成仍需在线后端。

| Requirement | Surface / state | Evidence needed | Status | Next action |
| --- | --- | --- | --- | --- |
| 结果方向扩展 | single / batch / collection | DOM、名称、白名单 | pass | 单图 8、逐张 6、合集 9 种方向；名称与模式白名单实测一致 |
| 非模板化可见差异 | direction preview / central canvas | 截图、Canvas 对比 | pass | 单图记忆重绘与结构拆解使用两张真实生成结果；重构、融合与续帧有独立 Canvas 逻辑 |
| 三项首选与完整目录 | direction list / dialog / promoted | DOM、交互、焦点 | pass | 只显示三项首选；完整目录可预览，非首选方向选择后成功提升为首位 |
| 结果边界说明 | cards / route summary / generation details | 可见文案 | pass | 卡片显示结果类型、保留与重建；Skill 只进入折叠后台说明 |
| 相邻流程回归 | products / generated / export / empty | 交互、文件数、状态 | pass | 单图 1 项、逐张 6 项、合集 7 项同步；预演 / 样例成品边界保持明确 |
| 桌面与工程记录 | 1280×720 / files | overflow、日志、语法、HTTP、文档 | pass | 1280×720 无横向溢出；语法、差异、HTTP 与 Revision 16 文档通过 |

## Revision 17 delta · 参考驱动生成与独立结果出口

### 修订目标

- 上传新图后不再把 Canvas 预演称为生成结果；生成前中央首先展示用户选择的参考样例。
- 图片方向改为“可执行参考配方”：样例图既展示预期效果，也作为 AI 编辑的第二张输入参与生成。
- 生成完成后提供“原图 / 参考 / 生成结果”三方对比，并把真实结果加入独立结果库。
- 产品适配只消费已生成结果；没有真实结果时不得启用成品下载或伪装为最终成品。
- 浏览器不保存或接触 API 密钥；真实 AI 调用经本地服务代理。无密钥时明确显示配置阻塞，不播放假生成动画。

### Revision 17 coverage

| 用户要求 | Surface / state | Evidence | Status | Next action |
| --- | --- | --- | --- | --- |
| 上传图由样例驱动 | upload / reference selected | DOM、截图、参考图可见 | pass | 上传单图后切换陶艺参考，来源仍保持 1 张且中央同步参考 |
| 生成前显示样例效果 | center / before generation | screenshot、状态文案 | pass | 中央参考态、结果/成品禁用与三方对照空位均已验证 |
| 真正 AI 生成 | local API / loading / success / error | HTTP、浏览器状态、真实响应 | blocked | 服务端实现与 503 错误契约通过；本机缺少 `OPENAI_API_KEY`，尚不能取得真实成功响应 |
| 三方对比 | source / reference / result | DOM、切换、截图 | blocked | 原图与参考切换已通过；真实结果位依赖一次有效 API 响应 |
| 独立结果展示口 | result gallery / selected result | DOM、下载、历史切换 | blocked | 结果库与产品消费逻辑已实现；真实版本加入、切换与下载待有效 API 响应复验 |
| 无密钥诚实降级 | API unavailable | 状态、恢复说明 | pass | `/api/status` 返回 unavailable；生成、结果、成品和下载全部禁用，无假动画 |
| 桌面回归与文档 | 1280×720 / files | overflow、语法、HTTP、docs | pass | 三栏桌面截图、8 项参考目录、浏览器零错误、语法与差异检查通过 |

## Revision 18 repair contract · GitHub Pages 交互可用性

| 字段 | 决定 |
| --- | --- |
| Entry mode | repair-led |
| Request revision | 18（修复 GitHub Pages 公开逻辑演示中大量控件不可用的问题） |
| Target user and context | 在远端 GitHub Pages 直接体验旧版产品逻辑的电脑网页用户 |
| Desired first impression | 页面即使没有 AI 后端，仍能完整体验样例、参考、处理单位、图片方向和产品目标的选择逻辑 |
| Visual ambition | Editorial；保留现有深色三栏和纸张结果视觉 |
| Experience architecture | Hybrid Workspace；本轮不重构布局，只修复可达性和状态反馈 |
| Visual constraints | 不重新设计页面，不改变样例资产、颜色、字体或主要布局 |
| Information constraints | 明确区分“逻辑演示可操作”和“真实 AI 生成不可用” |
| Operation constraints | GitHub Pages 纯静态；不得暴露密钥或伪造生成；非 AI 控件必须可用 |
| State constraints | 样例、参考、处理单位、方向、产品、弹窗和原图/参考切换应可操作；结果、成品、下载和真实生成可以因无后端禁用 |
| Environment constraints | GitHub Pages 正式 URL，桌面 Chromium，1280×720 基线 |
| Primary journey | 打开公开页 → 切换样例 → 切换参考 → 切换处理单位/方向/产品 → 查看中央与右栏同步变化 |
| Autonomy authorization | 用户报告远端大量点击不可用，授权在既有部署范围内定位并修复 |
| User-decision boundary | 不为静态 Pages 新增真实 AI 后端；若需要生成服务必须另行选择托管方案 |

### Revision 18 coverage

| Requirement | Surface / state | Evidence needed | Status | Next action |
| --- | --- | --- | --- | --- |
| 复现不可点击 | GitHub Pages / initial | Chromium 点击与 console | pass | 46 个普通控件可用；6 个结果链控件因无后端被禁用，构成用户感知根因 |
| 非 AI 控件可用 | sample/reference/mode/direction/product/dialog | 点击前后 DOM 状态 | pass | 样例、参考、模式、方向、产品和三类目录弹窗均完成状态变化 |
| AI 边界明确 | generate/result/product/download | disabled 状态与说明 | pass | 六组内置样例可诚实载入预置结果；上传图和不匹配参考仍明确要求 AI 服务 |
| 邻接回归 | 1280×720 / initial and changed states | Chromium screenshot、console、DOM | pass | 六组样例 6/6、结果/成品/PNG/ZIP、上传降级通过，console 0 error/warning |
| 远端发布 | GitHub Pages production | Actions success、HTTP 200、浏览器路径 | continue | 推送 main 并复验线上版本 |
