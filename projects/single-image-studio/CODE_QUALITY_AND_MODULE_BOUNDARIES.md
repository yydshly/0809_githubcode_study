# Single Image Studio 代码质量与模块边界

> 生效日期：2026-08-17
>
> 范围：`PRODUCT_STABILIZATION_ROADMAP.md` 的 S1 第一批结构收敛

## 1. 本轮契约

| 字段 | 当前约定 |
| --- | --- |
| Entry mode | revision-led；在已运行产品上进行无行为变化重构 |
| Target user and context | 使用桌面浏览器完成单图处理的普通用户；维护者需要安全扩展场景 |
| Desired first impression | 本轮不改变视觉；用户不应察觉代码结构变化 |
| Visual ambition | Functional |
| Experience architecture | Editorial Flow |
| Visual constraints | 保持现有页面层级、文案、完整图片显示、响应式与焦点行为 |
| Information constraints | 不新增产品声明；错误和结果含义保持原样 |
| Operation constraints | 不调用真实远程 Provider；不改变上传、执行、下载或恢复合同 |
| State constraints | 来源、任务、run、结果和旧下载的身份隔离不得放宽 |
| Environment constraints | `npm run start`；`http://127.0.0.1:4177/`；Windows 桌面 Chromium 首轮范围 |
| Primary journey | 上传项目图片 → 选择本地任务 → 设置 → 生成 → 完整结果 → 下载 / 换任务 |
| User-defined phases | 代码质量 → 样例页 → 错误体验 → 场景工作流 |
| Required artifacts | 职责盘点、首个纯逻辑抽离、测试、产品验证、可重放浏览器证据 |
| Autonomy authorization | 用户已明确“开始”，授权执行路线中可逆的 S1 工作 |
| User-decision boundary | 新业务、真实付费调用、本地模型、公开发布或视觉重设计需要另行决策 |
| Observable completion criteria | 用户行为不变；产品测试全绿；浏览器基线可重放；模块职责更明确 |

## 2. 当前可运行基线

| 项目 | 证据 |
| --- | --- |
| 启动命令 | `npm run start` |
| Canonical URL | `http://127.0.0.1:4177/` |
| 验收 URL | `http://127.0.0.1:4177/product-acceptance.html` |
| 最近浏览器证据 | run `53b27d40-83d2-4c82-942d-7c683d64bb30`，五条本地流程 `5/5 pass` |
| 自动测试基线 | `npm run verify:product`：315 / 315；256 个 JavaScript 文件语法通过 |
| 浏览器范围 | Codex 内置 Chromium；当前记录不替代操作系统下载目录或原生指针 / 键盘检查 |

## 3. `main.js` 当前盘点

当前文件事实：

- 5103 行、约 292 KB；
- 直接导入 37 个本地模块；
- 173 个顶层函数；
- 29 个顶层可变状态；
- 同时承担 DOM 查询、任务文案、页面切换、编辑器交互、场景执行、远程任务、结果生成、错误恢复和下载入口。

### 3.1 当前职责簇

| 职责簇 | 当前状态所有者 | 典型入口 | 风险 |
| --- | --- | --- | --- |
| 来源与全局任务状态 | `machine`、`source`、`sourceUrl`、`selectedTask` | `acceptSource`、`confirmAndPrepare`、`dispatch` | 与 DOM 和执行混在一起，来源变化容易影响多个闭包 |
| 任务目录与设置页 | `tasks`、`selectedTask`、动态表单 DOM | `renderTasks`、`selectTask`、`renderSettings`、`getSettings` | 每加任务都需要修改多个长分支 |
| 编辑器工作区 | `editorWorkspace`、crop / rectification drag | `initializeEditorWorkspace`、`renderEditorPreview` | 几何、表单和指针事件耦合 |
| 本地组合工作流 | 局部 settings 与 run result | `runUploadSpecification`、`runDocumentArchive`、`runSelectedTask` | 步骤、输出和检查分散在目录、设置与执行分支 |
| 抠图与蒙版 | `maskCorrectionSession`、Provider run | `runBackgroundRemoval`、`initializeMaskCorrection` | 远程状态、画布和交付套装共享主控制器 |
| 多结果套装 | 四组 busy / session / token 状态 | product / portrait / social / old-photo / grid helpers | 相似异步防旧结果逻辑重复 |
| 结果呈现 | `currentResult`、比较层状态 | `renderResult`、`selectComparisonLayer` | 文案、可见性、下载与异步准备集中在一个函数 |
| 错误与恢复 | state machine + error DOM | `friendlyError`、`showError`、`recoverUnknownRun` | 供应商错误、普通文案和恢复动作尚未完全统一 |

### 3.2 已有可复用边界

项目并非从零拆分。以下模块已经是正确方向，应扩展而不是重写：

- `state-machine.js`：来源 / run / result 的状态约束；
- `editor-session.js`、`editor-renderer.js`、`editor-workspace.js`：本地编辑执行和像素合同；
- `task-catalog.js`、`scenario-skills.js`、`task-groups.js`：任务身份、可用性与呈现分组；
- `result-download.js`、`result-stage.js`：下载资格与结果显示几何；
- `recovery-presentation.js`：错误页恢复按钮；
- 各本地工作流模块：压缩、格式、画布、文档、上传规格和输出套装纯逻辑。

## 4. 目标边界

本轮不按“把 `main.js` 拆小”作为成功标准，而按职责所有权收敛：

```text
main.js
  = 页面装配 + 事件接线 + 跨模块状态协调

task/workflow definitions
  = prerequisite + parameters + steps + outputs + checks + error boundary

result presentation
  = result facts -> labels / visibility / actions

error presentation
  = error facts -> user copy / data boundary / recovery intent

feature modules
  = deterministic image or workflow implementation
```

禁止的拆分方式：

- 只把一段代码复制到新文件，但仍让两个文件共同修改同一 DOM 和状态；
- 为了减少行数创建无语义的 `utils.js`；
- 在重构提交中同时改变页面视觉或业务流程；
- 新模块绕开 `state-machine`、输出重开或下载合同；
- 把 Provider 字段直接暴露给页面。

## 5. 第一批迁移顺序

1. 抽出纯错误文案映射，并为已知 Provider / 本地错误补稳定测试；
2. 定义最小 `WorkflowDefinition` 验证器，以 `UT-UPLOAD` 作为第一个完全本地迁移样板；
3. 把一个结果 view model 从 `renderResult` 抽为纯映射；
4. 观察重复的多结果套装生命周期，再决定是否抽公共 controller；不先做大规模泛化。

## 6. Coverage record

| 用户阶段 | 要求 | Surface / state | Evidence | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 代码质量 | 可运行基线 | 产品首页、五条验收流程 | 已有浏览器 run + 产品测试 | Stage 1 | pass | 保留为重构回归线 |
| 代码质量 | 职责与依赖盘点 | `web/main.js` | 本文第 3 节 | Stage 0 | pass | 选择低风险抽离边界 |
| 代码质量 | 纯错误映射 | 明确失败 / Provider 不可用 | `error-presentation.test.mjs` + 主入口接线 | Stage 6 | pass | 已抽离分类与普通语言文案 |
| 代码质量 | 纯结果映射 | 本地 / 抠图 / 生成式结果 | `result-presentation.test.mjs` + 主入口接线 | Stage 6 | pass | 已抽离下载、重做、标签与可见性映射 |
| 代码质量 | 首个工作流定义 | `UT-UPLOAD` 本地流程 | 合同测试 + 现有上传流程测试 | Stage 5 | pass | 已建立 strict definition 并接入编辑 / 本地路由判断 |
| 代码质量 | 第二个工作流定义 | `UT-DOC-ARCHIVE` 本地流程 | 合同、目录 identity 与现有文档流程测试 | Stage 5 | pass | 已显式保留四角裁正、文档效果、JPEG、体积和重开步骤 |
| 代码质量 | 结果 facts | 摘要、QA、尺寸 | `resultFactsPresentation` 单元测试 + 主入口接线 | Stage 6 | pass | compression / conversion / portrait / generic facts 已抽离 |
| 代码质量 | 单一任务 profile | 17 个目录任务 | task catalog executor 全量交叉测试 | Stage 5 | pass | editor / local / background / composed / rectification 不再由主文件重复数组维护 |
| 代码质量 | 比较视图 facts | 原图 / 结果 / 参考 / 并排 | `comparisonSizePresentation` 单元测试 + 浏览器结果页 | Stage 6 | pass | 任务标签、尺寸、压缩与转换补充信息已抽离 |
| 代码质量 | 工程闭合 | 全部产品代码 | `verify:product` + syntax + diff check | Stage 9 | pass | 330 / 330；262 个 JavaScript 文件语法通过 |
| 代码质量 | 页面无回归 | 产品首页 / 验收页 | 浏览器 report `d9742750-f7bb-4898-b412-bde47f12fcb9` | Stage 5 | pass | Codex in-app Chromium 五条本地流程 5 / 5 通过 |

## 7. 本轮停止条件

以下任一情况出现时，停止继续抽取并先修复：

- 产品测试或五条浏览器流程出现回归；
- 新旧模块对同一状态拥有写权限；
- 上传规格适配的参数、步骤、输出或错误语义发生变化；
- 重构需要真实 Provider 调用或新的用户选择；
- 无法证明旧结果和旧下载仍被正确阻止。

## 8. 第一批实施结果

本批次已完成：

- 新增 `error-presentation.js`，把 Provider / 生成式 / moderation / generic 错误映射从主控制器移出；
- 新增 `result-presentation.js`，集中管理下载按钮、重做动作、结果标签、替代文本和局部工具可见性；
- 新增 strict `workflow-definition.js`，以 `UT-UPLOAD` 作为第一个迁移样板；
- 主控制器只负责把纯映射应用到 DOM，并继续由原状态机决定当前任务与结果；
- 更新依赖旧源码位置的合同测试，使测试跟随真正的职责所有者；
- `npm run verify:product` 通过 323 / 323，语法检查通过 262 个 JavaScript 文件；
- Codex in-app Chromium 以 run `b671637d-2a0e-4e55-93fa-8d460912e85c` 重跑五条本地流程，5 / 5 通过；
- 本地服务已确认可返回最新 `main.js` 和三个新模块；未执行真实远程图片处理。

下一批 S1 工作优先迁移第二个完全本地工作流，并把 `renderResult` 中的结果摘要 / QA facts 继续抽成纯 view model。

## 9. 第二批实施结果

- `UT-DOC-ARCHIVE` 已进入同一 strict workflow registry；其任务目录 `contractVersion` 会与工作流 `parameterContract` 交叉核对；
- `renderResult` 的摘要、QA 文案和初始尺寸现在由 `resultFactsPresentation` 纯函数生成；
- 文档归档与上传规格的定义均明确为本地执行、失败前禁止下载，并分别保留自身步骤和检查；
- 定向测试 24 / 24，完整产品验证 327 / 327，262 个 JavaScript 文件语法通过；
- 浏览器 report `c4b26b77-f423-4a59-88e4-dfba9ed047c2` 五条本地流程 5 / 5 通过；未调用远程 Provider。

## 10. 第三批实施结果与 S1 退出决定

- 17 个任务的执行器、是否使用编辑器、是否属于组合抠图和是否需要裁正，现在由一个 runtime profile registry 所有；
- registry 与 `task-catalog.js` 的全部任务 ID 和 executor 逐项交叉核对，缺项、重复或漂移会使测试失败；
- 原图、结果、参考和并排比较的尺寸 / 状态描述已经移出 `main.js`；
- 完整产品验证 330 / 330，262 个 JavaScript 文件语法通过；
- 浏览器 report `d9742750-f7bb-4898-b412-bde47f12fcb9` 五条本地流程 5 / 5 通过；未调用远程 Provider。

当前 S1 判定为 **practical-complete**。`main.js` 仍然较大，但来源状态、像素执行、多结果异步生命周期没有为了减少行数而被冒险泛化；场景专属设置与执行仍应留在各自 feature module。进一步拆分只在 S2 / S3 暴露真实所有权问题时进行，不把代码行数作为目标。

下一阶段进入 S2：建立有来源清单、真实原图 / 结果对照、参数和能力边界的样例效果展示页。

## 11. 2026-08-18 Stage 1 重新开启

S2–S5 增量后，checkpoint `17ac5aa` 的 `main.js` 已增长至 5,281 行 / 约 300 KB，来源取消、任务顺序、runtime 分类和可运行选择再次分散在主控制器中。因此此前的 S1 practical-complete 只保留为当时事实，当前按[统一执行计划](PRODUCT_AND_ENGINEERING_EXECUTION_PLAN.md)重新进入 Stage 1。

第一批无行为变化抽离已完成：

- 新增 `source-task-controller.js`，唯一持有 17 项产品任务顺序；
- runtime flags 统一派生 local / editor / rectification / background-removal / composed / remote；
- 任务选择只接受当前 catalog 中的 runnable identity；
- 来源取消时只保留单调 source revision、superseded run 与 detached run 身份；
- `main.js` 不再直接维护 `getTaskCatalog` 排序和 runtime execution 判断；
- historical `UT-SOLID-BG` 不再进入产品 catalog，纯色换底继续作为结果工作台派生动作。

验证：

- controller 定向 4 / 4，相关状态 / catalog / workflow 合计 40 / 40；
- `verify:product` 377 / 377，287 个 JavaScript 文件语法通过；
- Chromium run `17d617b9-c344-4506-a699-aabbccddeeff` 六条本地旅程 6 / 6，输出尺寸与 bytes 未变化；
- `main.js` 变为 5,258 行，新增 controller 61 行。行数不是退出门，职责单一性才是。

第二批 settings 抽离也已完成：

- 新增 `settings-controller.js`，集中 workflow parameter contract、远程确认门和按任务参数归一化；
- 社交标题、上传规格、隐私分享、完整适配、格式转换、压缩与文档归档保持原冻结参数；
- `main.js` 只负责提交编辑历史、读取 FormData，并把纯 settings 交给 controller；
- conversion / compression 的比例、格式和像素范围继续 fail closed；
- product / portrait / cutout / restoration 使用各自普通语言确认错误，不被统一成模糊提示。

验证：settings 定向 5 / 5；`verify:product` 382 / 382，289 个 JavaScript 文件语法通过；Chromium run `28e728ca-d455-4617-b7aa-bbccddeeff00` 六条本地旅程 6 / 6，输出尺寸和 bytes 与 checkpoint 一致。`main.js` 当前 5,196 行，settings controller 86 行。

第三批本地执行 plan 已完成：

- 新增 `local-execution-controller.js`，集中任务 ID 到特殊执行 kind、状态说明、后处理和报告开关；
- privacy / document archive / upload / compression 保持专用执行 kind；其余仍走同一个 renderer；
- Canvas、压缩 attempt、套装 session、结果对象和 DOM 更新没有移动；
- fit / social 后处理以及 compression / conversion / upload / privacy 报告开关不再由主控制器重复维护。

首次隔离浏览器回归暴露 `rectificationPostProcess.label` 在非裁正任务中读取 null 的真实缺陷，造成 1 / 6；单元测试此前未覆盖这一主控制器接线。修为 optional label 并新增源码边界断言后，`verify:product` 386 / 386、语法 291 文件；隔离 Playwright Chrome run `8e4d8e20-3a6b-4c7d-9e10-112233445566` 六条旅程 6 / 6、0 pageerror。当前主文件 5,200 行 / 约 294 KB，本地 plan 64 行；行数变化不是结论，浏览器发现并关闭接线缺陷才是本批价值。

下一批先评估远程执行是否存在同样清晰的纯分派边界；若必须同时移动 Provider 生命周期、DOM 和 state machine，则停止抽离并转入 Stage 2 走查，而不为减行数冒险泛化。
