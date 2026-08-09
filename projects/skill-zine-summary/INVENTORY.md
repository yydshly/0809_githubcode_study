# 项目清单与技术卡

数据快照：2026-08-09。主目录固定在 [`2c65c251`](https://github.com/tluy/skill-zine-summary/commit/2c65c251bc6909f077ae9974e3251d164a07c924)。

## 14 个展示条目到 12 个仓库

| # | 上游显示名 | 样图语境 | 规范化目标 | 说明 |
| ---: | --- | --- | --- | --- |
| 01 | `daily-photo-play-ground` | 螂狗日记 | [luji12/daily-photo-playground](https://github.com/luji12/daily-photo-playground) | 显示名比仓库名多一个连字符 |
| 02 | `dyy_photo_deconstruct` | dyy | [121dyy/dyy_photo_deconstruct](https://github.com/121dyy/dyy_photo_deconstruct) | 唯一仓库 |
| 03 | `travel-photo-abstraction` | 土建三局包工头 | [Evianis/travel-photo-abstraction](https://github.com/Evianis/travel-photo-abstraction) | 唯一仓库 |
| 04 | `gathered-scenes-zine-skill` | 乞力马扎罗的雪 | [Zeejay0/gathered-scenes-zine-skill](https://github.com/Zeejay0/gathered-scenes-zine-skill) | 同一仓库的总名称 |
| 05 | `gc-minimal-zine-poster` | AYE | [LiamGvchi/gc-minimal-zine-poster](https://github.com/LiamGvchi/gc-minimal-zine-poster) | 唯一仓库 |
| 06 | `PHOTO REVIVAL` | 章台竹 | [dacnay816y62-hub/photo-revival](https://github.com/dacnay816y62-hub/photo-revival) | 唯一仓库 |
| 07 | `pixel-style-poster-skill` | 米兰的弹舌 | [v92388375-gif/pixel-style-poster-skill](https://github.com/v92388375-gif/pixel-style-poster-skill) | 唯一仓库 |
| 08 | `scene-distillation-zine-v1-3` | 知梵夜猫 | [Zeejay0/gathered-scenes-zine-skill](https://github.com/Zeejay0/gathered-scenes-zine-skill) | 同一仓库的历史“影像蒸馏”Skill |
| 09 | `scenes-gathered-zine-v1-3` | LightJoyJet | [Zeejay0/gathered-scenes-zine-skill](https://github.com/Zeejay0/gathered-scenes-zine-skill) | 同一仓库的历史“实景拼贴”Skill |
| 10 | `photo-relic-editorial` | 丁真の赛博牧场 | [wnby/photo-relic-editorial](https://github.com/wnby/photo-relic-editorial) | 唯一仓库 |
| 11 | `photo-distill` | yangholdon | [yangcodingmaster/photo-distill](https://github.com/yangcodingmaster/photo-distill) | 唯一 code-native 路线 |
| 12 | `poetic-line-zine-poster` | 诗意线条海报 | [zhu930824/poetic-line-zine-poster](https://github.com/zhu930824/poetic-line-zine-poster) | Hybrid 路线 |
| 13 | `photo-abstract-editorial` | 凌云志 | [ZzzLc0405/photo-abstract-editorial](https://github.com/ZzzLc0405/photo-abstract-editorial) | 唯一仓库 |
| 14 | `photo-to-zine-postcard` | 王二_Wanger | [Whiplashzeb/photo-to-zine-postcard](https://github.com/Whiplashzeb/photo-to-zine-postcard) | 唯一仓库 |

样图语境来自上游图片 alt 文本，只用于定位原表行，不能视为可靠作者或版权归属。

## 12 个去重仓库技术卡

| 项目 | 核心输出与实现 | 工程储备点 | 优先级 | 许可/当前状态 | 固定版本 | 既往研究 |
| --- | --- | --- | --- | --- | --- | --- |
| `daily-photo-playground` | ImageGen；3:4 暖白外页、高饱和内版心、放大主体、1 个原照小窗、源图几何 | 四层构图、72–84% 连续留白、主体/文字/几何比例门禁 | P1 | 无正式许可证；只读 | [`b987bbb`](https://github.com/luji12/daily-photo-playground/commit/b987bbb205626f2f5fca47c72a8a05c5863f8c6b) · 2026-08-05 | 待补录 |
| `dyy_photo_deconstruct` | ImageGen；照片重绘成无文字旧纸水墨/水彩剪影 | “剪影 + 最少必要记号”、85–92% 空纸、可读性/抽象度边界 | P1 | 无正式许可证；只读 | [`42e637e`](https://github.com/121dyy/dyy_photo_deconstruct/commit/42e637e8875dafeb4ccf2ab5a738e4dca41c8f30) · 2026-08-05 | 待补录 |
| `travel-photo-abstraction` | ImageGen 只生成 clean panel；Python/Pillow 拼回原照并验证 | 视觉事实清单、事实到 mark 映射、结构参考索引、role lock、fail-closed | P0 | 自定义 source-available；只可原样使用 | [`96e3876`](https://github.com/Evianis/travel-photo-abstraction/commit/96e387635edf05bc7e798428a5db11dbf48f46c1) · 2026-08-03 | 待补录 |
| `gathered-scenes-zine-skill` | 历史双 Skill：实景拼贴保留照片；影像蒸馏完全重构 | 并列比较 Scene Card 与 Distillation Card 两套分析卡和输出契约 | P2 | 当前为个人非商业且已删除实现；历史许可随 commit 变化 | 当前 [`598ce3c`](https://github.com/Zeejay0/gathered-scenes-zine-skill/commit/598ce3c1173944f64b96ede323809ed6905ab345)；方法 [`176407b`](https://github.com/Zeejay0/gathered-scenes-zine-skill/commit/176407be78190e2c10691099f3a3f343b2900268)；MIT [`b14cabc`](https://github.com/Zeejay0/gathered-scenes-zine-skill/commit/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e) | 待补录 |
| `gc-minimal-zine-poster` | ImageGen；主题/句子/对象/照片编译成 3:5 高留白纸质海报 | 通用 Prompt Compiler、layout/anchor/type/texture/mood 变体轴、定向重试 | P1 | MIT；可作为运行基线 | [`4cb0396`](https://github.com/LiamGvchi/gc-minimal-zine-poster/commit/4cb0396ad4e834019f753b37e1c4f415f5e02026) · 2026-07-25 | 待补录 |
| `photo-revival` | ImageGen；把照片作为记忆证据，完全重绘为小型手绘插画 | 80–88% 白纸、主体 10–16%、主主体/场景与 1–2 个 memorable details | P2 | MIT；可运行 | [`ca4c3c6`](https://github.com/dacnay816y62-hub/photo-revival/commit/ca4c3c6c0f812355bd6d815d8a78652db801b7f1) · 2026-08-02 | 待补录 |
| `pixel-style-poster-skill` | ImageGen；细点阵、半调、低分辨率印刷质感，而非 8-bit 游戏像素 | 点阵密度表示明暗、标题策略、多主体层级、反向半调和失败路由 | P1 | MIT；可作为材料语言基线 | [`b93066b`](https://github.com/v92388375-gif/pixel-style-poster-skill/commit/b93066b52fc2f32bf9ec3a9a6d379b4088d6fd7b) · 2026-07-25 | 待补录 |
| `photo-relic-editorial` | ImageGen；上半真实照片、下半纸上记忆版画 | 结构/光/色/重心压缩为主 relic，系列化配方与克制的多标题模式 | P2 | MIT；可运行 | [`2232da1`](https://github.com/wnby/photo-relic-editorial/commit/2232da16afddc7940e2e2f280bfb85aa62da1bae) · 2026-08-05 | 待补录 |
| `photo-distill` | 手写 HTML/CSS/SVG + Chrome/Chromium + Python；不用图像模型 | 关系量到坐标、色锚/着墨率/缩略图/色相集中度量化、失败删除候选 | P0 | 无正式许可证；只做独立原创原型 | [`e2708ae`](https://github.com/yangcodingmaster/photo-distill/commit/e2708aeb7db4344dfb5577b5f12bcf57ded541ec) · 2026-08-03 | 待补录 |
| `poetic-line-zine-poster` | ImageGen 生成无字抽象面板；Pillow 拼原照/标题并做结构验证；脚本汇总人工评分 | `gesture/mass/rhythm/path` 路由、三档抽象、像素忠实、人工评分阈值 | P0 | 无正式许可证；只读架构 | [`61514e0`](https://github.com/zhu930824/poetic-line-zine-poster/commit/61514e0652de45f30c74b01bc9a11cfbf25b5c52) · 2026-08-07 | 待补录 |
| `photo-abstract-editorial` | ImageGen；原照区域 + 象牙色抽象面板 + 2–5 词英文标题 | 3–6 个源图事实映射为 mark；所有抽象元素可追溯到原图 | P2 | 无正式许可证；只读 | [`dada523`](https://github.com/ZzzLc0405/photo-abstract-editorial/commit/dada5237450d882168c22bae75119e8d24e784b5) · 2026-08-09 | 待补录 |
| `photo-to-zine-postcard` | ImageGen；固定 2:3 正反面明信片系统 | 原照保持比例、1 主 motif、至多 1 辅 motif、恰好 3 色块、可书写背面 | P1 | MIT；可做产品化实验 | [`0091403`](https://github.com/Whiplashzeb/photo-to-zine-postcard/commit/0091403bccb219d1be78c5be8552de29a6446f0a) · 2026-08-07 | 待补录 |

## 实现深度分组

### 有确定性脚本与自动验收

- `travel-photo-abstraction`：安装检查、合成、finalize、output validation；
- `poetic-line-zine-poster`：合成、确定性排字、自动结构验证和人工评分汇总；
- `photo-distill`：浏览器渲染后一次性量化并 fail-closed 定稿。

### Prompt / ImageGen + 视觉门禁

- `daily-photo-playground`
- `dyy_photo_deconstruct`
- `gc-minimal-zine-poster`
- `photo-revival`
- `pixel-style-poster-skill`
- `photo-relic-editorial`
- `photo-abstract-editorial`
- `photo-to-zine-postcard`
- `gathered-scenes-zine-skill` 的历史实现

这些项目大多依赖人工视觉复核或最多一次定向重试，工程可复现性弱于前三者。

## 维护信号

- 这些目标仓库都很新，不能用 star 数替代成熟度、稳定性或技术质量判断。
- 多数没有 tag/release；研究必须固定 commit，不能只写 `main`。
- 汇总页可能落后于目标仓库，当前已经出现 `gathered-scenes-zine-skill` README 链接指向已删除目录的实例。
- 每次升级快照都要重新检查文件树、许可证、运行依赖和示例资产权利。
