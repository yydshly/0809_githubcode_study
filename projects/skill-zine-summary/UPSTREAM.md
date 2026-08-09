# 上游来源与许可审计

## 主上游

| 字段 | 内容 |
| --- | --- |
| 项目名称 | `tluy/skill-zine-summary` |
| 仓库 URL | https://github.com/tluy/skill-zine-summary |
| 默认分支 | `main` |
| 固定 commit | [`2c65c251bc6909f077ae9974e3251d164a07c924`](https://github.com/tluy/skill-zine-summary/commit/2c65c251bc6909f077ae9974e3251d164a07c924) |
| commit 时间 | 2026-08-08 13:52:57 +08:00 |
| 获取日期 | 2026-08-09 |
| tag | 无 |
| 固定快照提交数 | 31 |
| 上游许可证 | 未声明：没有 `LICENSE`、`COPYING` 或 README 授权条款 |

固定版本 README：[README at `2c65c251`](https://github.com/tluy/skill-zine-summary/blob/2c65c251bc6909f077ae9974e3251d164a07c924/README.md)。

## 主上游实际内容

主上游是人工维护的样图目录，而不是实现仓库：

```text
skill-zine-summary/
├── README.md
└── pic/
    ├── s01_1.jpg ... s01_3.jpg
    ├── ...
    └── s14_1.jpg ... s14_3.jpg
```

- README 有 14 行展示条目；
- 每行包含 3 张 JPEG 样图和 1 个目标仓库链接；
- 共 42 张 JPEG，固定快照约 15 MiB；
- 没有源码、测试、依赖、安装方法、评测标准或部署配置；
- 样图的 alt 文本像案例名或投稿者昵称，但没有可靠的作者、来源和授权解释。

## 使用边界

本研究没有复制主上游 README、42 张图片或任何子库代码，只保存：

- 公开链接、commit、时间和许可证等事实性元数据；
- 对各仓库架构和能力的原创归纳；
- 自己设计的学习路线、中间表示和验收标准。

主上游没有许可证，因此不能因为仓库公开就推定允许复制、修改、再发布其 README 或图片。若未来确需引用样图，必须先取得明确授权并核对每张图片的权利来源。

## 12 个目标仓库许可汇总

### MIT

- [LiamGvchi/gc-minimal-zine-poster](https://github.com/LiamGvchi/gc-minimal-zine-poster)
- [dacnay816y62-hub/photo-revival](https://github.com/dacnay816y62-hub/photo-revival)
- [v92388375-gif/pixel-style-poster-skill](https://github.com/v92388375-gif/pixel-style-poster-skill)
- [wnby/photo-relic-editorial](https://github.com/wnby/photo-relic-editorial)
- [Whiplashzeb/photo-to-zine-postcard](https://github.com/Whiplashzeb/photo-to-zine-postcard)

MIT 只解决仓库中明确覆盖材料的代码/文档许可；示例照片、字体、模型输出和其他资产仍需单独核对。

### 自定义限制许可

- [Evianis/travel-photo-abstraction](https://github.com/Evianis/travel-photo-abstraction)：`Travel Photo Abstraction Source-Available License 1.0`。只允许下载、安装、备份和使用未修改副本；禁止修改、衍生、再分发、镜像、再发布、转授或销售。
- [Zeejay0/gathered-scenes-zine-skill](https://github.com/Zeejay0/gathered-scenes-zine-skill)：`Gathered Scenes Zine Personal Non-Commercial License 1.0`。允许个人非商业学习、研究和实验；商业、公司、客户、付费服务、变现内容及付费交付生成结果均需另行书面许可。

### 没有正式许可证

- [luji12/daily-photo-playground](https://github.com/luji12/daily-photo-playground)
- [121dyy/dyy_photo_deconstruct](https://github.com/121dyy/dyy_photo_deconstruct)
- [yangcodingmaster/photo-distill](https://github.com/yangcodingmaster/photo-distill)
- [zhu930824/poetic-line-zine-poster](https://github.com/zhu930824/poetic-line-zine-poster)
- [ZzzLc0405/photo-abstract-editorial](https://github.com/ZzzLc0405/photo-abstract-editorial)

`photo-distill` README 有“方法与代码随意使用”的非正式说明，但仓库没有完整许可证；在获得明确许可前仍按“只读研究，不复制实现”处理。

## 已发现的上游漂移

`gathered-scenes-zine-skill` 的 README 仍介绍并链接两个 Skill：

- `scene-distillation-zine-v1-3`
- `scenes-gathered-zine-v1-3`

但当前固定 HEAD [`598ce3c1173944f64b96ede323809ed6905ab345`](https://github.com/Zeejay0/gathered-scenes-zine-skill/commit/598ce3c1173944f64b96ede323809ed6905ab345) 已没有 `skills/` 目录。提交 [`37d4253f9a92`](https://github.com/Zeejay0/gathered-scenes-zine-skill/commit/37d4253f9a92) 的信息为 `Delete skills directory`。删除前最后仍包含两个 `SKILL.md` 的快照是 [`176407be78190e2c10691099f3a3f343b2900268`](https://github.com/Zeejay0/gathered-scenes-zine-skill/commit/176407be78190e2c10691099f3a3f343b2900268)，该快照已经使用个人非商业许可证。

许可证还发生过版本变化：[`b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e`](https://github.com/Zeejay0/gathered-scenes-zine-skill/commit/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e) 是改为个人非商业许可前最后一个提交，树中仍有两份 Skill，`LICENSE` 为 MIT；后续提交 `4b703b7` 才更换许可证。研究记录必须把许可证绑定到具体 commit，不能把后来的条款追溯写到较早快照上。

结论：当前 README 的安装命令和 Skill 链接已经失效，不能把历史快照当作当前可安装依赖。如需研究历史实现，必须明确选择 `b14cab...`（MIT 快照）或 `176407b...`（个人非商业快照），并遵守所选快照内的许可与归属文件。

## 同步记录

| 日期 | 主上游版本 | 操作 | 结果 |
| --- | --- | --- | --- |
| 2026-08-09 | `2c65c251bc6909f077ae9974e3251d164a07c924` | 初次审计 | 14 条展示记录归一为 12 个目标仓库；完成许可与文件树核对 |

## 重新同步清单

- [ ] 获取主上游新的 HEAD，并比较 README 链接集合；
- [ ] 对新增、删除或改名条目重新做 14→N 归一化；
- [ ] 固定每个目标仓库的新 commit，而不是只记录 `main`；
- [ ] 重新检查 LICENSE、README 授权说明和资产声明；
- [ ] 复查 README 安装命令对应的文件是否仍存在；
- [ ] 在 [INVENTORY.md](INVENTORY.md) 标出变化，但保留旧快照记录。
