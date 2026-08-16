import assert from "node:assert/strict";
import test from "node:test";

import {
  SCENE_TEMPLATE_PRESETS,
  applySceneTemplate,
  matchSceneTemplate,
  sceneTemplateById,
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
