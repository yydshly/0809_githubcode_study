# 页面与能力关联规则

状态：`13/13 HTML pages registered / parent graph closed / task refs valid`

Single Image Studio 的页面不能只靠开发者记住 URL。机器可读的唯一页面目录是 [page-registry.js](web/page-registry.js)，可视入口是[内部质量入口](web/quality-hub.html)。

## 页面角色

| 角色 | 用途 | 当前页面数 |
| --- | --- | ---: |
| `product` | 普通用户真实操作入口 | 1 |
| `review` | 效果、错误和内部页面目录 | 3 |
| `walkthrough` | 真人方法演练与匿名汇总 | 2 |
| `automated-qa` | 浏览器诊断和自动验收 | 5 |
| `reference` | 项目原创视觉参考与能力边界 | 2 |

产品主流程不会因为内部页面增多而变成工具墙；自动 QA、视觉参考和主持工具只在内部质量链展示。

## 每个页面必须登记

注册项使用闭合字段：

```text
id + label + href
category + relation + audience
parentId
taskIds[]
description
```

- `parentId` 必须最终闭合到 `studio`，不得循环或指向不存在页面；
- `taskIds` 必须来自真实 `task-catalog.js`，不得用自由文字冒充能力；
- 一个 HTML 文件只能登记一次，一个登记 href 必须对应一个真实文件；
- 跨任务页面可以使用空 `taskIds`，但仍要说明 relation 和 audience；
- 静态参考、自动回归和真人观察必须分类，不得互相替代证据。

## 当前关联示例

- `UT-PRIVACY-SHARE` 同时关联产品主入口、效果样例、内部走查、匿名汇总、产品自动回归、走查工具自动回归；
- `UT-TUNE` 关联产品、样例、几何校正参考、走查和两类回归；
- `UT-OLD-PHOTO` 与 `CR-RESTORE` 同时出现在老照片视觉参考，但页面明确区分本地整理和生成式重绘；
- 错误参考和错误验收是跨任务页面，不伪装成一项图片能力。

## 新增页面的完成条件

以后新增 HTML 页面时必须在同一变更中：

1. 登记到 `PAGE_REGISTRY`；
2. 选择真实角色、父入口和受众；
3. 关联真实 task ID，或明确为跨任务页面；
4. 在质量入口显示，必要时添加返回上级入口；
5. 通过 `tests/page-registry.test.mjs` 的 HTML 全集、父图、任务引用检查；
6. 在 1180 px 与 390 px 检查目录显示、链接和无横向溢出。

2026-08-18 Chromium run `e4a3e486-9011-42d3-b376-778899aabbcc` 已在两档视口核对 13 项页面目录、五类角色、走查和本地汇总链路，并逐个请求 13 个登记路由，全部返回 `HTTP 200 + text/html`，结果 `2/2`。该结果是页面关系与工具 QA，不是图片质量或真人可用性结论。
