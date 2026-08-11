# Zine Skill 研究实验室

这个目录用于获取、检查和对照 `skill-zine-summary` 指向的全部 12 个仓库。目标是先忠实理解各库原有能力，再用同源输入做受控实验，而不是把第三方项目合并成一个新框架。

## 研究导航

- [研究总索引](../RESEARCH-INDEX.md)：说明 12 个仓库与 13 个 Skill 的关系，并关联全部研究文档与 Web 路由；
- [本地 Web 研究入口 `/research`](http://localhost:4317/research)：从研究地图进入各个可视页面；
- [Skill 选择器 `/choose`](http://localhost:4317/choose)：从任务用途、真实性、技术路径和产品化形态反选 Skill，并进入对应证据；
- [多原图实验室 `/labs/multi-source`](http://localhost:4317/labs/multi-source)：按 Skill 查看现有多原图 SOURCE → EFFECT 证据和适用场景；
- [Revision 10 独立原图扩样](web/REVISION10-INDEPENDENT-SOURCES.md)：查看第一轮 13 个独立输入、对应效果与限制；
- [Revision 11 反向题材与产品预演](web/REVISION11-STRESS-AND-APPLICATIONS.md)：查看第二轮 13 个相反角度及其产品语境；
- [Revision 12 完整产品系统](web/REVISION12-PRODUCT-SYSTEMS.md)：查看第三轮 13 个新题材、完整产品表面、使用环境与生产步骤；
- [Revision 13 Skill 选型](web/REVISION13-SKILL-CHOOSER.md)：查看 `/choose` 的四维选择契约、证据关联和不可排名边界。

## 目录结构

```text
lab/
├── README.md
├── SOURCES.lock.json          # 当前版本、研究版本和许可/执行策略
├── ORIGINAL-SAMPLES.md        # 固定提交上的原始能力样例
├── RUNBOOK.md                 # 获取、检查、运行和记录流程
├── scripts/
│   ├── sync-sources.ps1       # 获取并检出固定 commit
│   ├── verify-sources.ps1     # 验证 URL、HEAD、工作树与数量
│   └── verify-gallery.ps1     # 验证画廊 commit 与本地样例路径
├── records/
│   ├── README.md
│   └── experiment-template.yaml
├── web/                       # 任务选型 + 13 个独立 Skill 页面 + 横评／实验／报告的本地研究站
├── sources/                   # 本地上游检出；被 .gitignore 忽略
└── outputs/                   # 本地生成结果；默认忽略
```

## 获取全部上游

在 `projects/skill-zine-summary/lab/` 目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-sources.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\verify-sources.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\verify-gallery.ps1
```

同步脚本不会追踪浮动的 `main`：每个仓库都检出 [SOURCES.lock.json](SOURCES.lock.json) 中的 `researchCommit`。对于 `gathered-scenes-zine-skill`，研究版本固定为仍包含两份 Skill 且快照许可证为 MIT 的历史提交；同时保留当前 HEAD，用于说明其 `main` 已删除实现。

## 如何理解“原有能力”

分三层观察：

1. **原始证据**：查看固定提交里的 README、Skill、脚本和上游样例；
2. **能力契约**：记录输入、输出、是否保留原照、随机/确定性边界及验证方式；
3. **受控复测**：后续使用自有或合成图片，在原生画幅与固定生成预算下运行许可允许的项目。

[ORIGINAL-SAMPLES.md](ORIGINAL-SAMPLES.md) 展示或链接固定提交中的原始样例。不同项目使用不同输入，因此这些样例只证明“它能做什么”，不能用于判断“哪个效果最好”。

## 多页面 Web 研究站

[web/](web/) 把 13 个 Skill（12 个仓库，其中 gathered 历史快照含两份 Skill）拆成 13 个独立研究页面。每页先解释能力与场景，再展示固定提交的上游 Demo、同源横评和页面专属受控实验；当前每页至少有 5 项本地效果，并为每项补齐真实使用情境、受众、任务、完整交付物、适配原因、边界与扩展方向。研究图保持完整画幅，并可进入全屏沉浸查看。

每个 Skill 页面还提供 2 个 Revision 6 量身选择的完整产品应用，共 26 个场景。页面会把完整效果继续组装为编辑出版物、海报、移动端、展览、数字界面、包装、教育材料或档案产品，再用独立的环境构图预演它如何被观看和使用，并说明从效果保留、版式适配、生产准备到实际应用的四步处理方式。

Revision 7 另复用 7 张项目内合成来源，为除 Photo Distill 外的 12 个 Skill 各增加 2 个能力问题，共形成 24 组实验、24 张新效果、24 张网页研究卡和 24 个轻量 HTML/CSS 产品语境预演。`photo-distill` 的人物、复杂城市和四季系列 3 组来自 Revision 6，不计入这 24 组；两部分合计为全站 27 组跨题材探索。这里的轻量预演复用同一张效果图，不是额外图片，也不是实体成品、客户项目或现场部署；24 张效果是本地生成的概念性研究，不是上游 Skill 原生运行输出。完整解释见 [Revision 7 跨题材能力研究报告](web/REVISION7-RESEARCH.md)，资产账本见 [Revision 7 资产记录](web/REVISION7-ASSETS.md)。

站内另保留“一张原图 / 13 个 Skill”的统一横评页。Revision 12 完成后，全站共有 129 张完整静态效果图和 2 个 Photo Distill 实时实验，即 131 项本地效果证据。Revision 10、11、12 分别为 13 个 Skill 各增加 1 张不复用 SOURCE；第三轮还为每个新效果建立至少三种产品表面、一个使用环境和四步生产路径，但这些预演复用同一 EFFECT，不重复计数，也不冒充实体成品。

多原图实验室从上述证据中抽取 127 组真实存在的图片 SOURCE → 图片 EFFECT 配对，并按 13 个 Skill 分页展开。三轮独立扩样让全局来源路径由 18 增至 57；页面同时给出配对数、来源路径数、实验批次、能力问题、适用场景和不能证明的事项。Revision 12 的 13 个完整产品系统只复用对应 EFFECT；2 个文字输入与 2 个实时交互继续另行披露，不冒充图片对照。

Revision 13 新增的是 `/choose` 任务选型入口，而不是新一轮图片实验。它按用途、真实性、技术路径和产品化形态组织现有 13 个 Skill，并把选择结果关联回已有 SOURCE → EFFECT；不新增效果图片、来源、产品系统或证据项，也不形成跨 Skill 质量排名。因此 **127 / 57 / 129 / 131** 与 13 个 R12 产品系统的计数保持不变。Revision 7 报告仍保留，只是从主导航移入研究总索引、单 Skill 页和文档地图。

```powershell
cd .\web
npm install
npm run dev
```

页面会标明每个结果属于保留原照、完全重绘或代码/确定性拼装路线。原有的 `travel-photo-abstraction` 受控基线记录了 `DELIVERY PASS`，原有 `poetic-line-zine-poster` 基线也记录了 9:16、照片忠实度与面板角落检查；本轮新增的图像生成概念变体不会沿用这些验证结论。需要原照锁定的正式交付仍必须由确定性脚本嵌入源文件并重新验证。

生成图位于 `web/public/generated/` 并保持本地忽略。原因不是技术问题，而是部分上游没有正式许可证或带再分发限制；完成逐项授权复核前，不把这些研究派生图公开部署。

## 安全与许可边界

- `sources/` 和 `outputs/` 永不提交；其中可能含嵌套 `.git`、第三方代码、图片或模型输出。
- 获取仓库不等于安装 Skill。本实验室不会自动复制内容到 Codex Skills 目录，也不会自动执行上游脚本。
- MIT 项目可以进入后续运行基线，但示例照片、字体和模型输出仍需单独核对权利。
- `travel-photo-abstraction` 只允许原样使用，不修改、派生或再分发。
- 无正式许可证的项目默认只读；不会把其实现复制进本项目。
- 首轮复测只使用合成图或自有照片，并先移除 EXIF/GPS。

更完整的来源与许可说明见 [../UPSTREAM.md](../UPSTREAM.md)。
