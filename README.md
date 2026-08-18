# 0809 GitHub Code Study

一个长期维护的代码研究工作台：根目录负责项目索引、研究概览与关联入口；每个子项目负责一个具体项目的复现、拆解、实验和扩展。

远端仓库：[yydshly/0809_githubcode_study](https://github.com/yydshly/0809_githubcode_study)

## 仓库定位

- 收集值得深入研究的开源项目，以及已经开发过、值得复盘的项目。
- 让每个研究项目保持自解释、可运行，并尽量具备将来独立拆仓的能力。
- 统一记录上游来源、参考版本、许可证、研究结论、源码仓库和在线演示。
- 根目录只做导航和共用约定，不强制所有子项目使用同一种语言、框架或构建工具。

## 项目索引

新增或变更子项目时，请同步更新本表。

| 项目 | 研究主题 | 技术栈 | 状态 | 本地研究 | 上游来源 | 独立仓库 | 在线演示 | 许可证 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Skill Zine Summary | Codex 照片/Zine 技能的技术谱系、渲染后端与验证方法 | Codex Skills、ImageGen、Python、HTML/CSS/SVG | 研究中 | [研究目录](projects/skill-zine-summary) | [tluy/skill-zine-summary](https://github.com/tluy/skill-zine-summary) | 暂无 | [GitHub Pages 完整研究站](https://yydshly.github.io/0809_githubcode_study/) · [OpenAI Sites 动态研究站](https://skill-zine-private-lab.yydshly.chatgpt.site/) | 汇总库未声明；子库见[来源审计](projects/skill-zine-summary/UPSTREAM.md) |
| Image Product Studio R17 | 多 Skill 图片产品、单图/逐张/合集与产品适配的历史探索 | 产品研究、ImageGen、HTML/CSS、Canvas | 已归档 | [研究目录](projects/visual-route-studio) | 无单一上游；见[来源边界](projects/visual-route-studio/UPSTREAM.md) | 暂无 | [归档电脑网页](projects/visual-route-studio/compositor) | 本地原创研究；许可证待定 |
| Single Image Studio | 本地优先的单图处理工作室：基础编辑、文档、压缩、隐私分享、场景套装与可选抠图 Provider | Node.js、Canvas、Image API | 可运行（内部 Alpha） | [项目目录](projects/single-image-studio) | 无单一上游；见[来源边界](projects/single-image-studio/UPSTREAM.md) | [GitHub 源码目录](https://github.com/yydshly/0809_githubcode_study/tree/main/projects/single-image-studio) | [本地运行说明](projects/single-image-studio/README.md#快速开始) | 本地原创研究；许可证待定 |

状态统一使用：`计划中`、`研究中`、`可运行`、`已归档`。

## 目录结构

```text
.
├── README.md                 # 总览与项目索引
├── AGENTS.md                 # 后续自动化开发/研究约定
├── docs/
│   ├── project-conventions.md
│   └── deployment.md
└── projects/
    ├── README.md             # 子项目规则
    ├── _template/            # 新研究项目模板
    └── <project-slug>/       # 一个可独立运行的研究项目
```

## 开始一个研究项目

1. 使用小写 `kebab-case` 命名目录，例如 `projects/example-project`。
2. 复制 [`projects/_template`](projects/_template)，填写项目卡、研究问题和上游信息。
3. 在子项目 README 中写清安装、运行、测试、构建与部署命令。
4. 将上游 URL、tag/commit、获取日期和许可证记录在 `UPSTREAM.md`。
5. 在上面的项目索引中添加一行；有独立仓库或演示时同时补上链接。

PowerShell 示例：

```powershell
Copy-Item -Recurse projects/_template projects/example-project
```

详细要求见 [子项目约定](docs/project-conventions.md)。

## 仓库与部署策略

默认先把轻量实验放在 `projects/` 下。出现以下情况时，再把子项目拆成独立 GitHub 仓库：

- 需要独立的 CI、Issues、Release 或权限；
- 依赖和构建流程与其他项目完全不同；
- 需要独立域名、部署历史或服务端能力；
- 项目已经从研究实验成长为长期维护的产品。

这个总仓库继续保留研究记录，并在项目索引中关联独立源码仓库与演示地址。具体方案见 [部署与多仓库关联](docs/deployment.md)。

## 使用说明

克隆总仓库后，进入目标子项目并以该目录自己的 README 为准：

```bash
git clone https://github.com/yydshly/0809_githubcode_study.git
cd 0809_githubcode_study/projects/example-project
```

子项目不应依赖另一个子项目的相对路径，也不应依赖根目录脚本才能运行；这样将来可以保留历史地拆分为独立仓库。

## 许可证与署名

当前总仓库尚未选择统一的开源许可证，因此原创汇总内容暂未明确授予复用许可。每个上游项目、复制的代码和素材仍受其原许可证及版权声明约束；根目录未来添加的许可证不会替代子项目自己的第三方许可义务。
