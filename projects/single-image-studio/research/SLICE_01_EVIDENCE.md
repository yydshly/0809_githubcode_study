# Slice 01 验收证据

> 记录日期：2026-08-15。本文只证明 Slice 01 研究设施和交互合同可运行，不证明任何 Matting 模型质量、用户效果、生产闭环或发布资格。实时等级仍以 [../STATUS.md](../STATUS.md) 为准；当前 `C1/U1/E1/R1-pipeline/R1-product/O1/G1/V1/Release Gate` 均为 0。

## 被验收的实现

- 3 个本项目原创、确定性生成的 `MATTE-GT dev/calibration` fixture：硬边、内部孔洞、软边。
- 每个 fixture 含来源、Alpha、前景、黑底、白底、高饱和彩底，共 18 个 PNG。
- 固定 rights record、FixtureManifest、严格 catalog、精确资源 allowlist 和 SHA-256 校验。
- loopback-only 的只读 catalog / PNG 服务。
- `surface.research-review`：六视图、适配 / 1:1、轮廓叠加、结构化初判、提交锁定和主动解盲。

FixtureManifest 的确定性 manifest hash：

```text
bf8a16407ee536a899b1d5473ec519e5c738a9df0196e483fa738e46ce38e177
```

## 自动化与 HTTP 证据

从 `projects/single-image-studio` 运行：

```powershell
npm.cmd run research:prepare
npm.cmd run verify
```

2026-08-15 结果：

- generator 生成 3 个 fixture / 18 个 PNG；validator 重新计算 hash、尺寸、rights、partition、family / session 隔离和 catalog allowlist 后通过。
- `node --test`：77 / 77 通过。
- `node --check`：服务、生成器、validator、R0 和研究 UI 模块全部通过。
- `GET /api/research/fixtures`：200，返回 3 个 fixture。
- allowlist 中真实 PNG：200，`Content-Type: image/png`，`Cache-Control: no-store`。
- catalog 缺失注入：503、非披露错误；没有 fallback 图片。
- LAN、遍历、目录、非 PNG、未列入清单、缺失资源和链接越界均有自动化拒绝测试。

## 真实浏览器证据

验收入口：`http://127.0.0.1:4177/research/`。

本轮先用 Codex 内置 Chromium 浏览器在可见 `1280×720` viewport 做人工检查，再用本机安装的 Chrome `151.0.7922.138` 与 Edge `151.0.4129.78` 分别在 `1280×720`、`1440×900` 执行同一主路径。精确版本和 viewport 只绑定 Slice 01 研究审阅 surface，不能迁移为未来正式产品的 `CompatibilityProfile` 或 R1-product 证据。

1440×900 浏览器截图已在本次 Codex 任务会话内捕获并目视检查，但没有复制为仓库资产；因此本文记录可复跑的 URL、版本、viewport 和观察结果，不把会话截图冒充可长期审计的 `TestEvidenceManifest`。正式证据阶段须另行冻结截图 hash、浏览器 profile 与存放位置。

### 1280×720

- 首屏明确显示“研究方法演练”“C1=0”“非产品”；catalog 为 `review-catalog.local-synthetic.v0 / 0.1.0`。
- 3 个 fixture 均可选择；当前 fixture 的 6 / 6 图片完成 allowlist 服务检查、fetch、blob 与浏览器解码后才允许评审。SHA-256 由独立 `research:validate` 核对，不把页面加载状态误称为逐请求 hash 校验。
- 来源 → Alpha 页签切换成功；`fit / 1:1`、轮廓叠加和 fixture 切换均保持正确上下文。
- 选择缺陷、严重度、结论并提交后，原始输入被锁定；方法和事实仅在主动解盲后出现。切换 fixture 会清除锁定、解盲和旧资产 ready 状态。
- 未选择严重度与结论时提交被拒绝，错误摘要获得焦点；键盘在页签上按 `ArrowRight` 后焦点进入 Alpha，`aria-selected=true`，可见焦点轮廓为实线。
- Chrome 与 Edge 的正常主路径控制台错误均为 0；`documentElement.scrollWidth` 不大于 viewport 宽度，没有横向操作阻塞。

### 错误状态与本轮修正

通过独立端口注入缺失 catalog：页面显示可读的严格错误，fixture 和提交均禁用，不加载 fallback 资源，并继续显示 `C1=0`。

第一次浏览器检查发现，错误信息会被右侧长表单撑到 720px viewport 下方。已把桌面 `.app-shell` 冻结为 viewport 高度、让视觉与评审面板各自滚动；复验后错误框完整位于 viewport 内，页面 `scrollHeight=720` 且无横向溢出。窄屏文档流回退仍保留 `height:auto`，但不产生移动端支持证据。

### Chrome / Edge 双视口矩阵

| 浏览器 | 1280×720 | 1440×900 | 主路径 | 控制台错误 | 横向溢出 |
| --- | --- | --- | --- | --- | --- |
| Chrome `151.0.7922.138` | pass | pass | 六图加载与解码、键盘切换、锁定、解盲通过 | 0 | 0 |
| Edge `151.0.4129.78` | pass | pass | 六图加载与解码、键盘切换、锁定、解盲通过 | 0 | 0 |

Codex 内置浏览器的 viewport override 两次请求 `1440×900` 后仍报告 `1280×720`；该工具限制没有被伪装成通过，而是由上述本机 Chrome / Edge 精确版本矩阵补证。未来浏览器版本、正式 surface 或关键 CSS 改变后必须重跑，不能沿用本表。

## 结论

Slice 01 的研究目录、确定性 fixture、清单隔离、只读服务、桌面审阅主路径、空目录与错误路径已经形成可运行工程基线；冻结的 Chrome / Edge 双视口矩阵也已完成。真实模型候选、独立 holdout、defect / escape 证据、持久化评审和任何产品 UI 均未开始。
