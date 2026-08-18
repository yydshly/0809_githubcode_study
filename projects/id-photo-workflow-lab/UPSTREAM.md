# 上游来源与复制边界

## 直接研究对象

| 字段 | 内容 |
| --- | --- |
| 项目名称 | HivisionIDPhotos |
| 仓库 URL | [https://github.com/Zeyi-Lin/HivisionIDPhotos](https://github.com/Zeyi-Lin/HivisionIDPhotos) |
| 参考版本 | commit [`5c191e2577f14755a69d9df6db415fab23aca484`](https://github.com/Zeyi-Lin/HivisionIDPhotos/tree/5c191e2577f14755a69d9df6db415fab23aca484)，branch `master` |
| 获取日期 | 2026-08-18 |
| 上游许可证 | [Apache-2.0](https://github.com/Zeyi-Lin/HivisionIDPhotos/blob/5c191e2577f14755a69d9df6db415fab23aca484/LICENSE)（仓库代码边界） |
| 上游演示/文档 | 固定提交 README、`hivision/creator`、`deploy_api.py` |

## 本轮使用边界

- 直接复制的代码或素材：无。
- 参考后重写：Hivision API 的请求/响应形状和工作流分层；本项目以原生 Node/浏览器代码独立实现。
- 运行时复用：本机 ignored `vendor/HivisionIDPhotos` 保存固定 shallow clone；ignored `.venv` 保存 Python 闭包；ignored upstream weights 目录保存一个已固定 hash 的 MODNet ONNX。三者均不进入 Git。
- 完全原创：Demo UI、Node allowlist adapter、loopback Python bridge、启动/验证脚本、测试夹具、文档与浏览器证据。
- 未纳入 Git：Hivision UI、尺寸/颜色 CSV、demo 图片、模型、字体、Docker image、Python package closure 和 Face++ 凭据。

## 模型方案记录

模型只作为 Hivision 的可配置执行层记录，不作为本项目研究对象。

| Hivision 选项 | 作用 | 来源/许可观察 | 本项目状态 |
| --- | --- | --- | --- |
| `modnet_photographic_portrait_matting` | 人像连续 Alpha | [MODNet](https://github.com/ZHKKKe/MODNet) 官方仓库声明代码/模型 Apache-2.0；Hivision release ONNX 已固定为 25,888,640 bytes / SHA-256 `07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9` | 已在 ignored runtime 下载并完成 CPU smoke；见 [RUNTIME_RECEIPT.md](RUNTIME_RECEIPT.md) |
| `hivision_modnet` | Hivision 的纯色换底倾向模型 | Hivision release asset；训练与文件级边界待补 | 只展示为上游选项；未下载 |
| `birefnet-v1-lite` | 更重的通用高精度分割 | [BiRefNet](https://github.com/ZhengPeng7/BiRefNet) 仓库 MIT；特定 ONNX 仍需固定 | 只记录；未下载 |
| `rmbg-1.4` | 通用背景移除 | [BRIA RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) 为限制性模型许可 | 产品 no-go；Demo 默认不展示 |

人脸检测选项：

- `mtcnn`：本地默认候选；
- `retinaface-resnet50`：本地更重候选，权重另审；
- Face++：联网服务；Demo 只有在 `FACE_PLUS_API_KEY` 与 `FACE_PLUS_API_SECRET` 同时存在时才开放端云选项，并明确图片会发送到 Face++。当前未配置、未调用。

## 相关只读技术来源

这些项目只用于 [相关技术卡](RELATED_TECHNOLOGY_NOTES.md)，不是 Demo 上游。

| 项目 | 固定版本 | 目标 | 原理摘要 | 许可与本地边界 |
| --- | --- | --- | --- | --- |
| [imgly/background-removal-js](https://github.com/imgly/background-removal-js) | `12f56cc4f2a90d624e165a715748d22efc7a1d93`；Web package `1.7.0` | 浏览器/Node 通用背景移除 | IS-Net ONNX → mask → Alpha/合成 | AGPL-3.0；0 bytes、未安装、未接 Demo |
| [ant-research/MagicQuill](https://github.com/ant-research/MagicQuill) | `8958300027238b259cfcabbc8aa38793d7c4ac47` | 画笔驱动的生成式局部图片编辑 | LLaVA Draw&Guess + edge/color conditions + diffusion inpainting/control branches | LICENSE 为 CC BY-NC 4.0；0 bytes、未安装、未获取约 25 GB checkpoints、未接 Demo |

MagicQuill README 指向单独的 MagicQuillV2 仓库；本轮没有把 V2 代码或论文并入当前来源边界。

## API 与 bridge 来源

本项目没有直接运行上游 `deploy_api.py`（它默认监听 `0.0.0.0` 且缺少五种纸张参数），而是依据固定源码独立实现 loopback bridge：

| 本项目路由 | Hivision 路由 | 用途 |
| --- | --- | --- |
| `/api/hivision/idphoto` | `/idphoto` | 人像抠图、检测、对齐与标准/高清透明结果 |
| `/api/hivision/add-background` | `/add_background` | 透明图换纯色/渐变背景；首版只开放纯色 |
| `/api/hivision/layout` | bridge `/layout` → `generate_layout_array` / `generate_layout_image` | 六寸、五寸、A4、3R、4R 排版与裁切线 |

`/api/hivision/status` 读取 bridge `/health`，报告精确 runtime、已安装模型、五种纸张、美颜、Face++ 配置和换正装 waiting 状态。

## 同步记录

| 日期 | 上游版本 | 操作 | 结果 |
| --- | --- | --- | --- |
| 2026-08-18 | `5c191e2577f14755a69d9df6db415fab23aca484` | 固定提交静态研究 | 能力、原理与 API 形状已记录；0 upstream bytes |
| 2026-08-18 | 同上 | 本地原创 API adapter + Demo | 初版只证明接口/夹具；随后由下一行真实 runtime 证据取代 |
| 2026-08-18 | 同上 | ignored shallow clone + Python 3.10 venv + MODNet ONNX | HEAD 精确匹配；模型 hash 已固定；CPU 抠图、美颜、换底和五种排版实际通过 |

## 许可证检查清单

- [x] 已记录上游仓库许可证与固定提交；
- [x] 已区分仓库代码、外链模型和在线服务；
- [x] Git 未复制上游实现、模型或素材；本地 ignored runtime 有独立收据；
- [x] 模型选项保留各自边界，不把 Apache-2.0 扩展到外链权重；
- [x] 真实 Demo 使用的模型 bytes、SHA-256 与实际运行环境已登记；
- [ ] 本项目原创内容尚未选择对外许可证。
