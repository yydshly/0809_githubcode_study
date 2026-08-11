# Skill Zine Summary 技术研究

> 把一个艺术杂志 Skill 样图目录，整理为可复现、可比较、许可边界清楚的 Codex 视觉技能技术储备地图。

## 研究导航

- [研究总索引](RESEARCH-INDEX.md)：统一关联 Web 入口、13 个 Skill 页面、研究文档、证据等级与推荐阅读路径；
- [完整公开研究站](https://skill-zine-private-lab.yydshly.chatgpt.site/)：13 个 Skill 详情、统一横评、多原图实验、选型器、报告与完整本地研究效果；
- [本地 Web 研究入口 `/research`](http://localhost:4317/research)：从浏览器进入 Skill 选择器、单 Skill、统一原图横评、多原图实验室和 Revision 7 报告；
- [13 个 Skill 直接目录 `/skills`](http://localhost:4317/skills)：直接查看全部独立研究页，不需要从首页长页面向下寻找；
- [公开新人学习入口](https://yydshly.github.io/0809_githubcode_study/start/)：不加载样例图库，先理解 13 个 Skill 的路线、输入、失败与证据边界；
- [Skill 选择器 `/choose`](http://localhost:4317/choose)：从用途、真实性、技术路径和产品化形态反选 13 个 Skill，再直达对应 SOURCE → EFFECT 证据；
- [多原图实验室 `/labs/multi-source`](http://localhost:4317/labs/multi-source)：按 Skill 汇集现有完整 SOURCE → EFFECT 证据，理解换题材后的能力、场景与边界；
- [Revision 10 独立原图扩样](lab/web/REVISION10-INDEPENDENT-SOURCES.md)：记录第一轮 13 个独立 SOURCE、效果与边界；
- [Revision 11 反向题材与产品预演](lab/web/REVISION11-STRESS-AND-APPLICATIONS.md)：记录第二轮 13 个相反角度、产品载体和生产下一步；
- [Revision 12 完整产品系统](lab/web/REVISION12-PRODUCT-SYSTEMS.md)：记录第三轮 13 个新题材、完整产品表面、使用环境和生产路径；
- [Revision 13 Skill 选型](lab/web/REVISION13-SKILL-CHOOSER.md)：说明 `/choose` 如何从任务约束路由到现有证据，以及为什么它不是质量排名。

## 项目卡

| 字段 | 内容 |
| --- | --- |
| 状态 | 研究中 |
| 研究主题 | 照片语义蒸馏、编辑设计、Skill 编排、确定性拼版与视觉 QA |
| 技术栈 | Codex Skills、ImageGen、Python/Pillow、HTML/CSS/SVG、Headless Chrome |
| 主上游 | [tluy/skill-zine-summary](https://github.com/tluy/skill-zine-summary) |
| 固定版本 | [`2c65c251bc6909f077ae9974e3251d164a07c924`](https://github.com/tluy/skill-zine-summary/commit/2c65c251bc6909f077ae9974e3251d164a07c924) |
| 独立仓库 | 暂无 |
| 在线演示 | [完整公开研究站](https://skill-zine-private-lab.yydshly.chatgpt.site/) · [GitHub Pages 轻量新人入口](https://yydshly.github.io/0809_githubcode_study/) |
| 最后核对 | 2026-08-11 |
| 上游许可 | 汇总库未声明；12 个目标仓库逐项记录在 [UPSTREAM.md](UPSTREAM.md) |

## 先给结论

1. `skill-zine-summary` 本身不是可运行项目，而是 `README.md + 42 张样图` 组成的视觉目录；它没有代码、安装流程、评测方法或许可证。
2. README 有 14 个展示条目，但实际只指向 12 个唯一仓库。`gathered-scenes-zine-skill` 及其两个历史 Skill 名被分别列出三次。
3. 42 张图使用不同输入和创作语境，不能据此比较“哪个库效果最好”。有意义的横评必须使用同源照片、相同轮次预算和明确的输出契约。
4. 真正值得储备的不是 12 套风格提示词，而是六层通用能力：输入契约、照片事实提取、关系/标记中间表示、渲染后端、确定性合成、fail-closed 验证。
5. 这批项目覆盖三条实现路线：
   - 纯 Skill / Prompt Compiler + 图像生成；
   - 图像生成负责抽象面板，脚本负责原图、文字、拼版和验收；
   - HTML/CSS/SVG + 浏览器渲染，完全不用图像生成模型。
6. 按 12 个仓库的当前快照统计：5 个 MIT、2 个自定义限制许可、5 个子库及汇总库没有正式许可证；`gathered-scenes` 另有较早的 MIT 历史快照。公开可读不等于可以复制、修改或再发布。

## 技术路线概览

| 路线 | 代表项目 | 最值得学习的能力 |
| --- | --- | --- |
| Prompt / ImageGen | `gc-minimal-zine-poster`、`daily-photo-playground`、`dyy_photo_deconstruct`、`pixel-style-poster-skill` | 触发边界、视觉语法、变体轴、negative constraints、定向重试 |
| 照片处理/真实性策略 | `photo-revival`、`photo-relic-editorial`、`photo-abstract-editorial`、`photo-to-zine-postcard` | 全量重绘、保真拼版、抽象面板与印刷产品之间的角色选择 |
| Hybrid + validation | `travel-photo-abstraction`、`poetic-line-zine-poster` | 隔离随机生成、确定性排版与像素保真；区分自动交付门禁和人工评分 |
| Code-native | `photo-distill` | HTML/CSS/SVG 图形语法、浏览器渲染、可测版式指标与原创 QA |
| 双路径历史案例 | `gathered-scenes-zine-skill` | 并列比较“保留现场”与“蒸馏现场”的两套分析卡和输出契约；当前实现已从 `main` 删除 |

完整关系见 [技术架构图](TECHNICAL-MAP.md)。

## 研究价值优先级

这里的 P0/P1/P2 表示“新增技术储备的边际价值”，不是作品质量排名，也不等于实际执行顺序。

### P0：工程架构基线

- `photo-distill`：唯一 code-native 路线，最适合沉淀可复现渲染和量化 QA；因无正式许可证，只做独立原创实验，不声称是严格 clean-room。
- `poetic-line-zine-poster`：最完整的“模型生成面板 + 脚本拼版/排字/验证”结构；因无正式许可证，只读研究架构。
- `travel-photo-abstraction`：来源角色锁定、结构参考选择和 `DELIVERY PASS` 式 fail-closed 很成熟；自定义许可只允许原样使用。

### P1：可迁移的视觉编译规则

- `daily-photo-playground`：四层高饱和版式、照片小窗、几何色块和量化留白。
- `dyy_photo_deconstruct`：剪影与“最少必要记号”的抽象词典。
- `gc-minimal-zine-poster`：通用内容到视觉隐喻的 Prompt Compiler。
- `pixel-style-poster-skill`：点阵/半调材料语言与失败类型路由。
- `photo-to-zine-postcard`：从单张艺术图扩展为可打印正反面产品系统。

### P2：历史、基线与重叠路线

- `gathered-scenes-zine-skill`：双路径方法很有价值，但当前实现已删除；历史 MIT 与个人非商业快照必须按 commit 分开研究。
- `photo-revival`：规则薄、易运行，适合作为全量重绘的最小基线。
- `photo-relic-editorial`：系列化“真实照片 + 记忆版画”产品语言，工程保障较弱。
- `photo-abstract-editorial`：来源约束清楚，但与 P0 的原照 + 面板路线重叠最大。

实际执行先从许可清楚的 MIT 项目建立安全基线，再进入 P0 架构研究，详见 [学习路线](LEARNING-ROADMAP.md)。

全部 12 个上游的本地固定版本、原始能力样例画廊和运行流程位于 [研究实验室](lab/README.md)。

13 个 Skill 的独立能力页面位于 [本地 Web 研究站](lab/web/README.md)：每页包含上游 Demo 证据、能力与场景说明、至少五项本地效果、每项效果对应的真实使用场景与完整交付展示、技术路径、边界和下一轮扩展方向。Revision 6 为每页提供 2 个完整产品应用，共 26 个场景，把效果继续放进产品版面、现实环境数字预演和四步落地流程。

Revision 7 复用 7 张项目内合成来源，为除 Photo Distill 外的 12 个 Skill 各增加 2 个能力问题，共形成 24 组实验、24 张新效果、24 张网页研究卡和 24 个轻量 HTML/CSS 产品语境预演。Photo Distill 的 3 组跨题材探索来自 Revision 6，不计入本轮 24 组；两部分合计为全站 27 组跨题材探索。Revision 10、11、12 随后分别给全部 13 个 Skill 各补一张不复用的新 SOURCE 与对应 EFFECT；第三轮进一步为同一 EFFECT 建立多表面产品系统、使用环境与四步生产路径。当前全站为 129 张完整静态效果和 2 个实时效果实验；见 [Revision 10](lab/web/REVISION10-INDEPENDENT-SOURCES.md)、[Revision 11](lab/web/REVISION11-STRESS-AND-APPLICATIONS.md) 与 [Revision 12](lab/web/REVISION12-PRODUCT-SYSTEMS.md)。

Revision 13 不再机械增加图片，而是建立 `/choose`，把现有 13 个 Skill 按用途、真实性、技术路径和产品化形态组织为任务选型入口。它不新增 SOURCE、EFFECT、产品系统或效果证据，**127 组图片配对／57 个来源路径／129 个静态效果／131 个总效果证据／13 个 R12 产品系统**的口径保持不变；选择结果也不是作品质量排名。Revision 7 报告继续完整保留，但主导航把入口位置交给 `/choose`，R7 仍可从研究总索引、单 Skill 页和文档地图进入。

## 研究文档

- [RESEARCH-INDEX.md](RESEARCH-INDEX.md)：Web 入口、13 个 Skill、全部研究文档、证据等级与推荐阅读路径的总索引；
- [UPSTREAM.md](UPSTREAM.md)：主上游快照、12 个目标仓库许可与使用边界；
- [INVENTORY.md](INVENTORY.md)：原始 14 条到 12 个真实仓库的映射和逐库技术卡；
- [TECHNICAL-MAP.md](TECHNICAL-MAP.md)：统一技术分层、中间表示、后端选择和 QA 指标；
- [LEARNING-ROADMAP.md](LEARNING-ROADMAP.md)：分阶段最小实验、产出和验收标准；
- [RESEARCH.md](RESEARCH.md)：研究问题、证据、决定、开放问题与后续实验日志；
- [lab/README.md](lab/README.md)：12 个上游的本地固定检出、原始样例画廊、运行手册与实验记录模板。
- [lab/web/REVISION7-RESEARCH.md](lab/web/REVISION7-RESEARCH.md)：Revision 7 的准确数量口径、逐 Skill 研究说明、跨路线结论和真实性边界；
- [lab/web/REVISION7-ASSETS.md](lab/web/REVISION7-ASSETS.md)：7 张来源的复用关系、24 张效果路径、提示摘要与 SHA-256。
- [lab/web/REVISION10-INDEPENDENT-SOURCES.md](lab/web/REVISION10-INDEPENDENT-SOURCES.md)：第一轮 13 个独立输入、效果、用途和生产边界；
- [lab/web/REVISION11-STRESS-AND-APPLICATIONS.md](lab/web/REVISION11-STRESS-AND-APPLICATIONS.md)：第二轮 13 个反向题材、产品数字预演和真实生产下一步。
- [lab/web/REVISION12-PRODUCT-SYSTEMS.md](lab/web/REVISION12-PRODUCT-SYSTEMS.md)：第三轮 13 个新题材、完整产品系统、使用环境、输出规格与诚实边界。
- [lab/web/REVISION13-SKILL-CHOOSER.md](lab/web/REVISION13-SKILL-CHOOSER.md)：从任务反选 13 个 Skill 的四维契约、R12 证据映射与不可排名边界。

## 当前进度

- [x] 固定主上游、12 个目标仓库的当前 commit，以及 `gathered-scenes` 的历史方法/许可快照；
- [x] 完成 14 个展示条目到 12 个真实仓库的去重；
- [x] 核对许可证、主要文件树和渲染后端；
- [x] 发现并记录 `gathered-scenes-zine-skill` 当前安装说明失效；
- [x] 建立技术分层、优先级与分阶段学习路线；
- [x] 建立研究实验室并验证 12/12 个上游固定检出；
- [x] 建立固定提交上的原始样例能力画廊；
- [ ] 补录你此前已经研究过的子库及已有产出；
- [x] 建立同一张合成照片驱动的 13 Skill 视觉对照集；
- [x] 建立 13 个独立 Skill 页面和统一原图横评页；
- [x] 为全部本地效果补齐受众、任务、交付物、适配原因、边界和扩展方向；
- [x] 完成第一轮视觉能力基线实验；
- [x] 完成 Revision 7 的 24 组跨题材实验，并沉淀人类可读研究报告与资产账本；
- [x] 完成 Revision 10–12 的三轮全 Skill 独立扩样，并把最新 13 组效果推进为完整产品系统数字预演；
- [x] 建立 Revision 13 `/choose` 任务选型入口，并关联全部 13 个 Skill 的现有证据；
- [ ] 沉淀自己的中间表示和原创 validator。

## 与此前研究衔接

你提到已经研究过其中一些库，但当前总仓库还没有足够信息判断具体是哪几个。为避免臆测，[INVENTORY.md](INVENTORY.md) 的“既往研究”字段暂统一标为“待补录”。后续每个已研究项目建议补充：

- 当时固定的 commit 或日期；
- 做过的实验、输入和输出；
- 已验证的结论与失败案例；
- 可复用代码/文档所在位置；
- 是否需要升级到当前版本复测。

## 安全与研究边界

- 首轮实验只使用合成图或自己拥有权利的照片，不使用人脸、证件、住址或位置敏感素材。
- 默认移除 EXIF/GPS；`photo-distill` 会把部分照片元数据写进作品，执行前必须显式审查。
- Skill 等同于可调用工具和脚本的高权限指令。安装前逐行审查 `SKILL.md`、脚本、依赖和输出路径。
- 不把第三方仓库、图片、提示词或脚本 vendor 到本项目；需要运行时使用固定 commit 的独立临时检出。
- 无正式许可证或限制性许可证的项目，只做事实性分析、原样许可范围内运行或独立原创实验；严格 clean-room 需要分析者/实现者隔离。
