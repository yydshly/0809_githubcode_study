# Slice 01 实现与验收合同

> 本文件记录从“文档架构”进入“可执行研究设施”的第一刀。它不是能力证据、产品发布声明或用户研究结果；实时证据等级仍以 [../STATUS.md](../STATUS.md) 为准。

## Design Contract

```text
Entry mode: brief-led implementation
Request revision: 1
Target user and context: Windows 桌面 Chromium 中工作的研究工程师与独立评审者
Desired first impression: 这是可审计的研究工具，不是已经完成的图片产品
Visual ambition: Functional
Experience architecture: Hybrid Workspace
Visual constraints: 1280×720 最低、1440×900 主审查；清晰层级；不依赖装饰性动效
Information constraints: 初判前始终显示 suite / partition、候选匿名 ID、证据状态与“非能力证明”边界；描述性名称、source revision、方法与夹具事实仅在锁定并主动解盲后显示
Operation constraints: 鼠标与键盘可达；本切片只读取本地合成夹具，不上传、不调用模型、不写入用户内容
State constraints: 空/加载/就绪/视图切换/评审未提交/已提交/解盲/错误必须可区分，旧选择不得错绑
Environment constraints: Node.js >=22；loopback 本地服务；Windows Chrome/Edge；不声明移动、Safari、Firefox 或 HEIC
Primary journey: 打开研究入口 → 选择合成 fixture → 检查来源/Alpha/多底合成 → 标记缺陷与结论 → 提交初判 → 解盲查看方法字段
User-defined phases: WP0 研究目录与 schema；WP1 合成 dev/calibration 夹具；研究审阅 UI；工程与浏览器验收
Required artifacts: research tree、manifest validator、fixture generator、研究审阅 route、自动测试、浏览器证据记录
Autonomy authorization: 用户于 2026-08-15 明确要求“开始执行”
User-decision boundary: 下载第三方模型/权重、采集或上传真实用户照片、选择生产数据库/队列/云服务、正式产品视觉方向
Observable completion criteria: 研究校验命令通过；合成资产可重复生成且 hash 可核对；研究入口完成冻结桌面主路径并如实记录未覆盖矩阵；R0 原入口与测试不回归；研究页始终显示 C1=0、非产品与不产生 U1/E1/R1 证据的边界，其他证据轴由 STATUS 唯一记录
Coverage record: 下表
```

### Hybrid Workspace 边界

- 持久视觉工作区负责来源、Alpha、多底合成、缩放与视图切换。
- 右侧详情流负责 fixture 元数据、结构化缺陷、结论、提交与解盲。
- 顶部运行栏持续显示研究身份和不可变上下文；切换 fixture 时视觉工作区与详情流同时重置。
- 本切片只覆盖桌面，不定义移动抽屉；超出冻结视口时只提供可读文档流回退，不产生兼容证据。
- 图像或 Canvas 不可用时，fixture 元数据与错误状态仍可读，且不能提交视觉结论。

## Coverage Manifest

| 用户阶段 | 要求或制品 | surface / state | 所需证据 | owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| WP0 | 自足 research 目录与边界说明 | filesystem | 文件与本地链接检查 | Stage 0/9 | pass | 保持目录可独立审计 |
| WP0 | 版本化 manifest schema 与严格校验 | CLI | 正例、负例与跨 partition 泄漏测试 | Stage 1/9 | pass | schema 变更必须升版并复跑负例 |
| WP1 | 可重复生成的本地合成 MATTE-GT dev/calibration 夹具 | filesystem | 生成命令、资产 hash、rights 与 fixture manifest | Stage 1/9 | pass | 不把 dev/calibration 资产复制进 holdout |
| 研究 UI | 独立 `surface.research-review` 入口 | `/research/` 默认态 | 真实浏览器与 DOM 观察 | Stage 1/2/3 | pass | 保持与 R0 `/` 完全分离 |
| 研究 UI | 来源/Alpha/黑白彩底/轮廓视图 | `/research/` fixture ready | 浏览器交互与状态观察 | Stage 4/5 | pass | 新增图层前先扩 schema 和测试 |
| 研究 UI | 缺陷、严重度、结论、提交与解盲 | review/unblinded | 键盘路径、提交锁定、解盲前后观察 | Stage 5/6/7 | pass | 持久化必须另开切片并先过数据治理 |
| 兼容 | Windows Chromium 两个桌面视口 | 1280×720、1440×900 | 真实浏览器交互、DOM / console 观察与会话内截图 | Stage 7 | pass | Chrome `151.0.7922.138` 与 Edge `151.0.4129.78` 均完成两视口主路径；正式产品 build 仍须重新建立 CompatibilityProfile |
| fallback | catalog / 资源损坏 | error | 可读错误、无 fallback、禁止提交观察 | Stage 6/8 | pass | 新错误类型必须继续 fail closed |
| 回归 | R0 原入口、测试与语法 | `/`、CLI | 77 项自动测试、syntax、HTTP smoke | Stage 9 | pass | 后续切片继续运行 `npm.cmd run verify` |
| 交接 | 状态与运行说明不产生能力过度声明 | docs | 文档检查与最终审计 | Stage 9 | pass | 浏览器细节与限制见 [SLICE_01_EVIDENCE.md](SLICE_01_EVIDENCE.md) |

## 非目标

- 不下载或接入 GroundingDINO、SAM 2、BiRefNet、MODNet 或其他模型。
- 不把合成夹具成功视为 Matting C1，也不把研究 UI 视为 R1-product。
- 不持久化真实评审、用户图片或敏感内容；本切片的提交只验证浏览器交互合同。
- 不改变现有 `/` R0 工程探针的产品方向，不开发移动或正式产品 surface。
