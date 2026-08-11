# Revision 10：13 个 Skill 的独立原图扩样

> Web 入口：[研究总索引](http://localhost:4317/research) · [多原图实验室](http://localhost:4317/labs/multi-source) · [统一原图横评](http://localhost:4317/comparison)

## 这轮为什么要做

此前站点已经有 88 组图片 SOURCE → 图片 EFFECT，但全局只来自 18 个图片路径。这个口径适合说明“已有多少效果证据”，不等于已经用 88 张独立原图验证能力。

Revision 10 改变的是来源多样性：为全部 13 个 Skill 各增加一张不复用的新 SOURCE，并为它生成或构建一张对应 EFFECT。完成后，多原图实验室共有 101 组图片配对、31 个不同来源路径、103 个静态效果和 105 个总效果证据。

## 证据怎么读

- **SOURCE**：为本研究生成的虚构输入。人物均为成年人，不对应真实人物、客户、新闻现场或品牌。
- **EFFECT**：依据上游公开描述中的高层规则制作的本地概念研究。除 Photo Distill 的 clean-room SVG 外，不能把这些图称为上游 Skill 的实际运行输出。
- **成立**：当前图片足以回答本组定义的概念能力问题；不等于生产可用、像素保真或实体打样通过。
- **部分成立**：视觉方向成立，但仍缺少像素锁定、成员保真、物理印刷或其他生产证据。

每张 SOURCE 和 EFFECT 都按完整画幅展示。生成式结果不承担人脸相似度、纪实真实性、商品颜色校准或技术测量责任。

## 13 个独立题材

| Skill | 独立 SOURCE | 核心能力问题 | 结论口径 | 首选使用场景 |
| --- | --- | --- | --- | --- |
| Daily Photo Playground | 雨后收工的成年女陶艺师 | 人物、器物、雨夜反射和多组高彩色能否被重排成清楚编辑层级 | 成立 | 手作工作室故事、人物专访封面 |
| DYY Photo Deconstruct | 工业屋顶风中的成年女舞者 | 最少 mark 能否表达动作、落点和环境轴 | 成立 | 舞蹈节节目页、动作研究卡 |
| Travel Photo Abstraction | 火山海岸的红衣成年女旅行者 | 照片证据区与关系面板能否分工 | 部分成立：未做像素锁定 | 旅行随笔、地貌展览导语 |
| Scenes Gathered | 三位成年女性暴雨后修复温室 | 多人协作能否围绕一个结构关系聚合 | 部分成立：生成式成员保真有限 | 社区项目故事墙、年度报告 |
| Scene Distillation | 沙漠观测站的成年女天文学家 | 移除照片后能否只靠色场与轨迹传达情绪命题 | 成立 | 科学随笔、天文节主视觉 |
| GC Minimal Zine Poster | 旧短波收音机与橙色电线环 | 丰富静物能否压缩成一个高彩隐喻 | 成立 | 实验音乐海报、广播档案封面 |
| Photo Revival | 黄昏缝纫桌旁的虚构成年老年女裁缝 | 全量重绘能否保留人物、场景和少数记忆细节 | 成立 | 家族记忆小册、手艺人口述史 |
| Pixel Style Poster | 夜市成年女鼓手近景 | 细密点阵能否区分面部、织物、金属和背景网频 | 成立 | 音乐节人物海报、唱片内页 |
| Photo Relic Editorial | 暴风前的成年女灯塔守护员 | 下半区能否只选择一个 relic 而不复制整张照片 | 部分成立：未做像素锁定 | 海事口述史、沿海文化刊物 |
| Photo Distill | 高视角彩色盐田与唯一蓝色车辆 | 纯代码关系蒸馏能否在新题材上保持可重复 | 成立 | 地景研究海报、参数化系列视觉 |
| Poetic Line Zine Poster | 雾中收琴的成年女大提琴手 | 非高潮动作能否路由为 gesture／mass／rhythm／path | 部分成立：未做像素锁定 | 音乐季节目册、演奏者随笔 |
| Photo Abstract Editorial | 温室螺旋楼梯下的成年女植物学家 | 关系 marks 能否比复杂轮廓更清楚 | 部分成立：未做像素锁定 | 建筑刊物、空间观察课程 |
| Photo to Zine Postcard | 日出水上市场的成年女船贩 | 丰富场景能否进入固定正反面产品系统 | 部分成立：未做实体打样 | 旅行纪念、酒店欢迎卡 |

## 资产索引

| Skill slug | SOURCE | EFFECT | EFFECT 类型 |
| --- | --- | --- | --- |
| `daily-photo-playground` | `public/generated/source/revision10/daily-ceramicist-rain-source.png` | `public/generated/studies/daily-photo-playground/revision10-ceramicist-editorial-effect.png` | 生成式本地概念效果 |
| `dyy-photo-deconstruct` | `public/generated/source/revision10/dyy-rooftop-dancer-source.png` | `public/generated/studies/dyy-photo-deconstruct/revision10-rooftop-dancer-effect.png` | 生成式本地概念效果 |
| `travel-photo-abstraction` | `public/generated/source/revision10/travel-volcanic-coast-source.png` | `public/generated/studies/travel-photo-abstraction/revision10-volcanic-coast-effect.png` | 生成式本地概念效果 |
| `scenes-gathered-zine` | `public/generated/source/revision10/scenes-greenhouse-repair-source.png` | `public/generated/studies/scenes-gathered-zine/revision10-greenhouse-repair-effect.png` | 生成式本地概念效果 |
| `scene-distillation-zine` | `public/generated/source/revision10/distillation-desert-astronomer-source.png` | `public/generated/studies/scene-distillation-zine/revision10-desert-astronomer-effect.png` | 生成式本地概念效果 |
| `gc-minimal-zine-poster` | `public/generated/source/revision10/gc-antique-radio-source.png` | `public/generated/studies/gc-minimal-zine-poster/revision10-radio-signal-effect.png` | 生成式本地概念效果 |
| `photo-revival` | `public/generated/source/revision10/revival-seamstress-source.png` | `public/generated/studies/photo-revival/revision10-seamstress-memory-effect.png` | 生成式本地概念效果 |
| `pixel-style-poster` | `public/generated/source/revision10/pixel-night-drummer-source.png` | `public/generated/studies/pixel-style-poster/revision10-night-drummer-halftone-effect.png` | 生成式本地概念效果 |
| `photo-relic-editorial` | `public/generated/source/revision10/relic-lighthouse-keeper-source.png` | `public/generated/studies/photo-relic-editorial/revision10-lighthouse-relic-effect.png` | 生成式本地概念效果 |
| `photo-distill` | `public/generated/source/revision10/distill-salt-pans-source.png` | `public/generated/studies/photo-distill/revision10-salt-pans-relations-effect.svg` | clean-room 确定性 SVG |
| `poetic-line-zine-poster` | `public/generated/source/revision10/poetic-fog-cellist-source.png` | `public/generated/studies/poetic-line-zine-poster/revision10-fog-cellist-effect.png` | 生成式本地概念效果 |
| `photo-abstract-editorial` | `public/generated/source/revision10/abstract-conservatory-source.png` | `public/generated/studies/photo-abstract-editorial/revision10-conservatory-relations-effect.png` | 生成式本地概念效果 |
| `photo-to-zine-postcard` | `public/generated/source/revision10/postcard-floating-market-source.png` | `public/generated/studies/photo-to-zine-postcard/revision10-floating-market-postcard-effect.png` | 生成式数字产品研究 |

## 方法

1. 为每个 Skill 选择一个新的题材，不在本批 13 项中复用 SOURCE。
2. 先生成完整 SOURCE，检查人物数量、动作、主要物件、环境关系和四边安全区。
3. 把该本地 SOURCE 作为唯一编辑输入，依据该 Skill 的高层视觉语法生成 EFFECT；Photo Distill 改用独立代码构建的自足 SVG。
4. 检查完整画幅、关键保留项、意外损失、可用场景和不能证明的事项。
5. 把结果接入 `/labs/multi-source`，同时增加配对数与来源路径数，不用效果数量冒充独立样本量。

## 进入真实生产还要做什么

- 需要照片保真的路线：用确定性脚本嵌入 SOURCE，并做尺寸标准化后的像素差验证。
- 多人物路线：增加成员计数、逐人授权和身份／面孔保真检查；整图生成不能承担档案责任。
- 印刷产品路线：补刀模、出血、纸张、网点、套色、CMYK 与实体样张，不把网页数字预演称为成品。
- 系列化路线：至少再加入 6–10 张覆盖不同光线、景别和密度的授权输入，记录成功、部分成立与失败。
- 公开发布：逐项建立生成资产和上游样例的权利 allowlist；当前目录继续保持本地研究用途。

## 完成与验收

- 13 个 Skill 均有 1 个本批次唯一 SOURCE 和 1 个对应 EFFECT；不存在缺失路径、重复 SOURCE、重复 EFFECT 或跨 Skill 误配。
- 12 个栅格 EFFECT 均只引用各自 SOURCE 生成；Photo Distill 的 EFFECT 是不含照片像素、外部引用和文字的确定性 SVG。
- 所有栅格图都从项目最终路径按原始尺寸检查；页面与沉浸查看器统一使用 `contain`，不以裁切隐藏素材问题。
- 多原图实验室最终口径为 101 组图片配对／31 个来源路径；另有 2 个文字驱动静态效果与 2 个实时交互，因此全站共有 103 个静态／105 个总效果证据。
- Vinext 生产构建成功，自动回归 18／18 通过；覆盖资源可读性、13 个 Skill 路由、研究索引、导航、计数、唯一批次、沉浸查看与完整画幅。
- 当前结论只服务于本地研究。生成式图片不是上游官方输出，数字产品预演不是实体生产证据，公开部署仍需逐项权利清单与发布 allowlist。

## 维护规则

- 结构化页面数据在 `app/data/revision10-independent-experiments.ts`。
- 总量适配与来源去重在 `app/data/multi-source-experiments.ts`。
- 设计契约、覆盖记录和最终验收保存在 `REFINEMENT.md`。
- 新增批次必须同时更新本报告、研究总索引、实验室统计和资源回归；不得只添加图片文件。
