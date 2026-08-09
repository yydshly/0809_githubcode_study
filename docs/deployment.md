# 部署与多仓库关联

## 推荐模型

采用“研究总库 + 按需独立演示仓库”的混合方式：

1. 本仓库是总入口，保存索引、研究记录和轻量实验。
2. 同工具链、纯静态、发布节奏一致的 Demo，可以构建到同一个站点的不同子路径。
3. 需要独立 CI、权限、Issues、Release、域名或服务端的项目，拆成独立仓库。
4. 根 README 始终关联本地研究、上游来源、独立源码仓库和在线演示。

## GitHub Pages 边界

GitHub Pages 是静态托管服务。一个项目仓库最多对应一个 Pages 站点，默认项目站点地址为：

```text
https://<owner>.github.io/<repository>/
```

因此，同一仓库中的多个静态 Demo 应由一个聚合构建产物发布到不同子路径，例如：

```text
/demos/project-a/
/demos/project-b/
```

不要让多个工作流分别部署同一个仓库的 Pages，它们会竞争同一个站点。等第一个真实静态 Demo 出现后，再根据其技术栈建立单一聚合工作流。

项目站点位于仓库名子路径下，构建工具的 `base`/`publicPath`、静态资源 URL 和前端路由必须适配。单页应用通常需要 hash 路由或明确的 `404.html` 回退策略。

GitHub Pages 不运行 PHP、Python、Ruby 等服务端程序；需要 API、数据库、私密环境变量或长驻进程时，应使用独立的应用托管服务，并只在这里保存链接与公开配置说明。

不要把“私有仓库”等同于“私有站点”。普通 GitHub Pages 站点通常公开可访问；私有发布只适用于支持访问控制的特定套餐和组织配置。部署前必须在仓库 Pages 设置中确认最终可见性，敏感数据无论如何都不应进入发布产物。

官方参考：

- [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 何时拆成独立仓库

满足任意一项时优先拆仓：

- 需要单独的版本、Release、Issues 或协作者权限；
- 需要与总库不同的部署平台、密钥或发布节奏；
- 需要自定义域名，或希望演示 URL 不带总库子路径；
- 项目有后端、数据库、定时任务或其他服务端组件；
- 项目本身已经具有独立产品价值。

建议独立仓库继续使用与本地目录一致的 slug。根索引同时保留“独立仓库”和“在线演示”两列，避免把源码地址与演示地址混为一谈。

## 普通目录、submodule 与 subtree

| 方式 | 适用场景 | 主要代价 |
| --- | --- | --- |
| 普通目录 | 默认；本地实验、笔记、重写和轻量 Demo | 需要手动记录上游版本 |
| 链接独立仓库 | 只需要关联研究与成品 | 总库克隆后不包含独立源码 |
| Git submodule | 必须锁定独立仓库精确提交，且总库构建需要其源码 | 克隆、更新和 CI 都更复杂 |
| Git subtree | 希望单次克隆得到源码，并偶尔与上游同步 | 同步命令和历史更重 |

不要默认把每个独立项目都做成 submodule。多数关联演示只需要在根索引中维护可靠链接。

## 每次部署前的检查

- [ ] 子项目 README 中的安装、构建和预览命令已经验证；
- [ ] 静态资源和路由支持实际部署基础路径；
- [ ] 前端包中不含服务端密钥或私密数据；
- [ ] 已在 Pages/托管平台设置中确认站点的实际公开范围；
- [ ] 根项目索引的源码与演示链接已更新；
- [ ] 第三方代码和素材满足许可证与署名要求；
- [ ] 已记录部署平台、环境变量名称和回滚方式。
