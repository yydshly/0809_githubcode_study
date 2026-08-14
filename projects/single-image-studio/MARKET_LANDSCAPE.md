# 市场产品研究矩阵

> 本文件记录 Single Image Studio 的市场研究问题、比较口径与缺口。它不是功能宣传摘录，也不证明本项目拥有任何竞品能力。外部页面的来源、核对日期与复制边界以 [UPSTREAM.md](UPSTREAM.md) 为准，项目状态以 [STATUS.md](STATUS.md) 为准。

## 1. 研究目的

市场研究只回答三类决策问题：

1. 普通用户用一张图片时，市场已经形成了哪些稳定任务预期？
2. 同一任务在“自动完成、允许修正、失败拒绝、隐私、价格 / 时延和交付”上有哪些可比较合同？
3. 哪些需求应该由九类原子能力扩展，哪些只是场景包装，哪些应明确拒绝？

竞品数量、营销功能名和示例图好看程度不作为立项依据。只有官方可核对流程、可重复实测或明确条款才能进入比较结论。

## 2. 统一比较字段

每个产品 / 服务必须按同一份不可变 `MarketObservation` 记录：

```text
observation_id + observed_at + reviewer
product + official_url + surface(web|mobile|desktop|api)
target_user + primary_job
input_contract + eligibility + rejection_or_refund
steps_to_first_result + correction_controls
output_contract + download_formats + watermark_or_limits
local_or_remote + processors + retention_and_training_terms
price_basis + measured_attempts + measured_latency
mobile_capture_or_retake_guidance
failure_cases + evidence_uri + screenshot_rights
relevance_to_capabilities + product_decision + next_review_at
```

- `unknown` 必须保留为未知，不能从营销文案推断。
- 价格、时延、保留策略和功能会变化；影响路线决策前必须重核。
- 实测只使用项目自有、合成或明确授权图片；不得把真实用户图上传到未完成治理预检的服务。
- 页面截图、示例图和品牌资产默认不复制进仓库或公开材料。

## 3. 当前已固定入口

截至 2026-08-14，来源账本已固定以下官方入口，但尚未完成统一任务、统一输入和统一字段的横向实测。因此它们只能支持“待研究对象已登记”，不能支持质量、隐私、价格或优劣排名。

| 研究簇 | 已固定入口 | 主要待回答问题 | 当前状态 |
| --- | --- | --- | --- |
| 一键背景处理 | Adobe Express Background Remover、Photoroom Background Remover | 自动抠图后是否允许纠边；透明交付、失败与移动端流程如何定义 | `source-logged / comparison-pending` |
| 综合单图编辑器 | Canva AI Photo Editor、Picsart AI Photo Editor | 工具墙与少量任务推荐的取舍；局部编辑、增强和生成结果如何解释 | `source-logged / comparison-pending` |
| 场景化图片工具 | Photoroom、Pixelcut | 商品 / 社交等上层场景如何复用主体、背景、构图和交付能力 | `source-logged / comparison-pending` |
| 质量修复 | Topaz Image Web Models | 保真增强与生成式恢复如何分层；no-op、伪细节和下载合同如何处理 | `source-logged / comparison-pending` |

具体 URL 与核对边界不在本文件重复维护，统一见 [UPSTREAM.md](UPSTREAM.md)。

## 4. 尚缺的市场研究簇

下列方向当前没有足以形成产品结论的官方来源矩阵，必须先补来源再研究：

| 缺口 | 为什么重要 | 与本项目的关系 | 当前决定 |
| --- | --- | --- | --- |
| 报名头像 / 职业头像专用产品 | 可区分普通底色头像、职业形象生成和官方证件规则的承诺边界 | `scene.registration-portrait` 与未来身份保持研究 | `pending-source`；不提前上线场景 |
| 官方证件照片服务 | 需比较规则来源、重拍指导、禁止修改、受理声明和地区 / 渠道差异 | `scene.official-id-photo` | `pending-source`；继续 parked |
| 本地 / 端侧隐私优先工具 | 可验证用户是否愿以质量或等待换取“不上传” | CAP-02、CAP-04、CAP-06 与 G1 | `pending-source`；不假定本地优先 |
| 修复、放大与人脸恢复产品 | 需把自然增强、内容重建和身份风险分开 | CAP-06 后续效果 | `pending-source`；不并入自然增强 |
| API 型背景 / 编辑服务 | 需比较输入合同、Alpha、批量、时延、价格、保留和商用条款 | 候选执行器与 O1 / G1 | `pending-source`；未过 remote preflight 不上传 |
| 开源端到端单图应用 | 模型仓库不能代表真实上传、修正、QA、恢复和下载体验 | R1-product 与可替换实现 | `pending-source`；与模型候选账本分开 |
| 手机重拍指导 | 有些失败更适合指导重拍，而非事后生成或强修 | CAP-03 资格 / 拒绝与移动流程 | `pending-source`；作为拒绝 fallback 研究 |

## 5. 比较任务

市场实测不能让每个产品完成不同任务后再主观排名。首轮只使用以下冻结任务包：

1. 人物困难边缘透明主体；
2. 普通物件 / 商品透明主体与纯色换底；
3. 已经足够好的图片 no-op；
4. 曝光 / 白平衡 / 压缩退化的自然增强；
5. 一个局部消除任务；
6. 一个来源关系明确的创意改造任务；
7. 一张应被拒绝或建议重拍的输入。

每个产品只计其公开支持且输入合同允许的任务。正确拒绝与透明说明是结果，不按“功能缺失”惩罚；未公开支持的任务不得通过隐藏入口或 Prompt 绕过。

## 6. 产品决策门

市场研究只产生三种决定：

- `adopt-expectation`：把已经形成的用户预期写入效果合同，但仍由本项目独立实现和取证；
- `benchmark-only`：仅作为质量 / 流程基准，不进入实现依赖；
- `reject-or-park`：因权利、隐私、成本、硬件、失败边界或产品方向不合适而拒绝或后置。

任何市场结论都不能授予 C1、U1、E1、R1、O1、G1、V1 或 Release Gate。市场实测不可取得时，应在预注册中记录缺席原因和替代比较臂，不能在看到本项目结果后临时删除较强基准。

## 7. 下一次交付

下一轮市场研究的完成标志不是“又收集一批链接”，而是：

- 每个优先研究簇至少有一个官方来源和一条完整 `MarketObservation`；
- 使用相同授权输入完成可比任务，保留成功、拒绝、失败、价格和实测时延；
- 数据条款、保留 / 删除和本地 / 远程边界可核对；
- 输出一份“用户预期 → CAP 域 / effect / scene → 采纳、基准或后置”的决策表；
- 结论写回 [PRODUCT.md](PRODUCT.md)、[CAPABILITY_REGISTRY.md](CAPABILITY_REGISTRY.md) 或 [TASK_CATALOG.md](TASK_CATALOG.md)，而不是直接写进页面。
