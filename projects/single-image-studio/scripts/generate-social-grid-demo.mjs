import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { socialGridLayout } from "../web/social-grid-split.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = path.join(projectRoot, "web", "demo-assets", "social-grid-demo-v1");
const PREVIEW_SIZE = 1200;
const CONTACT_TILE_SIZE = 320;
const CONTACT_GAP = 16;

function overlaySvg(layout) {
  const seamPositions = [layout.tileSize, layout.tileSize * 2];
  const seams = seamPositions.map((position) => `
    <line x1="${position}" y1="0" x2="${position}" y2="${layout.usedSize}" stroke="rgba(0,0,0,.55)" stroke-width="10" />
    <line x1="0" y1="${position}" x2="${layout.usedSize}" y2="${position}" stroke="rgba(0,0,0,.55)" stroke-width="10" />
    <line x1="${position}" y1="0" x2="${position}" y2="${layout.usedSize}" stroke="white" stroke-width="4" />
    <line x1="0" y1="${position}" x2="${layout.usedSize}" y2="${position}" stroke="white" stroke-width="4" />
  `).join("");
  const labels = layout.entries.map((entry) => {
    const cx = entry.x + 44;
    const cy = entry.y + 44;
    return `<circle cx="${cx}" cy="${cy}" r="25" fill="rgba(21,29,24,.82)" /><text x="${cx}" y="${cy + 9}" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="white">${entry.number}</text>`;
  }).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${layout.usedSize}" height="${layout.usedSize}" viewBox="0 0 ${layout.usedSize} ${layout.usedSize}">${seams}${labels}</svg>`);
}

async function renderDemo(name) {
  const sourcePath = path.join(assetRoot, `${name}-source.png`);
  const source = sharp(sourcePath, { failOn: "error", limitInputPixels: 40_000_000 });
  const metadata = await source.metadata();
  if (metadata.width !== metadata.height || !metadata.width) {
    throw new Error(`${name} demo source must be a non-empty square image`);
  }

  const normalized = await source
    .resize(PREVIEW_SIZE, PREVIEW_SIZE, { fit: "cover", withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer({ resolveWithObject: true });
  if (normalized.info.width !== normalized.info.height) throw new Error(`${name} normalized preview is not square`);
  const layout = socialGridLayout(normalized.info.width, normalized.info.height);

  await sharp(normalized.data)
    .composite([{ input: overlaySvg(layout), left: 0, top: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(path.join(assetRoot, `${name}-grid-overlay.png`));

  const contactSize = CONTACT_TILE_SIZE * 3 + CONTACT_GAP * 4;
  const composites = [];
  for (const entry of layout.entries) {
    const tile = await sharp(normalized.data)
      .extract({ left: entry.x, top: entry.y, width: entry.size, height: entry.size })
      .resize(CONTACT_TILE_SIZE, CONTACT_TILE_SIZE, { fit: "fill" })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer();
    composites.push({
      input: tile,
      left: CONTACT_GAP + entry.column * (CONTACT_TILE_SIZE + CONTACT_GAP),
      top: CONTACT_GAP + entry.row * (CONTACT_TILE_SIZE + CONTACT_GAP),
    });
  }
  await sharp({
    create: {
      width: contactSize,
      height: contactSize,
      channels: 4,
      background: { r: 24, g: 29, b: 26, alpha: 1 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(path.join(assetRoot, `${name}-tiles-contact.png`));
}

await renderDemo("suitable");
await renderDemo("unsuitable");
