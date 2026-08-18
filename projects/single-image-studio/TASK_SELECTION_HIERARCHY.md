# 任务入口层级优化

## v2 · 按问题快速开始

随着本地工具增加，任务页在技术观察与完整任务目录之间新增 7 个问题导向快捷入口：文件太大、格式不对、不想裁掉内容、裁剪或旋转、文档或画面拍歪、想调亮 / 降噪 / 清晰、需要去背景。快捷入口只把用户带到明确任务，不分析图片、不自动生成；依赖未连接服务的入口保持禁用并显示真实状态。宽屏三列、中屏两列、窄屏单列，完整任务分组继续保留在下方。

## 设计合同

```text
Entry mode: Revision-led
Request revision: v1 — 以整体产品目标整理任务入口，不让缺少 OpenAI API 成为阻塞
Target user and context: 已上传一张图、希望快速选择实际可执行处理的桌面用户
Desired first impression: 当前能做什么一目了然；未连接服务不会制造“产品多数不可用”的错觉
Visual ambition: Functional
Experience architecture: Editorial Flow
Visual constraints: 保留现有纸张式视觉；可执行任务是主内容；不可执行扩展降低体积和对比度
Information constraints: 先技术观察，再可用能力，再可执行场景/工具；未连接任务放到末尾折叠区
Operation constraints: 只改变目录呈现；不改变任务、Provider、同意、运行或下载合同
State constraints: AI/抠图可用时任务自动回到主目录；不可用时仍可查看原因，但默认不展开
Environment constraints: Windows 桌面 Chromium；窄屏保持单列；本地服务 127.0.0.1:4177
Primary journey: 确认图片 → 理解技术观察 → 扫描实际可用任务 → 选择并进入设置
User-defined phases: 当前可用任务优先；未连接服务降级；响应式与状态回退验证
Required artifacts: 本合同、任务页实现、纯函数/页面合同测试、产品回归、运行 URL
Autonomy authorization: 用户明确要求继续开发并以整体目标为准
User-decision boundary: 新增付费 Provider、发送图片、删除历史能力或改变产品范围仍需新授权
Observable completion criteria: 主目录没有 disabled 大卡；当前 8 个可用操作可直接扫描；2 个生成式扩展只在折叠区说明；服务状态变化后分组自动更新
Coverage record: 下表
```

## 覆盖记录

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 可用任务优先 | 主目录只呈现可运行任务 | 任务页 / PhotoRoom 可用、OpenAI 缺失 | DOM 与分组测试 | 3 | pass | `activeGroups` 只含 runnable tasks |
| 未连接服务降级 | 两项生成式实验在末尾折叠且说明不影响当前功能 | 任务页 / 2 unavailable | 页面合同测试 | 3 | pass | 默认闭合的 `details` + 紧凑状态行 |
| 能力状态 | 有可用任务的能力层才使用大摘要卡 | capability summary | 状态组合测试 | 6 | pass | `available > 0` 才渲染摘要 |
| 状态恢复 | AI 或抠图可用时相应任务回到主目录 | 可用性切换 | 纯函数测试 | 6 | pass | `partitionTasksForDisplay` 覆盖可用/不可用组合 |
| 响应式 | 折叠区和紧凑行在窄屏无溢出 | 620px CSS | 样式合同测试 | 7 | pass | 宽屏双列信息、窄屏单列规则 |
| 工程闭包 | 不改变任务运行合同，产品回归通过 | 全产品 | verify:product | 9 | pass | 45 files / 247 tests；222 JS syntax pass |
| 真实视觉体感 | 桌面和窄屏实际阅读顺序正确 | 实际浏览器 | 截图/交互 | 7 | defer | Codex 浏览器控制不可用；用户浏览器刷新或控制工具恢复时复核 |

视觉 defer 记录：已确认 `http://127.0.0.1:4177/?refresh=task-hierarchy-v1` 返回 HTTP 200，并尝试通过 Codex `open_in_codex` 打开更新页；该工具只能排队/打开标签，不能读取页面、截图或注入真实键盘和指针。当前项目也未安装 Playwright。产品基本路径不依赖这项证据，因此工程交付可继续；当 Codex 浏览器控制恢复，或用户在当前已打开页面完成桌面/窄屏阅读检查时，重测本行。

## 不在本次范围

- 不接入或购买 OpenAI、MiniMax 或其他生成式 Provider。
- 不删除 AI 老照片修复和创意改造的代码或未来入口。
- 不改变 PhotoRoom 调用、隐私同意、抠图质量或下载逻辑。
- 不新增任务、模型、后台协议或自动图片处理。
