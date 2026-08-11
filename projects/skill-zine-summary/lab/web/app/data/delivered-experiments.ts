import type { EffectApplication } from "@/app/data/effect-applications";
import type { DemoImage } from "@/app/data/skills";
import { revision5ExperimentsBySlug } from "@/app/data/revision5-experiments";

export type AcceptanceResult = {
  criterion: string;
  outcome: string;
  status: "pass" | "qualified";
};

export type DeliveredExperiment = {
  id: string;
  planStatus?: "complete" | "partial";
  originPlan: { title: string; description: string };
  kicker: string;
  title: string;
  question: string;
  source: { kind: "image"; image: DemoImage } | { kind: "text"; text: string; note: string };
  effect: { kind: "image"; image: DemoImage } | { kind: "interactive"; component: "photo-distill-parameter-lab" | "photo-distill-renderer-fingerprint" };
  inputFacts: string[];
  method: { label: string; summary: string; recipe: string[] };
  acceptance: AcceptanceResult[];
  application: EffectApplication;
  provenance: {
    sourceKind: "synthetic" | "text" | "code" | "local-study";
    effectKind: "generated" | "deterministic-composite" | "clean-room-code";
    disclosure: string;
  };
};

const imageSource = (src: string, alt: string, caption: string): DeliveredExperiment["source"] => ({ kind: "image", image: { src, alt, caption } });
const imageEffect = (src: string, alt: string, caption: string): DeliveredExperiment["effect"] => ({ kind: "image", image: { src, alt, caption } });

const baseDeliveredExperimentsBySlug: Record<string, readonly DeliveredExperiment[]> = {
  "daily-photo-playground": [{
    id: "person-street-editorial",
    originPlan: { title: "人物街拍", description: "验证人物越界时是否仍能避免五官失真。" },
    kicker: "DELIVERED · PERSON STREET TEST",
    title: "雨后花店的最后一束花",
    question: "人物越出版心时，面部、动作、服装色和街道叙事能否同时保持可读？",
    source: imageSource("/generated/source/next/florist-crosswalk-source.png", "雨后收摊的虚构成年花艺师街拍输入", "本地合成输入：虚构成年花艺师穿钴蓝风衣与朱红裙，抱藏金花束穿过雨后街口。"),
    effect: imageEffect("/generated/studies/daily-photo-playground/next-person-street-effect.png", "花艺师越出版心的高饱和编辑拼版", "计划交付效果：人物越出版心，完整小照片窗口继续承担事实锚点。"),
    inputFacts: ["成年花艺师的面部和花束是双重识别中心", "钴蓝、朱红、藏黄与青绿店面形成来源色系统", "湿地反射和收摊动作提供时间与事件"],
    method: { label: "EDITORIAL ROUTE", summary: "先锁定完整人物照片窗口，再把服装、花束与店面颜色拆成高饱和版心和几何层。", recipe: ["完整原照小窗", "人物越界主层", "3 个来源色场", "保留面部安全区"] },
    acceptance: [
      { criterion: "人物可读", outcome: "面部、花束和步态在完整画面中均可辨认。", status: "pass" },
      { criterion: "证据不丢", outcome: "版面保留完整来源小窗，而非只展示裁切人像。", status: "pass" },
      { criterion: "身份边界", outcome: "人物是虚构成年人，不能当作真实街头纪实。", status: "qualified" },
    ],
    application: { title: "独立花店雨季人物特刊", scenario: "城市生活方式媒体用一次雨后收摊，讲述花艺师、颜色与街区之间的关系。", audience: "生活方式编辑、独立花店、城市文化栏目", jobToBeDone: "把普通人物街拍变成既保留现场证据、又有杂志封面张力的完整人物页。", deliverables: ["人物特刊竖版封面", "社交媒体故事首图", "花店季节活动视觉"], whyItFits: "人物越界制造张力，完整原图窗口保留故事可信度，来源色场帮助品牌延展。", extensions: ["加入清晨开店与夜间收摊形成双时段系列", "测试坐姿、回望与快速行走三种动作路由"], boundary: "合成人物不代表真实从业者；真实商业使用必须取得肖像、店面与摄影授权。" },
    provenance: { sourceKind: "synthetic", effectKind: "generated", disclosure: "LOCAL SYNTHETIC SOURCE；人物、街道和事件均为虚构。OUR STUDY EFFECT 只研究高层版式方法，不是上游官方输出，也不证明运行了上游实现。" },
  }],

  "dyy-photo-deconstruct": [{
    id: "complex-city-junction",
    originPlan: { title: "复杂城市路口", description: "测试高信息密度输入能否压到 3–5 个记号。" },
    kicker: "DELIVERED · DENSITY COMPRESSION",
    title: "北港中央换乘站的五类记号",
    question: "轨道、斑马线、顶棚、车流和人流能否被压成 3–5 类无字记号，同时保留方向压力？",
    source: imageSource("/generated/source/next/north-harbor-interchange-source.png", "虚构北港中央换乘站复杂路口输入", "本地合成输入：强透视换乘站包含轨道、斑马线、自行车、车辆和成年通勤人流。"),
    effect: imageEffect("/generated/studies/dyy-photo-deconstruct/next-city-junction-effect.png", "把复杂路口压成五类无字记号的极简海报", "计划交付效果：汇聚蓝／炭黑线、暖白横杆、朱红与芥黄楔形、暗色车体及两个红端点、半透明蓝框与楼梯共同构成五类 mark。"),
    inputFacts: ["蓝色与炭黑斜线向画面中心汇聚，承担主要透视方向", "暖白横杆与朱红、芥黄楔形构成横向停顿和色彩节奏", "暗色车体配两个红端点，半透明蓝框与楼梯保留交通和空间层级"],
    method: { label: "MARK DICTIONARY", summary: "不解释人群数量，按画面实际可见元素整理为五类 mark：汇聚线、横杆、双色楔形、车体端点组合和蓝框楼梯组合。", recipe: ["汇聚蓝／炭黑线", "暖白横杆", "朱红＋芥黄楔形", "暗色车体＋两个红端点", "半透明蓝框／楼梯"] },
    acceptance: [
      { criterion: "五类对应", outcome: "画面可逐项核对汇聚线、暖白横杆、双色楔形、车体与双红端点、半透明蓝框与楼梯五类 mark。", status: "pass" },
      { criterion: "方向可读", outcome: "蓝／炭黑汇聚线与暖白横杆形成的纵深和横向停顿仍可区分。", status: "pass" },
      { criterion: "地点识别", outcome: "只承诺关系可读，不承诺看图识别具体车站。", status: "qualified" },
    ],
    application: { title: "交通专题章节扉页", scenario: "城市研究报告需要用极少图形概括换乘压力，为大量文字和数据留出纸面空间。", audience: "城市研究编辑、交通展览策划、信息设计学生", jobToBeDone: "把复杂交通现场压缩成可复用的章节视觉，不让照片细节抢走报告正文。", deliverables: ["报告章节扉页", "展览导语海报", "路线观察卡"], whyItFits: "最小记号词典可以把拥挤与方向转成视觉语法，适合高留白、低噪声的信息入口。", extensions: ["用盲测比较三、四、五类记号的识别下限", "为路口、站台、楼梯建立不同 mark family"], boundary: "极简结果不是交通地图，也不能证明流量、速度或安全结论；定量判断必须来自真实数据。" },
    provenance: { sourceKind: "synthetic", effectKind: "generated", disclosure: "LOCAL SYNTHETIC SOURCE；地点与交通事件均为虚构。未复制无许可证上游的代码、模板、提示词或资产。" },
  }],

  "travel-photo-abstraction": [{
    id: "locked-storefront-sign",
    originPlan: { title: "含文字的店招", description: "验证照片区域锁定能否避免模型篡改原始文字。" },
    kicker: "DELIVERED · SOURCE ROLE LOCK",
    title: "雨夜照相馆的文字锁定",
    question: "店招是关键信息时，能否完整保留源图与可读文字，只让抽象面板解释关系？",
    source: imageSource("/generated/source/next/night-camera-shop-source.png", "带有清晰 NORTH HARBOR PHOTO 店招的虚构雨夜照相馆", "本地合成输入：店招文字、橱窗节奏、蓝色巷道与红伞均完整可见。"),
    effect: imageEffect("/generated/studies/travel-photo-abstraction/next-shop-sign-lock-effect-self-contained.svg", "完整照相馆源图与确定性关系面板组合", "计划交付效果：源图以 contain 方式确定性嵌入；面板只翻译店招、橱窗、巷道与红伞关系。"),
    inputFacts: ["唯一店招文字是 NORTH HARBOR PHOTO", "暖窗与深蓝巷道形成高反差角色", "红伞是低面积、高记忆色锚"],
    method: { label: "DETERMINISTIC COMPOSITE", summary: "浏览器 SVG 直接引用完整来源文件，抽象区由独立形状构成；没有让模型重画照片区。", recipe: ["source role lock", "contain 嵌入完整源图", "关系面板独立绘制", "可读店招人工核对"] },
    acceptance: [
      { criterion: "文字保留", outcome: "来源与组合页都显示同一条可读店招。", status: "pass" },
      { criterion: "完整画面", outcome: "源图未裁切；为保留全图，照片区采用缩放与留边。", status: "pass" },
      { criterion: "上游 DELIVERY PASS", outcome: "这是 clean-room 架构研究，未运行受限上游验证器，不能声明官方 PASS。", status: "qualified" },
    ],
    application: { title: "店铺档案与品牌故事页", scenario: "地方商业档案要保留店招、橱窗和街道证据，同时用抽象面板解释夜间色彩与空间节奏。", audience: "街区档案项目、品牌编辑、建筑与零售研究者", jobToBeDone: "在不改写来源文字的前提下，为照片增加一层可复用的关系解释。", deliverables: ["店铺档案专题页", "品牌故事展板", "街区步行路线卡"], whyItFits: "真实信息由锁定照片承担，抽象面板只承担解释，职责隔离降低生成模型篡改店招的风险。", extensions: ["加入源图哈希和像素差异报告", "比较白天、雨夜和闭店三种状态的关系面板"], boundary: "来源本身是合成场景；本实验不包含上游代码，也不能替代真实店铺授权、档案核验或商标审查。" },
    provenance: { sourceKind: "synthetic", effectKind: "deterministic-composite", disclosure: "源图由内置图像生成，组合效果由本地 clean-room SVG 确定性构成。没有复制或修改 Source-Available 上游实现与样例。" },
  }],

  "scenes-gathered-zine": [{
    id: "indoor-reunion",
    originPlan: { title: "室内聚会", description: "验证人物较多时照片锚点应该多大。" },
    kicker: "DELIVERED · MULTI-PERSON ANCHOR",
    title: "五位朋友的重聚晚餐",
    question: "多人、餐桌、目光与递盘动作同时存在时，照片锚点能否足够大并保留人物关系？",
    source: imageSource("/generated/source/next/adult-reunion-source.png", "五位虚构成年女性朋友在彩色公寓重聚晚餐", "本地合成输入：五位成年朋友通过目光、递盘和交谈形成清楚关系。"),
    effect: imageEffect("/generated/studies/scenes-gathered-zine/next-indoor-gathering-effect.png", "多人聚会裁切式照片锚点与撕纸关系场并置的拼贴", "计划交付效果：约占页面三分之一的裁切式照片锚点保留五人上半身、桌面互动与室内线索；抽象场解释关系路径。"),
    inputFacts: ["五位成年人物构成环形注意力", "递盘动作连接桌面两侧", "橙、青、莓红和金色灯光形成室内情绪"],
    method: { label: "SCENE CARD", summary: "照片窗口约占页面三分之一，主动裁掉来源下半部，但保留五人上半身、桌面互动和室内环境；撕纸与单一结构色只连接关系。", recipe: ["约 1/3 页面裁切式照片锚点", "1 条关系色带", "2 个材料场", "不增删人物"] },
    acceptance: [
      { criterion: "人数与关系", outcome: "五位人物、桌面互动与室内环境均可见。", status: "pass" },
      { criterion: "媒介分工", outcome: "照片负责现场，抽象场负责连接，没有用剪影替代人物。", status: "pass" },
      { criterion: "锚点尺度", outcome: "本轮证明约三分之一页面在该构图下足以读出五人关系；它不是适用于所有多人场景的通用最优值。", status: "qualified" },
      { criterion: "纪实边界", outcome: "聚会与人物均为虚构，不能当作真实家庭或朋友档案。", status: "qualified" },
    ],
    application: { title: "女性友谊口述史开篇", scenario: "独立刊物用一次重聚晚餐作为入口，把现场人物关系与记忆线索并置。", audience: "口述史编辑、文化刊物、社区项目与展览团队", jobToBeDone: "让多人照片仍保持可读，同时给非线性记忆与关系增加一个视觉层。", deliverables: ["口述史章节开篇", "聚会纪念 Zine 页面", "展览人物关系引导板"], whyItFits: "具象照片锚点和抽象关系场并列，既能看清人物，又能表达目光、递盘和交谈的联系。", extensions: ["加入座位关系图与录音片段索引", "用同一结构色串联多年重聚照片"], boundary: "合成输入不具备真实档案价值；真实人物项目必须取得每位参与者对肖像与故事使用的同意。" },
    provenance: { sourceKind: "synthetic", effectKind: "generated", disclosure: "本地合成输入与研究效果均不对应真实人物或事件；方法研究绑定历史 MIT 快照，不混用当前仓库状态。" },
  }],

  "scene-distillation-zine": [{
    id: "crowded-station-pressure",
    originPlan: { title: "拥挤车站", description: "把密集人流转成压力与方向，而不是人物剪影。" },
    kicker: "DELIVERED · PRESSURE FIELD",
    title: "交叉人流的压力蒸馏",
    question: "不画人物剪影，仍能否用密度、方向、间隔与局部停滞表达拥挤？",
    source: imageSource("/generated/source/next/north-harbor-interchange-source.png", "虚构北港中央换乘站拥挤人流输入", "同一复杂换乘站输入用于观察人流压力、交叉方向与停滞点。"),
    effect: imageEffect("/generated/studies/scene-distillation-zine/next-crowded-pressure-effect.png", "以方向场和密度带表达拥挤车站的抽象海报", "计划交付效果：不使用人物剪影，只保留压力场、交叉流与一个停滞结。"),
    inputFacts: ["两股主流在中心交叉", "站台边缘形成横向压缩带", "一处红色停滞点打断整体运动"],
    method: { label: "DISTILLATION CARD", summary: "把人群从“许多人物”改写为“交叉压力与短暂停滞”，再映射为密度带、箭势和间隙。", recipe: ["2 股方向场", "1 条压缩边", "1 个停滞结", "零人物剪影"] },
    acceptance: [
      { criterion: "无剪影", outcome: "画面没有人物轮廓或可识别身份。", status: "pass" },
      { criterion: "压力可读", outcome: "交叉、压缩和停滞三种运动关系明显。", status: "pass" },
      { criterion: "事实用途", outcome: "结果表达主观关系，不能替代真实客流分析。", status: "qualified" },
    ],
    application: { title: "通勤压力主题文章视觉", scenario: "城市文化文章讨论高峰通勤的身体感受，需要一张不暴露乘客身份的抽象主视觉。", audience: "城市媒体、交通文化展览、公共议题编辑", jobToBeDone: "把人流情绪转成非人物化视觉，避免将陌生乘客当作可识别素材。", deliverables: ["长文头图", "展览情绪墙", "播客单期封面"], whyItFits: "场景蒸馏保留压力、方向和停顿，删除身份与地点轮廓，适合主观经验叙事。", extensions: ["比较早高峰、晚高峰和末班车三种压力场", "以匿名传感器数据驱动密度而非凭照片推断"], boundary: "抽象效果不是客流数据可视化；不能据此判断站点安全、乘客数量或运营质量。" },
    provenance: { sourceKind: "synthetic", effectKind: "generated", disclosure: "输入为虚构场站；效果是高层方法的本地研究，不是上游官方输出。历史 Skill 与许可按固定历史提交理解。" },
  }],

  "gc-minimal-zine-poster": [{
    id: "text-only-metaphor",
    originPlan: { title: "纯文本主题", description: "不提供图片，只给一段短文，检验内容编译能力。" },
    kicker: "DELIVERED · TEXT-ONLY COMPILER",
    title: "蓝色长椅上的未寄明信片",
    question: "完全没有图片时，短文能否被压成一个主场景锚、一个微小叙事证据和足够留白？",
    source: { kind: "text", text: "末班渡船离岸后，她把未寄出的明信片留在蓝色长椅上。", note: "唯一输入是一句话；没有照片、地点或人物参考图。" },
    effect: imageEffect("/generated/studies/gc-minimal-zine-poster/next-text-theme-variant-01.png", "把蓝色长椅与未寄明信片编译成极简 Zine 海报", "计划交付效果：高彩蓝色长椅是主视觉锚，座面上的小型明信片是低彩叙事证据；大面积暖纸留白承担停顿。"),
    inputFacts: ["事件发生在末班渡船离岸之后", "核心物是未寄出的明信片", "蓝色长椅承担等待与停顿"],
    method: { label: "PROMPT COMPILER", summary: "先把句子压成“被留下的消息”，再让高彩蓝色长椅承担主锚、小型低彩明信片承担叙事证据，并用大面积暖纸建立低音量海报。", recipe: ["1 个视觉命题", "1 个高彩长椅主锚", "1 个小型纸片证据", "70–90% 留白", "无生成文字"] },
    acceptance: [
      { criterion: "主次成立", outcome: "蓝色长椅是明确主锚，明信片保持为座面上的小型叙事证据，没有被误写成高彩中心。", status: "pass" },
      { criterion: "文本独立", outcome: "没有使用图片输入或复用湖岸视觉事实。", status: "pass" },
      { criterion: "叙事开放", outcome: "角色与地点保持匿名，效果不能证明任何真实事件。", status: "qualified" },
    ],
    application: { title: "文学播客单期封面", scenario: "一集关于错过、告别与未寄消息的播客，需要把长文案压成远看简单、近看有余味的封面。", audience: "文学播客、散文栏目、独立出版与文化活动", jobToBeDone: "从一句话直接得到一个可排标题的键视觉，而不依赖摄影素材。", deliverables: ["无字封面键视觉", "播客方形裁切安全版", "活动预告竖版底图"], whyItFits: "内容先被编译成单一隐喻，画面不需要复述全部情节，留白可以安全承接后置排字。", extensions: ["固定隐喻测试横、竖、对角三种版式轴", "将后置标题与日期做成确定性网页排版"], boundary: "生成视觉不应包含关键可读文字；正式标题、署名与无障碍信息必须由网页或排版程序添加。" },
    provenance: { sourceKind: "text", effectKind: "generated", disclosure: "唯一来源是页面公开显示的中文短句；研究效果不复制上游样例主题，也不暗示为上游官方输出。" },
  }],

  "photo-revival": [{
    id: "synthetic-family-memory",
    originPlan: { title: "旧家庭照片", description: "在授权输入上测试人物与年代感，但不承诺身份还原。" },
    kicker: "DELIVERED · MEMORY WITHOUT IDENTITY CLAIM",
    title: "1986 年的虚构家庭团聚",
    question: "旧照片质感、四位成年女性的关系与年代服装能否被保留，同时不伪称身份还原？",
    source: imageSource("/generated/source/next/photo-revival-family-reunion-1986-source.png", "虚构 1986 年母亲与三位成年女儿家庭合照", "本地合成年代输入：母亲与三位成年女儿身穿酒红、松绿、芥黄和深蓝服装。"),
    effect: imageEffect("/generated/studies/photo-revival/family-reunion-1986-effect.png", "把虚构家庭旧照重绘为小型手绘记忆画", "计划交付效果：保留四人关系、年代服装与室内气氛，转为留白充分的手绘记忆。"),
    inputFacts: ["母亲居中，三位成年女儿通过肩线与手势相连", "服装色形成四角色识别", "旧客厅、茶席和暖灯提示团聚事件"],
    method: { label: "MEMORY EVIDENCE", summary: "不是修复像素，而是重绘主主体、场景和 1–2 个 memorable details：肩线、茶席与四色服装。", recipe: ["四人关系不变", "旧客厅气氛", "茶席与肩线记忆点", "小型画簇与大留白"] },
    acceptance: [
      { criterion: "关系保留", outcome: "四位成年人物的站位和团聚姿态仍清楚。", status: "pass" },
      { criterion: "年代感", outcome: "服装、家具和暖色共同建立合成年代场景。", status: "pass" },
      { criterion: "输入授权", outcome: "输入是本项目为本地研究生成并控制的虚构素材；这不替代真实家庭照片的逐人授权。", status: "pass" },
      { criterion: "身份还原", outcome: "效果是重绘记忆，不承诺面部或真实身份一致。", status: "qualified" },
    ],
    application: { title: "家庭记忆册章节插画", scenario: "家庭故事书需要一张温和插画概括团聚场面，同时避免把生成重绘误当作档案修复。", audience: "家庭故事整理者、纪念册编辑、口述史项目", jobToBeDone: "从旧照提取关系与记忆点，为文字叙事提供轻量插画，而不是伪造高清历史照片。", deliverables: ["家庭记忆册章节画", "口述史访谈封面", "纪念活动数字邀请页"], whyItFits: "重绘可以把注意力放在关系、服装色与事件物件，允许照片损伤或背景噪声退场。", extensions: ["为同一家族不同年份建立颜色与物件索引", "让家人标注最重要记忆点后再重绘"], boundary: "输入是虚构合成年代场景；处理真实旧照必须取得家庭授权，不得虚构姓名、年代或亲属关系。" },
    provenance: { sourceKind: "synthetic", effectKind: "generated", disclosure: "所有人物均为虚构成年人，不对应真实家庭。效果是记忆重绘研究，不是照片修复、身份复原或历史证据。" },
  }],

  "pixel-style-poster": [{
    id: "close-face-halftone",
    planStatus: "partial",
    originPlan: { title: "人物近景", description: "验证面部特征在细密点阵下的可读与失真边界。" },
    kicker: "PARTIAL · FACE HALFTONE TEST",
    title: "花艺师近景的点阵边界",
    question: "面部、花束和雨夜环境在细密点阵中能否形成主次，同时避免退化成 8-bit 游戏像素？",
    source: imageSource("/generated/source/next/florist-crosswalk-source.png", "雨后收摊的虚构成年花艺师街拍输入", "同一花艺师来源用于与编辑拼版路线做受控对照。"),
    effect: imageEffect("/generated/studies/pixel-style-poster/next-face-halftone-effect.png", "花艺师面部与花束的精细点阵编辑海报", "计划交付效果：面部采用高密度点阵，服装、花束和街道分层降低密度。"),
    inputFacts: ["面部需要最高密度与最小网点", "花束是第二识别层", "蓝、红、黄服装与环境色可承担半调层级"],
    method: { label: "DENSITY ROUTE", summary: "密度而不是方块大小承担明暗；面部、花束、服装与背景使用四级点阵。", recipe: ["face: fine dense", "bouquet: medium", "clothing: directional", "street: sparse", "no game-pixel blocks"] },
    acceptance: [
      { criterion: "面部可读", outcome: "眼、鼻、嘴与头部姿态仍可辨认。", status: "pass" },
      { criterion: "材料语言", outcome: "明暗来自点阵与半调密度，不是粗大方块。", status: "pass" },
      { criterion: "近景覆盖", outcome: "本轮效果实际保留全身人物，只验证中尺度下面部与姿态可读；真正的大近景面部边界仍待追加。", status: "qualified" },
      { criterion: "身份边界", outcome: "结果只验证虚构人物可读性，不代表真人相似度。", status: "qualified" },
    ],
    application: { title: "城市人物音乐节海报", scenario: "小型音乐节或夜间市集需要有强材料感的人物主视觉，同时让面部、花束和服装在远近尺度都可读。", audience: "文化活动团队、独立杂志、生活方式品牌", jobToBeDone: "把人物照片转成具有印刷点阵感的主题海报，而不是套用复古游戏滤镜。", deliverables: ["活动竖版海报", "节目单人物页", "社交媒体预告图"], whyItFits: "细密点阵能以密度控制人物层级，丰富服装色和环境反射提供足够的半调素材。", extensions: ["输出丝网印刷四色分版", "比较 1×、0.5× 与移动缩略图的面部可读阈值"], boundary: "真实人物用于公开活动必须取得肖像与摄影授权；网点在实际印刷前需检查摩尔纹和最小点径。" },
    provenance: { sourceKind: "synthetic", effectKind: "generated", disclosure: "人物与街道均为虚构；这是 MIT Skill 高层能力的研究效果，不是上游作者生成或背书的作品。" },
  }, {
    id: "true-closeup-vocalist-halftone",
    originPlan: { title: "人物近景", description: "验证面部特征在细密点阵下的可读与失真边界。" },
    kicker: "DELIVERED · TRUE CLOSE-UP",
    title: "最后一个音符后的爵士歌手",
    question: "当面部真正占到画面高度约四成时，眼神、皮肤转折和情绪能否用微小点阵保持连续，同时让头发、丝绒衣料、麦克风和俱乐部环境形成清楚的次级网频？",
    source: imageSource("/generated/source/next/pixel-closeup-vocalist-source.png", "虚构成年女爵士歌手在演出结束后的真正头肩近景", "本地合成输入：虚构成年东亚女爵士歌手位于雨夜俱乐部，祖母绿丝绒外套、梅子色内搭与铜金灯光共同承载最后一首歌后的情绪。"),
    effect: imageEffect("/generated/studies/pixel-style-poster/closeup-vocalist-halftone-effect.png", "女爵士歌手面部使用高密微点阵的编辑海报", "补证效果：完整 2:3 头肩近景中，面部、头发、丝绒衣料、麦克风和环境分别使用不同的细密网频。"),
    inputFacts: ["下巴到发际约占画面高度四成，属于真正的人物大近景", "演出结束后的视线和克制表情是首要叙事证据", "祖母绿、梅子红、铜金与深青构成可分层的套色色系", "麦克风与虚化铜管乐器交代爵士俱乐部环境"],
    method: { label: "MICRO-DOT HIERARCHY", summary: "保持原有头肩构图，把连续色调翻译成分区网频：脸部最细密，头发使用深色微点与细线，丝绒衣料使用方向性网点，环境使用较粗但仍非像素块的套色半调。", recipe: ["face: dense micro dots", "hair: dark micro-dot + line", "velvet: directional screen", "club: sparse cyan / wine / gold", "no 8-bit blocks"] },
    acceptance: [
      { criterion: "真正近景", outcome: "画面只保留头、双肩和上胸；没有腰部、腿或全身，发顶、下巴与双肩均完整。", status: "pass" },
      { criterion: "面部可读", outcome: "眼神、眉眼、鼻唇和面部转折在高密微点阵下保持连续可辨。", status: "pass" },
      { criterion: "四级材料", outcome: "脸、头发、丝绒衣料和俱乐部背景能看出不同的点阵／线条密度，未退化成 8-bit 方块或马赛克。", status: "pass" },
      { criterion: "相似度边界", outcome: "只证明虚构人物在该构图中的视觉可读性，不是对真人身份或精确相似度的评测。", status: "qualified" },
    ],
    application: { title: "深夜爵士人物专访封面", scenario: "独立音乐杂志以一场演出结束后的安静瞬间切入歌手的舞台生涯、城市夜生活和个人选择，让人物情绪先于活动信息被看见。", audience: "独立音乐杂志、爵士俱乐部、演出策划与唱片品牌", jobToBeDone: "把色彩丰富的人物大近景转成有明确印刷材料感的封面，同时保留眼神、服装质感和演出环境。", deliverables: ["人物专访竖版封面", "演出季主视觉", "唱片内页人物页", "移动端人物预告图"], whyItFits: "真正近景提供足够面部细节让细点阵发挥作用；分级网频又能把丝绒、金属、灯光和背景变成同一套编辑语言。", extensions: ["输出双色、三色与四色丝网分版并比较面部损失", "建立 100%、50%、25% 三档缩放可读性检查", "加入侧脸、闭眼歌唱和强逆光三种近景压力测试"], boundary: "人物和演出均为虚构；真实商业项目必须取得肖像、摄影、场地和麦克风／乐器外观授权。当前是屏幕概念研究，实际印刷还需检查最小网点、摩尔纹、纸张吸墨和套色误差。" },
    provenance: { sourceKind: "synthetic", effectKind: "generated", disclosure: "LOCAL SYNTHETIC SOURCE；人物、场地和演出事件均为虚构。OUR STUDY EFFECT 用同一输入研究 fine bitmap / halftone 的高层能力，不是上游官方作品，也不声称像素级照片保真或真实印刷打样。" },
  }],

  "photo-distill": [{
    id: "interactive-parameter-lab",
    originPlan: { title: "可交互参数页", description: "实时调节着墨率和色锚面积，观察是否仍通过门槛。" },
    kicker: "DELIVERED · RASTER-MEASURED CODE LAB",
    title: "几何门槛与实际栅格着墨率实验",
    question: "参数改变时，浏览器里的关系图、几何指标、实际像素着墨率和 PASS/ADJUST 状态能否同步变化？",
    source: imageSource("/generated/source/common-source.png", "统一湖岸合成输入", "本地可控湖岸输入：舟、岸线、松树与花点用于提取关系量。"),
    effect: { kind: "interactive", component: "photo-distill-parameter-lab" },
    inputFacts: ["湖面与岸线形成两条主关系轴", "松树是右侧竖向质量", "来源中的红舟位于左下，三朵黄花位于右下，是两组不同的低面积色彩事实"],
    method: { label: "CLEAN-ROOM CODE + PIXEL SAMPLING", summary: "React 控件改变内联 SVG；页面随后序列化当前完整 SVG，将其真正绘制到 300×400 离屏 Canvas，并用 getImageData 逐像素统计相对暖纸底色的着墨覆盖。深蓝椭圆承担舟的质量关系，三枚红圆是研究锚点，不伪称来源颜色保真。", recipe: ["HTML range controls", "inline SVG relationship map", "XMLSerializer → Blob → Canvas", "120,000-pixel ink measurement", "geometry + raster PASS / ADJUST"] },
    acceptance: [
      { criterion: "真实交互", outcome: "三个滑杆会分别改变线宽、锚点面积或缩略图直径，不是生成的界面截图。", status: "pass" },
      { criterion: "可构造失败", outcome: "线宽或锚点面积超出范围、缩略图直径不足时会切换为 FAIL/ADJUST。", status: "pass" },
      { criterion: "实际栅格着墨率", outcome: "当前 Chromium 实测：安全范围 4.14% 与最小可见锚 3.65% 通过；超限示例 5.41% 越过本研究 5% 上限并触发 RASTER INK FAIL。三组均来自 4,972／6,494／4,377 个实际着墨像素，而非几何公式代理。", status: "pass" },
      { criterion: "原计划覆盖", outcome: "着墨率与色锚面积现在均可实时调节和检查，原计划问题在当前浏览器环境内完成。", status: "pass" },
      { criterion: "跨浏览器一致性", outcome: "本轮只验证当前 Chromium 环境；Firefox/WebKit 仍属于后续计划。", status: "qualified" },
    ],
    application: { title: "设计系统参数评审台", scenario: "视觉工程团队在交付海报前现场调节线宽、锚点面积与缩略图直径，同时观察几何门槛与真正栅格化后的整体着墨率。", audience: "视觉工程师、设计系统团队、创意编码学习者", jobToBeDone: "把抽象规则从文字说明变成可以故意制造 PASS 与 FAIL、并能核对实际像素覆盖的可操作检查。", deliverables: ["交互研究页", "四指标参数审查记录", "可复现 SVG 状态", "120,000 像素覆盖率证据"], whyItFits: "代码原生路线可以把每个关系量和阈值变成可测参数，再用真实栅格像素补上几何公式看不到的线条、文字和抗锯齿影响。", extensions: ["增加状态导出与输入哈希", "在真实 Chromium、Firefox、WebKit 保存像素差异证据", "加入色相集中度与 160px 缩略像素测量"], boundary: "当前阈值是本研究自定义 QA，不是上游官方标准；不同字体、浏览器、抗锯齿和输出尺寸仍需重新校准。" },
    provenance: { sourceKind: "synthetic", effectKind: "clean-room-code", disclosure: "输入湖岸图为本地合成素材；交互效果由本项目从零编写的 React 与 SVG 产生，没有使用图像模型模拟界面，也没有复制无正式许可证上游的代码或模板。" },
  }],

  "poetic-line-zine-poster": [{
    id: "motion-person-route",
    planStatus: "partial",
    originPlan: { title: "动作人物", description: "验证 gesture 路由和照片忠实度能否同时成立。" },
    kicker: "PARTIAL · GESTURE ROUTE",
    title: "小提琴手赶末班车",
    question: "奔跑姿态、琴盒重量、围巾轨迹和雨夜站台能否被分工表达，而不是把人物重画成装饰剪影？",
    source: imageSource("/generated/source/next/poetic-line-last-train-violinist-source.png", "虚构成年女小提琴手赶末班车的动作场景", "本地合成输入：莓红风衣、孔雀蓝琴盒与金色围巾共同强调跨水洼奔跑动作。"),
    effect: imageEffect("/generated/studies/poetic-line-zine-poster/last-train-violinist-effect.png", "人物概念照片窗口与奔跑关系面板组成的诗性线条海报", "阶段性效果：概念照片窗口承担人物叙事，线条面板解释重心、琴盒重量与围巾路径；尚未证明来源像素忠实度。"),
    inputFacts: ["前倾躯干和跨步腿形成主 gesture", "琴盒在背侧形成沉重 mass", "金色围巾提供高速 path 与节奏"],
    method: { label: "GESTURE / MASS / RHYTHM / PATH", summary: "将动作拆为四条关系路由；研究效果只概念展示职责分离，不宣称源图像素验证。", recipe: ["gesture: forward lean", "mass: instrument case", "rhythm: stepping cadence", "path: scarf arc"] },
    acceptance: [
      { criterion: "动作叙事", outcome: "赶车、跨水洼和携带琴盒的关系清楚。", status: "pass" },
      { criterion: "色彩与环境", outcome: "莓红、孔雀蓝、金色与雨夜站台共同服务故事。", status: "pass" },
      { criterion: "照片忠实度", outcome: "当前为生成式概念效果，未运行上游自动结构验证，不能声称像素保真。", status: "qualified" },
    ],
    application: { title: "城市音乐家人物专栏", scenario: "文化杂志用“赶末班车”表现独立音乐人的工作节奏、器材重量与城市夜行经验。", audience: "音乐杂志、演出品牌、城市文化媒体", jobToBeDone: "让人物照片与动作解释并存，形成有故事、有色彩、又能承接标题的人物开篇。", deliverables: ["人物专栏开篇", "演出故事海报", "短视频封面键视觉"], whyItFits: "姿态、重量、节奏和路径被分别路由，动作线不需要复制人物轮廓也能强化叙事。", extensions: ["加入候车、奔跑、上车三幕连续页", "建立六张固定输入回归集并记录人工评分"], boundary: "虚构人物不对应真实音乐家；用于真实人物项目时必须锁定授权原照，并由确定性合成与验证工具保障照片区。" },
    provenance: { sourceKind: "synthetic", effectKind: "generated", disclosure: "输入是虚构成年人物，效果为概念研究。无许可证上游只作架构阅读，未复制脚本、模板、评分文案或资产。" },
  }, {
    id: "motion-person-pixel-locked",
    originPlan: { title: "动作人物", description: "验证 gesture 路由和照片忠实度能否同时成立。" },
    kicker: "DELIVERED · BYTE-IDENTICAL PHOTO LOCK",
    title: "末班车动作关系的确定性合成",
    question: "能否在不改写、不重画、不裁切来源人物照片的前提下，把 gesture、mass、rhythm 和 path 放进独立面板，并让照片保真成为可校验事实？",
    source: imageSource("/generated/source/next/poetic-line-last-train-violinist-source.png", "虚构成年女小提琴手赶末班车的完整来源图", "与第一次动作实验相同的 1024×1536 本地合成输入，用于补做确定性照片锁定。"),
    effect: imageEffect("/generated/studies/poetic-line-zine-poster/last-train-violinist-fidelity-self-contained.svg", "完整来源照片和无字动作关系面板的确定性诗性合成", "补证效果：上方完整照片窗口逐字节嵌入，下方仅用莓红、孔雀蓝、金色和炭黑解释 gesture／mass／rhythm／path。"),
    inputFacts: ["来源照片为 1024×1536，人物、围巾、琴盒、双脚与雨夜站台均完整", "前倾躯干和跨步腿构成 gesture 与 rhythm", "孔雀蓝琴盒是背侧 mass，金色围巾是高速 path", "照片事实区与抽象解释区需要由不同技术职责承担"],
    method: { label: "DETERMINISTIC PHOTO LOCK", summary: "代码原生 SVG 负责版面、色彩、路径和关系面板；来源 PNG 以单一 base64 data URI 原字节嵌入，使用 xMidYMid meet 显示完整四边。生成模型不参与最终照片窗和排版。", recipe: ["byte-identical PNG embed", "2:3 contain evidence window", "gesture / mass / rhythm / path panel", "one deterministic SVG", "hash + href validation"] },
    acceptance: [
      { criterion: "源字节一致", outcome: "嵌入 PNG 解码后与来源文件同为 2,611,074 bytes，SHA-256 均为 cc0a4654b48fb8d7da01f48b24f314ae7a4ac8663da5e91fd4864d704cc36c4b。", status: "pass" },
      { criterion: "完整照片窗", outcome: "1120×1680 窗口与来源同为 2:3，使用 contain／meet，来源图四边、人物和环境均完整可见。", status: "pass" },
      { criterion: "关系职责分离", outcome: "下方无字面板分别表达莓红步态、孔雀蓝琴盒与路径、金色围巾弧、炭黑车站和水洼，没有重画照片区。", status: "pass" },
      { criterion: "实现边界", outcome: "证明的是本地 clean-room 确定性合成，不证明运行了无正式许可证的上游实现或其人工评分脚本。", status: "qualified" },
    ],
    application: { title: "雨夜音乐家长篇人物开篇", scenario: "文化杂志以完整授权照片建立人物事实，再用独立关系面板解释她在城市、时间压力和乐器重量之间的动作叙事。", audience: "音乐杂志、纪录片编辑、演出品牌与文化展览", jobToBeDone: "同时获得不可篡改的照片证据区和可扩展的诗性解释区，让长篇人物故事既可信又有视觉节奏。", deliverables: ["长篇人物开篇跨页", "演出故事竖版海报", "纪录短片章节卡", "展览人物墙面板"], whyItFits: "照片窗口由确定性嵌入保证真实性，关系面板可以独立更换节奏与色彩；创意随机性不会再影响人物原图、标题职责或最终尺寸。", extensions: ["加入照片区像素 diff 与自动 FAIL 删除", "为候车、奔跑、登车三幕生成共享配方系列", "建立六张授权人物输入的固定回归集", "输出打印 PDF 并检查字体与色彩配置"], boundary: "当前人物和事件为虚构合成；真实项目仍需肖像、摄影、场地和演出授权。字节一致只覆盖嵌入照片，不代表 SVG 在所有浏览器栅格化后逐像素一致。" },
    provenance: { sourceKind: "synthetic", effectKind: "deterministic-composite", disclosure: "LOCAL SYNTHETIC SOURCE；照片窗口嵌入字节与来源 PNG 完全一致。抽象面板和版面为本项目 clean-room SVG，不是上游官方输出，也没有复制无正式许可证上游的脚本、模板或评分文案。" },
  }],

  "photo-abstract-editorial": [{
    id: "strong-perspective-axes",
    planStatus: "partial",
    originPlan: { title: "强透视建筑", description: "测试轴线与遮挡是否比物体轮廓更有效。" },
    kicker: "PARTIAL · PERSPECTIVE RELATIONS",
    title: "换乘站的消失线与遮挡",
    question: "不描摹建筑轮廓时，顶棚消失线、楼梯遮挡、立柱间隔和人流轴还能否构成有秩序的编辑面板？",
    source: imageSource("/generated/source/next/north-harbor-interchange-source.png", "虚构北港中央换乘站强透视建筑输入", "同一换乘站输入在此只读取建筑关系，不读取地点身份。"),
    effect: imageEffect("/generated/studies/photo-abstract-editorial/next-perspective-axes-effect.png", "把建筑消失线和间隔映射为抽象编辑面板", "计划交付效果：概念照片节选与均匀纸面关系面板并置；照片区是生成式概念呈现，面板不描摹建筑轮廓。"),
    inputFacts: ["顶棚与轨道共享远端消失方向", "楼梯遮挡下层人流", "立柱间隔从近到远逐步压缩"],
    method: { label: "FACT → MARK MAP", summary: "把四个可观察关系分别映射为长线、遮挡块、间隔序列和低密度流线。", recipe: ["vanishing lines", "occlusion block", "compressed intervals", "flow axis", "uniform ivory field"] },
    acceptance: [
      { criterion: "关系对应", outcome: "四类 mark 均能回指一个来源事实。", status: "pass" },
      { criterion: "不描轮廓", outcome: "面板没有复制站房或车辆外形。", status: "pass" },
      { criterion: "比较结论", outcome: "当前只完成无轮廓关系面板，没有同预算的物体轮廓对照组，暂不能声称哪一种更有效。", status: "qualified" },
      { criterion: "概念照片区", outcome: "画面中的照片节选只用于关系说明，不是完整源图，也未做像素锁定；正式实现需确定性嵌入并验证。", status: "qualified" },
    ],
    application: { title: "建筑观察课关系分析页", scenario: "设计课程用一张现场图和一张抽象面板，训练学生从强透视建筑中识别消失、遮挡、间隔与流线。", audience: "建筑与视觉设计教师、学生、展览教育团队", jobToBeDone: "把看似复杂的建筑照片拆成少量可讨论、可比较的空间关系。", deliverables: ["课堂分析板", "展览教育手册页", "建筑观察练习卡"], whyItFits: "照片保留现场上下文，抽象面板把视觉事实压成可命名 mark，适合教学与比较。", extensions: ["制作有标题与无标题盲测配对", "比较车站、商场与桥梁的相同关系词典"], boundary: "抽象面板不是建筑测绘或结构分析；任何尺寸、荷载与安全结论都需要专业资料。" },
    provenance: { sourceKind: "synthetic", effectKind: "generated", disclosure: "地点为虚构，效果只研究高层事实映射。未复制无正式许可证上游的提示词、模板、样图或实现。" },
  }, {
    id: "equal-budget-outline-vs-relations",
    originPlan: { title: "强透视建筑", description: "测试轴线与遮挡是否比物体轮廓更有效。" },
    kicker: "DELIVERED · EQUAL MARK BUDGET",
    title: "八个轮廓 mark 对八个关系 mark",
    question: "在同一来源、同一画布、同一限定色板和严格 8／8 mark 预算下，物体轮廓路线与轴线／遮挡／间隔／流向路线分别保留什么？",
    source: imageSource("/generated/source/next/north-harbor-interchange-source.png", "虚构北港中央换乘站完整强透视输入", "与第一次建筑关系实验相同的 1024×1536 输入；这次完整保留为共同证据窗，并同时驱动两条等预算路线。"),
    effect: imageEffect("/generated/studies/photo-abstract-editorial/outline-vs-relations-self-contained.svg", "同一换乘站的八 mark 轮廓与八 mark 关系抽象对照板", "补证效果：A 面板只用八个主体轮廓／剪影，B 面板只用八个消失轴、承重轴、遮挡面、间隔、流向和重心 mark。"),
    inputFacts: ["顶棚、斜撑、立柱、玻璃亭、列车、楼梯和两组人群可组成八个物体类", "左右消失轴、竖向承重轴、遮挡面、压缩间隔、两股流向与停滞重心可组成八个关系类", "两条路线必须共享同一输入、画布、限定色板和 mark 数量", "来源证据窗需要完整显示并与两个解释面板分离"],
    method: { label: "EQUAL-BUDGET A/B", summary: "A 只画物体轮廓／剪影，B 只画空间关系；两个组均以 data-mark-budget=8 锁定八个主要 mark。自定义 rubric 只检查 8／8 可追溯、route purity 和关系覆盖，不把审美偏好伪装成结论。", recipe: ["same 1024×1536 source", "same canvas + fixed palette", "outline route: 8 marks", "relation route: 8 marks", "traceability + route-purity rubric"] },
    acceptance: [
      { criterion: "等量预算", outcome: "A、B 面板分别包含 A1–A8 与 B1–B8，均为恰好八个主要 mark。", status: "pass" },
      { criterion: "路线纯度", outcome: "A 只保留棚顶、斜撑、立柱、玻璃亭、列车、楼梯和两组人群轮廓；B 只保留轴线、遮挡、间隔、流向与重心。", status: "pass" },
      { criterion: "来源锁定", outcome: "完整来源图以单一 data URI 原字节嵌入；源文件与解码字节 SHA-256 均为 37ab43d3a5ee11f8b23d0342d1c871768257a0232c12531cc8b694a0785a9a65。", status: "pass" },
      { criterion: "比较边界", outcome: "本轮能比较两条路线保留的信息类型，但没有读者盲测，不能声称关系路线更美、更易识别或更受偏好。", status: "qualified" },
    ],
    application: { title: "建筑观察课双路线评图板", scenario: "教师先让学生看完整换乘站，再分别阅读物体轮廓和空间关系两种八 mark 压缩，讨论哪类信息在不同设计任务中更重要。", audience: "建筑与视觉设计教师、学生、博物馆教育与信息设计团队", jobToBeDone: "把抽象方法从一张好看的结果变成可公平对照、可逐项追溯、可用于课堂讨论的完整练习。", deliverables: ["课堂双路线评图板", "建筑观察工作坊投影页", "展览教育手册跨页", "学生 mark 字典练习卡"], whyItFits: "同输入与等预算消除了图形数量带来的明显偏差；轮廓路线强调“有什么”，关系路线强调“如何组织”，两者能直接服务不同的观察任务。", extensions: ["用 6、8、10、12 四档预算寻找信息拐点", "加入车站、桥梁、商场和剧场四类固定输入", "进行无标题读者盲测并记录识别理由", "让学生先画再看答案，比较事实遗漏"], boundary: "这是本地结构 rubric，不是用户研究、建筑测绘或上游 PASS；地点为虚构，任何尺寸、客流、安全与结构结论都不能由此图推导。" },
    provenance: { sourceKind: "synthetic", effectKind: "clean-room-code", disclosure: "LOCAL SYNTHETIC SOURCE；两个面板是本项目从零绘制的 code-native 对照，固定 8／8 mark，并原字节嵌入来源图。它不是上游官方输出，也不复制无正式许可证上游的提示词、模板、样图或实现。" },
  }],

  "photo-to-zine-postcard": [{
    id: "digital-print-preflight",
    planStatus: "partial",
    originPlan: { title: "真实印刷校样", description: "输出含出血版本并检查裁切后的信息安全区。" },
    kicker: "QUALIFIED DELIVERY · DIGITAL PREFLIGHT",
    title: "100 × 150 mm 数字印前检查板",
    question: "在没有物理打印条件下，能否先完整展示正反面、出血、裁切与安全区，并明确哪些证据仍然缺失？",
    source: imageSource("/generated/results/photo-to-zine-postcard-variant-03.png", "现有明信片正反面完整产品板", "输入是已完成的正反面数字产品板，用于进入印前检查阶段。"),
    effect: imageEffect("/generated/studies/photo-to-zine-postcard/next-print-preflight-sheet-self-contained.svg", "明信片正反面数字印前模拟检查板", "计划阶段性交付：完整正反面置于 100×150mm、3mm 出血、裁切与安全区检查框中。"),
    inputFacts: ["产品包含完整正面与可书写背面", "目标成品比例是 2:3", "印前需要区分出血、裁切线与安全区"],
    method: { label: "PREFLIGHT BOARD", summary: "用确定性 SVG 将现有正反面完整放入尺寸与检查标记中，不生成虚假的纸张、手持或印刷照片。", recipe: ["100 × 150 mm target", "300 DPI target", "3 mm bleed", "trim line", "safe area", "front/back complete"] },
    acceptance: [
      { criterion: "数字印前结构", outcome: "正反面、出血、裁切与安全区均完整显示。", status: "pass" },
      { criterion: "无裁切展示", outcome: "两面均使用 contain 方式放入检查板。", status: "pass" },
      { criterion: "真实校样", outcome: "尚未物理打印、裁切、拍摄或扫描，因此只能称数字印前模拟。", status: "qualified" },
    ],
    application: { title: "文创明信片送印评审", scenario: "产品经理、设计师与印刷供应商在送印前一次检查正反面、功能区与基础尺寸标记。", audience: "文创产品经理、平面设计师、印刷供应商", jobToBeDone: "从好看的效果图走向可讨论的送印文件，提前暴露安全区、裁切和功能面风险。", deliverables: ["数字印前检查板", "正反面评审附件", "送印问题清单"], whyItFits: "明信片 Skill 定义了双面产品结构；印前板把视觉结果接到真实生产流程，而不是只停在封面图。", extensions: ["完成一次真实 300 DPI 打样并拍摄或扫描", "加入 CMYK 转换、纸张、网点扩大与邮政规范检查"], boundary: "当前不是真实印刷校样，也不代表任何国家邮政模板认证；颜色、纸厚、裁切误差和可书写性必须用实物验证。" },
    provenance: { sourceKind: "local-study", effectKind: "clean-room-code", disclosure: "输入是本项目现有研究效果，印前检查板由本地 SVG 确定性生成。没有用生成图片冒充物理打印、纸张或手持实拍。" },
  }],
};

export const deliveredExperimentsBySlug: Record<string, readonly DeliveredExperiment[]> = {
  ...baseDeliveredExperimentsBySlug,
  ...Object.fromEntries(Object.entries(revision5ExperimentsBySlug).map(([slug, experiments]) => [slug, [...(baseDeliveredExperimentsBySlug[slug] ?? []), ...experiments]])),
};

export function getDeliveredExperiments(slug: string): readonly DeliveredExperiment[] {
  return deliveredExperimentsBySlug[slug] ?? [];
}
