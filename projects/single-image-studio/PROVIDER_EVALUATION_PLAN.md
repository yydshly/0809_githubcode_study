# Background Removal Provider Evaluation Plan v0

> 状态：**定义已冻结；完成 1 次非计费沙盒协议探针，正式候选比较尚未开始**。核对日期：2026-08-16。本文不授权注册付费套餐、上传真实用户图片或把沙盒结果解释为正式质量结论；密钥只存在于 Git 忽略的本地 `.env`。

## 1. 决策目标

为 `BackgroundRemovalProvider` 选择一个可替换的首个云端实现。首轮只评价“上传一张许可明确的图片，返回同画布透明结果”这一能力，不评价生成背景、阴影、扩图、美化或其他供应商增值功能。

候选只有两项：

| 顺序 | 候选与冻结端点 | 当前公开事实 | 本轮状态 |
| --- | --- | --- | --- |
| 1 | Photoroom Remove Background API Basic；`POST https://sdk.photoroom.com/v1/segment` | 官方 reference 支持 multipart 图片、`format=png`、`channels=rgba|alpha`；Basic 公开价为每成功图片 0.02 美元。官方安全页称 API 图片每次调用后丢弃，未经同意不用于训练，并列出 API 范围 SOC 2 Type 2、DPA 与子处理方清单 | 首选评估；地域、self-serve 训练 opt-out 的可验证状态、精确 DPA/子处理方版本和删除证明仍待账户侧核对 |
| 2 | remove.bg API 1.0；`POST https://api.remove.bg/v1.0/removebg` | 官方 API 支持直接文件、透明 PNG（最高 10 MP）和 50 MP 的 WebP/ZIP；安全白皮书称图片处理后通常 60 分钟内丢弃，并声明 90 天后不可恢复 | 对照候选；精确价格、处理地域、90 天边界的对象类别、DPA/子处理方和删除证明仍待账户侧核对 |

Clipdrop/Jasper、BRIA 及其他服务本轮不进入分母：当前尚未取得同时覆盖精确抠图端点、公开价格、输入保留、训练用途、地域和删除边界的完整官方记录。后续若加入，必须新建计划版本，不能在看到本轮结果后补候选。

## 2. 外部资料 pins

- Photoroom [Basic quickstart](https://docs.photoroom.com/remove-background-api-basic-plan/quickstart-guide)、[OpenAPI reference](https://docs.photoroom.com/api-reference-openapi)、[格式与尺寸](https://docs.photoroom.com/remove-background-api-basic-plan/which-image-sizes-and-formats-are-supported)、[价格](https://docs.photoroom.com/remove-background-api-basic-plan/pricing)、[安全与隐私](https://www.photoroom.com/platform/security)。
- remove.bg [API 文档](https://www.remove.bg/api)、[安全白皮书](https://a.storyblok.com/f/67418/x/4f164e6009/rbg-security-whitepaper-with-cta.pdf)。

网页会变化；真实调用前必须重新记录核对时间、页面内容 hash 或可归档版本、账户所见条款/DPA/子处理方/地域，并在 [UPSTREAM.md](UPSTREAM.md) 更新。页面营销声明不能替代签署条款或技术删除验证。

## 3. 硬门

以下任一项未知或不满足，候选为 `no-go`，质量分不能抵消：

1. 只允许服务端代理；密钥不得进入浏览器、仓库、普通日志或返回体。
2. 只发送当前几何编辑后、剥离非必要 metadata 的 provider input bytes；不发送文件路径、原文件名、EXIF/GPS、账户资料或远程 URL。
3. 必须明确处理地域、子处理方、输入/输出保留期、训练/人工审核用途、删除方式和条款版本。
4. 本轮只用项目原创或许可明确、非用户、非敏感图片；真人、证件、儿童、医疗和参与者照片禁止。
5. 响应必须是可独立解析的 8-bit RGBA PNG，画布尺寸与 provider input 完全一致；不接受只返回 URL、不透明 JPEG、动画或未绑定来源的结果。
6. `UNKNOWN`、超时或断线不得自动重复计费；只有供应商明确证明请求未受理时，才允许用户显式新建 run。
7. 不得把供应商抠图结果直接解锁下载；必须经过项目的 bytes/hash/尺寸/Alpha/来源/revision QA，并保留失败结果。

## 4. 冻结样本与分母

正式比较前先登记 12 个 source unit，每个候选每图只调用一次，共最多 24 次：

- 4 个项目原创 synthetic Alpha fixture：硬边、孔洞、连续半透明、细小结构；有像素级 gold。
- 8 个项目原创或明确许可的非用户图片：人物 2、商品 2、动物/毛发 2、一般物体 2；覆盖简单/复杂背景、孔洞和细边。

不能使用某候选输出作为另一个候选的 gold，不能只保留成功案例，也不能在结果后更换输入、裁剪或参数。首轮固定参数为透明 PNG、保持原画布、不裁紧、不铺底、不开 despill/beautify/shadow。

## 5. 通过阈值

候选必须同时满足：

- 协议：12/12 都形成明确终态；0 个来源错绑、尺寸漂移、非法 PNG、错误 MIME 或迟到结果覆盖。
- Synthetic：4/4 输出有效；Alpha MAE ≤ 0.03，boundary MAE ≤ 0.08，孔洞灾难性填充为 0。
- 许可图片：8/8 可审阅；灾难性主体误删为 0；至少 6/8 无需大范围手工重画即可进入 M4 修正。
- 稳定性：p95 端到端时间 ≤ 15 秒；失败/超时率 ≤ 5%；所有响应均能从实际 header/receipt 计算一次调用是否可能计费。
- 隐私：硬门全部有可引用记录；删除/丢弃边界与产品告知一致。

若两项都通过，优先选择隐私边界更清楚、输出改色更少、修正负担更低者；成本只在质量和隐私合格后比较。若都不通过，M4 保持手动编辑，不自动切到本地模型。

## 6. 预算与授权

- 当前授权费用：0 美元；不得自动注册、订阅或购买 credits。
- 可使用供应商明确提供的免费测试额度，但仍须由用户自行提供账户和服务端密钥；密钥不进入 Git。
- 如免费额度不足，必须先报告已用次数、预计剩余调用和价格，再由用户单独批准；本计划建议的付费硬上限为 5 美元。
- 不做并发压力测试，不做自动重试，不使用真实用户照片。

## 7. 结果与退出

输出一份候选决策记录，逐 source 保存请求合同、供应商 request/usage 标识、时间、HTTP/错误语义、输出 hash/尺寸、技术 QA、Alpha 指标、人工分层结果、可能费用和删除/丢弃状态；图片正文只保存在项目批准的短期评估目录，不进入日志或文档。

选中的 adapter 仍须作为新提交实现，并通过现有 fake suite 加供应商协议 fixture；然后才进入 M4 的透明预览、修正和换底。评估通过不等于产品已经支持抠图，不授予 C1/U1/G1 或公开发布资格。

## 8. 沙盒协议探针观察（不进入正式分母）

2026-08-16T15:49:25.560Z，经用户本地配置并显式启用 `sandbox_` Key 后，项目使用原创 `matte-soft-edge-001/source.png` 做了 1 次 PhotoRoom Basic 沙盒调用。来源 SHA-256 为 `07a908d0d4143dbbcdf86e5dd001eeb4e03ea31f0fb40c7c7598ae50cf0ba80b`，本地 run ID 为 `f6417df3-76c8-415c-89e1-3be72e0e6856`。服务返回 `160×120`、30,048 bytes 的 RGBA PNG，输出 SHA-256 为 `56d2068901d37a1c0a7cb795d9d2d02809d362a5f244bbb70bf34ea5b0d86e30`；19,200 个像素中透明 11,440、部分透明 2,503、不透明 5,257。结果只在内存 run store 中短暂存在，重启后已清除，未写入仓库。

该调用只证明服务端代理、沙盒鉴权、PNG/Alpha 结构与本地 run 绑定可以闭合。供应商没有返回可独立核对的 request header，项目只能记录 `client-run:` fallback；沙盒图带水印，也没有执行人工边缘质量判断，因此不能进入 12-source 正式分母、成本判断或产品质量声明。此前一次错误毫秒格式的同意时间在本地解析阶段被拒绝，未外发、未消耗调用。
