import assert from "node:assert/strict";
import test from "node:test";

import {
  SCENE_TEMPLATE_PRESETS,
  SOCIAL_OUTPUT_PRESETS,
  applySceneTemplate,
  matchSceneTemplate,
  sceneTemplateById,
  socialOutputSetEntries,
} from "../web/scene-template-presets.js";

test("scene templates expose transparent ratio and maximum-edge settings", () => {
  assert.deepEqual(SCENE_TEMPLATE_PRESETS.map(({ id, ratio, outputLongEdge }) => ({ id, ratio, outputLongEdge })), [
    { id: "social-square", ratio: "square", outputLongEdge: 1080 },
    { id: "social-portrait", ratio: "portrait", outputLongEdge: 1350 },
    { id: "wide-cover", ratio: "wide", outputLongEdge: 1920 },
    { id: "story", ratio: "story", outputLongEdge: 1920 },
    { id: "catalog-square", ratio: "square", outputLongEdge: 1600 },
  ]);
  assert.equal(Object.isFrozen(SCENE_TEMPLATE_PRESETS), true);
});

test("applying a scene template preserves manual fields outside ratio and size", () => {
  const settings = applySceneTemplate({ format: "jpeg", brightness: 8, cropX: 61 }, "wide-cover");
  assert.deepEqual(settings, {
    format: "jpeg",
    brightness: 8,
    cropX: 61,
    ratio: "wide",
    sizeMode: "custom",
    outputLongEdge: 1920,
  });
  assert.equal(matchSceneTemplate(settings), "wide-cover");
  assert.equal(matchSceneTemplate({ ...settings, outputLongEdge: 1600 }), null);
});

test("unknown scene templates fail closed", () => {
  assert.throws(() => sceneTemplateById("official-platform-magic"), /不支持/);
});

test("one social setup expands to four generic output entries without the catalog preset", () => {
  assert.deepEqual(SOCIAL_OUTPUT_PRESETS.map((preset) => preset.id), ["social-square", "social-portrait", "wide-cover", "story"]);
  const entries = socialOutputSetEntries({
    cropX: 62,
    cropY: 38,
    format: "png",
    socialTitle: "今天的城市散步",
    socialTitlePosition: "bottom",
  });
  assert.equal(entries.length, 4);
  assert.equal(Object.isFrozen(entries), true);
  for (const entry of entries) {
    assert.equal(entry.settings.cropX, 62);
    assert.equal(entry.settings.cropY, 38);
    assert.equal(entry.settings.socialTitle, "今天的城市散步");
    assert.equal(entry.settings.socialTitlePosition, "bottom");
    assert.equal(entry.settings.sizeMode, "custom");
  }
  assert.deepEqual(entries.map((entry) => [entry.id, entry.settings.ratio, entry.settings.outputLongEdge]), [
    ["social-square", "square", 1080],
    ["social-portrait", "portrait", 1350],
    ["wide-cover", "wide", 1920],
    ["story", "story", 1920],
  ]);
});
