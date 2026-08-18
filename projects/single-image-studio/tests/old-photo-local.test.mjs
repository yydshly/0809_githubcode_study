import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OLD_PHOTO_LOCAL_PRESETS,
  applyOldPhotoLocalPreset,
  matchOldPhotoLocalPreset,
  oldPhotoOutputSetEntries,
  oldPhotoLocalPresetById,
} from "../web/old-photo-local.js";

test("old photo local presets are bounded, transparent adjustment contracts", () => {
  assert.deepEqual(OLD_PHOTO_LOCAL_PRESETS.map(({ id }) => id), ["faded", "monochrome", "soft", "original"]);
  assert.equal(Object.isFrozen(OLD_PHOTO_LOCAL_PRESETS), true);
  for (const preset of OLD_PHOTO_LOCAL_PRESETS) {
    assert.equal(Object.isFrozen(preset), true);
    assert.equal(Object.isFrozen(preset.adjustments), true);
    assert.deepEqual(Object.keys(preset.adjustments), ["brightness", "contrast", "saturation", "denoise", "clarity"]);
    assert.equal(Object.values(preset.adjustments).every((value) => Number.isInteger(value) && value >= -100 && value <= 100), true);
  }
});

test("old photo presets preserve unrelated edit settings and can be matched", () => {
  const applied = applyOldPhotoLocalPreset({ ratio: "original", format: "png", brightness: 99 }, "faded");
  assert.deepEqual(applied, {
    ratio: "original",
    format: "png",
    brightness: 4,
    contrast: 12,
    saturation: 3,
    denoise: 18,
    clarity: 14,
  });
  assert.equal(matchOldPhotoLocalPreset(applied), "faded");
  assert.equal(matchOldPhotoLocalPreset({ ...applied, contrast: 11 }), null);
  assert.throws(() => oldPhotoLocalPresetById("repair-everything"), /不支持的老照片本地预设/);
});

test("old photo output set reuses geometry and only varies four transparent five-parameter presets", () => {
  const entries = oldPhotoOutputSetEntries({
    ratio: "free",
    cropLeft: 12,
    cropTop: 8,
    cropWidth: 74,
    cropHeight: 82,
    rotation: 90,
    sizeMode: "custom",
    outputLongEdge: 1200,
    format: "jpeg",
    jpegBackground: "#f5f0e6",
  });
  assert.equal(Object.isFrozen(entries), true);
  assert.deepEqual(entries.map(({ id }) => id), ["faded", "monochrome", "soft", "original"]);
  assert.equal(new Set(entries.map(({ filenameSuffix }) => filenameSuffix)).size, 4);
  for (const entry of entries) {
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(entry.settings.ratio, "free");
    assert.equal(entry.settings.rotation, 90);
    assert.equal(entry.settings.outputLongEdge, 1200);
    assert.equal(entry.settings.format, "jpeg");
    assert.equal(entry.settings.jpegBackground, "#f5f0e6");
  }
  assert.deepEqual(entries[1].settings, {
    ratio: "free",
    cropLeft: 12,
    cropTop: 8,
    cropWidth: 74,
    cropHeight: 82,
    rotation: 90,
    sizeMode: "custom",
    outputLongEdge: 1200,
    format: "jpeg",
    jpegBackground: "#f5f0e6",
    brightness: 3,
    contrast: 15,
    saturation: -100,
    denoise: 16,
    clarity: 18,
  });
});

test("old photo result exposes four local previews, individual download and one verified ZIP", async () => {
  const [page, main, styles] = await Promise.all([
    readFile(new URL("../web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../web/main.js", import.meta.url), "utf8"),
    readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /id="old-photo-output-set"/);
  assert.equal((page.match(/data-old-photo-output-card=/gu) ?? []).length, 4);
  assert.match(page, /轻度降噪只平滑小颗粒/);
  assert.match(page, /不会识别并去除划痕、恢复失焦、修复人脸或补画缺失内容/);
  assert.match(main, /prepareOldPhotoOutputSet/);
  assert.match(main, /generateOldPhotoOutput/);
  assert.match(main, /downloadOldPhotoOutputSet/);
  assert.match(main, /当前图片或任务已经变化/);
  assert.match(main, /主预览保留你的手动调整/);
  assert.match(main, /createStoredZip/);
  assert.match(styles, /data-old-photo-output-download/);
});
