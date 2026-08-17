import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [walkthrough, status, plan, readme] = await Promise.all([
  readFile(new URL("../M2_INTERNAL_WALKTHROUGH.md", import.meta.url), "utf8"),
  readFile(new URL("../STATUS.md", import.meta.url), "utf8"),
  readFile(new URL("../IMPLEMENTATION_PLAN.md", import.meta.url), "utf8"),
  readFile(new URL("../README.md", import.meta.url), "utf8"),
]);

test("M2 walkthrough is executable but truthfully remains unstarted", () => {
  assert.match(walkthrough, /materials-ready \/ sessions-not-started \/ participant-denominator=0\/5–8/);
  assert.match(walkthrough, /把图片整理成方形，顺时针旋转 90°，导出 PNG/);
  assert.match(walkthrough, /不录音、不录像/);
  assert.match(walkthrough, /不要上传你自己的照片/);
  assert.match(walkthrough, /120 秒/);
  assert.match(walkthrough, /completed-unassisted \| completed-assisted \| incomplete \| invalid-session/);
  assert.match(walkthrough, /5 人中 4 人、6 人中 5 人、7 人中 6 人、8 人中 7 人/);
  assert.match(walkthrough, /当前真实分母是 `0\/5–8`/);
  assert.match(walkthrough, /不授予 C1、U1、E1、R1、O1、G1、V1、Release Gate/);
});

test("active product documents link the M2 kit without claiming participant evidence", () => {
  for (const document of [status, plan, readme]) {
    assert.match(document, /M2_INTERNAL_WALKTHROUGH\.md/);
    assert.match(document, /0\/5–8/);
  }
  assert.doesNotMatch(status, /M2[^\n]{0,80}(已通过|已完成)/);
  assert.doesNotMatch(readme, /M2[^\n]{0,80}(已通过|已完成)/);
});
