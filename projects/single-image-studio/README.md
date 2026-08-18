# Single Image Studio

> 一个从能力研究转入产品实现的单图工作室。当前先完成真实可用的基础编辑与导出，再用可替换能力增加自动抠图；历史研究继续约束公开声明，但不再代替产品学习。

源码仓库：[yydshly/0809_githubcode_study · projects/single-image-studio](https://github.com/yydshly/0809_githubcode_study/tree/main/projects/single-image-studio)

公开技术体验：[https://0809-githubcode-study.vercel.app/](https://0809-githubcode-study.vercel.app/)

## 快速开始

要求：Node.js 22+，桌面 Chrome / Edge。默认只监听 `127.0.0.1`，不需要任何 API 密钥即可使用全部 12 项本地任务。

```powershell
git clone https://github.com/yydshly/0809_githubcode_study.git
cd 0809_githubcode_study\projects\single-image-studio
npm.cmd install
npm.cmd start
```

打开：

- 产品：`http://127.0.0.1:4177/`
- 样例与处理结果：`http://127.0.0.1:4177/examples.html`
- 内部质量入口：`http://127.0.0.1:4177/quality-hub.html`

可选远程能力使用项目根目录下未提交的 `.env`。复制 [.env.example](.env.example) 后只在本机填写 PhotoRoom 或生成式 Provider 凭据；密钥不得写入网页、提交或 GitHub Actions 日志。未配置时，透明抠图、商品白底和报名照保持不可用，本地能力不受影响。

验证：

```powershell
npm.cmd run verify:product
npm.cmd run verify
```

当前产品回归为 `386/386`，JavaScript 语法检查覆盖 291 个文件；完整 `verify` 还会验证只读研究归档。浏览器证据和限制见 [BROWSER_ACCEPTANCE_EVIDENCE.md](BROWSER_ACCEPTANCE_EVIDENCE.md)。

### GitHub 发布边界

GitHub 保存源码、文档、项目原创演示素材和测试，不等于完整线上产品部署。完整应用包含 Node 本地服务、loopback-only 内部报告与服务端 Provider 密钥，不能直接作为纯静态 GitHub Pages 安全运行。当前 Vercel 地址部署的是单独构建的 `public-local-only` 技术体验壳，不包含这些服务端能力。

## 部署 Vercel 公开体验版

仓库已经提供 `public-hybrid` 构建。公开版只包含产品、样例和两张公开参考页；12 项基础任务继续在访问者浏览器中处理，内部验收 / 走查页面不会部署。Vercel Production 配置 PhotoRoom key 与显式启用开关后，抠图、商品白底与报名照场景才会调用同域 `/api/background-removal/*` Function；水印 sandbox key 可直接用于公开技术验证，非 sandbox key 还必须配置远程体验码。

当前 Production 地址：[https://0809-githubcode-study.vercel.app/](https://0809-githubcode-study.vercel.app/)。首次静态部署绑定 GitHub `main` 提交 `54ec620`；Vercel 状态 `READY`，首页、样例页和两张参考页均返回 200，内部质量 / 验收页返回 404。浏览器验收确认公开模式文案、12 个本地任务、9 张样例卡片与 18 / 18 张样例图片；部署构建与近一小时运行错误均为 0。`public-hybrid` Function 上线后应重新记录抠图状态与真实沙盒调用，不沿用这条静态验收结论。

本地验证构建：

```powershell
npm.cmd run build:public
```

输出目录为已忽略的 `dist-public/`。Vercel 配置见 [vercel.json](vercel.json)，上传排除规则见 [.vercelignore](.vercelignore)。

在 Vercel Dashboard 中：

1. 选择 **Add New → Project**；
2. 导入 `yydshly/0809_githubcode_study`；
3. 将 **Root Directory** 设为 `projects/single-image-studio`；
4. Framework Preset 保持 **Other**；
5. `vercel.json` 会提供 Build Command `npm run build:public` 和 Output Directory `dist-public`；
6. 使用 PhotoRoom sandbox 时配置下面两个 **Production** 环境变量；不配置 OpenAI 或 MiniMax 密钥；
7. 点击 Deploy。

```text
PHOTOROOM_API_KEY=<PhotoRoom sandbox 或正式 key>
PHOTOROOM_ENABLED=true
```

两个变量都不得使用 `NEXT_PUBLIC_` 前缀。`sandbox_` key 会让页面明确显示沙盒 / 水印边界，不要求体验码；若改用非 sandbox key，还必须新增 `BACKGROUND_REMOVAL_ACCESS_TOKEN=<至少 16 位体验码>`，否则 Function 保持不可用。Function 会在验证图片类型 / 大小 / hash 与逐次同意后才调用 PhotoRoom；结果必须通过透明 PNG、CRC、Alpha、尺寸和 hash 检查。原图和结果不写入服务器存储。当前免费额度方案不使用 Redis / Blob，因此页面刷新后不能恢复远程任务，网络未知也不会自动重复提交。

Vercel 连接 GitHub 后，main 更新会生成 Production Deployment，其他分支可生成 Preview Deployment。没有配置上述变量时，公开版仍应显示 12 个本地操作，透明抠图、商品白底和报名照保持未连接；sandbox 配置成功后会新增 3 个明确标注水印测试边界的远程场景。生成式任务仍保持未连接。

当前 Function 只是免费额度内的同步、无持久化技术验证。若未来需要匿名公开调用、跨刷新恢复、取消确认、多人并发、可靠幂等、用量计费或供应商侧删除回执，必须增加身份验证、平台级限流、对象存储、持久化 run store 和定期清理；不能用内存 Map 冒充跨实例状态。

## 当前状态

本目录目前包含一套可运行的**内部 Alpha 单图产品**、一个公开的本地优先混合技术体验壳和只读研究归档。产品已具备 12 项离线本地任务、可选背景移除 Provider、结果修正、多规格交付、样例、错误恢复与浏览器回归；公开地址的远程能力只有在 Vercel 环境变量齐全时才受体验码保护地启用，不是正式产品发布，也不证明自然图片质量、生成式修复、图片理解、自动推荐或真人用户价值已经成立。

| 维度 | 当前结论 |
| --- | --- |
| 研究阶段 | Slice 01–11、SourceCard / Matting baseline、continuous-alpha 和候选元数据已封存为历史 lineage。MODNet / RVM 仍是 metadata-only；模型 bytes、候选依赖安装、自然图片和推理 results 全为 0。当前不继续扩 Slice 或本地模型，C1 与产品支持仍为 0 |
| 工程与研究工具 | 内部 Alpha 产品、样例、错误参考、质量入口与浏览器验收可运行；Slice 01–11 继续作为只读研究归档。研究结果不构成当前产品能力或发布声明 |
| 原子能力证据 | `C1 = 0` |
| 实用 / 创意证据 | `U1 = 0`、`E1 = 0` |
| 运行 / 用户证据 | `R1-pipeline = 0`、`R1-product-validation = 0`、`R1-product-release = 0`、`V1 = 0` |
| 运维 / 治理证据 | `O1 = 0`、`G1 = 0` |
| 发布状态 | 源码已在 GitHub；Vercel 提供 `public-hybrid` 公开技术体验，完整产品仍为内部 Alpha，没有正式产品发布声明 |

所有状态以 [STATUS.md](STATUS.md) 为唯一事实源。当前代码整理、可靠性、用户验证、现有能力质量和智能能力扩展的统一顺序见[产品能力与工程演进执行计划](PRODUCT_AND_ENGINEERING_EXECUTION_PLAN.md)。历史材料中的“可运行”“pass”若未特别说明，只代表 R0 工程检查，不代表能力或产品门槛通过。

## 当前执行重排

从 `main@6ecd53c` 起，项目暂停继续扩展研究 Slice 和本地 Matting 模型获取，转而先完成一个用户真正能使用的单图基础编辑器。当前优先级是：

2026-08-17 起，短周期执行进一步收敛到[产品稳定化执行路线](PRODUCT_STABILIZATION_ROADMAP.md)：先治理代码结构，再建设真实样例 / 效果页和统一错误体验，之后才通过统一工作流框架增加单个场景。它取代零散追加小功能的做法，但不改变本地底座优先、Provider 可替换和发布证据不冒进的原则。

S2 [样例与效果展示页](web/examples.html)已经 practical-complete：8 项登记样例同时展示完整原图 / 结果、来源、处理位置、参数和能力限制；其中 5 项由当前浏览器调用产品本地链即时生成，一项 Codex 图明确标为静态视觉参考。页面不读取用户图片，也不会产生远程调用。

S3 第一批已统一主错误页：失败时固定说明图片是否可能已发送、原图是否安全、能否安全重试、下一步和任务编号，技术错误码默认折叠。输入、本地、远程明确失败与状态未知使用不同事实；UNKNOWN 仍只查询原任务，不自动重试。完整七类界面见[错误状态参考页](web/error-reference.html)。

S3 当前已 practical-complete：设置错误会聚焦相关字段，下载 / 输出校验失败进入可恢复错误状态，远程状态查询失败明确保留本地能力；这些改动不改变自动重试、上传、计费或 Provider 合同。

S4 已完成一个新场景：[隐私友好分享副本](PRIVACY_SHARE.md)。它在本机清理输出文件 metadata、限制 JPEG 尺寸和体积，并明确不检测画面中的人脸、地址、车牌或文字；产品浏览器六条本地旅程现为 6 / 6。

S5 的[内部质量入口](web/quality-hub.html)、[内部体验走查台](web/internal-walkthrough.html)和[本地匿名汇总页](web/internal-walkthrough-summary.html)也已就绪：入口把自动产品回归、效果样例、错误参考和真人走查分成四类；主持人可按顺序观察基础编辑和隐私分享两项任务，并只导出去标识化 JSON。汇总页在浏览器本地读取 1–8 份记录，拒绝重复场次，按 build 分组，汇总产物不含场次编号与自由文本。当前 13 个 HTML 页面还全部进入[页面与能力注册表](PAGE_AND_CAPABILITY_REGISTRY.md)，按产品、复核、走查、自动 QA 和视觉参考分类，并绑定真实任务能力与父入口。自动浏览器只验证了入口与工具在 1180 / 390 px 可用；真实方法演练仍是 `0/2–3`，M2 正式走查仍是 `0/5–8`。此处需要真人体验，不能用脚本或 Codex 自测填充分母。

```text
基础编辑闭环
→ 产品浏览器验收
→ 基础编辑器早期内部可用性走查
→ 可替换云端抠图 Provider
→ 保留 / 擦除修正与换底
→ 抠图专项可用性走查与 beta readiness 决策
```

抠图是第二阶段的核心增强，不是产品底座；当前不要求用户安装 MODNet、RVM、SAM 或其他模型。Slice 01–11、SourceCard / Matting baseline、continuous-alpha 和候选元数据全部保留为历史研究资产，但不再自动驱动下一次提交。具体动作、里程碑、验收和恢复本地模型研究的条件见 [当前执行计划](IMPLEMENTATION_PLAN.md)。

当前 R0 页面真实可运行的用户路径仍是本地“保真整理”和可选的创意 API 工程路径；用户已确认基础编辑能力可作为下一阶段工程基线，但计划中的 5–8 人 M2 走查尚未完成。M3a 已实现独立 `BackgroundRemovalProvider` 边界、专用 status/run/cancel API、浏览器 client、fake-only 回归和 PhotoRoom Basic 的首个远程 adapter。页面会显示“透明抠图”任务，但服务未配置时保持禁用；进入任务后还必须逐次确认远程发送。生产同时要求服务端密钥和 `PHOTOROOM_ENABLED=true`，避免保存密钥后意外发起付费请求。服务端直接验证输出 PNG 的 CRC、结构、8-bit RGBA Alpha 和尺寸，而非只相信供应商的 `hasAlpha` 声明；来源/构图版本、明确同意、幂等、拒绝、超时、取消和迟到结果均有关闭测试。这证明协议接线和安全边界，不证明真实供应商质量或可用性。[ProviderEvaluationPlan v0](PROVIDER_EVALUATION_PLAN.md) 仍冻结 12 个 source unit、最多 24 次调用、隐私/质量 no-go 和当前 0 美元授权。当前累计完成 5 次免费沙盒调用：1 次原创 synthetic 协议探针，以及 4 次由内置图像生成工具创建的头发、玻璃、毛发和镂空结构挑战图。后四次 4/4 返回 RGBA Alpha，但目视均存在光晕、背景色渗漏或镂空残留，因此只算接线成功和质量预警，不算正式质量通过。基于这些缺陷，结果页已增加非破坏式 Alpha 修正：擦除残留、补回误删、200 笔硬上限、撤销 / 重做 / 重置；棋盘格会下载透明 PNG，白 / 黑 / 彩底会写入完全不透明的 JPEG。下载时按原尺寸重放笔触，并独立重开核对 metadata、尺寸与像素。修正不覆盖远程结果，也不会再次调用 Provider。真实浏览器 E2E 和正式质量验收仍未完成。页面会明确标示带水印；正式候选比较、账户侧 DPA/地域/训练/删除核对与付费调用仍未开始。基础编辑器在 Provider 不可用时不受影响。详见 [sandbox generated-image review](provider-evaluation/sandbox-v0/RESEARCH.md)。

M2 的 [基础编辑器早期内部走查卡](M2_INTERNAL_WALKTHROUGH.md) 已经准备好：参与者只看到一个“方形构图 → 旋转 90° → PNG 下载”的 2 分钟任务，主持人按固定规则记录匿名结果。当前先用[内部体验走查台](INTERNAL_WALKTHROUGH_TOOL.md)进行 `0/2–3` 方法演练；M2 真实参与者分母仍是 `0/5–8`。材料不代表走查通过，也不收集参与者照片。

产品入口现增加一层可执行的[场景技能](SCENARIO_SKILLS.md)：优先呈现“商品白底图”“报名照 / 底色头像”“社交头像与封面”“社交九宫格切图”“老照片基础整理”，再显示自然增强、保真整理和透明抠图等自由工具。商品与报名照依赖远程抠图；社交构图、九宫格切图、自然增强和老照片基础整理完全在本机完成。自然增强与老照片基础整理除公开光色参数外，均可使用 Alpha 安全的轻度降噪和受限清晰度；它们不会分析主体、识别划痕、恢复失焦或生成不存在的纹理。会重新生成像素的“AI 老照片修复”保留为独立创意实验，只有图片 API 可用并经用户确认风险时才开放。

任务选择页先按用户用途分组，再提供自由工具与创意生成。自由工具现包含基础编辑、图片压缩、图片格式转换、完整图片适配、文档 / 平面裁正、自然增强和透明抠图；格式转换在本机完成 PNG / JPEG 输出，明确 JPEG 有损与透明填色，不能用来自动抠图或恢复细节；完整图片适配用纯色或透明留白补足目标比例，不裁掉内容，也不是 AI 扩图。每张卡仍明确本地或远程、当前可用性和输出类型；未配置抠图服务时，商品白底图和报名照保持不可选，社交构图与本地工具仍可运行。该顺序不会分析图片内容，也不会把未配置能力伪装成推荐结果。

本地结果可以通过“用此结果继续处理”重新进入来源确认，因此可组合“完整适配 → 压缩”“自然增强 → 格式转换”等流程，而不必先下载再上传。系统会先复核当前结果的长度和 SHA-256，并为下一步建立新的来源 revision；远程抠图和生成式结果不使用该快捷路径。

确认图片后，任务页会先显示一张[本机图片技术检查卡](TECHNICAL_IMAGE_CHECK.md)：只在最长边不超过 256 px 的缩小取样上计算明暗分布、RGB 通道倾向和相邻像素变化，并给出“清亮 / 柔和降噪 / 自然增强”中的一个透明起点。它不识别人、商品或场景，不作白平衡、失焦、噪点或画质鉴定，也不会自动处理图片；只有用户点击“打开并使用建议”后才会进入自然增强并写入公开参数。检查失败不会隐藏或禁用任何任务，换图会清除旧观察。

任务目录现在以“当前可执行”为主层级：场景技能和自由工具的大卡只显示 `runnable=true` 的任务，有可用任务的能力层才显示摘要卡。未配置 OpenAI 等图片生成服务时，AI 老照片修复和创意改造不会继续占用两张灰色主卡，而是收在页尾默认折叠的“未连接扩展”中；PhotoRoom 与全部本地能力不受影响。将来服务变为可用，任务会根据同一 catalog 状态自动回到主目录。该调整只改变呈现，不修改 Provider、逐次同意、运行或下载合同；详见 [任务入口层级合同](TASK_SELECTION_HIERARCHY.md)。

产品页现在使用面向试用者的直白文案：显示“内部试用版”“可用操作”“文件可下载”，不再让 `R0`、工程探针、Alpha 结构或供应商内部 ID 抢占主流程。研究等级、协议细节和诊断结论仍完整保留在本 README、[STATUS.md](STATUS.md) 与内部诊断页；文案简化不改变任何能力状态或质量声明。

首轮产品范围已经冻结为**桌面浏览器优先**：以 Windows 桌面 Chromium 为当前基准，`1280 × 720` 最小视口与 `1440 × 900` 常规视口作为首轮矩阵。2026-08-17 已在 Codex 内置 Chromium、Chrome `151.0.7922.138` 和 Edge `151.0.4129.78` 三个实际会话中跑通本地保真整理和场景模板流程，包含 PNG 重开、完整显示、无横向溢出、换任务、焦点清理和旧下载失效；[运行记录与限制见浏览器验收证据](BROWSER_ACCEPTANCE_EVIDENCE.md)。自驱验收不替代原生 Tab / Shift+Tab、物理指针和操作系统下载目录检查。手机、平板、iPhone / HEIC、Safari、Firefox 与完整响应式产品后置，不进入首轮 R1-product、O1 或 V1。

修正画布现在提供“自动结果 / 修正后”无损对比，以及“适应 / 2× / 4×”查看和放大后滚动；对比状态与查看倍率只服务于发丝、孔洞和透明边缘检查，不改变蒙版历史、原尺寸笔触重放或正式导出尺寸。

结果页的返回动作按任务说明为“重新抠图”或“继续调整”。重新抠图和抠图失败后的再次尝试都会清除上一次远程发送确认，并将焦点放回确认项；用户必须针对下一次调用重新确认。状态未知时优先查询原任务，不会自动新建调用。本地编辑返回时保留当前设置，不会产生远程请求。下载期间按钮会显示校验状态；文件指纹或长度不符时阻止下载，成功触发后只提示“下载已开始”。

用户也可以在结果页选择“换个处理方向”：当前图片保留，旧结果与下载资格退出，任务配置和旧 run 被状态机清理，然后返回分组后的任务列表。设置页和错误页使用同一返回规则，避免界面已经回到任务列表、后台却仍保留旧任务的状态分叉；返回本身不会上传或执行图片。`product-acceptance.html` 会在两档桌面视口的真实同源流程里继续自动检查完整显示、横向溢出、换任务、设置返回、焦点与旧下载失效，结果直接显示在验收页中。

远程抠图明确失败时，错误页会优先提供“改用本地编辑”：保留当前图片，直接进入本地保真整理，不再次上传；远程重试仍可选，但必须重新确认。状态未知时不显示该兜底捷径，仍先查询原任务，避免把未确认的调用误当成失败后重复计费。

抠图结果页现在还会显示本次 Provider 与本地恢复记录状态。用户可清除当前服务进程内已经结束的抠图 run；清除后当前页面仍可查看和下载结果，但刷新后不能再恢复该任务。进行中或状态未知的 run 不允许清除。该入口明确不向供应商发送删除请求，也不把本地删除回执冒充为供应商删除证明；账户侧保留期与删除能力仍待正式核对。

蒙版修正区会实时汇总“最终下载内容”：明确自动或修正版、修正笔数、透明或纯色背景、PNG / JPEG 和原始导出尺寸。切换到自动结果只用于对比，摘要仍明确最终下载使用修正版，避免把当前查看状态误当成实际导出版本。

纯色换底除白、黑和彩色预设外还支持自定义选色。界面显示最终十六进制色值，下载时以同一 RGB 在原结果尺寸合成完全不透明 JPEG，并沿用容器、metadata、尺寸和像素重开校验；选色不会再次上传图片。

用户已确认当前基础编辑、抠图修正、换底、比较与下载组合暂时够用，因此这一功能集合现在作为**内部试用可用基线**冻结，不再继续围绕单个结果控件堆叠小功能。下一轮优先级转为整体界面体验：让图片成为结果页视觉主体，宽屏把只在“处理结果”视图需要的蒙版工具收进右侧工作栏，原图 / 并排 / 参考继续完整宽度显示；窄屏则先显示图片和结果状态，再显示工具。该反馈不替代 M2 / M5 多人走查、正式浏览器 E2E 或能力证据。

基础链路可用不等于所有场景都完成。**商品白底图**现会载入 1:1、1600 px 上限和白底起点，经现有 Provider 抠图后继续本地修边；交付阶段按 Alpha 中全部非透明内容的真实边界等比计算，可在 65%–100% 范围调整主体大小、双轴位置和柔和阴影。同一份抠图、修边和构图会同时预览通用方形 `1200 × 1200`、通用竖版 `1200 × 1500`、通用横版 `1200 × 900` 与保留当前像素四个版本；每张可单独下载，也可在本机逐张重绘、检查后打包为一个 ZIP，过程中不会再次调用 Provider。最终只允许不透明 JPEG。这些只是通用像素画布，不是任何电商平台的审核或发布规则；边界计算也不是商品识别，不会删除水印，阴影不理解桌面或接触面。**报名照 / 底色头像**会载入人物略上移的 1:1 / 4:5 构图起点；抠图后可选择白、黑、彩色或自定义底色，并在独立交付预览中选择通用方形 600 × 600、通用竖版 480 × 600 或保留当前像素，手动调整人物大小与上下位置。它不做自动人脸或头顶定位，也不承诺护照、签证或机构受理。**社交头像与封面**复用完全本地的比例与尺寸模板，并可选添加一个最多 40 字、最多两行的短标题；标题支持顶部 / 底部、左对齐 / 居中和浅色 / 深色，通过通用 7% 安全区与可读底板写入真实导出像素。预览和下载使用同一绘制路径，但这不是任何平台的官方安全区或发布规范，也不包含贴纸、字体库、多图层设计、主体感知排版或自动发布。**老照片基础整理**现可在无 API 时本地运行，包含四个透明五参数起点、现有构图工具和 PNG / JPEG 副本导出；轻度降噪只平滑小颗粒，清晰度只增强已有反差，它不具备划痕识别、重度去噪、失焦恢复、修脸、文字恢复或缺失细节补全。独立的 **AI 老照片修复（实验）**已完成有限选项、风险确认、服务端提示词白名单、结果比较和“修复副本”下载合同，但尚未执行一次产品 Provider 的真实质量调用；人物、文字与历史细节准确性完全未验证。Codex 内置图片编辑可以创建项目原创测试 / 视觉参考，但不是网页运行时后端。MiniMax `image-01` 已进入候选清单；因为当前官方 image-to-image 只接受在线参考图 URL，尚不满足本地上传与隐私边界，所以即使配置 Token Plan Key 也会保持 fail closed。跨多张来源图片的批量任务、自动人脸构图、扩图和正式证件规格均未实现。

社交场景现把同一构图位置和标题样式分别重绘为方形分享、竖版分享、横版封面和竖屏故事四个版本；四张会在结果页同时预览，经过格式、尺寸和像素重开检查后可单独下载或打包为本地 ZIP。该过程完全在本机执行，不上传图片、不调用 Provider；像素模板和 7% 安全区仍只是通用起点，不是平台官方规则。

社交九宫格场景会先复用同一个本地编辑器确定 1:1 总画面，再按左到右、从上到下生成 1–9 号九张等大的 PNG。结果页默认显示完整总图，点击编号才切换单图大预览；支持单图和九张 ZIP 下载。每张切图都独立核对 PNG 容器、尺寸、像素、哈希和长度；任务或来源变化时旧异步结果不会发布。若边长不能被 3 整除，只居中舍弃最多 2 个边缘像素，不拉伸、不补画、不自动发布，也不声明任何平台规则。

老照片基础整理现在也有独立的“一图多修”结果工作台：同一裁剪、旋转、尺寸和格式会在本机派生“褪色提层次 / 黑白层次 / 柔和去灰 / 保持原貌”四张真实副本，可切换主预览、单张下载或打包 ZIP。四张只改变公开的整体光色、轻度降噪和清晰度参数，不会再次上传图片，也不会冒充划痕识别、失焦恢复、修脸或缺失细节补全。

报名照场景现可在单张底色头像之外下载一张 `1800 × 1200` 的六宫格 JPEG：六份内容来自当前选定像素模板、人物构图、修边和底色的同一个最终结果，保持纵横比、不额外裁脸，并经过 JPEG 容器、metadata 与重开尺寸检查。该布局没有物理 DPI / 毫米规格，不是官方证件照排版，也不承诺打印店或签发机构受理。

报名照场景还可把同一份抠图、人工修边和人物构图在本机派生为 6 个通用 JPEG：`600 × 600` 与 `480 × 600` 两种像素画布，分别配白、蓝、暖红三种纯色背景。六卡片会同步预览，可单张下载或打包为一个 ZIP；切换卡片会同步主预览和主下载，过程中不会重复调用 Provider。这只是通用像素 / 底色组合，不包含人脸定位、DPI、毫米或任何机构的官方证件照规则。

任务页会先按运行时状态显示三层能力：**本地基础能力**、**远程抠图能力**和**生成式能力**。本地基础可用只表示确定性的编辑与基础场景配方可执行；远程和生成式模块必须分别连接对应服务，其可用数量不会被计入“基础功能完成度”。

结果区支持原图与处理结果并排查看：桌面采用左右两栏，窄屏改为上下两栏，两个面板都使用 `contain` 完整显示并标注。并排模式不接受蒙版笔触；修边必须回到“处理结果”视图，避免比较动作意外改变最终下载。

## 目标产品

未来产品面向想快速处理或改造一张现有图片、但不想理解模型、Prompt、Skill 或图像管线的普通用户：

1. 上传一张图；
2. 系统生成只包含可观察事实的 `SourceCard`；
3. 过滤不适用或未发布的效果；
4. 展示最多四个有真实参考对和变化合同的结果选项；
5. 执行确定性处理、视觉模型或生成模型组合；
6. 通过任务专属 QA 后比较并下载。

目标结构不是工具墙，而是：

```text
工程底座 → 九类原子能力 → 用户效果 → 场景配方
```

完整产品假设见 [PRODUCT.md](PRODUCT.md)，能力依赖见 [CAPABILITY_MAP.md](CAPABILITY_MAP.md)。

## 九类能力研究

1. 来源与资产；
2. 归一化与交付；
3. 图片理解；
4. 主体与区域；
5. 几何与确定性合成；
6. 质量与修复；
7. 生成式编辑；
8. QA、证据与来源；
9. 编排与推荐。

九类是研究地图，不是九个要同时开发的页面入口。长期能力研究中的主体 / 背景链为：

```text
输入归一化 → 主体检测 → Alpha Matting → 边缘净化
→ 透明主体 → 纯色换底 → 任务 QA
```

自然增强和 CR1 / CR2 创意对测是另外两条独立研究链。未来 mixed beta 要求质量、主体 / 背景、创意三个方向各至少一个效果满足完整发布公式；这不是当前 MVP-B 的 beta-readiness 决策，验证壳达标也只允许正式页面进入设计与复验。

## 运行 Slice 01 研究设施

Slice 01 已建立 3 个本项目原创的 `MATTE-GT dev/calibration` 合成 fixture、18 个 PNG 图层、rights record、FixtureManifest、严格 catalog allowlist 和只读研究入口。它们只用于验证研究方法、目录、hash、资源隔离和审阅交互，证据状态固定为 `C1=0 / method-rehearsal`。

首次运行或生成器变更后：

```powershell
cd projects/single-image-studio
npm.cmd run research:prepare
```

启动本地服务：

```powershell
npm.cmd start
```

打开 `http://127.0.0.1:4177/research/`。该入口只在本机模式读取 catalog 明确列出的 `public-synthetic` PNG；LAN 模式会拒绝研究 catalog 和资源。它支持来源、Alpha、前景、黑 / 白 / 高饱和彩底检查、结构化缺陷初判和提交后解盲，但当前提交不持久保存，也不代表真实 Matting、QA 或产品闭环已成立。

研究目录、生成与验证边界见 [research/README.md](research/README.md)，本次实现和覆盖合同见 [research/SLICE_01_CONTRACT.md](research/SLICE_01_CONTRACT.md)，实际自动化、HTTP 与浏览器结果见 [research/SLICE_01_EVIDENCE.md](research/SLICE_01_EVIDENCE.md)。

## 运行 Slice 02 合同与隔离夹具

Slice 02 冻结了输入归一化、正式 PNG `DeliveryArtifact` 导出、`SourceCard.v0` 和受控合成背景 Matting simple baseline 的四份研究合同；同时为 `NORMALIZE-DELIVER` 与 `MATTE-GT` 建立五 partition 的项目原创合成结构夹具。它没有扩展 `/` 或 `/research/` UI，也没有引入模型、权重、第三方图片或真实用户照片。

```powershell
npm.cmd run research:prepare
npm.cmd run verify
```

参考适配器只接受窄范围、最大 `1 MiB` / `256 × 256` 的 RGBA8 filter-0 PNG fixture；超出范围会拒绝。仓库可见 holdout 只证明隔离机制，不能充当未来 C1 的密封质量 holdout。完整边界见 [research/SLICE_02_CONTRACT.md](research/SLICE_02_CONTRACT.md)，验收记录见 [research/SLICE_02_EVIDENCE.md](research/SLICE_02_EVIDENCE.md)。

## 运行 Slice 03 格式、observer 与密封仪式研究

Slice 03 冻结 15 行 `NORMALIZE-DELIVER` 格式矩阵、逐行 profile 和独立 byte-backed technical observer，并用 25 个项目原创开放夹具检查 canonical PNG 与格式拒绝边界。JPEG / WebP 仅做 header probe 后稳定拒绝；所有矩阵行均为 `productSupport=false`，没有实现正式解码、归一化或导出。

密封仪式测试只在系统临时目录生成 mock metadata，校验角色、hash 链、一次性运行、逐 attempt custody、外部 trusted pins 与完整 Git 仓库真实路径边界后立即清理。仓库中没有正式 holdout / defect-holdout / escape，正式 holdout 状态仍为 `not-created`。

```powershell
npm.cmd run research:prepare
npm.cmd run verify
```

完整边界见 [research/SLICE_03_CONTRACT.md](research/SLICE_03_CONTRACT.md)，验收记录见 [research/SLICE_03_EVIDENCE.md](research/SLICE_03_EVIDENCE.md)。该切片没有扩展 `/` 或 `/research/` UI，也没有使用真实照片、模型权重或第三方图像依赖。

## 验证 Slice 04 候选锁与预注册 metadata

Slice 04 把 `REG-NORM-SHARP` 锁为 source-resolved 复合候选：Sharp `v0.35.3`、Windows x64 npm / native bundle、`sharp-libvips@1.3.2` 的 bundled libvips 来源与通知，以及上游 libvips `v8.18.3`。Sharp 与 bundled libvips 是一个候选，不是两个比较臂；standalone `REG-NORM-LIBVIPS` 仍为 `research-only/pending-freeze`。

六个 npm registry tarball 只下载到仓库内未提交的临时 `.tmp/slice04-artifacts` 计算 SHA-256，随后删除；没有解包、执行、安装或保留，GitHub commits 只经官方页面 / API 解析，项目依赖也没有增加 Sharp / libvips。Slice 04 机器记录为 10 records / 7 schemas：1 candidate lock、15 行格式矩阵、2 份 metadata-only 合同、normalize / export 各 1 份五 partition plan、1 份 QA profile、2 份预注册和 1 份 seal intent。全部格式仍为 `productSupport=false`。

```powershell
npm.cmd run research:prepare
node --test tests/research-slice04.test.mjs
npm.cmd run verify
```

normalize / export 每项都计划 `30 dev/calibration + 30 holdout + 18 defect/calibration + 18 defect/holdout + event-driven-0 escape`；初始 C1 只计 sealed holdout 30 + sealed defect-holdout 18 = 48，open calibration 与 append-only escape 排除。有限来源必须 3 / 3 repeats 全过，每来源跨三次最多一次仅替代 no-result invalid。Slice 03 observer 与 seal 只作不兼容 design lineage / execution-envelope reference；operation artifact schema / oracle、runner、durable ledger、trusted authority、角色 assignment / approval 与所有像素均未创建，request 为 `not-issued-awaiting-custodian-bundle`，因此非 Gate B。

完整边界见 [research/SLICE_04_CONTRACT.md](research/SLICE_04_CONTRACT.md)，实际 hash 与验收结果见 [research/SLICE_04_EVIDENCE.md](research/SLICE_04_EVIDENCE.md)。后续边界由 [Slice 05 范围合同](research/SLICE_05_CONTRACT.md) 冻结；该合同保留当时 `implementation-not-started` 的历史事实，当前进度见 [Slice 05 定义冻结证据](research/SLICE_05_EVIDENCE.md)。

## Slice 05 定义冻结与真实 smoke 结果

[Slice 05 范围合同](research/SLICE_05_CONTRACT.md) 将范围收窄为 canonical PNG 的 normalize / export 两项独立 operation；该合同不原地改写。当前新的 `@0.5.0` machine definition 已于 `2026-08-15T04:23:38.389Z` 冻结：25 份 strict schema、6 份 operation-specific manifest、108 份 source record / raw open asset、54 份 export `NormalizedImage` 输入和 54 份 independent gold。definition index `contentHash` 为 `d914d75e54bb9b5e175f774038d41235ebeb6dc5daf4b5235d76b3caf4d5c271`，完整 368-file tree SHA-256 为 `108812d4eec84fa3037f8540d8fb273748982beb5e5f28a07eb7cda93e1218f2`。

定义树还 pin `REG-NORM-SHARP@0.5.0` installed runtime closure、normalize / export 两份 `CapabilityContract@0.5.0`、独立 oracle / gold、candidate adapter / isolated worker、named hardware、local runner / fault semantics、Gate B plan 和两份开放 calibration preregistration。runtime inventory 阶段只导入 Sharp 读取版本，没有处理图片；该定义基线提交 / 推送后，唯一注册的真实 smoke 于 `2026-08-15T04:52:05.490Z` 至 `2026-08-15T04:52:10.426Z` 运行并持久化 116 files / 8 directories / 357303 bytes，result tree SHA-256 为 `e6cd4aea45419cc4fd02724555fb439191162ca4f5aaab6a00834f8898d8256b`。

normalize summary 为 `6 pass / 12 non-pass`：9 次 applicable attempt 全部 `S05_OUTPUT_ORACLE_REJECTED`，另 3 次 sRGB rejection 预期 `S05_INPUT_SRGB_REQUIRED`、实际 `S05_INPUT_CHUNK_PROFILE_INVALID`。export summary 为 `9 pass / 9 non-pass`：9 次 applicable attempt 全部 `S05_OUTPUT_ORACLE_REJECTED`，9 次 rejection 全部按预期通过。两份 Gate B decision 均为 `denied-not-entered`，`calibrationAuthorized=false`；36 次 attempt 没有发布任何 artifact。fault semantics 注入场景 `6/6` 通过；两份 operation summary 的 registered candidate-attempt counters 中 invalid / timeout / cancelled / unknown reconciliation / replacement 均为 0。

首次未注册调用因 sandbox `mkdir EPERM` 在任何 request / claim / result 之前停止；随后获批调用是唯一注册 smoke，不是根据结果选择的重跑。持久化记录只能证明 worker IPC 返回并通过严格响应校验的 output bytes，随后被 precommit independent oracle 拒绝；进程退出确认未持久化（`workerExitConfirmed=null`），具体 oracle 子因保持 unknown，不补猜也不重跑。当前版本的 normalize / export calibration 均被禁止。

下一步不是修补或重跑 `@0.5.0`、`@0.6.0` 或 `@0.7.0`。Slice 06 已定位 Sharp PNG profile 缺陷；Slice 07 的复合候选随后证明 18 / 18 applicable outputs 可以满足 closed PNG contract，但 frozen rejection driver binding 失配，Gate B 仍双拒绝。任何修正都必须进入新版本、新定义和新的 registered evaluation。

Slice 05 继续禁止正式 holdout、defect-holdout、escape、formal bundle / request / receipt / result / EvidenceManifest，也不扩产品 UI、server 运行路径、Matting、真实照片或模型权重。定义冻结、自动测试和这次失败的真实 smoke 都不能据此声称真实归一化、正式导出或产品能力；完整 pins、结果与限制见 [research/SLICE_05_EVIDENCE.md](research/SLICE_05_EVIDENCE.md)，全部证据轴继续为 0。

## Slice 06 diagnostic characterization 已闭合

[Slice 06 范围合同](research/SLICE_06_CONTRACT.md) 冻结的是一个两阶段桥接边界，不是新的 Gate-B smoke。canonical definition 于 `2026-08-15T08:17:06.288Z` 冻结；随后唯一注册 invocation 顺序完成 normalize / export 各 12 次，共 24 次、零 replacement。post-run 树为 152 files / 34 directories / 583,198 bytes，SHA-256 `4c82a65083ccc1675a65d632010360d991171255ec5ef74b4a50092f701dd146`；完整事实与 pins 见 [Slice 06 evidence](research/SLICE_06_EVIDENCE.md)。

两项 summary 都是 `characterization-complete`：各 `9` 个 oracle non-pass + `3` 个精确 worker-free preflight rejection，且 `inconclusive=0 / protocol-failed=0`。18 份 candidate output 均 `workerExitConfirmed=true`、telemetry 完整、bytes / pixels / classification / oracle outcome / runtime 三次一致；独立重开一致得到 `IHDR,pHYs,IDAT,IEND`、filter 仅为 `0`、像素 hash 与预期相同，primary code 均为 `S06_ORACLE_PNG_SRGB_REQUIRED`。这不产生 Gate B、calibration、artifact、C1 或产品支持。

诊断只允许保存标记为非产品、排除于 Gate B 的 output specimen / quarantine，以及完整 worker observation、精确 independent-oracle 子因和 terminal closure。它没有 Gate B decision authority，`calibrationAuthorized=false` 固定不变；即使 24 次全部闭合，也只供下一切片选择或修正 candidate，并由下一切片另行冻结正式 Gate-B smoke。`@0.5.0` 不得重跑或进入 calibration；本切片不使用真实照片、第三方图片、模型权重，不创建 holdout / defect-holdout / escape，也不修改产品 UI / server。

## Slice 07 canonical PNG candidate 范围已冻结

[Slice 07 范围合同](research/SLICE_07_CONTRACT.md) 计划 `REG-NORM-SHARP-CANONICAL-PNG@0.7.0`：worker 返回 RGBA8 与尺寸，候选自有 encoder 只写 `IHDR,sRGB,IDAT,IEND`、filter 0，不得调用 Sharp PNG encoder 后再 patch，也不得复用 independent oracle / reference encoder。normalize / export 各冻结 3 applicable + 3 rejection sources、每个 3 次，共 36 attempts；两项 Gate B 都 pass 后，才可在后续切片讨论 calibration。

Slice 07 results-zero definition 提交 / 推送后，唯一 registered smoke 已闭合：36 / 36 terminal，normalize / export 各 9 pass + 9 non-pass。18 / 18 applicable attempts 的 canonical PNG 全部通过 independent oracle；18 个 rejection 因 driver executor binding 漏传分类字段而全部得到 `ERR_INVALID_ARG_TYPE`，不是候选像素或 encoder 失败。两项 Gate B 均 `denied-closed-non-pass`，calibration 禁止，不得重跑。详见 [Slice 07 result evidence](research/SLICE_07_RESULT_EVIDENCE.md)。

## Slice 08 已关闭为 fail-closed protocol failure

[Slice 08 范围合同](research/SLICE_08_CONTRACT.md) 版本化 runner → driver 的 closed `caseContext` 边界。results-zero definition 于 `2026-08-15T13:37:23.038Z` 冻结并推送；唯一 registered invocation 随后写入首个 normalize request 与 `attempt-started`，但 actual-case driver 把 Slice 05 gold 的 `goldRecordId` 错读为 `id`，因此以 `S08_CASE_MATERIAL_INVALID` 在 Sharp worker 前停止。不可重放的 partial tree 只有 2 files / 3,779 bytes，SHA-256 `2dd9e53fcd2163913a47c16f92f9a31733ef3ffc491949e6c1a31464774da0d6`；terminal、output、closure、oracle、summary、decision 均为 0，export 未启动。中央验证能重开 request 与 sole ledger event 并返回 0 issues，但没有 Gate B decision，calibration 继续禁止。任何修复必须进入新版本；详见 [Slice 08 evidence](research/SLICE_08_EVIDENCE.md)。

## Slice 09 registered Gate-B smoke 已关闭并双 pass

[Slice 09 合同](research/SLICE_09_CONTRACT.md) 要求 production runner / resolver / driver 只通过 closed、self-hashed `goldIdentity` 使用真实 `goldRecordId`，并绑定 content / file / pixel / source / manifest identity；明确禁止 `.id` fallback。[Gold identity](scripts/research-gateb-gold-identity-slice09.mjs)、[case context](scripts/research-gateb-case-context-slice09.mjs)、[actual-case driver](scripts/research-gateb-driver-slice09.mjs)、[durable operation runner](scripts/research-gateb-runner-slice09.mjs)、[registered admission](scripts/research-run-slice09.mjs)、[definition generator](scripts/research-generate-slice09.mjs) 和 [central validator](scripts/research-validate-slice09.mjs) 已实现。canonical definition 于 `2026-08-15T15:17:03.776Z` 冻结并推送；唯一 registered smoke 随后闭合为 186 files / 36 terminal results / 18 artifact closures。normalize / export 各 9 applicable artifact pass + 9 exact rejection pass，6 / 6 sources 均 3/3 deterministic，两项 Gate B decision 均为 pass。结果树 SHA-256 为 `2f6bc6c2d7490568db0facd8b2615f74294fbb6e1b3a09828bf7a654750cf451`。不得重跑；`calibrationAuthorized=false`、C1=0、productSupport=false，详见 [Slice 09 evidence](research/SLICE_09_EVIDENCE.md)。

## Slice 10 open calibration 已 fail closed

[Slice 10 合同](research/SLICE_10_CONTRACT.md) 新建 `@0.10.0` calibration identity，不改写 Slice 09。normalize / export 各冻结 48 sources × 3，合计 96 / 288，零 retry / replacement；results-zero definition 已先提交推送。唯一 registered invocation 随后在首个 normalize applicable request 以 `S10_EXPECTED_OUTPUT_INVALID` 停止：case driver 把完整 gold expected object 交给只接受 12 个 canonical output keys 的 Slice 07 raw adapter，故在启动 Sharp worker 前 fail closed。export 未启动，output / artifact / oracle / summary / runtime-end 均为 0。不可变 terminal 还把该路径错误记成 `workerInvoked=true`，central 因 `RESULT_WORKER_LIFECYCLE_INVALID` 拒绝整份结果。Slice 10 不得重跑；完整树 pins、时序与后续 Slice 11 边界见 [Slice 10 evidence](research/SLICE_10_EVIDENCE.md)。

## Slice 11 scope 已冻结

[Slice 11 合同](research/SLICE_11_CONTRACT.md) 建立 `@0.11.0` 新身份，只修 gold-to-adapter projection 与真实 worker lifecycle。results-zero definition 于 `2026-08-15T23:01:50.529Z` 冻结并以 commit `33f24395e9ad2cd672d156a6f491e02118a62ed1` 推送。唯一 registered invocation 只产生 operation claim 与 runtime start observation，随后因 canonical JSON SHA 的末尾换行口径不一致而以 `S11_RUNTIME_START_DRIFT` 停止；actual request / attempt / worker / pixel / terminal / export 均为 0。两文件 result tree SHA-256 为 `a638a17afa69ab41015181b61ef7a64fa58e9057a9f64f7bc29bfe2f35dd3689`。central validator 将该形状封闭并拒绝 replay；43 / 43 Slice 11 tests 与 522 / 522 全量测试通过。精确 pins 与执行边界见 [Slice 11 evidence](research/SLICE_11_EVIDENCE.md)。

## SourceCard.v0 + Matting baseline 纵向结果

现有 3 个项目原创 `MATTE-GT dev/calibration` 场景已通过同一条研究路径生成严格 `NormalizedImage`、`SourceCard.v0`、fixture-known `SubjectMap` 与 `AlphaMatte.v0`。SourceCard 只确认 byte-backed 技术事实，语义观察保持 explicit unknown。固定 10/88 的 color-distance baseline 对 hard-edge 与 interior-hole 完全一致；soft-edge MAE 为 `6.93140625`、IoU@128 为 `0.922269839`，视觉上明显把羽化边缘变硬。因此它只作为比较下限，不是产品 fallback。完整报告、文件 hash 与非证据边界见 [SourceCard + Matting baseline evidence](research/SOURCECARD_MATTING_BASELINE_EVIDENCE.md)。

后续的 `SCO-EXPOSURE-SIGNALS@0.1.0` 已把亮度均值、分位数和极暗/极亮比例冻结为可复算的客观信号；四个原创 pattern 4 / 4 符合预期，三个 MATTE-GT 输入均落在 `balanced`。但自然图片校准尚未冻结，所以 `quality.exposure` 仍必须是 `unknown`。同时 MODNet 与 RVM MobileNetV3 已登记为连续 Alpha 候选；只有来源与许可已解析，模型文件仍 `not-downloaded`。详见 [exposure observer 与候选 evidence](research/SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md)。

候选中立的 `CC-CAP04-CONTINUOUS-ALPHA-EVAL@0.1.0` 也已冻结：6 个原创 synthetic 来源覆盖 hard、hole、radial soft、diagonal feather、thin structure 与 semi-transparent；每候选固定 3 次冷启动，共 18 次，两个候选 planned 36 次。定义特别把 boundary MAE 与二值 IoU 分开，避免硬化 Alpha 后仍靠阈值分数过关。当前结果数为 0，阈值和自然人像集均未创建。见 [Continuous Alpha evaluation evidence](research/CONTINUOUS_ALPHA_EVALUATION_EVIDENCE.md)。

后续的 `DEF-MATTE-ACQUISITION-GOVERNANCE@0.1.0` 只冻结获取与隐私治理：自然人像 planned minimum 为 dev/holdout 24/24、defect/defect-holdout 12/12，所有实际 material 仍未创建；MODNet 因官方 immutable direct artifact 未解析而硬阻断，RVM 虽有官方 release URL，仍因 bytes/SHA/SBOM/runtime/GPL 决策缺失而禁止获取。见 [Matting acquisition governance evidence](research/MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md)。

## 运行 R0 工程探针

需要 Node.js 22 或更高版本。本项目不依赖兄弟项目；`package.json` 现仅为 Slice 05 本地开放研究精确声明 `sharp@0.35.3` 与 `@img/sharp-win32-x64@0.35.3` 两项 devDependency。R0 server / web 路径没有接入该 candidate，`node_modules/` 不提交，依赖存在不表示产品 runtime 或格式支持。

```powershell
cd projects/single-image-studio
npm.cmd start
```

`start` 与 `dev` 会自动读取项目根目录中未提交的 `.env`。打开 `http://127.0.0.1:4177/`；未配置密钥时，可用合成演示图验证本地 Canvas 处理和工程状态闭环，这只是确定性画布探针，不是已经验证的“自然增强”。

内部浏览器诊断页位于 `http://127.0.0.1:4177/browser-diagnostics.html`。它不会读取用户图片或访问网络，而是在当前浏览器内用内存像素核对 PNG / JPEG 编码、metadata、独立重开、两笔蒙版修正后的透明 PNG 与纯色 JPEG、16:9 / 9:16 场景模板、商品四规格、报名照六规格与社交四规格的真实 Canvas 输出和 ZIP；同时用真实 DOM 焦点检查远程失败、未知状态和本地失败三种恢复操作。通过只代表当前浏览器会话，不代替主产品页的真实画笔、模板点击、拖动、布局和下载交互验收。

主产品本地流程的自驱验收页位于 `http://127.0.0.1:4177/product-acceptance.html`。它在同源 iframe 中以项目合成图实际完成 1280×720 的“保真整理 → 1:1 + 旋转 → PNG”和 1440×900 的“横版封面模板 → PNG”，捕获下载 Blob、核对 PNG 签名并重新解码，同时检查完整显示、横向溢出、任务分组、结果换任务、设置返回、旧下载失效、关键焦点和流程内 `console.error`。它不会调用远程服务，也不验证操作系统下载目录；在一个浏览器中通过仍不能替代 Chrome / Edge 两个冻结版本的正式矩阵。

PhotoRoom 抠图可先把账户 Key 以单个 `sandbox_` 前缀写入 `.env`；页面会明确标出沙盒状态和带水印结果。沙盒只验证远程流程与透明结构，不计作正式成品质量结论；正式质量检查仍需切回普通 Key 后小规模受控运行。

若服务端环境中设置 `OPENAI_API_KEY`，R0 探针可发送 CR1 图片编辑请求。当前路径没有真实 Source Card、冻结参考对或创意内容 QA，不能升级为 E1 或 R1-product 证据，也不应用敏感真人图测试。

### 手机局域网探针

电脑与手机连接同一个可信私人 Wi-Fi 后，可运行：

```powershell
npm.cmd run mobile
```

该模式只用于历史小屏与局域网访问探测，会强制关闭 AI 接口；它不是首轮产品范围、正式移动端验收、HTTPS 部署或产品发布。局域网传输使用明文 HTTP，本轮只允许合成图或确认不含真人、位置、证件、品牌和其他敏感信息的测试图，不应用真实用户照片验证。

工程检查：

```powershell
npm.cmd run verify
```

`verify` 会先核对研究资产和 manifest，再运行全量测试及语法检查。R0 的浏览器证据边界见 [BROWSER_VALIDATION.md](BROWSER_VALIDATION.md)，当前产品本地流程的实际运行记录见 [BROWSER_ACCEPTANCE_EVIDENCE.md](BROWSER_ACCEPTANCE_EVIDENCE.md)。

## 文档权威顺序

| 文档 | 角色 |
| --- | --- |
| [STATUS.md](STATUS.md) | 当前研究、工程、能力和发布状态的唯一事实源 |
| [CAPABILITY_MAP.md](CAPABILITY_MAP.md) | 九类原子能力、产物和依赖 |
| [CAPABILITY_REGISTRY.md](CAPABILITY_REGISTRY.md) | 候选引擎、精确版本、许可、资源和证据状态 |
| [EVIDENCE_AND_RELEASE.md](EVIDENCE_AND_RELEASE.md) | C/U/E/R/O/G/V 与发布门禁 |
| [RESEARCH_RECORD_TEMPLATES.md](RESEARCH_RECORD_TEMPLATES.md) | 夹具、预注册、R1、O1、证据和 Release Gate 的可填写模板 |
| [TASK_CATALOG.md](TASK_CATALOG.md) | 用户效果、场景配方和旧探针 ID 映射 |
| [SOCIAL_GRID_GUIDE.md](SOCIAL_GRID_GUIDE.md) | 社交九宫格的原图限制、适用场景、接缝风险与项目原创对照演示 |
| [FORMAT_CONVERSION.md](FORMAT_CONVERSION.md) | PNG / JPEG 格式转换、透明填色、有损质量与结果说明合同 |
| [CANVAS_FIT.md](CANVAS_FIT.md) | 完整图片适配、固定比例画布、留白与非 AI 扩图边界 |
| [UPLOAD_SPECIFICATION.md](UPLOAD_SPECIFICATION.md) | 纯本地上传规格适配组合流程、固定步骤与 JPEG 第一版边界 |
| [DOCUMENT_ARCHIVE.md](DOCUMENT_ARCHIVE.md) | 四角裁正、文档效果、JPEG 与附件上限的纯本地组合流程 |
| [DETAIL_ENHANCEMENT.md](DETAIL_ENHANCEMENT.md) | 本地轻度降噪与清晰度的设计合同、处理边界、状态和验证范围 |
| [OLD_PHOTO_RESTORATION.md](OLD_PHOTO_RESTORATION.md) | 老照片本地基础整理、生成式实验与 Provider 边界 |
| [DEMO_ASSETS.md](DEMO_ASSETS.md) | 产品内项目原创演示图、Codex 参考图与固定文件身份 |
| [PRODUCT.md](PRODUCT.md) | 目标产品与体验假设 |
| [V1_FLOW.md](V1_FLOW.md) | 未来最小冻结验证界面与目标产品交互契约；不代表 R0 已实现 |
| [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md) | 数据流、最小留存、删除、安全与远程服务前置门槛 |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | 桌面首轮的逻辑组件、状态归属、持久化、队列、对象与恢复原则 |
| [UI_SURFACES_AND_ACCESSIBILITY.md](UI_SURFACES_AND_ACCESSIBILITY.md) | R0、研究审阅、验证、正式桌面与运维支持 surface 的边界 |
| [OBSERVABILITY_AND_OPERATIONS.md](OBSERVABILITY_AND_OPERATIONS.md) | Run 事件、错误、日志、trace、metrics、性能、告警与问题定位 |
| [QUALITY_AND_COMPATIBILITY.md](QUALITY_AND_COMPATIBILITY.md) | 桌面浏览器、文件、色彩、测试分层和兼容性 profile |
| [DEPLOYMENT_RELEASE_AND_RECOVERY.md](DEPLOYMENT_RELEASE_AND_RECOVERY.md) | 部署版本、运行态迁移、灰度、回滚、备份与恢复 |
| [RESEARCH.md](RESEARCH.md) | 待回答问题、研究设计和用户研究 |
| [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) | 形成性测试和冻结 V1 验证的参与者、任务分配、同意与数据协议 |
| [M2_INTERNAL_WALKTHROUGH.md](M2_INTERNAL_WALKTHROUGH.md) | 基础编辑器 5–8 人早期内部走查的固定任务、主持规则、匿名记录与通过算法 |
| [PRODUCT_STABILIZATION_ROADMAP.md](PRODUCT_STABILIZATION_ROADMAP.md) | 当前内部 Alpha 的代码治理、样例页、错误体验、场景工作流和走查执行总纲 |
| [CODE_QUALITY_AND_MODULE_BOUNDARIES.md](CODE_QUALITY_AND_MODULE_BOUNDARIES.md) | S1 代码质量契约、`main.js` 职责盘点、目标模块边界与回归覆盖表 |
| [EXAMPLES_GALLERY.md](EXAMPLES_GALLERY.md) | S2 样例展示页的来源标签、首批范围、视觉与交互合同、覆盖记录 |
| [ERROR_EXPERIENCE.md](ERROR_EXPERIENCE.md) | S3 七类错误事实、主错误页、恢复动作、浏览器矩阵与边界 |
| [PRIVACY_SHARE.md](PRIVACY_SHARE.md) | S4 隐私友好分享副本的 metadata、尺寸 / 体积、非匿名边界与验收 |
| [ROADMAP.md](ROADMAP.md) | 从文档归一到邀请测试的阶段顺序 |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | 产品总体实施顺序、架构边界与长期退出条件 |
| [research/README.md](research/README.md) | 可执行研究目录、合成夹具、生成与校验命令 |
| [research/SLICE_01_CONTRACT.md](research/SLICE_01_CONTRACT.md) | 第一刀实现授权、范围、桌面研究 UI 与覆盖矩阵 |
| [research/SLICE_01_EVIDENCE.md](research/SLICE_01_EVIDENCE.md) | Slice 01 自动化、HTTP、浏览器主路径、错误路径与兼容限制 |
| [research/SLICE_02_CONTRACT.md](research/SLICE_02_CONTRACT.md) | Slice 02 四份冻结研究合同、参考适配器与五 partition 隔离边界 |
| [research/SLICE_02_EVIDENCE.md](research/SLICE_02_EVIDENCE.md) | Slice 02 确定性生成、合同 / 资产 hash、隔离与负例验收记录 |
| [research/SLICE_03_CONTRACT.md](research/SLICE_03_CONTRACT.md) | Slice 03 格式政策、字节级技术 observer 与仓库外密封仪式的冻结范围 |
| [research/SLICE_03_EVIDENCE.md](research/SLICE_03_EVIDENCE.md) | Slice 03 矩阵 / profile、开放夹具、observer、密封仪式和 fail-closed 验收记录 |
| [research/SLICE_04_CONTRACT.md](research/SLICE_04_CONTRACT.md) | Slice 04 Sharp 复合候选来源锁、完整预注册与未签发 seal request 边界 |
| [research/SLICE_04_EVIDENCE.md](research/SLICE_04_EVIDENCE.md) | Slice 04 metadata 制品、上游 hash、负例和非 Gate B 验收记录 |
| [research/SLICE_05_CONTRACT.md](research/SLICE_05_CONTRACT.md) | Slice 05 operation-specific Gate B smoke 与开放 calibration 的历史范围冻结；不随当前进度原地改写 |
| [research/SLICE_05_EVIDENCE.md](research/SLICE_05_EVIDENCE.md) | Slice 05 machine definition、runtime closure、真实 smoke non-pass、hash、Gate B 拒绝与 calibration 禁止边界 |
| [research/SLICE_06_CONTRACT.md](research/SLICE_06_CONTRACT.md) | Slice 06 新版本开放 diagnostic characterization、24 次计划分母、无 Gate B authority 与禁止 calibration 的范围冻结 |
| [research/SLICE_06_EVIDENCE.md](research/SLICE_06_EVIDENCE.md) | Slice 06 唯一注册 diagnostic 的结果树、oracle 子因、determinism、ledger 与 non-capability 边界 |
| [research/slice-06/README.md](research/slice-06/README.md) | Slice 06 Phase B protocol、Phase C results-zero definition、机器树 pins、fake-only 验收与未来 result 边界 |
| [research/SLICE_07_CONTRACT.md](research/SLICE_07_CONTRACT.md) | Slice 07 Sharp 像素处理 + candidate-owned canonical PNG encoder、36-attempt Gate-B smoke 与禁止 calibration 的范围合同 |
| [research/SLICE_07_EVIDENCE.md](research/SLICE_07_EVIDENCE.md) | Slice 07 results-zero definition pins、计数、校验与证据边界 |
| [research/SLICE_07_RESULT_EVIDENCE.md](research/SLICE_07_RESULT_EVIDENCE.md) | Slice 07 唯一 registered smoke、Gate-B 双拒绝与 driver binding 根因 |
| [research/slice-07/README.md](research/slice-07/README.md) | Slice 07 frozen definition workspace 与执行前硬停止 |
| [research/SLICE_08_CONTRACT.md](research/SLICE_08_CONTRACT.md) | Slice 08 typed case-context、新 36-attempt 分母与禁止选择性补跑的 scope-only 合同 |
| [research/SLICE_08_EVIDENCE.md](research/SLICE_08_EVIDENCE.md) | Slice 08 results-zero definition 与已封存 partial protocol-failure 的 UTC、tree pins、分母、验证和硬停止 |
| [research/slice-08/README.md](research/slice-08/README.md) | Slice 08 typed protocol / runner / definition tooling workspace 与定义前硬停止 |
| [research/SLICE_09_CONTRACT.md](research/SLICE_09_CONTRACT.md) | Slice 09 gold identity、新 36-attempt 分母与禁止重放的 scope-only 合同 |
| [research/SLICE_09_EVIDENCE.md](research/SLICE_09_EVIDENCE.md) | Slice 09 definition、唯一 registered Gate-B smoke、结果树、ledger、双 pass 与非产品边界 |
| [research/slice-09/README.md](research/slice-09/README.md) | Slice 09 已冻结的 definition 与 registered result workspace |
| [research/SLICE_10_CONTRACT.md](research/SLICE_10_CONTRACT.md) | Slice 10 开放 calibration 的 96-source / 288-attempt 分母、零重试、停止规则与非 C1 边界 |
| [research/SLICE_10_EVIDENCE.md](research/SLICE_10_EVIDENCE.md) | Slice 10 唯一 registered invocation 的 4-file failure tree、协议根因、lifecycle 失真与禁止重跑边界 |
| [research/slice-10/README.md](research/slice-10/README.md) | Slice 10 已冻结的 results-zero machine definition workspace（保持其冻结时口径） |
| [research/SLICE_11_CONTRACT.md](research/SLICE_11_CONTRACT.md) | Slice 11 expected projection、worker lifecycle、新 96 / 288 分母与非 C1 边界 |
| [research/slice-11/README.md](research/slice-11/README.md) | Slice 11 冻结 definition workspace；运行后的不可变 startup-failure 事实见外部 evidence |
| [research/SOURCECARD_MATTING_BASELINE_EVIDENCE.md](research/SOURCECARD_MATTING_BASELINE_EVIDENCE.md) | 3 个原创合成场景的 SourceCard.v0 + MATTE-SIMPLE 纵向报告与精确指标 |
| [research/SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md](research/SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md) | 客观 exposure-signal observer 与 MODNet / RVM 连续 Alpha 候选许可登记 |
| [research/CONTINUOUS_ALPHA_EVALUATION_EVIDENCE.md](research/CONTINUOUS_ALPHA_EVALUATION_EVIDENCE.md) | 6-source / 12-asset continuous-alpha results-zero 合同、分母、指标与精确 pins |
| [research/MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md](research/MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md) | 自然人像分区/权利/隐私治理与 MODNet/RVM 获取、runtime 硬停止条件 |
| [UPSTREAM.md](UPSTREAM.md) | 第三方来源、精确版本、市场入口、许可和本地复制边界的事实账本 |
| [MARKET_LANDSCAPE.md](MARKET_LANDSCAPE.md) | 市场比较口径、已固定入口、空缺研究簇与产品决策规则 |

[CAPABILITY_REVIEW.md](CAPABILITY_REVIEW.md)、[EFFECT_SHORTLIST.md](EFFECT_SHORTLIST.md) 与 [PORTRAIT_PARAMETERS.md](PORTRAIT_PARAMETERS.md) 分别是历史 Skill 审计、创意实验附录和报名头像场景草案，不覆盖上述当前规范。[DELIVERY_CONTRACT.md](DELIVERY_CONTRACT.md) 与 [BROWSER_VALIDATION.md](BROWSER_VALIDATION.md) 只记录 R0 工程探针。

## 研究边界

- Slice 01–11 的研究设施、项目原创合成夹具、codec lineage 与不可变结果保持只读。Slice 09 两项 Gate B 均通过；Slice 10 在 1 / 288、Slice 11 在 0 / 288 处分别因协议错误 fail closed；这些都不是 formal holdout、C1 或产品支持。项目停止新增 normalize / export runner slice和当前 MVP 的模型 / 权重获取；下一步建设基础编辑器产品路径，任何历史 research candidate 若未来接入 server / web 都必须以新的产品合同和测试重新登记。
- 首轮验证和发布只声明冻结的桌面浏览器环境；移动与未验收桌面浏览器不得从 R0 样式或代码存在推导为支持。
- `single-image-studio` 不通过相对路径导入兄弟项目代码或资产。
- GitHub 仓库代码许可不自动覆盖模型权重、训练数据或输出用途。
- 未进入发布 allowlist 的来源、参考、结果和失败图不得作为产品样例。
- 普通报名头像是场景配方；官方护照、签证或证件 profile 继续独立验证。
- 多张来源图片的逐张任务与合集交付、自由画布和平台官方模板均后置；单张图片派生的商品四规格、报名照六规格与社交四规格套装已进入当前工程能力。

来源和许可边界见 [UPSTREAM.md](UPSTREAM.md)。
