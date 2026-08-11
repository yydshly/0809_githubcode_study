import type { DemoImage } from "@/app/data/skills";

export type ResearchSupplement = {
  strengths: string[];
  boundaries: string[];
  checks: { label: string; question: string }[];
  relatedSlugs: string[];
};

export const researchSupplements: Record<string, ResearchSupplement> = {
  "daily-photo-playground": {
    strengths: ["能把普通照片迅速转成有栏目感的高张力页面", "原照窗口让激进重构仍保留来源证据"],
    boundaries: ["不适合需要完整保留全部照片细节的纪实交付", "主体越界与高饱和容易在复杂人物照片上失控"],
    checks: [
      { label: "原照证据", question: "完整小照片窗口是否真实存在且没有被重画？" },
      { label: "主体层级", question: "第一眼是否能识别被放大的主主体？" },
      { label: "来源颜色", question: "几何和色场是否能追溯到输入照片？" },
      { label: "留白连续", question: "外页留白是否连续，而不是零碎孔洞？" },
    ],
    relatedSlugs: ["scenes-gathered-zine", "photo-abstract-editorial"],
  },
  "dyy-photo-deconstruct": {
    strengths: ["能迫使研究者识别照片中真正不可删除的线索", "无文字和大留白使视觉语法非常纯净"],
    boundaries: ["不承担照片真实性或身份相似度", "高信息密度场景可能被压缩到不可辨认"],
    checks: [
      { label: "标记数量", question: "是否只保留了最少必要记号？" },
      { label: "无字规则", question: "画面中是否完全没有标题、标签和伪文字？" },
      { label: "空纸比例", question: "主体是否仍是纸面中的小型簇？" },
      { label: "来源可追溯", question: "每个形状是否都能对应一个来源事实？" },
    ],
    relatedSlugs: ["photo-revival", "scene-distillation-zine"],
  },
  "travel-photo-abstraction": {
    strengths: ["把随机生成严格限制在抽象面板", "原照锁定和 fail-closed 验证适合高可信交付"],
    boundaries: ["自定义许可禁止修改、衍生与再发布", "其价值主要在管线契约，不应被误解为万能画风"],
    checks: [
      { label: "来源锁定", question: "分析、拼装与验证是否使用同一个原图文件？" },
      { label: "像素忠实", question: "最终照片区域是否通过像素级检查？" },
      { label: "职责隔离", question: "图像模型是否只生成了干净面板？" },
      { label: "交付门禁", question: "只有 DELIVERY PASS 的候选才会被交付吗？" },
    ],
    relatedSlugs: ["poetic-line-zine-poster", "photo-abstract-editorial"],
  },
  "scenes-gathered-zine": {
    strengths: ["真实照片与抽象画面可以保持平等叙事角色", "撕纸结构能自然连接纪实与手工媒介"],
    boundaries: ["当前仓库已删除 Skill，只能依据历史固定提交研究", "复杂拼贴容易退化为装饰性素材堆叠"],
    checks: [
      { label: "照片锚点", question: "真实照片是否仍可辨认且没有被插画替代？" },
      { label: "跨区关系", question: "照片和插画是否共享至少一个结构关系？" },
      { label: "结构颜色", question: "是否只有一个高彩结构色负责连接？" },
      { label: "材质克制", question: "撕纸和纤维是否服务于边界而非覆盖主体？" },
    ],
    relatedSlugs: ["daily-photo-playground", "scene-distillation-zine"],
  },
  "scene-distillation-zine": {
    strengths: ["能从照片中提炼可跨媒介迁移的情绪命题", "结果不依赖保留照片也能形成独立画面"],
    boundaries: ["抽象结果无法承担事实证明或照片保真", "情绪命题写得含糊时，形式容易变成任意装饰"],
    checks: [
      { label: "命题清晰", question: "是否能用一句话说清中心情绪和张力？" },
      { label: "形式对应", question: "每个主要形状是否对应命题中的一个关系？" },
      { label: "独立成立", question: "不看原图时，结果是否仍是一张完整作品？" },
      { label: "二次联想", question: "回看原图后，是否能解释颜色、重量和间隔？" },
    ],
    relatedSlugs: ["dyy-photo-deconstruct", "gc-minimal-zine-poster"],
  },
  "gc-minimal-zine-poster": {
    strengths: ["输入范围广，适合把文本、主题或照片编译成海报", "隐喻、色锚和版式变体轴便于形成系列"],
    boundaries: ["图像模型生成的文字仍可能拼写错误", "规则多但缺少确定性合成时，跨轮次稳定性有限"],
    checks: [
      { label: "单一命题", question: "海报是否只表达一个核心视觉隐喻？" },
      { label: "高彩锚点", question: "高饱和颜色是否集中在一个主要事件？" },
      { label: "文字唯一", question: "标题是否拼写正确且只出现一次？" },
      { label: "留白音量", question: "留白是否足以让微型内容保持克制？" },
    ],
    relatedSlugs: ["scene-distillation-zine", "pixel-style-poster"],
  },
  "photo-revival": {
    strengths: ["规则薄且容易理解，适合作为完全重绘基线", "手绘材料能降低照片的记录感并增加私人记忆感"],
    boundaries: ["不保证原照像素、面孔或物体比例忠实", "工程验证较弱，结果主要依赖目测"],
    checks: [
      { label: "主体保留", question: "主主体和场景是否仍清楚可辨？" },
      { label: "记忆细节", question: "是否只保留一至两个真正重要的细节？" },
      { label: "材料统一", question: "铅笔、水彩和高彩是否属于同一手绘语言？" },
      { label: "真实性声明", question: "页面是否明确说明这是重绘而非照片修复？" },
    ],
    relatedSlugs: ["dyy-photo-deconstruct", "photo-relic-editorial"],
  },
  "pixel-style-poster": {
    strengths: ["把点阵密度变成空间、明暗和层级工具", "失败类型路由比笼统重试更容易迭代"],
    boundaries: ["细密网点在小尺寸或压缩后可能产生摩尔纹", "若像素尺度失控，容易退化成复古游戏风"],
    checks: [
      { label: "材料定位", question: "结果更像编辑半调，而不是大块 8-bit 像素吗？" },
      { label: "密度层级", question: "主体、背景和文字是否使用不同网点密度？" },
      { label: "缩略可读", question: "在手机缩略尺寸下主体是否仍然清楚？" },
      { label: "失败路由", question: "重试是否针对锯齿、糊块或层级问题？" },
    ],
    relatedSlugs: ["gc-minimal-zine-poster", "photo-distill"],
  },
  "photo-relic-editorial": {
    strengths: ["照片与记忆版画能形成明确的双时间结构", "配方轴适合发展成连续摄影书或城市系列"],
    boundaries: ["自动真实性验证弱于工程型混合管线", "若主 relic 不够集中，下方面板会变成元素清单"],
    checks: [
      { label: "双重角色", question: "照片和 relic 是否分别承担证据与记忆？" },
      { label: "单一遗迹", question: "下方面板是否存在一个清楚的主 relic？" },
      { label: "跨区呼应", question: "结构、颜色或动作是否连接上下两区？" },
      { label: "标题克制", question: "文字模式是否服务于系列而非抢夺主体？" },
    ],
    relatedSlugs: ["photo-revival", "photo-abstract-editorial"],
  },
  "photo-distill": {
    strengths: ["全代码路径可复现、可参数化、可做视觉回归", "输出指标可以在浏览器渲染后自动测量"],
    boundaries: ["上游没有正式许可证，只能做事实性架构观察与独立本地实现", "浏览器、字体与渲染版本仍会造成像素差异"],
    checks: [
      { label: "自足输出", question: "HTML/SVG 离线打开时是否仍能完整渲染？" },
      { label: "指标门槛", question: "着墨率、色锚占比和缩略可见性是否通过？" },
      { label: "重复渲染", question: "固定环境下重复导出是否在容差内一致？" },
      { label: "隐私脱敏", question: "GPS、EXIF 和私人文件名是否已经移除？" },
    ],
    relatedSlugs: ["pixel-style-poster", "travel-photo-abstraction"],
  },
  "poetic-line-zine-poster": {
    strengths: ["创意面板与确定性排印边界清楚", "题材路由和抽象强度让生成过程更可解释"],
    boundaries: ["上游无正式许可证，只适合架构研究", "质量分来自人工输入，不能误称为自动视觉评分"],
    checks: [
      { label: "无字面板", question: "生成模型输出是否完全不含文字？" },
      { label: "照片忠实", question: "拼回的原照区域是否通过像素检查？" },
      { label: "结构验证", question: "比例、面板角落和照片区域是否自动通过？" },
      { label: "评分来源", question: "人工评分与自动检查是否在报告中明确区分？" },
    ],
    relatedSlugs: ["travel-photo-abstraction", "photo-relic-editorial"],
  },
  "photo-abstract-editorial": {
    strengths: ["来源事实到抽象标记的对应关系容易解释", "照片区与象牙色面板构成轻量稳定的编辑模板"],
    boundaries: ["工程保障和验证仍主要依赖目测", "与其他照片 + 面板路线重叠较大，需要明确独特价值"],
    checks: [
      { label: "事实数量", question: "是否只选择了三至六个来源事实？" },
      { label: "标记追溯", question: "每个主要形状是否能回指一个事实？" },
      { label: "面板干净", question: "象牙色背景是否均匀且没有伪文字？" },
      { label: "标题克制", question: "标题是否保持二至五个英文词并且唯一？" },
    ],
    relatedSlugs: ["travel-photo-abstraction", "photo-relic-editorial"],
  },
  "photo-to-zine-postcard": {
    strengths: ["把视觉生成落到完整双面印刷产品", "色卡、元数据和书写功能都有明确数量规则"],
    boundaries: ["艺术效果必须服从 2:3、书写区和印刷安全区", "仅看正面会遗漏这项 Skill 最重要的产品能力"],
    checks: [
      { label: "双面完整", question: "正面和背面是否都已生成并保持 2:3？" },
      { label: "元素数量", question: "是否只有一个主手绘元素和至多一个辅形？" },
      { label: "三枚色卡", question: "是否恰好三种颜色且来自输入照片？" },
      { label: "书写功能", question: "背面的地址、邮票和书写区是否真正可用？" },
    ],
    relatedSlugs: ["daily-photo-playground", "photo-relic-editorial"],
  },
};

export const extraUpstreamDemos: Record<string, DemoImage[]> = {
  "dyy-photo-deconstruct": [
    { src: "https://raw.githubusercontent.com/121dyy/dyy_photo_deconstruct/42e637e8875dafeb4ccf2ab5a738e4dca41c8f30/examples/2.jpg", alt: "上游极简样例四", caption: "补充样例：观察不同题材如何缩减到相同的最小标记纪律。" },
    { src: "https://raw.githubusercontent.com/121dyy/dyy_photo_deconstruct/42e637e8875dafeb4ccf2ab5a738e4dca41c8f30/examples/3.jpg", alt: "上游极简样例五", caption: "补充样例：比较剪影与淡墨块承担的信息差异。" },
    { src: "https://raw.githubusercontent.com/121dyy/dyy_photo_deconstruct/42e637e8875dafeb4ccf2ab5a738e4dca41c8f30/examples/5.jpg", alt: "上游极简样例六", caption: "补充样例：检查大面积空纸是否仍能保持主体可读。" },
  ],
  "travel-photo-abstraction": [
    { src: "https://raw.githubusercontent.com/Evianis/travel-photo-abstraction/96e387635edf05bc7e798428a5db11dbf48f46c1/showcase/bloom-veil.png", alt: "上游 bloom veil 样例", caption: "补充样例：颜色角色和遮挡关系进入抽象面板。" },
    { src: "https://raw.githubusercontent.com/Evianis/travel-photo-abstraction/96e387635edf05bc7e798428a5db11dbf48f46c1/showcase/night-castle.png", alt: "上游 night castle 样例", caption: "补充样例：夜景输入仍维持照片锁定和面板分工。" },
    { src: "https://raw.githubusercontent.com/Evianis/travel-photo-abstraction/96e387635edf05bc7e798428a5db11dbf48f46c1/showcase/rocky-coast.png", alt: "上游 rocky coast 样例", caption: "补充样例：复杂海岸被转译为轴线、重量和负空间。" },
  ],
  "scenes-gathered-zine": [
    { src: "https://raw.githubusercontent.com/Zeejay0/gathered-scenes-zine-skill/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e/examples/real-scene-collage/02-winter-crossing/source.jpg", alt: "上游冬季穿行输入", caption: "第二组输入：用于检查实景拼贴是否能迁移到冬季场景。" },
    { src: "https://raw.githubusercontent.com/Zeejay0/gathered-scenes-zine-skill/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e/examples/real-scene-collage/02-winter-crossing/result.jpg", alt: "上游冬季穿行结果", caption: "第二组结果：真实照片继续作为锚点，抽象区回应穿行关系。" },
  ],
  "scene-distillation-zine": [
    { src: "https://raw.githubusercontent.com/Zeejay0/gathered-scenes-zine-skill/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e/examples/image-distillation/02-snow-falls-lightly/source.jpg", alt: "上游雪落输入", caption: "第二组输入：低对比雪景提供不同的情绪命题。" },
    { src: "https://raw.githubusercontent.com/Zeejay0/gathered-scenes-zine-skill/b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e/examples/image-distillation/02-snow-falls-lightly/result.jpg", alt: "上游雪落蒸馏结果", caption: "第二组结果：不保留照片，以轻重和间隔重新形成场景。" },
  ],
  "gc-minimal-zine-poster": [
    { src: "https://raw.githubusercontent.com/LiamGvchi/gc-minimal-zine-poster/4cb0396ad4e834019f753b37e1c4f415f5e02026/examples/pause-map.jpeg", alt: "上游 pause map 样例", caption: "补充样例：内容被编译为停顿、路径和单一色锚。" },
    { src: "https://raw.githubusercontent.com/LiamGvchi/gc-minimal-zine-poster/4cb0396ad4e834019f753b37e1c4f415f5e02026/examples/shore-pause.jpeg", alt: "上游 shore pause 样例", caption: "补充样例：同类海岸主题如何避免重复构图。" },
    { src: "https://raw.githubusercontent.com/LiamGvchi/gc-minimal-zine-poster/4cb0396ad4e834019f753b37e1c4f415f5e02026/examples/typhoon-memory.jpeg", alt: "上游 typhoon memory 样例", caption: "补充样例：强事件主题仍保持留白与微型文字。" },
  ],
  "photo-revival": [
    { src: "https://raw.githubusercontent.com/dacnay816y62-hub/photo-revival/ca4c3c6c0f812355bd6d815d8a78652db801b7f1/examples/01_car_page.png", alt: "上游汽车重绘样例", caption: "补充样例：机械主体被转成轻量手绘记忆。" },
    { src: "https://raw.githubusercontent.com/dacnay816y62-hub/photo-revival/ca4c3c6c0f812355bd6d815d8a78652db801b7f1/examples/02_camera_page.png", alt: "上游相机重绘样例", caption: "补充样例：静物输入保留主体和少量记忆细节。" },
    { src: "https://raw.githubusercontent.com/dacnay816y62-hub/photo-revival/ca4c3c6c0f812355bd6d815d8a78652db801b7f1/examples/06_train_window_page.png", alt: "上游火车窗重绘样例", caption: "补充样例：观察窗框、风景与纸面留白的关系。" },
  ],
  "photo-relic-editorial": [
    { src: "https://raw.githubusercontent.com/wnby/photo-relic-editorial/2232da16afddc7940e2e2f280bfb85aa62da1bae/examples/paper-beijing/bird-nest-reflection.png", alt: "上游鸟巢倒影样例", caption: "补充样例：倒影被压缩为单一结构遗迹。" },
    { src: "https://raw.githubusercontent.com/wnby/photo-relic-editorial/2232da16afddc7940e2e2f280bfb85aa62da1bae/examples/paper-beijing/china-zun.png", alt: "上游中国尊样例", caption: "补充样例：高层建筑的竖向重量进入版画面板。" },
    { src: "https://raw.githubusercontent.com/wnby/photo-relic-editorial/2232da16afddc7940e2e2f280bfb85aa62da1bae/examples/paper-beijing/corner-tower-water.png", alt: "上游角楼水面样例", caption: "补充样例：建筑与水面共同形成跨区节奏。" },
  ],
  "photo-distill": [
    { src: "https://raw.githubusercontent.com/yangcodingmaster/photo-distill/e2708aeb7db4344dfb5577b5f12bcf57ded541ec/examples/23-sevensisters-poster.jpg", alt: "上游七姐妹代码海报", caption: "第二组结果：海岸关系由代码符号确定性表达。" },
    { src: "https://raw.githubusercontent.com/yangcodingmaster/photo-distill/e2708aeb7db4344dfb5577b5f12bcf57ded541ec/examples/20-blossoms-original.jpg", alt: "上游花朵原图", caption: "第三组输入：花朵数量、间隔和色彩成为关系量。" },
    { src: "https://raw.githubusercontent.com/yangcodingmaster/photo-distill/e2708aeb7db4344dfb5577b5f12bcf57ded541ec/examples/20-blossoms-poster.jpg", alt: "上游花朵代码海报", caption: "第三组结果：浏览器渲染并测量色锚与着墨率。" },
  ],
  "poetic-line-zine-poster": [
    { src: "https://raw.githubusercontent.com/zhu930824/poetic-line-zine-poster/61514e0652de45f30c74b01bc9a11cfbf25b5c52/docs/examples/riverside-tree.png", alt: "上游河畔树木样例", caption: "补充样例：树木题材由 mass 和 rhythm 共同路由。" },
    { src: "https://raw.githubusercontent.com/zhu930824/poetic-line-zine-poster/61514e0652de45f30c74b01bc9a11cfbf25b5c52/docs/examples/small-arrival.png", alt: "上游 small arrival 样例", caption: "补充样例：小型主体与扫线保持明显比例差。" },
    { src: "https://raw.githubusercontent.com/zhu930824/poetic-line-zine-poster/61514e0652de45f30c74b01bc9a11cfbf25b5c52/docs/examples/yellow-crane-railway.png", alt: "上游黄鹤铁路样例", caption: "补充样例：交通路径与建筑重量进入同一面板。" },
  ],
  "photo-abstract-editorial": [
    { src: "https://raw.githubusercontent.com/ZzzLc0405/photo-abstract-editorial/dada5237450d882168c22bae75119e8d24e784b5/assets/examples/case-2.jpg", alt: "上游抽象编辑样例四", caption: "补充样例：检查另一组空间事实的形状映射。" },
    { src: "https://raw.githubusercontent.com/ZzzLc0405/photo-abstract-editorial/dada5237450d882168c22bae75119e8d24e784b5/assets/examples/case-4.jpg", alt: "上游抽象编辑样例五", caption: "补充样例：比较照片区和抽象面板的视觉重量。" },
    { src: "https://raw.githubusercontent.com/ZzzLc0405/photo-abstract-editorial/dada5237450d882168c22bae75119e8d24e784b5/assets/examples/case-8.jpg", alt: "上游抽象编辑样例六", caption: "补充样例：观察短标题是否仍保持克制。" },
  ],
  "photo-to-zine-postcard": [
    { src: "https://raw.githubusercontent.com/Whiplashzeb/photo-to-zine-postcard/0091403bccb219d1be78c5be8552de29a6446f0a/assets/blue-arc-lake.png", alt: "上游蓝弧湖明信片", caption: "补充样例：湖景如何迁移到固定双面产品系统。" },
    { src: "https://raw.githubusercontent.com/Whiplashzeb/photo-to-zine-postcard/0091403bccb219d1be78c5be8552de29a6446f0a/assets/lake-at-dusk.png", alt: "上游黄昏湖面明信片", caption: "补充样例：低光色板仍严格提取三枚来源色。" },
    { src: "https://raw.githubusercontent.com/Whiplashzeb/photo-to-zine-postcard/0091403bccb219d1be78c5be8552de29a6446f0a/assets/turquoise-lake.png", alt: "上游青绿湖明信片", caption: "补充样例：系列变化集中在照片、主元素和色卡。" },
  ],
};
