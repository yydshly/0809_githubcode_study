# Slice 02 实现与验收合同

> 本切片冻结研究合同、参考适配器和 partition 隔离机制。它不授予 C1，不建立真实抠图能力，不扩正式产品 UI；实时等级仍以 [../STATUS.md](../STATUS.md) 为准。

## 目标与边界

Slice 02 只完成四件事：

1. 冻结 `CC-CAP02-NORMALIZE@0.2.0` 的窄范围 RGBA8 PNG 归一化合同。
2. 冻结 `CC-CAP02-EXPORT@0.2.0` 的 PNG `DeliveryArtifact` 导出、重开与 hash 合同。
3. 冻结 `CC-CAP03-SOURCE-CARD-V0@0.2.0` 及 `SourceCard.v0` schema；未实现的质量、主体和内容观察必须输出 `unknown + unknownReason`。
4. 冻结 `CC-CAP04-MATTE-SIMPLE@0.2.0` 的颜色距离比较基线；它只接受已知均匀背景的项目原创合成图，不得成为产品 fallback。

四份合同均为 `status=frozen-research`、`evidence.status=C1=0`、`releaseStatus=research-only-not-product-fallback`。执行器引用 [research-reference-adapters.mjs](../scripts/research-reference-adapters.mjs) 的精确 SHA-256；合同内容另有 canonical `contractHash`。没有模型、checkpoint、第三方图片、真实用户照片或外部服务调用。

四份合同内嵌各自唯一的 `qa-profile.<contract-id>.v0.2.0`，其 `checks` / `fallback` 就是该 profile 的权威定义，不引用另一个可变文件。共同的 `dataPolicyVersion=data-policy.synthetic-fixtures-only.v0.2.0` 在本合同中定义为：只允许 `sourceClass=project-original-synthetic`、无外部输入、无真人 / 个人数据、仅本地 Node.js 研究进程；[rights record](./slice-02/rights/rights.project-original-synthetic.slice-02.v1.json) 逐资产落实该边界。更广数据或执行位置必须发布新合同版本。

## 夹具合同

Slice 02 在 [slice-02](slice-02) 中为 `NORMALIZE-DELIVER` 与 `MATTE-GT` 分别建立：

- `dev/calibration`
- `holdout`
- `defect/calibration`
- `defect/holdout`
- `escape`

共 10 个项目原创 procedural fixture、30 个 PNG。每个 fixture 具有唯一 `sourceFamilyId`、`captureSessionId`、来源 SHA-256 和 64-bit average perceptual hash；validator 拒绝跨 partition 家族 / 会话泄漏、exact source 重复、perceptual hash 重复、未登记文件和 catalog 暴露。

`defect/calibration` 与 `defect/holdout` 使用不同来源族并注入不同坏结果。`escape` 在本切片只是 escape 流程演练：只保存人工重建的项目原创合成最小复现，lineage 必须以 `human-reconstructed-synthetic-regression:` 开头，不含真实用户像素或 metadata，也不冒充已观察到的真实漏检证据。

## Holdout 的限制

仓库内可见的 `holdout` / `defect/holdout` 只用于验证结构隔离、sealed state、hash、rights 和 catalog-denied 行为。由于生成器和资产均提交在仓库中，它们不是未来 C1 可以复用的真正密封质量 holdout。任何 C1 对测必须先冻结完整质量预注册，再发布新的不可见 / 受控 holdout 版本；本切片的结构夹具不得转名冒充独立能力证据。

## 验收条件

- 四份合同结构闭合、字段齐全、无 `pending-*`，内容和执行器 hash 可核对。
- 七份合同 I/O schema（`ImageAsset.v0`、`NormalizedImage.v0`、`RGBA8PixelBuffer.v0`、`DeliveryArtifact.v0`、`SourceCard.v0`、`SubjectMap.v0`、`AlphaMatte.v0`）及 capability / fixture / rights / partition schema 均拒绝未知字段；validator 对实际 JSON 实例执行 schema，而不只检查 schema 外形。
- 参考归一化只接受 exact IHDR/sRGB/IDAT/IEND、RGBA8、filter-0 PNG，并核对 input descriptor / bytes；导出核对 input pixel buffer 声明并重开比对 dimensions、sRGB、Alpha 与 pixel SHA-256。
- `SourceCard.v0` 从实际 normalized bytes 重开技术事实并与 artifact 交叉核对；不补猜未冻结观察项，不含身份、年龄、敏感属性或审美判断。
- Matting baseline 只接受声明为项目原创、无真人、单主体、已知均匀背景且全不透明的源，确定性输出 8-bit Alpha；参数缺失 / 越界即拒绝，结果只计作比较下限。
- 两套 suite × 五个 partition 完整，所有私有资产均不得进入 Slice 01 review catalog 或只读服务 allowlist。
- `npm.cmd run verify` 全量通过，且输出继续明确全部证据轴为 0。

## 非目标

- 不支持真实 JPEG / WebP / HEIC、EXIF 1–8、ICC / P3 / CMYK、HDR、动画或大图；这些仍是后续 `NORMALIZE-DELIVER` 正式 fixture 范围。
- 不建立人物 / 通用物体理解、真实背景复杂度、质量诊断或推荐。
- 不接入 MODNet、BiRefNet、SAM、OpenCV、Sharp、libvips 或任何模型权重。
- 不修改 `/` R0 工程探针或 `/research/` Slice 01 审阅 UI，不增加正式产品入口。
