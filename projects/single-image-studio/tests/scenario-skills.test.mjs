import assert from "node:assert/strict";
import test from "node:test";

import {
  SCENARIO_SKILLS,
  decorateScenarioTask,
  scenarioInitialSettings,
  scenarioSkillForTask,
} from "../web/scenario-skills.js";

test("scenario registry exposes exactly the four honest current use cases", () => {
  assert.deepEqual(
    SCENARIO_SKILLS.map(({ id, taskId, order }) => ({ id, taskId, order })),
    [
      { id: "product-white-background", taskId: "UT-PRODUCT", order: 1 },
      { id: "application-photo", taskId: "UT-PORTRAIT", order: 2 },
      { id: "social-layout", taskId: "UT-TEMPLATE", order: 3 },
      { id: "old-photo-restoration", taskId: "CR-RESTORE", order: 4 },
    ],
  );
  assert.equal(new Set(SCENARIO_SKILLS.map((skill) => skill.taskId)).size, 4);
  assert.equal(scenarioSkillForTask("CR-RESTORE").id, "old-photo-restoration");
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
  assert.equal(scenarioInitialSettings("CR-RESTORE"), null);
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
