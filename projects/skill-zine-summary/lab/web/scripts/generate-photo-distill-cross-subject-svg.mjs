import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const sources = {
  florist: "public/generated/source/next/florist-crosswalk-source.png",
  interchange: "public/generated/source/next/north-harbor-interchange-source.png",
  spring: "public/generated/source/next/season-seed-library-spring.png",
  summer: "public/generated/source/next/season-seed-library-summer.png",
  autumn: "public/generated/source/next/season-seed-library-autumn.png",
  winter: "public/generated/source/next/season-seed-library-winter.png",
};

const outputs = {
  florist: "public/generated/studies/photo-distill/florist-rain-relations-effect.svg",
  interchange: "public/generated/studies/photo-distill/north-harbor-flow-relations-effect.svg",
  seasons: "public/generated/studies/photo-distill/season-seed-library-relations-effect.svg",
};

function absolute(relativePath) {
  return resolve(projectRoot, relativePath);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readPng(relativePath) {
  const bytes = await readFile(absolute(relativePath));
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`Expected PNG source: ${relativePath}`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1) throw new Error(`Invalid PNG dimensions: ${relativePath}`);
  return { relativePath, width, height, sha256: sha256(bytes) };
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function provenanceMetadata(sourceRecords, relationshipModel) {
  const payload = {
    effectKind: "clean-room-code-native-svg",
    relationshipModel,
    sources: sourceRecords.map(({ relativePath, width, height, sha256: digest }) => ({
      path: relativePath,
      width,
      height,
      sha256: digest,
    })),
    boundary: "Source images informed relationship selection only; no source pixels, upstream code, templates, or traced contours are embedded.",
  };
  return `<metadata>${xmlEscape(JSON.stringify(payload))}</metadata>`;
}

function rainMarks() {
  const marks = [];
  for (let row = 0; row < 11; row += 1) {
    for (let column = 0; column < 13; column += 1) {
      const x = 92 + column * 79 + ((row * 37 + column * 19) % 31);
      const y = 840 + row * 38 + ((column * 11 + row * 7) % 17);
      const length = 18 + ((row + column * 3) % 5) * 8;
      const color = (row + column) % 7 === 0 ? "#e5b75f" : "#6da9bd";
      const opacity = 0.25 + ((row + column) % 4) * 0.11;
      marks.push(`<line x1="${x}" y1="${y}" x2="${x + length}" y2="${y - 7}" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="${opacity.toFixed(2)}"/>`);
    }
  }
  return marks.join("\n");
}

function buildFlorist(source) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-labelledby="florist-title florist-desc" data-study="photo-distill" data-subject="florist-rain-tram" data-source-pixels="none" data-contour-tracing="none">
  <title id="florist-title">Rain florist relationship distillation</title>
  <desc id="florist-desc">A code-native relationship poster that reduces a rain-soaked florist scene to body mass, tram paths, one bouquet color cluster, and reflected street rhythm.</desc>
  ${provenanceMetadata([source], "body mass / rail path / bouquet color anchor / rain-surface rhythm")}
  <defs>
    <linearGradient id="florist-night" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b2028"/>
      <stop offset="0.56" stop-color="#102a3a"/>
      <stop offset="1" stop-color="#07131d"/>
    </linearGradient>
    <linearGradient id="florist-coat" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#315f9f"/>
      <stop offset="1" stop-color="#183d70"/>
    </linearGradient>
    <filter id="florist-glow" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
  </defs>

  <rect width="1200" height="1600" fill="url(#florist-night)"/>
  <g fill="#d6ded9" font-family="Arial, Helvetica, sans-serif">
    <text x="76" y="82" font-size="16" letter-spacing="5">RELATION STUDY / 041</text>
    <text x="1124" y="82" font-size="16" letter-spacing="3" text-anchor="end">FLORIST · RAIN · TRAM</text>
  </g>
  <line x1="76" y1="112" x2="1124" y2="112" stroke="#72909a" stroke-width="1" opacity="0.55"/>

  <g id="market-structure" fill="none" stroke-linecap="round">
    <path d="M70 222 L476 222 L616 418" stroke="#2c756f" stroke-width="34" opacity="0.56"/>
    <path d="M112 170 L520 170 L682 402" stroke="#b48a54" stroke-width="5" opacity="0.56"/>
    <path d="M132 236 L132 1128 M286 228 L286 1066 M444 230 L444 1018" stroke="#23655f" stroke-width="24" opacity="0.78"/>
    <path d="M90 345 L482 345 M92 548 L474 548 M94 748 L454 748" stroke="#65a097" stroke-width="4" opacity="0.42"/>
  </g>

  <g id="tram-path" fill="none" stroke-linecap="round">
    <path d="M1180 376 C1034 498 934 676 850 852 C752 1058 672 1252 602 1510" stroke="#b9cbd0" stroke-width="6" opacity="0.62"/>
    <path d="M1200 468 C1068 570 970 722 888 898 C790 1106 718 1290 668 1518" stroke="#537b88" stroke-width="4" opacity="0.82"/>
    <path d="M1058 330 L998 590 L908 890" stroke="#7896a1" stroke-width="3" stroke-dasharray="8 20" opacity="0.48"/>
    <circle cx="1032" cy="492" r="64" fill="#e7d9b8" opacity="0.12" stroke="none" filter="url(#florist-glow)"/>
    <circle cx="1032" cy="492" r="13" fill="#f6edcf" stroke="none"/>
  </g>

  <g id="subject-mass" data-relation-role="body-mass">
    <path d="M452 510 C520 438 644 432 708 508 L770 1022 L690 1192 L430 1144 L380 880 Z" fill="url(#florist-coat)"/>
    <path d="M500 1030 L684 1026 L740 1436 L438 1436 Z" fill="#7f2932" opacity="0.94"/>
    <path d="M536 494 C590 458 654 474 674 522 L630 650 L548 638 L510 552 Z" fill="#202a2e" opacity="0.86"/>
    <path d="M560 558 C646 598 702 650 726 736" fill="none" stroke="#d18b31" stroke-width="28" stroke-linecap="round"/>
    <path d="M638 618 C594 700 548 754 490 816" fill="none" stroke="#d18b31" stroke-width="12" opacity="0.78"/>
  </g>

  <g id="bouquet-anchor" data-relation-role="color-anchor" transform="translate(548 754)">
    <path d="M-8 114 L74 282 M38 102 L112 280 M-58 92 L32 278" stroke="#76915b" stroke-width="12" stroke-linecap="round" opacity="0.72"/>
    <g stroke="#102a3a" stroke-width="5">
      <circle cx="-42" cy="28" r="58" fill="#d75b4d"/>
      <circle cx="36" cy="-18" r="50" fill="#eca837"/>
      <circle cx="102" cy="36" r="54" fill="#c95058"/>
      <circle cx="28" cy="74" r="62" fill="#e28145"/>
      <circle cx="-86" cy="94" r="38" fill="#e7b84c"/>
      <circle cx="108" cy="118" r="34" fill="#91a764"/>
      <circle cx="-10" cy="148" r="30" fill="#75985f"/>
    </g>
    <circle cx="34" cy="62" r="12" fill="#f4d16c"/>
  </g>

  <g id="rain-rhythm" data-relation-role="surface-rhythm">
    ${rainMarks()}
    <path d="M72 1244 C334 1178 552 1242 746 1208 C930 1174 1040 1088 1160 1036" fill="none" stroke="#d8b06b" stroke-width="5" opacity="0.42"/>
    <path d="M84 1284 C326 1236 550 1294 750 1252 C944 1212 1050 1142 1172 1088" fill="none" stroke="#6fa3b1" stroke-width="4" opacity="0.5"/>
  </g>

  <g font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="3" fill="#b7c7c8">
    <text x="92" y="1380">MARKET FRAME</text>
    <text x="392" y="1492">BODY MASS</text>
    <text x="754" y="1300">TRACK PATH</text>
    <text x="760" y="1420">RAIN RHYTHM</text>
  </g>
  <line x1="76" y1="1520" x2="1124" y2="1520" stroke="#72909a" stroke-width="1" opacity="0.55"/>
  <text x="76" y="1562" fill="#91a8ad" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="3">RELATIONS RETAINED · FACE AND GARMENT CONTOURS DISCARDED · NO SOURCE PIXELS</text>
</svg>`;
}

function crowdMarks() {
  const groups = [
    { x: 76, y: 696, columns: 11, rows: 5, dx: 45, dy: 44, drift: 11 },
    { x: 598, y: 642, columns: 9, rows: 5, dx: 42, dy: 47, drift: -8 },
    { x: 200, y: 1000, columns: 13, rows: 5, dx: 50, dy: 52, drift: 16 },
    { x: 690, y: 1110, columns: 8, rows: 4, dx: 48, dy: 54, drift: -14 },
  ];
  const marks = [];
  for (const [groupIndex, group] of groups.entries()) {
    for (let row = 0; row < group.rows; row += 1) {
      for (let column = 0; column < group.columns; column += 1) {
        if ((row * 5 + column * 3 + groupIndex) % 9 === 0) continue;
        const x = group.x + column * group.dx + row * group.drift + ((column * 17 + row * 9) % 13);
        const y = group.y + row * group.dy + ((column * 7 + groupIndex * 5) % 19);
        const length = 12 + ((row + column + groupIndex) % 4) * 5;
        const opacity = 0.38 + ((row * 2 + column) % 5) * 0.1;
        marks.push(`<line x1="${x}" y1="${y}" x2="${x + length}" y2="${y + 8}" stroke="#c8d2d0" stroke-width="6" stroke-linecap="round" opacity="${opacity.toFixed(2)}"/>`);
      }
    }
  }
  return marks.join("\n");
}

function buildInterchange(source) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-labelledby="interchange-title interchange-desc" data-study="photo-distill" data-subject="north-harbor-interchange" data-source-pixels="none" data-contour-tracing="none">
  <title id="interchange-title">North Harbor interchange flow distillation</title>
  <desc id="interchange-desc">A code-native relation map of converging roof axes, pedestrian density, deliberate occlusion gaps, tram flow, and one yellow color anchor.</desc>
  ${provenanceMetadata([source], "perspective axes / crowd density / occlusion and void / single color anchor")}
  <defs>
    <linearGradient id="interchange-ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e7e5df"/>
      <stop offset="1" stop-color="#c9d0cf"/>
    </linearGradient>
    <linearGradient id="interchange-night" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14242b"/>
      <stop offset="1" stop-color="#071015"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="1600" fill="url(#interchange-night)"/>
  <g fill="#d9e0dd" font-family="Arial, Helvetica, sans-serif">
    <text x="76" y="82" font-size="16" letter-spacing="5">RELATION STUDY / 042</text>
    <text x="1124" y="82" font-size="16" letter-spacing="3" text-anchor="end">INTERCHANGE · FLOW · VOID</text>
  </g>
  <line x1="76" y1="112" x2="1124" y2="112" stroke="#566a71" stroke-width="1"/>

  <g id="perspective-axes" data-relation-role="perspective-axis" fill="none" stroke-linecap="round">
    <circle cx="616" cy="374" r="8" fill="#d5dedb" stroke="none"/>
    <path d="M20 176 L616 374 L1180 146 M40 344 L616 374 L1162 328 M72 540 L616 374 L1124 546" stroke="#78909a" stroke-width="4" opacity="0.7"/>
    <path d="M158 140 L616 374 L976 142 M304 136 L616 374 L844 138 M462 136 L616 374 L714 136" stroke="#a9b8ba" stroke-width="3" opacity="0.62"/>
    <path d="M128 592 L616 374 L1038 594" stroke="#d5dedb" stroke-width="9" opacity="0.3"/>
  </g>

  <g id="tram-flow" data-relation-role="directed-flow" fill="none" stroke-linecap="round">
    <path d="M728 430 C794 602 860 812 1110 1518" stroke="#8fa3a7" stroke-width="20" opacity="0.32"/>
    <path d="M676 430 C720 626 786 846 936 1524" stroke="#c8d2d0" stroke-width="5" opacity="0.76"/>
    <path d="M768 432 C840 650 928 906 1170 1468" stroke="#c8d2d0" stroke-width="5" opacity="0.76"/>
    <path d="M690 600 L816 582 M734 722 L888 696 M792 870 L958 840 M864 1060 L1050 1022 M936 1268 L1136 1226" stroke="#6c8187" stroke-width="4" opacity="0.62"/>
  </g>

  <g id="crowd-density" data-relation-role="crowd-density">
    ${crowdMarks()}
  </g>

  <g id="voids" data-relation-role="occlusion-and-void">
    <path d="M86 570 C224 514 354 522 478 580 L426 704 C300 654 198 660 94 714 Z" fill="#0a151a" opacity="0.96"/>
    <path d="M470 824 C586 760 718 764 828 832 L782 974 C672 916 566 912 454 980 Z" fill="#0a151a" opacity="0.96"/>
    <path d="M74 1220 C224 1140 362 1140 508 1214 L468 1368 C326 1302 210 1312 82 1384 Z" fill="#0a151a" opacity="0.96"/>
    <g fill="none" stroke="#566a71" stroke-width="2" stroke-dasharray="8 12" opacity="0.76">
      <path d="M94 714 C212 660 322 656 426 704"/>
      <path d="M454 980 C570 914 674 914 782 974"/>
      <path d="M82 1384 C214 1312 330 1304 468 1368"/>
    </g>
  </g>

  <g id="single-color-anchor" data-relation-role="single-color-anchor">
    <circle cx="594" cy="1112" r="34" fill="#f0c52e"/>
    <path d="M594 1150 L594 1214" stroke="#f0c52e" stroke-width="10" stroke-linecap="round"/>
    <circle cx="594" cy="1112" r="56" fill="none" stroke="#f0c52e" stroke-width="2" opacity="0.42"/>
  </g>

  <g font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="3" fill="#9fb0b2">
    <text x="76" y="620">VOID 01</text>
    <text x="474" y="876">VOID 02</text>
    <text x="84" y="1274">VOID 03</text>
    <text x="770" y="418">DIRECTED FLOW</text>
    <text x="632" y="1130" fill="#f0c52e">ANCHOR 01</text>
  </g>
  <line x1="76" y1="1520" x2="1124" y2="1520" stroke="#566a71" stroke-width="1"/>
  <text x="76" y="1562" fill="#8da0a3" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="3">DENSITY CLUSTERED · OCCLUSION MADE EXPLICIT · ONE SATURATED HUE</text>
</svg>`;
}

function plantMarks({ seed, count, width, height, palette }) {
  const marks = [];
  for (let index = 0; index < count; index += 1) {
    const x = 22 + ((index * (47 + seed * 2) + seed * 29) % (width - 44));
    const y = height - 28 - ((index * (31 + seed * 3) + seed * 17) % Math.max(48, height - 84));
    const radius = 4 + ((index + seed) % 4) * 2;
    const color = palette[(index * 3 + seed) % palette.length];
    const opacity = 0.48 + ((index + seed) % 4) * 0.12;
    marks.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`);
    if (index % 3 === 0) {
      marks.push(`<line x1="${x}" y1="${y + 2}" x2="${x - 5 + ((index + seed) % 11)}" y2="${height - 8}" stroke="${color}" stroke-width="2" opacity="${Math.max(0.32, opacity - 0.18).toFixed(2)}"/>`);
    }
  }
  return marks.join("\n");
}

function seasonPanel({ id, x, y, label, code, structure, field, anchor, density, seed, panelFill, atmosphere }) {
  const panelWidth = 500;
  const panelHeight = 574;
  return `<g id="season-${id}" transform="translate(${x} ${y})" data-season="${id}" data-density="${density}">
    <rect width="${panelWidth}" height="${panelHeight}" rx="2" fill="${panelFill}"/>
    <path d="M0 430 C120 390 270 410 500 366 L500 574 L0 574 Z" fill="${field}" opacity="0.22"/>
    <g transform="translate(50 92)" color="${structure}">
      <use href="#greenhouse-grammar" width="400" height="400"/>
      <g transform="translate(22 172)">
        ${plantMarks({ seed, count: density, width: 356, height: 192, palette: [field, anchor, structure] })}
      </g>
    </g>
    ${atmosphere}
    <rect x="26" y="26" width="122" height="34" fill="${structure}"/>
    <text x="40" y="49" fill="${panelFill}" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="3">${code}</text>
    <text x="474" y="49" fill="${structure}" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="3" text-anchor="end">DENSITY ${String(density).padStart(2, "0")}</text>
    <text x="26" y="548" fill="${structure}" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="4">${label}</text>
    <circle cx="456" cy="540" r="10" fill="${anchor}"/>
  </g>`;
}

function buildSeasons(sourceRecords) {
  const springAtmosphere = `<g fill="#8eb49a" opacity="0.55"><circle cx="92" cy="126" r="4"/><circle cx="406" cy="118" r="5"/><circle cx="442" cy="172" r="3"/></g>`;
  const summerAtmosphere = `<g fill="#e8a83c" opacity="0.58"><circle cx="66" cy="104" r="6"/><circle cx="424" cy="150" r="5"/><circle cx="454" cy="212" r="4"/></g>`;
  const autumnAtmosphere = `<g fill="#b95f37" opacity="0.62"><path d="M74 108 l12 8 -10 10 -12 -8z"/><path d="M424 148 l14 7 -8 13 -14 -8z"/><path d="M452 218 l12 8 -9 12 -12 -8z"/></g>`;
  const winterAtmosphere = `<g fill="#edf2f0" opacity="0.76"><circle cx="76" cy="102" r="5"/><circle cx="118" cy="142" r="4"/><circle cx="404" cy="126" r="6"/><circle cx="448" cy="190" r="4"/><path d="M72 424 C180 390 310 400 482 370 L482 430 C310 450 178 446 72 466 Z" opacity="0.48"/></g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-labelledby="seasons-title seasons-desc" data-study="photo-distill" data-subject="season-seed-library" data-source-pixels="none" data-contour-tracing="none">
  <title id="seasons-title">Four-season greenhouse relationship family</title>
  <desc id="seasons-desc">Four complete seasonal panels reuse one greenhouse structure symbol while vegetation density, atmosphere, and color roles change from spring to winter.</desc>
  ${provenanceMetadata(sourceRecords, "shared greenhouse structure grammar / four density states / seasonal color-role changes")}
  <defs>
    <symbol id="greenhouse-grammar" viewBox="0 0 400 400">
      <g fill="none" stroke="currentColor" stroke-linejoin="round">
        <path d="M42 150 L200 34 L358 150 L342 364 L58 364 Z" stroke-width="12"/>
        <path d="M42 150 L358 150 M200 34 L200 364 M112 98 L112 364 M288 98 L288 364" stroke-width="5" opacity="0.86"/>
        <path d="M58 218 L342 218 M58 292 L342 292" stroke-width="4" opacity="0.56"/>
        <rect x="158" y="228" width="84" height="136" stroke-width="7"/>
        <path d="M76 176 L112 218 M324 176 L288 218 M112 98 L200 150 L288 98" stroke-width="3" opacity="0.56"/>
      </g>
    </symbol>
  </defs>

  <rect width="1200" height="1600" fill="#ece8df"/>
  <g fill="#26312e" font-family="Arial, Helvetica, sans-serif">
    <text x="76" y="82" font-size="16" letter-spacing="5">RELATION FAMILY / 043</text>
    <text x="1124" y="82" font-size="16" letter-spacing="3" text-anchor="end">ONE STRUCTURE · FOUR STATES</text>
  </g>
  <line x1="76" y1="112" x2="1124" y2="112" stroke="#9a978d" stroke-width="1"/>

  ${seasonPanel({ id: "spring", x: 76, y: 162, label: "SPRING / EMERGENCE", code: "S1", structure: "#526b62", field: "#7ca483", anchor: "#d8a94d", density: 22, seed: 1, panelFill: "#dde4dd", atmosphere: springAtmosphere })}
  ${seasonPanel({ id: "summer", x: 624, y: 162, label: "SUMMER / ABUNDANCE", code: "S2", structure: "#234d3d", field: "#3e7b49", anchor: "#e8a83c", density: 46, seed: 2, panelFill: "#dce5d5", atmosphere: summerAtmosphere })}
  ${seasonPanel({ id: "autumn", x: 76, y: 784, label: "AUTUMN / RELEASE", code: "S3", structure: "#654b39", field: "#9a6838", anchor: "#b94d32", density: 32, seed: 3, panelFill: "#e7ddcf", atmosphere: autumnAtmosphere })}
  ${seasonPanel({ id: "winter", x: 624, y: 784, label: "WINTER / REST", code: "S4", structure: "#5f6d73", field: "#8ea3aa", anchor: "#dce6e8", density: 9, seed: 4, panelFill: "#dce4e6", atmosphere: winterAtmosphere })}

  <g transform="translate(76 1412)" font-family="Arial, Helvetica, sans-serif">
    <text x="0" y="0" fill="#26312e" font-size="15" letter-spacing="4">STRUCTURE ROLE</text>
    <line x1="0" y1="24" x2="142" y2="24" stroke="#526b62" stroke-width="10"/>
    <text x="210" y="0" fill="#26312e" font-size="15" letter-spacing="4">FIELD ROLE</text>
    <line x1="210" y1="24" x2="352" y2="24" stroke="#7ca483" stroke-width="10"/>
    <text x="420" y="0" fill="#26312e" font-size="15" letter-spacing="4">ANCHOR ROLE</text>
    <circle cx="438" cy="24" r="10" fill="#d8a94d"/>
    <text x="1048" y="0" fill="#59615e" font-size="13" letter-spacing="3" text-anchor="end">GEOMETRY LOCKED</text>
    <text x="1048" y="28" fill="#59615e" font-size="13" letter-spacing="3" text-anchor="end">DENSITY + COLOR VARIABLE</text>
  </g>
  <line x1="76" y1="1520" x2="1124" y2="1520" stroke="#9a978d" stroke-width="1"/>
  <text x="76" y="1562" fill="#626762" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="3">ONE SYMBOL REUSED FOUR TIMES · SEASONAL APPEARANCE DISTILLED INTO ROLES</text>
</svg>`;
}

function basicXmlCheck(svg, { width, height, id }) {
  const root = svg.match(/<svg\b([^>]*)>/);
  if (!root) throw new Error(`${id}: missing root svg element`);
  const attribute = (name) => root[1].match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
  if (attribute("xmlns") !== "http://www.w3.org/2000/svg") throw new Error(`${id}: missing SVG namespace`);
  if (attribute("width") !== String(width) || attribute("height") !== String(height)) throw new Error(`${id}: unexpected dimensions`);
  if (attribute("viewBox") !== `0 0 ${width} ${height}`) throw new Error(`${id}: unexpected viewBox`);
  if ((svg.match(/<svg\b/g) ?? []).length !== 1 || (svg.match(/<\/svg>/g) ?? []).length !== 1) throw new Error(`${id}: unexpected SVG root count`);
  if (/<image\b|<foreignObject\b|\b(?:xlink:)?href="(?:https?:|data:)/i.test(svg)) throw new Error(`${id}: SVG must not embed source pixels or external content`);
  if (!/<title\b/.test(svg) || !/<desc\b/.test(svg) || !/<metadata\b/.test(svg)) throw new Error(`${id}: missing title, description, or provenance metadata`);

  const stack = [];
  const tags = svg.match(/<[^>]+>/g) ?? [];
  for (const tag of tags) {
    if (/^<\?|^<!/.test(tag) || /\/>$/.test(tag)) continue;
    const closing = tag.match(/^<\/\s*([\w:-]+)/);
    if (closing) {
      const open = stack.pop();
      if (open !== closing[1]) throw new Error(`${id}: unbalanced XML tag ${closing[1]}`);
      continue;
    }
    const opening = tag.match(/^<\s*([\w:-]+)/);
    if (opening) stack.push(opening[1]);
  }
  if (stack.length) throw new Error(`${id}: unclosed XML tag ${stack.at(-1)}`);
}

async function writeSvg(relativePath, svg, expected) {
  basicXmlCheck(svg, expected);
  const target = absolute(relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, svg, "utf8");
  const bytes = await readFile(target);
  return {
    path: relativePath,
    width: expected.width,
    height: expected.height,
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

async function main() {
  const sourceRecords = {};
  for (const [key, relativePath] of Object.entries(sources)) sourceRecords[key] = await readPng(relativePath);

  const generated = [];
  generated.push(await writeSvg(outputs.florist, buildFlorist(sourceRecords.florist), { width: 1200, height: 1600, id: "florist" }));
  generated.push(await writeSvg(outputs.interchange, buildInterchange(sourceRecords.interchange), { width: 1200, height: 1600, id: "interchange" }));
  generated.push(await writeSvg(outputs.seasons, buildSeasons([
    sourceRecords.spring,
    sourceRecords.summer,
    sourceRecords.autumn,
    sourceRecords.winter,
  ]), { width: 1200, height: 1600, id: "seasons" }));

  console.log(JSON.stringify({ generated }, null, 2));
}

await main();
