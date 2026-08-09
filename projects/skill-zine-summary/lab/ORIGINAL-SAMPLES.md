# 原始样例能力画廊

本页用固定 commit 上的原始样例理解每个仓库“能够产生什么结果”。图片通过上游固定版本的 raw URL 展示，没有复制进本仓库；版权与许可仍归各上游及素材权利人。

这些样例的输入、题材和生成次数不同，只能用来理解能力边界，不能据此做质量排名。真正横评需要后续的同源输入实验。

## 快速能力对照

| 项目 | 输入 | 原照契约 | 实现路线 | 样例证据 |
| --- | --- | --- | --- | --- |
| `daily-photo-playground` | 日常照片 | 保留一个小原照窗口，其余编辑重构 | ImageGen-only | 汇总库目录样例；目标仓库无样图 |
| `dyy_photo_deconstruct` | 照片 | 完全重绘，不承诺像素保真 | ImageGen-only | 目标仓库成品图 |
| `travel-photo-abstraction` | 旅行照片 | 原照区锁定，抽象面板另生成 | ImageGen + Pillow finalizer | 目标仓库 showcase |
| `gathered-scenes-zine-skill` | 照片 | 两个历史 Skill：保留现场 / 完全蒸馏 | 两套 Prompt Skill | 目标仓库输入/结果对照 |
| `gc-minimal-zine-poster` | 主题、句子、对象或照片 | 按输入转成视觉隐喻 | Prompt Compiler + ImageGen | 目标仓库成品图 |
| `photo-revival` | 照片 | 完全重绘，只保留场景和记忆细节 | ImageGen-only | 目标仓库成品图 |
| `pixel-style-poster-skill` | 主题、人物或照片 | 转成细点阵编辑海报 | ImageGen-only | 目标仓库成品图 |
| `photo-relic-editorial` | 照片 | 真实照片 + 纸上记忆版画，但无确定性像素保证 | ImageGen-only | 目标仓库成品图 |
| `photo-distill` | 照片 | 只采关系量，不复制轮廓 | HTML/CSS/SVG + 浏览器 + QA | 目标仓库输入/结果对照 |
| `poetic-line-zine-poster` | 照片 | 原照区 + 无字抽象面板 | ImageGen + Pillow compositor | 目标仓库成品图 |
| `photo-abstract-editorial` | 照片 | 原照区 + 象牙色抽象面板 | ImageGen-only | 目标仓库成品图 |
| `photo-to-zine-postcard` | 照片 | 原照 + motif + 3 色块 + 功能背面 | ImageGen-only | 目标仓库成品图 |

## 01 · daily-photo-playground

[固定版本](https://github.com/luji12/daily-photo-playground/tree/b987bbb205626f2f5fca47c72a8a05c5863f8c6b) · 无正式许可证，只读

目标仓库没有自带样图。以下是主汇总固定版本中对应条目的目录样例，不应当作目标仓库内的可复现实验。

<p>
  <img src="https://raw.githubusercontent.com/tluy/skill-zine-summary/2c65c251bc6909f077ae9974e3251d164a07c924/pic/s01_1.jpg" alt="daily-photo-playground catalog sample 1" width="260">
  <img src="https://raw.githubusercontent.com/tluy/skill-zine-summary/2c65c251bc6909f077ae9974e3251d164a07c924/pic/s01_2.jpg" alt="daily-photo-playground catalog sample 2" width="260">
  <img src="https://raw.githubusercontent.com/tluy/skill-zine-summary/2c65c251bc6909f077ae9974e3251d164a07c924/pic/s01_3.jpg" alt="daily-photo-playground catalog sample 3" width="260">
</p>

观察重点：暖白外框、高饱和内版心、放大主体越界、源图色几何和小型原照窗口共同形成“日常照片编辑页”。

## 02 · dyy_photo_deconstruct

[固定版本](https://github.com/121dyy/dyy_photo_deconstruct/tree/42e637e8875dafeb4ccf2ab5a738e4dca41c8f30) · 无正式许可证，只读

<p>
  <img src="https://raw.githubusercontent.com/121dyy/dyy_photo_deconstruct/42e637e8875dafeb4ccf2ab5a738e4dca41c8f30/examples/1.jpg" alt="dyy photo deconstruct sample 1" width="260">
  <img src="https://raw.githubusercontent.com/121dyy/dyy_photo_deconstruct/42e637e8875dafeb4ccf2ab5a738e4dca41c8f30/examples/4.jpg" alt="dyy photo deconstruct sample 4" width="260">
  <img src="https://raw.githubusercontent.com/121dyy/dyy_photo_deconstruct/42e637e8875dafeb4ccf2ab5a738e4dca41c8f30/examples/9.jpg" alt="dyy photo deconstruct sample 9" width="260">
</p>

观察重点：大面积旧纸留白、剪影、姿态线、wash 和极少必要记号；成品主动放弃文字与像素保真。

## 03 · travel-photo-abstraction

[固定版本](https://github.com/Evianis/travel-photo-abstraction/tree/96e387635edf05bc7e798428a5db11dbf48f46c1) · 自定义 source-available，只可原样使用

<p>
  <img src="https://raw.githubusercontent.com/Evianis/travel-photo-abstraction/96e387635edf05bc7e798428a5db11dbf48f46c1/showcase/sky-balloon.png" alt="travel photo abstraction sky balloon" width="260">
  <img src="https://raw.githubusercontent.com/Evianis/travel-photo-abstraction/96e387635edf05bc7e798428a5db11dbf48f46c1/showcase/harbour-silhouette.png" alt="travel photo abstraction harbour silhouette" width="260">
  <img src="https://raw.githubusercontent.com/Evianis/travel-photo-abstraction/96e387635edf05bc7e798428a5db11dbf48f46c1/showcase/winter-tower.png" alt="travel photo abstraction winter tower" width="260">
</p>

观察重点：原照片承担事实证据，生成模型只负责下方无字抽象面板；Pillow 负责确定性拼接并通过 `DELIVERY PASS` 门禁。

## 04 · gathered-scenes-zine-skill（历史 MIT 快照）

[研究版本](https://github.com/Zeejay0/gathered-scenes-zine-skill/tree/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e) · 该快照为 MIT；当前 `main` 已删除 Skill

### 实景拼贴：保留照片

<p>
  <img src="https://raw.githubusercontent.com/Zeejay0/gathered-scenes-zine-skill/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e/examples/real-scene-collage/01-where-stone-meets-sky/source.jpg" alt="gathered scenes source" width="260">
  <img src="https://raw.githubusercontent.com/Zeejay0/gathered-scenes-zine-skill/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e/examples/real-scene-collage/01-where-stone-meets-sky/result.jpg" alt="gathered scenes result" width="260">
</p>

### 影像蒸馏：完全重构

<p>
  <img src="https://raw.githubusercontent.com/Zeejay0/gathered-scenes-zine-skill/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e/examples/image-distillation/01-time-waves-back/source.jpg" alt="scene distillation source" width="260">
  <img src="https://raw.githubusercontent.com/Zeejay0/gathered-scenes-zine-skill/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e/examples/image-distillation/01-time-waves-back/result.jpg" alt="scene distillation result" width="260">
</p>

观察重点：同一仓库并列两种互斥契约——Scene Card 保留真实摄影，Distillation Card 则把现场重构为视觉隐喻。

## 05 · gc-minimal-zine-poster

[固定版本](https://github.com/LiamGvchi/gc-minimal-zine-poster/tree/4cb0396ad4e834019f753b37e1c4f415f5e02026) · MIT

<p>
  <img src="https://raw.githubusercontent.com/LiamGvchi/gc-minimal-zine-poster/4cb0396ad4e834019f753b37e1c4f415f5e02026/examples/night-door.jpeg" alt="gc minimal zine night door" width="260">
  <img src="https://raw.githubusercontent.com/LiamGvchi/gc-minimal-zine-poster/4cb0396ad4e834019f753b37e1c4f415f5e02026/examples/yellow-step.jpeg" alt="gc minimal zine yellow step" width="260">
  <img src="https://raw.githubusercontent.com/LiamGvchi/gc-minimal-zine-poster/4cb0396ad4e834019f753b37e1c4f415f5e02026/examples/moon-tide.jpeg" alt="gc minimal zine moon tide" width="260">
</p>

观察重点：3:5 画幅、70–90% 留白、一个高饱和色锚、微字和纸张/印刷瑕疵；它更像通用 Prompt Compiler，而非照片滤镜。

## 06 · photo-revival

[固定版本](https://github.com/dacnay816y62-hub/photo-revival/tree/ca4c3c6c0f812355bd6d815d8a78652db801b7f1) · MIT

<p>
  <img src="https://raw.githubusercontent.com/dacnay816y62-hub/photo-revival/ca4c3c6c0f812355bd6d815d8a78652db801b7f1/examples/01_moon_gate.png" alt="photo revival moon gate" width="260">
  <img src="https://raw.githubusercontent.com/dacnay816y62-hub/photo-revival/ca4c3c6c0f812355bd6d815d8a78652db801b7f1/examples/05_japan_road_page.png" alt="photo revival japan road" width="260">
  <img src="https://raw.githubusercontent.com/dacnay816y62-hub/photo-revival/ca4c3c6c0f812355bd6d815d8a78652db801b7f1/examples/07_mountain_yaks.png" alt="photo revival mountain yaks" width="260">
</p>

观察重点：照片只是“记忆证据”，最终完全重绘成纸上的小型手绘插画；不应声称保留原图像素。

## 07 · pixel-style-poster-skill

[固定版本](https://github.com/v92388375-gif/pixel-style-poster-skill/tree/b93066b52fc2f32bf9ec3a9a6d379b4088d6fd7b) · MIT

<p>
  <img src="https://raw.githubusercontent.com/v92388375-gif/pixel-style-poster-skill/b93066b52fc2f32bf9ec3a9a6d379b4088d6fd7b/examples/mint-night-lily.png" alt="pixel style mint night lily" width="260">
  <img src="https://raw.githubusercontent.com/v92388375-gif/pixel-style-poster-skill/b93066b52fc2f32bf9ec3a9a6d379b4088d6fd7b/examples/rococo-velvet-grapes.png" alt="pixel style rococo grapes" width="260">
  <img src="https://raw.githubusercontent.com/v92388375-gif/pixel-style-poster-skill/b93066b52fc2f32bf9ec3a9a6d379b4088d6fd7b/examples/deep-teal-butterfly.png" alt="pixel style deep teal butterfly" width="260">
</p>

观察重点：用细点阵和半调密度塑造明暗与层级，是编辑印刷材料语言，不是 8-bit 游戏像素画。

## 08 · photo-relic-editorial

[固定版本](https://github.com/wnby/photo-relic-editorial/tree/2232da16afddc7940e2e2f280bfb85aa62da1bae) · MIT

<p>
  <img src="https://raw.githubusercontent.com/wnby/photo-relic-editorial/2232da16afddc7940e2e2f280bfb85aa62da1bae/examples/paper-beijing/geese-procession.png" alt="photo relic geese procession" width="260">
  <img src="https://raw.githubusercontent.com/wnby/photo-relic-editorial/2232da16afddc7940e2e2f280bfb85aa62da1bae/examples/paper-beijing/temple-of-heaven.png" alt="photo relic temple of heaven" width="260">
  <img src="https://raw.githubusercontent.com/wnby/photo-relic-editorial/2232da16afddc7940e2e2f280bfb85aa62da1bae/examples/paper-beijing/great-wall-ridge.png" alt="photo relic great wall ridge" width="260">
</p>

观察重点：上半真实照片、下半纸上记忆版画，重点是系列化的 relic 配方；由于整张图由 ImageGen 生成，不能自动等同于像素级保真。

## 09 · photo-distill

[固定版本](https://github.com/yangcodingmaster/photo-distill/tree/e2708aeb7db4344dfb5577b5f12bcf57ded541ec) · 无正式许可证，只读

<p>
  <img src="https://raw.githubusercontent.com/yangcodingmaster/photo-distill/e2708aeb7db4344dfb5577b5f12bcf57ded541ec/examples/09-lamp-original.jpg" alt="photo distill lamp original" width="260">
  <img src="https://raw.githubusercontent.com/yangcodingmaster/photo-distill/e2708aeb7db4344dfb5577b5f12bcf57ded541ec/examples/09-lamp-poster.jpg" alt="photo distill lamp poster" width="260">
  <img src="https://raw.githubusercontent.com/yangcodingmaster/photo-distill/e2708aeb7db4344dfb5577b5f12bcf57ded541ec/examples/23-sevensisters-poster.jpg" alt="photo distill seven sisters poster" width="260">
</p>

观察重点：唯一不使用图像生成模型的路线。照片被转译成坐标、色锚和少量 SVG 关系，浏览器渲染后再测着墨率、色锚与缩略图可见性。

## 10 · poetic-line-zine-poster

[固定版本](https://github.com/zhu930824/poetic-line-zine-poster/tree/61514e0652de45f30c74b01bc9a11cfbf25b5c52) · 无正式许可证，只读

<p>
  <img src="https://raw.githubusercontent.com/zhu930824/poetic-line-zine-poster/61514e0652de45f30c74b01bc9a11cfbf25b5c52/docs/examples/wuhan-sunset-river.png" alt="poetic line Wuhan sunset" width="260">
  <img src="https://raw.githubusercontent.com/zhu930824/poetic-line-zine-poster/61514e0652de45f30c74b01bc9a11cfbf25b5c52/docs/examples/yellow-crane-bridge.png" alt="poetic line yellow crane bridge" width="260">
  <img src="https://raw.githubusercontent.com/zhu930824/poetic-line-zine-poster/61514e0652de45f30c74b01bc9a11cfbf25b5c52/docs/examples/cat-stretch.png" alt="poetic line cat stretch" width="260">
</p>

观察重点：模型只生成无字线条/涂鸦面板，脚本负责原照、排字和结构验证；总分脚本汇总的是人工评分，而不是自动视觉评分。

## 11 · photo-abstract-editorial

[固定版本](https://github.com/ZzzLc0405/photo-abstract-editorial/tree/dada5237450d882168c22bae75119e8d24e784b5) · 无正式许可证，只读

<p>
  <img src="https://raw.githubusercontent.com/ZzzLc0405/photo-abstract-editorial/dada5237450d882168c22bae75119e8d24e784b5/assets/examples/case-3.jpg" alt="photo abstract editorial case 3" width="260">
  <img src="https://raw.githubusercontent.com/ZzzLc0405/photo-abstract-editorial/dada5237450d882168c22bae75119e8d24e784b5/assets/examples/case-1.jpg" alt="photo abstract editorial case 1" width="260">
  <img src="https://raw.githubusercontent.com/ZzzLc0405/photo-abstract-editorial/dada5237450d882168c22bae75119e8d24e784b5/assets/examples/case-7.jpg" alt="photo abstract editorial case 7" width="260">
</p>

观察重点：原照与均匀象牙色抽象面板上下组合，抽象 mark 应能追溯到源图事实，并配 2–5 词的克制英文标题。

## 12 · photo-to-zine-postcard

[固定版本](https://github.com/Whiplashzeb/photo-to-zine-postcard/tree/0091403bccb219d1be78c5be8552de29a6446f0a) · MIT

<p>
  <img src="https://raw.githubusercontent.com/Whiplashzeb/photo-to-zine-postcard/0091403bccb219d1be78c5be8552de29a6446f0a/assets/forest-homestead.png" alt="zine postcard forest homestead" width="260">
  <img src="https://raw.githubusercontent.com/Whiplashzeb/photo-to-zine-postcard/0091403bccb219d1be78c5be8552de29a6446f0a/assets/alpine-glow.png" alt="zine postcard alpine glow" width="260">
  <img src="https://raw.githubusercontent.com/Whiplashzeb/photo-to-zine-postcard/0091403bccb219d1be78c5be8552de29a6446f0a/assets/green-door.png" alt="zine postcard green door" width="260">
</p>

观察重点：固定 2:3 双面产品系统，正面组合照片、一个主 motif 和恰好 3 个源图色块，背面承担地址、邮票和书写功能。

## 从样例进入受控实验

1. 先用本页确认每个项目的原生画幅和原照契约；
2. 从 MIT 项目开始，使用同一张自有/合成照片和固定最多 2 次生成；
3. 将原始输出与 1000×1000 `contain` 预览分开保存，定量指标只测原始输出；
4. ImageGen-only 成品不得声称像素保真；只有确定性 compositor 放置的原照区域才做 crop + pixel diff；
5. 按 [RUNBOOK.md](RUNBOOK.md) 和 [records/experiment-template.yaml](records/experiment-template.yaml) 保存证据。
