import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, ".tmp");
const rows = [
  ["Daily", "public/generated/source/revision12/daily-parade-float-mechanic-source.png", "public/generated/studies/daily-photo-playground/revision12-parade-float-editorial-effect.png"],
  ["DYY", "public/generated/source/revision12/dyy-warehouse-robots-source.png", "public/generated/studies/dyy-photo-deconstruct/revision12-warehouse-five-mark-effect.png"],
  ["Travel", "public/generated/source/revision12/travel-micro-apartment-source.png", "public/generated/studies/travel-photo-abstraction/revision12-micro-apartment-relations-effect.png"],
  ["Scenes", "public/generated/source/revision12/scenes-mobile-clinic-source.png", "public/generated/studies/scenes-gathered-zine/revision12-mobile-clinic-journey-effect.png"],
  ["Distillation", "public/generated/source/revision12/distillation-first-order-source.png", "public/generated/studies/scene-distillation-zine/revision12-first-order-distillation-effect.png"],
  ["GC", "public/generated/source/revision12/gc-broken-fiber-source.png", "public/generated/studies/gc-minimal-zine-poster/revision12-broken-fiber-anchor-effect.png"],
  ["Revival", "public/generated/source/revision12/revival-hardware-store-source.png", "public/generated/studies/photo-revival/revision12-hardware-store-memory-effect.png"],
  ["Pixel", "public/generated/source/revision12/pixel-robot-welding-source.png", "public/generated/studies/pixel-style-poster/revision12-robot-welding-halftone-effect.png"],
  ["Relic", "public/generated/source/revision12/relic-perfume-archive-source.png", "public/generated/studies/photo-relic-editorial/revision12-blue-bottle-relic-effect.png"],
  ["Photo Distill", "public/generated/source/revision12/photo-distill-fulfillment-source.png", "public/generated/studies/photo-distill/revision12-fulfillment-wave-effect.svg"],
  ["Poetic", "public/generated/source/revision12/poetic-wind-inspection-source.png", "public/generated/studies/poetic-line-zine-poster/revision12-wind-inspection-poetic-effect.png"],
  ["Abstract", "public/generated/source/revision12/abstract-exhibition-install-source.png", "public/generated/studies/photo-abstract-editorial/revision12-exhibition-install-relations-effect.png"],
  ["Postcard", "public/generated/source/revision12/postcard-conference-designer-source.png", "public/generated/studies/photo-to-zine-postcard/revision12-conference-thank-you-card-effect.png"],
];

const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

async function renderSheet(kind, pathIndex) {
  const tileWidth = 240;
  const tileHeight = 360;
  const labelHeight = 42;
  const gap = 18;
  const columns = 4;
  const rowCount = Math.ceil(rows.length / columns);
  const width = gap + columns * (tileWidth + gap);
  const height = gap + rowCount * (tileHeight + labelHeight + gap);
  const composites = [];

  for (const [index, [label, source, effect]] of rows.entries()) {
    const x = gap + (index % columns) * (tileWidth + gap);
    const y = gap + Math.floor(index / columns) * (tileHeight + labelHeight + gap);
    const imagePath = resolve(root, pathIndex === 1 ? source : effect);
    const buffer = await sharp(imagePath)
      .resize(tileWidth, tileHeight, { fit: "contain", background: "#d8d0c2" })
      .png()
      .toBuffer();
    composites.push({ input: buffer, left: x, top: y });
    composites.push({
      input: Buffer.from(`<svg width="${tileWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#20231f"/><text x="12" y="27" fill="#f4efe4" font-family="Arial" font-size="16">${String(index + 1).padStart(2, "0")} · ${escape(label)} · ${kind}</text></svg>`),
      left: x,
      top: y + tileHeight,
    });
  }

  await sharp({ create: { width, height, channels: 3, background: "#eee8dc" } })
    .composite(composites)
    .png()
    .toFile(resolve(outDir, `revision12-${kind.toLowerCase()}-contact-sheet.png`));
}

mkdirSync(outDir, { recursive: true });
await renderSheet("SOURCE", 1);
await renderSheet("EFFECT", 2);
console.log(JSON.stringify({ rows: rows.length, outDir }, null, 2));
