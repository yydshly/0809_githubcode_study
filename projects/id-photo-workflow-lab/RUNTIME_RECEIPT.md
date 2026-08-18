# Hivision 本地运行收据

> 记录时间：2026-08-18T13:44:53+08:00。运行物位于 `.gitignore` 覆盖的 `.venv/` 与 `vendor/`，没有进入 Git；本文件只提交可复核事实。

## 上游代码

| 字段 | 值 |
| --- | --- |
| 仓库 | `https://github.com/Zeyi-Lin/HivisionIDPhotos.git` |
| 本地目录 | `vendor/HivisionIDPhotos`（忽略） |
| commit | `5c191e2577f14755a69d9df6db415fab23aca484` |
| 获取方式 | `git clone --depth 1 --branch master` 后核对 HEAD |
| 许可证 | 仓库 `LICENSE` 为 Apache-2.0；模型另记 |

## CPU 模型

| 字段 | 值 |
| --- | --- |
| 逻辑 ID | `modnet_photographic_portrait_matting` |
| 文件 | `hivision/creator/weights/modnet_photographic_portrait_matting.onnx` |
| 来源 URL | `https://github.com/Zeyi-Lin/HivisionIDPhotos/releases/download/pretrained-model/modnet_photographic_portrait_matting.onnx` |
| 字节数 | `25888640` |
| SHA-256 | `07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9` |
| 执行设备 | ONNX Runtime `CPU`；providers=`AzureExecutionProvider, CPUExecutionProvider` |
| 许可观察 | MODNet 官方仓库声明代码与模型 Apache-2.0；Hivision release 中该具体 ONNX 已固定 bytes，但转换链仍未独立证明 |

## 实际 Python 闭包

上游 requirements 使用宽松范围；以下是本机解析到的关键版本，不是上游官方 lock：

| 组件 | 实际版本 |
| --- | --- |
| Python | `3.10.11` |
| numpy | `1.26.4` |
| opencv-python | `4.11.0.86` |
| onnxruntime | `1.23.2` |
| mtcnn-runtime | `1.0.0` |
| Pillow | `12.3.0` |
| FastAPI | `0.141.1` |
| Starlette | `1.6.0` |
| Uvicorn | `0.52.3` |
| requests | `2.34.2` |
| Gradio（随上游 app requirements 安装，bridge 不使用） | `6.24.0` |

完整 `pip freeze` 本轮没有提交为正式 lock；若要复现到另一台机器，必须生成 wheel hashes 和平台锁。

## 真实 smoke

输入为兄弟项目已经登记的项目原创虚构 mannequin 图片；只作为本机运行证据，不形成跨项目运行依赖，也不复制到本项目。

| 观察 | 结果 |
| --- | --- |
| 请求模式 | `offline-cpu`，MODNet + MTCNN |
| 美颜参数 | whitening=2、brightness=2、contrast=3、saturation=2、sharpen=1 |
| 标准图 | RGBA `295×413`，268,799 bytes |
| 高清图 | RGBA `670×940`，1,400,853 bytes |
| 蓝底图 | RGB `295×413`，208,768 bytes |
| 本次 idphoto bridge 计时 | 715 ms |
| 全链（含五种排版） | 1,880 ms |
| 六寸 | RGB `1795×1205`，477,661 bytes |
| 五寸 | RGB `1500×1051`，672,881 bytes |
| A4 | RGB `3508×2479`，774,213 bytes |
| 3R | RGB `1500×1051`，672,881 bytes |
| 4R | RGB `1795×1205`，477,661 bytes |

这证明固定环境能走通 CPU 抠图、美颜参数、换底和五种纸张，不证明自然人像总体质量、真人可用性或官方证件合规。
