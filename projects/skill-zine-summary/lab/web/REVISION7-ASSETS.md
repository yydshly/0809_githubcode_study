# Revision 7 跨题材资产记录

本轮使用内置图像生成能力，复用项目内已有的 7 张合成或本地研究输入，为除 Photo Distill 外的 12 个 Skill 各新增两组能力探索，共形成 24 组实验、24 张新效果 PNG 和 24 张网页研究卡。所有输出均为 `1024 × 1536` PNG，并从最终项目路径按原始尺寸复核。

## 关联入口

- [研究总索引](../../RESEARCH-INDEX.md)：查看本资产账本在整体研究证据中的位置；
- [Revision 7 研究报告](REVISION7-RESEARCH.md)与[可浏览报告 `/reports/revision-7`](http://localhost:4317/reports/revision-7)：从资产回到逐 Skill 结论；
- [多原图实验室 `/labs/multi-source`](http://localhost:4317/labs/multi-source)：按 Skill 浏览完整 SOURCE → EFFECT 对照，而不是只看文件路径。

Photo Distill 的 3 组跨题材实验来自 Revision 6，本轮没有为它新增效果，因而不计入上述 24 组。每组网页卡中的产品画布和环境预演由 HTML/CSS 复用同一张效果图构成，不是额外图片、实体样品、客户项目或现场部署证据。完整研究目的、逐 Skill 说明和跨路线结论见 [REVISION7-RESEARCH.md](REVISION7-RESEARCH.md)。

共同提示约束：完整 2:3 竖版画布、四边可见、不裁掉主要主体；不添加 Logo、水印、签名或可读伪文字；人物只使用虚构成年人；效果用于本地能力研究，不冒充上游 Skill 原生运行结果、客户项目、真实印刷或现场部署。

下表记录的是最终提示摘要，不是逐字完整提示。当前没有保存模型版本、seed、采样参数和全部候选历史，因此本记录可以审计所选资产，但不声称能够逐像素重生成。

## 7 张来源及复用关系

| 来源别名 | 完整本地路径 | Revision 7 使用次数 | 使用方向 | SHA-256 |
| --- | --- | ---: | --- | --- |
| `vocalist` | `public/generated/source/next/pixel-closeup-vocalist-source.png` | 2 | Daily、Scene Distillation | `5e26dc39cac602851742db7b27fa7a12381c2681a34842b69ad3c9ffb8ed0f12` |
| `camera-shop` | `public/generated/source/next/night-camera-shop-source.png` | 7 | Daily、Travel、Scenes、Scene Distillation、Photo Revival、Poetic、Postcard | `b47bec2978641dd7e353d244d1615efa1d70c75912c813b278b81486cc0f075d` |
| `florist` | `public/generated/source/next/florist-crosswalk-source.png` | 5 | DYY、Travel、Photo Revival、Poetic、Postcard | `413bba7ef7d310e4a2bf84f0ccdc9ee0127f4747874bbf4984d5a8fec3e4ec0e` |
| `music-box` | `public/generated/source/next/photo-revival-music-box-source.png` | 4 | DYY、GC、Pixel、Photo Relic | `5da5fb0f77d4ff627c08f34b7e188ac2f4230c37c3e3605612f8b38340218066` |
| `reunion` | `public/generated/source/next/adult-reunion-source.png` | 4 | Scenes、GC、Pixel、Photo Abstract | `51464d3dffa22e3f67e6882ff0a496bf491e16ee229bdaff760844e7002e3716` |
| `interchange` | `public/generated/source/next/north-harbor-interchange-source.png` | 1 | Photo Relic | `37ab43d3a5ee11f8b23d0342d1c871768257a0232c12531cc8b694a0785a9a65` |
| `seasons` | `public/generated/source/next/season-seed-library-source.png` | 1 | Photo Abstract | `bb6cf84064317a86b165dc7d78481f114b226c0f21b14847246d1268a85fda1c` |

这些来源会跨 Skill 复用，以便观察同一输入在不同信息选择语法中的变化。“24 组新实验”不等于“24 张不同来源照片”。下方主表的 SOURCE 使用文件名简称；完整路径和指纹以上表为准。

## 最终提示摘要与路径

| Skill | SOURCE | 最终效果路径 | 最终提示摘要 |
| --- | --- | --- | --- |
| Daily Photo Playground | `pixel-closeup-vocalist-source.png` | `public/generated/studies/daily-photo-playground/vocalist-afterglow-editorial-effect.png` | 把爵士歌手情绪近景组织为深青、酒红和铜金高饱和编辑版心；保留完整照片证据窗、越界人物和连续留白。 |
| Daily Photo Playground | `night-camera-shop-source.png` | `public/generated/studies/daily-photo-playground/night-camera-shop-editorial-effect.png` | 用门窗轴、暖灯、雨地反射与完整照片窗重构无人夜间店铺；不凭空增加人物。 |
| DYY Photo Deconstruct | `florist-crosswalk-source.png` | `public/generated/studies/dyy-photo-deconstruct/florist-crosswalk-five-mark-effect.png` | 在约九成旧纸留白中，只保留人物步态弧、花束质量、轨道路由、围巾方向和落点五类必要 mark。 |
| DYY Photo Deconstruct | `photo-revival-music-box-source.png` | `public/generated/studies/dyy-photo-deconstruct/music-box-minimal-mark-effect.png` | 用盒体质量、黄铜摇柄线、酒红接缝、缺星负空间与双接触点表达静物，不复刻摄影轮廓。 |
| Travel Photo Abstraction | `night-camera-shop-source.png` | `public/generated/studies/travel-photo-abstraction/camera-shop-night-balance-effect.png` | 完整夜景照片窗配浅色关系面板；面板只转译门窗轴、暖灯质量和湿地间隔，不画第二个店面。 |
| Travel Photo Abstraction | `florist-crosswalk-source.png` | `public/generated/studies/travel-photo-abstraction/florist-rain-balance-effect.png` | 完整人物照片窗配人物质量、花束色锚、轨道路由与雨面节奏面板，控制上深下浅的视觉平衡。 |
| Scenes Gathered | `adult-reunion-source.png` | `public/generated/studies/scenes-gathered-zine/reunion-table-collage-effect.png` | 保留完整五人聚会照片窗，用撕纸边、暖纸抽象场和单一朱红结构线连接围桌关系。 |
| Scenes Gathered | `night-camera-shop-source.png` | `public/generated/studies/scenes-gathered-zine/night-camera-shop-gathered-effect.png` | 保留完整店面照片窗，以撕纸、靛蓝连接场和暖灯关系维持地点现场感，不新增人物故事。 |
| Scene Distillation | `pixel-closeup-vocalist-source.png` | `public/generated/studies/scene-distillation-zine/vocalist-after-note-distillation-effect.png` | 完全移除人像，用退去的声音弧、空位及莓红、深青、金色角色表达演出结束后的释然。 |
| Scene Distillation | `night-camera-shop-source.png` | `public/generated/studies/scene-distillation-zine/camera-shop-night-distillation-effect.png` | 完全移除照片，只用门形负空间、湿地回声与唯一暖光锚表达“仍亮着的旧店”。 |
| GC Minimal Zine Poster | `photo-revival-music-box-source.png` | `public/generated/studies/gc-minimal-zine-poster/music-box-missing-star-effect.png` | 约四分之三暖纸留白和红色缺星高彩锚成立，但仍保留完整盒体、摇柄与多枚星饰；记录为隐喻成功、形态压缩不足的阶段结果。 |
| GC Minimal Zine Poster | `adult-reunion-source.png` | `public/generated/studies/gc-minimal-zine-poster/reunion-last-toast-effect.png` | 用共享圆桌、四位关系角色和一盏红色余光压缩重聚主题；明确记录来源第五位成员被遗漏的限制。 |
| Photo Revival | `night-camera-shop-source.png` | `public/generated/studies/photo-revival/night-camera-shop-memory-effect.png` | 用石墨、薄水彩和干彩铅完整重画夜间店面，暖窗与红伞作为最强记忆细节。 |
| Photo Revival | `florist-crosswalk-source.png` | `public/generated/studies/photo-revival/florist-rain-memory-effect.png` | 将虚构成年女花艺师、花束、电车和湿轨完整重画；蓝衣、暖围巾和花束承担记忆色。 |
| Pixel Style Poster | `adult-reunion-source.png` | `public/generated/studies/pixel-style-poster/reunion-multi-subject-halftone-effect.png` | 用不同细网频区分脸、头发、四套衣料、雨窗和桌布；不使用 8-bit 大像素，并明确记录五人输入被重构为四人的数量失真。 |
| Pixel Style Poster | `photo-revival-music-box-source.png` | `public/generated/studies/pixel-style-poster/music-box-material-halftone-effect.png` | 用孔雀蓝斜线、酒红横线与黄铜同心网频区分漆面、接缝和金属，附三个无标签材料放大窗。 |
| Photo Relic Editorial | `photo-revival-music-box-source.png` | `public/generated/studies/photo-relic-editorial/music-box-relic-effect.png` | 上部完整来源窗，下部只保留一个音乐盒 relic；用缺星空位和黄铜摇柄形成跨区呼应。 |
| Photo Relic Editorial | `north-harbor-interchange-source.png` | `public/generated/studies/photo-relic-editorial/interchange-crowd-relic-effect.png` | 上部完整换乘来源窗，下部把顶棚汇聚、人流重心和唯一黄色锚压缩成单一 relic。 |
| Poetic Line Zine Poster | `florist-crosswalk-source.png` | `public/generated/studies/poetic-line-zine-poster/florist-crosswalk-poetic-effect.png` | 用花束色质量、围巾弧、轨道路径与雨面扫线构成无字下方面板，并完整展示来源窗。 |
| Poetic Line Zine Poster | `night-camera-shop-source.png` | `public/generated/studies/poetic-line-zine-poster/camera-shop-poetic-effect.png` | 用店面质量、湿地节奏和一条暖色灯光路径构成无字诗性面板，不复刻建筑轮廓。 |
| Photo Abstract Editorial | `adult-reunion-source.png` | `public/generated/studies/photo-abstract-editorial/reunion-relations-editorial-effect.png` | 完整五人来源区配五个重心、桌面遮挡、向内手势和暖色注意锚；面板不画人形图标。 |
| Photo Abstract Editorial | `season-seed-library-source.png` | `public/generated/studies/photo-abstract-editorial/greenhouse-season-relations-effect.png` | 完整四季来源板配共享温室轴、四档植物密度和单一蓝色连接线，不把每季重画成小插图。 |
| Photo to Zine Postcard | `night-camera-shop-source.png` | `public/generated/studies/photo-to-zine-postcard/camera-shop-night-postcard-effect.png` | 同板完整展示 2:3 正反面；正面含完整夜店照片、灯门主 motif 和恰好三枚来源色块，背面保留可书写网格。 |
| Photo to Zine Postcard | `florist-crosswalk-source.png` | `public/generated/studies/photo-to-zine-postcard/florist-rain-postcard-effect.png` | 同板完整展示人物照片正面、花束与轨道路由主 motif、三枚来源色块及可书写背面。 |

## 24 张效果文件指纹

SHA-256 用于确认当前本地研究环境中的最终选择没有被替换。由于 `public/generated/` 被 Git 忽略，这些指纹不能让全新 clone 自动取得图片。

| 实验 ID | 最终效果路径 | SHA-256 |
| --- | --- | --- |
| `vocalist-afterglow-editorial` | `public/generated/studies/daily-photo-playground/vocalist-afterglow-editorial-effect.png` | `85cae87bc9643b24cfaf506be5520dd0c54d00420518c40ebb468490173fe861` |
| `night-camera-shop-editorial` | `public/generated/studies/daily-photo-playground/night-camera-shop-editorial-effect.png` | `5cab2cc9ad1798028e85dd6c1884639884f3cc53ef8a7ca7d1b58048f01e131f` |
| `florist-crosswalk-five-mark` | `public/generated/studies/dyy-photo-deconstruct/florist-crosswalk-five-mark-effect.png` | `25d18a01926c1f2b03f1164ca14f040f09e5b12a8c02912850134c0dc0c81bf0` |
| `music-box-minimal-mark` | `public/generated/studies/dyy-photo-deconstruct/music-box-minimal-mark-effect.png` | `9a49ddd51cfc9b9e9fde750f108a3907aeee4115efcc5e0b69523cef60ed0ac9` |
| `camera-shop-night-balance` | `public/generated/studies/travel-photo-abstraction/camera-shop-night-balance-effect.png` | `870ecbd6b5270348f4c4698cea7b24d5e5f1151b72e2952a21c10d998e6f7456` |
| `florist-rain-balance` | `public/generated/studies/travel-photo-abstraction/florist-rain-balance-effect.png` | `35125173251cc2a071ab6d2f9b59599887687a7d79418e628ebe5f3b678b75c8` |
| `reunion-table-collage` | `public/generated/studies/scenes-gathered-zine/reunion-table-collage-effect.png` | `94a631c3b3dd0f8c327c5efd54093422e99a933aa60e60248b044ea9ac636998` |
| `night-camera-shop-gathered` | `public/generated/studies/scenes-gathered-zine/night-camera-shop-gathered-effect.png` | `472f185095d2aeaae16a4180b1d83011c259b300aba56c4f1d4c8ceebbadf576` |
| `vocalist-after-note-distillation` | `public/generated/studies/scene-distillation-zine/vocalist-after-note-distillation-effect.png` | `99304974d5156f20172fccf0dd272aad3d5fde99fecf80126e58f4125ed90aba` |
| `camera-shop-night-distillation` | `public/generated/studies/scene-distillation-zine/camera-shop-night-distillation-effect.png` | `dee7632e9c5935ee9c6e1c3a978be8e08796dd69910af81a884dd69f1f106da3` |
| `music-box-missing-star` | `public/generated/studies/gc-minimal-zine-poster/music-box-missing-star-effect.png` | `ec527ecf0d41f7346a64a30d254d3b03b722b698410ee272af5d4f52c5c14c06` |
| `reunion-last-toast` | `public/generated/studies/gc-minimal-zine-poster/reunion-last-toast-effect.png` | `1fad545feecac64045c8b95be1af1cd78ac8060cf3fde220ac9c387708972a51` |
| `night-camera-shop-memory` | `public/generated/studies/photo-revival/night-camera-shop-memory-effect.png` | `79e121d4b342ef48d0bc56caaa8af0b1b3fd2f40f87db7c050ae93ecc252b318` |
| `florist-rain-memory` | `public/generated/studies/photo-revival/florist-rain-memory-effect.png` | `5e8e9c7a8043a8dc8136305c3b4b632c363584d7c5220185d037495e9abf7e7c` |
| `reunion-multi-subject-halftone` | `public/generated/studies/pixel-style-poster/reunion-multi-subject-halftone-effect.png` | `378444c25588fcd28085e215d0616bca8bd199a4143ccfda78c43f2c7aff4f83` |
| `music-box-material-halftone` | `public/generated/studies/pixel-style-poster/music-box-material-halftone-effect.png` | `8c736df57b32287f80bf35d366e0fda862bf0383dd7d76ab44dde4b0d799401d` |
| `music-box-relic` | `public/generated/studies/photo-relic-editorial/music-box-relic-effect.png` | `6c45e826fb76ee737bb1f2fd753572be278980a4f9a2e23503a13b786dc7864f` |
| `interchange-crowd-relic` | `public/generated/studies/photo-relic-editorial/interchange-crowd-relic-effect.png` | `f56ee8d335bdb4fcdc98c5fa8070d13488ba8a4b5f632f0d1f90de5d0933c22c` |
| `florist-crosswalk-poetic` | `public/generated/studies/poetic-line-zine-poster/florist-crosswalk-poetic-effect.png` | `1bfcfe24e7d8a72ee395a7421c5d0c4af99c3fb8f79f74fbf0fe6b4a76bc80cd` |
| `camera-shop-poetic` | `public/generated/studies/poetic-line-zine-poster/camera-shop-poetic-effect.png` | `5ec02331f31a5137e3244b2abafa0307af910b80a8b6720c554ac6702fb3eed5` |
| `reunion-relations-editorial` | `public/generated/studies/photo-abstract-editorial/reunion-relations-editorial-effect.png` | `0f3736ef5afcf776760458647d6cefc9b8bca0992ad6763ef6f562b81d0fcec0` |
| `greenhouse-season-relations` | `public/generated/studies/photo-abstract-editorial/greenhouse-season-relations-effect.png` | `1fdb52e8dd1f65012c32e4e5c197845af6b390066ec406c3918d81b84cad160f` |
| `camera-shop-night-postcard` | `public/generated/studies/photo-to-zine-postcard/camera-shop-night-postcard-effect.png` | `fc740903e27ceeb8d8c3b65cd18c1b979a445de339e6a1c979df58eaf578cd7c` |
| `florist-rain-postcard` | `public/generated/studies/photo-to-zine-postcard/florist-rain-postcard-effect.png` | `9f61bae39ea4241b5c2503371d936851f8e71f70208994d94228f07e8690ff91` |

## 真实性边界

- 这些效果均由图像模型基于本地来源重构；图中出现的照片窗视觉上保持完整构图，但不等于源文件逐像素嵌入。
- 它们不是实际运行对应上游 Skill 得到的原生输出，只能作为本地能力语法研究和后续原生复测的假设证据。
- Travel、Poetic、Scenes、Photo Relic、Photo Abstract 与 Postcard 若进入要求原照像素绝对不变的正式生产，必须改用确定性脚本重新嵌入来源图并执行像素检查。
- 五人聚会来源在 GC 与 Pixel 两条效果中被压缩为四人。页面把它作为能力限制公开展示，不把这两张效果用于成员档案、口述史身份记录或任何要求人数精确的任务。
- Postcard 只是完整数字产品研究板，尚未证明纸张、出血、色彩管理、裁切和邮寄结果。
- 每组卡片中的产品表面与环境由 HTML/CSS 复用对应效果图，不是独立生成资产，也不证明真实印刷、屏幕部署或客户采用。
- 当前资产记录只有最终提示摘要和文件指纹；缺少完整提示历史、模型版本、seed 与候选选择过程，因此不宣称逐像素可重生成。
- 当前资产位于本地忽略目录；逐项权利复核和发布 allowlist 完成前，不公开部署。
