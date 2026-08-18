# 开源图片处理候选评审：IMG.LY 与 HivisionIDPhotos

> 核对日期：2026-08-18。本文是面向 Single Image Studio 的只读静态研究，不是依赖选型批准、质量验收、法律意见或产品能力声明。没有克隆仓库、安装依赖、下载模型、运行推理、复制代码/预设/图片或执行上游服务。

## 结论先行

两个项目都值得研究，但价值不在同一层：

- [IMG.LY `background-removal-js`](https://github.com/imgly/background-removal-js/tree/12f56cc4f2a90d624e165a715748d22efc7a1d93) 是一个通用的浏览器 / Node 抠图运行时。它最接近本项目的 JavaScript、本地优先与 Provider 边界，但当前代码包和模型数据包均以 AGPL-3.0 提供；在本项目尚未选择许可证的前提下，不应直接合并、打包或把其 CDN 模型接入公开体验。
- [HivisionIDPhotos](https://github.com/Zeyi-Lin/HivisionIDPhotos/tree/5c191e2577f14755a69d9df6db415fab23aca484) 是一个以 Python、OpenCV、ONNX Runtime 为核心的证件照端到端参考实现。它更适合研究“人像抠图 → 人脸几何 → 裁切 → 换底 → DPI / KB → 打印排版”的产品分层；但它不是浏览器组件，主仓库的 Apache-2.0 也不能自动覆盖脚本下载的所有模型权重。
- 当前建议是“研究并重写边界，不直接引入实现”：用 IMG.LY 证明浏览器本地 Provider 的工程形态，用 Hivision 校正证件照工作流分层；真正接入前另立小范围候选合同，逐一锁定包、模型、哈希、许可证、运行资源和质量分母。

## 固定研究边界

| 项目 | 固定版本 | 本轮读取的关键入口 | 仓库许可 | 本地状态 |
| --- | --- | --- | --- | --- |
| IMG.LY Background Removal JS | `main@12f56cc4f2a90d624e165a715748d22efc7a1d93`；Web package 声明 `1.7.0` | [Web README](https://github.com/imgly/background-removal-js/blob/12f56cc4f2a90d624e165a715748d22efc7a1d93/packages/web/README.md)、[package.json](https://github.com/imgly/background-removal-js/blob/12f56cc4f2a90d624e165a715748d22efc7a1d93/packages/web/package.json)、[`v1.ts`](https://github.com/imgly/background-removal-js/blob/12f56cc4f2a90d624e165a715748d22efc7a1d93/packages/web/src/api/v1.ts)、[`inference.ts`](https://github.com/imgly/background-removal-js/blob/12f56cc4f2a90d624e165a715748d22efc7a1d93/packages/web/src/inference.ts)、[`onnx.ts`](https://github.com/imgly/background-removal-js/blob/12f56cc4f2a90d624e165a715748d22efc7a1d93/packages/web/src/onnx.ts)、[`resource.ts`](https://github.com/imgly/background-removal-js/blob/12f56cc4f2a90d624e165a715748d22efc7a1d93/packages/web/src/resource.ts)、[第三方清单](https://github.com/imgly/background-removal-js/blob/12f56cc4f2a90d624e165a715748d22efc7a1d93/packages/web/ThirdPartyLicenses.json) | AGPL-3.0；README 同时提供联系 IMG.LY 获取其他许可的入口 | 未安装、未下载、未运行、未复制 |
| HivisionIDPhotos | `master@5c191e2577f14755a69d9df6db415fab23aca484`；未把分支名当成版本 | [README](https://github.com/Zeyi-Lin/HivisionIDPhotos/blob/5c191e2577f14755a69d9df6db415fab23aca484/README.md)、[`IDCreator`](https://github.com/Zeyi-Lin/HivisionIDPhotos/blob/5c191e2577f14755a69d9df6db415fab23aca484/hivision/creator/__init__.py)、[`human_matting.py`](https://github.com/Zeyi-Lin/HivisionIDPhotos/blob/5c191e2577f14755a69d9df6db415fab23aca484/hivision/creator/human_matting.py)、[`choose_handler.py`](https://github.com/Zeyi-Lin/HivisionIDPhotos/blob/5c191e2577f14755a69d9df6db415fab23aca484/hivision/creator/choose_handler.py)、[`deploy_api.py`](https://github.com/Zeyi-Lin/HivisionIDPhotos/blob/5c191e2577f14755a69d9df6db415fab23aca484/deploy_api.py)、[模型下载脚本](https://github.com/Zeyi-Lin/HivisionIDPhotos/blob/5c191e2577f14755a69d9df6db415fab23aca484/scripts/download_model.py)、[requirements](https://github.com/Zeyi-Lin/HivisionIDPhotos/blob/5c191e2577f14755a69d9df6db415fab23aca484/requirements.txt) | 仓库声明 Apache-2.0；外部模型和服务分别审计 | 未安装、未下载、未运行、未复制 |

“固定提交”只固定本次观察对象。它不证明 npm / PyPI 制品、release asset、Docker image 或模型文件与源码提交具有同一内容和许可边界。

## 1. IMG.LY `background-removal-js`

### 它实际怎样工作

Web package 接受 `ImageData`、字节、`Blob`、`URL` 或字符串，先解码为像素张量，再把图像双线性缩放到 `1024 × 1024`。IS-Net ONNX 会输出单通道预测；实现把 Alpha mask 双线性缩放回原图尺寸并写入 RGBA Alpha，最后编码为 PNG / JPEG / WebP 或返回 mask。它还暴露 `removeForeground`、`segmentForeground` 和 `applySegmentationMask`，因此运行时核心可以被理解为：

```text
资源解析与缓存
→ 图片解码
→ 1024² 预处理
→ ONNX Runtime Web（WASM 或 WebGPU）
→ Alpha mask
→ 原尺寸回放 / 合成
→ 编码
```

默认模型是 `isnet_fp16`；配置还列出 `isnet` 与 `isnet_quint8`。上游文档把量化小模型描述为约 40 MB、默认中等模型约 80 MB。第一次运行会下载 ONNX 与 WASM；默认 `publicPath` 指向 IMG.LY CDN，生产文档建议自托管。

### 对本项目最有价值的部分

1. **本地 Provider 是可行产品形态。** 用户图片不必上传给抠图 API；模型就绪后可以在浏览器内完成推理。这正好补齐当前 `BackgroundRemovalProvider` 的另一种执行位置。
2. **模型、执行设备和输出类型是显式配置。** `cpu/gpu`、三档模型、foreground/background/mask 与进度回调都适合映射到本项目的能力状态、首次下载提示和可取消任务 UI。
3. **模型结果与确定性 Alpha 合成分离。** 这与本项目现有“远程结果不覆盖、修边在本地重放”的设计一致；未来即使替换模型，修正、换底和导出也不应与模型绑死。
4. **自托管资源是隐私与供应链边界的一部分。** “图片不上传”不等于“完全无网络”；首次资源请求、缓存、CDN 可用性和资源版本必须单独展示。

### 不能直接接入的原因

| 问题 | 固定提交中的事实 | 对 Single Image Studio 的影响 |
| --- | --- | --- |
| 许可证 | 根仓库、Web package 和 Web data package 均为 AGPL-3.0；README 提供商业许可联系入口 | 当前项目许可证待定。直接分发浏览器 bundle / 模型数据前必须先接受 AGPL 义务或取得其他许可；不能以“免费 npm 包”替代许可审查 |
| 资源完整性 | `resource.ts` 校验 chunk 和合并后字节长度，没有对资源内容做固定 SHA-256 / 签名校验 | 默认 CDN 与自托管包都应进入本项目 acquisition receipt；只验长度不足以形成模型身份 |
| 首次运行成本 | 默认模型约 80 MB，另有 WASM；第一次运行显著慢于缓存命中 | 不能把卡片标成“立即可用”。需要预估下载、内存、冷启动、失败恢复、计量网络和移动设备边界 |
| 主线程 / 性能 | 默认 `device=cpu`、`proxyToWorker=false`；源码注释写明 WASM/CPU 的 worker proxy 当前不工作。多线程性能还依赖 COOP/COEP 与 `SharedArrayBuffer` | 公共页面可能出现 UI 卡顿；COEP 还会影响其他跨域图片 / 脚本资源，必须在隔离路由验证，而不是直接改全站 headers |
| 图像质量 | 输入固定变形到 `1024 × 1024`，`keepAspect=false`，再把 mask 插值回原尺寸 | 对极端长宽比、发丝、玻璃、毛发、镂空和小主体必须建立自己的自然图片与 Alpha 指标；代码存在不等于 C1 |
| 版本文档漂移 | Web `package.json` 的 peer dependency 是稳定版 `onnxruntime-web@1.21.0`，同提交 Web README 的安装命令仍写 dev build | 若进入实验，只相信固定 lock / package metadata 与实际安装闭包，不照抄浮动 README 命令 |
| 测试证据 | Web package 自身的 `test` script 是 `true`；仓库另有 examples / e2e 目录 | 上游 CI 不能替代我们的浏览器、质量、内存、取消和回归分母 |

### 可接受的研究路线

- 不复制 IMG.LY 源码或模型字节，先把 `LocalBackgroundRemovalProvider` 的本地原创接口冻结为：资源状态、模型身份、执行设备、进度、取消、mask 输出、资源清理、错误与可重试性。
- 若希望最快验证交互与设备资源，单独建立 AGPL-compatible 的隔离 spike，明确不进入现有公开 build；或者先向 IMG.LY 取得适合当前发布方式的书面许可。
- 若要保持未来许可选择空间，则从原始、许可更宽松且文件级可锁定的模型来源重新选择模型，独立实现 adapter；不得从 IMG.LY 的转换后 ONNX 数据包反推为可自由复制。

## 2. HivisionIDPhotos

### 它实际怎样工作

`IDCreator` 使用可替换 handler 和一个处理上下文组织完整链路：输入最大边先缩到 2000，然后依次运行人像抠图、美颜、人脸检测、可选人脸对齐与尺寸/头部几何调整，返回标准图、高清图和透明抠图。仓库再提供换纯色/渐变背景、DPI、目标 KB、水印、六寸等打印排版、Gradio 页面、FastAPI 和 Docker 入口。

```text
输入归一
→ 可替换人像抠图
→ 可选外观调整
→ 可替换人脸检测
→ 可选对齐
→ 头部比例 / 顶距 / 目标像素裁切
→ 透明标准图 + 高清图
→ 换底 / DPI / KB / 打印排版
```

当前 handler 列出 MODNet、项目自有 `hivision_modnet`、RMBG-1.4、BiRefNet v1 lite；人脸检测列出 MTCNN、RetinaFace 和联网 Face++。这说明它是“多 Provider + 确定性后处理”的产品骨架，不是一只万能模型。

### 对本项目最有价值的部分

1. **证件/报名头像应拆成工作流，不应等同于抠图。** 抠图只是其中一段；人脸数量、几何、对齐、裁切、底色、DPI、KB 和排版必须分开记录。
2. **handler + context 的扩展点值得保留。** 本项目已有 Provider 边界，可进一步把 face geometry 与 matting 解耦，并把每一步输入输出写入任务证据，而不是复用一个全局可变对象。
3. **标准图、高清图、打印排版是不同交付物。** 这支持本项目的“一次处理，多规格导出”，但每种规格仍需绑定地区、签发机关、证件类型、提交渠道和版本。
4. **本地与端云模式需要同一语义层。** 本地 ONNX 与联网 Face++ 在 UI 上不能都只叫“自动检测”；必须显示图片是否离开设备、由谁处理、能否安全重试。

### 不能整套搬入的原因

| 问题 | 固定提交中的事实 / 静态观察 | 对 Single Image Studio 的影响 |
| --- | --- | --- |
| 栈与部署 | Python + OpenCV + ONNX Runtime + Gradio / FastAPI；Docker 基础镜像是浮动 `python:3.10-slim` | 不适合现有浏览器本地任务和 Vercel 免费同步 Function。若采用，需要独立 Python sidecar / 服务、独立部署和运维证据 |
| 依赖不可复现 | requirements 使用 `>=`、`<=` 或无版本约束，没有 lock、wheel hash 和平台闭包；README 写 Python ≥3.7，而 [`mtcnn-runtime` 当前包元数据](https://pypi.org/project/mtcnn-runtime/)要求 Python ≥3.8 | 不能按 README 直接安装后宣称复现；先锁 Python、平台、所有 wheel 与 SBOM |
| 模型边界混合 | 下载脚本从 Hivision release、MODNet、Hugging Face BRIA 与 BiRefNet release 取权重 | Apache-2.0 只直接说明 Hivision 仓库内容。MODNet 官方仓库声明代码/模型 Apache-2.0；BiRefNet 仓库声明 MIT；RMBG-1.4 使用 BRIA 的限制性非商业/评估许可。转换后的具体 ONNX 与 Hivision 自有 release asset 仍需逐文件锁定和复核 |
| 下载器不 fail closed | 下载使用浮动 URL，没有 timeout、hash、签名、最大字节或原子临时文件；失败可留下部分文件，而下次仅凭路径存在就跳过 | 不得用于本项目模型获取。必须复用既有 acquisition governance：不可变 URL、长度、SHA-256、临时文件、原子提交、隔离检查和失败清理 |
| API 并发边界 | `deploy_api.py` 复用全局 `creator`；每个请求会变更 handler，`IDCreator` 还把当前 `ctx` 存在实例字段。同步 CPU 推理被放进 `async` route | 多请求可能串扰并阻塞事件循环。若借鉴 API 形状，必须每任务隔离状态、限制并发并把推理移出 async event loop |
| API 暴露面 | 示例 API 无认证 / 限流，CORS 允许任意来源和 credentials，返回大体积 base64；异常边界主要只处理 `FaceError` | 示例只能在受控本机使用，不能按 Docker 命令直接暴露公网 |
| 错误健壮性 | 缺模型时部分路径打印后返回 `None`；Alpha 修补假设一定存在最大 contour；CUDA 失败分支把 `ONNX_DEVICE` 与 provider 名比较，静态看无法进入预期 fallback | 必须补 typed errors、空 mask / 多脸 / 无脸 / 资源不足负例和故障恢复；不能把 demo 成功路径当服务 SLA |
| 合规含义 | 尺寸、底色、美颜和头部比例可配置，但没有为本项目锁定任何签发机关 profile，也不提供真实受理证据 | 只能借鉴普通报名头像/打印工作流；不得据此宣传护照、身份证、签证“合规”或“审核必过” |

### 模型许可特别说明

- Hivision 仓库许可证覆盖范围与外链模型权重必须分开。尤其是 [`rmbg-1.4`](https://huggingface.co/briaai/RMBG-1.4)：官方模型页附带的是 BRIA 限制性许可，不是 MIT / Apache，不能因为 adapter 位于 Apache 仓库就进入商业产品。
- `hivision_modnet.onnx` 是 Hivision release 中的适配模型；在没有该 release asset 的单独许可说明、训练来源、文件 hash 和可再分发确认前，保持 `license-scope-unresolved`。
- [MODNet 官方 README](https://github.com/ZHKKKe/MODNet/blob/master/README.md#license)声明其代码、模型和 demos（特定 GIF 除外）为 Apache-2.0；这仍不替代对 Hivision release 中转换后文件的身份与 hash 核对。
- [BiRefNet 仓库的 MIT 文件](https://github.com/ZhengPeng7/BiRefNet/blob/main/LICENSE)是积极信号，但下载脚本指向特定 release ONNX；仍要固定 release/tag、原始文件 hash、导出链和第三方 backbone / training-data 边界。

## 横向比较

| 维度 | IMG.LY Background Removal JS | HivisionIDPhotos | 本项目判断 |
| --- | --- | --- | --- |
| 核心问题 | 通用前景 / 背景分割与 Alpha 输出 | 人像证件照端到端制作 | 两者不是替代关系 |
| 运行位置 | 浏览器或 Node；模型首次下载 | Python 本机 / API / Docker；可选联网 Face++ | IMG.LY 更贴近当前产品栈；Hivision 更像独立 sidecar |
| 隐私 | 图片可留在浏览器；默认仍访问 IMG.LY CDN 获取资源 | 离线模型可本机运行；API 部署会把图片发送到该服务，Face++ 另出设备 | UI 必须按“图片数据流”而非“AI/非AI”分类 |
| 模型 | IS-Net，三档体积/精度 | MODNet / Hivision MODNet / RMBG / BiRefNet，多人脸检测器 | 都需要逐模型身份与自然图质量验证 |
| 产品工作流 | 主要提供模型与 mask / 合成 API | 含裁切、换底、DPI、KB、排版与 UI/API | Hivision 的工作流分层更值得吸收 |
| 主许可 | AGPL-3.0 / 可询商业许可 | 仓库 Apache-2.0 | IMG.LY 是直接集成阻塞；Hivision 仍有模型级阻塞 |
| 立即接入 | 否 | 否 | 保持 read-only candidate |

## 对 Single Image Studio 的具体建议

### 现在可以做

1. 把当前 `BackgroundRemovalProvider` 抽象扩成 `remote` 与 `local-runtime` 两类，但只先定义协议，不新增依赖。
2. 证件/报名头像链路固定为：`profile eligibility → matting provider → face geometry → crop → background → file constraints → print layout`；每步可独立禁用、回退和记录证据。
3. 把“本地”细分为：无网络、首次获取资源、命中缓存、用户自托管四种状态；默认 CDN 不能被宣传成完全离线。
4. 为未来本地候选预注册四组自然图：发丝、毛发、玻璃/半透明、镂空/细结构；另加长宽比、低内存、无 WebGPU、无 `SharedArrayBuffer` 和冷启动失败。
5. 严格 profile 默认关闭美颜、生成和换脸/换装；普通报名头像与官方证件提交继续分开。

### 需要新的授权或决策后才能做

- 接入 `@imgly/background-removal` 或 IMG.LY 模型数据包：先决定 AGPL-compatible 发布，或取得其他书面许可。
- 下载任一 Hivision 模型：先为具体文件创建 acquisition receipt，记录不可变定位、字节数、SHA-256、许可证、再分发与商业使用边界。
- 运行自然人像比较：先准备有处理权、可公开性分离、隐私与删除边界完整的数据集；不能用用户上传或 README 示例图代替。
- 部署 Python 服务：先设计认证、限流、隔离、并发、超时、内存、日志脱敏、删除与健康检查，不能直接公开 `deploy_api.py`。

## 决策

| 候选 | 当前状态 | 可进入下一步的条件 |
| --- | --- | --- |
| IMG.LY Web runtime | `hold-license-and-runtime-spike` | 明确许可证路径；固定 npm / data package / ORT 与资源 hashes；隔离路由完成冷启动、UI 响应、内存和质量预注册 |
| Hivision workflow architecture | `adopt-concepts-reimplement-locally` | 只重写工作流协议和确定性步骤；若复制 Apache 代码则另记文件级来源、NOTICE 与修改；模型继续独立审计 |
| Hivision Python runtime/API | `hold-separate-service-review` | exact runtime lock、模型 receipts、安全加固、并发隔离与部署预算均完成 |

因此，若目标是近期改善现有产品，优先级应是：先吸收 Hivision 的流程拆分，保持代码本地原创；再把 IMG.LY 作为浏览器本地抠图的许可证受控技术 spike。两者都不改变当前 `C1=0`、本地模型未安装、正式证件 profile 未成立的项目事实。
