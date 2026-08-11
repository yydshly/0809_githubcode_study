import type { DemoImage } from "@/app/data/skills";

export type ProductType =
  | "editorial"
  | "poster"
  | "mobile"
  | "gallery"
  | "digital"
  | "packaging"
  | "education"
  | "archive";

export type ProductPresentation =
  | "florist-editorial-campaign-suite"
  | "five-card-mobile-story"
  | "audio-cover-motion-set"
  | "sound-exhibition-entry-system"
  | "night-shop-archive-record"
  | "hotel-three-tone-selector"
  | "eight-fold-oral-history-booklet"
  | "four-panel-season-archive-wall"
  | "commuter-mobile-editorial-kit"
  | "meditation-multiscreen-scene"
  | "podcast-season-release-kit"
  | "three-cover-bookstore-review-set"
  | "oral-history-memory-box"
  | "museum-object-label-system"
  | "ep-tour-release-system"
  | "florist-riso-wrap-system"
  | "three-stop-night-tour-system"
  | "fashion-lookbook-campaign-kit"
  | "festival-variable-ticket-system"
  | "interactive-education-wall"
  | "musician-tour-stage-system"
  | "photo-book-stage-scroll"
  | "foldout-learning-toolkit"
  | "hotel-space-annotation-kit"
  | "postcard-collector-box-set"
  | "hotel-room-postcard-guide"
  | "parade-employer-brand-suite"
  | "automation-report-launch-kit"
  | "micro-apartment-property-story"
  | "mobile-clinic-impact-system"
  | "founder-launch-letter-suite"
  | "cybersecurity-conference-system"
  | "hardware-store-anniversary-kit"
  | "industrial-automation-release-kit"
  | "perfume-archive-anniversary-system"
  | "fulfillment-operations-story-system"
  | "wind-energy-report-system"
  | "exhibition-installation-case-system"
  | "conference-thank-you-postcard-system";

export type ProductProcessStep = {
  label: "保留" | "适配" | "生产" | "应用";
  detail: string;
};

export type ProductApplicationCase = {
  id: string;
  productType: ProductType;
  presentation: ProductPresentation;
  title: string;
  scenario: string;
  audience: string;
  capabilityFocus: string;
  effect: DemoImage;
  process: readonly [ProductProcessStep, ProductProcessStep, ProductProcessStep, ProductProcessStep];
  output: {
    name: string;
    specs: string[];
    channel: string;
  };
  evidenceLevel: "数字环境预演" | "实物打样" | "现实部署";
  boundary: string;
};

export const productApplicationsBySlug: Record<string, readonly [ProductApplicationCase, ProductApplicationCase]> = {
  "daily-photo-playground": [
    {
      id: "rainy-florist-editorial",
      productType: "editorial",
      presentation: "florist-editorial-campaign-suite",
      title: "《雨停前，把最后一束花送出去》独立花店雨季人物特刊",
      scenario: "街区生活方式媒体与独立花店把一次雨后收摊扩展成人物特刊，让完整现场、人物故事与品牌颜色同时进入杂志、橱窗和手机信息流。",
      audience: "城市生活方式读者、独立花店顾客、街区文化关注者",
      capabilityFocus: "检验人物越出版心、来源色场与完整原照证据窗能否共同形成可延展的编辑主视觉。",
      effect: {
        src: "/generated/studies/daily-photo-playground/next-person-street-effect.png",
        alt: "雨后花店街口中，成年女花艺师越出版心并保留完整来源照片窗口的高饱和编辑拼版",
        caption: "能力效果：人物、花束与街道来源色被拆成编辑层，完整小原照继续说明故事发生的环境。",
      },
      process: [
        { label: "保留", detail: "锁定经授权的完整人物原照、采访内容、摄影者和店铺信息，完整证据窗不裁切。" },
        { label: "适配", detail: "从服装、花束和街道提取色场，让人物越出版心，并为标题和品牌标志预留稳定区域。" },
        { label: "生产", detail: "由确定性排版加入真实姓名、标题、营业信息和品牌标志，分别输出印刷与屏幕版本。" },
        { label: "应用", detail: "把成品完整放入杂志跨页、花店橱窗和手机轮播三个环境，检查远近阅读与人物可读性。" },
      ],
      output: {
        name: "雨季人物特刊整合发布包",
        specs: ["A3 海报，297×420 mm，300 DPI，CMYK，3 mm 出血", "社交首图 1080×1350", "竖屏故事 1080×1920", "橱窗版 500×700 mm"],
        channel: "杂志人物特刊、花店橱窗、社交媒体轮播",
      },
      evidenceLevel: "数字环境预演",
      boundary: "当前人物和店铺均为虚构合成；真人商业项目必须取得肖像、摄影与店面授权，生成阶段不承担关键可读文字。",
    },
    {
      id: "rainy-city-mobile-serial",
      productType: "mobile",
      presentation: "five-card-mobile-story",
      title: "《雨天仍在营业》城市慢行 24h 竖屏连载",
      scenario: "城市文化账号把同一天、同街区的低饱和雨景整理成连续手机故事，让普通街拍拥有栏目节奏，同时保留每张照片的地点与现场语境。",
      audience: "城市通勤者、周末步行者、地方文化账号订阅者",
      capabilityFocus: "检验低饱和输入中只使用一个来源暖色锚，仍能建立连续、可识别的编辑系列。",
      effect: {
        src: "/generated/studies/daily-photo-playground/low-saturation-rain-editorial-effect.svg",
        alt: "完整低饱和雨景照片、灰蓝与暖纸色场以及单一锈红色锚组成的竖版编辑效果",
        caption: "能力效果：不依赖天然高彩照片，利用冷暖纸面、单一色锚和完整来源窗建立雨天编辑节奏。",
      },
      process: [
        { label: "保留", detail: "保留每张授权雨景的完整边界、地点、时间和摄影者信息，避免用裁切制造不存在的事件。" },
        { label: "适配", detail: "为每张画面只选择一个来源暖色锚，并把开场、地点、细节、效果和原照回看组织成五卡顺序。" },
        { label: "生产", detail: "将标题、地点和页序作为稳定 UI 层加入，导出竖屏、锁屏和短视频静帧版本。" },
        { label: "应用", detail: "在真实手机、地铁弱光和户外高亮环境预演整组内容，检查安全区和低饱和层次。" },
      ],
      output: {
        name: "城市雨天五卡竖屏故事",
        specs: ["竖屏 1080×1920", "顶部与底部各保留 160 px 平台安全区", "锁屏 1290×2796", "完整原照回看卡使用 contain"],
        channel: "移动端故事、城市文化账号、短视频片尾静帧",
      },
      evidenceLevel: "数字环境预演",
      boundary: "该连载不是导航、天气预报或新闻摄影核验；地点文字必须人工核实，调色不能抹去人物肤色和关键现场信息。",
    },
  ],

  "dyy-photo-deconstruct": [
    {
      id: "five-mark-audio-cover",
      productType: "digital",
      presentation: "audio-cover-motion-set",
      title: "《赶上最后一班》五秒声音作品封面",
      scenario: "独立音乐人与声音艺术家把一段赶车动作压缩成五个无字记号，形成适用于流媒体缩略图和动态封面的安静动作入口。",
      audience: "耳机收听者、独立音乐听众、声音艺术活动观众",
      capabilityFocus: "检验五个最小动作 mark 在没有人物轮廓和照片像素时，能否继续传递前倾、跨步、负重与速度。",
      effect: {
        src: "/generated/studies/dyy-photo-deconstruct/single-motion-five-mark-effect.svg",
        alt: "以前倾弧、跨步轴、负重块、围巾轨迹和落点五个记号构成的无字动作海报",
        caption: "能力效果：人物照片被完全移除，只留下五个承担不同动作职责的主要 mark 与大片空纸。",
      },
      process: [
        { label: "保留", detail: "从授权动作照片中只记录躯干弧、跨步轴、负重块、围巾轨迹和落点五种关系。" },
        { label: "适配", detail: "删除照片、人物轮廓和文字，让五个 mark 在方形与竖屏画布中保持相同动作顺序。" },
        { label: "生产", detail: "按动作先后制作五秒出现与消退循环，标题和艺人信息交给平台 UI 或确定性排版。" },
        { label: "应用", detail: "在 80 px 缩略图、手机播放页和电视端分别预演静态封面与动态版本。" },
      ],
      output: {
        name: "五秒动态声音作品封面",
        specs: ["静态封面 3000×3000 sRGB", "动态版 1080×1080 与 1080×1920", "H.264，5 秒，24 fps", "提供静态 fallback"],
        channel: "流媒体专辑页、试听竖屏、歌词页分隔图",
      },
      evidenceLevel: "数字环境预演",
      boundary: "五个 mark 是编辑转译，不是动作捕捉、人体测量或身份还原；正式人物素材仍需授权。",
    },
    {
      id: "transit-sound-exhibition",
      productType: "gallery",
      presentation: "sound-exhibition-entry-system",
      title: "《汇聚 / 停顿》城市通勤声音展入口装置",
      scenario: "城市声音展用五类极简记号提示换乘压力，同时给展览文字、声音和空白留出足够空间。",
      audience: "声音展观众、城市观察者、信息设计学生",
      capabilityFocus: "检验高信息密度路口能否压成五类 mark，并在远看和近看时维持方向压力。",
      effect: {
        src: "/generated/studies/dyy-photo-deconstruct/next-city-junction-effect.png",
        alt: "以汇聚线、横杆、双色楔形、车体端点和蓝框楼梯五类记号压缩复杂换乘站的极简效果",
        caption: "能力效果：复杂路口不再以照片或人物出现，而被整理成五类可逐项核对的视觉记号。",
      },
      process: [
        { label: "保留", detail: "只保留汇聚线、横杆、双色楔形、车体端点和蓝框楼梯五类可观察关系。" },
        { label: "适配", detail: "将 mark 压在长幅局部，大面积纸面留给展览标题、音频说明和停顿。" },
        { label: "生产", detail: "制作两色丝网或喷绘样张，并进行 5 米、2 米和 50 厘米三级观看测试。" },
        { label: "应用", detail: "在入口长幅、试听台屏保和解释卡中使用，确保装饰图形不与官方导视混淆。" },
      ],
      output: {
        name: "通勤声音展无字入口系统",
        specs: ["入口长幅 1200×2400 mm 矢量", "解释卡 A5", "试听台屏保 1920×1080", "主要 mark 最小宽度 8 mm"],
        channel: "展览入口、声音试听台、教育解释卡",
      },
      evidenceLevel: "数字环境预演",
      boundary: "极简图形绝不能替代安全导视、路线图或客流数据；地面与墙面应用必须避开疏散标识。",
    },
  ],

  "travel-photo-abstraction": [
    {
      id: "camera-shop-night-archive",
      productType: "archive",
      presentation: "night-shop-archive-record",
      title: "《北港照相馆：一块店招的夜间档案》",
      scenario: "街区档案项目需要保存旧店招与夜间街景的完整原貌，同时用独立面板解释橱窗、巷道和红伞的视觉关系。",
      audience: "地方史读者、街区档案研究者、建筑与零售文化关注者",
      capabilityFocus: "检验来源文字和照片像素由确定性流程锁定时，抽象解释能否在不篡改事实区的前提下成立。",
      effect: {
        src: "/generated/studies/travel-photo-abstraction/next-shop-sign-lock-effect-self-contained.svg",
        alt: "完整嵌入 NORTH HARBOR PHOTO 夜间照相馆来源图并附独立关系面板的档案式效果",
        caption: "能力效果：店招、橱窗和街道由完整来源图承担，抽象面板只解释暖窗、蓝巷与红伞的关系。",
      },
      process: [
        { label: "保留", detail: "获取授权原照，人工核对店招文字、地点、拍摄时间、摄影者和使用许可。" },
        { label: "适配", detail: "以原字节锁定照片区，只在独立区域绘制关系面板和来源说明。" },
        { label: "生产", detail: "加入元数据、授权状态、哈希和文字转录，并输出网页与展板档案版本。" },
        { label: "应用", detail: "在网页放大器和 A2 档案板中检查完整边界、招牌清晰度与来源一致性。" },
      ],
      output: {
        name: "夜间店铺数字档案页",
        specs: ["网页原图最长边不低于 2560 px", "照片区始终 contain", "A2 展板，300 DPI", "保存 SHA-256、色彩空间与授权状态"],
        channel: "街区档案网站、地方史展板、店铺故事专题",
      },
      evidenceLevel: "数字环境预演",
      boundary: "当前店铺为合成场景；真实应用还需商标、建筑与摄影授权，抽象面板不能冒充档案事实。",
    },
    {
      id: "night-tone-hotel-selector",
      productType: "digital",
      presentation: "hotel-three-tone-selector",
      title: "《同一夜景，三种灯光语气》精品酒店城市夜游选片器",
      scenario: "精品酒店编辑团队要为夜游手册选择视觉语气，但不允许任何生成步骤改写真实街景、店招或人物。",
      audience: "酒店住客、礼宾团队、城市夜游内容编辑",
      capabilityFocus: "检验同一完整夜景和同一关系结构在只改变面板亮度时，如何形成可公平比较的三档语气。",
      effect: {
        src: "/generated/studies/travel-photo-abstraction/night-contrast-three-panel-effect.svg",
        alt: "同一完整夜间照相馆照片与三档浅色关系面板并列显示的对照效果",
        caption: "能力效果：三列使用同一来源照片和相同 mark，仅改变面板纸白亮度，适合真实选片评审。",
      },
      process: [
        { label: "保留", detail: "锁定同一张授权夜景以及照片中的全部可读文字和现场事实。" },
        { label: "适配", detail: "保持照片、关系 mark 和版式一致，只改变三档面板纸白亮度。" },
        { label: "生产", detail: "在大堂暗光、客房电视和纸张打样中评审一档，并建立系列色彩规范。" },
        { label: "应用", detail: "将选定语气推广到酒店夜游折页、大堂屏和客房电视入口卡。" },
      ],
      output: {
        name: "酒店夜游三档语气评审包",
        specs: ["大堂屏 3840×2160", "折页 A6/A5，300 DPI，3 mm 出血", "客房电视 1920×1080", "暗场检查文字对比度"],
        channel: "精品酒店大堂、客房电视、夜游折页",
      },
      evidenceLevel: "数字环境预演",
      boundary: "该效果不提供路线或营业信息；真实夜景仍需色彩打样，任何店招不得由生成模型重画。",
    },
  ],

  "scenes-gathered-zine": [
    {
      id: "women-reunion-oral-history",
      productType: "editorial",
      presentation: "eight-fold-oral-history-booklet",
      title: "《我们又坐回同一张桌子》女性友谊口述史折页册",
      scenario: "社区口述史项目用一次五位成年女性的重聚晚餐进入多年友谊故事，让完整人物关系和非线性记忆并列存在。",
      audience: "口述史参与者、家人、社区文化观众、独立刊物读者",
      capabilityFocus: "检验多人照片锚点、撕纸材料场和单一结构色能否在不替代人物的前提下讲述关系。",
      effect: {
        src: "/generated/studies/scenes-gathered-zine/next-indoor-gathering-effect.png",
        alt: "五位成年女性重聚晚餐照片锚点与撕纸关系场并置的口述史拼贴效果",
        caption: "能力效果：约三分之一页面的照片锚点保留五人互动，抽象场只连接目光、递盘与交谈关系。",
      },
      process: [
        { label: "保留", detail: "获得每位参与者的照片与故事授权，保留五人上半身、桌面互动和室内环境。" },
        { label: "适配", detail: "用一条结构色连接目光、递盘和交谈，引文、姓名和座位关系独立排版。" },
        { label: "生产", detail: "完成八折册、录音二维码和网页伴读版，并让每位参与者共同校对。" },
        { label: "应用", detail: "把成品放入家庭餐桌阅读、社区展柜和手机伴读三个完整环境进行预演。" },
      ],
      output: {
        name: "女性友谊口述史八折册",
        specs: ["单页 140×210 mm，八折", "300 DPI，CMYK，3 mm 出血", "网页伴读版宽 1440 px", "二维码不小于 20 mm"],
        channel: "社区口述史出版、家庭纪念、展览人物关系引导",
      },
      evidenceLevel: "数字环境预演",
      boundary: "现有聚会为虚构输入；真实项目不得根据照片自行推断人物关系、情绪或家庭身份，所有引文必须由本人确认。",
    },
    {
      id: "four-season-library-wall",
      productType: "gallery",
      presentation: "four-panel-season-archive-wall",
      title: "《同一栋建筑的四次呼吸》城市种子图书馆季节档案墙",
      scenario: "图书馆或社区建筑周年展用固定机位的四季照片展示同一地点如何变化，并让建筑事实始终保持完整。",
      audience: "社区居民、图书馆使用者、建筑访客、地方档案观众",
      capabilityFocus: "检验四张完整季节照片、变化的纸面材料和一条固定结构色能否形成可持续更新的地点系列。",
      effect: {
        src: "/generated/studies/scenes-gathered-zine/four-season-structure-effect.svg",
        alt: "同一玻璃种子图书馆春夏秋冬四张完整照片与贯穿钴蓝结构带组成的季节长幅",
        caption: "能力效果：四季成员各自保持完整，钴蓝结构带连接同一建筑，材料纹理只表达季节差异。",
      },
      process: [
        { label: "保留", detail: "固定机位和取景规则，保留四季照片的完整边界、日期、天气和摄影信息。" },
        { label: "适配", detail: "只让纸面纹理随季节变化，以同一钴蓝结构带连接建筑事实。" },
        { label: "生产", detail: "输出四块展板、季节标签和可带走折页，并按真实展厅照明打样。" },
        { label: "应用", detail: "在四米档案墙和网页横向浏览中完整呈现，并为下一年度保留替换机制。" },
      ],
      output: {
        name: "四季建筑档案墙",
        specs: ["四块 700×1050 mm 展板", "建议 5 mm 铝塑板或亚克力", "总墙宽约 4 m", "网页横向浏览宽 1920 px"],
        channel: "社区图书馆周年展、建筑档案墙、线上季节记录",
      },
      evidenceLevel: "数字环境预演",
      boundary: "四张照片不能单独证明气候变化；日期、天气和建筑状态必须来自核实记录。",
    },
  ],

  "scene-distillation-zine": [
    {
      id: "commuter-pressure-story",
      productType: "mobile",
      presentation: "commuter-mobile-editorial-kit",
      title: "《在交叉人流里留一口气》通勤心理健康专题",
      scenario: "城市媒体或员工支持项目讨论通勤压力，希望删除乘客身份，只保留交叉、压缩和停滞的身体感受。",
      audience: "成年通勤者、公共议题读者、员工支持项目参与者",
      capabilityFocus: "检验密度、方向、间隔和停滞点能否替代人物剪影，形成不暴露身份的主观压力视觉。",
      effect: {
        src: "/generated/studies/scene-distillation-zine/next-crowded-pressure-effect.png",
        alt: "以两股方向场、横向压缩带和红色停滞结表达拥挤通勤压力的无人物抽象效果",
        caption: "能力效果：不画任何人物轮廓，仅用方向、密度和局部停滞表达高峰通勤的主观压力。",
      },
      process: [
        { label: "保留", detail: "通过访谈只记录交叉、压缩和停滞三类主观体验，不保留可识别乘客。" },
        { label: "适配", detail: "将体验转为方向场、密度带和停滞结，并为帮助资源和正文留出稳定区域。" },
        { label: "生产", detail: "制作低速呼吸动画、静态替代与长文分隔图，帮助资源由专业人员审核。" },
        { label: "应用", detail: "在手机长文、播客封面和线下讲座海报中检查动效敏感性和文本层级。" },
      ],
      output: {
        name: "通勤压力移动专题视觉包",
        specs: ["社交 1080×1350", "竖屏 1080×1920", "网页提供 reduced-motion 静态版", "讲座海报 A2"],
        channel: "城市媒体长文、员工支持专题、公共议题讲座",
      },
      evidenceLevel: "数字环境预演",
      boundary: "该视觉不是心理诊断、客流分析或站点安全数据，只能作为主观经验专题的入口。",
    },
    {
      id: "snowline-meditation-scene",
      productType: "digital",
      presentation: "meditation-multiscreen-scene",
      title: "《雪线之外》冬季冥想 App 十分钟呼吸场",
      scenario: "冥想产品需要一段极低刺激的冬季视觉，让风势、停顿和结束提示承担呼吸节奏，而不是复刻具体雪地。",
      audience: "需要短暂停顿的成年用户、沉浸空间访客、冥想内容订阅者",
      capabilityFocus: "检验浅紫风势、石墨间隔和酸绿缺口三类形式角色能否在大面积空白中支撑完整交互状态。",
      effect: {
        src: "/generated/studies/scene-distillation-zine/empty-snowfield-three-role-effect.svg",
        alt: "只含浅紫风势、石墨间隔和酸绿缺口并保留大片空白的雪原蒸馏效果",
        caption: "能力效果：零照片像素、零人物与零地点轮廓，以三类形式角色表达空旷、风向和一次微小突破。",
      },
      process: [
        { label: "保留", detail: "保留风势、间隔和缺口三类语义角色，并维持至少 85% 空白。" },
        { label: "适配", detail: "将三类角色分别绑定吸气、停顿和完成状态，不增加人物或风景轮廓。" },
        { label: "生产", detail: "制作极慢循环、静态版和无声版，并对 OLED、投影与低性能设备分级。" },
        { label: "应用", detail: "在手机全屏、暗室投影和会话封面中完整预演，检查眩晕、亮度和续航。" },
      ],
      output: {
        name: "冬季十分钟呼吸视觉场",
        specs: ["手机母版 1440×3120", "投影 3840×2160", "60 fps 上限并提供 24 fps 降级", "完整画面不裁切"],
        channel: "冥想 App、静心空间投影、会话封面",
      },
      evidenceLevel: "数字环境预演",
      boundary: "不是医疗或心理治疗产品；酸绿色需通过对比度与光敏安全检查，画面不对应真实雪地地点。",
    },
  ],

  "gc-minimal-zine-poster": [
    {
      id: "unposted-message-podcast",
      productType: "digital",
      presentation: "podcast-season-release-kit",
      title: "《未寄出的消息》文学播客第七季视觉系统",
      scenario: "文学播客每期只有一句故事摘要，需要把它编译成连续但不雷同的键视觉，并为真实节目文字保留大面积空间。",
      audience: "文学播客听众、散文读者、文化活动观众",
      capabilityFocus: "检验纯文本能否被压成一个主隐喻、一个高彩锚、一个微小证据和稳定留白。",
      effect: {
        src: "/generated/studies/gc-minimal-zine-poster/next-text-theme-variant-01.png",
        alt: "以高彩蓝色长椅、低彩未寄明信片和大面积暖纸留白构成的纯文本极简海报",
        caption: "能力效果：一句关于末班渡船和未寄消息的短文，被编译成单一长椅主锚与小型纸片证据。",
      },
      process: [
        { label: "保留", detail: "保留编辑确认的一句主题摘要，不引入未在节目中出现的地点、人物和情节。" },
        { label: "适配", detail: "将摘要编译为主隐喻、高彩锚、微小证据和大留白，适配方形与竖屏。" },
        { label: "生产", detail: "用确定性模板加入节目名、集数、嘉宾、日期和平台信息。" },
        { label: "应用", detail: "在 80 px 缩略图、手机播放页、舞台屏和纸面书签中预演季度系统。" },
      ],
      output: {
        name: "文学播客季度视觉发布包",
        specs: ["播客封面 3000×3000", "竖屏 1080×1920", "舞台屏 3840×2160", "书签 50×150 mm，两色印刷"],
        channel: "播客平台、文化活动舞台、社交媒体、纪念书签",
      },
      evidenceLevel: "数字环境预演",
      boundary: "视觉隐喻不是故事事实；生成图不得承担关键可读文字，嘉宾、日期和节目名必须后置排版。",
    },
    {
      id: "blue-seed-cover-review",
      productType: "editorial",
      presentation: "three-cover-bookstore-review-set",
      title: "《蓝色种子》气候散文三封面书店盲选套组",
      scenario: "出版社希望只比较水平、垂直和对角版式轴，不被不同素材、色板或纹理干扰，再将选定方案做成真实书衣。",
      audience: "图书编辑、作者、书店策展人、试读者",
      capabilityFocus: "检验同一文本、同一蓝色种子锚和同一五 mark 预算下，仅改变空间轴能否形成三种完整阅读节奏。",
      effect: {
        src: "/generated/studies/gc-minimal-zine-poster/equal-budget-three-variants-effect.svg",
        alt: "同一蓝色种子、裂陶片、色板和五个 mark 形成的水平、垂直与对角三张完整极简封面",
        caption: "能力效果：三版共享相同语义和视觉预算，只改变版式坐标轴，用于公平比较封面节奏。",
      },
      process: [
        { label: "保留", detail: "固定书名文案、蓝色种子隐喻、五个 mark、色板和纸面纹理预算。" },
        { label: "适配", detail: "只改变水平、垂直和对角三种版式轴，并同时准备封面、书脊和封底安全区。" },
        { label: "生产", detail: "制作 160 px 缩略样张和实体比例样书，完成无标题盲选记录。" },
        { label: "应用", detail: "选定一版后加入 ISBN、作者和出版社信息，放入书店桌面与橱窗环境预演。" },
      ],
      output: {
        name: "蓝色种子三封面评审套组",
        specs: ["成书 130×198 mm", "书脊按真实页数计算", "300 DPI，CMYK，3 mm 出血", "书店海报 A2"],
        channel: "出版社封面评审、书店陈列、读者盲选",
      },
      evidenceLevel: "数字环境预演",
      boundary: "该套组只研究版式偏好，不是植物学或气候科学表达验证；蓝色种子故事为虚构隐喻。",
    },
  ],

  "photo-revival": [
    {
      id: "family-oral-history-box",
      productType: "packaging",
      presentation: "oral-history-memory-box",
      title: "《四件外套，那个冬天》家庭口述史纪念盒",
      scenario: "家庭档案整理者把一张旧合照与四位成年女性的回忆做成可传阅纪念盒，让手绘记忆和原始档案各自保留角色。",
      audience: "家庭成员、私人档案整理者、口述史参与者",
      capabilityFocus: "检验完整重绘能否降低照片细节精度、强化少量共同记忆，同时不冒充身份或年代复原。",
      effect: {
        src: "/generated/studies/photo-revival/family-reunion-1986-effect.png",
        alt: "四位成年女性家庭团聚旧照被重绘为保留服装色与人物关系的小型手绘记忆画",
        caption: "能力效果：人物关系与年代服装成为手绘记忆入口，但原始照片与真实资料仍需单独归档。",
      },
      process: [
        { label: "保留", detail: "高精扫描原照并取得人物或继承人的同意，原文件和元数据放入独立档案袋。" },
        { label: "适配", detail: "通过访谈共同选择一至两个记忆细节，不由画面猜测姓名、身份或关系。" },
        { label: "生产", detail: "完成布面小书、手绘章节画、四张引文卡、时间线折页和纪念盒打样文件。" },
        { label: "应用", detail: "在家庭餐桌、书架和纪念赠礼环境中完整预演，并由家庭成员校对。" },
      ],
      output: {
        name: "家庭口述史布面纪念盒",
        specs: ["小书 180×240 mm，300 DPI", "原照扫描 600 DPI TIFF", "引文卡 100×150 mm", "建议使用无酸档案纸"],
        channel: "家庭传阅、私人档案、纪念赠礼",
      },
      evidenceLevel: "数字环境预演",
      boundary: "重绘不是身份恢复或年代鉴定；原始照片必须保留，未同意的人物不能进入公开版本。",
    },
    {
      id: "music-box-museum-story",
      productType: "gallery",
      presentation: "museum-object-label-system",
      title: "《缺一颗星的音乐盒》博物馆捐赠物故事标签",
      scenario: "小型博物馆希望用一件捐赠物进入口述故事，以两处触觉记忆取代商品式精细照片，同时保留标准藏品信息。",
      audience: "展厅访客、捐赠者、博物馆教育项目参与者",
      capabilityFocus: "检验单一物件重绘是否真正会选择两处记忆细节，而不是平均复制全部纹理。",
      effect: {
        src: "/generated/studies/photo-revival/music-box-memory-effect.png",
        alt: "只强化黄铜摇柄与缺失星形空位的孔雀蓝音乐盒手绘记忆画",
        caption: "能力效果：石墨、薄水彩和金色干笔只提升两处可讲述细节，其余材料退入大面积留白。",
      },
      process: [
        { label: "保留", detail: "按馆方规范拍摄、编号和登记真实物件，并保留原始档案照。" },
        { label: "适配", detail: "由捐赠者选择两处真正有意义的记忆细节，重绘图不承担材质和年代结论。" },
        { label: "生产", detail: "制作 A5 故事卡、标准藏品标签、45 秒音频、文字稿和二维码页面。" },
        { label: "应用", detail: "在展柜、触摸屏和线上藏品页中预演完整故事，并由策展与保护人员审核。" },
      ],
      output: {
        name: "音乐盒捐赠物多媒体故事标签",
        specs: ["故事卡 A5", "藏品标签 90×140 mm", "屏幕 1920×1080", "音频 WAV 母版、MP3 分发及完整文字稿"],
        channel: "博物馆展柜、教育触摸屏、线上藏品故事页",
      },
      evidenceLevel: "数字环境预演",
      boundary: "现有物件为合成输入；手绘结果不能用于文物修复、估值、年代或材质判定。",
    },
  ],

  "pixel-style-poster": [
    {
      id: "jazz-vocalist-tour-system",
      productType: "poster",
      presentation: "ep-tour-release-system",
      title: "《Midnight Bloom》爵士歌手 EP 与小型巡演视觉",
      scenario: "独立厂牌需要让一位成年女歌手的面部、丝绒服装和麦克风在专辑缩略图、现场海报和舞台屏上保持点阵层次。",
      audience: "爵士听众、演出观众、独立唱片收藏者",
      capabilityFocus: "检验不同网频是否能同时承担面部、头发、衣料、麦克风和环境层级，而不退化成统一滤镜。",
      effect: {
        src: "/generated/studies/pixel-style-poster/closeup-vocalist-halftone-effect.png",
        alt: "成年女爵士歌手面部、丝绒服装和麦克风使用不同细密网频重构的编辑海报",
        caption: "能力效果：高密微点阵保留面部表现，衣料、麦克风和环境用不同密度建立印刷式层级。",
      },
      process: [
        { label: "保留", detail: "取得歌手、摄影师、服装和场地授权，锁定面部、发型、麦克风与服装事实。" },
        { label: "适配", detail: "为面部、头发、衣料、麦克风和背景分配不同网频，并预留确定性标题区。" },
        { label: "生产", detail: "制作真实分色、票面和舞台动态网点，在纸张和 LED 上分别校正摩尔纹。" },
        { label: "应用", detail: "将同一系统放入 EP 封面、六城海报、门票、舞台屏和布袋环境预演。" },
      ],
      output: {
        name: "爵士 EP 与六城巡演视觉包",
        specs: ["EP 封面 3000×3000", "A1 海报 300 DPI", "舞台屏 3840×2160", "2–3 个专色，最小网点按供应商测试确定"],
        channel: "流媒体、巡演海报、门票、舞台屏、演出周边",
      },
      evidenceLevel: "数字环境预演",
      boundary: "屏幕点阵不是印刷证明；真实人物项目必须获得完整授权，点阵效果不能被当作人脸身份验证。",
    },
    {
      id: "rainy-florist-riso-packaging",
      productType: "packaging",
      presentation: "florist-riso-wrap-system",
      title: "《雨季花束》独立花店两色孔版包装季",
      scenario: "独立花店把花艺师雨天街拍延展为一个季度包装系统，让人物、花束和街道分别使用可印刷的点阵密度。",
      audience: "购花顾客、街区活动参与者、独立花店社群",
      capabilityFocus: "检验点阵材料语言能否从人物海报迁移到包装纸、纸套和织物，并保持面部与花束的主次。",
      effect: {
        src: "/generated/studies/pixel-style-poster/next-face-halftone-effect.png",
        alt: "成年女花艺师面部和花束使用高密点阵、服装与雨后街道分层降密的编辑海报",
        caption: "能力效果：面部与花束承担高密识别，服装和街景降低网频，为两至三色印刷延展提供层级。",
      },
      process: [
        { label: "保留", detail: "选择授权人物照片，锁定面部、花束、服装和街道四个主要层级。" },
        { label: "适配", detail: "人脸与花束使用较高密度，街景降低网频，并将局部点阵派生为可平铺图案。" },
        { label: "生产", detail: "按真实刀模制作包装纸、纸套、感谢卡和织物分色，并在三类材料上试印。" },
        { label: "应用", detail: "在花店柜台、花束包裹、橱窗和员工围裙场景中完整预演季度系统。" },
      ],
      output: {
        name: "雨季花束两色包装系统",
        specs: ["包装纸 700×1000 mm", "纸套按真实刀模", "2–3 个专色", "最小线宽建议不小于 0.3 mm，最终以印厂测试为准"],
        channel: "花束包装、零售柜台、橱窗、社交媒体",
      },
      evidenceLevel: "数字环境预演",
      boundary: "包装版不能依赖细小面部识别；品牌文字、价格和必要商品信息必须独立排版并校对。",
    },
  ],

  "photo-relic-editorial": [
    {
      id: "north-harbor-heritage-night",
      productType: "gallery",
      presentation: "three-stop-night-tour-system",
      title: "《北港雨后：影院、桥与闭市长廊》工业遗产夜游展",
      scenario: "城市博物馆用旧影院效果作为首个展览成员，继续组织桥梁和市场同城系列，让每处完整现场只对应一个主 relic。",
      audience: "工业遗产参观者、地方史读者、建筑学生、城市夜游观众",
      capabilityFocus: "检验照片证据与记忆版画能否在同一系列中承担两种时间，并以统一材料语法连接不同地点。",
      effect: {
        src: "/generated/studies/photo-relic-editorial/north-harbor-cinema-effect.png",
        alt: "完整雨后红砖旧影院照片与雨棚、暗入口及缆线组成的单一建筑 relic 上下并置效果",
        caption: "能力效果：照片区保留影院现场，版画区只让雨棚、暗入口和斜线形成一枚可记忆的建筑遗迹。",
      },
      process: [
        { label: "保留", detail: "核实真实地点、历史资料、当前状态和照片授权，照片区完整呈现。" },
        { label: "适配", detail: "每处只选择一个主 relic，并锁定暖象牙纸、炭黑线、砖红和风化青绿材料配方。" },
        { label: "生产", detail: "制作三块灯箱、墙面时间线、折叠路线册和线上专题，所有历史文字独立核验。" },
        { label: "应用", detail: "在展厅与夜游入口预演观看距离、灯光和官方路线信息的衔接。" },
      ],
      output: {
        name: "北港工业遗产三站夜游展",
        specs: ["灯箱 800×1200 mm", "A3 折 DL 路线册", "线上专题宽 1920 px", "照片区始终完整显示"],
        channel: "城市博物馆、夜游展览、地方史折页、线上专题",
      },
      evidenceLevel: "数字环境预演",
      boundary: "现有北港地点是虚构合成；relic 不是历史、结构或工程证据，路线安全信息必须来自官方资料。",
    },
    {
      id: "last-train-fashion-story",
      productType: "editorial",
      presentation: "fashion-lookbook-campaign-kit",
      title: "《末班车之前，她把地图折回口袋》城市外套品牌故事",
      scenario: "城市外套品牌用一位有明确动作、色彩和环境故事的成年女性建立雨季人物特刊，而不是只展示孤立商品。",
      audience: "城市女性消费者、时尚刊物读者、雨季通勤人群",
      capabilityFocus: "检验照片中的人物事实与后来形成的姿态、围巾弧线和倒影 relic 能否共同支撑品牌叙事。",
      effect: {
        src: "/generated/studies/photo-relic-editorial/north-harbor-woman-effect.png",
        alt: "末班车前雨后长廊中的成年女性完整照片与转身、围巾弧和倒影组成的动作 relic 效果",
        caption: "能力效果：人物与环境在上区完整可读，下区把身体竖向姿态和黄色围巾长弧压成单一叙事遗迹。",
      },
      process: [
        { label: "保留", detail: "完成模特、摄影、服装和交通场地授权，完整保留人物姿态、服装与环境。" },
        { label: "适配", detail: "relic 只压缩转身姿态、围巾弧和倒影，商品文字与价格不进入生成图。" },
        { label: "生产", detail: "确定性排入商品名、面料、SKU 和购买信息，并校准屏幕、纸张与吊牌颜色。" },
        { label: "应用", detail: "在地铁灯箱、lookbook、社交竖屏和服装吊牌中预演同一故事系统。" },
      ],
      output: {
        name: "末班车雨季外套人物特刊",
        specs: ["灯箱 1200×1800 mm", "lookbook 跨页 420×297 mm", "社交 1080×1350 与 1080×1920", "吊牌 50×90 mm"],
        channel: "时尚特刊、交通灯箱、社交媒体、服装吊牌",
      },
      evidenceLevel: "数字环境预演",
      boundary: "当前人物为虚构成年人；relic 只表达情绪，不保证服装颜色、面料或版型的商品级真实性。",
    },
  ],

  "photo-distill": [
    {
      id: "festival-variable-visual-engine",
      productType: "digital",
      presentation: "festival-variable-ticket-system",
      title: "《十三场湖岸实验》可变文化节票务视觉引擎",
      scenario: "文化节要为十三场活动批量生成海报、票面和节目卡，并要求每个坐标、色锚和着墨量都能复现、修订和验收。",
      audience: "文化节观众、视觉工程团队、票务与节目运营人员",
      capabilityFocus: "检验代码原生关系海报能否从单张实验升级为可批量导出、可回归检查的真实发布系统。",
      effect: {
        src: "/generated/results/photo-distill.png",
        alt: "以代码控制纸面、密度场、关系几何和单一红色锚点的可复现竖版海报",
        caption: "能力效果：所有坐标、面积、色彩和着墨关系由代码表达，可直接进入批量生成与 QA 流程。",
      },
      process: [
        { label: "保留", detail: "保留固定关系语法、坐标系统、色锚角色和可公开复现的参数边界。" },
        { label: "适配", detail: "将日期、场地、单元和编号映射到明确参数，活动名称保持为确定性文字层。" },
        { label: "生产", detail: "自动检查着墨率、缩略可见性、色锚面积和文本安全区，批量导出并保存哈希。" },
        { label: "应用", detail: "把同一系统放入 A2 海报、票面、证件和社交卡，检查跨尺寸一致性。" },
      ],
      output: {
        name: "十三场文化节可变视觉发布系统",
        specs: ["A2/A3 PDF/X-4", "票面 54×85 mm", "社交 1080×1350", "响应式 SVG 与 160 px 缩略检查"],
        channel: "文化节海报、票务、证件、社交发布",
      },
      evidenceLevel: "数字环境预演",
      boundary: "参数若没有真实数据映射说明，就只是视觉变化而非数据可视化；字体、浏览器和渲染版本需要固定。",
    },
    {
      id: "visible-relations-interactive-wall",
      productType: "gallery",
      presentation: "interactive-education-wall",
      title: "《关系可见》摄影构图互动墙",
      scenario: "设计博物馆让观众亲手改变色锚、线宽与着墨量，观察同一关系系统如何从通过变成失败。",
      audience: "博物馆观众、设计学生、摄影与创意编码学习者",
      capabilityFocus: "检验 SVG 对象、参数和真实栅格指标能否形成可操作的构图教育产品。",
      effect: {
        src: "/generated/results/photo-distill-variant-02.svg",
        alt: "用可审查 SVG 将湖面、岸线、舟、树和花点编码为关系测绘图的代码海报",
        caption: "能力效果：每个关系都是可单独开关、移动和计量的代码对象，适合转成交互式观察工具。",
      },
      process: [
        { label: "保留", detail: "由策展人选择可解释的照片事实，并保留固定输入、参数定义和阈值说明。" },
        { label: "适配", detail: "将每个事实编码成可开关 SVG 对象，提供滑杆、键盘和非触摸替代。" },
        { label: "生产", detail: "现场计算真实栅格着墨和缩略结果，制作 A4 带走页与离线 kiosk。" },
        { label: "应用", detail: "在 55 英寸触摸墙、课堂投影和手机续看页中完成完整互动预演。" },
      ],
      output: {
        name: "摄影关系互动教育墙",
        specs: ["55 英寸 4K 触摸屏", "离线 kiosk，目标 60 fps", "A4 矢量带走页", "键盘可操作与清晰焦点"],
        channel: "设计博物馆、构图课程、创意编码工作坊",
      },
      evidenceLevel: "数字环境预演",
      boundary: "交互结果不证明某种构图更正确；不得采集可识别观众数据，触摸不能成为唯一使用方式。",
    },
  ],

  "poetic-line-zine-poster": [
    {
      id: "last-train-violinist-tour",
      productType: "poster",
      presentation: "musician-tour-stage-system",
      title: "《赶上末班车》青年音乐家巡演人物视觉",
      scenario: "音乐杂志和演出方同时保留成年女小提琴手的完整授权照片，并用独立线条面板放大赶车动作、器材重量与围巾速度。",
      audience: "音乐杂志读者、演出观众、城市文化关注者",
      capabilityFocus: "检验照片事实、gesture、mass、rhythm 和 path 能否由不同技术职责承担并形成可信人物主视觉。",
      effect: {
        src: "/generated/studies/poetic-line-zine-poster/last-train-violinist-fidelity-self-contained.svg",
        alt: "成年女小提琴手赶末班车的完整来源照片与步态、琴盒、围巾和站台关系面板组成的确定性海报",
        caption: "能力效果：照片窗原字节嵌入且完整显示，下方无字面板分别解释动作、重量、节奏和路径。",
      },
      process: [
        { label: "保留", detail: "锁定授权原照、来源哈希、人物、琴盒、围巾和环境完整边界。" },
        { label: "适配", detail: "独立生成 gesture、mass、rhythm 和 path 面板，为真实标题和场次留出安全区。" },
        { label: "生产", detail: "由脚本合成照片、无字面板与确定性排字，并保留照片源字节检查。" },
        { label: "应用", detail: "在人物长篇、巡演海报、社交竖屏、纪录片章节卡和舞台屏中预演。" },
      ],
      output: {
        name: "末班车音乐家巡演视觉包",
        specs: ["2:3 海报，300 DPI", "竖屏 1080×1920", "舞台屏 3840×2160", "照片源字节与发布清单绑定"],
        channel: "人物专栏、巡演海报、社交媒体、舞台屏",
      },
      evidenceLevel: "数字环境预演",
      boundary: "当前人物为虚构合成；真实项目需肖像、摄影、乐器、场地和演出授权，字节锁定只覆盖照片窗。",
    },
    {
      id: "coastline-poetry-scroll",
      productType: "gallery",
      presentation: "photo-book-stage-scroll",
      title: "《沿岸回游》摄影诗集与朗读会舞台长卷",
      scenario: "摄影诗集和现场朗读会需要一条贯穿章节的回游路径，让照片、诗文和有机扫线各自保持完整。",
      audience: "摄影诗集读者、朗读会观众、独立出版与舞台视觉团队",
      capabilityFocus: "检验 path、mass、gesture 和 rhythm 路由能否从单页海报扩展为连续书页、滚动网页与舞台慢动画。",
      effect: {
        src: "/generated/results/poetic-line-zine-poster-variant-03.png",
        alt: "完整湖岸照片与一条回游岸线、红舟动作、松树停顿和三点花色节奏组成的诗性概念扉页",
        caption: "能力效果：回游路径组织观看，其他题材分别成为动作、重量与微节奏，为连续章节提供视觉句法。",
      },
      process: [
        { label: "保留", detail: "保留每组授权照片和诗文原稿，并分别标记 path、mass、gesture 与 rhythm。" },
        { label: "适配", detail: "只生成无字扫线面板，照片、诗文、页码和署名由确定性系统承担。" },
        { label: "生产", detail: "将同一路径输出为书籍静帧、网页滚动和 8–12 秒舞台循环。" },
        { label: "应用", detail: "在诗集章节、环衬、朗读会投影和移动网页中预演连续阅读节奏。" },
      ],
      output: {
        name: "沿岸回游摄影诗集与舞台视觉",
        specs: ["书籍 170×240 mm", "舞台 3840×2160", "网页提供 reduced-motion", "循环时长 8–12 秒"],
        channel: "摄影诗集、朗读会舞台、滚动网页、展览投影",
      },
      evidenceLevel: "数字环境预演",
      boundary: "当前概念效果尚不是像素锁定生产稿；路径表达阅读节奏，不是地理路线或拍摄轨迹。",
    },
  ],

  "photo-abstract-editorial": [
    {
      id: "station-eight-mark-toolkit",
      productType: "education",
      presentation: "foldout-learning-toolkit",
      title: "《看见站台：轮廓与关系的八个标记》建筑观察工具包",
      scenario: "建筑与视觉设计课程公平比较“画了什么”和“如何组织”，让学生逐项追溯同一照片中的轮廓与空间关系。",
      audience: "建筑与视觉设计学生、教师、博物馆教育项目参与者",
      capabilityFocus: "检验同一输入、画布、色板和八 mark 预算下，轮廓路线与关系路线各自保留什么。",
      effect: {
        src: "/generated/studies/photo-abstract-editorial/outline-vs-relations-self-contained.svg",
        alt: "同一完整换乘站来源照片与八个轮廓 mark、八个关系 mark 组成的等预算建筑观察对照板",
        caption: "能力效果：A 面板强调有什么，B 面板强调如何组织，两条路线共享完全相同的来源和 mark 数。",
      },
      process: [
        { label: "保留", detail: "锁定同一完整来源照片、共同画布、限定色板和八 mark 预算。" },
        { label: "适配", detail: "分别建立八个轮廓 mark 和八个关系 mark，所有标记可回指来源事实。" },
        { label: "生产", detail: "制作 A2 折页、二十四张练习卡、教师投影板和网页开关实验。" },
        { label: "应用", detail: "进行无标题课堂辨认与讨论，记录事实遗漏，再修订教学材料。" },
      ],
      output: {
        name: "建筑观察八标记教学工具包",
        specs: ["A2 折 A5", "练习卡 105×148 mm", "投影 1920×1080", "图形全部使用矢量"],
        channel: "建筑课堂、博物馆教育、视觉观察工作坊",
      },
      evidenceLevel: "数字环境预演",
      boundary: "不是建筑测绘、结构分析或已完成用户研究；没有正式盲测数据前不能声称关系路线更有效。",
    },
    {
      id: "hotel-space-relation-notes",
      productType: "editorial",
      presentation: "hotel-space-annotation-kit",
      title: "《一眼读懂空间》精品酒店摄影关系注解系统",
      scenario: "精品酒店和室内设计媒体希望在不遮挡完整空间照片的情况下，解释视线、层次、材质重心和行走节奏。",
      audience: "酒店住客、室内设计读者、空间案例研究者",
      capabilityFocus: "检验三至六个经设计方确认的空间事实能否转成少量相对关系形状，而不冒充平面图。",
      effect: {
        src: "/generated/results/photo-abstract-editorial-variant-02.png",
        alt: "完整照片与舟、柱、湖轴、岸线、松树和花点六项事实关系面板组成的空间研究卡",
        caption: "能力效果：六项来源事实分别映射为位置、尺度、邻接和颜色角色，可作为新空间照片的注解模板。",
      },
      process: [
        { label: "保留", detail: "获取授权空间照片，以及设计师确认的视线、遮挡、间隔、材质和重心事实。" },
        { label: "适配", detail: "将四至六项事实映射为少量形状，完整照片和关系面板保持并列。" },
        { label: "生产", detail: "制作网页组件、移动案例卡和 A4 销售画册跨页，真实文字独立排版。" },
        { label: "应用", detail: "在酒店官网、室内设计专题和销售展示中检查照片完整性与面板可读性。" },
      ],
      output: {
        name: "精品酒店空间关系注解套件",
        specs: ["网页主图 1440×960", "社交 1080×1350", "A4 画册，300 DPI", "原照始终 contain"],
        channel: "酒店官网、室内设计专题、销售画册",
      },
      evidenceLevel: "数字环境预演",
      boundary: "关系面板不是平面图、无障碍路线或工程尺寸；所有空间事实必须由设计方核实。",
    },
  ],

  "photo-to-zine-postcard": [
    {
      id: "north-harbor-museum-card-box",
      productType: "packaging",
      presentation: "postcard-collector-box-set",
      title: "《北港三站》城市博物馆收藏明信片盒",
      scenario: "城市博物馆商店把影院、桥梁和市场做成可单买也可成套收藏的旅行产品，让三张卡共享背面系统但保留不同地点性格。",
      audience: "博物馆访客、城市旅行者、文创收藏者",
      capabilityFocus: "检验三个完整来源、三个独立主元素、三组来源色和一个共享背面能否形成真正的产品家族。",
      effect: {
        src: "/generated/studies/photo-to-zine-postcard/north-harbor-three-card-series-effect.svg",
        alt: "北港影院、桥梁与市场三张明信片的三个完整正面和三个共用网格背面产品板",
        caption: "能力效果：三套正反面共六个表面完整显示，每张正面有独立主元素和三枚来源色，背面功能统一。",
      },
      process: [
        { label: "保留", detail: "锁定三张授权地点照片、摄影者、地点名称、日期与版权元数据。" },
        { label: "适配", detail: "每张提取一个主手绘元素、至多一个辅元素和三枚来源色，并共享背面网格。" },
        { label: "生产", detail: "制作正反面、腰封、信封、陈列盒和来源说明卡，并准备真实印刷打样文件。" },
        { label: "应用", detail: "在博物馆商店货架、电商详情页和桌面书写环境中完整预演套装。" },
      ],
      output: {
        name: "北港三站明信片收藏盒",
        specs: ["卡片 100×150 mm，四周 3 mm 出血", "300 DPI，CMYK", "建议 350 gsm 未涂布可书写纸", "包装约 110×160×8 mm"],
        channel: "博物馆商店、电商详情页、城市旅行纪念品",
      },
      evidenceLevel: "数字环境预演",
      boundary: "现有北港地点为虚构；不同国家的邮政区、纸张、邮资与地址格式必须单独核验，数字产品板不能冒充实物打样。",
    },
    {
      id: "hotel-walk-postcard",
      productType: "editorial",
      presentation: "hotel-room-postcard-guide",
      title: "《今晚从这里寄出》精品酒店房内城市散步卡",
      scenario: "精品酒店在客房中提供一张可寄出的城市散步卡，让住客记录当晚路线，并通过二维码进入礼宾团队维护的移动页面。",
      audience: "精品酒店住客、礼宾团队、城市短途旅行者",
      capabilityFocus: "检验照片效果能否进一步补齐正反面、书写区、裁切安全区和数字续看入口，成为完整服务触点。",
      effect: {
        src: "/generated/studies/photo-to-zine-postcard/next-print-preflight-sheet-self-contained.svg",
        alt: "明信片完整正反面置于 100×150 毫米、三毫米出血、裁切线和安全区中的数字印前检查板",
        caption: "能力效果：正面视觉和可书写背面保持完整，并明确展示出血、裁切与安全区，但尚未冒充实体印刷。",
      },
      process: [
        { label: "保留", detail: "由礼宾团队核实地点、开放时间、路线安全、照片授权和当地邮政要求。" },
        { label: "适配", detail: "正面保留完整地点照片和一个手绘记忆元素，背面安排留言、地址、邮票和二维码。" },
        { label: "生产", detail: "完成数字印前、可书写纸张建议、卡架与欢迎信封，并准备一次真实投递测试。" },
        { label: "应用", detail: "在客房床头、礼宾台、扫码移动页和邮寄流程中完整预演服务触点。" },
      ],
      output: {
        name: "酒店房内城市散步明信片",
        specs: ["A6 105×148 mm 或按当地邮政规格调整", "3 mm 出血", "二维码至少 20 mm", "建议 350 gsm 可书写纸，移动页以 390 px 宽为主"],
        channel: "酒店客房、礼宾服务、移动城市指南、邮寄纪念",
      },
      evidenceLevel: "数字环境预演",
      boundary: "明信片不能承担唯一导航或紧急信息；二维码页面需要隐私与失效维护策略，真实邮寄能力必须经过当地测试。",
    },
  ],
};
