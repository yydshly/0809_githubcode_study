# M2 基础编辑器早期内部走查

状态：`materials-ready / sessions-not-started / participant-denominator=0/5–8`

这是一轮轻量的产品可用性观察，不是模型质量测试、形成性研究或正式 V1 验证。它只回答一个问题：第一次使用的人，能否看懂页面并独立完成一次基础编辑与下载。

## 0. 先做 2–3 人方法演练

正式进入本文件的 `5–8` 人固定分母前，先使用[内部体验走查台](web/internal-walkthrough.html)完成 2–3 人方法演练。演练增加第二个“隐私友好分享副本”任务，用于检查走查工具、主持规则和能力边界是否容易理解；它不进入本文件的 80% 通过算法，也不能与后续 M2 分母合并。

走查台、严格匿名记录格式和两档浏览器 QA 见 [INTERNAL_WALKTHROUGH_TOOL.md](INTERNAL_WALKTHROUGH_TOOL.md)。当前工具已就绪，但真实方法演练仍为 `0/2–3`，M2 正式分母仍为 `0/5–8`。

## 1. 固定任务

使用受控本地设备、当前提交和项目提供的原创演示图。参与者看到的任务原文为：

> 请使用页面提供的演示图，把图片整理成方形，顺时针旋转 90°，导出 PNG，并告诉主持人下载是否开始。你可以随时停止。

主持人不得在任务卡里写出控件名称、点击顺序或正确答案。任务从参与者读完任务卡、表示可以开始时计时，到其明确说“下载已开始”或 120 秒到时结束。

## 2. 开始前告知与同意

主持人逐字说明：

> 我们正在检查页面是否容易理解，不是在测试你。今天只记录匿名编号、完成时间、是否求助、遇到的页面问题和下载结果；不录音、不录像，不记录姓名、联系方式或敏感信息。请只使用我们提供的图片，不要上传你自己的照片。你可以随时停止，停止不会带来任何影响。你是否同意开始？

只有参与者明确同意才开始。拒绝或中途退出记为 `invalid-session`，不替换、不解释为产品失败，也不保存个人原因。

## 3. 主持规则

- 每位参与者只计一次；计划招募 5–8 名符合目标用户特征、未参与本页面设计的人。
- 使用 Chrome 或 Edge 桌面版；记录浏览器版本、视口、页面缩放和当前 Git commit。
- 使用项目原创或明确许可图片；不接收、上传或保存参与者自己的图片。
- 主持人保持安静，只在参与者主动求助时回应。每次提示都将 `help_count` 加一，并使该次不能算“不经指导完成”。
- 不允许替参与者点击、拖动或下载。设备、浏览器崩溃或演示图损坏导致的场次记为 `invalid-session`，并保留原因；不得选择性删除有效失败。
- 不录音、不录像、不截取参与者画面，不采集姓名、邮箱、电话或人口属性。

## 4. 必须观察的界面节点

主持人只观察，不讲解：

1. 是否能从任务选择进入本地编辑；
2. 是否能识别 1:1 构图与旋转 90°；
3. 是否理解完整预览、裁剪范围和最终结果的关系；
4. 是否能选择 PNG 并开始处理；
5. 是否能在结果页确认处理结果并触发下载；
6. 若失败，第一处问题属于 `input`、`navigation`、`crop`、`rotation`、`export`、`download`、`copy-understanding` 或 `system` 哪一类。

## 5. 每场最小记录

每场使用下面的匿名记录块。原始记录保存在受控工作记录中，不提交姓名、图片、录音、录像或可识别自由文本到仓库。

```text
session_id: M2-___
build_commit: ___
browser_and_version: ___
viewport_and_zoom: ___
started_at_utc: ___
completed_at_utc: ___
duration_seconds: ___
outcome: completed-unassisted | completed-assisted | incomplete | invalid-session
help_count: ___
first_failure_stage: none | input | navigation | crop | rotation | export | download | copy-understanding | system
download_observed: yes | no | not-applicable
keep_result_response: yes | no | unsure | not-asked
bounded_note: ___
```

`bounded_note` 只描述可复现的页面行为，例如“在结果页寻找 PNG 选项 18 秒”；不得记录参与者身份、外貌、职业单位或其图片内容。

## 6. 汇总与通过规则

- 分母必须是本轮全部有效 unique participants；同时报告 `invalid-session` 数量和原因类别。
- `completed-unassisted` 还必须满足 `duration_seconds <= 120`、`help_count = 0` 且 `download_observed = yes`。
- 至少 80% 的有效参与者满足上述条件才达到 M2 目标。对应最小人数为：5 人中 4 人、6 人中 5 人、7 人中 6 人、8 人中 7 人。
- 必须同时报告各 `first_failure_stage` 计数和所有求助点，不能只报告成功率。
- 当前真实分母是 `0/5–8`；材料就绪不等于走查完成。

无论结果如何，本轮都只产生基础编辑器的界面迭代或下一阶段 go / no-go 建议。它不授予 C1、U1、E1、R1、O1、G1、V1、Release Gate、模型质量结论或公开产品能力声明。

## 7. 执行后输出

完成 5–8 人后，只提交去标识化汇总：构建版本、有效/无效分母、四类 outcome、完成时间分布、失败阶段计数、求助点、下载结果、主要修改建议和是否进入下一阶段。若修改了主流程或任务文案，应明确原场次适用的 build；不得把不同 build 的成功率静默合并。

治理边界沿用 [USER_RESEARCH_PROTOCOL.md](USER_RESEARCH_PROTOCOL.md) 的“早期内部可用性走查”条款。
