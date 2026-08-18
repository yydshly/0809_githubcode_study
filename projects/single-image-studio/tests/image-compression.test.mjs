import assert from "node:assert/strict";
import test from "node:test";

import {
  COMPRESSION_ATTEMPT_STEPS,
  IMAGE_COMPRESSION_PRESETS,
  applyCompressionPreset,
  compressImageToTarget,
  compressionImpactReport,
  compressionReport,
  compressionTargetBytes,
  compressionTargetPressure,
  formatImageBytes,
  matchCompressionPreset,
  normalizeCompressionLongEdge,
  normalizeCompressionQuality,
  normalizeCompressionTargetKilobytes,
} from "../web/image-compression.js";

test("compression presets describe target-size scenarios instead of fixed layouts", () => {
  assert.deepEqual(IMAGE_COMPRESSION_PRESETS.map(({ id }) => id), ["upload-2mb", "upload-1mb", "attachment-500kb"]);
  const settings = applyCompressionPreset({ brightness: 5 }, "upload-1mb");
  assert.deepEqual(settings, {
    brightness: 5,
    ratio: "original",
    sizeMode: "custom",
    outputLongEdge: 8192,
    format: "jpeg",
    jpegQuality: 0.9,
    compressionTargetKilobytes: 1024,
  });
  assert.equal(matchCompressionPreset(settings), "upload-1mb");
  assert.equal(matchCompressionPreset({ compressionTargetKilobytes: 900 }), null);
});

test("compression controls reject misleading or unsafe ranges", () => {
  assert.equal(normalizeCompressionLongEdge("1920"), 1920);
  assert.equal(normalizeCompressionLongEdge("8192"), 8192);
  assert.equal(normalizeCompressionQuality("0.84"), 0.84);
  assert.equal(normalizeCompressionTargetKilobytes("500"), 500);
  assert.equal(compressionTargetBytes(500), 512_000);
  assert.throws(() => normalizeCompressionLongEdge(319), /320–8192/);
  assert.throws(() => normalizeCompressionLongEdge(8193), /320–8192/);
  assert.throws(() => normalizeCompressionQuality(0.39), /40%–95%/);
  assert.throws(() => normalizeCompressionTargetKilobytes(99), /100–10240/);
  assert.throws(() => normalizeCompressionTargetKilobytes(10241), /100–10240/);
});

test("compression report distinguishes size savings from actually meeting the target", () => {
  assert.deepEqual(compressionReport({ sourceBytes: 2_000_000, resultBytes: 500_000, targetBytes: 600_000 }), {
    sourceBytes: 2_000_000,
    resultBytes: 500_000,
    targetBytes: 600_000,
    targetMet: true,
    direction: "saved",
    deltaPercent: 75,
    sourceLabel: "1.91 MB",
    resultLabel: "488 KB",
    targetLabel: "586 KB",
    summary: "节省 75.0%",
    targetSummary: "已达到不超过 586 KB 的目标",
  });
  const missed = compressionReport({ sourceBytes: 2_000_000, resultBytes: 700_000, targetBytes: 600_000 });
  assert.equal(missed.targetMet, false);
  assert.equal(missed.targetSummary, "未达到不超过 586 KB 的目标");
  assert.equal(compressionReport({ sourceBytes: 1000, resultBytes: 1000 }).summary, "文件大小不变");
});

test("compression pressure explains the file-size demand without pretending it is quality loss", () => {
  assert.deepEqual(compressionTargetPressure({ sourceBytes: 8_000_000, targetBytes: 1_000_000 }), {
    alreadyFits: false,
    minimumReductionPercent: 87.5,
    level: "high",
    label: "体积要求很高",
  });
  assert.equal(compressionTargetPressure({ sourceBytes: 800_000, targetBytes: 1_000_000 }).alreadyFits, true);
});

test("compression impact separates file savings from resolution and JPEG quality", () => {
  const sizePreserved = compressionImpactReport({
    sourceWidth: 4000,
    sourceHeight: 3000,
    resultWidth: 4000,
    resultHeight: 3000,
    jpegQuality: 0.82,
    sourceBytes: 8_000_000,
    resultBytes: 1_000_000,
  });
  assert.equal(sizePreserved.level, "light");
  assert.equal(sizePreserved.pixelRetentionPercent, 100);
  assert.equal(sizePreserved.fileReductionPercent, 87.5);
  assert.match(sizePreserved.explanation, /保持原像素尺寸/);

  const visiblyReduced = compressionImpactReport({
    sourceWidth: 4000,
    sourceHeight: 3000,
    resultWidth: 1280,
    resultHeight: 960,
    jpegQuality: 0.56,
    sourceBytes: 8_000_000,
    resultBytes: 300_000,
  });
  assert.equal(visiblyReduced.level, "high");
  assert.equal(visiblyReduced.pixelRetentionPercent, 10.2);
  assert.match(visiblyReduced.explanation, /放大、打印和二次裁剪/);
});

test("target compressor stops at the first verified result and disposes superseded URLs", async () => {
  const sizes = [3_000_000, 1_500_000, 900_000];
  const revoked = [];
  const renderedSteps = [];
  const result = await compressImageToTarget({
    targetKilobytes: 1024,
    maxLongEdge: 1800,
    revokeObjectUrl: (url) => revoked.push(url),
    renderAttempt: async (step) => {
      renderedSteps.push(step);
      const index = renderedSteps.length - 1;
      return { byteLength: sizes[index], url: `blob:${index}`, width: step.outputLongEdge };
    },
  });
  assert.equal(result.byteLength, 900_000);
  assert.equal(result.compressionDecision.targetMet, true);
  assert.equal(result.compressionDecision.attemptCount, 3);
  assert.equal(result.compressionDecision.selectedLongEdge, 1530);
  assert.deepEqual(renderedSteps.map(({ outputLongEdge }) => outputLongEdge), [1800, 1800, 1530]);
  assert.deepEqual(revoked, ["blob:0", "blob:1"]);
});

test("target compressor returns the smallest honest fallback when all ten attempts miss", async () => {
  const revoked = [];
  let attempt = 0;
  const result = await compressImageToTarget({
    targetKilobytes: 100,
    maxLongEdge: 1280,
    revokeObjectUrl: (url) => revoked.push(url),
    renderAttempt: async (step) => ({
      byteLength: 900_000 - attempt++ * 50_000,
      url: `blob:${attempt}`,
      width: step.outputLongEdge,
    }),
  });
  assert.equal(result.compressionDecision.targetMet, false);
  assert.equal(result.compressionDecision.attemptCount, COMPRESSION_ATTEMPT_STEPS.length);
  assert.equal(result.byteLength, 450_000);
  assert.equal(result.compressionDecision.selectedLongEdge, 640);
  assert.equal(revoked.length, COMPRESSION_ATTEMPT_STEPS.length - 1);
});

test("human-readable byte formatting stays compact", () => {
  assert.equal(formatImageBytes(640), "640 B");
  assert.equal(formatImageBytes(1536), "1.5 KB");
  assert.equal(formatImageBytes(2 * 1024 * 1024), "2.00 MB");
});
