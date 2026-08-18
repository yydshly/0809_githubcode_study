# HivisionIDPhotos 能力地图

## 一句话定位

HivisionIDPhotos 是“人像处理模型 + 人脸几何 + 确定性交付”的证件照/报名头像流水线，不是一个单独的抠图模型。

## 用户可见能力

| 能力 | 输入 | 输出 | 核心实现 | Demo 状态 |
| --- | --- | --- | --- | --- |
| 人像抠图 | 单张 RGB 图片 | RGBA 透明人像 | MODNet/Hivision MODNet/BiRefNet 等 ONNX | 固定 MODNet + CPU 已真实通过 |
| 标准构图 | 原图 + 像素尺寸 + 头部参数 | 标准透明图 | 人脸检测、头部比例、顶距和裁切 | 295×413 实际通过；规格选择已展示 |
| 高清结果 | 同一处理任务 | 更高分辨率透明图 | 保留高分辨率处理结果 | 已展示 |
| 人脸对齐 | 倾斜人像 | 对齐后结果 | 人脸 roll angle + 图像旋转 + 再检测 | 已开放开关 |
| 背景合成 | 透明图 + 颜色 | RGB 底色图 | Alpha compositing，可选纯色/渐变 | 首版开放纯色 |
| DPI | 处理结果 + DPI | 写入 DPI 的图片 bytes | 图像编码 metadata | 已开放 300/350 |
| 目标 KB | RGB 图片 + KB | 受限体积文件 | 迭代编码/尺寸调整 | 首版未开放 |
| 打印排版 | 有底色照片 + 尺寸 | 多张照片纸张排版 | 布局计算与重复绘制 | 六寸/五寸/A4/3R/4R 实际通过 |
| 美颜/光色 | 人像 + 强度 | 调整后的结果 | 确定性/图像处理插件 | 五项参数已接入并完成 smoke |
| 水印 | 图片 + 文本参数 | 水印图 | 字体绘制 | 首版不开放 |
| 纯离线 | 本地模型 + MTCNN | 不离开设备的处理 | ONNX Runtime CPU | 实际通过 |
| 端云 | 本地抠图 + Face++ 检测 | 混合结果 | Face++ API | 需要用户 key；当前未配置/未调用 |
| 智能换正装 | 人像 | 正装结果 | 上游未提供可调用实现 | `waiting` |

## 当前实现状态

- 上游固定提交已经在 ignored `vendor/` 取得并核对；
- MODNet ONNX 已固定 bytes/hash，ONNX Runtime 报告设备为 CPU；
- 一条虚构人像链完成标准/高清、蓝底、美颜参数和五种纸张；
- 中文 README 写“美颜”，英文 README 仍写 beauty `waiting`，但当前源码和实际 smoke 证明五项美颜参数已实现；
- 智能换正装只有 README `waiting` 与结果结构中的 `clothing_params` 占位，没有具体处理器或 UI，当前不可用。

## 原理分层

### 1. 模型层

模型输出人像 Alpha 或 mask。它只负责回答“主体在哪里、每个像素应该多透明”，不负责最终证件规格。

### 2. 人脸几何层

人脸检测器返回人脸框和角度。Hivision 用目标头部比例、脸中心位置与顶部距离计算裁切和位移；需要时先旋转，再重新检测。

### 3. 确定性交付层

透明结果通过传统图像算法合成背景、写入 DPI、限制文件体积并重复排列到纸张画布。这一层应可测试、可重复，且不需要生成式 AI。

## API 合同

### `/idphoto`

关键表单字段：

```text
input_image
height / width
human_matting_model
face_detect_model
hd
dpi
face_align
whitening_strength / brightness_strength
contrast_strength / saturation_strength / sharpen_strength
```

成功返回 `status`、`image_base64_standard` 和可选 `image_base64_hd`。

### `/add_background`

输入透明图 base64、HEX 颜色、DPI 和 render 模式，返回合成图 base64。

### bridge `/layout`

输入有底色照片、单张像素尺寸、DPI、paper 和 crop_line，按上游 `demo/locales.py` 的五种画布参数返回打印排版 base64。

## 展示边界

- “标准图”是目标像素构图，不等于任何签发机关标准；
- “300 DPI”是文件 metadata/打印参数，不证明打印机或受理系统接受；
- 美颜、锐化、换底和对齐可能被某些官方证件规则禁止；
- Demo 默认把它定位为普通报名头像和标准底色头像工具；
- 真实结果必须保留原始输入、模型选择和参数关系，但不得默认公开用户照片。
