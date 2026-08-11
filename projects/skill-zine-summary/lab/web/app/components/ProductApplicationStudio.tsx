import { DemoFigure } from "@/app/components/DemoFigure";
import type {
  ProductApplicationCase,
  ProductPresentation,
  ProductType,
} from "@/app/data/product-applications";

const productTypeMeta: Record<ProductType, { label: string; descriptor: string }> = {
  editorial: { label: "EDITORIAL", descriptor: "杂志与长篇版面" },
  poster: { label: "POSTER", descriptor: "活动与公共传播" },
  mobile: { label: "MOBILE", descriptor: "移动内容与社交发布" },
  gallery: { label: "GALLERY", descriptor: "展览与空间陈列" },
  digital: { label: "DIGITAL", descriptor: "网页与数字屏幕" },
  packaging: { label: "PACKAGING", descriptor: "包装与实体商品" },
  education: { label: "EDUCATION", descriptor: "课程与研究讲解" },
  archive: { label: "ARCHIVE", descriptor: "档案与长期记录" },
};

type SurfaceShape =
  | "poster" | "story" | "square" | "wide" | "screen" | "web"
  | "spread" | "fold-panel" | "panel" | "card" | "label" | "ticket"
  | "box" | "wrap" | "phone" | "bookmark" | "hangtag" | "sheet";

type SurfaceMode = "art" | "mixed" | "copy";
type PresentationLayout =
  | "campaign" | "story-stack" | "screen-suite" | "exhibition-suite"
  | "archive-record" | "selector" | "foldout" | "wall-grid"
  | "cover-set" | "box-set" | "wrap-set" | "ticket-set"
  | "interactive" | "book-stage" | "toolkit" | "hotel-kit"
  | "postcard-set" | "postcard-room";
type ContextGroup =
  | "retail" | "device" | "gallery" | "archive" | "hotel" | "table"
  | "wellness" | "stage" | "bookstore" | "home" | "museum"
  | "transit" | "festival" | "classroom";

type SurfaceSpec = { label: string; shape: SurfaceShape; mode?: SurfaceMode };
type PresentationProfile = {
  layout: PresentationLayout;
  context: ContextGroup;
  place: string;
  surfaces: readonly SurfaceSpec[];
  contextCount?: number;
};

const s = (label: string, shape: SurfaceShape, mode: SurfaceMode = "mixed"): SurfaceSpec => ({ label, shape, mode });

const presentationProfiles: Record<ProductPresentation, PresentationProfile> = {
  "florist-editorial-campaign-suite": {
    layout: "campaign", context: "retail", place: "独立花店橱窗与零售柜台",
    surfaces: [s("A3 人物海报", "poster"), s("社交首图", "square"), s("竖屏故事", "story"), s("橱窗长幅", "poster", "copy")], contextCount: 2,
  },
  "five-card-mobile-story": {
    layout: "story-stack", context: "device", place: "城市文化账号的手机连载",
    surfaces: [s("01 / 开场", "story"), s("02 / 人物", "story", "copy"), s("03 / 地点", "story"), s("04 / 方法", "story", "copy"), s("05 / 回看", "story")], contextCount: 3,
  },
  "audio-cover-motion-set": {
    layout: "screen-suite", context: "device", place: "流媒体播放页与试听竖屏",
    surfaces: [s("3000px 封面", "square"), s("5 秒动态母版", "square"), s("竖屏试听", "story"), s("静态 Fallback", "square", "copy")], contextCount: 2,
  },
  "sound-exhibition-entry-system": {
    layout: "exhibition-suite", context: "gallery", place: "声音展入口与试听台",
    surfaces: [s("入口长幅", "panel"), s("A5 解释卡", "card", "copy"), s("试听台屏保", "wide")], contextCount: 2,
  },
  "night-shop-archive-record": {
    layout: "archive-record", context: "archive", place: "地方档案阅览室与数字目录",
    surfaces: [s("档案网页", "web"), s("A2 展板", "poster"), s("来源记录", "sheet", "copy")], contextCount: 2,
  },
  "hotel-three-tone-selector": {
    layout: "selector", context: "hotel", place: "精品酒店大堂选片评审屏",
    surfaces: [s("TONE A / 暖", "wide"), s("TONE B / 中性", "wide"), s("TONE C / 冷", "wide"), s("夜游折页", "card", "copy")], contextCount: 3,
  },
  "eight-fold-oral-history-booklet": {
    layout: "foldout", context: "table", place: "社区口述史共读桌",
    surfaces: Array.from({ length: 8 }, (_, index) => s(`${String(index + 1).padStart(2, "0")} / 折页`, "fold-panel", index % 3 === 1 ? "copy" : "mixed")), contextCount: 4,
  },
  "four-panel-season-archive-wall": {
    layout: "wall-grid", context: "gallery", place: "社区图书馆四季档案墙",
    surfaces: [s("春 / SPRING", "panel"), s("夏 / SUMMER", "panel"), s("秋 / AUTUMN", "panel"), s("冬 / WINTER", "panel")], contextCount: 4,
  },
  "commuter-mobile-editorial-kit": {
    layout: "campaign", context: "device", place: "城市媒体移动专题页",
    surfaces: [s("社交专题", "square"), s("竖屏故事", "story"), s("网页长文", "web"), s("讲座海报", "poster", "copy")], contextCount: 2,
  },
  "meditation-multiscreen-scene": {
    layout: "screen-suite", context: "wellness", place: "静心空间投影与冥想 App",
    surfaces: [s("手机呼吸场", "phone"), s("空间投影", "wide"), s("会话封面", "square")], contextCount: 2,
  },
  "podcast-season-release-kit": {
    layout: "screen-suite", context: "stage", place: "文学播客录制舞台",
    surfaces: [s("季度封面", "square"), s("竖屏预告", "story"), s("舞台屏", "wide"), s("纪念书签", "bookmark", "copy")], contextCount: 3,
  },
  "three-cover-bookstore-review-set": {
    layout: "cover-set", context: "bookstore", place: "书店封面盲选桌",
    surfaces: [s("封面 A / 横向", "poster"), s("封面 B / 垂直", "poster"), s("封面 C / 对角", "poster"), s("A2 盲选海报", "poster", "copy")], contextCount: 3,
  },
  "oral-history-memory-box": {
    layout: "box-set", context: "home", place: "家庭共读与纪念赠礼桌",
    surfaces: [s("布面纪念盒", "box"), s("口述史小书", "spread"), s("引文卡", "card", "copy"), s("原照档案", "sheet")], contextCount: 3,
  },
  "museum-object-label-system": {
    layout: "exhibition-suite", context: "museum", place: "博物馆展柜与教育触摸屏",
    surfaces: [s("A5 故事卡", "card"), s("藏品标签", "label", "copy"), s("多媒体屏", "wide"), s("文字稿", "sheet", "copy")], contextCount: 3,
  },
  "ep-tour-release-system": {
    layout: "campaign", context: "stage", place: "爵士巡演舞台与唱片台",
    surfaces: [s("EP 封面", "square"), s("A1 巡演海报", "poster"), s("舞台屏", "wide"), s("演出票", "ticket", "copy")], contextCount: 3,
  },
  "florist-riso-wrap-system": {
    layout: "wrap-set", context: "retail", place: "花店包装台与橱窗",
    surfaces: [s("孔版包装纸", "wrap"), s("花束纸套", "box"), s("社交发布", "square")], contextCount: 2,
  },
  "three-stop-night-tour-system": {
    layout: "exhibition-suite", context: "gallery", place: "工业遗产夜游三站灯箱",
    surfaces: [s("旧影院灯箱", "poster"), s("钢桥灯箱", "poster"), s("闭市长廊灯箱", "poster"), s("DL 路线册", "card", "copy"), s("线上专题", "web")], contextCount: 3,
  },
  "fashion-lookbook-campaign-kit": {
    layout: "campaign", context: "transit", place: "交通灯箱与外套品牌陈列",
    surfaces: [s("交通灯箱", "poster"), s("Lookbook 跨页", "spread"), s("社交首图", "square"), s("竖屏人物页", "story"), s("服装吊牌", "hangtag", "copy")], contextCount: 3,
  },
  "festival-variable-ticket-system": {
    layout: "ticket-set", context: "festival", place: "文化节入口与票务核验台",
    surfaces: [s("A2 主海报", "poster"), s("入场票", "ticket"), s("工作证", "card", "copy"), s("社交发布", "square")], contextCount: 3,
  },
  "interactive-education-wall": {
    layout: "interactive", context: "gallery", place: "设计博物馆 55 英寸互动墙",
    surfaces: [s("4K 互动主屏", "screen"), s("A4 带走页", "sheet"), s("键盘焦点图", "wide", "copy")], contextCount: 2,
  },
  "musician-tour-stage-system": {
    layout: "campaign", context: "stage", place: "青年音乐家巡演舞台",
    surfaces: [s("2:3 巡演海报", "poster"), s("竖屏人物预告", "story"), s("舞台屏", "wide")], contextCount: 3,
  },
  "photo-book-stage-scroll": {
    layout: "book-stage", context: "stage", place: "摄影诗集朗读会舞台",
    surfaces: [s("摄影诗集跨页", "spread"), s("朗读会舞台长卷", "wide"), s("滚动网页", "web")], contextCount: 2,
  },
  "foldout-learning-toolkit": {
    layout: "toolkit", context: "classroom", place: "建筑观察工作坊课堂",
    surfaces: [s("A2 折 A5 工具页", "spread"), s("练习卡", "card", "copy"), s("投影讲义", "wide")], contextCount: 3,
  },
  "hotel-space-annotation-kit": {
    layout: "hotel-kit", context: "hotel", place: "精品酒店官网与销售会谈桌",
    surfaces: [s("官网主图", "web"), s("社交注解卡", "square"), s("A4 销售画册", "spread")], contextCount: 2,
  },
  "postcard-collector-box-set": {
    layout: "postcard-set", context: "retail", place: "城市博物馆商店陈列架",
    surfaces: [s("收藏纸盒", "box"), s("影院卡 / 正", "card"), s("钢桥卡 / 正", "card"), s("市场卡 / 正", "card"), s("三卡共用背面", "card", "copy")], contextCount: 4,
  },
  "hotel-room-postcard-guide": {
    layout: "postcard-room", context: "hotel", place: "精品酒店客房床头与礼宾台",
    surfaces: [s("散步卡正面", "card"), s("可书写背面", "card", "copy"), s("移动城市指南", "phone")], contextCount: 2,
  },
  "parade-employer-brand-suite": {
    layout: "campaign", context: "festival", place: "节庆制作基地招聘开放日",
    surfaces: [s("招聘首页", "web"), s("年度案例跨页", "spread"), s("社交招聘卡", "square"), s("开放日海报", "poster", "copy")], contextCount: 3,
  },
  "automation-report-launch-kit": {
    layout: "toolkit", context: "transit", place: "物流自动化创新展说明区",
    surfaces: [s("年报章节", "spread"), s("创新展入口卡", "card"), s("演讲主屏", "wide"), s("方法手册", "sheet", "copy")], contextCount: 3,
  },
  "micro-apartment-property-story": {
    layout: "hotel-kit", context: "hotel", place: "微型公寓样板间与租赁会谈桌",
    surfaces: [s("房源详情页", "web"), s("销售三折页", "spread"), s("样板间屏", "wide"), s("经纪说明卡", "card", "copy")], contextCount: 3,
  },
  "mobile-clinic-impact-system": {
    layout: "exhibition-suite", context: "classroom", place: "社区服务说明会与赞助人展墙",
    surfaces: [s("年度报告跨页", "spread"), s("服务旅程展墙", "panel"), s("服务说明折页", "card", "copy"), s("志愿者培训屏", "wide")], contextCount: 3,
  },
  "founder-launch-letter-suite": {
    layout: "campaign", context: "stage", place: "新品牌发布会与顾客开箱桌",
    surfaces: [s("创办人信网页", "web"), s("年度信章节", "spread"), s("发布会主屏", "wide"), s("包裹内页", "card", "copy")], contextCount: 3,
  },
  "cybersecurity-conference-system": {
    layout: "campaign", context: "festival", place: "网络安全峰会入口与议程区",
    surfaces: [s("A1 主海报", "poster"), s("白皮书封面", "poster"), s("Webinar 落地页", "web"), s("议程屏", "wide", "copy"), s("社交预告", "square")], contextCount: 3,
  },
  "hardware-store-anniversary-kit": {
    layout: "archive-record", context: "retail", place: "社区五金店周年活动与故事墙",
    surfaces: [s("周年小书", "spread"), s("会员感谢卡", "card"), s("门店故事墙", "panel"), s("纪念钥匙标签", "hangtag", "copy")], contextCount: 3,
  },
  "industrial-automation-release-kit": {
    layout: "campaign", context: "transit", place: "工业自动化展主通道与销售台",
    surfaces: [s("A0 展会海报", "poster"), s("B2B 产品页", "web"), s("年报章节", "spread"), s("演讲主屏", "wide"), s("技术说明卡", "card", "copy")], contextCount: 3,
  },
  "perfume-archive-anniversary-system": {
    layout: "archive-record", context: "museum", place: "香氛品牌档案展与旗舰店历史墙",
    surfaces: [s("周年刊", "spread"), s("展柜标签", "label", "copy"), s("历史墙", "panel"), s("网页时间线", "web"), s("礼盒说明", "card")], contextCount: 4,
  },
  "fulfillment-operations-story-system": {
    layout: "screen-suite", context: "archive", place: "履约中心运营复盘室",
    surfaces: [s("复盘报告封面", "poster"), s("章节过渡屏", "wide"), s("运营大屏待机", "screen"), s("方法说明卡", "card", "copy")], contextCount: 3,
  },
  "wind-energy-report-system": {
    layout: "campaign", context: "gallery", place: "能源企业展厅与投资人说明会",
    surfaces: [s("年报开篇", "spread"), s("投资人演示", "wide"), s("展厅主屏", "screen"), s("公众教育折页", "sheet", "copy"), s("项目网页", "web")], contextCount: 3,
  },
  "exhibition-installation-case-system": {
    layout: "toolkit", context: "gallery", place: "展览设计事务所客户复盘墙",
    surfaces: [s("案例网页", "web"), s("客户复盘册", "spread"), s("策展教育墙", "panel"), s("提案方法卡", "card", "copy")], contextCount: 3,
  },
  "conference-thank-you-postcard-system": {
    layout: "postcard-set", context: "festival", place: "设计大会会后关系运营台",
    surfaces: [s("参会者感谢卡", "card"), s("可变信息背面", "card", "copy"), s("讲者礼盒卡", "card"), s("VIP 套封", "box"), s("CRM 预览", "phone", "copy")], contextCount: 4,
  },
};

function EmbeddedEffect({ application }: { application: ProductApplicationCase }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="product-studio__embedded-effect"
      src={application.effect.src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }}
    />
  );
}

function ProductSurface({ application, surface, index, compact = false }: {
  application: ProductApplicationCase;
  surface: SurfaceSpec;
  index: number;
  compact?: boolean;
}) {
  const mode = surface.mode ?? "mixed";
  return (
    <section className="case-product__surface" data-shape={surface.shape} data-mode={mode} data-variant={index % 4}>
      <header><span>{surface.label}</span><b>{String(index + 1).padStart(2, "0")}</b></header>
      <div className="case-product__surface-body">
        {mode !== "copy" && <div className="case-product__art"><EmbeddedEffect application={application} /></div>}
        {mode !== "art" && <div className="case-product__copy"><small>{application.output.name}</small>{!compact && <p className="case-product__title">{application.title}</p>}<i aria-hidden="true" /><p>{compact ? application.productType.toUpperCase() : application.output.channel}</p></div>}
      </div>
      {!compact && <footer>{application.output.specs[index % application.output.specs.length]}</footer>}
    </section>
  );
}

function ProductComposition({ application, profile }: { application: ProductApplicationCase; profile: PresentationProfile }) {
  return (
    <div className="case-product" data-layout={profile.layout} data-product-presentation={application.presentation} data-surface-count={profile.surfaces.length}>
      <header className="case-product__identity"><span>COMPLETE PRODUCT SYSTEM</span><b>{profile.surfaces.length} SURFACES</b></header>
      <div className="case-product__surfaces">
        {profile.surfaces.map((surface, index) => <ProductSurface key={`${surface.label}-${index}`} application={application} surface={surface} index={index} />)}
      </div>
      <footer className="case-product__delivery"><strong>{application.output.name}</strong><span>{application.output.channel}</span></footer>
    </div>
  );
}

function ContextPreview({ application, profile }: { application: ProductApplicationCase; profile: PresentationProfile }) {
  const contextSurfaces = profile.surfaces.slice(0, profile.contextCount ?? Math.min(3, profile.surfaces.length));
  return (
    <div className={`case-context case-context--${profile.context}`} data-product-presentation={application.presentation} data-context-place={profile.place}>
      <div className="case-context__architecture" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="case-context__products" data-count={contextSurfaces.length}>
        {contextSurfaces.map((surface, index) => <ProductSurface key={`${surface.label}-${index}`} application={application} surface={surface} index={index} compact />)}
      </div>
      <div className="case-context__furniture" aria-hidden="true"><i /><i /><i /></div>
      <aside className="case-context__label"><b>{profile.place}</b><span>{application.evidenceLevel}</span><small>{application.output.channel}</small></aside>
    </div>
  );
}

function StudioStage({ label, title, caption, children }: { label: string; title: string; caption: string; children: React.ReactNode }) {
  return (
    <figure className="product-studio__stage">
      <div className="product-studio__stage-label"><span>{label}</span><b>{title}</b></div>
      <div className="product-studio__stage-canvas" role="group" aria-label={`${title}：${caption}`}>{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function ProductApplicationCaseStudy({
  application,
  index = 0,
  variant = "standalone",
}: {
  application: ProductApplicationCase;
  index?: number;
  variant?: "standalone" | "embedded";
}) {
  const number = String(index + 1).padStart(2, "0");
  const type = productTypeMeta[application.productType];
  const profile = presentationProfiles[application.presentation];
  const embedded = variant === "embedded";

  return (
    <article
      className={`product-studio__case${embedded ? " product-studio__case--embedded" : ""}`}
      data-product-scene={application.id}
      data-product-type={application.productType}
      data-product-presentation={application.presentation}
      data-product-surface-count={profile.surfaces.length}
      data-product-system-preview={embedded ? "true" : undefined}
      data-effect-evidence={embedded ? "reuse" : undefined}
    >
      <header className="product-studio__case-head">
        <span>{number}</span>
        <div><p className="eyebrow">{type.label} · {type.descriptor}</p><h4>{application.title}</h4></div>
        <div className="product-studio__scenario"><b>{application.evidenceLevel}</b><p>{application.scenario}</p></div>
      </header>

      <div className="product-studio__visual-sequence">
        {!embedded && <DemoFigure image={application.effect} label={`01 · COMPLETE SKILL EFFECT · ${number}`} />}
        <StudioStage label={`${embedded ? "01" : "02"} · COMPLETE PRODUCT`} title={application.output.name} caption={`${profile.surfaces.length} 个完整产品表面 · ${application.output.channel}`}>
          <ProductComposition application={application} profile={profile} />
        </StudioStage>
        <StudioStage label={`${embedded ? "02" : "03"} · IN-CONTEXT PREVIEW`} title={profile.place} caption={`${application.evidenceLevel} · 复用同一 EFFECT，不冒充真实部署照片`}>
          <ContextPreview application={application} profile={profile} />
        </StudioStage>
      </div>

      <section className="product-studio__process" aria-label={`${application.title}处理流程`}>
        <header><p className="eyebrow">HOW THE EFFECT BECOMES A PRODUCT</p><h5>从效果到真实产品，具体如何处理</h5></header>
        <ol>{application.process.map((step, stepIndex) => <li key={`${step.label}-${stepIndex}`} data-process-step={step.label}><span>{String(stepIndex + 1).padStart(2, "0")}</span><div><b>{step.label}</b><p>{step.detail}</p></div></li>)}</ol>
      </section>

      <footer className="product-studio__case-foot">
        <section><p className="eyebrow">WHO / WHY</p><h5>使用者与能力焦点</h5><p><strong>{application.audience}</strong></p><p>{application.capabilityFocus}</p></section>
        <section><p className="eyebrow">OUTPUT SPEC</p><h5>{application.output.name}</h5><p>{application.output.channel}</p><ul>{application.output.specs.map((spec) => <li key={spec}>{spec}</li>)}</ul></section>
        <aside><p className="eyebrow">BOUNDARY</p><p>{application.boundary}</p></aside>
      </footer>
    </article>
  );
}

export function ProductApplicationStudio({ skillName, applications }: { skillName: string; applications: readonly ProductApplicationCase[] }) {
  if (applications.length === 0) return null;
  return (
    <section className="product-studio" id="product-studio">
      <header className="product-studio__heading">
        <div><p className="eyebrow">PRODUCT APPLICATION STUDIO · {applications.length} COMPLETE CASES</p><h3>让 {skillName} 真正进入产品与使用环境</h3></div>
        <p>每个案例都保留完整 Skill 效果，并按真实交付数量展示产品表面、信息结构和现实环境预演。这里比较的是效果如何成为书、屏幕、展墙、票务或商品，而不是给不同场景套同一个 mockup。</p>
      </header>
      <div className="product-studio__list">{applications.map((application, index) => <ProductApplicationCaseStudy key={application.id} application={application} index={index} />)}</div>
    </section>
  );
}
