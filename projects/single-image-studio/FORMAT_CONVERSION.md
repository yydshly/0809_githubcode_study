# 图片格式转换体验契约

状态：内部产品 Alpha；本地单图能力。

## 设计契约

- Entry mode：revision-led feature implementation。
- Target user：只想把现有 JPEG / PNG / WebP 转成可上传、可保留透明或更通用格式的普通用户。
- Desired first impression：先选需要的输出格式，再明确透明区域和画质会发生什么变化。
- Visual ambition：Functional。
- Experience architecture：Editorial Flow。
- Primary journey：上传图片 → 选择“图片格式转换” → 选择 PNG 或 JPEG → JPEG 时设置质量与透明区域填色 → 本地生成并重开核验 → 查看格式、尺寸、体积和不可逆变化 → 下载。
- Autonomy authorization：用户要求继续扩展整体项目，可直接实现可逆的本地场景能力。
- User-decision boundary：用户决定输出格式、JPEG 质量和填色；系统不覆盖原图、不自动抠图、不声称 PNG 能恢复 JPEG 已损失细节。

## 能力边界

- 输入仍限项目当前接受的 JPEG / PNG / WebP，输出只提供 PNG 与 JPEG。
- 保持完整图片比例，不裁切、不拉伸；默认尽量保持来源尺寸，但仍受 8192 px 单边和 1600 万输出像素安全上限约束。
- PNG 支持保留已有 Alpha，但不会产生新的透明背景，也不是抠图。
- 格式转换不会自动抠图；需要移除背景时仍应使用独立的透明抠图任务。
- JPEG 不支持透明；原图若有透明或半透明像素，必须使用用户可见的颜色填充。
- JPEG 为有损编码，质量可在 40%–95% 内设置；PNG 不使用该质量参数。
- 转成 PNG 不会恢复 JPEG / WebP 已经丢失的纹理、颜色或边缘细节，且文件可能变大。
- 所有输出复用现有 renderer，并执行格式、尺寸、像素、metadata 和哈希重开检查。

## 验收覆盖

| 状态 | 验收标准 |
| --- | --- |
| 任务入口 | 与压缩、基础编辑分开，明确是格式转换而非画质修复 |
| PNG | 透明策略可理解，JPEG 质量和填色控件隐藏 |
| JPEG | 质量、填色可见且可键盘调整，明确有损与透明填充 |
| 结果 | 显示来源 / 输出格式、尺寸、体积、透明策略和质量说明 |
| 下载 | PNG / JPEG 均绑定当前任务与已核验结果，文件名使用 converted-image 前缀 |
| 窄屏 | 设置与结果说明不产生横向溢出 |
