# Revision 11：反向题材压力测试与产品语境预演

> Web 入口：[研究总索引](http://localhost:4317/research) · [多原图实验室](http://localhost:4317/labs/multi-source) · [统一原图横评](http://localhost:4317/comparison)

## 这轮增加了什么

Revision 10 已经让 13 个 Skill 各拥有一张不复用的新 SOURCE。Revision 11 不再围绕那 13 张图继续微调，而是给每个 Skill 再增加一个与上一轮在题材、密度、光线、人物依赖或空间类型上相反的输入。

每组交付四层内容：

1. 一张本批次唯一的完整 SOURCE；
2. 一张按对应 Skill 高层规则制作的完整 EFFECT；
3. 对“为什么换这个题材、证明与不证明什么”的明确结论；
4. 把同一 EFFECT 放入产品画布和使用环境的 HTML/CSS 数字预演。

产品预演不增加新的效果图计数，也不代表实体印刷、客户部署或现场安装。它只回答“这类效果最可能作为哪种产品继续发展，以及进入真实生产还缺什么”。

## 13 个反向角度

| Skill | R10 角度 | R11 反向角度 | 主要追问 | 数字应用载体 |
| --- | --- | --- | --- | --- |
| Daily Photo Playground | 雨夜街边陶艺师 | 暖色室内女烘焙师与密集食物 | 高彩环境是否仍有单一故事中心 | 人物专题开篇 |
| DYY Photo Deconstruct | 人类舞者 | 白鹭起飞与水面反作用 | 最小 mark 是否依赖人体识别 | 自然观察卡 |
| Travel Photo Abstraction | 开阔火山海岸 | 密集雨夜换乘桥 | 高噪声城市能否保持证据／关系分工 | 城市故事展板 |
| Scenes Gathered | 多人协作事件 | 无人服装间与群体静物 | 没有人脸时能否靠物件聚合叙事 | 剧院档案墙 |
| Scene Distillation | 干燥开阔、设备主导的沙漠观测站 | 低照度雪夜渡口、人物等待与线性栈桥 | 删除对象后情绪命题是否仍成立 | 诗集封面 |
| GC Minimal | 单一旧收音机 | 人物、书架与停电事件 | 是否能从完整故事中只选一个隐喻 | 阅读节海报 |
| Photo Revival | 人物记忆 | 无人物旧自行车 | 物件关系能否代替面孔承载记忆 | 旧物记忆册 |
| Pixel Style | 人物大近景 | 夜行列车与建筑窗格 | 网频是否能脱离人脸建立层级 | 唱片封套 |
| Photo Relic | 户外人物与警示旗 | 无人废弃影院与唯一红椅 | 单一异常物能否承担场所余韵 | 文化刊跨页 |
| Photo Distill | 静态盐田网格 | 密集交叉人流 | 代码关系语法能否表达方向与空隙 | 人流研究图 |
| Poetic Line | 人物收琴动作 | 风驱动的屋顶布匹 | 四类关系路由是否依赖人物 gesture | 海风诗集封面 |
| Photo Abstract | 高挑温室建筑 | 近距离鱼市桌面 | 拥挤材料能否压缩成轴、遮挡与流向 | 空间观察跨页 |
| Photo to Zine Postcard | 暖色水上市集 | 冷色山地缆车站 | 固定双面系统能否跨气候与交通题材 | 山地旅行明信片 |

## 证据边界

- SOURCE 均为本项目生成的虚构研究输入；人物均为成年人，不对应真实人物、客户、新闻现场或品牌。
- 栅格 EFFECT 是以对应 SOURCE 为唯一编辑输入制作的本地概念研究，不是上游 Skill 的真实运行输出。
- Photo Distill 使用独立 clean-room 代码生成自足 SVG；不复制上游代码、模板或无许可资产，也不嵌入 SOURCE 像素。
- “成立”只表示当前案例回答了自己定义的视觉问题；“部分成立”表示方向可读，但仍缺像素锁定、身份保真、实体印刷或其他生产证据。
- 产品画布与环境预演会重复显示同一 EFFECT，因此不计作新图片，不冒充真实成品。

## 资产索引

| Skill slug | SOURCE | EFFECT | 产品方向 |
| --- | --- | --- | --- |
| `daily-photo-playground` | `public/generated/source/revision11/daily-dawn-baker-source.png` | `public/generated/studies/daily-photo-playground/revision11-dawn-baker-editorial-effect.png` | 编辑开篇 |
| `dyy-photo-deconstruct` | `public/generated/source/revision11/dyy-heron-takeoff-source.png` | `public/generated/studies/dyy-photo-deconstruct/revision11-heron-five-mark-effect.png` | 观察卡 |
| `travel-photo-abstraction` | `public/generated/source/revision11/travel-night-courier-source.png` | `public/generated/studies/travel-photo-abstraction/revision11-night-courier-abstraction-effect.png` | 展览故事板 |
| `scenes-gathered-zine` | `public/generated/source/revision11/scenes-backstage-wardrobe-source.png` | `public/generated/studies/scenes-gathered-zine/revision11-backstage-gathered-effect.png` | 档案墙 |
| `scene-distillation-zine` | `public/generated/source/revision11/distillation-snow-ferry-source.png` | `public/generated/studies/scene-distillation-zine/revision11-snow-ferry-distillation-effect.png` | 诗集封面 |
| `gc-minimal-zine-poster` | `public/generated/source/revision11/gc-blackout-librarian-source.png` | `public/generated/studies/gc-minimal-zine-poster/revision11-blue-book-anchor-effect.png` | 活动海报 |
| `photo-revival` | `public/generated/source/revision11/revival-bicycle-memory-source.png` | `public/generated/studies/photo-revival/revision11-bicycle-memory-effect.png` | 记忆册封面 |
| `pixel-style-poster` | `public/generated/source/revision11/pixel-neon-train-source.png` | `public/generated/studies/pixel-style-poster/revision11-neon-train-halftone-effect.png` | 唱片封套 |
| `photo-relic-editorial` | `public/generated/source/revision11/relic-abandoned-cinema-source.png` | `public/generated/studies/photo-relic-editorial/revision11-cinema-relic-effect.png` | 文化刊跨页 |
| `photo-distill` | `public/generated/source/revision11/distill-crosswalk-flow-source.png` | `public/generated/studies/photo-distill/revision11-crosswalk-flow-effect.svg` | 关系研究图 |
| `poetic-line-zine-poster` | `public/generated/source/revision11/poetic-rooftop-laundry-source.png` | `public/generated/studies/poetic-line-zine-poster/revision11-rooftop-laundry-effect.png` | 诗集封面 |
| `photo-abstract-editorial` | `public/generated/source/revision11/abstract-fish-market-source.png` | `public/generated/studies/photo-abstract-editorial/revision11-fish-market-relations-effect.png` | 编辑跨页 |
| `photo-to-zine-postcard` | `public/generated/source/revision11/postcard-funicular-source.png` | `public/generated/studies/photo-to-zine-postcard/revision11-funicular-postcard-effect.png` | 双面明信片 |

## 数量口径

当前多原图实验室包含：

- 13 组 Revision 11 反向题材压力测试；
- 13 组 Revision 10 独立原图扩样；
- 37 组统一湖岸基线；
- 20 组图片计划交付；
- 4 组 Photo Relic 受控配对；
- 27 组跨题材能力探索。

合计 **114 组图片 SOURCE → 图片 EFFECT**，来自 **44 个不同图片来源路径**。另有 2 个文字驱动静态效果和 2 个实时交互，因此站点口径为 **116 个静态效果／118 个总效果证据**。13 个产品数字预演复用 Revision 11 的 13 张 EFFECT，不重复计数。

## 进入真实生产的共同要求

- 照片保真路线：改用确定性合成器嵌入授权 SOURCE，并做像素差与人物／物件计数检查。
- 出版与活动物料：建立可编辑标题、正文、安全区、裁版和多尺寸缩略规则。
- 印刷与包装：补出血、刀模、纸张、CMYK、最小网点、套色偏差和实体样张。
- 展览与空间：按观看距离、安装照明、无障碍文字和版权说明重新组织信息层。
- 研究与教育：补真实数据来源、专家审核、采样方法和不能用于决策的限制声明。

## 完成与验收

- 13 个 Skill 均有 1 个 Revision 11 案例；SOURCE／EFFECT 共 26 条唯一路径，文件哈希也 26／26 唯一。
- 25 张栅格图均为 1024×1536，Photo Distill EFFECT 为 1200×1600 自足 SVG；页面和产品预演全部使用 `contain`，不以裁切制造展示效果。
- Photo Distill SVG 连续生成两次哈希一致；它不含照片像素、外部资源、可见文字或脚本。
- 自动构建和 19 项回归全部通过，lint 与差异检查通过；13 个 Skill 的配对数、来源数、stress case 和数字应用预演均逐页核对。
- 本地运行入口 `http://localhost:4317/labs/multi-source`、研究索引及代表性 PNG／SVG 均已返回 200。
- 生成资产仍受本地忽略规则保护；在完成逐项权利 allowlist 前，本报告不构成公开部署授权。

## 维护位置

- 结构化案例：`app/data/revision11-stress-experiments.ts`
- 多批次适配与计数：`app/data/multi-source-experiments.ts`
- 数字应用预演：`app/components/DigitalApplicationPreview.tsx`
- 设计契约与验收：`REFINEMENT.md`
- Photo Distill 生成器：`scripts/generate-revision11-photo-distill.mjs`

公开发布前仍需逐项完成生成资产和上游样例的权利 allowlist；当前内容继续限定为本地研究。
