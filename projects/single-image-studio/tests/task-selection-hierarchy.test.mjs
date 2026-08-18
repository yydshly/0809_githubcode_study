import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, main, styles, contract] = await Promise.all([
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../TASK_SELECTION_HIERARCHY.md", import.meta.url), "utf8"),
]);

test("unavailable extensions are compact, inspectable, and outside the primary task grid", () => {
  assert.match(html, /id="unavailable-tasks"[^>]*hidden/);
  assert.match(html, /这些入口需要额外图片服务，不影响上方本地与抠图功能/);
  assert.match(main, /partitionTasksForDisplay\(tasks\)/);
  assert.match(main, /activeGroups\.forEach/);
  assert.match(main, /renderUnavailableTasks\(unavailableTasks\)/);
  assert.match(main, /elements\.unavailableTasks\.open = false/);
  assert.match(main, /filter\(\(layer\) => layer\.available > 0\)/);
  assert.doesNotMatch(main, /groupTasksForDisplay\(tasks\)\.forEach/);
});

test("the compact fallback remains readable at the narrow breakpoint", () => {
  assert.match(styles, /\.unavailable-task-item \{[^}]*grid-template-columns: minmax\(13rem/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.unavailable-task-item \{ grid-template-columns: 1fr;/);
  assert.match(styles, /\.unavailable-tasks > summary \{[^}]*cursor: pointer/);
});

test("the hierarchy contract keeps provider and execution behavior out of scope", () => {
  assert.match(contract, /主目录没有 disabled 大卡/);
  assert.match(contract, /不改变任务、Provider、同意、运行或下载合同/);
  assert.match(contract, /用户明确要求继续开发并以整体目标为准/);
});
