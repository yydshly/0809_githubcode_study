import assert from "node:assert/strict";
import test from "node:test";

import { PORTRAIT_SHEET_PRESET, createPortraitSheetPlan } from "../web/portrait-sheet.js";

test("portrait sheet creates six contained copies on one bounded landscape canvas", () => {
  const plan = createPortraitSheetPlan({ sourceWidth: 800, sourceHeight: 1000 });
  assert.equal(plan.width, 1800);
  assert.equal(plan.height, 1200);
  assert.equal(plan.backgroundColor, "#FFFFFF");
  assert.equal(plan.mimeType, "image/jpeg");
  assert.equal(plan.placements.length, 6);
  for (const placement of plan.placements) {
    assert.ok(Math.abs(placement.width / placement.height - 0.8) < 0.002);
    assert.ok(placement.x >= PORTRAIT_SHEET_PRESET.margin);
    assert.ok(placement.y >= PORTRAIT_SHEET_PRESET.margin);
    assert.ok(placement.x + placement.width <= plan.width - PORTRAIT_SHEET_PRESET.margin);
    assert.ok(placement.y + placement.height <= plan.height - PORTRAIT_SHEET_PRESET.margin);
  }
});

test("portrait sheet preserves square and portrait aspect without cropping or enlargement claims", () => {
  const square = createPortraitSheetPlan({ sourceWidth: 400, sourceHeight: 400 });
  assert.equal(square.placements[0].width, square.placements[0].height);
  const tall = createPortraitSheetPlan({ sourceWidth: 700, sourceHeight: 900 });
  assert.equal(tall.placements[0].width / tall.placements[0].height, 7 / 9);
});

test("portrait sheet rejects invalid source geometry", () => {
  assert.throws(() => createPortraitSheetPlan({ sourceWidth: 0, sourceHeight: 900 }), /正整数/);
  assert.throws(() => createPortraitSheetPlan({ sourceWidth: 700, sourceHeight: 1.5 }), /正整数/);
});
