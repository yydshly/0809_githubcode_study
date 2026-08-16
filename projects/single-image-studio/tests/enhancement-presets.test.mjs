import assert from "node:assert/strict";
import test from "node:test";

import {
  ENHANCEMENT_PRESETS,
  applyEnhancementPreset,
  enhancementPresetById,
  matchEnhancementPreset,
} from "../web/enhancement-presets.js";

test("natural enhancement presets are bounded, explicit, and deterministic", () => {
  assert.deepEqual(ENHANCEMENT_PRESETS.map((preset) => preset.id), [
    "natural", "bright", "vivid", "soft", "original",
  ]);
  for (const preset of ENHANCEMENT_PRESETS) {
    assert.ok(Object.values(preset.adjustments).every((value) => Number.isInteger(value) && Math.abs(value) <= 12));
  }
  assert.deepEqual(
    applyEnhancementPreset({ ratio: "original", format: "png" }, "natural"),
    { ratio: "original", format: "png", brightness: 4, contrast: 6, saturation: 5 },
  );
});

test("preset matching distinguishes exact presets from manual adjustments", () => {
  assert.equal(matchEnhancementPreset({ brightness: 10, contrast: 4, saturation: 2 }), "bright");
  assert.equal(matchEnhancementPreset({ brightness: 9, contrast: 4, saturation: 2 }), null);
  assert.equal(enhancementPresetById("soft").description, "降低反差和过强色彩");
  assert.throws(() => enhancementPresetById("automatic"), /不支持/);
});
