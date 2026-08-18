import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../web/internal-walkthrough-summary.html", import.meta.url), "utf8");
const script = await readFile(new URL("../web/internal-walkthrough-summary.js", import.meta.url), "utf8");
const css = await readFile(new URL("../web/internal-walkthrough-summary.css", import.meta.url), "utf8");

test("walkthrough summary page keeps anonymous JSON local and bounded", () => {
  assert.match(page, /选择 1–8 份/);
  assert.match(page, /不会上传、保存或显示自由文本/);
  assert.match(page, /application\/json,.json/);
  assert.match(page, /不同 build 会分组警告/);
  assert.match(script, /MAX_FILES = 8/);
  assert.match(script, /MAX_FILE_BYTES = 64 \* 1024/);
  assert.match(script, /MAX_TOTAL_BYTES = 512 \* 1024/);
  assert.doesNotMatch(script, /fetch\(|localStorage|sessionStorage|indexedDB/);
});

test("walkthrough summary renders only aggregate facts and supports local reset/download", () => {
  assert.match(script, /summarizeInternalWalkthroughRecords/);
  assert.match(script, /completedUnassisted/);
  assert.match(script, /issueCounts/);
  assert.match(script, /internal-walkthrough-summary\.json/);
  assert.match(script, /walkthroughSummaryState = "empty"/);
  assert.doesNotMatch(script, /boundedNote|overallNote|sessionId/);
});

test("walkthrough summary stacks metrics and tasks at the narrow viewport", () => {
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.summary-metrics, \.summary-task-grid \{ grid-template-columns: 1fr/);
});
