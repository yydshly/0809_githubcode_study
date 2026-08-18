# Single Image Studio 状态

> 本文件是项目状态的唯一事实来源（single source of truth）。其他文档负责说明目标、研究方法或历史记录；若其中的阶段、证据或发布表述与本文件冲突，以本文件为准。

最后核对：2026-08-17

## 一句话结论

`projects/single-image-studio` 已从“研究优先”转入“产品优先”，但现有网页仍只是可运行的 **R0 工程流程探针**，不是已经完成或可发布的图片产品。九类原子能力尚无一项取得 C1，实用效果 U1、创意效果 E1、R1-pipeline、R1-product-validation、R1-product-release、运维 O1、治理 G1、用户价值 V1 与逐项 Release Gate 均未取得。

## 当前产品执行方向（2026-08-16 重排）

2026-08-18 统一执行路线已落地：[产品能力与工程演进执行计划](PRODUCT_AND_ENGINEERING_EXECUTION_PLAN.md)把当前工作固定为“Stage 0 checkpoint → Stage 1 控制器拆分 → Stage 2 真人走查 → Stage 3 图片质量矩阵 → Stage 4 区域理解 → Stage 5 真正修复 → Stage 6 生成式场景 → Stage 7 邀请测试准备”。代码整理是能力扩展前置，不替代能力扩展；当前先收口工作树和顶层任务语义，再开始无行为变化的 `source-task-controller` 抽离。

2026-08-18 Stage 0 checkpoint 前审计：`UT-SOLID-BG` 已从产品顶层任务、runtime profile 和下载合同移除，纯色换底仍作为抠图结果派生交付；无 Provider 时 12 个本地任务不变，背景移除可用时仍为 15 个可用操作。`.env` / `node_modules` 已忽略且未跟踪，无嵌套 `.git`；10 个大 PNG 均位于登记的演示素材目录，secret scan 命中均为 `mask-` 词片段或“环境变量必须为空”的测试断言。完整 `npm run verify` 通过：产品 373 / 373，研究安全回归 483 pass / 9 intentional skips，语法 285 文件。产品 Chromium run `f5b4f597-a122-43e4-8477-8899aabbccdd` 六条本地旅程 6 / 6；页面 / 走查 run `06c506a8-b233-44f5-9588-99aabbccddee` 两档视口 2 / 2、13 路由均为 HTTP 200。当前只剩创建可回滚 checkpoint，然后进入 Stage 1。

2026-08-18 Stage 0 已完成：commit `17ac5aa` 保存 179 个项目文件的内部 Alpha checkpoint，提交后工作树为 clean。当前进入 Stage 1，先抽离 `source-task-controller`，只移动来源 / 任务导航的纯状态决策，不改变页面视觉、任务顺序、Provider、像素或下载合同。

2026-08-18 Stage 1 第一批完成：新增 `source-task-controller.js`，集中 17 项产品任务顺序、runtime flags、runnable 选择和来源取消后的纯状态重置；`main.js` 不再直接读取 task catalog 或 execution profile。历史 `UT-SOLID-BG` 已排除，12 个离线任务和 Provider 可用时 15 个操作不变。相关定向 40 / 40，完整产品验证 377 / 377、语法 287 文件；Chromium run `17d617b9-c344-4506-a699-aabbccddeeff` 六条旅程 6 / 6，尺寸与 byte 事实保持不变。下一批进入 `settings-controller`，不改变设置默认值、文案或渲染结果。

2026-08-18 Stage 1 第二批完成：新增 `settings-controller.js`，集中 workflow 参数合同、远程确认门与社交 / 上传 / 隐私 / 适配 / 转换 / 压缩 / 文档设置归一化；`main.js` 只保留 DOM 读取、编辑历史提交和结果协调。settings 定向 5 / 5，完整产品验证 382 / 382、语法 289 文件；Chromium run `28e728ca-d455-4617-b7aa-bbccddeeff00` 六条旅程 6 / 6，尺寸和 bytes 不变。下一批评估 `local-execution-controller` 的纯分派边界，不移动 Canvas renderer 或异步套装状态。

2026-08-18 Stage 1 第三批完成：新增 `local-execution-controller.js`，集中本地特殊执行 kind、状态说明、fit / social 后处理及报告开关；renderer、Canvas、压缩 attempt、套装 session 和 DOM 状态仍由原所有者管理。首次隔离浏览器 run 抓到非裁正任务读取 null label 的接线缺陷并以 1 / 6 关闭；修复 optional label 后，完整产品验证 386 / 386、语法 291 文件，Playwright Chrome run `8e4d8e20-3a6b-4c7d-9e10-112233445566` 六条旅程 6 / 6、0 pageerror。下一步评估远程执行边界；若无法纯抽离则停止 Stage 1，转入真人走查。

2026-08-18 Stage 1 已按停止规则结束：远程执行已经分别由 `api-client`、Provider runtime 和 `state-machine` 持有协议、供应商与 run 生命周期；主文件只剩页面协调。继续抽离必须同时移动 DOM、source token、dispatch 和 Provider callback，会制造双状态所有者，因此不为减行数泛化。当前稳定提交链为 checkpoint `17ac5aa`、source/task `d7f590a`、settings `119cbb0`、local execution `b4aeb36`。现进入 Stage 2，使用该固定 build 做 2–3 人方法演练；代码侧不再增加场景或控制器，除非走查暴露 P0 / P1 / P2。

2026-08-18 用户反馈修复：样例页原“褪色提层次”本地老照片结果差异过弱，实测平均通道差约 6.36；静态参考也可能在 lazy/async 解码末尾短暂只显示棋盘格。样例现改用已有“黑白层次”预设，明确它不会去划痕或补画；旧照片资源优先加载，runtime 结果 decode 后才标记 ready，两张卡均可单独查看结果。隔离 Chrome run `9f5e9f31-4b7c-4d8e-ae21-223344556677` 在 1180 / 390 px 以 2 / 2 通过，18 张图片完整，本地老照片平均通道差 10.67、变化覆盖 98.4%；完整产品验证仍为 386 / 386、语法 291 文件。该修复改善真实效果理解，不升级生成式修复能力。

2026-08-18 样例加载与 metadata 说明修复：普通 lazy 图片此前同时设为 hidden，可能永远无法进入视口并停在“正在加载已登记图片…”。现在已有路径的图片保持参与布局，load 只负责关闭状态；无 URL 的 runtime 结果才保持 hidden。`a06fa042-5c8d-4e9f-bf32-334455667788` 在两档视口以 2 / 2 再次验证 18 张完整图片、老照片 delta 10.67 / 98.4%。隐私分享卡改为“清理图片文件信息（画面基本不变）”，明确 metadata 清理是文件层安全 / 交付能力而非视觉特效。产品验证 386 / 386、语法 291 文件。

2026-08-18 S5 走查准备完成：新增[内部质量入口](web/quality-hub.html)、[内部体验走查台](web/internal-walkthrough.html)、[本地匿名汇总页](web/internal-walkthrough-summary.html)、[strict 记录合同](INTERNAL_WALKTHROUGH_TOOL.md)与[页面—能力注册表](PAGE_AND_CAPABILITY_REGISTRY.md)。全部 13 个 HTML 页面按产品、复核、走查、自动 QA、视觉参考五类登记，父级关系闭合到产品入口，task 引用必须来自真实目录；自动 / 参考页也获得稳定入口和返回链。静态检查保证每个 HTML 的本地 `href/src` 存在且 HTML 目标已登记；浏览器会逐个要求 13 个路由返回 `HTTP 200 + text/html`。走查固定“基础编辑与下载”和“隐私友好分享副本”两项中性任务。未确认同意或未承诺只用项目演示图时不能开始；记录拒绝未知字段、任务换序 / 重复、明显邮箱 / 手机号。汇总页限制 1–8 份 JSON / 单份 64 KiB / 总计 512 KiB，拒绝重复场次，按 build 分组，只输出计数与问题类别，不传播场次编号和自由文本。所有工具均不读取参与者图片、不自动上传、不持久化到浏览器存储。Chromium run `e4a3e486-9011-42d3-b376-778899aabbcc` 在 1180 / 390 px 以 2 / 2 通过 13 路由、目录、走查、汇总、清空和无横向溢出；完整产品验证现为 373 / 373，285 个 JavaScript 文件语法通过。该 2 / 2 是工具 QA，不是真人结果；真实方法演练仍为 `0/2–3`，M2 仍为 `0/5–8`。下一动作是邀请 2–3 位未参与设计的人，在受控桌面上只用项目合成图完成走查；开始后不得用自动脚本冒充分母。

2026-08-18 S4 单场景完成：新增 `UT-PRIVACY-SHARE`“隐私友好分享副本”，完全本地组合 metadata 输出政策、完整比例、最长边、JPEG、多档压缩、像素 / hash 重开和下载合同。三预设为 2048 px / 2 MB、1600 px / 1 MB、1200 px / 500 KB。结果逐项核对当前禁止的 EXIF / GPS / XMP / IPTC / comment 为 0，并明确不识别人脸、地址、车牌、二维码、水印或画面文字。产品 run `6b6c6d6e-7f70-4ba9-8fdc-4567890123bc` 以 6 / 6 通过，新结果 `1440 × 1080 / 38,471 bytes` JPEG；样例 run `7c7d7e7f-8081-4cba-8aed-5678901234cd` 以 2 / 2 通过，页面现有 9 项 / 6 runtime。完整产品验证 354 / 354，273 个 JavaScript 文件语法通过。没有模型、API 或远程上传。S4 只授权的单场景已经完成，下一阶段进入 S5 内部可用性走查。

2026-08-18 S3 错误体验 practical-complete：设置页错误现说明任务未开始 / 图片未发送并聚焦相关字段；下载、输出合同、文件读取和 hash / length 失败进入 `output-validation` 明确状态，本地结果返回设置，远程抠图结果返回结果页；双远程状态查询失败时顶栏明确“远程状态暂不可确认 · 本地工具仍可用”。错误矩阵 run `2d2c2b2a-3938-4765-8bf8-0123456789de` 在 1180 / 390 px 以 2 / 2 通过，产品成功 run `3e3d3c3b-4a49-4876-9ca9-1234567890ef` 以 5 / 5 通过。完整产品验证 348 / 348，270 个 JavaScript 文件语法通过。当前进入 S4 单场景工作流扩展。

2026-08-18 S3 错误体验第一批：主错误页现固定显示“图片状态 / 安全重试 / 下一步”，存在 run 时显示任务编号，技术错误码与任务 ID 默认折叠。七类 strict context 已覆盖输入、设置、本地处理、输出校验、远程明确失败、远程未知和网络不可用；主要 `showError` 路径已区分输入、本地、远程失败与 UNKNOWN，恢复按钮仍沿用原状态机优先级。错误矩阵 Chromium run `0b0a0908-1716-4543-8fd6-8901234567bc` 在 1180 / 390 px 以 2 / 2 通过；产品成功路径 run `1c1b1a19-2827-4654-8ae7-9012345678cd` 以 5 / 5 通过。完整产品验证 347 / 347，270 个 JavaScript 文件语法通过。S3 尚未完成，下一批统一设置页原位错误、下载 / 输出校验失败和网络不可用说明。

2026-08-18 S2 样例页 practical-complete：新增项目原创 `document-skewed-source-v1.png`，并用同一来源在浏览器生成文档裁正、严格上传与 500 KB 压缩三种真实本地结果。manifest 现有 8 项、5 个 runtime；最新 Chromium run `faf9f8f7-a6b5-4342-8ec5-7890123456ab` 在 1180 px / 390 px 以 2 / 2 通过，核对 8 卡、16 图、5 runtime、筛选、contain 与无横向溢出。三项结果分别为 `709 × 823 / 100 KB`、`1200 × 800 / 177 KB`、`1536 × 1024 / 290 KB`。完整产品验证 339 / 339，267 个 JavaScript 文件语法通过。当前样例已覆盖主要本地场景和参考边界；PhotoRoom 沙盒结果没有完整可提交身份，继续排除。下一阶段进入 S3 统一错误与恢复体验。

2026-08-18 S2 样例页第一批：新增 [样例与效果展示页](web/examples.html)和 [EXAMPLES_GALLERY.md](EXAMPLES_GALLERY.md)。strict manifest 现登记 5 项：本地即时水平校正、本地老照片基础整理、适合 / 不适合九宫格两项确定性结果，以及明确非产品结果的 Codex 老照片视觉参考。7 个去重静态资产的路径、bytes、尺寸与 SHA-256 全部复算；两项 runtime 输出只在浏览器生成。Chromium run `c7c6c5c4-d3e2-4f10-8b92-4567890123de` 在 1180 px / 390 px 以 2 / 2 通过，核对 5 卡、10 图、2 runtime、contain、筛选与无横向溢出。完整产品验证为 339 / 339，267 个 JavaScript 文件语法通过。页面不读取用户图片、不调用远程 Provider，也不把 Codex 参考冒充产品结果。S2 尚未完成，下一批补文档与上传 / 压缩真实对照。

2026-08-17 S1 结构收敛 practical-complete：新增 [CODE_QUALITY_AND_MODULE_BOUNDARIES.md](CODE_QUALITY_AND_MODULE_BOUNDARIES.md)，记录 `main.js` 的职责、状态所有权和目标边界；错误、结果标签、摘要 / QA / 尺寸 / 比较 facts 已成为独立纯模块；`UT-UPLOAD` 与 `UT-DOC-ARCHIVE` 已进入 strict `WorkflowDefinition`；全部 17 个目录任务由单一 runtime profile 声明执行器和编辑 / 抠图 / 裁正属性，并与任务目录交叉核对。产品验证现为 330 / 330，262 个 JavaScript 文件语法通过。Codex in-app Chromium 最新以 run `d9742750-f7bb-4898-b412-bde47f12fcb9` 重跑五条本地流程并 5 / 5 通过；未改变像素、页面视觉、Provider 或下载合同，也未调用远程图片服务。进一步拆分只由真实需求触发，当前进入 S2 样例效果展示页。

2026-08-17 执行收敛：当前基础能力、组合流程和五条浏览器旅程已形成内部 Alpha 基线，后续不再按“发现一个入口就继续堆一个功能”的方式推进。未来 3–5 周以 [PRODUCT_STABILIZATION_ROADMAP.md](PRODUCT_STABILIZATION_ROADMAP.md) 为短周期执行总纲，顺序固定为“代码质量与结构收敛 → 样例 / 效果展示页 → 统一错误与恢复体验 → 统一工作流下的单场景扩展 → 内部走查与邀请测试决策”。当前正在执行 S1；第一批纯映射与工作流样板已闭合，下一批继续收敛第二个本地工作流和结果 facts。任何 P0 / P1 回归都会暂停新增场景。长期能力证据与发布门禁不变。

2026-08-17 浏览器收口：Codex 内置 Chromium 以 run `53b27d40-83d2-4c82-942d-7c683d64bb30` 完成五条本地自驱流程 `5/5 pass`，覆盖基础编辑、社交构图、老照片整理、上传规格适配和非正方形文档归档；PNG / JPEG 均完成 Blob 捕获、签名、独立重开、尺寸、完整显示、换任务、旧下载失效和焦点清理。该结果建立内部试用基线，不等于真实用户图片质量、操作系统下载目录或公开发布通过。

2026-08-17 本地工具增量：新增 `UT-CONVERT`“图片格式转换”。用户可把当前 JPEG / PNG / WebP 明确转换为 PNG 或 JPEG；JPEG 提供 40%–95% 质量与透明区域填色，PNG 保留已有 Alpha 但不会自动抠图。任务保持完整比例和尽可能原尺寸，输出仍受 8192 px 单边 / 1600 万像素安全上限，并经过现有格式、尺寸、像素、metadata 与哈希重开检查。结果页分别说明格式、尺寸、体积、透明策略和有损边界；转换不等于画质修复。

2026-08-17 本地工具增量：新增 `UT-FIT`“完整图片适配”。用户可把整张图片居中放进方形 1:1、竖版 4:5 或横版 16:9 画布，设置 320–2048 px 最长边、0%–25% 留白和白 / 黑 / 自定义 / 透明底；纯色输出 JPEG，透明输出 PNG。该能力不裁切、不拉伸、不放大小图，也不生成画面外内容。

2026-08-17 任务入口增量：在技术观察和完整任务目录之间新增“按问题快速开始”，用 7 个普通问题描述直接进入压缩、格式转换、完整适配、基础编辑、四角裁正、自然增强或透明抠图。它不分析图片、不自动执行；服务未连接时对应入口保持禁用并显示原因。

2026-08-17 本地流程增量：本地任务结果页新增“用此结果继续处理”。按钮只对当前 QA 通过的本地结果开放，复用前重新核对 byte length 与 SHA-256，再把结果作为新的 `File` 进入来源确认；旧任务、旧下载资格和编辑状态不会沿用。远程抠图与生成式结果暂不直接串联，避免绕过蒙版修正、逐次同意和隐私边界。

2026-08-17 组合流程增量：新增 `UT-UPLOAD`“上传规格适配”。用户一次设置完整保留 / 允许居中裁剪、目标比例、320–2048 px 最长边、100–10240 KB 文件上限和留白色；系统在本机组合现有构图 / 留白、尺寸、JPEG 和压缩能力，并重开核对最终规格。第一版固定 JPEG，不调用任何模型或远程服务；未达体积上限时不会伪装成功。

2026-08-17 组合流程增量：新增 `UT-DOC-ARCHIVE`“文档归档 / 附件”。它复用手动四角裁正与四种文档效果，再在本机生成 JPEG、压缩到 100–10240 KB 附件上限并核对；不执行 OCR、自动找边、曲面展开、去反光或模型修复。

2026-08-17 场景增量：`UT-OLD-PHOTO` 结果页新增“一图多修”。同一裁剪、旋转、尺寸与格式会在本机生成四种公开光色 / 轻度降噪 / 清晰度版本，支持主预览切换、单张下载和 ZIP；该增量不调用 Provider，也不增加划痕识别、重度去噪、失焦恢复、修脸或补全细节声明。

2026-08-17 场景增量：新增 `UT-GRID`“社交九宫格切图”。用户先在同一本地编辑器确定 1:1 总画面，再得到按左到右、从上到下编号的九张 PNG；结果页支持整图总览、单格大图、单张下载和 ZIP。每张均经过容器、尺寸、像素重开、哈希和长度检查；不调用 Provider，不识别主体，不补画或自动发布。

`main@6ecd53c` 记录为从研究优先切换到产品优先的基线。Slice 01–11、SourceCard / Matting baseline、continuous-alpha 定义和候选元数据继续作为只读研究 lineage 保存，但不再自动决定下一次开发；不创建 Slice 12，也不继续为当前 MVP 获取 MODNet / RVM 权重或建设本地模型运行时。

当前总体产品路线以 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) 为准，近期施工顺序与退出条件以 [PRODUCT_STABILIZATION_ROADMAP.md](PRODUCT_STABILIZATION_ROADMAP.md) 为准：

1. 先完成不依赖模型的单图基础编辑闭环：正确预览、裁剪、旋转、尺寸、基础光色、格式 / 质量、比较与可靠导出；
2. 用项目提供图片完成基础编辑器的早期内部可用性走查，先解决导航、编辑理解和下载问题；
3. 再以可替换云端 `BackgroundRemovalProvider` 接入自动抠图，不要求用户安装模型；
4. 自动抠图必须配套最小保留 / 擦除修正、透明预览和纯色换底，并做独立的抠图可用性复核；
5. 只有真实产品数据证明成本、隐私、延迟或离线需求不可接受时，才恢复浏览器 / 本地模型路线；
6. C/U/E/R/O/G/V 与 Release Gate 继续约束公开声明和正式发布，但不阻止开发内部产品试用版和开展不使用参与者图片的早期内部可用性走查。

M2 的 [基础编辑器早期内部走查卡](M2_INTERNAL_WALKTHROUGH.md) 已就绪，包含固定 2 分钟任务、同意话术、主持规则、匿名记录字段和 80% 通过算法；另有不进入 M2 分母的 [2–3 人方法演练工具](INTERNAL_WALKTHROUGH_TOOL.md)。真实参与者场次尚未开始，当前为方法演练 `0/2–3`、M2 `0/5–8`。材料就绪不是走查通过，也不提升任何证据轴。

M0 产品基线已完成，M1a renderer 合同已经接入 R0 页面的本地“保真整理”路径：不可变 `EditState`、100-step 默认 / 200-step 硬上限 history、旋转 / 翻转 / 归一化裁切 / fit resize / RGB 调整 / PNG-JPEG 输出合同，以及“方向归一化 → 变换画布 → 输出画布 → 编码 bytes 独立重开”的执行路径。JPEG / PNG / WebP 的 EXIF orientation 1–8 已由独立容器解析器读取，受控 `ImageBitmap` 解码关闭浏览器自动旋转，再由透明 Canvas 使用冻结矩阵归一化。编码前后像素会核对 Alpha 与可见的预乘颜色；Alpha=0 的 hidden RGB 明确不作可见事实。最终 PNG / JPEG bytes 会拒绝 EXIF / XMP / IPTC / 文本 / 注释类私密 metadata，同时允许把 ICC / sRGB 颜色描述单独留待色彩核验。M1b 页面工作区按变换后的来源比例完整显示图片；固定比例裁剪、自由裁剪、旋转 / 翻转、最长边上限与最终 renderer 共享同一状态。用户已确认基础能力可作为继续工程推进的基线，但这不等于计划中的 5–8 人 M2 走查已经完成。M3a 已建立独立 `BackgroundRemovalProvider`、专用 run/status/cancel API、浏览器 client、PhotoRoom Basic 远程 adapter 与用户逐次同意界面；默认不会外发图片，只有密钥和 `PHOTOROOM_ENABLED=true` 同时存在才启用，fake provider 仅测试注入。请求绑定来源 hash、source / geometry revision 和本次明确同意；成功输出由服务端直接检查 PNG chunk/CRC、8-bit RGBA Alpha、尺寸与动画边界，拒绝、超时、取消、迟到响应和幂等冲突均 fail closed。M3b 的 [ProviderEvaluationPlan v0](PROVIDER_EVALUATION_PLAN.md) 仍冻结 12-source/24-call 最大分母、隐私/质量 no-go 和当前 0 美元授权。当前累计执行 5 次 PhotoRoom 免费沙盒调用：1 次项目原创 synthetic 协议探针和 4 次项目生成挑战图。后四次均返回可复算的 RGBA Alpha，但头发/毛发有光晕、透明玻璃有颜色渗漏、藤椅镂空有明显背景残留；它们带水印、无供应商 receipt header，且均不进入冻结 12-source 分母。当前仍没有正式 Alpha 质量证明。M4b 的最小工程闭环已经接入页面：远程抠图成功后可在降采样预览上用“擦除背景残留 / 保留误删主体”画笔修正 Alpha，支持 200 笔硬上限、撤销 / 重做 / 恢复自动结果；棋盘格会下载透明 PNG，白 / 黑 / 彩底会按直 Alpha 合成写入完全不透明的 JPEG。下载时会回到原结果尺寸重放同一组归一化笔触，并独立检查容器、metadata、尺寸和像素往返。修正不会覆盖 Provider 原结果，也不会再次发送图片；超过 16 MP 或 8192px 单边会在分配全尺寸像素缓冲前明确停止。真实 Chrome / Edge 指针、键盘、触摸和下载 E2E 仍未完成。

修正画布现支持“自动结果 / 修正后”无损对比，以及适应、2×、4× 查看和放大后滚动；这些状态只改变查看，不改变蒙版历史、原尺寸笔触重放与导出尺寸。真实 Chrome / Edge 的对比、缩放、滚动、画笔坐标和下载联动仍需完成 E2E。

结果页恢复动作已按上下文区分：远程结果使用“重新抠图”，远程失败后的再次尝试也先返回设置，清除上一轮同意并要求逐次重新确认；未知状态优先聚焦“查询原任务”。本地结果使用“继续调整”并保留编辑参数。下载路径会显示校验中状态、捕获读取与校验失败并阻止错误文件，只在浏览器下载动作触发后提示“下载已开始”。这些恢复流程不会自动重发图片。产品页与内部浏览器诊断页现在共用同一恢复呈现规则，诊断页会以真实 DOM 焦点自动核对三种恢复场景；真实产品任务的完整键盘与点击 E2E 仍待浏览器交互复核。

结果页现可直接“换个处理方向”：保留已经确认的当前图片和任务资格，清除旧结果、旧下载资格、旧任务配置与活动 run，再聚焦第一个可用任务。设置页和错误页返回任务列表也复用同一状态迁移，不再只切换可见页面而把旧任务留在后台；该导航不会上传图片或自动开始新任务。自驱浏览器验收页现包含 1280×720 保真整理、1440×900 社交构图和 1366×768 老照片基础整理三条本地真实流程，继续核对完整显示、横向溢出、结果换任务、设置返回、焦点与旧下载失效。前两条已有 Chrome / Edge 记录；新增第三条须以新的浏览器报告单独闭合。

明确的远程抠图失败现在把“改用本地编辑”作为主恢复动作：当前来源保持不变，旧远程 run 被状态机退休，本地编辑不上传图片；重新远程抠图降为需再次确认的次要动作。`RUN_UNKNOWN` 不提供该捷径，继续优先查询原任务。该规则已有纯状态与 DOM 呈现检查，但仍不把它写成真实 Chrome / Edge 点击路径已经通过。

产品页已把研究与协议术语从主要操作文案中降级：页脚标为“内部试用版”，任务列表只说明当前可用操作，结果区说明“文件可下载”，透明结果使用用户可理解的透明背景 / 边缘表达；`R0`、工程探针、Alpha 结构和供应商内部 ID 继续保留在文档、代码和诊断边界中。该改动只改善理解成本，不提升任何能力或证据等级。

抠图结果页已补本地处理记录清除入口：只删除已结束 run 的内存记录，进行中或状态未知任务保持可恢复；成功清除不影响当前页面结果和下载，但刷新后不可恢复。界面和回执均明确 `providerDeletion=not_requested`，因此这不是供应商侧删除证明，持久 receipt、账户条款与供应商保留期仍未完成。

蒙版修正区已补实时“最终下载内容”摘要，分别显示结果版本、背景、文件格式与原始导出尺寸；自动结果对比不会改变修正版下载选择。该反馈由独立纯状态映射覆盖，未知背景、视图、尺寸或修正计数会关闭失败。

纯色换底现已从白 / 黑 / 彩色预设扩展为任意自定义颜色：选色后预览立即更新，下载摘要显示精确十六进制色值，JPEG 导出使用同一 RGB 与修正后 Alpha 在原尺寸合成并重开核验。它扩展了内部试用能力，但不替代真实 Chrome / Edge 交互验收、20–30 个许可任务质量评估或 M5 用户走查。

结果区现已增加“并排对比”：桌面左右、窄屏上下同时完整显示原图与处理结果，并分别标注真实尺寸。并排视图只用于观察，蒙版画布在该状态下只读；返回“处理结果”后才恢复修边、缩放和键盘操作，因此比较不会修改蒙版或下载选择。

用户已完成当前基础编辑、抠图修正、换底、比较和下载路径的连续试用，并确认这一基础功能集合暂时够用。从本轮起将它记为**内部试用可用基线**：暂停继续叠加同一结果页的微功能，优先处理页面层级、导航、可读性、响应式布局与真实浏览器回归。该确认是直接产品反馈，不等于 M2 / M5 多人走查、正式质量验收或任何 C/U/R/V 证据升级。结果页现将图片作为主工作区：宽屏仅在“处理结果”视图把蒙版工具放到右侧，原图 / 并排 / 参考视图继续使用完整宽度；窄屏先显示图片和 QA，再显示工具，避免工具挤压结果。

这次冻结只针对已经够用的基础链路，不代表所有图片场景都已完成。任务选择现增加四个场景技能：`UT-PRODUCT`“商品白底图”、`UT-PORTRAIT`“报名照 / 底色头像”、`UT-TEMPLATE`“社交头像与封面”、`UT-OLD-PHOTO`“老照片基础整理”。第四项和社交构图一样可完全本地运行，把四个公开五参数起点与现有裁剪、旋转和导出能力组织成老照片用途；它只做轻度颗粒平滑和局部反差增强，不识别划痕、不恢复失焦、不修脸或补全细节。`CR-RESTORE`“AI 老照片修复（实验）”仍是独立创意任务，只有 Provider policy 选中可直接接收本地图片的生成式编辑服务，并由用户确认“人物、文字、历史细节可能变化”后才可提交。OpenAI direct-upload 实现仍是当前唯一可被选中的候选；MiniMax `image-01` 因官方接口要求在线参考图而只登记、不启用。Codex 内置图片编辑只用于项目原创测试参考，不是网页运行时 Provider。真实模型质量、身份保真、文字保真和费用仍未验证，因此不构成生成式修复质量声明。

`UT-PORTRAIT` 现在具有独立交付构图层：完成抠图后可选择通用方形 `600 × 600`、通用竖版 `480 × 600` 或保留当前像素，按 Alpha 中全部非透明内容的边界手动调整人物大小和上下位置，并选择白、黑、彩色或自定义底色。预览与单张下载共用同一绘制函数；系统不自动识别人脸、眼睛或头顶。当前不透明头像还可生成 `1800 × 1200` 的六张横版排版 JPEG；排版保持当前头像比例、统一白色纸面和间距，并在下载前检查 JPEG 结构、私密 metadata 与独立重开尺寸。所有模板均不写入 DPI / 物理毫米承诺，也不代表任何护照、签证、考试或机构的官方证件规格。

报名照交付层现补齐“一照多用”：同一蒙版、修边和人物大小 / 上下位置同步派生 `600 × 600`、`480 × 600` 两种通用像素画布与白 / 蓝 / 暖红三种背景，共 6 个不透明 JPEG。六卡片预览、主预览切换、单张下载和本地 ZIP 共用同一绘制与下载校验路径，不增加 Provider 调用；任务或结果变化会阻止旧套装进入下载。该能力仍是通用技术组合，不是官方证件照规格或自动人脸构图。

`UT-PRODUCT` 现在增加独立的商品交付布局：修边完成后可在不重发图片、不改变蒙版的前提下，把当前透明前景缩放到画布的 65%–100%，调整左右 / 上下留白，并选择关闭或开启柔和阴影。同一套参数会同时生成通用方形 `1200 × 1200`、通用竖版 `1200 × 1500`、通用横版 `1200 × 900` 与保留当前像素四张预览；用户可切换主预览、单独下载任一版本，或把四张本地重绘且逐张重开的不透明 JPEG 打包成一个 ZIP。ZIP 使用项目内最小 store 编码器，拒绝危险文件名、重复项、空文件和超过 50 MiB 的内容，不增加 Provider 调用。柔和阴影只是透明轮廓的本地视觉层；这些像素模板不理解真实接触面、光源，也不代表任何电商平台规范。

任务页现把这些边界前置为三张动态能力卡：本地基础、远程抠图、生成式 AI。卡片根据各自 provider 状态显示可用数量；生成式模块即使接通，也不会被写成基础能力已经完善。980px 以下改为两列加整行，620px 以下单列，避免状态说明在窄屏被压缩。

页面现有独立的 `UT-ENHANCE`“自然增强”本地任务。它复用同一 renderer、history、完整预览、比较、输出重开和下载合同，提供五个固定且公开的克制预设：自然增强、清亮、鲜明、柔和降噪、原始光色与细节；每个预设只写入用户可见的亮度 / 对比度 / 饱和度 / 轻度降噪 / 清晰度，手动修改后不会被自动覆盖。降噪使用 Alpha 加权的 3×3 邻域并保护明显边缘；清晰度使用受限局部反差增强，二者都在裁剪、缩放和光色之后、编码之前执行，Alpha 原样保留。2048 × 1365 的本地合成性能探针约 291 ms。该任务不上传图片、不识别人像 / 天空、不自动判断照片质量，也不进行白平衡诊断、语义局部增强、失焦恢复或生成式补细节。因此它是内部试用的**确定性可解释增强路径**，不是 `effect.natural-enhance` 的自动效果质量证明，U1 / C1 仍为 0。详细边界见 [DETAIL_ENHANCEMENT.md](DETAIL_ENHANCEMENT.md)。

任务选择前现增加非阻断的本机技术观察：对最长边不超过 256 px 的缩小像素取样计算亮度均值 / 暗亮占比、RGB 通道均值差和相邻像素亮度差，页面以“整体偏暗 / 偏亮”“偏暖 / 偏冷 / 偏绿趋势”“局部变化较少 / 适中 / 较多”呈现，并把规则映射到自然增强的公开预设。用户必须显式点击才会采用建议，系统不会自动生成。该观察不识别内容，不等于 SourceCard 语义、专业曝光 / 白平衡 / 清晰度或画质判断；检查失败不阻断任务，换图会使旧观察失效。纯函数、页面合同与完整产品回归通过，真实浏览器视觉和键盘复核仍待补充。边界见 [TECHNICAL_IMAGE_CHECK.md](TECHNICAL_IMAGE_CHECK.md)。

任务入口现按整体可用性重新分层：主任务目录只渲染可运行任务；在当前已启用 PhotoRoom 的配置下是 5 个场景技能加 7 个自由工具，服务状态变化时数量会按 catalog 动态更新。本地与 PhotoRoom 能力摘要保留在主层。缺少 OpenAI API 时，两项生成式实验移入页尾默认折叠的紧凑列表，不再以 disabled 大卡造成“多数功能不可用”的错觉。AI 或其他能力状态变为可用后会由同一 catalog 自动回到主目录；这项变化没有绕过逐次同意、Provider、任务状态或下载验证。分组、状态恢复、窄屏结构和全产品回归已自动验证，真实浏览器阅读顺序仍待当前页面人工复核。见 [TASK_SELECTION_HIERARCHY.md](TASK_SELECTION_HIERARCHY.md)。

`UT-TEMPLATE` 现以“社交头像与封面”场景呈现，仍在同一编辑合同中提供方形分享 1:1 / 1080、竖版分享 4:5 / 1350、横版封面 16:9 / 1920、竖屏故事 9:16 / 1920、商品方图 1:1 / 1600 五个透明预设；数值表示最长边上限，小图不会被放大，实际输出尺寸始终在左侧预览旁显示。模板切换会真实改变亮框、渲染尺寸与下载结果，用户仍可调整保留位置、旋转、光色和格式；手动改动比例或尺寸后模板高亮会取消。场景另可选一个最多 40 字、最多两行的短标题，支持顶部 / 底部、左对齐 / 居中和浅色 / 深色；通用 7% 安全区、可读底板、编辑预览与正式下载共用同一 Canvas 几何和像素绘制。单次任务完成后会顺序重绘方形、竖版、横版封面和竖屏故事四个版本，四卡同时预览，主预览与主下载保持一致；每张可单独下载，也可在全部哈希和长度复核后写入一个本地 ZIP。任务切换会取消旧套装并回收临时 Blob，整组过程不访问网络。它不是任何平台的永久官方规范，仍不包含主体感知裁切、扩图、贴纸、字体库、多图层设计或发布校验，也不改变 C1 / U1 / 产品发布状态。

内部浏览器诊断现进一步用内存合成图调用与产品相同的 renderer，真实生成并重开 16:9 与 9:16 场景模板、四规格商品图和四规格社交标题图，核对裁切尺寸、标题像素、像素可重开、“小图不放大”和两类 ZIP 闭包。该检查不读取用户图片、不访问网络，也不替代主产品页的鼠标、键盘、长宽图拖动和 Chrome / Edge 版本矩阵验收。

`2026-08-17` 的同源自驱 Chromium 验收又以 run `c3d2e1f0-1234-4abc-8def-0123456789ab` 运行三条本地流程；社交场景输入标题“今天的城市散步”，核对编辑预览、标题安全区 QA、真实 Canvas 合成、Blob 下载捕获和 PNG 重开，得到 `1440 × 810`、`155,447` bytes 的结果。该记录证明标题不是只覆盖在 DOM 上；它仍不等于原生指针、操作系统下载目录或平台发布验收。

任务选择页现分成“按实际用途开始”“自由调整工具”“创意生成”三组，并逐组显示可用数量。场景卡由确定性注册表排序；本地与远程处理边界继续在卡片和设置页说明。这只改善信息层级，不会把不可用服务变成可用，也不会根据图片内容自动推荐任务。

项目现提供 `product-acceptance.html` 作为主页面的浏览器内自驱验收入口：只使用合成演示图，分别在 1280×720、1440×900 的同源 iframe 中走完保真整理和场景模板的真实生成、下载 Blob 捕获与 PNG 重开。该入口不会调用远程服务，也不证明系统下载目录、真实键盘事件或 Chrome / Edge 两个冻结版本已经通过；这些仍须在具备浏览器自动操作和下载观察能力的环境中复核。

2026-08-17 已在当前 Codex 内置 Chromium、独立安装的 Chrome `151.0.7922.138` 和 Edge `151.0.4129.78` 分别实际执行该入口，三次均为两档流程 2/2 通过：输出保持 `1080×1080` 与 `1440×810`，完整显示、PNG 独立重开、横向溢出、换任务、焦点清理和旧下载失效检查全部通过。结果通过仅限 loopback 的 16 KiB 严格内存回报接口取回；接口不接收图片、下载或密钥，LAN 预览禁用。该证据关闭了本地 synthetic 主流程的 Chrome / Edge 引擎与视口行，但自驱页面不能证明原生 Tab / Shift+Tab、物理指针或操作系统下载目录，这三项仍明确 defer；详见 [产品浏览器验收证据](BROWSER_ACCEPTANCE_EVIDENCE.md)。

## 当前冻结的产品环境

- 首轮验证、正式页面和邀请 beta 只以**桌面浏览器**为范围；当前基准为 Windows 桌面 Chromium，Chrome / Edge 最新稳定版是首批候选，精确版本由 `CompatibilityProfile` 冻结。
- 首轮视口候选为 `1280 × 720` 最小目标与 `1440 × 900` 常规审查；键盘、鼠标、缩放、DPR 与可访问性范围须逐项验收。
- Slice 01 已在 Codex 内置 Chromium 的实际 `1280 × 720` viewport 做可见检查，并以本机 Chrome `151.0.7922.138`、Edge `151.0.4129.78` 分别在 `1280 × 720` 与 `1440 × 900` 完成自动化主路径；空目录与 503 错误路径也已在真实浏览器注入复验。该结果只覆盖本次研究审阅 surface，不计入 R1-product 或未来正式产品的兼容支持；详见 [research/SLICE_01_EVIDENCE.md](research/SLICE_01_EVIDENCE.md)。
- 手机、平板、iPhone / HEIC、Safari、Firefox、触摸专属交互与完整响应式产品全部后置，不进入首轮 R1-product、O1 或 V1 声明。
- 同 Wi-Fi 手机入口继续保留为 R0 工程探针；它不是移动产品、正式兼容范围或发布证据。

## 当前快照

| 维度 | 当前状态 | 数量 / 等级 | 这代表什么 |
| --- | --- | --- | --- |
| 产品工程基线 + M3a Provider 边界 | M0 / M1a 完成；M1b 构图与导出已接入；M3a 接口、PhotoRoom adapter 与 fake provider 回归已完成 | 产品定向测试覆盖本地编辑、远程协议、显式启用与失败关闭；archived research 验证 Slice 01–11 | 基础编辑器保持本地可用；抠图卡只在服务明确启用后可运行，并要求逐次发送同意。真实供应商调用、质量评估、M2 多人走查和完整 Chrome / Edge E2E 仍未完成 |
| 历史研究快照 | SourceCard + Matting baseline、exposure signals、continuous-alpha、获取治理及候选运行时元数据定义均已闭合并转为 archival lineage | `6 synthetic sources / 12 assets / 10 registered upstream metadata texts / model HEAD 0 / model GET 0 / natural images 0 / model bytes 0 / installed candidate deps 0 / results 0` | SourceCard 语义 exposure 仍 unknown；simple matte 仍是下限。MODNet / RVM 未下载、安装或推理，当前 MVP 不继续该路线；需要本地 / 离线模型时必须按新产品版本重新立项 |
| 工程探针 | 可运行 | R0 | 可检查上传预检、任务状态、旧响应失效、失败门控、对比与下载等工程行为 |
| 研究审阅工具 | 可运行的方法演练 | `surface.research-review` Slice 01；3 fixtures / 18 assets | 可检查严格 catalog、六图加载、视图切换、结构化初判、锁定与解盲；提交不持久化，且不授予 C1、U1/E1 或 R1 |
| Slice 02 无界面参考设施 | 可运行的合同 / 隔离演练 | 4 contracts；2 suites × 5 partitions；10 fixtures / 30 assets | 只接受窄范围合成 fixture；全部资产 catalog-denied，仓库可见 holdout 不能用于未来 C1，simple baseline 不是产品 fallback |
| Slice 03 无界面研究设施 | 可运行的格式 / observer / 密封仪式演练 | 1 observer contract；15 format rows / 15 profiles；2 manifests；25 fixtures / 25 assets；6 seal schemas | 所有格式行均 `productSupport=false`；只使用开放项目原创校准夹具，正式 holdout 为 `not-created`，mock rehearsal 不构成密封证据 |
| Slice 04 metadata 研究设施 | 候选来源锁 / 预注册可验证 | 1 candidate lock；15 format rows；2 contracts；2 operation-specific five-partition plans；1 QA profile；2 preregistrations；1 seal intent | 10 records / 7 schemas，仅 metadata；normalize / export 每项 lifecycle 为 30 / 30 / 18 / 18 / 0，初始 C1 只计 sealed 30 + 18 = 48；artifact schema / oracle、runner、durable ledger、trust、角色 assignment / approval 均未建，全部格式 `productSupport=false`，非 Gate B |
| Slice 05 定义与 smoke | 定义已冻结；真实 smoke 已关闭且未过门 | definition：25 schemas / 6 manifests / 108 sources / 54 inputs / 54 gold；smoke：36 attempts、116 files、0 artifacts | normalize `6 pass / 12 non-pass`，export `9 pass / 9 non-pass`；两项 applicable attempts 共 18 次均以 `S05_OUTPUT_ORACLE_REJECTED` 结束，normalize 另有 3 次预期 `S05_INPUT_SRGB_REQUIRED`、实际 `S05_INPUT_CHUNK_PROFILE_INVALID`。两份 Gate B decision 均为 `denied-not-entered`，calibration 禁止；详见 [Slice 05 定义与真实 smoke 证据](research/SLICE_05_EVIDENCE.md) |
| Slice 06 诊断结果 | 唯一 registered invocation 已关闭；post-run validator 逐 byte 重算通过 | 152 files / 34 dirs / 583,198 bytes；24 requests + 24 claims + 24 results；84 ledger events；18 quarantine outputs；2 summaries + 2 closes；0 artifact / calibration / formal / holdout | result-tree SHA-256 `4c82a65083ccc1675a65d632010360d991171255ec5ef74b4a50092f701dd146`；normalize summary `70f80c7a…1900f`，export `1b60c9f1…829a0`；两项均 `9 oracle-non-pass + 3 preflight-pass`，Gate B authority=false、calibration=false、全部证据轴=0。详见 [Slice 06 evidence](research/SLICE_06_EVIDENCE.md) |
| Slice 07 Gate-B 结果 | 唯一 registered smoke 已关闭；两项均 denied | 150 files；36 requests/results；18 closures；result tree `80b242de…cf9c` | normalize/export 各 9 pass + 9 non-pass；applicable 18/18 oracle pass，rejection 0/18 exact pass，实际码均 `ERR_INVALID_ARG_TYPE`；calibration=false。详见 [Slice 07 result evidence](research/SLICE_07_RESULT_EVIDENCE.md) |
| Slice 08 结果 | 唯一 invocation 已关闭为 incomplete protocol failure | result tree `2dd9e53f…da0d6`；2 files / 3,779 bytes；normalize first request + started event；0 terminal / output / closure / oracle / summary / decision；export 未启动 | driver 错把 Slice 05 `goldRecordId` 读取为 `id`，在 worker 前 fail closed；中央验证 partial tree 为 0 issues，但没有 Gate B decision，calibration=false；详见 [Slice 08 evidence](research/SLICE_08_EVIDENCE.md) |
| Slice 09 结果 | 唯一 registered smoke 已关闭；两项 Gate B 均 pass | result tree `2f6bc6c2…cf451`；186 files / 29 dirs / 312,983 bytes；36 requests + claims + terminal results；18 closures；108 ledger events | normalize/export 各 18 / 18 pass、6 / 6 sources 3/3 deterministic；两 decision 均 `gateBPassed=true`，但 `calibrationAuthorized=false`、C1=0、productSupport=false。详见 [Slice 09 evidence](research/SLICE_09_EVIDENCE.md) |
| Slice 10 结果 | definition freeze `2026-08-15T18:03:39.680Z`；result tree `225847…ee9e`；4 files / 6,919 bytes | planned 96 / 288；actual normalize 1 terminal、export 0；pass 0 / protocol-failed 1 | `S10_EXPECTED_OUTPUT_INVALID` 在 worker 前触发；terminal 又错误记录 `workerInvoked=true`，central 以 `RESULT_WORKER_LIFECYCLE_INVALID` 拒绝。详见 [Slice 10 evidence](research/SLICE_10_EVIDENCE.md) |
| Slice 11 结果 | `@0.11.0`；definition freeze `2026-08-15T23:01:50.529Z` | planned 96 / 288；actual attempts 0；normalize startup failure，export 未启动 | 两文件结果树 SHA-256 `a638a17a…d3689`；相同 runtime JSON 因 freeze 不含换行、start check 含换行而误判 drift；central validator 将该精确形状封闭并拒绝 replay。详见 [evidence](research/SLICE_11_EVIDENCE.md) |
| SourceCard + Matting baseline | 3 个项目原创 `MATTE-GT dev/calibration` fixture | SourceCard technical 已知、quality/subject/content unknown；MATTE-SIMPLE 固定 10/88 | 4-file result tree `64227c66…04999`；hard/hole exact，soft-edge 明显硬化；只作 comparison lower bound。详见 [evidence](research/SOURCECARD_MATTING_BASELINE_EVIDENCE.md) |
| SourceCard exposure signals + Matting candidates | 4 个原创亮度 calibration + 3 个 MATTE-GT 应用；2 candidates | exposure signal 4/4；MODNet Apache-2.0、RVM GPL-3.0；两份权重均未下载 | `quality.exposure` 继续 unknown；候选只完成精确来源/许可/运行禁区登记，C1 与产品支持不变。详见 [evidence](research/SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md) |
| Continuous Alpha results-zero definition | 6 个原创 synthetic source / 12 assets / 4 strict schemas | 每 candidate 6×3=18；两候选 planned 36；threshold not-frozen；results 0 | binary IoU 与 boundary MAE 分开，禁止多数票和 valid rerun；自然人像扩展未创建。详见 [evidence](research/CONTINUOUS_ALPHA_EVALUATION_EVIDENCE.md) |
| Matting acquisition + natural-person governance | 4 strict schemas / 5 records / 10 files | dev/holdout planned 24/24；defect/defect-holdout 12/12；actual images/models/dependencies/results 全 0 | real user upload、抓取图片、不明权利与未成年人均禁；MODNet locator unresolved，RVM bytes/SHA/runtime/GPL 决策未闭合。详见 [evidence](research/MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md) |
| Matting runtime metadata results-zero definition | 4 strict schemas / 5 records / 10 files / 33,076 bytes | 10 registered official source texts；HEAD/GET/model bytes/dependencies/images/results 全 0 | MODNet 官方 folder 已解析但 object/hash 未解析；RVM requirements 有 direct pins 但没有 Python/platform wheel/transitive hash/SBOM；safe loader 未实现，请求模板未签发。详见 [evidence](research/MATTING_RUNTIME_METADATA_EVIDENCE.md) |
| 原子能力证据 | 未取得 | C1：合同 `0`；覆盖域 `0 / 9` | 尚无版本化 `CapabilityContract` 在独立 holdout 上通过；域覆盖率不代替合同数 |
| 实用效果证据 | 未取得 | U1：效果版本 `0` | 没有透明抠图、纯色换底或自然增强达到发布前质量门槛；报名头像是后置场景，不计作效果 |
| 创意效果证据 | 未取得 | E1：效果版本 `0` | 历史材料只有 E0 线索，没有冻结配方的稳定创意效果 |
| 研究管线闭环 | 未取得 | R1-pipeline：目标版本 `0` | 尚未用真实候选引擎完成可重复的处理、QA、产物与失败留证 |
| 验证界面闭环 | 未取得 | R1-product-validation：界面版本 `0` | 当前页面没有在冻结研究界面上通过真实能力与失败恢复验收；即使取得也不等于正式页面可发布 |
| 发布界面闭环 | 未取得 | R1-product-release：界面版本 `0` | 尚无正式桌面浏览器界面版本通过完整 acceptance matrix；首轮发布公式只接受冻结桌面范围 |
| 运维证据 | 未取得 | O1：`O1Profile` `0` | 持久任务、结构化日志、trace、metrics、告警 / runbook、成本、p50/p95、资源、并发与故障恢复均未冻结和验收 |
| 治理证据 | 未取得 | G1：治理范围 `0` | 候选代码、权重、数据、隐私、保留删除与日志边界尚未逐项完成审计 |
| 用户价值 | 未取得 | V1：`V1Scope` `0` | 尚无绑定效果版本和界面版本的目标用户完成与结果保留证据 |
| 公开发布资产 | 未取得 | Release Gate：allowlist `none`；登记 `0`；批准 `0` | 尚未建立冻结公开资产清单，也没有来源 / 参考 / 结果组合被批准为正式用户可见样例 |
| 产品发布 | 不允许 | `research-only` | 不应把当前链接、任务卡或演示结果称为正式产品、AI 推荐或已通过 QA 的能力 |

旧文档中的单一 `R1` 从本轮起先拆为 `R1-pipeline` 与 `R1-product`；其中 `R1-product` 又必须绑定具体界面版本，并区分研究验证范围 `R1-product-validation` 与正式发布范围 `R1-product-release`。当前三者均为 0，因此旧口径下的 R1 也仍为 0。未经范围限定的 `R1-product` 只表示证据轴名称，不能用于发布判定。各等级的完整定义见 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md)。

## R0 工程探针证明与不证明的内容

### 已经能够证明

- 单张图片的格式、大小、像素等输入预检可以运行。
- 来源确认、运行编号、任务状态、重复提交、换图和过期响应可以被工程化处理。
- 允许的本地画布操作能够产生真实文件，而不是把固定样图伪装成用户结果。
- 未连接真实服务、任务失败或结果关联不完整时，可以阻止伪成功与错误下载。
- 当前代码可作为未来真实能力接入前的状态机和接口探针继续保留。

### 尚不能证明

- 页面已经理解图片内容或生成了真实 `SourceCard`。
- 当前任务排序是基于图片内容的 AI 推荐。
- 当前亮度、对比度、饱和度、轻度降噪、清晰度和裁切足以证明系统能自动判断照片问题或达到自然增强的真实图片质量门槛。
- 已经具备主体检测、Alpha Matting、发丝 / 透明物边缘处理、透明 PNG 或可信换底。
- 文件 hash、运行编号和响应完整性检查等同于任务级图片质量 QA。
- 当前创意调用已经达到稳定效果、成本、治理或用户价值门槛。
- 当前页面可公开发布，或其中任何参考图 / 结果图已通过 Release Gate。

因此，当前页面及其手机局域网入口只能称为“R0 工程探针”或“工程预览”。

## 项目结构与边界

项目从本轮起统一采用四层结构：

```text
工程底座
  → 九类原子能力（CAP-01 ～ CAP-09）
    → 用户效果
      → 场景配方
```

- 九类能力及其依赖、输入输出和扩展规则见 [CAPABILITY_MAP.md](CAPABILITY_MAP.md)。
- 候选引擎、版本、权重、许可、硬件、成本与证据状态见 [CAPABILITY_REGISTRY.md](CAPABILITY_REGISTRY.md)。
- 用户效果与场景配方见 [TASK_CATALOG.md](TASK_CATALOG.md)。
- 证据等级、夹具隔离和发布公式见 [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md)。
- 可填写的夹具、预注册、验收矩阵与证据记录见 [RESEARCH_RECORD_TEMPLATES.md](RESEARCH_RECORD_TEMPLATES.md)。
- 数据流、安全、保留删除和远程服务前置门见 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md)。
- 用户研究的抽样、分母、尝试次数、数据处理和 V1 判定见 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md)。
- 市场比较口径与当前研究空缺见 [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md)。
- 逻辑系统组件、状态归属、持久化与恢复原则见 [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)。
- UI surface、桌面交互与可访问性范围见 [UI_SURFACES_AND_ACCESSIBILITY.md](UI_SURFACES_AND_ACCESSIBILITY.md)。
- 日志、trace、metrics、错误、性能、告警与问题定位见 [OBSERVABILITY_AND_OPERATIONS.md](OBSERVABILITY_AND_OPERATIONS.md)。
- 浏览器、设备、文件、色彩与测试分层见 [QUALITY_AND_COMPATIBILITY.md](QUALITY_AND_COMPATIBILITY.md)。
- 部署、版本迁移、灰度、回滚与恢复见 [DEPLOYMENT_RELEASE_AND_RECOVERY.md](DEPLOYMENT_RELEASE_AND_RECOVERY.md)。
- 第三方来源及本地原创边界见 [UPSTREAM.md](UPSTREAM.md)。
- Slice 05 机器定义、runtime、真实 smoke non-pass、hash 与非证据边界见 [research/SLICE_05_EVIDENCE.md](research/SLICE_05_EVIDENCE.md)。
- Slice 06 两阶段 diagnostic characterization 授权、24 次计划分母、Phase B 协议、Phase C results-zero 定义与禁止边界见 [research/SLICE_06_CONTRACT.md](research/SLICE_06_CONTRACT.md) 和 [research/slice-06/README.md](research/slice-06/README.md)。

“证件照”“商品图”“旧照修复”等不是与 Matting、合成并列的底层能力，而是场景配方。普通报名头像可以在基础能力成熟后研究；任何官方证件 profile 仍需单独绑定地区、签发机关、证件类型、提交渠道、规则版本和官方来源，不属于当前发布承诺。

## 历史研究履历与产品转向

1. **已完成文档层**：状态、能力地图、注册表、效果 / 场景目录、证据、数据、安全、用户研究和来源账本已经相互引用；这不等于研究资产或能力证据已建立。
2. **已完成 Slice 01 方法层**：建立研究目录、schema、rights、严格 manifest validator、3 个原创 `MATTE-GT dev/calibration` fixture、18 个图层资产、catalog allowlist、只读本地资源服务和桌面研究审阅入口；这些只证明研究设施一致性，C1 仍为 0。
3. **已完成 Slice 02 合同 / 隔离层**：冻结 `CC-CAP02-NORMALIZE@0.2.0`、`CC-CAP02-EXPORT@0.2.0`、`CC-CAP03-SOURCE-CARD-V0@0.2.0` 与 `CC-CAP04-MATTE-SIMPLE@0.2.0`；加入无第三方依赖的本地参考适配器，并为两套 suite 建立 dev、holdout、defect/calibration、defect/holdout、escape 结构夹具。所有合同仍为 C1=0；仓库可见 holdout 只演练隔离，不能复用为质量证据。
4. **已完成 Slice 03 格式 / observer / 密封仪式准备层**：按 [Slice 03 范围合同](research/SLICE_03_CONTRACT.md) 冻结 15 行 `NORMALIZE-DELIVER` 格式政策矩阵、逐行 profile、独立 normalized-bytes technical observer，以及仓库外密封仪式 schema / mock rehearsal；只建立项目原创 `dev/calibration`、`defect/calibration` 格式夹具。JPEG / WebP 仍为 probe 后拒绝，所有格式行均 `productSupport=false`；正式 holdout 保持 `not-created`。验收见 [Slice 03 证据记录](research/SLICE_03_EVIDENCE.md)。
5. **已完成 Slice 04 候选锁 / 预注册 metadata 层**：按 [Slice 04 范围合同](research/SLICE_04_CONTRACT.md) 锁定 Sharp `v0.35.3`、Windows x64 npm / native bundle、`sharp-libvips@1.3.2` bundled libvips 来源与 libvips `v8.18.3` 上游边界；六个 npm registry tarball 只在仓库内未提交的临时 `.tmp/slice04-artifacts` 计算 SHA-256 后删除，没有解包、执行、安装或保留。Slice 04 冻结 15 行格式矩阵、两份 metadata-only 合同、normalize / export 两份各自 30 / 30 / 18 / 18 / 0 的 lifecycle plan、QA、两份预注册和 seal intent；每项初始 C1 只计 sealed 48，3 / 3 repeats 必须全过。Slice 03 observer / seal 仅作 design / envelope reference；正式 oracle、runner、durable ledger、trust、角色 assignment / approval 与所有像素仍为 `not-created`，验收见 [Slice 04 证据记录](research/SLICE_04_EVIDENCE.md)。
6. **已完成 Slice 05 定义冻结**：按 [Slice 05 合同](research/SLICE_05_CONTRACT.md) 建立 `REG-NORM-SHARP@0.5.0` installed runtime closure、normalize / export 两份 `@0.5.0` contract、25 份 strict schema、6 份 operation-specific manifest、108 个项目原创来源、54 份 export input artifact、54 份 independent gold、adapter / isolated worker、independent oracle、named hardware、local runner / fault semantics、Gate B plan 与两份开放 calibration 预注册。机器定义于 `2026-08-15T04:23:38.389Z` 冻结，definition index `contentHash=d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271`；冻结时 `results/` 不存在，定义验收见 [Slice 05 证据](research/SLICE_05_EVIDENCE.md)。
7. **Slice 05 已关闭为 non-pass，禁止 calibration**：定义基线提交 / 推送后，唯一注册的真实 smoke 形成 36 份 request、36 份 claim、36 份 terminal result 与 72 个 durable ledger event，但没有 artifact。normalize `6/18` pass、export `9/18` pass；两份 Gate B decision 均为 `denied-not-entered`、`calibrationAuthorized=false`。真实 smoke review 为 `P1/P2/P3=0/2/0`：两项 P2 分别是 generic oracle rejection 的诊断 / 确定性留存缺口，以及 normalize missing-sRGB error code 与预注册不符。首次未注册调用因 sandbox `mkdir EPERM` 在任何 request / claim / result 前停止；后续获批调用是唯一注册 smoke，不是选择性重跑。durable 证据只允许结论“worker IPC 返回并通过严格响应校验的 output bytes，随后被 precommit independent oracle 拒绝”；进程退出确认未持久化（`workerExitConfirmed=null`），具体 oracle 子因保持 unknown，不猜测、不重跑。
8. **已完成 Slice 06 Phase B / C 定义与唯一 registered diagnostic**：冻结定义所在提交先推送并在 clean admission 下通过，随后一次 invocation 顺序完成 normalize / export 共 24 attempts、零 replacement。18 个 applicable output 的 bytes、pixels、classification、oracle outcome、worker runtime 都 3 / 3 一致，exit 与 telemetry 完整；两项 sentinel 各 3 / 3 精确拒绝。post-run validator 对 152-file tree、84-event ledger、所有交叉引用与独立 oracle 重算为 0 issues。
9. **Slice 07 唯一 registered smoke 已关闭，不得重跑 Slice 05–07**：36 / 36 terminal，18 个 applicable 全部通过 candidate + independent oracle；18 个 rejection 因 driver 未传递 frozen classification fields 而统一得到 `ERR_INVALID_ARG_TYPE`。两项 Gate B 均 denied，calibration=false。任何修复必须新版本、新定义、新注册结果。
10. **Slice 08 已关闭为 protocol-failed，不得重跑**：results-zero definition 于 `2026-08-15T13:37:23.038Z` 冻结并以 commit `a8bcbe57278c7fd2620c16b39f1a939a1e3ccf89` 推送。唯一 registered invocation 写入首个 normalize request 与 `attempt-started` 后，actual-case driver 因把 Slice 05 的 `goldRecordId` 错读为 `id` 而在 worker 前抛出 `S08_CASE_MATERIAL_INVALID`。partial tree 为 2 files / 3,779 bytes，SHA-256 `2dd9e53fcd2163913a47c16f92f9a31733ef3ffc491949e6c1a31464774da0d6`；0 terminal / output / decision，export 未启动。central validator 对该不可重放 partial tree 返回 0 issues；这只证明失败记录一致，不是 Gate B pass。任何修复必须进入新版本、新定义和新完整分母，calibration 继续禁止。
11. **Slice 09 唯一 registered smoke 已关闭并推送**：results-zero definition 于 `2026-08-15T15:17:03.776Z` 冻结并以 commit `36d92844a2ea58113567a24482e5297ba8cdd9ab` 推送；随后唯一注册运行形成 36 / 36 terminal pass、18 identity-bound artifact closures 与两条 54-event ledger，结果 commit 为 `c91014c6bef8878277a8520d003b10684972087b`。normalize / export 各 9 applicable + 9 exact rejection pass，6 / 6 sources 均 3/3 deterministic，两项 Gate B 均 pass。按当时路线，calibration 原需后续切片另行冻结和授权；当前路线已将其归档且不创建 Slice 12。不得重跑或补跑，C1=0、productSupport=false。
12. **Slice 10 唯一 registered calibration 已关闭，不得重跑**：results-zero definition 已先以 commit `86543a47bb5eea6a287861bf587fbffc3014ba1f` 推送；唯一 invocation 随后只注册并终结首个 normalize attempt。完整 gold expected 被直接传给只接受 12 个 canonical output keys 的 Slice 07 adapter，故以 `S10_EXPECTED_OUTPUT_INVALID` 在 `spawnWorker()` 前停止；export、output、oracle、artifact、summary 与 runtime-end 均为 0。不可变 terminal 又把该 pre-worker 路径误记为 `workerInvoked=true`，central 因 `RESULT_WORKER_LIFECYCLE_INVALID` fail closed。4-file result tree SHA-256 为 `225847d125c58ee6affaa087746101d469d7ae04109504f0bd6781f593b9ee9e`。不得补跑剩余 287 slots；任何修复必须进入 Slice 11 / `@0.11.0` 新定义。
13. **Slice 11 唯一 registered invocation 已在任何 candidate attempt 前关闭，不得重跑**：definition 先以 commit `33f24395e9ad2cd672d156a6f491e02118a62ed1` 推送。运行只写入 normalize operation claim 与 runtime start observation（937 + 28,684 bytes；result tree `a638a17afa69ab41015181b61ef7a64fa58e9057a9f64f7bc29bfe2f35dd3689`），随后以 `S11_RUNTIME_START_DRIFT` 停止。解析后的冻结/观测 runtime JSON 逐字段相同；误判来自 freeze SHA 对 canonical JSON 不加换行，而 start checker 加换行。actual request / attempt / worker / pixel / terminal / export 均为 0。central validator 将这一精确两文件形状封闭为 `startup-runtime-drift` 并拒绝 replay；Slice 11 fake-only tests为 43 / 43，全量验证 522 / 522。该失败不授予 C1 或产品支持，也不再触发 Slice 12。
14. **研究切片在此转入 archival 状态**：不创建 Slice 12，不修补或重跑 Slice 05–11，不以继续扩 schema / runner / seal 作为产品进度。
15. **当前工程主线切到基础编辑器**：正确预览、裁剪、旋转、尺寸、基础光色、格式 / 质量、比较与可靠导出；先取得内部产品试用版的真实用户流程，再讨论公开能力等级。
16. **抠图进入第二阶段**：先冻结可替换云端 Provider 边界，再增加透明预览、保留 / 擦除修正和换底。基础编辑器在 Provider 不可用时仍必须完整可用。
17. **本地 Matting 研究按需恢复**：只有实际使用数据证明云端成本、隐私、延迟或离线需求构成阻塞，才另行恢复候选权重、自然图片治理与 continuous-alpha 对测；simple baseline 永远只作下限。
18. **正式发布仍使用完整证据门**：当内部产品试用版已证明任务有价值并准备公开 beta 时，再冻结相应 C1、U1 / E1、R1、O1、G1、V1 与 Release Gate 范围；这些门不再作为开始构建产品 UI 的前置条件。

手机 / 平板产品、其他桌面浏览器、多张来源图的逐张任务与合集交付、自由画布、公共部署以及未经独立验证的官方证件 profile 继续后置。单张来源图的四规格商品交付套装已纳入当前工程能力。

## 状态更新规则

- 任何等级只能引用一份冻结的 `EvidenceManifest`；口头判断、页面截图、单次成功或自动测试数量不能升级等级。
- 调整能力合同、模型 / checkpoint、配方、关键参数、QA profile、界面 build、适用分母或用户研究范围后，相关证据版本必须重新计算；不得沿用旧版本等级。
- `C1` 只证明原子能力；`U1` / `E1` 只证明一个效果；`R1-pipeline`、`R1-product-validation`、`R1-product-release`、`O1`、`G1`、`V1` 与 Release Gate 均不能由前述等级自动推出。
- 依赖能力失效时，引用它的效果和场景自动回退为不可发布状态。
- C1 以通过的合同版本计数，同时单独报告九类 CAP 域覆盖；U1 / E1 以效果版本计数；R1 以目标与 build 版本计数；O1、G1、V1 分别以冻结 profile / scope 计数。不同单位不得相加或互相替代。
- Release Gate 状态必须同时记录 `allowlist_version`、登记资产 / 组合数和批准数；清单尚未冻结时不得用 `0 / 0` 表示全部通过。
- 每次升级本文件时，应同时记录证据 manifest ID / 版本、目标版本、核对日期和责任人；没有可追溯证据时维持 0。
