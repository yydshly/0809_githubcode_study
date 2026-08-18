import assert from "node:assert/strict";
import test from "node:test";

import {
  SCENARIO_SKILLS,
  decorateScenarioTask,
  scenarioInitialSettings,
  scenarioSkillForTask,
} from "../web/scenario-skills.js";

test("scenario registry exposes eight honest current use cases", () => {
  assert.deepEqual(
    SCENARIO_SKILLS.map(({ id, taskId, order }) => ({ id, taskId, order })).sort((left, right) => left.order - right.order),
    [
      { id: "privacy-friendly-share", taskId: "UT-PRIVACY-SHARE", order: -0.5 },
      { id: "upload-specification", taskId: "UT-UPLOAD", order: 0 },
      { id: "document-archive", taskId: "UT-DOC-ARCHIVE", order: 0.5 },
      { id: "product-white-background", taskId: "UT-PRODUCT", order: 1 },
      { id: "application-photo", taskId: "UT-PORTRAIT", order: 2 },
      { id: "social-layout", taskId: "UT-TEMPLATE", order: 3 },
      { id: "social-grid-split", taskId: "UT-GRID", order: 4 },
      { id: "old-photo-restoration", taskId: "UT-OLD-PHOTO", order: 5 },
    ],
  );
  assert.equal(new Set(SCENARIO_SKILLS.map((skill) => skill.taskId)).size, 8);
  assert.equal(scenarioSkillForTask("UT-OLD-PHOTO").id, "old-photo-restoration");
  assert.equal(scenarioSkillForTask("CR-RESTORE"), null);
});

test("scenario initial settings are useful defaults and returned as mutable copies", () => {
  const product = scenarioInitialSettings("UT-PRODUCT");
  assert.deepEqual(product, {
    ratio: "square",
    cropX: 50,
    cropY: 50,
    sizeMode: "custom",
    outputLongEdge: 1600,
    format: "png",
  });
  product.outputLongEdge = 300;
  assert.equal(scenarioInitialSettings("UT-PRODUCT").outputLongEdge, 1600);

  assert.equal(scenarioInitialSettings("UT-PORTRAIT").cropY, 42);
  assert.equal(scenarioInitialSettings("UT-TEMPLATE").outputLongEdge, 1080);
  assert.deepEqual(scenarioInitialSettings("UT-GRID"), {
    ratio: "square",
    cropX: 50,
    cropY: 50,
    sizeMode: "custom",
    outputLongEdge: 1080,
    format: "png",
  });
  assert.deepEqual(scenarioInitialSettings("UT-OLD-PHOTO"), {
    ratio: "original",
    cropX: 50,
    cropY: 50,
    brightness: 4,
    contrast: 12,
    saturation: 3,
    denoise: 18,
    clarity: 14,
    sizeMode: "preset",
    format: "png",
  });
  assert.equal(scenarioInitialSettings("UT-TUNE"), null);
});

test("scenario decoration preserves runtime availability while adding presentation metadata", () => {
  const task = Object.freeze({ id: "UT-PRODUCT", runnable: false, statusLabel: "抠图服务未配置" });
  const decorated = decorateScenarioTask(task);
  assert.equal(decorated.runnable, false);
  assert.equal(decorated.statusLabel, "抠图服务未配置");
  assert.equal(decorated.scenarioSkillId, "product-white-background");
  assert.equal(decorated.scenarioOrder, 1);
  assert.equal(decorated.defaultBackground, "white");
  assert.equal(Object.isFrozen(decorated), true);
  assert.equal(decorateScenarioTask({ id: "UT-TUNE" }).scenarioSkillId, undefined);
});
