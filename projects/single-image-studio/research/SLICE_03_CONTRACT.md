# Slice 03 范围冻结与进入合同

> 状态：`scope-frozen / implementation-not-started`。本文件只冻结下一切片的研究边界与验收条件，不授予 C1，不创建 EvidenceManifest，不表示新增格式、图片理解、Matting 或产品能力。实时等级仍以 [../STATUS.md](../STATUS.md) 为准。

## 目标

Slice 03 只允许三个相互独立的工作包：

1. 冻结 `NORMALIZE-DELIVER` 的机器可读格式政策矩阵，明确区分政策、实现和证据状态。
2. 为后续新版本 `SourceCard` 技术 observer 建立“重开 normalized bytes 并交叉核对 artifact”的独立实现与缺陷夹具；质量、主体、内容仍全部 unknown。
3. 建立真正密封 holdout 的 schema、角色和仓库外运行仪式，并只用临时 mock bundle 演练；正式 holdout 保持 `not-created`。

Slice 03 必须使用新的 `research/slice-03/`、adapter、generator、validator 和测试。不得修改 Slice 02 的 [reference adapter](../scripts/research-reference-adapters.mjs) 或回写四份 `@0.2.0` 合同；它们已经绑定仓库中精确 SHA-256。

## 格式政策矩阵

机器可读矩阵的每一行必须至少包含：

```text
formatId + direction(input|output)
policyState(reference-calibration-eligible|research-candidate|deferred-reject|forbidden)
implementationState(reference-executable|probe-only|reject-only|not-implemented)
evidenceState(none|structural-only)
productSupport=false
profileRef + rejectionCode + claimBoundary
```

字段必须分别记录，不能把 `probe-only`、扩展名识别或 header 读取写成“支持”。首版矩阵冻结如下：

`reference-calibration-eligible` 只允许运行项目原创的开放结构夹具，不等于 Registry Gate B 的 `calibration-ready`；`research-candidate` 只允许 probe / reject 研究。所有行均固定 `productSupport=false`。

| 方向 | 格式 | 政策状态 | Slice 03 允许的实现状态 | 证据状态 / 说明 |
| --- | --- | --- | --- | --- |
| input | canonical PNG（RGBA8、embedded sRGB、orientation 1、单帧、filter-0、≤1 MiB / 256×256） | `reference-calibration-eligible` | `reference-executable` | `structural-only`；只沿用窄研究 profile，不是用户 PNG 支持 |
| input | JPEG | `research-candidate` | `probe-only` 或 `reject-only` | `none`；不得正式解码 / 归一化，也不得进入能力 calibration |
| input | WebP | `research-candidate` | `probe-only` 或 `reject-only` | `none`；不得正式解码 / 归一化，也不得进入能力 calibration |
| input | HEIC | `deferred-reject` | `reject-only` 或 `not-implemented` | `none`；独立稳定拒绝码 |
| input | HEIF | `deferred-reject` | `reject-only` 或 `not-implemented` | `none`；独立稳定拒绝码 |
| input | AVIF | `deferred-reject` | `reject-only` 或 `not-implemented` | `none`；独立稳定拒绝码 |
| input | GIF | `deferred-reject` | `reject-only` 或 `not-implemented` | `none`；独立稳定拒绝码 |
| input | APNG | `deferred-reject` | `reject-only` 或 `not-implemented` | `none`；独立稳定拒绝码 |
| input | TIFF | `deferred-reject` | `reject-only` 或 `not-implemented` | `none`；独立稳定拒绝码 |
| input | SVG | `deferred-reject` | `reject-only` 或 `not-implemented` | `none`；独立稳定拒绝码 |
| input | PDF | `deferred-reject` | `reject-only` 或 `not-implemented` | `none`；独立稳定拒绝码 |
| input | RAW | `deferred-reject` | `reject-only` 或 `not-implemented` | `none`；独立稳定拒绝码 |
| output | PNG | `reference-calibration-eligible` | `reference-executable` | `structural-only`；只覆盖冻结 RGBA8 / straight-alpha 研究 profile |
| output | JPEG | `deferred-reject` | `not-implemented` | `none` |
| output | WebP | `deferred-reject` | `not-implemented` | `none` |

任何格式从 `probe-only` / `reject-only` 升为可执行，都必须发布新的合同版本、正式 decoder / encoder 边界和独立取证，不能静默改矩阵。

## 技术 observer 合同

技术 observer 必须从实际 normalized bytes 重新解析并与 artifact 逐项核对：

- MIME / 文件签名；
- decoded width / height；
- orientation=1；
- embedded sRGB；
- Alpha presence 与 straight / unpremultiplied alpha contract；
- decoded pixel SHA-256 与父产物身份。

任一字段缺失、类型错误、bytes / artifact 不一致、格式超出 profile 或 parser 不能确定时均 fail closed，不生成 SourceCard。`quality`、`subject`、`content` 继续强制为 `unknown + unknownReason + confidence=[0,0]`；不得新增身份、年龄、人物类别、文字、审美或推荐推断。

原始输入格式事实与 normalized artifact 事实必须分开记录。header probe 不是安全解码证据；手写 PNG parser 只属于 fixture reference，不是生产安全边界。

## 开放夹具边界

只允许项目原创 procedural fixture，且只创建：

- `dev/calibration`；
- `defect/calibration`。

建议覆盖 canonical PNG、MIME / 扩展名冲突、坏签名、CRC 错误、截断 chunk、IEND 后尾随字节、缺失 / 冲突色彩声明、超出 byte / dimension 上限、非 RGBA8、非 filter-0、interlace、动画 chunk 和未知 critical chunk。每个 defect 必须具有独立来源族、明确注入步骤和稳定拒绝码。

Slice 03 不提交 `holdout`、`defect/holdout` 或未来正式 `escape` 像素、seed、生成器或可重建秘钥。Slice 03 人工预填或注入的案例不得命名为 escape；正式 escape 只能来自真实运行漏检、经权利与隐私处理的合规最小复现。

## 密封仪式准备

只允许建立以下严格 schema 与 mock rehearsal：

- `seal-plan`：候选、参数、阈值、分母、指标、停止规则、角色与时间戳冻结；
- `bundle-manifest`：仓库外 bundle ID、资产计数、rights、加密 / 完整性摘要，不含像素或 seed；
- `run-request`：一次性执行器、候选 hash、profile 与授权范围；
- `run-receipt` / `result-summary`：custodian、解封、运行、销毁 / 归档与原始结果位置；
- 独立角色硬门：custodian 不得是候选实现、阈值、QA profile 或停止规则的作者 / 调参者；角色 ID 与冲突声明必须进入 receipt 并由 validator 拒绝重合；
- 冻结链：preregistration、contract、candidate、runner、format profile、QA profile 与 bundle 必须逐项记录 SHA-256，并在 request / receipt 中形成不可变引用链；
- 隔离证明：bundle 必须记录 source-family / capture-session 排重摘要与 custodian 签署的 partition isolation 结果；
- 一次性语义：request ID、idempotency key、允许的无效运行原因、最大重跑次数与结果归并规则必须事前冻结；有效正式结果不得选择性重跑；
- custody：access / custody 事件必须追加记录 actor、时间、动作、前序事件 hash 与原因；
- mock 隔离：所有 mock bundle / request / receipt 必须带 `ceremony-rehearsal=true`，正式 validator 必须拒绝该标记和任何 mock ID；
- runner 路径：正式请求拒绝仓库内路径，并以 resolved real path 拒绝 symlink / junction / mount 回指仓库；“路径在仓库外”本身不构成密封证明；mock 只能使用系统临时目录并在测试结束清理。

真正 holdout 只能在候选、合同、QA profile、阈值、分母、指标和停止规则全部冻结后，由独立 custodian 在仓库外生成 / 保管并一次性运行。仓库可见资产、公开 seed 或随代码可重建的集合都不构成密封；Slice 03 完成时正式 holdout 状态仍必须是 `not-created`。

## 验收制品

- 严格关闭的 format-matrix schema、冻结 profile 与逐行完整矩阵；
- 独立 Slice 03 technical observer 合同、实现 hash 与 byte/artifact mismatch 负例；
- 项目原创开放 calibration / defect-calibration 夹具、rights、manifest 与 hash；
- seal plan / bundle / request / receipt / result schema，以及只使用临时 mock bundle 的仪式测试；
- 确定性生成、格式矩阵完备性、未登记文件、路径逃逸、catalog denial、schema 放宽和错误支持声明的 fail-closed 测试；
- `npm.cmd run verify` 全量通过，且继续输出全部证据轴为 0 与 `Release Gate: allowlist=none`。

## 硬停止与非目标

- 不建立、选择、下载或运行 Matting 模型、checkpoint 或第三方图像依赖。
- 不创建 `MATTE-REAL`，不使用真实人物、用户照片、第三方样片或许可未解资产。
- 不实现 JPEG / WebP 的正式解码、归一化或导出；不把格式探测写成产品支持。
- 不扩 `/`、`/research/` 或任何正式产品 UI，不增加下载入口或用户任务。
- 不提交正式 holdout / defect-holdout / escape 像素或 secret seed。
- 不创建 EvidenceManifest，不授予 Gate B、C1、U1、E1、R1、O1、G1、V1 或 Release Gate。

越过任一硬停止项必须先另行更新 [STATUS.md](../STATUS.md)、[IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) 与相应预注册；不得以“继续 Slice 03”为隐含授权。
