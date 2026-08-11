import type { DemoImage } from "@/app/data/skills";
import { revision7CapabilityExplorationsBySlug } from "@/app/data/revision7-capability-explorations";
import type { Revision7Conclusion } from "@/app/data/revision7-conclusions";

export type CapabilityApplicationKind = "poster" | "editorial" | "cover" | "screen" | "exhibition" | "card" | "postcard" | "packaging";

export type CapabilityApplication = {
  kind: CapabilityApplicationKind;
  title: string;
  context: string;
  specification: string;
};

export type CapabilityExploration = {
  id: string;
  title: string;
  question: string;
  source: DemoImage;
  effect: DemoImage;
  retained: readonly string[];
  discarded: readonly string[];
  productDirections: readonly string[];
  process: readonly [string, string, string];
  application?: CapabilityApplication;
  conclusion?: Revision7Conclusion;
};

export const capabilityExplorationsBySlug: Record<string, readonly CapabilityExploration[]> = {
  ...revision7CapabilityExplorationsBySlug,
  "photo-distill": [
    {
      id: "florist-rain-relations",
      title: "雨夜花店：人物故事能否被关系量保留下来",
      question: "不描摹脸部、衣褶和花朵轮廓时，能否仍让人读出一位花店工作者、她手中的花束，以及雨夜电车正在接近的城市时刻？",
      source: {
        src: "/generated/source/next/florist-crosswalk-source.png",
        alt: "虚构成年女花店工作者抱着花束站在雨夜电车站旁的完整来源图",
        caption: "完整输入：蓝色大衣、暖橙围巾、彩色花束、湿润轨道与远处电车共同形成清晰的人物—环境关系。",
      },
      effect: {
        src: "/generated/studies/photo-distill/florist-rain-relations-effect.svg",
        alt: "以人物质量、轨道路由、花束色锚和雨面节奏表达雨夜花店故事的代码海报",
        caption: "完整效果：人物被压缩为蓝色质量，花束成为暖色锚点，轨道与雨面短线负责时间、方向和天气。",
      },
      retained: ["蓝色人物质量与暖色围巾的方向", "花束作为画面唯一的多色叙事锚", "电车轨道的接近路径与湿地反射节奏"],
      discarded: ["脸部相似度与五官细节", "每一片花瓣、衣褶和橱窗物件", "照片级灯光、材质与景深"],
      productDirections: ["城市文化杂志人物开篇", "花店或夜间市集活动主视觉", "电车沿线故事的章节海报"],
      process: ["先把人物、花束、轨道和雨面分别读成质量、色锚、路径与节奏。", "再用有限几何和颜色重建关系，不沿照片轮廓描边。", "最后把完整 SVG 放入标题、日期与正文都可独立变化的编辑版式。"],
      conclusion: {
        status: "成立",
        action: "把雨夜花艺师从照片题材改写为质量、色锚、路径和节奏，再用纯 SVG 重建一张不含照片像素的新效果。",
        finding: "人物故事、花束注意点和电车接近方向在不描脸、不描花瓣的情况下仍然可读。",
        proves: "Photo Distill 的关系语法可以从湖岸场景迁移到人物与城市叙事。",
        doesNotProve: "不证明面孔相似、原照保真，也不是运行上游仓库后得到的官方结果。",
        productionNext: "进入真实出版物前，需要补标题系统、输出尺寸和不同浏览器的确定性渲染检查。",
      },
    },
    {
      id: "north-harbor-flow-relations",
      title: "北港换乘：复杂城市能否被压缩而不变成噪声",
      question: "当顶棚、轨道、车辆、人群和反光同时出现时，Photo Distill 能否主动建立优先级，而不是把所有信息平均翻译成装饰纹理？",
      source: {
        src: "/generated/source/next/north-harbor-interchange-source.png",
        alt: "雨夜北港换乘枢纽中顶棚、列车、楼梯与大量行人的完整来源图",
        caption: "完整输入：密集人流、交汇轨道、玻璃顶棚和地下入口组成多个方向与遮挡层。",
      },
      effect: {
        src: "/generated/studies/photo-distill/north-harbor-flow-relations-effect.svg",
        alt: "以透视轴、人流密度、主动留空与单一黄色锚表达北港换乘关系的代码海报",
        caption: "完整效果：顶棚收束为透视汇聚，人群成为分段密度带，三处深色留空保持呼吸，只保留一个黄色锚。",
      },
      retained: ["顶棚与轨道共同指向的透视轴", "人流的聚散密度与移动方向", "遮挡形成的三处空隙和一个黄色注意锚"],
      discarded: ["单个行人的身份、服装与动作轮廓", "建筑表皮、车身标识和雨滴细节", "照片中的每一种霓虹颜色"],
      productDirections: ["城市交通文化节主视觉", "换乘空间研究或教学图", "数据展览的章节封面"],
      process: ["先按方向、密度、遮挡和注意点给复杂现场分层。", "再用汇聚线、短线簇和负空间建立阅读顺序，只保留一个饱和色。", "最后按海报、导视屏或展览章节需要调整标题区，而不改变关系骨架。"],
      conclusion: {
        status: "成立",
        action: "把换乘枢纽拆成透视轴、人流密度、遮挡空隙和黄色注意锚，再用代码图形重新组织阅读顺序。",
        finding: "复杂现场没有被平均翻译成噪声，汇聚方向和人流层级在缩略尺寸仍可辨认。",
        proves: "这条代码原生路线能处理比湖岸基线更密集的城市关系。",
        doesNotProve: "不证明它能替代交通导视、客流分析或无障碍信息设计。",
        productionNext: "若进入公共空间，需要接入真实导视规范、文字层和多语言可读性验证。",
      },
    },
    {
      id: "season-seed-library-relations",
      title: "四季种子房：同一语法能否形成系列产品",
      question: "同一座温室从春到冬发生显著颜色和密度变化时，能否锁定结构身份，同时让四张成员拥有各自的季节状态？",
      source: {
        src: "/generated/source/next/season-seed-library-source.png",
        alt: "同一海边玻璃种子房在春夏秋冬四个季节中的完整来源板",
        caption: "完整输入：四张成员保持相同温室与视角，只改变植物密度、天气、地面状态和季节色彩。",
      },
      effect: {
        src: "/generated/studies/photo-distill/season-seed-library-relations-effect.svg",
        alt: "共享温室结构语法并改变四季密度和颜色角色的四格代码海报",
        caption: "完整效果：一个温室结构 symbol 重复四次；春、夏、秋、冬只改变场域密度、气氛和季节锚色。",
      },
      retained: ["四季共享的温室屋架、门窗与中心轴", "植物由稀到密再回落的季节节奏", "结构色、场域色和锚色三种稳定角色"],
      discarded: ["每株植物与每块玻璃的具体轮廓", "天空、海面和石路的摄影纹理", "季节之间无助于系列识别的偶然细节"],
      productDirections: ["植物园年度四季海报", "博物馆或种子库教育日历", "同一品牌的季节网页章节"],
      process: ["先锁定四张输入共有的温室结构与视角。", "再分别计算植物密度和季节色彩角色，共用一套几何语法。", "最后输出四张可独立使用、也能组成日历或活动系列的成员。"],
      conclusion: {
        status: "成立",
        action: "锁定温室结构 symbol，只让春夏秋冬改变密度、场域和锚色，生成一个四成员代码系列。",
        finding: "四张成员既共享身份，又保留清楚的季节差异，适合继续扩展为系列产品。",
        proves: "Photo Distill 不只适合单张海报，也能建立可复用的系列语法。",
        doesNotProve: "不证明真实气候数据、植物分类或跨浏览器像素完全一致。",
        productionNext: "真实落地需要固定字体与浏览器版本，并为日历、网页或展板分别建立输出模板。",
      },
    },
  ],
};
