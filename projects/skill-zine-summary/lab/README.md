# Zine Skill 研究实验室

这个目录用于获取、检查和对照 `skill-zine-summary` 指向的全部 12 个仓库。目标是先忠实理解各库原有能力，再用同源输入做受控实验，而不是把第三方项目合并成一个新框架。

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

## 安全与许可边界

- `sources/` 和 `outputs/` 永不提交；其中可能含嵌套 `.git`、第三方代码、图片或模型输出。
- 获取仓库不等于安装 Skill。本实验室不会自动复制内容到 Codex Skills 目录，也不会自动执行上游脚本。
- MIT 项目可以进入后续运行基线，但示例照片、字体和模型输出仍需单独核对权利。
- `travel-photo-abstraction` 只允许原样使用，不修改、派生或再分发。
- 无正式许可证的项目默认只读；不会把其实现复制进本项目。
- 首轮复测只使用合成图或自有照片，并先移除 EXIF/GPS。

更完整的来源与许可说明见 [../UPSTREAM.md](../UPSTREAM.md)。
