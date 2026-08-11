import type { DemoImage } from "@/app/data/skills";

export type Revision10IndependentExperiment = {
  id: string;
  skillSlug: string;
  title: string;
  question: string;
  source: DemoImage;
  effect: DemoImage;
  status: "成立" | "部分成立";
  method: string;
  finding: string;
  scenario: string;
  whyItFits: string;
  boundary: string;
  disclosure: string;
};

const localConceptDisclosure = "SOURCE 是本项目为能力研究生成的虚构输入；EFFECT 是依据该 Skill 公开规则制作的本地概念研究，不是上游仓库实际运行后的官方输出，也不是客户项目、新闻现场或实体成品。";

export const revision10IndependentExperiments: readonly Revision10IndependentExperiment[] = [
  {
    id: "ceramicist-after-rain",
    skillSlug: "daily-photo-playground",
    title: "雨后收工的陶艺师",
    question: "面对人物、手作器物、雨夜反射和多组高彩色同时存在的生活场景，这条路线能否重排信息而不丢掉故事中心？",
    source: {
      src: "/generated/source/revision10/daily-ceramicist-rain-source.png",
      alt: "雨后傍晚，一位成年女陶艺师在彩釉器物和街灯反射之间准备关闭工作室的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 01。虚构成年人物、雨后工作室、彩釉陶器和三组服装色锚均完整入画。",
    },
    effect: {
      src: "/generated/studies/daily-photo-playground/revision10-ceramicist-editorial-effect.png",
      alt: "把陶艺师雨夜场景重排成高饱和色场、人物切出、几何图形和完整照片窗口的编辑 zine 效果",
      caption: "REVISION 10 EFFECT · Daily Photo Playground 概念研究。完整画布展示人物切出、来源色场与小型完整照片证据窗。",
    },
    status: "成立",
    method: "先锁定人物、陶器架、玻璃雨珠与钴蓝／珊瑚红／姜黄三组来源色，再把它们编译成暖白外页、主体切出、几何色场和一个完整小原照窗。",
    finding: "复杂生活场景可以被压缩成清楚的编辑层级；人物故事与器物环境仍可共存，而照片窗口负责提醒读者哪些内容来自输入。",
    scenario: "独立陶艺工作室的季度故事、手作节人物专访封面、社交媒体竖版专题首图。",
    whyItFits: "这条路线擅长把日常照片中的人物、物件和来源色重新编排为高能量编辑页面，适合先抓气氛、再保留一处事实窗口的内容。",
    boundary: "不适合商品颜色校准、陶器细节目录、人物身份档案或必须保持原照片像素的纪实版面。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "rooftop-dancer-motion",
    skillSlug: "dyy-photo-deconstruct",
    title: "屋顶风中的单人动作",
    question: "当输入只有一位舞者、强风和工业屋顶时，最少的 mark 能否同时传达动作方向、落点和环境轴？",
    source: {
      src: "/generated/source/revision10/dyy-rooftop-dancer-source.png",
      alt: "一位成年女舞者穿深紫长裙在工业屋顶迎风跨步转身的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 02。人物四肢、衣摆、飘纱、屋顶水塔和日落轴线完整可见。",
    },
    effect: {
      src: "/generated/studies/dyy-photo-deconstruct/revision10-rooftop-dancer-effect.png",
      alt: "用少量剪影、动作线、色洗、点和小色块蒸馏屋顶舞者动作的极简旧纸效果",
      caption: "REVISION 10 EFFECT · DYY Photo Deconstruct 概念研究。以最少 mark 表达躯干弧、跨步轴、飘纱轨迹、落点和屋顶关系。",
    },
    status: "成立",
    method: "删除面孔与服装细节，只保留躯干弧、跨步轴、橘红飘纱轨迹、脚下落点和一条屋顶水平轴，控制在大面积空纸中的单一小簇。",
    finding: "单人动作不需要完整肖像仍能保持方向感；环境轴让抽象 mark 不至于变成脱离场景的装饰。",
    scenario: "舞蹈节节目页、动作研究卡、排练日志章节页、表演艺术课程中的视觉归纳示例。",
    whyItFits: "它把可读性建立在 silhouette 与 gesture 的最小词典上，特别适合研究动作而非身份的场景。",
    boundary: "不能替代编舞记谱、人体结构教学、演员身份记录或对动作角度有测量要求的材料。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "volcanic-coast-relations",
    skillSlug: "travel-photo-abstraction",
    title: "火山海岸的高反差关系",
    question: "人物、玄武岩、浪带和风向形成强对比时，照片证据区与关系抽象面板能否分工而不互相抢夺？",
    source: {
      src: "/generated/source/revision10/travel-volcanic-coast-source.png",
      alt: "一位成年女旅行者穿红色雨衣站在黑色火山海岸、蓝绿海浪和黄色风吹围巾之间的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 03。红色人物锚、玄武岩轴、蓝绿浪带、黄色风向和湿石深度完整入画。",
    },
    effect: {
      src: "/generated/studies/travel-photo-abstraction/revision10-volcanic-coast-effect.png",
      alt: "上方照片证据窗和下方玄武岩、浪带、人物锚、风向线关系面板组成的旅行抽象效果",
      caption: "REVISION 10 EFFECT · Travel Photo Abstraction 概念研究。上方保留完整构图窗口，下方只解释轴线、深度与色彩角色。",
    },
    status: "部分成立",
    method: "把输入拆成岩柱轴线、浪带、红色主体锚、黄色风向线和负空间，再让上方证据窗负责场景、下方面板负责关系说明。",
    finding: "高反差题材能形成清楚的上下分工；但当前生成式照片窗只能证明构图意图，不能证明源像素被确定性锁定。",
    scenario: "旅行随笔章节封面、自然地貌展览导语、目的地编辑故事页和酒店房间内的地域叙事图。",
    whyItFits: "它最有价值的不是换画风，而是把原照片与抽象解释分离，让读者同时看到事实场景和关系提炼。",
    boundary: "不适合要求原图像素一致的新闻、档案或地理证据；生产版应由确定性合成脚本嵌入 SOURCE 并做像素校验。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "greenhouse-repair-relations",
    skillSlug: "scenes-gathered-zine",
    title: "暴雨后共同修复温室",
    question: "多人协作、破损结构、工具和湿叶同时出现时，拼贴能否保持关系叙事而不是只剩热闹的颜色？",
    source: {
      src: "/generated/source/revision10/scenes-greenhouse-repair-source.png",
      alt: "三位成年女性在暴雨后的社区温室共同修复棚顶、周围有湿叶和橙色工具箱的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 04。三位虚构成年人、协作动作、破损棚顶、工具和温室环境完整可见。",
    },
    effect: {
      src: "/generated/studies/scenes-gathered-zine/revision10-greenhouse-repair-effect.png",
      alt: "以撕纸边、半透明色场和结构色连接温室修复人物与棚顶对角线的实景拼贴效果",
      caption: "REVISION 10 EFFECT · Scenes Gathered 概念研究。用一条结构色把三人的动作与温室破损轴线连接起来。",
    },
    status: "部分成立",
    method: "保留三人协作、温室棚顶和工具关系，以撕纸边与半透明来源色场重排画面，再用一个结构色贯穿人物动作与棚顶对角线。",
    finding: "拼贴语言能强调共同目标和空间联系；生成式重构仍需额外核对人数、面孔和局部来源真实性。",
    scenario: "社区修复项目故事墙、女性协作专题、非营利组织年度报告跨页和环境行动展板。",
    whyItFits: "Scenes Gathered 的优势是让照片中的多个片段围绕同一结构关系聚合，适合群体故事而非单一英雄肖像。",
    boundary: "不适合成员名单、口述史身份档案、事故证据或必须逐人保持像素／面孔一致的记录。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "desert-astronomer-distillation",
    skillSlug: "scene-distillation-zine",
    title: "沙漠观测站的寂静校准",
    question: "完全移除人物与照片后，少量色场和轨迹还能否表达“在寂静中校准遥远光线”的情绪命题？",
    source: {
      src: "/generated/source/revision10/distillation-desert-astronomer-source.png",
      alt: "一位成年北非女天文学家站在沙漠圆顶观测站、银色望远镜和深蓝星空之间的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 05。天文学家、白色圆顶、藏红披肩、青绿设备灯和星河完整入画。",
    },
    effect: {
      src: "/generated/studies/scene-distillation-zine/revision10-desert-astronomer-effect.png",
      alt: "用深蓝空间场、银色观测弧、藏红张力点和青绿校准 marks 蒸馏沙漠观测情绪的抽象效果",
      caption: "REVISION 10 EFFECT · Scene Distillation 概念研究。照片与人物肖像被移除，只保留命题、张力与形式角色。",
    },
    status: "成立",
    method: "先把场景概括为寂静／远距／校准，再删除人物肖像和建筑轮廓，仅保留深蓝空间场、银色观测弧、藏红张力点与青绿校准 marks。",
    finding: "成品不依赖写实人物也能传达观测、距离和专注；题材内容通过角色关系而不是照片轮廓继续存在。",
    scenario: "天文节主视觉、科学随笔封面、冥想音乐包装和观测站教育展的情绪入口。",
    whyItFits: "这条路线适合把“场景是什么”转成“中心张力是什么”，能够避免结果沦为普通照片滤镜。",
    boundary: "不适合作为观测站说明图、人物介绍、设备技术图或任何需要辨认真实地点的证据。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "radio-signal-anchor",
    skillSlug: "gc-minimal-zine-poster",
    title: "未接通的短波信号",
    question: "面对一件具有丰富材质的旧收音机，能否压缩成一个强隐喻，而不是继续画成漂亮的商品插画？",
    source: {
      src: "/generated/source/revision10/gc-antique-radio-source.png",
      alt: "旧奶油色短波收音机放在钴蓝金属桌上、橙色电线形成回环的完整合成静物",
      caption: "REVISION 10 SOURCE · 独立输入 06。收音机外壳细裂、铜旋钮、橙色电线环和午夜窗光完整可见。",
    },
    effect: {
      src: "/generated/studies/gc-minimal-zine-poster/revision10-radio-signal-effect.png",
      alt: "以大量留白、橙色未接通信号环、小型收音机质量块和纸张瑕疵构成的极简 zine 海报",
      caption: "REVISION 10 EFFECT · GC Minimal Zine Poster 概念研究。高彩信号环是唯一主锚，物件仅保留必要质量。",
    },
    status: "成立",
    method: "从外壳、旋钮和电线中只选择“未接通的信号环”作为核心隐喻，把物件质量缩成很小的陪衬，并把其余画布还给留白和轻微印刷噪声。",
    finding: "物件题材能够从描述对象转为描述状态；橙色环承担视觉中心，收音机细节不再与它竞争。",
    scenario: "实验音乐演出海报、广播档案专题封面、播客季视觉和关于失联／等待的文学活动物料。",
    whyItFits: "GC 路线的价值在于把内容编译成一个可成像隐喻，再用留白、色锚和微小类型位置建立海报张力。",
    boundary: "不适合商品详情、维修说明、收藏品鉴定或需要完整展示按钮和外壳状态的任务。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "seamstress-memory",
    skillSlug: "photo-revival",
    title: "黄昏缝纫桌的记忆重绘",
    question: "当记忆由人物、未完成礼服和两处小物共同构成时，全量重绘能否保留情感证据而不假装照片保真？",
    source: {
      src: "/generated/source/revision10/revival-seamstress-source.png",
      alt: "一位虚构成年老年女裁缝坐在黄昏公寓缝纫桌旁、周围有蓝色礼服和缝纫物件的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 07。人物手势、孔雀蓝礼服、酒红线轴、黄铜剪刀和无字旧信完整可见。",
    },
    effect: {
      src: "/generated/studies/photo-revival/revision10-seamstress-memory-effect.png",
      alt: "在暖棉纸上以石墨、透明水彩和干彩铅重绘女裁缝与缝纫桌记忆的小型插画",
      caption: "REVISION 10 EFFECT · Photo Revival 概念研究。保留主主体、场景和两处记忆细节，以大留白明确它是重绘而非修复。",
    },
    status: "成立",
    method: "把人物、缝纫桌和蓝色礼服作为主簇，保留红线轴、黄铜剪刀与无字旧信作为记忆点，再以石墨、透明水彩和干彩铅整体重画。",
    finding: "人物与物件的关系比面部细节更能承载记忆；大留白和手绘媒介让结果清楚地远离“修复原照片”的误解。",
    scenario: "家族记忆小册、手艺人口述史章节插画、纪念展导语和非身份导向的私人礼物。",
    whyItFits: "Photo Revival 适合把一张照片重新解释成记忆插画，保留场景和少数细节，而不是追求像素一致。",
    boundary: "不适合作为人脸修复、家谱身份识别、服装工艺档案或法律／新闻照片复原。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "night-market-drummer",
    skillSlug: "pixel-style-poster",
    title: "夜市鼓手的材料分层",
    question: "在真正的人物近景里，细密点阵能否区分肤色、头巾、缎面外套、铜鼓和灯光，而不退化为 8-bit 大像素？",
    source: {
      src: "/generated/source/revision10/pixel-night-drummer-source.png",
      alt: "一位成年南亚女鼓手在彩色夜市雨棚下完成最后一拍的头肩到上胸动态近景合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 08。人物面部、洋红头巾、孔雀蓝夹克、铜鼓和夜市灯光完整入画。",
    },
    effect: {
      src: "/generated/studies/pixel-style-poster/revision10-night-drummer-halftone-effect.png",
      alt: "以高密微点、分层网频、有限套色和轻微错版重构夜市女鼓手近景的 fine bitmap 海报",
      caption: "REVISION 10 EFFECT · Pixel Style Poster 概念研究。面部、织物、金属和背景使用不同网频，不采用 8-bit 方块。",
    },
    status: "成立",
    method: "锁定近景比例与情绪后，为面部连续调子、头巾与夹克方向性纹理、铜鼓反光和背景灯场分配不同点径与网频，再用有限套色统一材料。",
    finding: "细点阵可以同时保持表情和材料差异；人物与背景层级通过网频而不是简单模糊建立。",
    scenario: "音乐节人物海报、爵士／世界音乐节目册、唱片内页和印刷材料语言课程示例。",
    whyItFits: "这条路线把像素密度和半调疏密当成明暗与材质语法，特别适合有强面部焦点和多种表面的编辑肖像。",
    boundary: "不证明身份相似度、肤色校准、真实网版印刷效果或细网点在指定纸张上的可生产性。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "lighthouse-keeper-relic",
    skillSlug: "photo-relic-editorial",
    title: "暴风前的灯塔信号",
    question: "人物、旋梯、海面和信号旗都有强叙事时，下半区能否只选择一个 relic 而不重复整张照片？",
    source: {
      src: "/generated/source/revision10/relic-lighthouse-keeper-source.png",
      alt: "一位成年女灯塔守护员穿芥黄雨衣、手持朱红信号旗站在暴风前螺旋铁梯平台的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 09。人物、灯塔、螺旋铁梯、海面和信号旗完整入画。",
    },
    effect: {
      src: "/generated/studies/photo-relic-editorial/revision10-lighthouse-relic-effect.png",
      alt: "上方灯塔守护员证据窗与下方单一信号旗和灯塔光束 relic 组成的编辑竖版效果",
      caption: "REVISION 10 EFFECT · Photo Relic Editorial 概念研究。下半区只保留风中旗与光束这一主遗迹。",
    },
    status: "部分成立",
    method: "上区承担人物与真实环境，下区只把信号旗、光束和风向压缩成一个 relic，色板限制为深靛、炭黑、灰绿和一个来源暖色点。",
    finding: "单一遗迹足以与上区人物形成跨区呼应；但生成式上区只能说明版式与叙事关系，不能证明原图像素锁定。",
    scenario: "海事口述史封面、沿海文化刊物、灯塔展览章节页和以守护／预警为主题的编辑故事。",
    whyItFits: "它允许照片负责证据、relic 负责记忆，把同一事件的事实层和余韵层放在一张版面里。",
    boundary: "不适合海况证据、人物档案、航海安全说明或任何要求上区照片逐像素保真的正式材料。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "salt-pans-relations",
    skillSlug: "photo-distill",
    title: "盐田网格与唯一移动锚",
    question: "换成高视角、重复网格和单一移动物的景观后，纯代码关系蒸馏能否仍保持可重复、可测试？",
    source: {
      src: "/generated/source/revision10/distill-salt-pans-source.png",
      alt: "高视角盐田中粉红、象牙和青绿水池由斜向堤道连接、唯一钴蓝服务车位于其中的完整合成图",
      caption: "REVISION 10 SOURCE · 独立输入 10。重复池格、斜堤轴、色带角色和唯一蓝色移动锚完整可见。",
    },
    effect: {
      src: "/generated/studies/photo-distill/revision10-salt-pans-relations-effect.svg",
      alt: "仅用斜向堤轴、池格间隔、蓝色移动锚、粉红盐度色带和纸面负空间构成的纯 SVG 关系海报",
      caption: "REVISION 10 EFFECT · Photo Distill clean-room 代码原生研究。自足 SVG，不含照片像素、外部资源或可见文字。",
    },
    status: "成立",
    method: "从 SOURCE 只读取池格间隔、堤道角度、单一车辆锚和色彩角色，再以确定性 SVG 坐标与固定色板重新表达，不嵌入照片。",
    finding: "重复结构和唯一移动物可以被转换为清楚的几何层级；同一生成脚本重复运行应得到字节稳定的自足结果。",
    scenario: "地景研究海报、数据化旅行纪念、环境展览信息底图和可在线参数化的系列视觉。",
    whyItFits: "Photo Distill 的优势是关系量、坐标和渲染都可审计，适合需要离线复现、批量变体和量化 QA 的视觉系统。",
    boundary: "SOURCE 本身仍是合成输入；当前只证明一份本地 clean-room SVG 的可重复性，不代表复制了无正式许可证的上游代码或阈值。",
    disclosure: "SOURCE 是本项目生成的虚构地景；EFFECT 是独立编写的 clean-room 自足 SVG，只研究公开描述的 code-native 思路，不含上游代码、模板或照片像素。",
  },
  {
    id: "fog-cellist-gesture",
    skillSlug: "poetic-line-zine-poster",
    title: "雾中收琴的余韵",
    question: "音乐结束后的收拾动作没有演奏高潮时，gesture／mass／rhythm／path 是否仍能生成有叙事的诗性面板？",
    source: {
      src: "/generated/source/revision10/poetic-fog-cellist-source.png",
      alt: "一位成年女大提琴手在雾中湖畔音乐会结束后收拾琴盒、周围有折叠椅和暖灯的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 11。人物动作、莓红外套、孔雀蓝琴盒、金色围巾、雾和折叠椅完整入画。",
    },
    effect: {
      src: "/generated/studies/poetic-line-zine-poster/revision10-fog-cellist-effect.png",
      alt: "上方完整人物证据窗和下方炭笔雾线、莓红步态、蓝色琴盒质量及金色围巾弧组成的诗性效果",
      caption: "REVISION 10 EFFECT · Poetic Line 概念研究。下方面板以 gesture、mass、rhythm 和 path 转译演出后的动作余韵。",
    },
    status: "部分成立",
    method: "把收琴动作路由为 gesture，把琴盒路由为 mass，把雾与折叠椅重复路由为 rhythm，再以围巾和行走方向形成 path。",
    finding: "低高潮动作同样可以生成有方向的诗性面板；当前生成式照片窗仍不能替代生产版的确定性原图嵌入与结构验证。",
    scenario: "室外音乐季节目册、演奏者随笔封面、音乐学校年度刊和关于离场／余音的展览图。",
    whyItFits: "这条路线能把题材从“人物在做什么”转成四类关系 mark，同时让照片和面板承担不同叙事层。",
    boundary: "不适合演奏姿势教学、乐器档案、人物身份保真或需要自动通过 75 分人工评分汇总的正式声称。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "conservatory-relations",
    skillSlug: "photo-abstract-editorial",
    title: "温室螺旋楼梯的关系图",
    question: "强透视、植物遮挡、楼梯承重和游客流向同时存在时，关系 marks 能否比完整轮廓更清楚？",
    source: {
      src: "/generated/source/revision10/abstract-conservatory-source.png",
      alt: "一位成年黑人女植物学家穿亮紫套装站在玻璃温室螺旋楼梯和巨型绿叶之间的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 12。人物重心、楼梯透视、玻璃轴、植物遮挡和分层游客完整入画。",
    },
    effect: {
      src: "/generated/studies/photo-abstract-editorial/revision10-conservatory-relations-effect.png",
      alt: "完整温室证据窗与用消失轴、承重轴、遮挡面、压缩间隔、游客流和紫色重心结构成的抽象编辑面板",
      caption: "REVISION 10 EFFECT · Photo Abstract Editorial 概念研究。关系面板刻意不描摹完整楼梯或人物轮廓。",
    },
    status: "部分成立",
    method: "从复杂输入中选出两条消失轴、一条承重轴、一个遮挡面、一个压缩间隔、两股流向和紫色重心结，再在暖象牙面板中重排。",
    finding: "关系 marks 能把视觉复杂度压缩成可读的空间逻辑；但照片证据窗尚未经过确定性像素嵌入，不能用来证明来源忠实度。",
    scenario: "建筑与景观刊物跨页、温室导览折页、空间观察课程和以人流／遮挡为主题的展览说明。",
    whyItFits: "这条路线特别适合把“看起来很复杂”的照片翻译成轴线、间隔、重心和流向，帮助讨论空间而不是画风。",
    boundary: "不适合建筑测绘、消防疏散分析、游客统计或任何需要几何精度和原图像素一致的技术材料。",
    disclosure: localConceptDisclosure,
  },
  {
    id: "floating-market-postcard",
    skillSlug: "photo-to-zine-postcard",
    title: "日出水上市场明信片",
    question: "人物、船、水果和水面色彩都很丰富时，固定双面产品系统能否维持照片主角与可书写功能的平衡？",
    source: {
      src: "/generated/source/revision10/postcard-floating-market-source.png",
      alt: "一位成年东南亚女船贩在日出水上市场、青绿木船和金黄水果之间的完整合成照片",
      caption: "REVISION 10 SOURCE · 独立输入 13。人物、船、水果、遮阳棚、粉橙天空和水面反射完整入画。",
    },
    effect: {
      src: "/generated/studies/photo-to-zine-postcard/revision10-floating-market-postcard-effect.png",
      alt: "包含完整照片正面、手绘船桨波纹 motif、三枚来源色块和可书写背面预演的双面 zine 明信片研究板",
      caption: "REVISION 10 EFFECT · Photo to Zine Postcard 数字产品研究。正面／背面均完整展示，但未做实体印刷。",
    },
    status: "部分成立",
    method: "正面让完整照片承担主叙事，下方只加入一个船桨／波纹主 motif、一个可选辅 motif 和三枚来源色块；背面维持地址、邮票与书写区的统一功能网格。",
    finding: "丰富场景仍可被固定产品系统约束成清楚的正反面家族；当前结果只完成数字版式，尚未验证出血、纸张、色差和邮寄耐久。",
    scenario: "水上市场旅行纪念、文化节游客包、精品酒店欢迎卡和地方饮食故事套系。",
    whyItFits: "这条路线不只生成一张漂亮图，而是把照片、来源色、手绘元素和功能背面组织成可系列化的旅行产品。",
    boundary: "不是实体印刷打样、CMYK 颜色证明、邮政合规测试或真实商户代言；生产前仍需刀模、出血和纸材验证。",
    disclosure: localConceptDisclosure,
  },
];

const duplicateSlugs = revision10IndependentExperiments.filter((entry, index, entries) => entries.findIndex((candidate) => candidate.skillSlug === entry.skillSlug) !== index);
const duplicateSources = revision10IndependentExperiments.filter((entry, index, entries) => entries.findIndex((candidate) => candidate.source.src === entry.source.src) !== index);
const duplicateEffects = revision10IndependentExperiments.filter((entry, index, entries) => entries.findIndex((candidate) => candidate.effect.src === entry.effect.src) !== index);

if (duplicateSlugs.length > 0) throw new Error(`Duplicate Revision 10 Skill entries: ${duplicateSlugs.map((entry) => entry.skillSlug).join(", ")}`);
if (duplicateSources.length > 0) throw new Error(`Duplicate Revision 10 sources: ${duplicateSources.map((entry) => entry.source.src).join(", ")}`);
if (duplicateEffects.length > 0) throw new Error(`Duplicate Revision 10 effects: ${duplicateEffects.map((entry) => entry.effect.src).join(", ")}`);
