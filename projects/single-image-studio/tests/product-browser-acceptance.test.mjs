import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../web/product-acceptance.html", import.meta.url), "utf8");
const script = await readFile(new URL("../web/product-acceptance.js", import.meta.url), "utf8");

test("browser acceptance page covers two real local product journeys", () => {
  assert.match(page, /只用项目合成图/);
  assert.match(page, /不调用远程服务/);
  assert.match(script, /width: 1280/);
  assert.match(script, /height: 720/);
  assert.match(script, /width: 1440/);
  assert.match(script, /height: 900/);
  assert.match(script, /taskId: "UT-TUNE"/);
  assert.match(script, /taskId: "UT-TEMPLATE"/);
  assert.match(script, /#use-demo-button/);
  assert.match(script, /#download-button/);
  assert.match(script, /reopenPng/);
  assert.match(script, /consoleErrors\.length === 0/);
});

test("browser acceptance cannot invoke remote product routes", () => {
  assert.doesNotMatch(script, /background-removal\/runs/);
  assert.doesNotMatch(script, /\/api\/runs/);
  assert.doesNotMatch(script, /UT-CUTOUT/);
  assert.doesNotMatch(script, /UT-PORTRAIT/);
  assert.doesNotMatch(script, /CR1/);
});
