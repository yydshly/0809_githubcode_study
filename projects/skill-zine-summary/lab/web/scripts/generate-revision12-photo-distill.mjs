import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "public/generated/source/revision12/photo-distill-fulfillment-source.png");
const effectPath = resolve(root, "public/generated/studies/photo-distill/revision12-fulfillment-wave-effect.svg");
const sourceBytes = readFileSync(sourcePath);
const sourceHash = createHash("sha256").update(sourceBytes).digest("hex");

const parcel = (x, y, width, height, fill, opacity = 1) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${Math.min(width, height) / 6}" fill="${fill}" opacity="${opacity}"/>`;

const sparse = [
  [164, 286, 34, 24], [238, 340, 24, 18], [312, 414, 42, 28], [418, 486, 28, 20],
];
const medium = [
  [670, 302, 48, 34], [742, 344, 34, 25], [806, 386, 55, 38], [884, 434, 40, 30],
  [720, 492, 30, 22], [790, 528, 44, 32], [864, 570, 32, 24],
];
const dense = Array.from({ length: 18 }, (_, index) => {
  const column = index % 6;
  const row = Math.floor(index / 6);
  return [142 + column * 64, 1030 + row * 55, 48, 36];
});
const surge = Array.from({ length: 22 }, (_, index) => {
  const angle = index * 0.92;
  const radius = 28 + index * 7.5;
  return [870 + Math.cos(angle) * radius, 1110 + Math.sin(angle) * radius * 0.64, 32 + (index % 3) * 7, 23 + (index % 2) * 6];
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-label="Two fulfillment flows, four package-density zones and one abnormal empty gap distilled into a deterministic SVG" data-experiment-id="fulfillment-wave-distill" data-artifact-role="effect" data-source-sha256="${sourceHash}" data-photo-pixels="0" data-visible-text="0" data-flow-count="2" data-density-zone-count="4" data-abnormal-gap-count="1" data-color-anchor-count="1" data-crop="none">
  <rect width="1200" height="1600" fill="#eee8db"/>
  <g data-role="paper-grid" stroke="#273238" stroke-width="1" opacity=".055">
    ${Array.from({ length: 12 }, (_, index) => `<path d="M${120 + index * 90} 110V1490"/>`).join("")}
    ${Array.from({ length: 15 }, (_, index) => `<path d="M70 ${150 + index * 90}H1130"/>`).join("")}
  </g>
  <path data-role="flow-north-south" d="M516 105V1490" fill="none" stroke="#173d46" stroke-width="128" stroke-linecap="round" opacity=".92"/>
  <path data-role="flow-west-east" d="M80 812H1120" fill="none" stroke="#315f66" stroke-width="92" stroke-linecap="round" opacity=".82"/>
  <g data-density-zone="sparse" data-density-rank="1">${sparse.map(([x, y, w, h]) => parcel(x, y, w, h, "#b77b46", .72)).join("")}</g>
  <g data-density-zone="medium" data-density-rank="2">${medium.map(([x, y, w, h]) => parcel(x, y, w, h, "#9b6640", .82)).join("")}</g>
  <g data-density-zone="dense" data-density-rank="3">${dense.map(([x, y, w, h]) => parcel(x, y, w, h, "#694b3d", .88)).join("")}</g>
  <g data-density-zone="surge" data-density-rank="4">${surge.map(([x, y, w, h]) => parcel(Math.round(x), Math.round(y), w, h, "#c58d48", .84)).join("")}</g>
  <g data-role="abnormal-empty-gap" data-gap-count="1">
    <rect x="446" y="678" width="140" height="270" rx="70" fill="#eee8db"/>
    <rect x="470" y="702" width="92" height="222" rx="46" fill="none" stroke="#29343a" stroke-width="3" stroke-dasharray="3 14" opacity=".5"/>
  </g>
  <g data-role="cobalt-operational-anchor" data-anchor-count="1">
    <circle cx="516" cy="812" r="34" fill="#2562a8"/>
    <circle cx="516" cy="812" r="58" fill="none" stroke="#2562a8" stroke-width="3" opacity=".38"/>
  </g>
  <g data-role="cadence-ticks" stroke="#d39a37" stroke-width="10" stroke-linecap="round" opacity=".88">
    <path d="M462 214h34M462 314h34M462 414h34M462 514h34"/>
    <path d="M536 1086h34M536 1186h34M536 1286h34M536 1386h34"/>
  </g>
  <g data-role="flow-termini" fill="#273238" opacity=".72">
    <circle cx="516" cy="104" r="13"/><circle cx="516" cy="1490" r="13"/><circle cx="80" cy="812" r="11"/><circle cx="1120" cy="812" r="11"/>
  </g>
</svg>`;

if (/<(?:image|text|script|foreignObject)\b|\bhref\s*=/.test(svg)) {
  throw new Error("Revision 12 Photo Distill effect must remain self-contained, textless, and photo-free.");
}
if ((svg.match(/data-density-zone=/g) ?? []).length !== 4) throw new Error("Expected exactly four density zones.");
if ((svg.match(/data-role="abnormal-empty-gap"/g) ?? []).length !== 1) throw new Error("Expected exactly one abnormal gap.");
if (!svg.includes(`data-source-sha256="${sourceHash}"`)) throw new Error("Missing source provenance hash.");

mkdirSync(dirname(effectPath), { recursive: true });
writeFileSync(effectPath, svg, "utf8");
const effectHash = createHash("sha256").update(svg).digest("hex");
console.log(JSON.stringify({ sourcePath, sourceHash, effectPath, effectHash, width: 1200, height: 1600 }, null, 2));
