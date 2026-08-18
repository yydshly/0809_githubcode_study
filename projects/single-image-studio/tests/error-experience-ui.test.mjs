import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, styles, main, presentation, referenceHtml, referenceScript, acceptanceScript, server] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/error-presentation.js", import.meta.url), "utf8"),
  readFile(new URL("../web/error-reference.html", import.meta.url), "utf8"),
  readFile(new URL("../web/error-reference.js", import.meta.url), "utf8"),
  readFile(new URL("../web/error-acceptance.js", import.meta.url), "utf8"),
  readFile(new URL("../server/server.mjs", import.meta.url), "utf8"),
]);

test("the real error page answers image state, retry safety, next action and run identity", () => {
  assert.match(html, /class="error-facts"[^>]*role="list"/);
  assert.match(html, /图片状态[\s\S]*id="error-data-boundary"/);
  assert.match(html, /安全重试[\s\S]*id="error-retry-safety"/);
  assert.match(html, /下一步[\s\S]*id="error-action-hint"/);
  assert.match(html, /任务编号[\s\S]*id="error-run-id"/);
  assert.match(html, /id="error-technical"[\s\S]*查看技术信息/);
  assert.match(html, /id="error-technical-code"/);
  assert.match(html, /id="error-technical-task"/);
});

test("main routes input, local, remote-failed and remote-unknown facts without changing recovery buttons", () => {
  assert.match(main, /context: ERROR_CONTEXTS\.INPUT/);
  assert.match(main, /ERROR_CONTEXTS\.LOCAL_PROCESSING/);
  assert.match(main, /ERROR_CONTEXTS\.REMOTE_FAILED/);
  assert.match(main, /ERROR_CONTEXTS\.REMOTE_UNKNOWN/);
  assert.match(main, /applyErrorPagePresentation/);
  assert.match(main, /applyRecoveryPresentation/);
  assert.match(main, /errorPanel\.dataset\.errorContext/);
  assert.match(main, /runId,/);
  assert.match(main, /settingsErrorFieldNames/);
  assert.match(main, /aria-errormessage/);
  assert.match(main, /showOutputValidationError/);
  assert.match(main, /errorContext === ERROR_CONTEXTS\.OUTPUT_VALIDATION/);
  assert.match(main, /远程状态暂不可确认 · 本地工具仍可用/);
});

test("technical details remain secondary and facts stack on narrow screens", () => {
  assert.match(styles, /\.error-facts \{[^}]*grid-template-columns: repeat\(3/);
  assert.match(styles, /\.error-technical summary \{[^}]*cursor: pointer/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.error-facts, \.error-technical dl \{ grid-template-columns: 1fr;/);
  assert.match(presentation, /technical\.open = false/);
  assert.doesNotMatch(presentation, /innerHTML/);
});

test("the browser reference and acceptance exercise all seven contexts at desktop and narrow widths", () => {
  assert.match(referenceHtml, /七类错误状态/);
  assert.match(referenceScript, /SCENARIOS = Object\.freeze/);
  assert.match(referenceScript, /ERROR_CONTEXTS\.INPUT/);
  assert.match(referenceScript, /ERROR_CONTEXTS\.REMOTE_UNKNOWN/);
  assert.match(referenceScript, /applyErrorPagePresentation/);
  assert.match(referenceScript, /applyRecoveryPresentation/);
  assert.match(acceptanceScript, /id: "errors-desktop"[\s\S]*width: 1180/);
  assert.match(acceptanceScript, /id: "errors-narrow"[\s\S]*width: 390/);
  assert.match(acceptanceScript, /cards\.length === 7/);
  assert.match(acceptanceScript, /本地输出失败没有返回设置/);
  assert.match(acceptanceScript, /网络错误没有保留本地能力说明/);
  assert.match(server, /\/api\/internal\/error-acceptance\/latest/);
});
