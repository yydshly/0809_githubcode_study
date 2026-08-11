import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const paths = {
  florist: "public/generated/source/next/florist-crosswalk-source.png",
  violinist: "public/generated/source/next/poetic-line-last-train-violinist-source.png",
  cameraShop: "public/generated/source/next/night-camera-shop-source.png",
  snowfield: "public/generated/source/next/empty-snowfield-source.png",
  seasonSeed: "public/generated/source/next/season-seed-library-source.png",
  cinema: "public/generated/studies/photo-relic-editorial/north-harbor-cinema-source.png",
  bridge: "public/generated/studies/photo-relic-editorial/north-harbor-bridge-source.png",
  market: "public/generated/studies/photo-relic-editorial/north-harbor-market-source.png",
};

const outputPaths = {
  dailySource: "public/generated/source/next/daily-low-saturation-rain-source.svg",
  dailyEffect: "public/generated/studies/daily-photo-playground/low-saturation-rain-editorial-effect.svg",
  dyyEffect: "public/generated/studies/dyy-photo-deconstruct/single-motion-five-mark-effect.svg",
  travelEffect: "public/generated/studies/travel-photo-abstraction/night-contrast-three-panel-effect.svg",
  gcEffect: "public/generated/studies/gc-minimal-zine-poster/equal-budget-three-variants-effect.svg",
  snowEffect: "public/generated/studies/scene-distillation-zine/empty-snowfield-three-role-effect.svg",
  seasonEffect: "public/generated/studies/scenes-gathered-zine/four-season-structure-effect.svg",
  seasonSpring: "public/generated/source/next/season-seed-library-spring.png",
  seasonSummer: "public/generated/source/next/season-seed-library-summer.png",
  seasonAutumn: "public/generated/source/next/season-seed-library-autumn.png",
  seasonWinter: "public/generated/source/next/season-seed-library-winter.png",
  seasonManifest: "public/generated/source/next/season-seed-library-members.manifest.json",
  postcardSource: "public/generated/source/next/north-harbor-postcard-series-source-board.svg",
  postcardEffect: "public/generated/studies/photo-to-zine-postcard/north-harbor-three-card-series-effect.svg",
};

function absolute(relativePath) {
  return resolve(projectRoot, relativePath);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function mimeFor(relativePath) {
  const extension = extname(relativePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".svg") return "image/svg+xml";
  throw new Error("Unsupported embedded image type: " + relativePath);
}

function dimensionsForPng(bytes, relativePath) {
  const signature = bytes.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || bytes.length < 24) {
    throw new Error("Invalid PNG source: " + relativePath);
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

async function loadAsset(relativePath) {
  const bytes = await readFile(absolute(relativePath));
  const mime = mimeFor(relativePath);
  const dimensions = mime === "image/png" ? dimensionsForPng(bytes, relativePath) : {};
  return {
    relativePath,
    bytes,
    mime,
    sha256: sha256(bytes),
    dataUri: "data:" + mime + ";base64," + bytes.toString("base64"),
    ...dimensions,
  };
}

function assetFromText(relativePath, text, mime = "image/svg+xml") {
  const bytes = Buffer.from(text, "utf8");
  return {
    relativePath,
    bytes,
    mime,
    sha256: sha256(bytes),
    dataUri: "data:" + mime + ";base64," + bytes.toString("base64"),
  };
}

function assetFromBytes(relativePath, bytes, mime = "image/png", metadata = {}) {
  return {
    relativePath,
    bytes,
    mime,
    sha256: sha256(bytes),
    dataUri: "data:" + mime + ";base64," + bytes.toString("base64"),
    ...metadata,
  };
}

function imageTag(asset, x, y, width, height, extra = "") {
  return '<image x="' + x + '" y="' + y + '" width="' + width + '" height="' + height
    + '" preserveAspectRatio="xMidYMid meet" href="' + asset.dataUri + '" ' + extra + "/>";
}

function xmlHeader(width, height, attributes = "") {
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height
    + '" viewBox="0 0 ' + width + " " + height + '" ' + attributes + ">";
}

function commonStyle() {
  return `
  <style>
    .sans { font-family: Arial, "Noto Sans SC", "Microsoft YaHei", sans-serif; }
    .serif { font-family: Georgia, "Noto Serif SC", "Songti SC", serif; }
    .caps { font-family: Arial, "Noto Sans SC", "Microsoft YaHei", sans-serif; letter-spacing: 4px; }
  </style>`;
}

function buildDailySource(florist) {
  return `${xmlHeader(florist.width, florist.height, 'role="img" aria-labelledby="daily-source-title daily-source-desc" data-generation="revision-5-clean-room" data-contract-id="daily-low-saturation-source-v2" data-experiment-id="low-saturation-rain-editorial" data-artifact-role="source" data-source-for-experiment="low-saturation-rain-editorial" data-source-subject="florist-crosswalk" data-source-transform="saturation-only" data-saturation-scale="0.38" data-source-fidelity="byte-identical-embed" data-source-display="contain" data-face-redraw="none" data-crop="none" data-original-sha256="' + florist.sha256 + '"')}
  <title id="daily-source-title">Deterministically desaturated florist source / 花艺师确定性低饱和输入</title>
  <desc id="daily-source-desc">The existing florist-crosswalk PNG is embedded byte-identically and changed only by an SVG saturation matrix.</desc>
  <defs>
    <filter id="daily-saturation-only" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feColorMatrix type="saturate" values="0.38"/>
    </filter>
  </defs>
  ${imageTag(florist, 0, 0, florist.width, florist.height, 'filter="url(#daily-saturation-only)" data-role-id="complete-desaturated-source"')}
</svg>`;
}

function buildDailyEffect(dailySourceAsset) {
  return `${xmlHeader(1800, 2200, 'role="img" aria-labelledby="daily-effect-title daily-effect-desc" data-generation="revision-5-clean-room" data-contract-id="daily-low-saturation-editorial-v2" data-experiment-id="low-saturation-rain-editorial" data-artifact-role="effect" data-source-subject="florist-crosswalk" data-route="low-saturation-editorial" data-palette-id="cold-warm-rust-v1" data-color-role-count="3" data-source-fidelity="byte-identical" data-source-display="contain" data-face-redraw="none" data-crop="none" data-source-sha256="' + dailySourceAsset.sha256 + '"')}
  <title id="daily-effect-title">Low-saturation editorial layout / 低饱和编辑拼版</title>
  <desc id="daily-effect-desc">The complete desaturated florist source remains intact; three source-derived colour roles alone build the editorial rhythm.</desc>
  ${commonStyle()}
  <rect width="1800" height="2200" fill="#e9e0d2"/>
  <g data-role-id="cold-field" data-palette-id="cold-warm-rust-v1">
    <rect x="70" y="70" width="1660" height="2060" fill="#657b80"/>
    <path d="M985 70 H1730 V1420 L1210 1640 L985 1220 Z" fill="#7f9091"/>
  </g>
  <g data-role-id="warm-paper-field" data-palette-id="cold-warm-rust-v1">
    <path d="M70 70 H1100 L930 2130 H70 Z" fill="#e9e0d2"/>
    <rect x="1080" y="1580" width="650" height="550" fill="#d8c9b7"/>
  </g>
  <g data-role-id="rust-anchor" data-palette-id="cold-warm-rust-v1">
    <circle cx="1510" cy="430" r="116" fill="#944f43"/>
  </g>
  <g data-complete-source-window="true">
    <rect x="150" y="280" width="790" height="1350" fill="#f3ecdf" stroke="#283436" stroke-width="7"/>
    ${imageTag(dailySourceAsset, 175, 305, 740, 1110, 'data-role-id="complete-evidence-photo"')}
    <text x="180" y="1510" class="caps" font-size="22" fill="#283436">FULL LOW-SATURATION SOURCE / 完整低彩输入</text>
    <text x="180" y="1560" class="sans" font-size="22" fill="#4f5d5e">同一人物、同一构图、无面孔重画</text>
  </g>
  <text x="1080" y="810" class="serif" font-size="102" fill="#263133">雨季人物</text>
  <text x="1086" y="875" class="caps" font-size="24" fill="#263133">MUTED RAIN PORTRAIT</text>
  <text x="1080" y="1000" class="sans" font-size="29" fill="#263133">冷背景 / 暖纸面 / 锈红锚</text>
  <text x="1080" y="1050" class="sans" font-size="24" fill="#405052">几何场只组织节奏，人物事实只由完整照片承担。</text>
  <text x="150" y="2025" class="caps" font-size="23" fill="#263133">DETERMINISTIC SATURATION REDUCTION · NO FACE REDRAW</text>
</svg>`;
}

function buildDyyEffect(violinist) {
  return `${xmlHeader(1200, 1600, 'role="img" aria-labelledby="dyy-title dyy-desc" data-generation="revision-5-clean-room" data-contract-id="dyy-single-motion-five-mark-v2" data-experiment-id="single-motion-five-mark" data-artifact-role="effect" data-source-subject="last-train-violinist" data-route="single-motion-distillation" data-palette-id="violinist-motion-v1" data-source-sha256="' + violinist.sha256 + '" data-mark-budget="5" data-visible-text="0" data-photo-pixels="0" data-person-outline="none" data-crop="none"')}
  <title id="dyy-title">Five-mark single-motion distillation</title>
  <desc id="dyy-desc">A wordless, photo-free five-mark response to the controlled violinist source.</desc>
  <rect width="1200" height="1600" fill="#eee9df"/>
  <g data-mark="M1" data-role-id="torso-arc" aria-label="torso arc">
    <path d="M400 420 C520 520 580 685 555 850" fill="none" stroke="#a83d50" stroke-width="36" stroke-linecap="round"/>
  </g>
  <g data-mark="M2" data-role-id="stride-axis" aria-label="stride axis">
    <path d="M360 1130 L880 760" fill="none" stroke="#252b2b" stroke-width="27" stroke-linecap="round"/>
  </g>
  <g data-mark="M3" data-role-id="case-mass" aria-label="case mass">
    <path d="M650 540 C790 570 850 760 805 1000 L690 1075 L630 910 L665 700 Z" fill="#315f78"/>
  </g>
  <g data-mark="M4" data-role-id="scarf-trail" aria-label="scarf trail">
    <path d="M445 480 C655 300 840 300 1010 410" fill="none" stroke="#cba33a" stroke-width="32" stroke-linecap="round"/>
  </g>
  <g data-mark="M5" data-role-id="contact-point" aria-label="contact point">
    <circle cx="865" cy="785" r="42" fill="none" stroke="#a83d50" stroke-width="20"/>
  </g>
</svg>`;
}

function travelColumn(x, fill, label, id) {
  return `
  <g data-comparison-column="${id}" data-panel-lightness-role="${id}" data-source-subject="night-camera-shop" data-photo-count="1" data-panel-count="1" data-mark-set-id="shop-relations-v1" data-mark-count="4" transform="translate(${x} 250)">
    <rect width="700" height="1160" fill="#11171b" stroke="#ddd6ca" stroke-width="4"/>
    <text x="28" y="52" class="caps" font-size="20" fill="#eee7db">${label}</text>
    <rect x="28" y="82" width="644" height="760" fill="#0d1317" stroke="#ddd6ca" stroke-width="3"/>
    <use href="#travel-locked-source" x="40" y="94" width="620" height="736" preserveAspectRatio="xMidYMid meet" data-role-id="complete-source-photo"/>
    <g data-role-id="abstract-panel" transform="translate(28 870)">
      <rect width="644" height="245" fill="${fill}" stroke="#3a4142" stroke-width="3"/>
      <use href="#travel-shared-marks" width="644" height="245"/>
    </g>
  </g>`;
}

function buildTravelEffect(cameraShop) {
  return `${xmlHeader(2400, 1500, 'role="img" aria-labelledby="travel-title travel-desc" data-generation="revision-5-clean-room" data-contract-id="travel-night-contrast-three-column-v2" data-experiment-id="night-contrast-three-panel" data-artifact-role="effect" data-source-subject="night-camera-shop" data-comparison="three-panel-brightness" data-comparison-variable="panel-lightness-only" data-panel-count="3" data-source-embed-count="1" data-source-display-count="3" data-source-fidelity="byte-identical" data-source-display="contain" data-crop="none" data-source-sha256="' + cameraShop.sha256 + '"')}
  <title id="travel-title">Night scene and three pale-panel levels / 夜景与三档浅面板</title>
  <desc id="travel-desc">Three complete compositions reuse one byte-identical source and one mark symbol; only the equal-area panel fill changes.</desc>
  ${commonStyle()}
  <defs>
    <symbol id="travel-locked-source" viewBox="0 0 ${cameraShop.width} ${cameraShop.height}" preserveAspectRatio="xMidYMid meet">
      ${imageTag(cameraShop, 0, 0, cameraShop.width, cameraShop.height)}
    </symbol>
    <symbol id="travel-shared-marks" viewBox="0 0 644 245">
      <path data-role-id="street-axis" d="M45 190 L212 84 L390 122 L574 55" fill="none" stroke="#204c65" stroke-width="16"/>
      <rect data-role-id="warm-window" x="58" y="65" width="164" height="68" fill="#b86e4b"/>
      <rect data-role-id="shop-mass" x="310" y="96" width="130" height="100" fill="#6b6c6d"/>
      <circle data-role-id="umbrella-anchor" cx="548" cy="164" r="34" fill="#9e3543"/>
    </symbol>
  </defs>
  <rect width="2400" height="1500" fill="#20272d"/>
  <text x="80" y="105" class="serif" font-size="78" fill="#f5efe3">夜景高反差</text>
  <text x="84" y="158" class="caps" font-size="24" fill="#c8c8c0">NIGHT SOURCE × PALE PANEL ROLES</text>
  ${travelColumn(80, "#ded7ca", "WARM-LOW / 暖低", "warm-low")}
  ${travelColumn(850, "#eee7db", "IVORY-MID / 象牙中", "ivory-mid")}
  ${travelColumn(1620, "#faf5eb", "PAPER-HIGH / 纸白高", "paper-high")}
  <text x="80" y="1460" class="sans" font-size="22" fill="#d8d4cc">三列照片、面板面积与 mark 完全相同；只改变描述性纸面亮度角色，不声明跨设备测量值。</text>
</svg>`;
}

function gcMark(variant, index, role, shape) {
  return '<g data-mark="' + variant + index + '" data-role-id="' + role + '">' + shape + "</g>";
}

function gcVariant({ id, x, title, axis }) {
  const ink = "#252b2b";
  const blue = "#316f9f";
  const clay = "#88786d";
  const marks = axis === "vertical"
    ? [
      { role: "layout-axis", shape: '<path d="M300 185 V700" stroke="' + ink + '" stroke-width="19"/>' },
      { role: "blue-seed", shape: '<ellipse cx="330" cy="275" rx="29" ry="22" fill="' + blue + '"/>' },
      { role: "cracked-pot", shape: '<path d="M210 535 H410 L382 690 H238 Z" fill="' + clay + '"/>' },
      { role: "ceramic-fragments", shape: '<path d="M410 555 l42 20 -30 35 z M430 625 l36 28 -42 12 z" fill="' + clay + '"/>' },
      { role: "growth", shape: '<path d="M330 270 C330 235 350 205 382 185 M351 225 C382 215 403 225 420 247" fill="none" stroke="' + ink + '" stroke-width="11" stroke-linecap="round"/>' },
    ]
    : axis === "diagonal"
      ? [
        { role: "layout-axis", shape: '<path d="M105 695 L500 210" stroke="' + ink + '" stroke-width="19"/>' },
        { role: "blue-seed", shape: '<ellipse cx="420" cy="275" rx="29" ry="22" fill="' + blue + '" transform="rotate(-35 420 275)"/>' },
        { role: "cracked-pot", shape: '<path d="M175 540 L365 470 L392 625 L238 682 Z" fill="' + clay + '"/>' },
        { role: "ceramic-fragments", shape: '<path d="M385 475 l46 -2 -19 42 z M420 535 l43 8 -33 31 z" fill="' + clay + '"/>' },
        { role: "growth", shape: '<path d="M415 270 C438 238 466 220 500 210 M454 228 C480 230 498 244 510 266" fill="none" stroke="' + ink + '" stroke-width="11" stroke-linecap="round"/>' },
      ]
      : [
        { role: "layout-axis", shape: '<path d="M75 425 H525" stroke="' + ink + '" stroke-width="19"/>' },
        { role: "blue-seed", shape: '<ellipse cx="430" cy="390" rx="29" ry="22" fill="' + blue + '"/>' },
        { role: "cracked-pot", shape: '<path d="M170 520 H370 L342 675 H198 Z" fill="' + clay + '"/>' },
        { role: "ceramic-fragments", shape: '<path d="M380 530 l45 18 -28 34 z M415 602 l38 20 -39 18 z" fill="' + clay + '"/>' },
        { role: "growth", shape: '<path d="M425 386 C458 365 490 342 520 310 M475 350 C498 350 518 360 535 378" fill="none" stroke="' + ink + '" stroke-width="11" stroke-linecap="round"/>' },
      ];

  return `
  <g data-variant="${id}" data-axis="${axis}" data-palette-id="blue-seed-palette-v1" data-source-subject="blue-seed-cracked-pot" data-mark-budget="5" data-blue-anchor-count="1" data-fragment-set-count="1" transform="translate(${x} 290)">
    <rect width="600" height="900" fill="#eee7d9" stroke="#252b2b" stroke-width="5"/>
    <rect width="600" height="900" fill="url(#gc-paper-texture)" opacity=".22"/>
    ${marks.map(({ role, shape }, index) => gcMark(id, index + 1, role, shape)).join("\n    ")}
    <text x="48" y="88" class="serif" font-size="48" fill="#252b2b">蓝色种子</text>
    <text x="50" y="126" class="caps" font-size="15" fill="#252b2b">THE BLUE SEED</text>
    <text x="48" y="770" class="sans" font-size="19" fill="#252b2b">温室停电后的清晨，</text>
    <text x="48" y="804" class="sans" font-size="19" fill="#252b2b">她把最后一粒蓝色种子</text>
    <text x="48" y="838" class="sans" font-size="19" fill="#252b2b">放进裂开的陶盆。</text>
    <text x="48" y="873" class="caps" font-size="15" fill="#252b2b">${title}</text>
  </g>`;
}

function buildGcEffect() {
  return `${xmlHeader(2200, 1400, 'role="img" aria-labelledby="gc-title gc-desc" data-generation="revision-5-clean-room" data-contract-id="gc-blue-seed-equal-budget-v2" data-experiment-id="equal-budget-three-layouts" data-artifact-role="effect" data-source-subject="blue-seed-cracked-pot" data-comparison="equal-budget-three-variants" data-variant-count="3" data-mark-budget-per-variant="5" data-palette-id="blue-seed-palette-v1" data-texture-budget="same" data-axis-set="horizontal vertical diagonal" data-source-kind="text-only" data-lettering="deterministic-svg-text"')}
  <title id="gc-title">Blue seed in three equal-budget poster axes / 蓝色种子的三种等预算版式轴</title>
  <desc id="gc-desc">Three complete 2:3 posters share one text, palette, texture and five semantic marks; only the spatial axis changes.</desc>
  ${commonStyle()}
  <defs>
    <pattern id="gc-paper-texture" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="4" r="1.2" fill="#756f68"/>
    </pattern>
  </defs>
  <rect width="2200" height="1450" fill="#242525"/>
  <text x="110" y="105" class="serif" font-size="72" fill="#f0e9dd">蓝色种子的三种停顿</text>
  <text x="114" y="158" class="caps" font-size="22" fill="#c6c1b8">SAME TEXT · SAME FIVE MARKS · SAME PALETTE · AXIS ONLY</text>
  <text x="110" y="222" class="sans" font-size="22" fill="#c6c1b8">“温室停电后的清晨，成年女植物学家把最后一粒蓝色种子放进裂开的陶盆。”</text>
  ${gcVariant({ id: "A", x: 110, title: "A · HORIZONTAL / 水平门槛", axis: "horizontal" })}
  ${gcVariant({ id: "B", x: 800, title: "B · VERTICAL / 垂直生长", axis: "vertical" })}
  ${gcVariant({ id: "C", x: 1490, title: "C · DIAGONAL / 对角分离", axis: "diagonal" })}
  <text x="110" y="1325" class="sans" font-size="21" fill="#c6c1b8">蓝色种子是每版唯一高彩锚；其余均为同一暖纸、墨色与低彩陶土。等预算不代表审美偏好。</text>
</svg>`;
}

function buildSnowEffect(snowfield) {
  return `${xmlHeader(1400, 1900, 'role="img" aria-labelledby="snow-title snow-desc" data-generation="revision-5-clean-room" data-contract-id="scene-distill-empty-snow-three-role-v2" data-experiment-id="empty-snowfield-tension" data-artifact-role="effect" data-source-subject="empty-snowfield-measurement" data-route="three-role-empty-field" data-palette-id="snow-violet-graphite-acid-v1" data-role-count="3" data-unmarked-paper-contract="at-least-85-percent" data-visible-text="0" data-photo-pixels="0" data-source-embed-count="0" data-person-shape="none" data-place-outline="none" data-source-sha256="' + snowfield.sha256 + '"')}
  <title id="snow-title">Three-role snowfield distillation / 空旷雪地三角色蒸馏</title>
  <desc id="snow-desc">Only a pale-violet wind band, a graphite interval and an acid-green breach interrupt the warm paper.</desc>
  <rect width="1400" height="1900" fill="#f3efe6"/>
  <g data-role="wind" data-role-id="pale-violet-wind-band">
    <path d="M210 880 C430 730 710 735 930 860" fill="none" stroke="#b9abc7" stroke-width="58" stroke-linecap="round"/>
  </g>
  <g data-role="interval" data-role-id="graphite-interval">
    <path d="M970 835 H1090 M1160 835 H1260" fill="none" stroke="#3f4444" stroke-width="24" stroke-linecap="square"/>
  </g>
  <g data-role="breach" data-role-id="acid-green-breach">
    <path d="M1110 792 L1160 835 L1110 878 Z" fill="#c7df39"/>
  </g>
</svg>`;
}

async function buildSeasonMemberAssets(seasonSeed) {
  let sharp;
  try {
    const sharpModule = await import("sharp");
    sharp = sharpModule.default ?? sharpModule;
  } catch (error) {
    throw new Error("Revision 5 season-member generation requires the build-time-only sharp package. No outputs were written. " + error.message);
  }

  sharp.cache(false);
  const expectedBoard = { width: 1024, height: 1536 };
  const memberSize = { width: 512, height: 768 };
  if (seasonSeed.width !== expectedBoard.width || seasonSeed.height !== expectedBoard.height) {
    throw new Error(
      "Season source board must be exactly 1024x1536 for a lossless 2x2 split; received "
      + seasonSeed.width + "x" + seasonSeed.height + ".",
    );
  }

  const specs = [
    { season: "spring", relativePath: outputPaths.seasonSpring, quadrant: { left: 0, top: 0, ...memberSize } },
    { season: "summer", relativePath: outputPaths.seasonSummer, quadrant: { left: 512, top: 0, ...memberSize } },
    { season: "autumn", relativePath: outputPaths.seasonAutumn, quadrant: { left: 0, top: 768, ...memberSize } },
    { season: "winter", relativePath: outputPaths.seasonWinter, quadrant: { left: 512, top: 768, ...memberSize } },
  ];

  const boardDecoded = await sharp(seasonSeed.bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (boardDecoded.info.width !== expectedBoard.width
    || boardDecoded.info.height !== expectedBoard.height
    || boardDecoded.info.channels !== 4) {
    throw new Error("Season source board did not decode to the expected 1024x1536 RGBA pixel plane.");
  }

  const members = [];
  const decodedMembers = [];
  for (const spec of specs) {
    const bytes = await sharp(seasonSeed.bytes)
      .extract(spec.quadrant)
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false, force: true })
      .toBuffer();
    const encodedDimensions = dimensionsForPng(bytes, spec.relativePath);
    if (encodedDimensions.width !== memberSize.width || encodedDimensions.height !== memberSize.height) {
      throw new Error(spec.relativePath + " is not the required 512x768 member PNG.");
    }
    const decoded = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (decoded.info.width !== memberSize.width
      || decoded.info.height !== memberSize.height
      || decoded.info.channels !== 4) {
      throw new Error(spec.relativePath + " did not round-trip as a 512x768 RGBA member.");
    }
    const asset = assetFromBytes(spec.relativePath, bytes, "image/png", {
      width: memberSize.width,
      height: memberSize.height,
      season: spec.season,
      quadrant: spec.quadrant,
      pixelSha256: sha256(decoded.data),
    });
    members.push(asset);
    decodedMembers.push({ spec, data: decoded.data });
  }

  const recomposed = Buffer.alloc(boardDecoded.data.length);
  const channels = 4;
  for (const { spec, data } of decodedMembers) {
    const { left, top, width, height } = spec.quadrant;
    for (let row = 0; row < height; row += 1) {
      const sourceStart = row * width * channels;
      const destinationStart = ((top + row) * expectedBoard.width + left) * channels;
      data.copy(recomposed, destinationStart, sourceStart, sourceStart + width * channels);
    }
  }
  if (!recomposed.equals(boardDecoded.data)) {
    throw new Error("The four generated season members do not pixel-recompose to the source board.");
  }

  const memberPixelHashes = members.map((member) => member.pixelSha256);
  if (new Set(memberPixelHashes).size !== members.length) {
    throw new Error("The four generated season members must have distinct pixel hashes.");
  }

  const boardPixelSha256 = sha256(boardDecoded.data);
  const recomposedPixelSha256 = sha256(recomposed);
  const manifest = {
    contractId: "season-seed-library-exact-quadrants-v1",
    experimentId: "four-season-same-place",
    artifactRole: "source-member-manifest",
    disclosure: "Deterministic exact-quadrant split of one 2x2 composite board; not four independent captures.",
    splitMethod: "exact-pixel-quadrants",
    sourceBoard: {
      path: paths.seasonSeed,
      width: seasonSeed.width,
      height: seasonSeed.height,
      sha256: seasonSeed.sha256,
      pixelSha256: boardPixelSha256,
    },
    members: members.map((member) => ({
      season: member.season,
      path: member.relativePath,
      width: member.width,
      height: member.height,
      quadrant: member.quadrant,
      sha256: member.sha256,
      pixelSha256: member.pixelSha256,
    })),
    validation: {
      recomposedPixelSha256,
      pixelIdenticalToSourceBoard: recomposedPixelSha256 === boardPixelSha256,
      distinctMemberPixelHashCount: new Set(memberPixelHashes).size,
    },
  };

  return {
    members,
    manifest,
    manifestText: JSON.stringify(manifest, null, 2) + "\n",
    boardPixelSha256,
    recomposedPixelSha256,
  };
}

function seasonMember({ x, label, cn, paperPattern, index, asset, quadrant, boardSha256, boardPixelSha256 }) {
  const quadrantValue = [quadrant.left, quadrant.top, quadrant.width, quadrant.height].join(",");
  return `
  <g data-series-member="${index}" data-season="${label.toLowerCase()}" data-source-subject="seed-library" data-complete-member="true" data-member-kind="deterministic-quadrant" data-source-quadrant="${quadrantValue}" data-source-board-sha256="${boardSha256}" data-source-board-pixel-sha256="${boardPixelSha256}" data-member-sha256="${asset.sha256}" data-member-pixel-sha256="${asset.pixelSha256}" data-paper-field="${paperPattern}" transform="translate(${x} 300)">
    <rect width="430" height="1260" fill="#efe9dd" stroke="#253239" stroke-width="4"/>
    <rect x="18" y="18" width="394" height="1224" fill="url(#${paperPattern})"/>
    <rect x="24" y="24" width="382" height="582" fill="#d8d3c8" stroke="#253239" stroke-width="3"/>
    ${imageTag(asset, 30, 30, 370, 570, 'data-role-id="complete-season-photo" data-member-display="full-meet" data-crop="none"')}
    <text x="38" y="700" class="serif" font-size="64" fill="#253239">${cn}</text>
    <text x="40" y="750" class="caps" font-size="19" fill="#253239">${label}</text>
    <path d="M40 815 H390" stroke="#586267" stroke-width="3"/>
    <text x="40" y="900" class="sans" font-size="21" fill="#3e494d">同一拱顶 / 同一门轴</text>
    <text x="40" y="940" class="sans" font-size="21" fill="#3e494d">同一海边观察方向</text>
    <text x="40" y="1190" class="caps" font-size="17" fill="#253239">COMPLETE MEMBER / 完整成员</text>
  </g>`;
}

function buildSeasonEffect(seasonSeed, seasonSplit) {
  const structureColor = "#315d78";
  const [spring, summer, autumn, winter] = seasonSplit.members;
  return `${xmlHeader(2400, 1800, 'role="img" aria-labelledby="season-title season-desc" data-generation="revision-5-clean-room" data-contract-id="scenes-four-season-same-place-v3" data-experiment-id="four-season-same-place" data-artifact-role="effect" data-source-subject="seed-library-four-season-board" data-route="four-season-series" data-series-count="4" data-member-extraction="deterministic-exact-quadrants" data-source-disclosure="one-2x2-composite-board-not-four-independent-captures" data-member-manifest="season-seed-library-members.manifest.json" data-source-embed-count="4" data-source-display-count="4" data-palette-id="season-paper-cobalt-v1" data-structural-color="' + structureColor + '" data-structural-color-count="1" data-source-fidelity="pixel-identical-quadrants" data-source-display="contain" data-crop="none" data-source-sha256="' + seasonSeed.sha256 + '" data-source-pixel-sha256="' + seasonSplit.boardPixelSha256 + '" data-recomposed-pixel-sha256="' + seasonSplit.recomposedPixelSha256 + '"')}
  <title id="season-title">Four-season series with one structural colour / 四季系列与单一结构连接色</title>
  <desc id="season-desc">A deterministic exact-quadrant split of one 2x2 composite board creates four complete members; these are not presented as four independent captures.</desc>
  ${commonStyle()}
  <defs>
    <pattern id="paper-spring" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="5" cy="7" r="1.2" fill="#9ca89c"/></pattern>
    <pattern id="paper-summer" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 24 L24 0" stroke="#9aa7a2" stroke-width="1"/></pattern>
    <pattern id="paper-autumn" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="1.5" fill="#a69580"/></pattern>
    <pattern id="paper-winter" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M12 5 V19 M5 12 H19" stroke="#aab2b5" stroke-width="1"/></pattern>
  </defs>
  <rect width="2400" height="1800" fill="#ded8cc"/>
  <text x="80" y="105" class="serif" font-size="72" fill="#253239">四季同地点</text>
  <text x="84" y="158" class="caps" font-size="22" fill="#4c5a60">FOUR COMPLETE MEMBERS · ONE 2×2 COMPOSITE SOURCE</text>
  <path data-structure-connector="one" data-role-id="cobalt-series-band" data-palette-id="season-paper-cobalt-v1" d="M100 240 H2290 V1630 H100 Z" fill="none" stroke="${structureColor}" stroke-width="18"/>
  ${seasonMember({ x: 140, label: "SPRING", cn: "春", paperPattern: "paper-spring", index: "01", asset: spring, quadrant: spring.quadrant, boardSha256: seasonSeed.sha256, boardPixelSha256: seasonSplit.boardPixelSha256 })}
  ${seasonMember({ x: 690, label: "SUMMER", cn: "夏", paperPattern: "paper-summer", index: "02", asset: summer, quadrant: summer.quadrant, boardSha256: seasonSeed.sha256, boardPixelSha256: seasonSplit.boardPixelSha256 })}
  ${seasonMember({ x: 1240, label: "AUTUMN", cn: "秋", paperPattern: "paper-autumn", index: "03", asset: autumn, quadrant: autumn.quadrant, boardSha256: seasonSeed.sha256, boardPixelSha256: seasonSplit.boardPixelSha256 })}
  ${seasonMember({ x: 1790, label: "WINTER", cn: "冬", paperPattern: "paper-winter", index: "04", asset: winter, quadrant: winter.quadrant, boardSha256: seasonSeed.sha256, boardPixelSha256: seasonSplit.boardPixelSha256 })}
  <text x="140" y="1698" class="sans" font-size="22" fill="#253239">同一合成 2×2 板的确定性四格拆分；不是四次独立拍摄。</text>
  <text x="140" y="1738" class="sans" font-size="19" fill="#4c5a60">四格均完整显示；钴蓝只连接结构，季节纸纹只在照片外变化。</text>
</svg>`;
}

function buildPostcardSourceBoard(sources) {
  const [cinema, bridge, market] = sources;
  const cards = [
    { asset: cinema, x: 90, label: "CINEMA / 影院", subject: "north-harbor-cinema" },
    { asset: bridge, x: 835, label: "BRIDGE / 桥影", subject: "north-harbor-bridge" },
    { asset: market, x: 1580, label: "MARKET / 闭市", subject: "north-harbor-market" },
  ];
  return `${xmlHeader(2400, 1500, 'role="img" aria-labelledby="postcard-source-title postcard-source-desc" data-generation="revision-5-clean-room" data-contract-id="postcard-three-source-board-v2" data-experiment-id="north-harbor-three-card-series" data-artifact-role="source-board" data-source-for-experiment="north-harbor-three-card-series" data-source-subject="north-harbor-cinema bridge market" data-source-board="three-complete-local-studies" data-source-count="3" data-source-fidelity="byte-identical" data-source-display="contain" data-crop="none" data-source-1-sha256="' + cinema.sha256 + '" data-source-2-sha256="' + bridge.sha256 + '" data-source-3-sha256="' + market.sha256 + '"')}
  <title id="postcard-source-title">North Harbor three-source board / 北港三张完整输入板</title>
  <desc id="postcard-source-desc">Three existing local-study source images are embedded byte-identically and shown without crop.</desc>
  ${commonStyle()}
  <rect width="2400" height="1500" fill="#252b2e"/>
  <text x="90" y="105" class="serif" font-size="74" fill="#f1e9dc">北港旅行套系 · 三张完整输入</text>
  <text x="94" y="160" class="caps" font-size="22" fill="#bbbcb7">NORTH HARBOR · COMPLETE SOURCE BOARD</text>
  ${cards.map(({ asset, x, label, subject }, index) => `
  <g data-source-member="${String(index + 1).padStart(2, "0")}" data-source-subject="${subject}" data-complete-source="true" transform="translate(${x} 240)">
    <rect width="650" height="1110" fill="#ded8cd" stroke="#f1e9dc" stroke-width="4"/>
    ${imageTag(asset, 20, 20, 610, 970, 'data-role-id="complete-source-photo"')}
    <text x="24" y="1045" class="caps" font-size="20" fill="#252b2e">${label}</text>
    <text x="24" y="1080" class="sans" font-size="18" fill="#4d5658">FULL FRAME / 完整画幅</text>
  </g>`).join("\n")}
  <text x="90" y="1435" class="sans" font-size="21" fill="#bbbcb7">LOCAL STUDY SOURCES · 仅作为本地研究套系输入，不代表真实地点。</text>
</svg>`;
}

function postcardBack({ x, y, title, code }) {
  return `
  <g data-side="back" data-aspect-ratio="2:3" data-back-grid-id="postcard-back-grid-v1" data-complete-surface="true" transform="translate(${x} ${y})">
    <use href="#postcard-back-grid-v1" width="600" height="900"/>
    <text x="42" y="800" class="serif" font-size="38" fill="#242b2d">${title}</text>
    <text x="44" y="838" class="caps" font-size="15" fill="#555d5e">NORTH HARBOR / ${code}</text>
    <text x="44" y="872" class="sans" font-size="15" fill="#555d5e">DIGITAL STUDY · 非实体打样</text>
  </g>`;
}

function postcardSet({ asset, y, title, cn, code, index, subject, paletteId, swatches, mainMotif, supportMotif }) {
  return `
  <g data-product-set="${index}" data-source-subject="${subject}" data-product-completeness="front-back" data-palette-id="${paletteId}" data-motif-count="1" data-support-motif-count="1" data-swatch-count="3" data-back-grid-id="postcard-back-grid-v1">
    <text x="120" y="${y - 35}" class="caps" font-size="22" fill="#efeadf">SET ${index} · ${title} / ${cn}</text>
    <g data-side="front" data-aspect-ratio="2:3" data-complete-surface="true" transform="translate(120 ${y})">
      <rect width="600" height="900" fill="#171d20" stroke="#efeadf" stroke-width="5"/>
      <rect x="28" y="28" width="544" height="520" fill="#0d1214" stroke="#efeadf" stroke-width="3"/>
      ${imageTag(asset, 38, 38, 524, 500, 'data-role-id="complete-source-photo"')}
      <text x="36" y="600" class="serif" font-size="38" fill="#f2ebdf">${cn}</text>
      <text x="38" y="632" class="caps" font-size="14" fill="#c7c2b9">${title} · FRONT / 正面</text>
      <g data-role-id="main-motif" data-motif-id="${subject}-main">
        ${mainMotif}
      </g>
      <g data-role-id="support-motif" data-motif-id="${subject}-support">
        ${supportMotif}
      </g>
      <g data-role-id="source-color-swatches" data-swatch-count="3">
        ${swatches.map((color, swatchIndex) => '<rect data-source-swatch="' + (swatchIndex + 1) + '" x="' + (36 + swatchIndex * 72) + '" y="826" width="54" height="34" fill="' + color + '"/>').join("")}
      </g>
    </g>
    ${postcardBack({ x: 1180, y, title: cn, code })}
  </g>`;
}

function buildPostcardEffect(sources) {
  const [cinema, bridge, market] = sources;
  return `${xmlHeader(2500, 3500, 'role="img" aria-labelledby="postcard-effect-title postcard-effect-desc" data-generation="revision-5-clean-room" data-contract-id="postcard-three-card-product-family-v2" data-experiment-id="north-harbor-three-card-series" data-artifact-role="effect" data-source-subject="north-harbor-cinema bridge market" data-product="three-card-series" data-template-aspect-ratio="2:3" data-set-count="3" data-side-count="6" data-motif-count-per-front="1" data-support-motif-max-per-front="1" data-swatch-count-per-front="3" data-shared-back-grid-id="postcard-back-grid-v1" data-source-fidelity="byte-identical" data-source-display="contain" data-crop="none" data-physical-proof="not-claimed" data-source-1-sha256="' + cinema.sha256 + '" data-source-2-sha256="' + bridge.sha256 + '" data-source-3-sha256="' + market.sha256 + '"')}
  <title id="postcard-effect-title">North Harbor three-card front-and-back series / 北港三套完整正反面产品</title>
  <desc id="postcard-effect-desc">Three 2:3 digital postcard concepts each include a full source, one main motif, one support motif, three source-role swatches and an identical functional back grid.</desc>
  ${commonStyle()}
  <defs>
    <symbol id="postcard-back-grid-v1" viewBox="0 0 600 900">
      <rect width="600" height="900" fill="#f1eadc" stroke="#242b2d" stroke-width="5"/>
      <line x1="300" y1="48" x2="300" y2="755" stroke="#7c817f" stroke-width="3"/>
      <rect x="438" y="52" width="112" height="132" fill="none" stroke="#315d78" stroke-width="5"/>
      <text x="494" y="123" text-anchor="middle" class="caps" font-size="14" fill="#315d78">STAMP</text>
      <path d="M340 290 H550 M340 350 H550 M340 410 H550 M340 470 H550" stroke="#7c817f" stroke-width="3"/>
      <path d="M48 205 H255 M48 270 H255 M48 335 H255 M48 400 H255 M48 465 H255 M48 530 H255 M48 595 H255" stroke="#a3a5a0" stroke-width="2"/>
      <circle cx="112" cy="112" r="54" fill="none" stroke="#315d78" stroke-width="10"/>
      <path d="M75 112 H149 M112 75 V149" stroke="#315d78" stroke-width="7"/>
      <text x="48" y="690" class="caps" font-size="14" fill="#555d5e">MESSAGE / 留言</text>
      <text x="340" y="245" class="caps" font-size="14" fill="#555d5e">ADDRESS / 地址</text>
    </symbol>
  </defs>
  <rect width="2500" height="3500" fill="#242b2d"/>
  <text x="120" y="105" class="serif" font-size="72" fill="#f0e9de">北港旅行明信片套系</text>
  <text x="124" y="160" class="caps" font-size="22" fill="#c4c1ba">THREE COMPLETE PRODUCTS · FRONT + BACK</text>
  <text x="1180" y="160" class="sans" font-size="22" fill="#c4c1ba">统一背面网格 · 每张一个主元素 · 至多一个辅元素 · 三枚来源色卡</text>
  ${postcardSet({
    asset: cinema, y: 300, title: "CINEMA", cn: "雨幕旧影院", code: "NH-01", index: "01",
    subject: "north-harbor-cinema", paletteId: "cinema-source-roles-v1",
    swatches: ["#27292b", "#91493f", "#d7c8b6"],
    mainMotif: '<path d="M70 770 Q300 625 530 770" fill="none" stroke="#91493f" stroke-width="20" stroke-linecap="round"/>',
    supportMotif: '<circle cx="300" cy="700" r="22" fill="none" stroke="#d7c8b6" stroke-width="10"/>',
  })}
  ${postcardSet({
    asset: bridge, y: 1370, title: "BRIDGE", cn: "桥影过河", code: "NH-02", index: "02",
    subject: "north-harbor-bridge", paletteId: "bridge-source-roles-v1",
    swatches: ["#253238", "#32657a", "#c7b9a6"],
    mainMotif: '<path d="M72 772 C170 640 430 640 528 772" fill="none" stroke="#32657a" stroke-width="20" stroke-linecap="round"/>',
    supportMotif: '<circle cx="105" cy="700" r="22" fill="none" stroke="#c7b9a6" stroke-width="10"/>',
  })}
  ${postcardSet({
    asset: market, y: 2440, title: "MARKET", cn: "闭市长廊", code: "NH-03", index: "03",
    subject: "north-harbor-market", paletteId: "market-source-roles-v1",
    swatches: ["#253133", "#447b79", "#d4c4a7"],
    mainMotif: '<path d="M70 690 Q135 640 200 690 T330 690 T460 690 T530 690 V775 H70 Z" fill="none" stroke="#447b79" stroke-width="18" stroke-linejoin="round"/>',
    supportMotif: '<circle cx="300" cy="760" r="22" fill="none" stroke="#d4c4a7" stroke-width="10"/>',
  })}
  <text x="120" y="3435" class="sans" font-size="21" fill="#c4c1ba">三套均为 2:3 完整正反面；不声明纸张、裁切、油墨、邮资或邮寄测试。</text>
</svg>`;
}

function countMatches(source, pattern) {
  return (source.match(pattern) ?? []).length;
}

function validateSvg({ relativePath, svg, width, height, exactEmbeds = [], rootAttributes = {}, contracts = {} }) {
  const rootMatch = svg.match(/<svg\b([^>]*)>/);
  if (!rootMatch) throw new Error(relativePath + " does not contain an SVG root.");
  const root = rootMatch[1];
  if (!new RegExp('\\bwidth="' + width + '"').test(root)
    || !new RegExp('\\bheight="' + height + '"').test(root)
    || !new RegExp('\\bviewBox="0 0 ' + width + " " + height + '"').test(root)) {
    throw new Error(relativePath + " does not expose the expected dimensions and viewBox.");
  }
  if (!/data-generation="revision-5-clean-room"/.test(root)) {
    throw new Error(relativePath + " is missing the Revision 5 generation contract.");
  }
  for (const [name, value] of Object.entries(rootAttributes)) {
    if (!root.includes(" " + name + '="' + value + '"')) {
      throw new Error(relativePath + " is missing semantic root attribute " + name + '="' + value + '".');
    }
  }

  const hrefs = [...svg.matchAll(/\b(?:href|xlink:href)="([^"]+)"/g)].map((match) => match[1]);
  const externalHrefs = hrefs.filter((href) => !href.startsWith("data:") && !href.startsWith("#"));
  if (externalHrefs.length > 0) {
    throw new Error(relativePath + " contains external hrefs: " + externalHrefs.join(", "));
  }
  if (/preserveAspectRatio="xMidYMid slice"/.test(svg)) {
    throw new Error(relativePath + " contains a cropping image mode.");
  }
  if (relativePath === outputPaths.dyyEffect) {
    const marks = svg.match(/\bdata-mark="M[1-5]"/g) ?? [];
    if (marks.length !== 5) throw new Error("DYY effect must expose exactly five marks.");
    if (/<image\b/i.test(svg)) throw new Error("DYY effect must contain zero photo/image pixels.");
    if (/<text\b/i.test(svg)) throw new Error("DYY effect must contain no visible text elements.");
  }
  if (relativePath === outputPaths.gcEffect) {
    for (const variant of ["A", "B", "C"]) {
      const marks = svg.match(new RegExp('data-mark="' + variant + '[1-5]"', "g")) ?? [];
      if (marks.length !== 5) throw new Error("GC variant " + variant + " must expose five marks.");
    }
  }
  if (relativePath === outputPaths.snowEffect) {
    if (/<image\b/i.test(svg) || /data:image\//i.test(svg)) {
      throw new Error("Snow effect must contain zero photo/image pixels.");
    }
    if (/<text\b/i.test(svg)) throw new Error("Snow effect must contain no visible text elements.");
    if (/#[aA]44a4e|#[aA]83d50|#[bB]3483e/.test(svg)) {
      throw new Error("Snow effect must not contain the prior red figure palette.");
    }
  }

  const embeddedHrefs = hrefs.filter((href) => href.startsWith("data:image/"));
  if (embeddedHrefs.length !== exactEmbeds.length) {
    throw new Error(relativePath + " expected " + exactEmbeds.length + " embedded images but found " + embeddedHrefs.length + ".");
  }
  embeddedHrefs.forEach((href, index) => {
    const separator = href.indexOf(";base64,");
    if (separator < 0) throw new Error(relativePath + " contains a non-base64 embedded image.");
    const embeddedBytes = Buffer.from(href.slice(separator + ";base64,".length), "base64");
    if (!embeddedBytes.equals(exactEmbeds[index].bytes)) {
      throw new Error(relativePath + " embedded image " + (index + 1) + " differs from " + exactEmbeds[index].relativePath + ".");
    }
  });

  for (const [label, contract] of Object.entries(contracts)) {
    const actual = countMatches(svg, contract.pattern);
    if (actual !== contract.count) {
      throw new Error(relativePath + " expected " + contract.count + " " + label + " markers but found " + actual + ".");
    }
  }

  return {
    relativePath,
    bytes: Buffer.byteLength(svg, "utf8"),
    dimensions: width + "x" + height,
    embeddedImageCount: embeddedHrefs.length,
    byteIdenticalEmbedCount: exactEmbeds.length,
    semanticRootAttributes: rootAttributes,
    contractCounts: Object.fromEntries(
      Object.entries(contracts).map(([label, contract]) => [label, contract.count]),
    ),
    externalHrefCount: 0,
    cropModeCount: 0,
    sha256: sha256(Buffer.from(svg, "utf8")),
  };
}

const requiredInputs = Object.values(paths);
const missingInputs = [];
for (const relativePath of requiredInputs) {
  try {
    await access(absolute(relativePath));
  } catch {
    missingInputs.push(relativePath);
  }
}

if (missingInputs.length > 0) {
  console.error(JSON.stringify({
    status: "waiting-for-inputs",
    message: "No Revision 5 SVG outputs were written. Add the missing controlled sources and run this script again.",
    missingInputs,
  }, null, 2));
  process.exit(2);
}

const [
  florist,
  violinist,
  cameraShop,
  snowfield,
  seasonSeed,
  cinema,
  bridge,
  market,
] = await Promise.all([
  loadAsset(paths.florist),
  loadAsset(paths.violinist),
  loadAsset(paths.cameraShop),
  loadAsset(paths.snowfield),
  loadAsset(paths.seasonSeed),
  loadAsset(paths.cinema),
  loadAsset(paths.bridge),
  loadAsset(paths.market),
]);

const dailySourceSvg = buildDailySource(florist);
const dailySourceAsset = assetFromText(outputPaths.dailySource, dailySourceSvg);
const seasonSplit = await buildSeasonMemberAssets(seasonSeed);
const outputs = [
  {
    relativePath: outputPaths.dailySource,
    svg: dailySourceSvg,
    width: florist.width,
    height: florist.height,
    exactEmbeds: [florist],
    rootAttributes: {
      "data-contract-id": "daily-low-saturation-source-v2",
      "data-experiment-id": "low-saturation-rain-editorial",
      "data-artifact-role": "source",
      "data-source-for-experiment": "low-saturation-rain-editorial",
      "data-source-subject": "florist-crosswalk",
      "data-source-transform": "saturation-only",
    },
    contracts: {
      saturationMatrix: { pattern: /<feColorMatrix type="saturate" values="0\.38"\/>/g, count: 1 },
      completeDesaturatedSource: { pattern: /data-role-id="complete-desaturated-source"/g, count: 1 },
    },
  },
  {
    relativePath: outputPaths.dailyEffect,
    svg: buildDailyEffect(dailySourceAsset),
    width: 1800,
    height: 2200,
    exactEmbeds: [dailySourceAsset],
    rootAttributes: {
      "data-contract-id": "daily-low-saturation-editorial-v2",
      "data-experiment-id": "low-saturation-rain-editorial",
      "data-artifact-role": "effect",
      "data-source-subject": "florist-crosswalk",
      "data-palette-id": "cold-warm-rust-v1",
      "data-face-redraw": "none",
    },
    contracts: {
      completeSourceWindows: { pattern: /data-complete-source-window="true"/g, count: 1 },
      coldField: { pattern: /data-role-id="cold-field"/g, count: 1 },
      warmPaperField: { pattern: /data-role-id="warm-paper-field"/g, count: 1 },
      rustAnchor: { pattern: /data-role-id="rust-anchor"/g, count: 1 },
      completeEvidencePhoto: { pattern: /data-role-id="complete-evidence-photo"/g, count: 1 },
    },
  },
  {
    relativePath: outputPaths.dyyEffect,
    svg: buildDyyEffect(violinist),
    width: 1200,
    height: 1600,
    rootAttributes: {
      "data-contract-id": "dyy-single-motion-five-mark-v2",
      "data-experiment-id": "single-motion-five-mark",
      "data-artifact-role": "effect",
      "data-source-subject": "last-train-violinist",
      "data-mark-budget": "5",
    },
    contracts: {
      marks: { pattern: /data-mark="M[1-5]"/g, count: 5 },
      torsoArc: { pattern: /data-role-id="torso-arc"/g, count: 1 },
      strideAxis: { pattern: /data-role-id="stride-axis"/g, count: 1 },
      caseMass: { pattern: /data-role-id="case-mass"/g, count: 1 },
      scarfTrail: { pattern: /data-role-id="scarf-trail"/g, count: 1 },
      contactPoint: { pattern: /data-role-id="contact-point"/g, count: 1 },
    },
  },
  {
    relativePath: outputPaths.travelEffect,
    svg: buildTravelEffect(cameraShop),
    width: 2400,
    height: 1500,
    exactEmbeds: [cameraShop],
    rootAttributes: {
      "data-contract-id": "travel-night-contrast-three-column-v2",
      "data-experiment-id": "night-contrast-three-panel",
      "data-artifact-role": "effect",
      "data-source-subject": "night-camera-shop",
      "data-comparison-variable": "panel-lightness-only",
      "data-source-display-count": "3",
    },
    contracts: {
      comparisonColumns: { pattern: /data-comparison-column="(?:warm-low|ivory-mid|paper-high)"/g, count: 3 },
      completeSourcePhotos: { pattern: /data-role-id="complete-source-photo"/g, count: 3 },
      sharedMarkSetUses: { pattern: /data-mark-set-id="shop-relations-v1"/g, count: 3 },
      sharedStreetAxis: { pattern: /data-role-id="street-axis"/g, count: 1 },
      sharedWarmWindow: { pattern: /data-role-id="warm-window"/g, count: 1 },
      sharedShopMass: { pattern: /data-role-id="shop-mass"/g, count: 1 },
      sharedUmbrellaAnchor: { pattern: /data-role-id="umbrella-anchor"/g, count: 1 },
    },
  },
  {
    relativePath: outputPaths.gcEffect,
    svg: buildGcEffect(),
    width: 2200,
    height: 1400,
    rootAttributes: {
      "data-contract-id": "gc-blue-seed-equal-budget-v2",
      "data-experiment-id": "equal-budget-three-layouts",
      "data-artifact-role": "effect",
      "data-source-subject": "blue-seed-cracked-pot",
      "data-palette-id": "blue-seed-palette-v1",
      "data-mark-budget-per-variant": "5",
      "data-axis-set": "horizontal vertical diagonal",
    },
    contracts: {
      variants: { pattern: /data-variant="[ABC]"/g, count: 3 },
      equalBudgets: { pattern: /data-mark-budget="5"/g, count: 3 },
      marks: { pattern: /data-mark="[ABC][1-5]"/g, count: 15 },
      horizontalAxis: { pattern: /data-axis="horizontal"/g, count: 1 },
      verticalAxis: { pattern: /data-axis="vertical"/g, count: 1 },
      diagonalAxis: { pattern: /data-axis="diagonal"/g, count: 1 },
      blueSeedRoles: { pattern: /data-role-id="blue-seed"/g, count: 3 },
      crackedPotRoles: { pattern: /data-role-id="cracked-pot"/g, count: 3 },
      fragmentRoles: { pattern: /data-role-id="ceramic-fragments"/g, count: 3 },
    },
  },
  {
    relativePath: outputPaths.snowEffect,
    svg: buildSnowEffect(snowfield),
    width: 1400,
    height: 1900,
    rootAttributes: {
      "data-contract-id": "scene-distill-empty-snow-three-role-v2",
      "data-experiment-id": "empty-snowfield-tension",
      "data-artifact-role": "effect",
      "data-source-subject": "empty-snowfield-measurement",
      "data-palette-id": "snow-violet-graphite-acid-v1",
      "data-photo-pixels": "0",
      "data-visible-text": "0",
    },
    contracts: {
      roles: { pattern: /data-role="(?:wind|interval|breach)"/g, count: 3 },
      windBand: { pattern: /data-role-id="pale-violet-wind-band"/g, count: 1 },
      graphiteInterval: { pattern: /data-role-id="graphite-interval"/g, count: 1 },
      acidBreach: { pattern: /data-role-id="acid-green-breach"/g, count: 1 },
    },
  },
  {
    relativePath: outputPaths.seasonEffect,
    svg: buildSeasonEffect(seasonSeed, seasonSplit),
    width: 2400,
    height: 1800,
    exactEmbeds: seasonSplit.members,
    rootAttributes: {
      "data-contract-id": "scenes-four-season-same-place-v3",
      "data-experiment-id": "four-season-same-place",
      "data-artifact-role": "effect",
      "data-source-subject": "seed-library-four-season-board",
      "data-member-extraction": "deterministic-exact-quadrants",
      "data-source-disclosure": "one-2x2-composite-board-not-four-independent-captures",
      "data-palette-id": "season-paper-cobalt-v1",
      "data-source-sha256": seasonSeed.sha256,
      "data-source-pixel-sha256": seasonSplit.boardPixelSha256,
      "data-recomposed-pixel-sha256": seasonSplit.recomposedPixelSha256,
    },
    contracts: {
      seriesMembers: { pattern: /data-series-member="(?:01|02|03|04)"/g, count: 4 },
      completeMembers: { pattern: /data-complete-member="true"/g, count: 4 },
      springMember: { pattern: /data-season="spring"/g, count: 1 },
      summerMember: { pattern: /data-season="summer"/g, count: 1 },
      autumnMember: { pattern: /data-season="autumn"/g, count: 1 },
      winterMember: { pattern: /data-season="winter"/g, count: 1 },
      structureConnector: { pattern: /data-structure-connector="one"/g, count: 1 },
      completeSeasonPhotos: { pattern: /data-role-id="complete-season-photo"/g, count: 4 },
      exactMemberKinds: { pattern: /data-member-kind="deterministic-quadrant"/g, count: 4 },
      fullMeetDisplays: { pattern: /data-member-display="full-meet"/g, count: 4 },
      memberPixelHashes: { pattern: /data-member-pixel-sha256="[a-f0-9]{64}"/g, count: 4 },
      quadrantCoordinates: { pattern: /data-source-quadrant="(?:0,0,512,768|512,0,512,768|0,768,512,768|512,768,512,768)"/g, count: 4 },
    },
  },
  {
    relativePath: outputPaths.postcardSource,
    svg: buildPostcardSourceBoard([cinema, bridge, market]),
    width: 2400,
    height: 1500,
    exactEmbeds: [cinema, bridge, market],
    rootAttributes: {
      "data-contract-id": "postcard-three-source-board-v2",
      "data-experiment-id": "north-harbor-three-card-series",
      "data-artifact-role": "source-board",
      "data-source-for-experiment": "north-harbor-three-card-series",
      "data-source-count": "3",
    },
    contracts: {
      sourceMembers: { pattern: /data-source-member="(?:01|02|03)"/g, count: 3 },
      completeSources: { pattern: /data-complete-source="true"/g, count: 3 },
      sourcePhotos: { pattern: /data-role-id="complete-source-photo"/g, count: 3 },
    },
  },
  {
    relativePath: outputPaths.postcardEffect,
    svg: buildPostcardEffect([cinema, bridge, market]),
    width: 2500,
    height: 3500,
    exactEmbeds: [cinema, bridge, market],
    rootAttributes: {
      "data-contract-id": "postcard-three-card-product-family-v2",
      "data-experiment-id": "north-harbor-three-card-series",
      "data-artifact-role": "effect",
      "data-template-aspect-ratio": "2:3",
      "data-shared-back-grid-id": "postcard-back-grid-v1",
      "data-physical-proof": "not-claimed",
    },
    contracts: {
      productSets: { pattern: /data-product-set="(?:01|02|03)"/g, count: 3 },
      frontBackCompleteness: { pattern: /data-product-completeness="front-back"/g, count: 3 },
      sides: { pattern: /data-side="(?:front|back)"/g, count: 6 },
      completeSurfaces: { pattern: /data-complete-surface="true"/g, count: 6 },
      twoByThreeSurfaces: { pattern: /data-aspect-ratio="2:3"/g, count: 6 },
      mainMotifs: { pattern: /data-role-id="main-motif"/g, count: 3 },
      supportMotifs: { pattern: /data-role-id="support-motif"/g, count: 3 },
      sourceSwatches: { pattern: /data-source-swatch="[123]"/g, count: 9 },
      sharedBackGridUses: { pattern: /data-side="back" data-aspect-ratio="2:3" data-back-grid-id="postcard-back-grid-v1"/g, count: 3 },
    },
  },
];

const report = outputs.map((output) => validateSvg(output));
for (const member of seasonSplit.members) {
  const target = absolute(member.relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, member.bytes);
}
const seasonManifestTarget = absolute(outputPaths.seasonManifest);
await mkdir(dirname(seasonManifestTarget), { recursive: true });
await writeFile(seasonManifestTarget, seasonSplit.manifestText, "utf8");
for (const { relativePath, svg } of outputs) {
  const target = absolute(relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, svg, "utf8");
}

console.log(JSON.stringify({
  status: "generated",
  outputCount: outputs.length,
  generatedArtifactCount: outputs.length + seasonSplit.members.length + 1,
  outputs: report,
  seasonMemberSplit: {
    manifest: outputPaths.seasonManifest,
    sourceBoardSha256: seasonSeed.sha256,
    sourceBoardPixelSha256: seasonSplit.boardPixelSha256,
    recomposedPixelSha256: seasonSplit.recomposedPixelSha256,
    pixelIdenticalRecomposition: seasonSplit.boardPixelSha256 === seasonSplit.recomposedPixelSha256,
    members: seasonSplit.members.map((member) => ({
      relativePath: member.relativePath,
      dimensions: member.width + "x" + member.height,
      quadrant: member.quadrant,
      sha256: member.sha256,
      pixelSha256: member.pixelSha256,
    })),
    distinctMemberPixelHashCount: new Set(seasonSplit.members.map((member) => member.pixelSha256)).size,
  },
  exactSourceHashes: {
    florist: florist.sha256,
    violinist: violinist.sha256,
    cameraShop: cameraShop.sha256,
    snowfield: snowfield.sha256,
    seasonSeed: seasonSeed.sha256,
    cinema: cinema.sha256,
    bridge: bridge.sha256,
    market: market.sha256,
    dailySource: dailySourceAsset.sha256,
  },
}, null, 2));
