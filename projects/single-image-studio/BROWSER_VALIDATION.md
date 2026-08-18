# 浏览器与运行验证

> 文档角色：R0 工程探针验证记录，不是图片能力、产品闭环或发布验收。当前状态见 [STATUS.md](STATUS.md)。  
> 日期：2026-08-12  
> 当前范围修正：文中的平板、390px 与手机补证项保留为历史 R0 计划，不再属于首轮产品门槛；首轮正式证据只覆盖冻结桌面浏览器范围。
> 结论：本地服务与自动化工程验证通过；交互截图证据延期，不作浏览器人工验收已通过的声明。

## 2026-08-16 产品链增量

2026-08-18 的当前补充：S5 [内部质量入口](web/quality-hub.html)、[内部体验走查台](web/internal-walkthrough.html)与[本地匿名汇总页](web/internal-walkthrough-summary.html)已在 Codex in-app Chromium 以 1180 px / 390 px 完成工具 QA `2/2`，run 为 `e4a3e486-9011-42d3-b376-778899aabbcc`。它检查 13 个登记页面 / 五类角色 / 真实 task 关联，并逐路由要求 `HTTP 200 + text/html`；同时覆盖真人分母边界、同意门、两个固定任务、两份 JSON 的真实本地文件导入、去标识汇总、清空与无横向溢出。不是真人场次，真实方法演练仍为 `0/2–3`。当前 `verify:product` 为 `373/373`，语法检查覆盖 285 个 JavaScript 文件。完整边界见 [INTERNAL_WALKTHROUGH_TOOL.md](INTERNAL_WALKTHROUGH_TOOL.md)和[页面关联规则](PAGE_AND_CAPABILITY_REGISTRY.md)。

- 本地“保真整理”已经改走 `editor-session.js` → `editor-canvas-renderer-v1`，页面表单可提交比例、旋转、翻转、亮度、对比度、饱和度、PNG / JPEG 与 JPEG 底色。
- 新增 [浏览器输出诊断页](web/browser-diagnostics.html)：它只在内存生成项目原创 synthetic pixels，不读取用户图片、不访问网络；会用浏览器 Canvas 编码 PNG / JPEG，再执行 metadata 扫描、独立重开和像素合同核验。
- 当前产品自动测试范围为 `41 files / 231 assertions`，动态语法检查覆盖 `215` 个脚本。编辑舞台按变换后的来源比例完整显示图片；固定比例只移动亮色裁剪框，自由裁剪可移动、缩放并通过左 / 上 / 宽 / 高范围控件精调，裁剪矩形与 renderer 使用同一 normalized crop。无裁剪操作时预览退出键盘焦点。自定义尺寸只显示一个最长边上限，宽高会随当前裁剪比例重新推导；页面明确区分上限框与预计实际导出，而且调整像素上限不会改变完整图片舞台的显示大小。商品 / 社交 / 老照片四规格与报名照六规格卡片在宽屏按 4 / 4 / 4 / 3 列、980px 两列、620px 单列显示；九宫格在所有断点保持 3 × 3，以免发布顺序被响应式重排。各套装分别复用同一构图、标题、几何设置或人物位置；本地 ZIP 对文件名、重复项、空内容和 50 MiB 上限 fail closed。社交、九宫格、报名照与老照片套装生成期间会禁用重复下载，任务或来源变化时旧输出不能进入交付。
- 外部页面控制与截图入口仍不可用，但同源 `product-acceptance.html` 已在 Codex 内置 Chromium 中驱动真实 DOM 控件、Canvas 编码、Blob 下载捕获和图片重开。最新标题场景 run `c3d2e1f0-1234-4abc-8def-0123456789ab` 为 3/3 pass；其中社交标题结果为 `1440 × 810`、`155,447` bytes。该证据不包含原生键盘 / 指针、屏幕截图或操作系统下载目录观察，不能与这些项目混写。

可复现运行基线（最近复核 `2026-08-16T13:25:40.7765920Z`）：在项目目录执行 `npm.cmd start`，canonical server 为 `http://127.0.0.1:4177/`。同一 server 返回主页面与 `/browser-diagnostics.html`，主页面 HTTP 200、UTF-8 11,455 bytes，并包含 `editor-workspace`、`editor-crop-box` 与 `editor-output-size`；当前 `main.js` 也以 HTTP 200 提供“自由裁剪”“最长边上限”和“不改变左侧画布显示大小”逻辑，且不再交付旧的最大宽度 / 最大高度双输入。这只证明路由和静态交付可运行，不证明控件布局、拖动、键盘路径、Canvas 像素或下载在浏览器中通过。

## 已验证

- `npm.cmd run test:product`：16 files / 114 tests 通过；完整 `npm.cmd run verify` 另有 archived research 483 pass / 9 intentional skips。
- `npm.cmd run check`：服务端、手机预览入口与浏览器脚本语法检查通过。
- 本地服务 `GET /api/status` 返回 200；未配置密钥时明确返回 `available=false`，网页不会启用创意任务。
- 注入式上游测试证明 `/v1/images/edits` 请求结构、`gpt-image-2`、multipart 图片输入、request ID、成功 / 失败 / unknown 状态与输出指纹处理；没有真实服务调用证据。
- 同一客户端运行编号与同一输入会复用已有任务；同编号不同输入返回冲突，不会自动重复付费请求。
- 来源 revision / hash、校验 ID、分析 ID 与 run ID 共同阻止换图后的旧响应回填。
- 下载只有在当前 run、工程完整性检查、输出格式 / Alpha / hash / 大小契约同时成立时才解锁；任务内容 QA 尚未实现。
- 手机预览会自动选择真实 Wi-Fi 私网地址，拒绝 wildcard、公网 IP、主机名、虚拟网卡与错误端口；该模式忽略已有 API 密钥，并在读取生成请求正文前拒绝 AI 接口。
- 普通 HTTP 局域网页面不依赖 `crypto.subtle` 或 `crypto.randomUUID`：来源哈希与运行编号都有经过标准向量测试的安全兼容路径。
- PNG、JPEG 与 WebP 会先从文件头读取尺寸；超过 4000 万像素的图片会在完整解码和哈希前停止，降低手机内存溢出风险。

## 未取得的证据

本次桌面环境的 in-app Browser 控制连接在初始化阶段报“kernel assets”路径不可用。已按浏览器技能的故障流程检查并重连，仍无法取得可控制 tab，因此没有自动点击、下载或截图证据。

以下项目保持延期：

- 1280×720、平板、390px 三个视口截图。
- 合成演示图从上传确认到本地结果下载的浏览器完整录制。
- Tab / Shift+Tab、Enter / Space、焦点返回、reduced-motion 的实机观察。
- 有 `OPENAI_API_KEY` 的真实创意生成浏览器证据与结果 QA（当前环境未配置密钥；即使补跑单次调用，也不能把注入式测试或单次成功升级为 R1-pipeline / R1-product）。
- 真实手机上的点击、相册选择、结果下载与 390px 截图；本轮只完成了局域网 HTTP 探测和代码级小屏契约，不能把它写成手机人工验收已通过。

## 恢复条件

若要补完这份历史 R0 记录，浏览器控制连接恢复后可启动 `npm.cmd start`，打开 `http://127.0.0.1:4177/`，按空态 → 合成演示图 → 同意 → 任务卡 → 保真设置 → 结果三态 → 下载依次补证。平板、390px 和手机只作为额外工程观察，不计入首轮产品证据。真实创意链必须在服务端提供可用密钥后另跑一次，记录 request ID、输出 hash 与失败样例，但单次成功仍不能取得 E1 或 R1-product。
