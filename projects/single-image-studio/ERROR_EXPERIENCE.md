# 错误与恢复体验合同

> 生效日期：2026-08-18
>
> 阶段：`PRODUCT_STABILIZATION_ROADMAP.md` · S3 第一批

## 1. 设计契约

| 字段 | 约定 |
| --- | --- |
| Entry mode | revision-led；统一现有错误页，不改变任务和 Provider 协议 |
| Target user and context | 图片处理失败后需要判断数据状态和下一步的普通用户 |
| Desired first impression | 失败是可理解、可恢复的；系统没有隐藏上传、计费或重复提交风险 |
| Visual ambition | Functional；沿用当前产品视觉，不制作新的警告风格体系 |
| Experience architecture | Editorial Flow |
| Visual constraints | 标题与主恢复动作优先；事实卡次级；技术信息默认折叠；窄屏不横向溢出 |
| Information constraints | 固定回答发生了什么、图片状态、安全重试、下一步、任务编号；不直接显示供应商原始响应 |
| Operation constraints | 不改变状态机、自动重试、Provider、计费、删除、上传或下载合同 |
| State constraints | UNKNOWN 永不自动重试；明确远程失败可回本地；本地失败不得声称图片已上传 |
| Environment constraints | 主产品错误页、设置页原位错误、browser diagnostics；桌面与窄屏 |
| Primary journey | 失败 → 读懂图片 / 任务状态 → 选择唯一主恢复动作 → 原图和旧下载状态保持正确 |
| Required artifacts | strict error facts、DOM、CSS、映射测试、浏览器诊断、产品回归 |
| Autonomy authorization | 用户已明确按路线继续；本轮只做可逆错误体验收敛 |
| User-decision boundary | 新重试策略、供应商补偿、退款、持久任务或通知机制需要另行决定 |
| Observable completion criteria | 七类错误均有稳定事实；UNKNOWN 与明确失败不混淆；任务编号可见；技术信息折叠；恢复焦点正确 |

## 2. 七类错误

| Context | 图片与任务事实 | 默认恢复 |
| --- | --- | --- |
| `input` | 文件未进入任务，也没有远程发送 | 重新选择图片 |
| `settings` | 设置未通过，本地 / 远程任务均未开始 | 聚焦并修改字段 |
| `local-processing` | 图片只在当前浏览器处理，原图保留 | 调整设置后再试 |
| `output-validation` | 结果未获得下载资格，原图保留 | 返回设置或重新生成 |
| `remote-failed` | 可能已按本次同意发送；终态明确失败 | 优先本地兜底或重新确认后再试 |
| `remote-unknown` | 可能已发送且终态未知 | 查询原任务，禁止自动重试 |
| `network-unavailable` | 无法确认服务状态；本地能力仍可用 | 使用本地工具或稍后检查服务 |

## 3. Coverage record

| 用户阶段 | 要求 | Surface / state | Evidence | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 错误体验 | strict error facts | 七种 context | unit + adversarial tests | Stage 0 / 6 | pass | 七类均有 closed facts 与稳定技术分类 |
| 错误体验 | 主错误页 | title / facts / run / details / actions | DOM contract | Stage 3–6 | pass | 图片状态、安全重试、下一步、run 与折叠技术信息已接入 |
| 错误体验 | UNKNOWN | 查询原任务、禁止自动重试 | state + browser diagnostics | Stage 5–6 | pass | 查询为主动作；文案明确重复提交 / 计费风险 |
| 错误体验 | 明确远程失败 | 本地兜底与重新确认 | state + browser diagnostics | Stage 5–6 | pass | 抠图失败本地编辑为主；重新确认后才重试 |
| 错误体验 | 本地 / 输入失败 | 不声称上传 | unit + DOM | Stage 6 | pass | 输入与本地 context 明确图片未发送 |
| 错误体验 | 工程闭合 | 产品测试与浏览器 | verify + diagnostics | Stage 9 | pass | 347 / 347；错误 2 / 2；产品流程 5 / 5 |

## 4. 非目标

- 不自动重试远程调用；
- 不承诺供应商退款、删除或计费状态；
- 不增加用户账号、通知或跨刷新持久任务；
- 不把技术错误码作为用户主标题；
- 不在本批次改变表单结构或任务流程。

## 5. 第一批实施结果

- 主错误页新增三项固定事实：图片状态、安全重试、下一步；存在 run 时显示任务编号；
- 技术错误码和任务 ID 放入默认折叠的“查看技术信息”，不抢占普通语言说明；
- `errorPagePresentation()` 对七类 context 生成 immutable facts；供应商原始错误不会替代受控友好文案；
- 输入错误明确未发送；本地错误明确只在浏览器；Provider 未配置明确发送前停止；远程明确失败保守说明可能已发送；UNKNOWN 明确先查询原任务；
- 原有 `recoveryPresentation()` 继续控制按钮主次和焦点，没有改变状态机或重试策略；
- [错误状态参考页](web/error-reference.html)用同一组件渲染七类状态，不发起真实失败或远程调用；
- 浏览器 run `0b0a0908-1716-4543-8fd6-8901234567bc`：1180 px / 390 px 两项 2 / 2，通过七类 facts、技术折叠、恢复动作与无横向溢出；
- 产品成功路径 run `1c1b1a19-2827-4654-8ae7-9012345678cd`：原五条流程 5 / 5；
- 完整产品验证 347 / 347，270 个 JavaScript 文件语法通过。

S3 尚未完成。第二批需要把设置页原位错误也接入同一 facts 来源，并把下载 / 输出校验失败从短暂 toast 升级为可恢复、可核对的明确状态；网络不可用的任务目录说明也需与错误事实统一。

## 6. 第二批实施与 S3 退出决定

- 设置页原位错误现在复用 `settings` facts，补充“任务未开始、图片未发送、下一步”，并按错误语义聚焦比例、最长边、文件上限、四角、质量、颜色或格式字段；
- 表单控件使用 `aria-invalid` 与 `aria-errormessage` 绑定当前错误，设置恢复后自动清理；
- 主下载、单项输出和 ZIP 下载中的合同、文件读取、hash / length 与生成失败均进入 `output-validation` 错误状态，不再只显示短暂 toast；
- 本地输出失败的主动作是“返回设置”；抠图 / 组合结果输出失败保留昂贵远程结果，主动作是“返回结果”；
- 同时无法查询两个远程服务状态时，顶栏显示“远程状态暂不可确认 · 本地工具仍可用”，明确不会自动提交图片；
- 浏览器 error run `2d2c2b2a-3938-4765-8bf8-0123456789de` 在 1180 / 390 px 以 2 / 2 通过；产品成功 run `3e3d3c3b-4a49-4876-9ca9-1234567890ef` 以 5 / 5 通过；
- 完整产品验证 348 / 348，270 个 JavaScript 文件语法通过。

S3 当前判定为 **practical-complete**。七类事实、主错误页、表单、下载、网络提示和恢复动作均已有单一来源与自动检查；下一阶段进入 S4 场景工作流扩展。真实退款、供应商删除、跨刷新通知和账号级问题仍属于未来运维 / 治理范围，不在当前错误 UI 中虚构。
