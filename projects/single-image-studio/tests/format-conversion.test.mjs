import assert from "node:assert/strict";
import test from "node:test";

import {
  FORMAT_CONVERSION_OPTIONS,
  conversionFormatLabel,
  formatConversionReport,
  formatConversionSettings,
  normalizeConversionFormat,
} from "../web/format-conversion.js";

test("format conversion exposes only PNG and JPEG with a complete local editor contract", () => {
  assert.deepEqual(FORMAT_CONVERSION_OPTIONS.map(({ id }) => id), ["png", "jpeg"]);
  assert.deepEqual(formatConversionSettings({ sourceLongEdge: 4032, format: "jpeg" }), {
    formatConversion: "on",
    ratio: "original",
    sizeMode: "custom",
    outputLongEdge: 4032,
    format: "jpeg",
    jpegQuality: 0.9,
    jpegBackground: "#ffffff",
  });
  assert.equal(normalizeConversionFormat("PNG"), "png");
  assert.equal(conversionFormatLabel("image/webp"), "WebP");
  assert.throws(() => normalizeConversionFormat("webp"), /PNG 或 JPEG/);
});

test("JPEG conversion reports lossy quality and transparent-area fill without claiming cutout", () => {
  assert.deepEqual(formatConversionReport({
    sourceMime: "image/png",
    resultMime: "jpeg",
    sourceBytes: 2_000_000,
    resultBytes: 500_000,
    sourceWidth: 1600,
    sourceHeight: 1200,
    resultWidth: 1600,
    resultHeight: 1200,
    jpegQuality: 0.9,
    jpegBackground: "#ffffff",
  }), {
    sourceFormat: "PNG",
    resultFormat: "JPEG",
    sourceSize: "1.91 MB",
    resultSize: "488 KB",
    sizeSummary: "文件减少 75.0%",
    dimensionsChanged: false,
    dimensionsSummary: "1600 × 1200 → 1600 × 1200",
    transparencySummary: "JPEG 不支持透明；若原图含透明或半透明区域，将使用 #FFFFFF 填充。",
    qualitySummary: "90% 有损编码；数值越低，通常文件越小、细节损失越明显。",
    qualityPercent: 90,
    background: "#FFFFFF",
  });
});

test("PNG conversion keeps its capability boundary and reports dimension changes", () => {
  const report = formatConversionReport({
    sourceMime: "image/jpeg",
    resultMime: "png",
    sourceBytes: 500_000,
    resultBytes: 1_200_000,
    sourceWidth: 4000,
    sourceHeight: 3000,
    resultWidth: 3266,
    resultHeight: 2449,
  });
  assert.equal(report.resultFormat, "PNG");
  assert.equal(report.dimensionsChanged, true);
  assert.match(report.sizeSummary, /文件增大/);
  assert.match(report.transparencySummary, /不会自动抠图/);
  assert.equal(report.qualityPercent, null);
});
