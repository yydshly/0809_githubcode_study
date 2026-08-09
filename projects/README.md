# 研究子项目

`projects/` 下的每个目录对应一个具体研究对象。这里允许不同语言和技术栈共存，但每个项目必须能独立说明、独立安装、独立运行。

## 最小项目契约

每个子项目至少包含：

- `README.md`：目标、状态、主要结论、运行/测试/构建/部署方式；
- `UPSTREAM.md`：上游地址、精确版本、获取日期、许可证和本地改动边界；
- 如适用，包含项目自己的依赖文件、锁文件和技术栈专用 `.gitignore`；
- 必要的许可证、版权声明和素材来源。

研究过程较长时，使用 `RESEARCH.md` 持续记录问题、实验、证据和结论。

## 新建方式

复制 `_template`，并将目录改为小写 `kebab-case` 名称：

```powershell
Copy-Item -Recurse projects/_template projects/example-project
```

复制后应立即：

1. 清理模板占位符；
2. 填写 `UPSTREAM.md`；
3. 在根目录 `README.md` 的项目索引中登记；
4. 添加该项目真正需要的目录、依赖和命令。

不要把上游仓库的 `.git` 目录复制进来。如果必须锁定并持续跟踪独立仓库历史，先评估 submodule 或 subtree，具体见 [`docs/deployment.md`](../docs/deployment.md)。
