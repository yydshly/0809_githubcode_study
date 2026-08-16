# Single Image Studio 当前执行计划

> 生效日期：2026-08-16
>
> 基线：`main@6ecd53c`
>
> 文档角色：本文件是当前产品执行顺序的事实源。`ROADMAP.md`、Slice 合同和历史 Evidence 继续保存长期研究与审计信息，但不得覆盖本文件的近期优先级。

## 1. 执行结论

项目从现在起由“继续扩展研究切片”切换为“先做出普通用户能完成任务的单图产品”。

当前决策是：

1. **先完成无模型的基础单图编辑闭环。**
2. **抠图是第二阶段的核心增强，不是产品底座。**
3. 抠图第一实现采用可替换的云端 Provider；当前不要求用户安装模型，也不继续为 MVP 推进 MODNet / RVM 本地运行时。
4. 自动抠图必须配合最小的保留 / 擦除修正；自动结果不能修正时，不视为完整产品能力。
5. Slice 01–11、SourceCard / Matting baseline、候选来源和机器证据全部保留为只读研究资产；不创建 Slice 12，不重跑已关闭版本。
6. C1 / U1 / E1 / R1 / O1 / G1 / V1 与 Release Gate 继续约束公开能力声明和正式发布，但不再阻止开发内部产品试用版和获取真实产品反馈。

## 2. 当前能力盘点

### 2.1 已经实现、可以复用

| 能力 | 当前事实 | 后续用途 |
| --- | --- | --- |
| 单文件输入 | JPEG / PNG / WebP；16 MiB、4000 万像素；MIME、扩展名、文件头、尺寸和 SHA-256 预检 | 直接保留，补充真实浏览器回归 |
| 来源与运行状态 | 来源 revision、run ID、旧响应失效、UNKNOWN、显式重试和下载绑定 | 作为产品状态底座保留 |
| 本地图片处理 | 预设比例居中裁切、缩放、自然 / 暖调 / 黑白、PNG / JPEG 重编码 | 作为基础编辑起点，不当作完整编辑器 |
| 下载门控 | 当前 run、格式、声明、byte length 与 hash 校验 | 继续使用，并补正式输出重开验证 |
| 创意 API 工程路径 | `gpt-image-2` 图片编辑请求、状态查询、幂等和失败闭合 | 保留为实验功能，不进入当前 MVP 主路径 |
| 研究资产 | synthetic fixtures、Sharp 来源锁、canonical PNG encoder lineage、Alpha 指标、rights / provenance 结构 | 精简复用，不把研究通过写成产品通过 |

最近记录的 7-file 产品工程定向测试为 44 / 44 通过；它们证明工程状态和接口约束，不证明图片效果质量。M0 会把这 7 份测试固化为独立命令并重新运行，而不是从全量 research suite 推断产品状态。

当前可复算命令为：

```powershell
node --test tests/api-client.test.mjs tests/mobile-preview.test.mjs tests/runtime-identity.test.mjs tests/server.test.mjs tests/source-file.test.mjs tests/state-machine.test.mjs tests/task-catalog.test.mjs
```

### 2.2 只是脚手架或研究，不是产品能力

- “正在分析图片”实际只做浏览器解码和固定任务目录，不是真实 SourceCard 或内容推荐。
- `UT-CUTOUT`、`UT-SOLID-BG`、`UT-PORTRAIT` 仍为 disabled / unverified。
- Slice 09 的 normalize / export Gate-B 结果没有接入 `web/` 或 `server/` 产品路径。
- SourceCard + MATTE-SIMPLE 只在项目原创 synthetic fixture 上运行；语义字段仍为 unknown。
- MODNet / RVM 只有来源、许可和运行时元数据；权重、依赖安装、推理和自然图片结果均为 0。

### 2.3 仍未实现

- 可视化裁切框、旋转、翻转、自定义尺寸、基础光色滑杆、撤销与重置；
- 透明输入保留、产品级输入归一化和输出重开验证；
- 云端抠图 Provider、Alpha / mask 产物和供应商切换边界；
- 保留 / 擦除画笔、透明棋盘格、边缘检查与背景合成；
- 产品级任务内容 QA；
- 产品页面 DOM 集成测试、真实浏览器 E2E 和下载回归；
- 持久任务、正式删除对账、公共部署与用户验证。

## 3. 产品目标

### 3.1 一句话产品

让普通用户无需理解模型或图像管线，就能把一张图片快速整理成可用、可预览、可下载的结果；需要去背景时，系统提供自动结果和简单修正。

### 3.2 首轮用户任务

```text
选择一张图片
→ 正确预览
→ 裁剪 / 旋转 / 调整尺寸和基础光色
→ 选择输出格式与质量
→ 比较
→ 下载
```

第二阶段在同一工作区增加：

```text
自动去背景
→ 透明预览
→ 保留 / 擦除修正
→ 透明 PNG 或纯色换底
→ 下载
```

### 3.3 首轮平台与非目标

首轮仍只支持 Windows 桌面 Chrome / Edge、鼠标和键盘、单图。当前不做：

- 多图、批量、账号、团队、计费和公共云发布；
- 手机 / 平板产品、Safari、Firefox、HEIC；
- 自由画布、图层系统、字体、贴纸、模板市场；
- 本地模型安装、模型选择器、多模型自动路由；
- 官方证件照合规承诺；
- 以继续增加 Slice、schema、seal 或 runner 数量代替产品验收。

## 4. 简化架构

### 4.1 产品路径

```text
Browser Editor
  ├─ Source Intake        文件预检、hash、预览
  ├─ Edit State           非破坏参数、撤销 / 重置
  ├─ Local Renderer       裁剪、旋转、尺寸、光色、合成
  ├─ Background Provider  第二阶段；可替换云端实现
  ├─ Mask Revision        保留 / 擦除修正
  └─ Export Validator     重开、尺寸、格式、Alpha、hash
```

当前 Node 服务继续承担静态资源和可选远程 Provider 代理。MVP 阶段不提前建设队列、对象存储或复杂微服务；只有真实付费调用、跨刷新恢复或公开 beta 证明需要时，才升级持久任务设施。

### 4.2 Provider 边界

UI 不直接知道供应商，也不直接消费供应商的私有响应。统一接口只返回项目自己的 `BackgroundRemovalArtifact`：

```text
removeBackground(providerInput, options)
  → BackgroundRemovalArtifact {
      sourceHash + sourceRevision + geometryRevision + providerInputHash,
      width + height + coordinateSpace,
      alpha8CoveragePlane（0=透明，255=不透明）,
      foregroundRgbMode=source|provider-cleaned,
      rgbAssociation=unassociated|premultiplied,
      foregroundBytesRef + foregroundBytesHash（仅 provider-cleaned 时必填）,
      outputHash + providerReceiptId
    }
  | typed failure
```

`EditState` 分开维护 `geometryRevision` 与 `colorRevision`。`providerInput` 是完成色彩空间转换、方向处理和当前几何编辑后生成的精确输入 bytes；输出 Alpha 必须与它同尺寸、同坐标空间。裁切、旋转、翻转或 matting 工作尺寸变化会使已有抠图结果失效并要求用户显式重新运行；亮度 / 对比度 / 饱和度在 Alpha 之后应用，不触发新的远程调用；切换背景也不使 Alpha 失效。前景 RGB 是保留来源还是供应商清理后的结果必须明示；供应商若清理前景颜色，Artifact 必须实际承载对应 bytes 引用与 hash，不能只写一个 mode。

像素 Artifact 是不可变事实；会继续变化的调用、费用和删除状态放入独立 `ProviderCallReceipt`：

```text
ProviderCallReceipt {
  idempotencyKey + providerRequestId + providerId/version,
  status=running|terminal|unknown,
  estimatedCost + finalCost + currency + possiblyBilled,
  deletion=requested|confirmed|unsupported|not-requested,
  createdAt + updatedAt + retentionExpiresAt
}
```

实现顺序：

1. `FakeBackgroundRemovalProvider`：只用于产品状态、失败和 E2E 测试；
2. `CloudBackgroundRemovalProvider`：首个真实实现；
3. `BrowserModelProvider` / `LocalModelProvider`：仅在真实数据证明隐私、成本、延迟或离线需求后立项。

Provider 失败必须返回基础编辑器，不得用生成式补图冒充精确 Alpha。向云端发送图片前必须先展示服务方、发送内容、目的、保留 / 删除边界和费用提示，并取得本次明确同意。

### 4.3 像素与 Alpha 合同

基础编辑器固定使用一条可测试的处理顺序：

```text
decode + embedded-profile conversion to sRGB + EXIF orientation
→ strip EXIF/GPS/thumbnail and other private metadata
→ user rotate / flip
→ crop in oriented display coordinates
→ resize
→ RGB light/color adjustment（Alpha 原值不变）
→ PNG：编码 unassociated RGBA，并写明 sRGB 色彩声明
  JPEG：按用户明确选择的背景色合成
→ encode
→ 独立重开并核对尺寸、格式、透明/半透明像素、hash
```

预览可以使用降采样缓存，但正式导出必须从原始解码结果和当前 `EditState` 重新渲染；不得把预览截图当输出。“独立重开”指从已经编码的 bytes 创建新的解码对象，不读取 renderer 内存状态，不要求重新实现一套 JPEG / PNG codec。透明像素下的 RGB、半透明边缘和 premultiplication / unpremultiplication 必须有固定规则及回归 fixture，防止黑边、白边和隐藏色漂移。

MVP 初始资源边界为：输入继续沿用 40 MP 预检，但交互工作 raster 和正式输出均不超过 16 MP、单边不超过 8192 px；预览长边不超过 2048 px；预计同时存活的像素 buffer 总量不得超过 512 MiB。History 保存参数和有界 stroke / patch，不保存无限量全图快照；mask history 初始最多 200 strokes、64 MiB，超限前必须提示合并或停止，不得静默耗尽内存。以上数值在 M1a 的命名硬件测试后可以版本化收紧，放宽则需要新的性能证据。

## 5. 里程碑与验收

### M0 · 重新建立产品基线（1–2 个工作日）

目标：让下一次提交明确服务产品，而不是继续扩研究切片。

动作：

- 将 `main@6ecd53c` 记录为研究转向基线；
- 更新 README、STATUS、PRODUCT、ROADMAP 与本计划；
- 明确 Slice 01–11 为 archival research lineage；
- 拆分 `test:product`、`test:research:safe`、`check:syntax`、`verify:product`、`verify:research:safe`；
- `check:syntax` 动态覆盖全部跟踪 JS / MJS，避免手写清单继续过期；
- 修正产品页面“可运行首版”“已通过结果检查”等超过当前事实的文案；
- 选择并固定真实浏览器 E2E 驱动、Chrome / Edge 精确版本和两档视口；验收必须检查实际下载文件与 console error，而不是只点到按钮。

完成条件：文档只有一个当前执行顺序；安全验证命令不会下载模型、运行注册研究任务或覆写不可变结果。

### M1a · Renderer 与像素合同（4–6 个工作日）

目标：先让每次编辑和导出在像素层面可解释、可重复，不在 UI 上掩盖错误。

动作：

- 把方向、裁切、旋转 / 翻转、缩放、RGB 调整、Alpha 与编码实现为单一非破坏 renderer；
- 建立 `EditState`、有界 history、撤销 / 重做和重置，不让连续控件变化累积像素损坏；
- 实现 20 个项目原创或许可明确 fixture 的像素测试，覆盖透明、半透明、orientation、ICC / 非 sRGB、EXIF / GPS 清理、极小图、边界尺寸和 JPEG 显式底色；
- 导出后用独立路径重开，核对格式、尺寸、Alpha、byte length、SHA-256 与关键像素不变量。

完成条件：renderer 的处理顺序、坐标空间、Alpha 表示和输出合同有自动化回归；任何无效输出都不能成为可下载结果。

### M1b · 交互编辑器与浏览器闭环（4–6 个工作日）

目标：一个普通用户能够真实完成“打开 → 编辑 → 下载”。

动作：

- 把当前 `UT-TUNE` 从任务演示重构为可视化编辑工作区；
- 同时移除固定任务卡、伪“图片分析”和“已通过结果检查”等旧壳层，避免先按错误信息架构重做控件；
- 增加可拖动 / 缩放的裁切框、原比例 / 1:1 / 4:5 / 3:2、90° 旋转、翻转和重置；
- 增加目标宽高、保持比例、JPEG 质量、亮度 / 对比度 / 饱和度；
- 规定裁切框越界、键盘微调、最小裁切区域、图片更换和对象 URL 释放行为；
- 增加原图 / 结果对比、明确输出信息和导出忙碌 / 失败态；
- 用固定浏览器驱动验证两档视口、键盘主路径、实际下载文件和 console 零未处理错误。

完成条件：

- JPEG / PNG / WebP 输入以及 PNG / JPEG 输出主路径可用；
- 20 个项目原创或许可明确 fixture 的代表性主路径全部能打开、编辑、导出并重开；不要求把 20 个 fixture 与所有浏览器 / 视口做笛卡尔积；
- 换图、取消、重复执行和迟到结果不污染当前结果；
- `1280×720`、`1440×900` 的 Chrome / Edge 主路径 E2E 通过；
- 无 API key 时产品仍完整完成基础任务。

### M2 · 早期内部可用性走查（3–4 个工作日）

目标：确认基础编辑流程是否真的易用，而不等待抠图研究完成。

动作：

- 复核 M1b 已清理的任务卡和分析 / QA 文案，观察是否仍会造成错误预期；
- 做键盘、焦点、缩放、错误态和真实下载检查；
- 邀请 5–8 名符合目标用户特征的人员，在受控本地设备上使用项目原创或明确许可的测试图片完成单图整理任务；本阶段不接收、上传或保存参与者自己的照片；
- 记录完成时间、失败点、是否需要帮助和是否愿意保留结果。

通过目标：至少 80% 参与者在 2 分钟内、不经指导完成一次编辑与下载；失败必须能定位为输入、编辑、导出或理解问题。该活动只授予“继续迭代基础编辑器”的产品学习结论，不属于 V1 / 形成性研究证据，不评价图片模型质量，也不授权收集用户图片。边界见 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) 的早期内部走查条款。

### M3 · 云端抠图 Provider 选择（3–5 个工作日）

目标：决定真实抠图服务，不让供应商进入 UI 和编辑状态。

动作：

- 冻结最小 `BackgroundRemovalProvider` 合同；
- 先完成 fake provider 的成功、拒绝、超时、取消和迟到响应测试；
- 为抠图建立独立 typed route（建议 `POST /api/background-removal/runs` 与 `GET /api/background-removal/runs/:id`）及 `server/providers/background-removal/` adapter；不得把它伪装成现有只允许 CR1 的创意任务 payload；
- 在 [DATA_FLOW_AND_SECURITY.md](DATA_FLOW_AND_SECURITY.md) 登记输入数据流、同意、日志、保留 / 删除和地域边界，在 [UPSTREAM.md](UPSTREAM.md) 固定候选服务、API / 条款版本与来源；
- 对候选云端服务比较 Alpha / 透明输出、许可、数据保留、删除、地域、成本、延迟、限额和错误语义；
- 使用 12–20 个项目原创或许可明确的图片进行小规模测试，不使用真实用户照片；
- 选择一个主 Provider；没有候选满足隐私或质量要求时，保持手动编辑，不仓促引入本地模型。

第一次真实调用前必须冻结 `ProviderEvaluationPlan`：候选 API / 条款日期、隐私硬门、允许地域 / 保留 / 训练用途、单次与总预算、最大延迟和失败率、synthetic Alpha / boundary 指标、灾难误删上限、分层人工判断规则、修正后可完成率与 no-go 条件。具体阈值只能在看结果前依据候选价格和业务预算写入；未知隐私边界直接 no-go，不能用质量分数抵消。

即使 MVP 不建设完整队列，也必须持久保存上节定义的最小调用收据。普通图片 SHA-256 不是匿名数据：浏览器本地完整性 hash 与服务端操作收据分开，收据优先使用 run-scoped HMAC 或加密 hash，并在 M3 冻结访问范围和 TTL；不得把可跨会话关联的 plain hash 写入普通日志。不得保存图片正文或密钥。跨刷新后状态未知时只允许查询 / reconcile，不得盲目再次计费。

完成条件：形成一份可审计的 Provider 决策记录、精确 API 版本 / 条款日期、预算上限、删除验证和退出方案；在真正发送任何图片前，产品能展示并记录明确的数据发送同意。

### M4 · 抠图、修正与最小换底闭环（7–10 个工作日）

目标：把抠图变成用户可完成的任务，而不是模型 demo。

动作：

- **M4a（3–4 日）**：接入 Provider、完成 source / geometry / input hash 绑定、透明棋盘格、透明 PNG、技术 QA、隐私拒绝和服务失败回退；
- **M4b（4–6 日）**：完成保留 / 擦除画笔、撤销 / 重做、黑白彩底边缘检查、纯色换底、分层质量验收和浏览器 E2E；
- Provider 返回项目内部 `BackgroundRemovalArtifact`，并绑定当前 source revision、geometry revision、provider input hash 和 run；
- 增加透明棋盘格、黑白彩底边缘预览；
- 增加最小保留 / 擦除画笔、笔刷大小、撤销 / 重做；
- first-pass 与 corrected-pass 分开记录；
- 首轮只交付透明 PNG 和纯色换底；背景图片合成后置，避免同时引入新的画布 / 定位交互；
- 每次候选结果先过技术 QA（来源 / revision、尺寸、坐标、bytes / hash、Alpha 范围、PNG 重开），再由用户确认自动结果或修正结果；不能只相信 `hasAlpha` 声明；
- Provider failure / unknown、迟到结果、换图或旧 geometry revision 均不得覆盖当前状态或解锁下载；
- 内部试用页提供删除本次远程处理记录的入口，并显示 `ProviderCallReceipt` 的删除状态；供应商不支持即时删除时必须明示其保留期；
- Provider 失败、隐私不同意或服务不可用时，回到基础编辑器。

完成条件：20–30 个许可明确任务完成首轮与修正后验收；synthetic fixture 报告 Alpha MAE、boundary MAE、孔洞与灾难误删，许可明确的自然任务按人物 / 物体、头发 / 毛发、半透明、孔洞和复杂背景分层报告首轮与修正后结果；不允许只保留成功案例。使用 fake provider 在 Chrome / Edge 覆盖成功、拒绝、超时、取消、迟到、换图、旧 revision、修正、透明下载和纯色换底。输出能重开，主体 / Alpha / 背景引用不串图；任何失败结果不能解锁下载。

### M5 · 抠图可用性复核与 beta readiness 决策

M4 完成后先用新的 5–8 名目标用户特征参与者和项目提供图片做抠图任务走查，分别记录自动首轮、人工修正、透明导出和纯色换底的完成时间、修正负担与失败原因；它仍不是 V1，也不接收参与者自己的照片。随后才决定：

- 是否具备申请小范围邀请 beta 的条件；该里程碑是 go / no-go 决策，不等于已经上线；
- 是否保留创意 API 为独立实验入口；
- 是否需要自然增强；
- 是否因成本 / 隐私 / 延迟启动浏览器或本地模型；
- 是否因人物任务占主流恢复 MODNet portrait-specialist 研究；
- 是否因用户需要任意对象点击选择而研究 SAM 类交互分割。

这些决定由产品数据触发，不由候选模型存在与否触发。

M5 必须写出且只写出一个版本化决策：`prepare-invite-beta`、`keep-internal-and-iterate`、`stop-cloud-cutout` 或 `open-local-model-evaluation`。任何一个值都不自动等于发布；`prepare-invite-beta` 仍需另开范围，补齐该 beta 所需的隐私、运维、治理、兼容性和用户研究门。未来“质量 + 背景 + 创意”mixed beta 继续使用 [PRODUCT.md](PRODUCT.md) 的完整公式，不能与本次窄 MVP-B readiness 混名。

## 6. 优先级

### Now

1. 产品重规划文档与研究基线记录；
2. 修复验证命令覆盖；
3. 修正文案和虚假 QA 表述；
4. 为 `local-processing.js` 建立像素 / 输出测试；
5. 实现基础编辑器的 `EditState` 与可视化控件；
6. 建立产品浏览器 E2E；
7. 完成基础编辑器早期内部可用性走查。

### Next

8. Provider 抽象与 fake provider；
9. 云端候选小规模评估与隐私 / 成本记录；
10. 透明预览、手动 mask 修正、透明 PNG 与纯色换底；
11. 抠图专项可用性走查与 beta readiness 决策。

### Later

- 本地模型、浏览器模型、多模型路由；
- SourceCard 语义推荐；
- 自然增强、创意效果扩展；
- 持久队列、对象存储、账号、计费与公开部署；
- 正式 holdout、C1 / U1 / R1 / O1 / G1 / V1 与 Release Gate 升级。

## 7. 测试与提交纪律

### 7.1 验证层级

```text
verify:product
  = 产品单元测试 + DOM / 浏览器 E2E + syntax + diff check

verify:research:safe
  = 安全的研究 validator / fake tests
  ≠ 注册运行、模型下载、真实远程调用或结果覆写
```

真实云端调用、模型获取和不可变研究运行必须使用单独显式命令，绝不进入默认 `npm test` 或 `verify:product`。

### 7.2 提交边界

建议顺序：

1. `docs(single-image-studio): rebaseline product execution plan`
2. `chore(single-image-studio): align safe verification commands`
3. `feat(single-image-studio): build basic editor vertical slice`
4. `test(single-image-studio): add product browser acceptance`
5. `test(single-image-studio): record early editor usability walkthrough`
6. `feat(single-image-studio): add background removal provider boundary`
7. `feat(single-image-studio): add mask correction and solid-background composition`

每个提交都必须：

```text
git status
→ 相关定向测试
→ verify:product
→ git diff --check
→ 检查 staged diff
→ commit
→ push
→ 确认 main 与 origin/main 同步
```

产品代码、研究定义、模型获取和不可变结果不得混入同一个提交。

## 8. 研究暂停与恢复条件

### 暂停

- 新的 normalize / export Slice；
- MODNet checkpoint、RVM 权重、Python wheel / SBOM / safe pickle loader；
- natural-person 24 / 24 / 12 / 12 数据集；
- formal holdout、seal ceremony 和新的 EvidenceManifest；
- 以研究 runner 修复代替产品功能。

### 可以恢复的条件

- **本地模型**：用户明确要求离线，或云端成本 / 隐私 / 延迟超过事前预算；
- **MODNet**：人物任务占主要流量，且当前云端或通用方案在人像边缘上系统性不足；
- **交互分割**：用户持续需要选择非默认主体；
- **正式证据体系**：内部产品试用版已证明任务有价值，准备对外声明或公开 beta；
- **复杂后端**：真实任务需要跨刷新恢复、队列、计费或删除对账。

## 9. 下一次动作

本计划落库后，下一次代码工作固定为：

> 拆分安全验证命令，修正产品页面过度声明，并为当前本地处理建立第一组输出回归测试。

在这三项完成前，不启动新的模型、Slice、Provider 真实调用或产品范围扩张。
