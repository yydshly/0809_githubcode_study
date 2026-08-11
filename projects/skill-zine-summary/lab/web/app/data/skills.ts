export type DemoImage = {
  src: string;
  alt: string;
  caption: string;
};

export type ResearchCard = {
  title: string;
  description: string;
};

export type ExtensionExperiment = {
  kicker: string;
  title: string;
  question: string;
  source: DemoImage;
  effect: DemoImage;
  facts: string[];
  primaryRelic: string;
  recipe: string;
  checks: string[];
};

export type SkillStudy = {
  index: string;
  slug: string;
  name: string;
  repo: string;
  upstreamUrl: string;
  commit: string;
  route: string;
  fidelity: string;
  license: string;
  licenseNote: string;
  summary: string;
  proof: string;
  capability: string;
  principles: string[];
  useCases: ResearchCard[];
  upstreamDemos: DemoImage[];
  resultImages: DemoImage[];
  extensionExperiments?: ExtensionExperiment[];
  sourceFacts: string[];
  pipeline: string[];
  directions: ResearchCard[];
  nextDemos: ResearchCard[];
};

const commonSource = "/generated/source/common-source.png";

export const sourceImage: DemoImage = {
  src: commonSource,
  alt: "统一扩展实验原图：湖岸、红色木舟、松树、黄色花朵与远山",
  caption: "我们的统一场景：可控合成图，不含人物与敏感信息。",
};

export const skills: SkillStudy[] = [
  {
    index: "01",
    slug: "daily-photo-playground",
    name: "daily-photo-playground",
    repo: "luji12/daily-photo-playground",
    upstreamUrl: "https://github.com/luji12/daily-photo-playground",
    commit: "b987bbb205626f2f5fca47c72a8a05c5863f8c6b",
    route: "高饱和编辑拼版",
    fidelity: "保留一处完整原照窗口",
    license: "未声明许可证",
    licenseNote: "只研究规则与公开样例；不复制、改写或再分发上游实现。",
    summary: "把照片拆成色场、放大主体、来源几何与完整小照片窗口，形成高张力杂志页面。",
    proof: "我们的木舟越出版心，湖、岸线、松树和黄花变成版式材料，同时保留一处原图证据。",
    capability: "它不是给照片套滤镜，而是把照片当作编辑设计的素材库：主体、颜色、几何和原图窗口各自承担不同信息职责。",
    principles: ["高饱和内版心与暖白外页形成强边界", "主体可以越出版心，但仍要保持可辨认", "必须保留一个完整小原照窗口作为事实锚点"],
    useCases: [
      { title: "每日影像日记", description: "把普通随手拍转成具有连续视觉语言的日更版面。" },
      { title: "生活方式栏目", description: "适合食物、街景、旅行和静物的轻编辑视觉。" },
      { title: "社交媒体组图", description: "用固定版心规则建立系列感，同时保留原照片语境。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/daily-photo-playground/01.jpg", alt: "上游目录样例一", caption: "上游目录样例：观察高饱和色场与主体越界。" },
      { src: "/generated/upstream/daily-photo-playground/02.jpg", alt: "上游目录样例二", caption: "上游目录样例：观察完整照片窗口的证据作用。" },
      { src: "/generated/upstream/daily-photo-playground/03.jpg", alt: "上游目录样例三", caption: "上游目录样例：观察来源色如何变成几何版式。" },
    ],
    resultImages: [
      { src: "/generated/results/daily-photo-playground.png", alt: "我们的 daily-photo-playground 扩展实验", caption: "扩展实验 1：让红舟成为越界主体，同时用湖蓝与花黄建立色场。" },
      { src: "/generated/results/daily-photo-playground-variant-02.png", alt: "蓝色版心中的红舟与完整原照窗口", caption: "扩展实验 2：蓝色版心、放大红舟与完整小原照窗口，验证主体越界但证据不丢失。" },
      { src: "/generated/results/daily-photo-playground-variant-03.png", alt: "橙红版心中的松树主体与完整原照窗口", caption: "扩展实验 3：改由松树承担放大主体，红舟退为视觉配重，测试同一规则的构图变体。" },
    ],
    sourceFacts: ["红色木舟是最强主体", "湖面与岸线提供水平结构", "右侧松树与三朵黄花提供竖向和点状节奏"],
    pipeline: ["提取主色与主体", "建立暖白外页和高饱和版心", "放大主体并允许越界", "放入来源几何和原照窗口", "目测留白与可辨认度"],
    directions: [
      { title: "版式参数化", description: "把留白、越界比例、照片窗口尺寸变成可重复测量的参数。" },
      { title: "系列一致性", description: "为一组照片固定色彩角色和网格，只让主体与几何变化。" },
      { title: "移动端裁切", description: "研究同一设计在 3:4、4:5 和 9:16 中如何保留张力。" },
    ],
    nextDemos: [
      { title: "人物街拍", description: "验证人物越界时是否仍能避免五官失真。" },
      { title: "低饱和雨景", description: "验证没有天然高彩色时，色场应如何建立。" },
    ],
  },
  {
    index: "02",
    slug: "dyy-photo-deconstruct",
    name: "dyy_photo_deconstruct",
    repo: "121dyy/dyy_photo_deconstruct",
    upstreamUrl: "https://github.com/121dyy/dyy_photo_deconstruct",
    commit: "42e637e8875dafeb4ccf2ab5a738e4dca41c8f30",
    route: "无字极简重绘",
    fidelity: "零照片像素",
    license: "未声明许可证",
    licenseNote: "只做思想研究与独立本地实验，不复制上游资产或实现；不声称法律意义上的严格 clean-room。",
    summary: "用剪影、动作线、淡墨块和极少记号压缩场景，在大面积空纸中保留最少识别线索。",
    proof: "木舟、立柱、岸线、松树与三朵花被压缩成一个小簇，文字和原照片像素全部消失。",
    capability: "这条路线研究的是识别下限：一张照片最少保留哪些形状、方向和点，仍能让人感到它来自原场景。",
    principles: ["只保留最少必要的视觉记号", "主体集中在很小的纸面区域", "严格无文字，让形状承担全部叙事"],
    useCases: [
      { title: "诗集与章节页", description: "需要安静、克制并为文字留出大量空间的页面。" },
      { title: "空间记忆图", description: "记录地点的关系和气氛，而不是复刻照片细节。" },
      { title: "极简封面", description: "用一个小型视觉簇建立识别点。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/dyy-photo-deconstruct/01.jpg", alt: "上游极简样例一", caption: "上游样例：主体被压缩为轮廓和少量线条。" },
      { src: "/generated/upstream/dyy-photo-deconstruct/02.jpg", alt: "上游极简样例二", caption: "上游样例：用极大空纸控制观看距离。" },
      { src: "/generated/upstream/dyy-photo-deconstruct/03.jpg", alt: "上游极简样例三", caption: "上游样例：少量色块只服务于识别。" },
    ],
    resultImages: [
      { src: "/generated/results/dyy-photo-deconstruct.png", alt: "我们的无字极简扩展实验", caption: "扩展实验 1：用舟形、岸线、竖柱、树影和三个黄点重建场景。" },
      { src: "/generated/results/dyy-photo-deconstruct-variant-02.png", alt: "舟形、湖线、树锥与三个花点构成的极简地点记忆", caption: "扩展实验 2：只用舟形、湖线、树锥和三个花点测试场景识别下限。" },
      { src: "/generated/results/dyy-photo-deconstruct-variant-03.png", alt: "一条动作线连接红舟、弯岸与松树的极简画面", caption: "扩展实验 3：一条动作线从红舟经过弯岸抵达松树，以三个黄色点结束。" },
    ],
    sourceFacts: ["舟是低矮长形轮廓", "短柱与松树构成竖向对照", "三朵花可压缩为三个黄色点"],
    pipeline: ["列出可辨认事实", "选择剪影或动作线", "删除纹理与透视细节", "把标记压到小区域", "检查无文字和空纸比例"],
    directions: [
      { title: "识别阈值实验", description: "逐步删减标记，测出不同题材的最低可读组合。" },
      { title: "标记词典", description: "为建筑、植物、人物和交通工具建立可复用 mark family。" },
      { title: "盲测评估", description: "让未看原图的人描述画面，判断抽象是否仍传递关键事实。" },
    ],
    nextDemos: [
      { title: "复杂城市路口", description: "测试高信息密度输入能否压到 3–5 个记号。" },
      { title: "单人动作", description: "测试动作线在极简条件下的姿态可读性。" },
    ],
  },
  {
    index: "03",
    slug: "travel-photo-abstraction",
    name: "travel-photo-abstraction",
    repo: "Evianis/travel-photo-abstraction",
    upstreamUrl: "https://github.com/Evianis/travel-photo-abstraction",
    commit: "96e387635edf05bc7e798428a5db11dbf48f46c1",
    route: "生成面板 + 确定性拼装",
    fidelity: "原照像素验证",
    license: "自定义 Source-Available",
    licenseNote: "仅可原样使用；禁止修改、衍生与再发布。本研究不提交其源码或上游资产。",
    summary: "模型只生成抽象面板，脚本负责把锁定的原照拼回、排版并以 fail-closed 方式验证交付。",
    proof: "本次输出获得 DELIVERY PASS；上方照片逐像素忠实，随机性被限制在下方面板。",
    capability: "最有价值的不是某种画风，而是职责隔离：模型负责不可确定的抽象，脚本负责不可妥协的照片真实性和交付规格。",
    principles: ["同一原图路径贯穿分析、拼装与验证", "图像模型不得重画照片区域", "验证失败就停止交付，而不是带病输出"],
    useCases: [
      { title: "旅行编辑页", description: "既要保留真实照片，又希望加入抽象叙事面板。" },
      { title: "来源敏感展示", description: "产品、建筑或档案照片不能被生成模型篡改的场景。" },
      { title: "批量视觉生产", description: "需要统一尺寸、标题和验证门槛的系列化输出。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/travel-photo-abstraction/01.png", alt: "上游热气球样例", caption: "上游样例：真实天空照片与关系抽象面板分工明确。" },
      { src: "/generated/upstream/travel-photo-abstraction/02.png", alt: "上游港湾样例", caption: "上游样例：轴线、间隔和负空间被重新编码。" },
      { src: "/generated/upstream/travel-photo-abstraction/03.png", alt: "上游冬塔样例", caption: "上游样例：场景身份保留在照片，抽象只解释关系。" },
    ],
    resultImages: [
      { src: "/generated/results/travel-photo-abstraction.png", alt: "我们的 travel-photo-abstraction 扩展实验", caption: "研究基线：原照锁定后，抽象面板重述舟、岸线、松树与花的关系。" },
      { src: "/generated/results/travel-photo-abstraction-variant-02.png", alt: "湖岸事实照片区与五类关系面板组成的概念研究页", caption: "概念研究 2：事实照片区与舟、湖、岸、树、花五类关系面板分区展示；正式发布需确定性拼装。" },
      { src: "/generated/results/travel-photo-abstraction-variant-03.png", alt: "湖岸照片与远山湖面岸线三层译码组成的概念研究页", caption: "概念研究 3：照片与远山、湖面、岸线三层译码并置；不宣称照片区像素保真。" },
    ],
    sourceFacts: ["红舟位于湖面低处", "岸线形成缓弧水平轴", "右侧松树较重，黄色花形成小型数量组"],
    pipeline: ["锁定来源照片", "建立关系清单", "只生成干净抽象面板", "脚本拼回原照和标题", "验证照片像素与结构", "仅在 PASS 后交付"],
    directions: [
      { title: "通用真实性契约", description: "把照片锁定、区域哈希和容差验证抽成独立规范。" },
      { title: "面板后端替换", description: "保持合成器不变，对比不同生成模型或代码绘图后端。" },
      { title: "失败样本库", description: "系统保存被拒绝候选，研究验证器还缺哪些规则。" },
    ],
    nextDemos: [
      { title: "含文字的店招", description: "验证照片区域锁定能否避免模型篡改原始文字。" },
      { title: "夜景高反差", description: "验证暗部照片与浅色抽象面板的视觉平衡。" },
    ],
  },
  {
    index: "04",
    slug: "scenes-gathered-zine",
    name: "scenes-gathered-zine-v1-3",
    repo: "Zeejay0/gathered-scenes-zine-skill",
    upstreamUrl: "https://github.com/Zeejay0/gathered-scenes-zine-skill",
    commit: "b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e",
    route: "实景照片拼贴",
    fidelity: "真实照片锚点",
    license: "历史 MIT 快照",
    licenseNote: "研究的是仍含 Skill 的历史 MIT 提交；当前仓库已经删除 Skill，不能混用当前状态和历史许可。",
    summary: "把真实照片、抽象色场和撕纸纤维边并置，用单一结构色把两种媒介连接起来。",
    proof: "我们的照片锚点与右侧绘画场共同保留木舟—岸线—松树关系，撕纸边承担媒介过渡。",
    capability: "它擅长保留现场证据，同时给照片增加手工拼贴的叙事距离，照片与插画不是主从，而是并列的两块记忆。",
    principles: ["真实照片必须保持可识别", "撕纸边是结构而不是装饰噪声", "只使用一个高彩结构色连接两侧"],
    useCases: [
      { title: "旅行手帐", description: "把现场照片与印象绘画放在同一张页面。" },
      { title: "展览视觉", description: "同时展示纪实证据和策展式抽象解释。" },
      { title: "记忆档案", description: "为家庭或地点照片增加非线性的情绪层。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/scenes-gathered-zine/source.jpg", alt: "上游拼贴输入", caption: "上游输入：先识别照片中的真实空间和情绪锚点。" },
      { src: "/generated/upstream/scenes-gathered-zine/result.jpg", alt: "上游拼贴结果", caption: "上游结果：照片证据与抽象画面通过撕纸结构相遇。" },
    ],
    resultImages: [
      { src: "/generated/results/scenes-gathered-zine.png", alt: "我们的 scenes-gathered 扩展实验", caption: "扩展实验 1：真实湖岸小景与关系插画并置。" },
      { src: "/generated/results/scenes-gathered-zine-variant-02.png", alt: "原照锚点、蓝色撕纸色场与朱红结构条组成的拼贴", caption: "扩展实验 2：用完整原照锚点、撕纸蓝色场和单一朱红结构条重新组织媒介关系。" },
      { src: "/generated/results/scenes-gathered-zine-variant-03.png", alt: "由全景、红舟、松树、山雾、黄花与岸线组成的地点联系表", caption: "扩展实验 3：把同一湖岸现场收集成六种观察尺度，形成可用于选片和勘景的完整联系表。" },
    ],
    sourceFacts: ["原照片是事实锚点", "舟与岸线可跨越媒介边界", "红色适合作为唯一结构连接色"],
    pipeline: ["制作 Scene Card", "选择真实照片锚点", "提取关系和结构色", "生成或绘制并列场景", "用撕纸边完成拼贴"],
    directions: [
      { title: "拼贴模板系统", description: "研究横向、竖向和重叠三种照片—插画关系。" },
      { title: "材质可控性", description: "将撕纸纤维、胶带和套印误差拆成可关闭的图层。" },
      { title: "档案说明层", description: "增加可选的日期与地点字段，但不侵占图像主体。" },
    ],
    nextDemos: [
      { title: "室内聚会", description: "验证人物较多时照片锚点应该多大。" },
      { title: "四季同地点", description: "测试结构色能否把四张不同季节照片连成系列。" },
    ],
  },
  {
    index: "05",
    slug: "scene-distillation-zine",
    name: "scene-distillation-zine-v1-3",
    repo: "Zeejay0/gathered-scenes-zine-skill",
    upstreamUrl: "https://github.com/Zeejay0/gathered-scenes-zine-skill",
    commit: "b14cabcd0e6ff5aba503d837fcfdb0c9a6970e2e",
    route: "场景语义蒸馏",
    fidelity: "零照片像素",
    license: "历史 MIT 快照",
    licenseNote: "与上一页同属历史 MIT 提交，但这是另一份独立 Skill，使用 Distillation Card 而非共享路由。",
    summary: "先把照片写成情绪命题和中心张力，再用少数形状、间隔与颜色重新构造，不保留原照片。",
    proof: "低处红色停顿、水平蓝线、右侧黑柱和三个黄点形成中心张力，第二眼才会联想到原场景。",
    capability: "它不是简化照片轮廓，而是把照片转译成一句视觉命题，再为这句命题重新发明画面。",
    principles: ["先形成情绪命题，再决定形式", "抽象画面必须存在中心张力", "结果第一眼独立成立，第二眼才回到来源"],
    useCases: [
      { title: "概念海报", description: "来源照片只提供命题，成品需要独立成为作品。" },
      { title: "音乐与诗歌视觉", description: "用空间张力表达节奏、停顿和情绪。" },
      { title: "品牌情绪板", description: "从真实场景提炼非具象的视觉语言。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/scene-distillation-zine/source.jpg", alt: "上游蒸馏输入", caption: "上游输入：用于提炼情绪命题，不会直接出现在结果中。" },
      { src: "/generated/upstream/scene-distillation-zine/result.jpg", alt: "上游蒸馏结果", caption: "上游结果：以新的形式重建节奏和中心张力。" },
    ],
    resultImages: [
      { src: "/generated/results/scene-distillation-zine.png", alt: "我们的 scene-distillation 扩展实验", caption: "扩展实验 1：把安静湖岸蒸馏成停顿、水平延伸和右侧重量。" },
      { src: "/generated/results/scene-distillation-zine-variant-02.png", alt: "以红舟、蓝色水平场、右侧黑色重量和三枚黄点构成的抽象蒸馏", caption: "扩展实验 2：完全移除照片像素，只保留红色停顿、蓝色水平场、右侧重量与三个轻点。" },
      { src: "/generated/results/scene-distillation-zine-variant-03.png", alt: "用米色纸、深蓝水面、红舟与黄色花点重构的限色湖岸版画", caption: "扩展实验 3：完整湖岸被蒸馏为限色纸面版画，介于地点可辨识与独立视觉作品之间。" },
    ],
    sourceFacts: ["舟是低处的红色停顿", "湖面代表水平延伸", "松树形成右侧重量，花朵形成三个轻点"],
    pipeline: ["建立 Distillation Card", "写出情绪命题", "定义中心张力", "选择视觉隐喻", "形式化为少量形状", "检查结果能否独立成立"],
    directions: [
      { title: "命题版本控制", description: "同一照片写三种情绪命题，观察形式差异从何而来。" },
      { title: "抽象度旋钮", description: "建立从可辨轮廓到纯关系的连续强度。" },
      { title: "跨媒介映射", description: "把同一命题输出为海报、动效和声音节奏。" },
    ],
    nextDemos: [
      { title: "拥挤车站", description: "把密集人流转成压力与方向，而不是人物剪影。" },
      { title: "空旷雪地", description: "验证极少信息场景是否仍能形成中心张力。" },
    ],
  },
  {
    index: "06",
    slug: "gc-minimal-zine-poster",
    name: "gc-minimal-zine-poster",
    repo: "LiamGvchi/gc-minimal-zine-poster",
    upstreamUrl: "https://github.com/LiamGvchi/gc-minimal-zine-poster",
    commit: "4cb0396ad4e834019f753b37e1c4f415f5e02026",
    route: "通用 Prompt Compiler",
    fidelity: "语义重绘",
    license: "MIT",
    licenseNote: "可作为可运行基线；保留上游许可证和署名。",
    summary: "把主题、句子、物体或照片编译成一个视觉隐喻、一个高彩锚点、微型文字和大量旧纸留白。",
    proof: "红舟成为蓝色水句中的逗号，构图保持小簇和单一高彩事件。",
    capability: "它提供的是一个通用内容编译器：先决定海报说什么，再把语义映射为版式、锚点、文字、纹理和情绪。",
    principles: ["每张海报只承载一个核心隐喻", "高彩颜色必须集中成单一视觉锚", "70–90% 留白和微型文字共同控制音量"],
    useCases: [
      { title: "文章封面", description: "把一段文本压缩成可成像的单一隐喻。" },
      { title: "活动预告", description: "用少量文字和高彩锚点建立远距离识别。" },
      { title: "概念卡片", description: "快速探索同一内容的版式、颜色与纹理变体。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/gc-minimal-zine-poster/01.jpeg", alt: "上游 night door 样例", caption: "上游样例：暗色主题仍保持小型视觉事件。" },
      { src: "/generated/upstream/gc-minimal-zine-poster/02.jpeg", alt: "上游 yellow step 样例", caption: "上游样例：单一高彩锚点组织全部视线。" },
      { src: "/generated/upstream/gc-minimal-zine-poster/03.jpeg", alt: "上游 moon tide 样例", caption: "上游样例：隐喻、微字和纸面纹理共同成立。" },
    ],
    resultImages: [
      { src: "/generated/results/gc-minimal-zine-poster.png", alt: "我们的极简海报扩展实验", caption: "扩展实验 1：将红舟编译为水面句子中的一个标点。" },
      { src: "/generated/results/gc-minimal-zine-poster-variant-02.png", alt: "红舟作为逗号、湖线作为句法、松树作为停顿的极简海报", caption: "扩展实验 2：把红舟编译成湖面句法中的逗号，大片空纸留给后续标题。" },
      { src: "/generated/results/gc-minimal-zine-poster-variant-03.png", alt: "弯岸与松树形成门槛、三个黄点成为高彩事件的极简海报", caption: "扩展实验 3：弯岸与松树形成门槛，三个黄色圆点成为唯一高彩事件。" },
    ],
    sourceFacts: ["红舟是唯一高彩主体", "水平湖面适合成为句法基线", "整体气氛安静，适合极大留白"],
    pipeline: ["压缩输入主题", "选择视觉隐喻", "确定布局与高彩锚", "生成微型文字和纸面质感", "按具体失败定向重试一次"],
    directions: [
      { title: "结构化 Prompt Schema", description: "把九个提示字段变成可验证的 JSON 中间表示。" },
      { title: "变体矩阵", description: "固定隐喻，只改变 layout、type、color 和 texture 比较稳定性。" },
      { title: "文本可读性检查", description: "将标题拼写和唯一性从目测迁移到确定性排印。" },
    ],
    nextDemos: [
      { title: "纯文本主题", description: "不提供图片，只给一段短文，检验内容编译能力。" },
      { title: "同主题三变体", description: "控制随机预算，比较版式轴是否真正独立。" },
    ],
  },
  {
    index: "07",
    slug: "photo-revival",
    name: "photo-revival",
    repo: "dacnay816y62-hub/photo-revival",
    upstreamUrl: "https://github.com/dacnay816y62-hub/photo-revival",
    commit: "ca4c3c6c0f812355bd6d815d8a78652db801b7f1",
    route: "照片手绘重生",
    fidelity: "完整重绘",
    license: "MIT",
    licenseNote: "可运行与扩展；需要保留 MIT 许可证和署名。",
    summary: "把主主体、场景和一至两个记忆细节重新画成小型手绘插画，而不是简单滤镜化。",
    proof: "木舟、立柱与花朵被保留，全部由铅笔、水彩和局部高彩重新解释。",
    capability: "它擅长把照片从记录物变成记忆物：降低细节精度，提升情绪、手感和局部颜色的存在感。",
    principles: ["重画主主体与场景关系", "只保留一至两个记忆细节", "小型画面周围保留大量白纸"],
    useCases: [
      { title: "旅行纪念", description: "把照片转成更私人、更柔和的手绘记忆。" },
      { title: "礼物卡片", description: "将地点或物件重绘成轻量插图。" },
      { title: "故事配图", description: "为短篇文字建立非写实的场景入口。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/photo-revival/01.png", alt: "上游月门重绘", caption: "上游样例：建筑入口被压缩为小型手绘记忆。" },
      { src: "/generated/upstream/photo-revival/02.png", alt: "上游道路重绘", caption: "上游样例：道路关系和局部细节得到保留。" },
      { src: "/generated/upstream/photo-revival/03.png", alt: "上游山地牦牛重绘", caption: "上游样例：主体可辨认，但不承诺像素真实性。" },
    ],
    resultImages: [
      { src: "/generated/results/photo-revival.png", alt: "我们的 photo-revival 扩展实验", caption: "扩展实验 1：以水彩与铅笔重新讲述湖岸片段。" },
      { src: "/generated/results/photo-revival-variant-02.png", alt: "雨后湖岸的水彩铅笔旅行纪念画", caption: "扩展实验 2：保留红舟、松树、短柱和三朵黄花，把空间关系重绘成完整旅行纪念画。" },
      { src: "/generated/results/photo-revival-variant-03.png", alt: "以空舟为情绪锚点的故事书记忆画", caption: "扩展实验 3：用石墨、干彩铅和薄水粉让空舟成为等待与归来的故事入口。" },
    ],
    sourceFacts: ["主主体是红舟", "场景是安静湖岸", "短柱和三朵花作为记忆细节"],
    pipeline: ["确定主主体和场景", "选择一至两个记忆细节", "缩小画面簇", "以手绘材料重画", "检查是否误称照片保真"],
    directions: [
      { title: "记忆点可解释性", description: "记录模型为何选择某个细节，避免只凭随机偏好。" },
      { title: "人物身份边界", description: "研究人物照片重绘时的相似度、隐私与误认风险。" },
      { title: "材料风格分层", description: "分别控制铅笔、蜡笔、水彩和拼贴的占比。" },
    ],
    nextDemos: [
      { title: "旧家庭照片", description: "在授权输入上测试人物与年代感，但不承诺身份还原。" },
      { title: "单一静物", description: "观察没有场景关系时，记忆细节如何选择。" },
    ],
  },
  {
    index: "08",
    slug: "pixel-style-poster",
    name: "pixel-style-poster-skill",
    repo: "v92388375-gif/pixel-style-poster-skill",
    upstreamUrl: "https://github.com/v92388375-gif/pixel-style-poster-skill",
    commit: "b93066b52fc2f32bf9ec3a9a6d379b4088d6fd7b",
    route: "精细点阵编辑海报",
    fidelity: "点阵与半调重绘",
    license: "MIT",
    licenseNote: "可运行与扩展；需要保留 MIT 许可证和署名。",
    summary: "用像素密度、点阵疏密和半调层次塑造主体，目标是编辑印刷感，而不是复古游戏像素。",
    proof: "木舟用红色点阵保留体积，山、湖与松树由蓝黑密度过渡建立层级。",
    capability: "它把一种材料语言工程化：点阵不仅是表面效果，还负责明暗、空间、标题邻接和主体层级。",
    principles: ["像素密度决定明暗而非单纯描边", "主体、背景和文字使用不同密度层级", "失败重试要针对锯齿、糊块或游戏化等具体问题"],
    useCases: [
      { title: "音乐与文化海报", description: "需要强材料感和远距离轮廓的宣传视觉。" },
      { title: "人物编辑封面", description: "以细密点阵处理近景人物和标题。" },
      { title: "数字印刷实验", description: "模拟网点、套色和反向半调的材料效果。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/pixel-style-poster/01.png", alt: "上游薄荷夜百合样例", caption: "上游样例：细密点阵形成光影，而非大块游戏像素。" },
      { src: "/generated/upstream/pixel-style-poster/02.png", alt: "上游洛可可葡萄样例", caption: "上游样例：多主体仍由密度建立层级。" },
      { src: "/generated/upstream/pixel-style-poster/03.png", alt: "上游深青蝴蝶样例", caption: "上游样例：反向半调和标题共同组织画面。" },
    ],
    resultImages: [
      { src: "/generated/results/pixel-style-poster.png", alt: "我们的点阵海报扩展实验", caption: "扩展实验 1：以点阵密度重构红舟和湖岸空间。" },
      { src: "/generated/results/pixel-style-poster-variant-02.png", alt: "暖纸上的蓝色点阵湖岸与红舟海报", caption: "扩展实验 2：以暖纸、海军蓝网点和红色高密度主体建立细点阵编辑层级。" },
      { src: "/generated/results/pixel-style-poster-variant-03.png", alt: "反向蓝底点阵的湖岸与松树海报", caption: "扩展实验 3：反向蓝底与浅色点阵测试同一材料语言的明暗反转能力。" },
    ],
    sourceFacts: ["红舟需要最高颜色密度", "远山与湖面使用低频蓝黑网点", "松树适合作为深色高密度边缘"],
    pipeline: ["识别主体层级", "选择点阵尺度", "为明暗分配密度", "建立标题邻接", "按失败类型定向再生"],
    directions: [
      { title: "真实印刷校样", description: "把屏幕网点映射到丝网印刷或 risograph 的物理限制。" },
      { title: "密度量化", description: "自动测量不同区域的点阵覆盖率和层级分离度。" },
      { title: "多主体路由", description: "研究群像、双主体和单主体近景的不同构图策略。" },
    ],
    nextDemos: [
      { title: "人物近景", description: "验证面部特征在细密点阵下的可读与失真边界。" },
      { title: "三主体静物", description: "验证密度能否稳定建立主次层级。" },
    ],
  },
  {
    index: "09",
    slug: "photo-relic-editorial",
    name: "photo-relic-editorial",
    repo: "wnby/photo-relic-editorial",
    upstreamUrl: "https://github.com/wnby/photo-relic-editorial",
    commit: "2232da16afddc7940e2e2f280bfb85aa62da1bae",
    route: "照片 + 记忆版画",
    fidelity: "原照区 + 抽象遗迹",
    license: "MIT",
    licenseNote: "可运行与扩展；需要保留 MIT 许可证和署名。",
    summary: "让照片作为证据，让下方面板像时间把结构、光、色和重心压成一个现代版画遗迹。",
    proof: "完整照片在上方呈现；下方以舟印、水平线、岸线负形和松树残影回应。",
    capability: "它在同一张作品里保留两种时间：照片记录当时，版画面板表达后来如何记住它。",
    principles: ["原照和 relic 面板各自保持完整角色", "每张图只形成一个主 relic", "标题模式可以克制小字、双语或无字"],
    useCases: [
      { title: "城市记忆系列", description: "把地点照片与抽象印记组织成连续栏目。" },
      { title: "文化遗产编辑页", description: "同时保留证据与非写实解释。" },
      { title: "摄影书章节", description: "用 relic 面板为不同照片建立系列视觉语法。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/photo-relic-editorial/01.png", alt: "上游飞雁序列样例", caption: "上游样例：动作序列被压成单一版画遗迹。" },
      { src: "/generated/upstream/photo-relic-editorial/02.png", alt: "上游天坛样例", caption: "上游样例：建筑结构转译为克制的关系印记。" },
      { src: "/generated/upstream/photo-relic-editorial/03.png", alt: "上游长城山脊样例", caption: "上游样例：山脊节奏跨越照片和面板。" },
    ],
    resultImages: [{ src: "/generated/results/photo-relic-editorial.png", alt: "我们的 photo-relic 扩展实验", caption: "统一场景基线：让红舟成为记忆版画中的主遗迹。" }],
    extensionExperiments: [
      {
        kicker: "同城系列 · 01 / 03",
        title: "雨幕旧影院",
        question: "固定同一套版画配方后，建筑转角和雨后街面能否被压成一个主 relic？",
        source: {
          src: "/generated/studies/photo-relic-editorial/north-harbor-cinema-source.png",
          alt: "生成输入图：雨后的北港红砖旧影院转角",
          caption: "生成输入图 · 北港同城 1/3：红砖影院、弧形雨棚、暗入口、缆线与湿街面构成可追溯证据。",
        },
        effect: {
          src: "/generated/studies/photo-relic-editorial/north-harbor-cinema-effect.png",
          alt: "北港旧影院的上照下版画 Photo Relic 实验",
          caption: "最终效果 · 雨幕旧影院：上区保留场景证据，下区只让雨棚、暗入口与一条缆线组成建筑记忆遗迹。",
        },
        facts: ["影院转角与弧形雨棚", "入口的深色矩形", "雨后轨道与斜向缆线"],
        primaryRelic: "雨棚、暗入口与一根斜线合成的单一建筑遗迹。",
        recipe: "暖象牙纸 / 炭黑线 / 砖红套印 / 风化青绿 / 无标题",
        checks: ["上区仍能辨认影院转角", "下区只有一个主形", "未添加人物、标牌或地点文字"],
      },
      {
        kicker: "同城系列 · 02 / 03",
        title: "桥影过河",
        question: "同一视觉配方能否在不雷同的前提下，把钢桥的弧线与配重关系保留下来？",
        source: {
          src: "/generated/studies/photo-relic-editorial/north-harbor-bridge-source.png",
          alt: "生成输入图：北港红砖仓库之间的钢制升降桥",
          caption: "生成输入图 · 北港同城 2/3：桥拱、配重、长栏杆、运河与湿石岸构成工业空间证据。",
        },
        effect: {
          src: "/generated/studies/photo-relic-editorial/north-harbor-bridge-effect.png",
          alt: "北港钢桥的上照下版画 Photo Relic 实验",
          caption: "最终效果 · 桥影过河：桥拱、配重和栏杆节奏被合成一枚横向主 relic，水面与路灯退为残痕。",
        },
        facts: ["钢桥双层弧线", "右侧矩形配重", "贯穿画面的长栏杆节奏"],
        primaryRelic: "桥拱、配重与栏杆连接成的一枚横向工业遗迹。",
        recipe: "暖象牙纸 / 炭黑线 / 砖红套印 / 风化青绿 / 无标题",
        checks: ["桥拱和配重关系仍可追溯", "水面不成为第二主体", "缩略图仍可读出桥的重量"],
      },
      {
        kicker: "同城系列 · 03 / 03",
        title: "闭市长廊",
        question: "面对高度重复的拱廊与灯具，系列配方能否压缩节奏而不退化成细节插画？",
        source: {
          src: "/generated/studies/photo-relic-editorial/north-harbor-market-source.png",
          alt: "生成输入图：雨后闭市的北港红砖市场长廊",
          caption: "生成输入图 · 北港同城 3/3：重复拱门、青绿摊台、吊灯与湿地面构成连续节奏。",
        },
        effect: {
          src: "/generated/studies/photo-relic-editorial/north-harbor-market-effect.png",
          alt: "北港市场长廊的上照下版画 Photo Relic 实验",
          caption: "最终效果 · 闭市长廊：拱门、吊灯和青绿台线被压成一个延伸 relic，重复摊位被整理为连续节奏。",
        },
        facts: ["连续红砖拱门", "由近及远的吊灯节奏", "青绿摊台与湿石地面"],
        primaryRelic: "拱门、灯点与台线融合成的一条长廊遗迹。",
        recipe: "暖象牙纸 / 炭黑线 / 砖红套印 / 风化青绿 / 无标题",
        checks: ["三张同城作品保持同一材料语法", "长廊仍只有一个主 relic", "重复摊位被压缩为连续节奏"],
      },
      {
        kicker: "人物迁移 · 01",
        title: "末班车之前",
        question: "当主体变成故事明确、色彩丰富的成年女性时，同一 relic 配方还能同时保留人物与环境吗？",
        source: {
          src: "/generated/studies/photo-relic-editorial/north-harbor-woman-source.png",
          alt: "生成输入图：蓝调时刻在北港长廊转身的成年女性",
          caption: "生成输入图 · 人物迁移：末班车前的雨后长廊。红色外套、蓝色长裙、黄色围巾、地图与暖灯共同建立人物故事。",
        },
        effect: {
          src: "/generated/studies/photo-relic-editorial/north-harbor-woman-effect.png",
          alt: "北港故事女性的人物动作 Photo Relic 实验",
          caption: "最终效果 · 末班车之前：上区保留人物与环境，下区把转身姿态、围巾弧线和一条倒影压成单一动作 relic。",
        },
        facts: ["人物的转身姿态与视线", "黄色围巾形成的长弧", "红蓝服装与雨后暖灯倒影"],
        primaryRelic: "身体竖向姿态与围巾长弧融合成的一枚叙事动作遗迹。",
        recipe: "同一暖象牙纸与静默版画语法，仅扩大来源色角色",
        checks: ["人物与环境都保持可读", "不复制人物或改变肢体", "围巾与人物属于同一个 relic"],
      },
    ],
    sourceFacts: ["照片负责真实湖岸", "红舟适合作为主 relic", "水平线与松树残影可连接上下两区"],
    pipeline: ["读取结构、光与色", "选择一个主 relic", "确定 mark weight 与 motion seed", "生成上下双区", "目测照片与 relic 的呼应"],
    directions: [
      { title: "系列配方锁定", description: "固定 mark family 与标题模式，只让来源关系变化。" },
      { title: "照片保真验证", description: "将原照区域的目测承诺升级为像素或结构检查。" },
      { title: "版画材料库", description: "对比木刻、丝网、炭笔和套印偏移对记忆感的影响。" },
    ],
    nextDemos: [
      { title: "版画材料四联", description: "在同一输入与构图下，对比木刻、丝网、炭笔和套印偏移对记忆感的影响。" },
      { title: "照片保真失败修正", description: "公开一组照片区被重画的失败候选，并展示约束修正与复核结果。" },
      { title: "叙事人物三联", description: "用三位虚构成年女性覆盖旅途、工作与重逢场景；让服装色彩、动作线与环境证据共同讲故事，而不是只更换人物外观。" },
    ],
  },
  {
    index: "10",
    slug: "photo-distill",
    name: "photo-distill",
    repo: "yangcodingmaster/photo-distill",
    upstreamUrl: "https://github.com/yangcodingmaster/photo-distill",
    commit: "e2708aeb7db4344dfb5577b5f12bcf57ded541ec",
    route: "HTML / CSS / SVG",
    fidelity: "零图像模型、零照片像素",
    license: "未声明许可证",
    licenseNote: "上游仅作架构阅读；我们的结果是独立本地代码实验，不复制上游脚本或模板，也不声称法律意义上的严格 clean-room。",
    summary: "不调用图生模型，用关系量、印刷符号和浏览器渲染形成可重复测试的代码海报。",
    proof: "湖成为密度场，舟与立柱成为几何事件，松树只留下唯一硬竖边。",
    capability: "这是清单中最适合工程化的一条路线：每个坐标、色锚和着墨量都能被代码表达、复现和测试。",
    principles: ["只采关系量，不描摹照片轮廓", "输出是自足 HTML/SVG 与确定性 PNG", "候选必须通过色锚、着墨与缩略图可见性检查"],
    useCases: [
      { title: "数据化海报", description: "需要可参数化、可批量和可重现的视觉系统。" },
      { title: "浏览器原生展览", description: "成品可直接在网页中生成、调整和导出。" },
      { title: "视觉回归研究", description: "适合建立像素差、布局指标和跨版本基线。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/photo-distill/01-original.jpg", alt: "上游台灯原图", caption: "上游输入：先读取关系量，而不是追踪物体轮廓。" },
      { src: "/generated/upstream/photo-distill/02-poster.jpg", alt: "上游台灯代码海报", caption: "上游结果：同一关系由 HTML/CSS/SVG 确定性表达。" },
      { src: "/generated/upstream/photo-distill/03-original.jpg", alt: "上游七姐妹海岸原图", caption: "第二组输入：海岸、人物和天空先被读取为关系量。" },
    ],
    resultImages: [
      { src: "/generated/results/photo-distill.png", alt: "我们的 clean-room photo-distill 扩展实验", caption: "扩展实验 1：独立实现纸面、密度场、几何事件和单色锚。" },
      { src: "/generated/results/photo-distill-variant-02.svg", alt: "湖岸关系测绘的代码原生海报", caption: "扩展实验 2：用可审查 SVG 把湖面、岸线、舟、树和三个花点编码为关系测绘图。" },
      { src: "/generated/results/photo-distill-variant-03.svg", alt: "暗场缩略识别的代码原生海报", caption: "扩展实验 3：在暗场主题中保留同一关系系统，并显式展示缩略可见性与色锚指标。" },
    ],
    sourceFacts: ["湖面可表示为水平密度场", "红舟可表示为一个红色几何锚", "立柱和松树提供不同重量的竖向端点"],
    pipeline: ["提取关系量", "编写自足 HTML/SVG", "固定浏览器版本渲染", "测量色锚与着墨率", "检查缩略图可见性", "失败即删除候选"],
    directions: [
      { title: "统一指标工具", description: "沉淀比例、着墨率、色锚占比和缩略可见性测试器。" },
      { title: "响应式海报", description: "研究同一关系系统如何在多个画幅中保持视觉恒等。" },
      { title: "元数据脱敏", description: "默认剥离 GPS、EXIF 和私人文件名，只保留必要出处。" },
    ],
    nextDemos: [
      { title: "可交互参数页", description: "实时调节着墨率和色锚面积，观察是否仍通过门槛。" },
      { title: "跨浏览器渲染", description: "比较固定字体下 Chrome 与其他引擎的像素容差。" },
    ],
  },
  {
    index: "11",
    slug: "poetic-line-zine-poster",
    name: "poetic-line-zine-poster",
    repo: "zhu930824/poetic-line-zine-poster",
    upstreamUrl: "https://github.com/zhu930824/poetic-line-zine-poster",
    commit: "61514e0652de45f30c74b01bc9a11cfbf25b5c52",
    route: "生成扫线 + 脚本排印",
    fidelity: "原照像素验证",
    license: "未声明许可证",
    licenseNote: "只研究架构和运行行为，不复制或发布上游代码、参考图与衍生实现。",
    summary: "模型只画炭笔扫线和彩色涂鸦面板，脚本负责原照拼接、英文标题、结构验证和人工评分汇总。",
    proof: "本次 9:16、原照像素忠实度与干净面板角落三项自动检查均通过。",
    capability: "它把创意与排印分开：模型生成有机手势，脚本确保照片、标题、比例和基本结构不会随机漂移。",
    principles: ["图像模型只生成无字面板", "题材按 gesture、mass、rhythm、path 路由", "自动结构验证与人工质量评分必须区分"],
    useCases: [
      { title: "摄影诗页", description: "原照与一条抽象手势形成上下呼应。" },
      { title: "文化活动海报", description: "需要固定英文标题和可变生成面板。" },
      { title: "混合生成管线", description: "适合作为模型创意 + 脚本交付的架构基线。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/poetic-line-zine-poster/01.png", alt: "上游武汉落日样例", caption: "上游样例：照片与炭笔扫线共享水平节奏。" },
      { src: "/generated/upstream/poetic-line-zine-poster/02.png", alt: "上游黄鹤桥样例", caption: "上游样例：建筑题材以 mass 与 path 组织。" },
      { src: "/generated/upstream/poetic-line-zine-poster/03.png", alt: "上游伸展猫样例", caption: "上游样例：动物动作被路由为 gesture。" },
    ],
    resultImages: [
      { src: "/generated/results/poetic-line-zine-poster.png", alt: "我们的 poetic-line 概念扩展实验", caption: "概念研究 1：用一条炭笔扫线和红色手势回应湖岸照片；不宣称照片区域像素保真。" },
      { src: "/generated/results/poetic-line-zine-poster-variant-02.png", alt: "水平路径与松树质块组成的文化活动概念海报", caption: "概念研究 2：以水平 path、松树 mass、红舟 gesture 和三点 rhythm 展示完整主视觉提案。" },
      { src: "/generated/results/poetic-line-zine-poster-variant-03.png", alt: "回游岸线组织的摄影书章节概念扉页", caption: "概念研究 3：用一条回游岸线组织红舟动作、松树停顿与三点花色节奏。" },
    ],
    sourceFacts: ["舟提供低位动作手势", "岸线提供水平 path", "松树提供右侧 mass，花朵只作微弱节奏"],
    pipeline: ["判断题材路由", "选择抽象强度", "只生成无字面板", "Pillow 拼接原照和标题", "自动验证结构", "人工输入质量分并汇总"],
    directions: [
      { title: "自动与人工门槛分层", description: "结构问题自动拒绝，审美问题保留人工评估与理由。" },
      { title: "题材路由评测", description: "建立动物、建筑、风景和人物固定集，检查路由是否稳定。" },
      { title: "文字排印扩展", description: "在不让模型画字的前提下加入多语言与可变字体。" },
    ],
    nextDemos: [
      { title: "动作人物", description: "验证 gesture 路由和照片忠实度能否同时成立。" },
      { title: "固定集回归", description: "同一版本跑六张覆盖题材，记录人工分和自动检查。" },
    ],
  },
  {
    index: "12",
    slug: "photo-abstract-editorial",
    name: "photo-abstract-editorial",
    repo: "ZzzLc0405/photo-abstract-editorial",
    upstreamUrl: "https://github.com/ZzzLc0405/photo-abstract-editorial",
    commit: "dada5237450d882168c22bae75119e8d24e784b5",
    route: "照片 + 抽象关系面板",
    fidelity: "忠实照片区域",
    license: "未声明许可证",
    licenseNote: "仅研究提示规范和公开样例；不复制或发布上游资产与衍生实现。",
    summary: "把三至六个空间事实重构为象牙色面板中的少量形状，并配一条短英文标题。",
    proof: "舟、立柱、岸线、湖轴、松树和三个花点被抽成克制的几何关系。",
    capability: "它提供一条轻量的编辑模板：照片说明发生了什么，抽象面板说明这些事实之间是什么关系。",
    principles: ["只选择三至六个来源事实", "抽象面板背景保持均匀干净", "标题控制在二至五个英文词"],
    useCases: [
      { title: "摄影杂志内页", description: "为单张照片增加可解释的抽象注脚。" },
      { title: "建筑与空间分析", description: "用少量形状强调轴线、遮挡和重心。" },
      { title: "视觉研究卡", description: "快速记录来源事实到抽象标记的映射。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/photo-abstract-editorial/01.jpg", alt: "上游抽象编辑样例一", caption: "上游样例：照片与象牙色关系面板形成清晰分区。" },
      { src: "/generated/upstream/photo-abstract-editorial/02.jpg", alt: "上游抽象编辑样例二", caption: "上游样例：少数形状对应来源空间事实。" },
      { src: "/generated/upstream/photo-abstract-editorial/03.jpg", alt: "上游抽象编辑样例三", caption: "上游样例：微型标题提供解释但不主导画面。" },
    ],
    resultImages: [
      { src: "/generated/results/photo-abstract-editorial.png", alt: "我们的 photo-abstract-editorial 扩展实验", caption: "扩展实验 1：以六个关系标记重述湖岸空间。" },
      { src: "/generated/results/photo-abstract-editorial-variant-02.png", alt: "六项来源事实映射成的空间研究卡", caption: "扩展实验 2：将舟、柱、湖轴、岸线、松树与三花点映射为可教学、可追溯的关系面板。" },
      { src: "/generated/results/photo-abstract-editorial-variant-03.png", alt: "没有标题提示的湖岸关系盲测卡", caption: "扩展实验 3：移除标题提示，以五类几何关系测试抽象面板能否回指湖岸来源。" },
    ],
    sourceFacts: ["红舟是主重心", "立柱与松树形成高低不同的竖向量", "岸线、湖轴和三个花点形成横向节奏"],
    pipeline: ["选三至六个空间事实", "映射为形状和间隔", "生成均匀象牙色面板", "加入短英文标题", "目测事实是否都可追溯"],
    directions: [
      { title: "映射表显式化", description: "把每个来源事实、抽象标记和坐标写入可检查的数据。" },
      { title: "确定性合成", description: "让模型只画面板，脚本负责原照、标题和区域验证。" },
      { title: "标题消融", description: "比较有标题、无标题和双语标题对理解的影响。" },
    ],
    nextDemos: [
      { title: "强透视建筑", description: "测试轴线与遮挡是否比物体轮廓更有效。" },
      { title: "无标题盲测", description: "观察读者是否能从抽象面板识别来源关系。" },
    ],
  },
  {
    index: "13",
    slug: "photo-to-zine-postcard",
    name: "photo-to-zine-postcard",
    repo: "Whiplashzeb/photo-to-zine-postcard",
    upstreamUrl: "https://github.com/Whiplashzeb/photo-to-zine-postcard",
    commit: "0091403bccb219d1be78c5be8552de29a6446f0a",
    route: "双面印刷产品",
    fidelity: "正面嵌入原照",
    license: "MIT",
    licenseNote: "可运行与扩展；需要保留 MIT 许可证和署名。",
    summary: "把照片处理落到固定 2:3 明信片产品：正面图像系统与可书写背面同时成立。",
    proof: "正面含手绘木舟、一个辅图形和恰好三枚色卡；背面保留地址、邮票和完整书写功能。",
    capability: "它最独特的地方是产品化：不止生成一张好看的图，还要满足双面、比例、色卡、元数据和书写功能。",
    principles: ["固定 2:3 正反面交付", "正面只使用一个主手绘元素和至多一个辅元素", "必须从来源取恰好三枚色块"],
    useCases: [
      { title: "旅行明信片", description: "把个人照片转成可打印、可寄送的双面产品。" },
      { title: "活动纪念品", description: "为地点或展览制作统一格式的轻量周边。" },
      { title: "品牌赠品", description: "在明确印刷规格内承载照片、元数据和识别色。" },
    ],
    upstreamDemos: [
      { src: "/generated/upstream/photo-to-zine-postcard/01.png", alt: "上游森林住宅明信片", caption: "上游样例：原照、主手绘元素和三色卡共同组成正面。" },
      { src: "/generated/upstream/photo-to-zine-postcard/02.png", alt: "上游高山霞光明信片", caption: "上游样例：来源色板控制产品系列感。" },
      { src: "/generated/upstream/photo-to-zine-postcard/03.png", alt: "上游绿色门明信片", caption: "上游样例：小型元数据不干扰主图。" },
    ],
    resultImages: [
      { src: "/generated/results/photo-to-zine-postcard-front.png", alt: "我们的明信片正面扩展实验", caption: "扩展实验正面：原照、红舟手绘元素、一个辅形与三枚来源色卡。" },
      { src: "/generated/results/photo-to-zine-postcard-back.png", alt: "我们的明信片背面扩展实验", caption: "扩展实验背面：保留地址线、邮票区和可书写空间。" },
      { src: "/generated/results/photo-to-zine-postcard-variant-03.png", alt: "正反两面完整入镜的旅行明信片产品提案板", caption: "扩展实验 3：正面视觉与可书写背面完整同屏，让能力落到可理解的产品交付。" },
    ],
    sourceFacts: ["原照片作为正面视觉来源", "红舟最适合作为唯一主手绘元素", "红、湖蓝与花黄构成三枚来源色卡"],
    pipeline: ["固定 2:3 产品规格", "嵌入原照", "选择主手绘元素和辅形", "提取恰好三色", "生成背面功能网格", "检查正反面完整性"],
    directions: [
      { title: "印前检查", description: "加入出血、裁切安全区、分辨率与 CMYK 风险提示。" },
      { title: "批量套系", description: "同一旅行建立多张明信片，并保持背面系统一致。" },
      { title: "可变数据", description: "让地点、日期和编号由结构化数据确定性排入。" },
    ],
    nextDemos: [
      { title: "真实印刷校样", description: "输出含出血版本并检查裁切后的信息安全区。" },
      { title: "三张旅行套系", description: "验证色板和主元素规则能否形成产品家族。" },
    ],
  },
];

export const skillBySlug = new Map(skills.map((skill) => [skill.slug, skill]));
