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
| 本地图片处理 | 受控方向归一化、完整来源舞台、固定比例 / 自由裁剪、旋转 / 翻转、RGB 调整、PNG / JPEG 重编码与独立重开 | 已接入 `UT-TUNE`，作为基础编辑起点；真实浏览器交互验收仍待完成 |
| 下载门控 | 当前 run、格式、声明、byte length 与 hash 校验 | 继续使用，并补正式输出重开验证 |
| 创意 API 工程路径 | `gpt-image-2` 图片编辑请求、状态查询、幂等和失败闭合 | 保留为实验功能，不进入当前 MVP 主路径 |
| 研究资产 | synthetic fixtures、Sharp 来源锁、canonical PNG encoder lineage、Alpha 指标、rights / provenance 结构 | 精简复用，不把研究通过写成产品通过 |

当前产品工程定向测试除基础编辑状态、renderer、输出重开和工作区交互外，M3a 已覆盖独立抠图 route/client、PhotoRoom Basic adapter、密钥加显式开关的双重启用、fake provider、来源与构图 revision、逐次同意、幂等冲突、拒绝、超时、取消、迟到响应、LAN 禁用，以及输出 PNG 的 CRC / 原生 Alpha 结构验证。它们证明工程状态和 Provider 协议约束，不证明真实 Chrome / Edge 的完整浏览器兼容、真实供应商质量、账户隐私边界或抠图质量。

当前可复算命令为：

```powershell
npm run test:product
```

### 2.2 只是脚手架或研究，不是产品能力

- “正在分析图片”实际只做浏览器解码和固定任务目录，不是真实 SourceCard 或内容推荐。
- `UT-CUTOUT`、`UT-PRODUCT` 与 `UT-PORTRAIT` 已进入内部试用路径；透明抠图是自由工具，商品白底与报名照是场景配方，后两者先本地冻结构图，再复用同一远程抠图与本地蒙版 / 纯色导出。`UT-TEMPLATE` 作为完全本地的社交构图场景。`UT-SOLID-BG` 不再作为单独卡片重复暴露；正式供应商质量和自然任务验收仍未完成。
- Slice 09 的 normalize / export Gate-B 结果没有接入 `web/` 或 `server/` 产品路径。
- SourceCard + MATTE-SIMPLE 只在项目原创 synthetic fixture 上运行；语义字段仍为 unknown。
- MODNet / RVM 只有来源、许可和运行时元数据；权重、依赖安装、推理和自然图片结果均为 0。

### 2.3 仍未实现

- 可拖裁切框和自定义尺寸；预设比例 / 方向 / 光色的实时工作预览与可见撤销 / 重做 / 重置已经接入；
- 透明输入和产品级输入归一化 / 输出重开已进入本地任务，但仍缺真实浏览器 fixture 与下载 E2E；
- 正式云端抠图评估、可审计的 corrected-pass 记录和供应商切换决策；
- 保留 / 擦除画笔与透明 / 纯色下载的真实浏览器指针、键盘和下载 E2E；
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

当前完成（2026-08-16）：已拆分产品与归档研究测试，增加动态 syntax 检查，修正 R0 过度声明，并为本地处理加入可注入解码 / canvas / 输出回归；`verify:product` 为 51 / 51。Slice 01–11 使用 archive validator 继续核对冻结树与 pins，不再要求当前产品 `package.json` 与历史 runtime attestation 逐 byte 相同。M0 原列的真实 Chrome / Edge 下载与 console E2E 尚未完成，作为明确欠项保留，最迟在 M1b 完成条件前关闭；它不阻止先开始 M1a 的无 UI renderer 工作。

M1a 当前完成（2026-08-16）：`edit-state.v1` 与 `editor-canvas-renderer-v1` 已建立，并通过 `editor-session.js` 接入 R0 页面本地任务。状态层拒绝越界 crop、非 90° 旋转、超资源 resize 和无效 JPEG 设置；独立解析器从 JPEG / PNG / WebP 容器读取 EXIF orientation 1–8，受控 `ImageBitmap` 解码禁止浏览器自动旋转，renderer 再用冻结矩阵在透明 scratch canvas 上归一化，随后完成用户旋转 / 翻转、post-transform crop 和 fit resize。PNG 保持透明上下文，JPEG 只在明确颜色上合成；编码前 Canvas pixels 与编码后新解码对象的 pixels 会核对 Alpha 和可见的预乘颜色，Alpha=0 的 hidden RGB 明确 ignored。最终 bytes 还会拒绝 EXIF / XMP / IPTC / 文本 / 注释类私密 metadata，ICC / sRGB 颜色描述不冒充已经验证的转换结果。M1b 工作区用同一编辑合同连接预览、history 与下载 renderer：舞台按 post-transform 来源比例显示完整图片；固定 1:1 / 4:5 / 3:2 用亮框与遮罩标出导出区域，只沿实际溢出轴移动；自由裁剪可移动、缩放并由左 / 上 / 宽 / 高控件精调，最小宽高 10%、不得越界。裁剪框坐标直接等于 renderer 的 normalized crop，旋转 / 翻转不再依赖隐藏图片区域的 `object-position` 近似。自定义尺寸只暴露一个最长边上限（1–2048 px），严格宽高随当前裁剪比例自动计算；它只改变导出分辨率，不缩放左侧舞台，并同时显示上限框和预计实际导出尺寸。设置按“构图—光色—导出”分组，错误会在表单内显示并阻止执行。`product-acceptance.html` 已把两档桌面视口的合成图本地主流程、Blob 捕获、PNG 重开、完整显示 / 横向溢出、结果换任务、设置返回、旧下载失效、焦点和流程内 console 检查变成可重复浏览器入口。2026-08-17 Codex 内置 Chromium、Chrome `151.0.7922.138` 与 Edge `151.0.4129.78` 均已实际执行两档入口并 2/2 通过，证据见 [BROWSER_ACCEPTANCE_EVIDENCE.md](BROWSER_ACCEPTANCE_EVIDENCE.md)；系统下载目录、原生指针 / 键盘和 ICC / sRGB 观察仍是明确欠项。

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
- 已增加完整来源舞台、可拖动 / 缩放的自由裁剪框、原比例 / 1:1 / 4:5 / 3:2、90° 旋转、翻转和重置；
- 增加最长边上限、自动保持比例、JPEG 质量、亮度 / 对比度 / 饱和度；
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

当前状态：主持人脚本、固定任务、匿名记录字段和通过算法已整理为 [M2 基础编辑器早期内部走查](M2_INTERNAL_WALKTHROUGH.md)；真实参与者场次尚未开始，当前分母为 `0/5–8`。

动作：

- 复核 M1b 已清理的任务卡和分析 / QA 文案，观察是否仍会造成错误预期；
- 做键盘、焦点、缩放、错误态和真实下载检查；
- 邀请 5–8 名符合目标用户特征的人员，在受控本地设备上使用项目原创或明确许可的测试图片完成单图整理任务；本阶段不接收、上传或保存参与者自己的照片；
- 记录完成时间、失败点、是否需要帮助和是否愿意保留结果。

通过目标：至少 80% 参与者在 2 分钟内、不经指导完成一次编辑与下载；失败必须能定位为输入、编辑、导出或理解问题。5–8 人对应的最小通过人数固定为 4、5、6、7 人。该活动只授予“继续迭代基础编辑器”的产品学习结论，不属于 V1 / 形成性研究证据，不评价图片模型质量，也不授权收集用户图片。执行脚本见 [M2 走查卡](M2_INTERNAL_WALKTHROUGH.md)，治理边界见 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) 的早期内部走查条款。

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

当前完成度：合同、独立 typed route/client、内存 run store、fake provider、PhotoRoom Basic adapter、显式服务启用和用户逐次同意界面已经完成；[ProviderEvaluationPlan v0](PROVIDER_EVALUATION_PLAN.md) 仍冻结 Photoroom Basic 与 remove.bg 1.0 两个候选、12-source/24-call 最大分母、隐私硬门、质量阈值和 0 美元当前授权。生产默认保持 `not_configured`；仅保存密钥不会启用，仍需 `PHOTOROOM_ENABLED=true`。当前累计完成 5 次 PhotoRoom sandbox 调用：1 次项目原创 synthetic 协议探针，以及 4 次项目生成的头发、玻璃、毛发和镂空结构挑战图。5 次均不进入正式分母；后四次虽然 4/4 返回 RGBA Alpha，却都在目视复核中出现需要人工修正的边缘或背景残留。这证明沙盒鉴权与 RGBA PNG/Alpha 结构链可闭合，也说明 Provider 输出不能直接作为最终成品。结果页现已接入非破坏式 Alpha 修正：擦除 / 保留、200 笔硬上限、撤销 / 重做 / 重置，以及棋盘格透明 PNG或白 / 黑 / 彩底 JPEG 下载。所有重新生成的文件都按原尺寸重放笔触并经过 metadata、尺寸和像素独立重开；纯色输出使用明确的直 Alpha 合成并强制完全不透明。内部页也可清除已结束 run 的本地内存记录，回执明确不代表供应商删除。账户/DPA/地域复核、正式候选调用、持久 `ProviderCallReceipt`、供应商删除验证、正式 Alpha 质量结论和真实浏览器 E2E 仍未开始。用户对当前基础编辑器的确认只授权工程路线前进，不替代 M2 多人走查记录。

第一次正式候选调用前必须冻结 `ProviderEvaluationPlan`：候选 API / 条款日期、隐私硬门、允许地域 / 保留 / 训练用途、单次与总预算、最大延迟和失败率、synthetic Alpha / boundary 指标、灾难误删上限、分层人工判断规则、修正后可完成率与 no-go 条件。具体阈值只能在看结果前依据候选价格和业务预算写入；未知隐私边界直接 no-go，不能用质量分数抵消。

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

当前修正画布已增加“自动结果 / 修正后”无损对比，以及适应、2×、4× 查看和放大后滚动；对比与查看状态不进入 `MaskRevision`，也不改变原尺寸重放与正式导出尺寸。

纯色换底已支持白 / 黑 / 彩色预设与自定义颜色；自定义色值同时驱动预览、最终下载摘要和原尺寸 JPEG 像素合成。背景图片合成仍按计划后置，不在本轮扩展定位、缩放和图层交互。

结果查看已增加原图 / 结果并排模式，宽屏左右排列、窄屏上下排列；该模式只读且不会进入 `MaskRevision`，正式画笔、缩放和键盘修边仍只在单独的“处理结果”视图启用。

当前基础功能范围已依据用户连续试用反馈暂定为内部可用基线：本阶段不再增加新的抠图结果微功能。界面优化以“图片优先、工具次级、状态可理解”为约束；宽屏的“处理结果”使用图片主区 + 右侧工具栏，其他比较视图保持全宽，`<= 980px` 时图片、QA、工具依次纵向排列。后续修改必须优先解决跨页面层级、导航、可读性和真实浏览器问题，除非发现阻断任务完成的缺口，否则不扩功能表。

“基础功能冻结”不等于产品功能完成。当前可执行的场景技能层包含商品白底图、报名照 / 底色头像、社交头像与封面，以及独立的老照片温和修复实验。前三项只编排已经存在的 renderer、Provider、蒙版与下载合同；老照片修复复用既有 `gpt-image-2` 编辑 route，但使用新的任务 ID、有限提示词合同、生成式风险确认和“修复副本”下载命名。它尚无真实质量结果，不得称为无损、档案级或身份保真修复。主体感知布局和正式证件规格仍必须另立能力。

`UT-ENHANCE` 现已把隐藏在编辑器里的光色滑杆组织为独立本地任务：固定预设是公开的参数组合，用户可以继续手调、撤销、比较和下载。当前只覆盖全局亮度 / 对比度 / 饱和度，不声称内容识别、自动质量诊断、降噪、白平衡或清晰度修复；后续是否建设真正的自动自然增强必须由独立质量任务决定。

`UT-TEMPLATE` 现已把常用比例和导出上限组织为独立本地任务：1:1、4:5、16:9、9:16 均进入同一 normalized crop 与 renderer 合同，五个预设只组合比例和最长边上限；小图不放大，实际尺寸单独显示。当前不做主体感知裁切、扩图、平台规则同步、文字排版或发布检查，因此不得把按钮名称解释为平台合规证明。内部浏览器诊断已覆盖 16:9 / 9:16 的真实 Canvas 编码、重开和尺寸检查；下一步仍须在主产品页走查模板点击、长图 / 宽图拖动、手动覆盖、撤销和最终下载尺寸，并补 Chrome / Edge 的鼠标与键盘端到端证据。

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

1. ~~产品重规划文档与研究基线记录；~~
2. ~~修复验证命令覆盖；~~
3. ~~修正文案和虚假 QA 表述；~~
4. ~~为 `local-processing.js` 建立输出几何 / 编码事实测试；~~
5. ~~把 renderer / `EditState` / orientation 1–8 / 独立输出像素重开 / metadata fail-closed 接入本地产品路径；~~
6. ~~把 `UT-PORTRAIT` 从占位卡升级为“本地构图 → 远程抠图 → 本地修边 / 换底 / 下载”的报名照 / 头像路径；~~
7. ~~建立场景技能注册表，并把商品白底图、报名照 / 底色头像、社交头像与封面置于自由工具之前；~~
8. ~~建立 `CR-RESTORE` 老照片温和修复实验：有限设置、服务端提示词合同、生成式风险确认、结果比较与副本下载；不做真实计费调用或质量声明；~~
9. 继续界面收敛：复核四场景的视觉排序、键盘 / 指针与系统下载；取得明确单次预算授权后，才用项目原创或公版旧照片夹具运行一次老照片修复，记录面部 / 文字 / 物件漂移并决定保留或关闭该实验；

### Next

8. ~~Provider 抽象、独立 route/client、PhotoRoom adapter、显式同意与 fake provider 关闭测试；~~
9. ~~冻结 `ProviderEvaluationPlan` 的候选、分母、隐私、成本和退出硬门；~~ 取得账户侧 DPA/地域/训练/删除证据与明确密钥授权后，才可执行 12-source 小规模评估；
10. ~~透明预览、手动 mask 修正、经过重开的透明 PNG 与纯色 JPEG 换底；~~ 下一步在真实 Chrome / Edge 覆盖画笔、撤销 / 重做、背景选择和下载；
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
  = 当前产品单元测试 + source / DOM contract tests + syntax
  当前尚不包含真实浏览器 E2E；M1b 必须把 Chrome / Edge 下载与 console 检查接入

verify:research:safe
  = Slice 01–11 immutable snapshot archive validator + 安全的研究 fake / adversarial tests
  = 显式跳过 9 个要求当前 package manifest 等于旧 runtime snapshot 的 live-regeneration tests
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
