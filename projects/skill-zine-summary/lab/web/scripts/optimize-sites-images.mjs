import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const generatedRoot = path.resolve("dist/client/generated");
const minimumBytes = 256 * 1024;
const maximumWidth = 900;
const maximumHeight = 1350;

async function collectPngs(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectPngs(target);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".png") ? [target] : [];
  }));
  return nested.flat();
}

const pngs = await collectPngs(generatedRoot);
let originalBytes = 0;
let deployedBytes = 0;
let optimizedCount = 0;
let resizedCount = 0;

for (const file of pngs) {
  const original = await readFile(file);
  originalBytes += original.length;

  if (original.length < minimumBytes) {
    deployedBytes += original.length;
    continue;
  }

  const metadata = await sharp(original).metadata();
  const shouldResize = Boolean(
    metadata.width
    && metadata.height
    && (metadata.width > maximumWidth || metadata.height > maximumHeight),
  );
  const optimized = await sharp(original)
    .resize({ width: maximumWidth, height: maximumHeight, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 7, palette: true, quality: 82 })
    .toBuffer();
  const optimizedMetadata = await sharp(optimized).metadata();

  if (!optimizedMetadata.width || !optimizedMetadata.height || !metadata.width || !metadata.height) {
    throw new Error(`Missing dimensions while optimizing ${file}`);
  }
  const sourceRatio = metadata.width / metadata.height;
  const optimizedRatio = optimizedMetadata.width / optimizedMetadata.height;
  if (Math.abs(sourceRatio - optimizedRatio) > 0.002) {
    throw new Error(`Aspect-ratio drift while optimizing ${file}`);
  }

  if (optimized.length < original.length) {
    await writeFile(file, optimized);
    deployedBytes += optimized.length;
    optimizedCount += 1;
    if (shouldResize) resizedCount += 1;
  } else {
    deployedBytes += original.length;
  }
}

console.log(JSON.stringify({
  pngCount: pngs.length,
  optimizedCount,
  resizedCount,
  maximumWidth,
  maximumHeight,
  originalMB: Number((originalBytes / 1024 / 1024).toFixed(2)),
  deployedMB: Number((deployedBytes / 1024 / 1024).toFixed(2)),
}));
