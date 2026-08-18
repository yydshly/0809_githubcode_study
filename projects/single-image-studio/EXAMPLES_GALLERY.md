# 样例与效果展示页合同

> 生效日期：2026-08-18
>
> 阶段：`PRODUCT_STABILIZATION_ROADMAP.md` · S2 第一批

## 1. 设计契约

| 字段 | 约定 |
| --- | --- |
| Entry mode | revision-led；在内部 Alpha 上新增独立展示页 |
| Target user and context | 想先了解“能做什么、适合什么图”的普通试用者；内部维护者复核能力边界 |
| Desired first impression | 一眼看到真实原图与结果，而不是任务按钮或研究术语 |
| Visual ambition | Functional，保留产品当前纸张、深绿与浅黄视觉语言 |
| Experience architecture | Editorial Flow |
| Visual constraints | 图片完整显示；桌面对照、窄屏上下堆叠；来源标签始终可见 |
| Information constraints | 每项必须说明来源、处理位置、参数、输出和限制；参考图不得冒充产品结果 |
| Operation constraints | 页面只展示与本地即时生成，不上传图片、不调用远程 Provider、不自动开始产品任务 |
| State constraints | 加载、生成成功、生成失败和筛选状态均可见；单个样例失败不隐藏其他样例 |
| Environment constraints | `npm run start`；`http://127.0.0.1:4177/examples.html`；首轮桌面 Chromium 与窄屏布局 |
| Primary journey | 打开展示页 → 按来源筛选 → 查看原图 / 结果 → 阅读参数与限制 → 自主进入工作室 |
| Required artifacts | strict manifest、HTML、CSS、JS、资产 / DOM 测试、浏览器观察 |
| Autonomy authorization | 用户已明确继续按路线开发；不需要再次确认可逆的本地展示实现 |
| User-decision boundary | 新外部素材、远程付费结果、品牌视觉重设计或公开发布需要另行决定 |
| Observable completion criteria | 至少五项真实对照；来源不混淆；图片不截断；本地 runtime 结果可生成；窄屏可读 |

## 2. 当前样例范围

| 样例 | 原图 | 结果性质 | 处理边界 |
| --- | --- | --- | --- |
| 水平校正 | 项目原创 AI 合成工作室 | 页面即时调用产品 renderer | 本地；手动 `-5°`；不是自动地平线识别 |
| 老照片基础整理 | 项目原创虚构老照片 | 页面即时调用产品 renderer | 本地固定参数；不修脸、不补细节 |
| 隐私友好分享副本 | 项目原创斜拍虚构文档 | 页面即时执行 metadata 清理、尺寸 / 体积限制和 JPEG 重开 | 不检测画面敏感内容，不声称匿名 |
| 文档裁正 / 归档 | 项目原创斜拍虚构文档 | 页面即时调用产品四角裁正、清晰彩色和 JPEG | 人工登记四角；不自动找边、不 OCR |
| 严格上传规格 | 同一斜拍虚构文档 | 页面即时生成最长边 1200 px、≤ 1 MB JPEG | 只证明技术规格，不证明网站内容审核 |
| 500 KB 压缩 | 同一斜拍虚构文档 | 页面即时执行产品多档 JPEG 压缩 | 保持比例；细线和文字仍需放大检查 |
| 适合九宫格 | 项目原创 AI 合成静物 | 项目冻结布局确定性生成联系图 | 本地；不代表平台发布规格 |
| 不适合九宫格 | 项目原创 AI 合成虚构人像 | 项目冻结接缝覆盖图 | 解释性反例；不作内容识别 |
| Codex 修复参考 | 同一虚构老照片 | Codex 内置图片编辑参考 | 不是网页运行结果，不证明 Provider 质量 |

当前不纳入 PhotoRoom 沙盒结果。远程样例必须单独登记 Provider、环境、水印、调用时点、输入 / 输出身份与费用边界后才可进入。

## 3. 来源与结果标签

- `project-original-ai`：由项目使用 Codex 生成的原创合成素材；可能包含虚构人物，但不是用户照片；
- `product-runtime`：当前浏览器通过产品本地 renderer 即时生成的结果；
- `deterministic-project-output`：使用项目冻结算法生成并提交的演示结果；
- `codex-reference`：Codex 内置图片编辑生成的视觉参考，不是产品运行时 Provider 输出。

页面不得把这些标签合并成“AI 处理结果”。

## 4. Coverage record

| 用户阶段 | 要求 | Surface / state | Evidence | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 样例页 | strict manifest | 九项资产与 runtime 定义 | schema / hash / path tests | Stage 0 | pass | 九项 exact definitions、六项 runtime null identity 与负例通过 |
| 样例页 | 第一视图与信息层级 | 桌面默认页 | browser + DOM contract | Stage 2–3 | pass | 来源、处理位置、参数、限制和工作室入口可见 |
| 样例页 | 对照与筛选 | all / local / reference | interaction + unit tests | Stage 4–5 | pass | 全部 9、本地 8、参考 1；浏览器筛选通过 |
| 样例页 | 状态与失败隔离 | runtime generating / ready / failed | browser + unit tests | Stage 6 | pass | 六项 renderer 结果 ready；失败仍保留卡片与具体原因 |
| 样例页 | 窄屏 | `390px` | CSS / browser observation | Stage 7 | pass | 原图 / 结果上下排列，18 张 contain，无横向溢出 |
| 样例页 | 工程闭合 | 产品测试与语法 | `verify:product` | Stage 9 | pass | 354 / 354；273 个 JavaScript 文件语法通过 |

## 5. 非目标

- 不把展示页变成第二套编辑器；
- 不在页面中存储用户图片、历史或账号；
- 不宣称自动推荐、自然图质量、平台合规或档案级修复；
- 不为凑数量使用来源不明的网上图片；
- 不在第一批增加远程 Provider 调用。

## 6. 第一批实施与浏览器结果

- 用户入口：`http://127.0.0.1:4177/examples.html`，产品页顶栏提供“效果样例”；
- manifest：5 项样例、7 个去重静态资产身份、2 项本地 runtime 结果；路径、bytes、尺寸与 SHA-256 全部复算；
- runtime：水平校正与老照片基础整理直接调用当前产品 `runLocalEditor`，不保存结果、不调用远程服务；
- 静态结果：九宫格联系图 / 接缝图明确标为项目确定性输出；老照片生成式图明确标为 Codex 静态参考；
- 浏览器验收 run `c7c6c5c4-d3e2-4f10-8b92-4567890123de`：1180 px 与 390 px 两项均 pass；每项均核对 5 张卡片、10 张实际加载图片、2 个 runtime 结果、`object-fit: contain`、筛选与无横向溢出；
- 完整产品验证 339 / 339，267 个 JavaScript 文件语法通过。

浏览器验收最初发现旧参考页和新样例页错误读取不存在的 `pixelValidation.pass`。renderer 的真实合同是：失败直接抛错，成功返回带 `pixelCount` 的统计对象。现已改为核对 `pixelCount === width × height`，并同步修复 `straighten-reference.js`。第二次失败来自离屏验收 iframe 遵守 lazy loading；普通页面继续 lazy，只有显式 acceptance query 使用 eager，以便完整复核全部静态图。

## 7. 第二批实施与 S2 退出决定

- `imagegen` 生成并登记一张项目原创斜拍虚构文档：`1536 × 1024`、`2,421,915` bytes、SHA-256 `e3ddeb6d…52004`；不含真实个人信息、品牌或水印；
- 同一来源通过产品本地链生成三种不同目标结果：文档裁正 / 清晰彩色 / 1 MB、严格上传 1200 px / 1 MB、完整比例压缩 / 500 KB；
- 浏览器 run `faf9f8f7-a6b5-4342-8ec5-7890123456ab` 在 1180 px 与 390 px 均通过：8 张卡片、16 张完整图片、5 个 runtime 结果、筛选和无横向溢出；
- 实际结果分别为：文档裁正 `709 × 823` / `100 KB`、严格上传 `1200 × 800` / `177 KB`、500 KB 压缩 `1536 × 1024` / `290 KB`；
- 验收补充等待全部图片 `complete + naturalWidth`，消除桌面快速加载时的竞态；普通展示页仍使用 lazy loading；
- 完整产品验证 339 / 339，267 个 JavaScript 文件语法通过。

S2 判定为 **practical-complete** 时已有 8 项；S4 后增至 9 项。现有样例覆盖几何、老照片基础整理、文档、上传 / 压缩、隐私分享、社交切图和生成式参考边界。PhotoRoom 沙盒结果因缺少适合提交的完整输入 / 输出持久身份，保持不进入展示页。

## 8. S4 场景接入

S4 新增的隐私友好分享副本已作为第 9 项样例接入；当前 manifest 为 9 项、6 个 runtime。浏览器 run `7c7d7e7f-8081-4cba-8aed-5678901234cd` 在 1180 / 390 px 以 2 / 2 通过，核对 9 张卡片、18 张完整图片、6 个本地即时结果、筛选和无横向溢出。该样例使用项目原创斜拍文档，输出 `1536 × 1024` / `290 KB` JPEG，并明确“文件信息清理不等于画面匿名”。
