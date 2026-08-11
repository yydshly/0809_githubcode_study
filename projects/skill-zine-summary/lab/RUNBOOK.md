# 实验室运行手册

> 研究导航：[总索引](../RESEARCH-INDEX.md) · [多原图实验室](http://localhost:4317/labs/multi-source) · [实验记录](records/README.md)

## 1. 获取与验证

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-sources.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\verify-sources.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\verify-gallery.ps1
```

验证输出必须满足：

- `12/12` 个仓库存在；
- 每个 `origin` 与锁文件一致；
- 每个 HEAD 等于 `researchCommit`；
- 每个检出都是 detached HEAD；
- 工作树没有本地修改。

画廊验证还必须满足：12 个目标仓库都有样例、34 个目标仓库样例路径存在，另有 3 个 `daily-photo-playground` 的汇总库远程目录样例。

## 2. 先看原始能力

按 [ORIGINAL-SAMPLES.md](ORIGINAL-SAMPLES.md) 的顺序查看：

1. 固定提交的 README 与样例；
2. 输入和输出分别是什么；
3. 原照是重绘、保留，还是只提取关系；
4. 图像模型与脚本分别负责什么；
5. 验证是自动、人工，还是没有明确定义。

不要用不同输入的上游样例做效果排名。

## 3. 安装或运行前审查

对准备运行的项目逐项记录：

- `SKILL.md` 的触发条件、禁止事项和外部调用；
- 脚本入口、依赖、网络访问和写入位置；
- 是否把输入发送到外部模型；
- 示例图片、字体和其他资产是否允许复用；
- 输出是否允许公开、再分发或商业使用。

获取源码不等于授权执行。`executionPolicy=read-only` 的项目不运行上游脚本；`original-unmodified-use-only` 不做任何修改或衍生。

## 4. 受控实验

每次实验从 [records/experiment-template.yaml](records/experiment-template.yaml) 复制一份记录，先填写版本、权利、画幅、生成预算和验证规则，再开始生成。

第一批建议顺序：

1. MIT：`gc-minimal-zine-poster` 与 `pixel-style-poster-skill`；
2. MIT：`photo-revival`、`photo-relic-editorial`、`photo-to-zine-postcard`；
3. 原样运行：`travel-photo-abstraction`；
4. 无许可项目仅做行为观察与原创验证器实验。

## 5. 结果交付

- 生成物默认放在 `outputs/<experiment-id>/`，不提交；
- 可公开的结果必须先确认输入、模型输出和字体/资产权利；
- 仓库中提交实验记录、测量结果、失败原因和获准公开的自有资产；
- 如果结果不能公开，记录受控保存位置、SHA-256 和保留期。
