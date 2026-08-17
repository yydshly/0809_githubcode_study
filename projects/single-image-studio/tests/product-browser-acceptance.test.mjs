import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../web/product-acceptance.html", import.meta.url), "utf8");
const script = await readFile(new URL("../web/product-acceptance.js", import.meta.url), "utf8");
const evidence = await readFile(new URL("../BROWSER_ACCEPTANCE_EVIDENCE.md", import.meta.url), "utf8");

test("browser acceptance page covers two real local product journeys", () => {
  assert.match(page, /只用项目合成图/);
  assert.match(page, /不调用远程服务/);
  assert.match(script, /width: 1280/);
  assert.match(script, /height: 720/);
  assert.match(script, /width: 1440/);
  assert.match(script, /height: 900/);
  assert.match(script, /taskId: "UT-TUNE"/);
  assert.match(script, /taskId: "UT-TEMPLATE"/);
  assert.match(script, /nextTaskId: "UT-ENHANCE"/);
  assert.match(script, /#use-demo-button/);
  assert.match(script, /#download-button/);
  assert.match(script, /reopenPng/);
  assert.match(script, /consoleErrors\.length === 0/);
  assert.match(script, /#result-change-task-button/);
  assert.match(script, /pageState === "TASKS_READY"/);
  assert.match(script, /旧下载仍可触发/);
  assert.match(script, /objectFit === "contain"/);
  assert.match(script, /scrollWidth <= windowRef\.innerWidth \+ 1/);
  assert.match(script, /\/api\/internal\/product-acceptance\/latest/);
  assert.match(script, /product-acceptance-report-v1/);
  assert.match(script, /reportRunId/);
});

test("browser acceptance cannot invoke remote product routes", () => {
  assert.doesNotMatch(script, /background-removal\/runs/);
  assert.doesNotMatch(script, /\/api\/runs/);
  assert.doesNotMatch(script, /UT-CUTOUT/);
  assert.doesNotMatch(script, /UT-PORTRAIT/);
  assert.doesNotMatch(script, /CR1/);
});

test("recorded product browser evidence keeps its scope and limitations explicit", () => {
  assert.match(evidence, /8ede9a34-4642-4504-9454-8185294dd75d/);
  assert.match(evidence, /195bf2ad-c746-4a97-9f62-1e47dc38b451/);
  assert.match(evidence, /96345db4-e051-4f0a-b05e-742285f502dd/);
  assert.match(evidence, /Chrome\/151\.0\.0\.0/);
  assert.match(evidence, /Chrome `151\.0\.7922\.138`/);
  assert.match(evidence, /Edge `151\.0\.4129\.78`/);
  assert.match(evidence, /desktop-min[\s\S]*Pass:[\s\S]*1080 × 1080/);
  assert.match(evidence, /desktop-common[\s\S]*Pass:[\s\S]*1440 × 810/);
  assert.match(evidence, /loopback-only/);
  assert.match(evidence, /16 KiB/);
  assert.match(evidence, /Native keyboard focus order[\s\S]*defer/);
  assert.match(evidence, /Native pointer and OS download destination[\s\S]*defer/);
  assert.match(evidence, /C\/U\/E\/R\/O\/G\/V and product-release gates remain unchanged/);
});
