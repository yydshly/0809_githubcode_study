import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../web/internal-walkthrough.html", import.meta.url), "utf8");
const script = await readFile(new URL("../web/internal-walkthrough.js", import.meta.url), "utf8");
const acceptance = await readFile(new URL("../web/internal-walkthrough-acceptance.js", import.meta.url), "utf8");

test("internal walkthrough page makes consent, project images and non-evidence scope visible", () => {
  assert.match(page, /当前真实场次：0 \/ 2–3/);
  assert.match(page, /不收姓名、联系方式、用户照片、录音或录像/);
  assert.match(page, /清除元数据.*不等于.*画面匿名/);
  assert.match(page, /walkthrough-consent/);
  assert.match(page, /walkthrough-project-images/);
  assert.doesNotMatch(page, /type="file"/);
});

test("walkthrough controller runs two neutral tasks and exports only a validated JSON record", () => {
  assert.match(script, /INTERNAL_WALKTHROUGH_TASKS\.map\(taskMarkup\)/);
  assert.match(script, /validateInternalWalkthroughRecord/);
  assert.match(script, /application\/json/);
  assert.match(script, /walkthrough=\$\{task\.id\}/);
  assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(script, /\/api\/runs|background-removal\/runs/);
});

test("walkthrough browser acceptance covers desktop and narrow layouts without becoming human evidence", () => {
  assert.match(acceptance, /width: 1180/);
  assert.match(acceptance, /width: 390/);
  assert.match(acceptance, /input\[type=\"file\"\]/);
  assert.match(acceptance, /walkthrough-acceptance-report-v1/);
  assert.match(acceptance, /\/api\/internal\/walkthrough-acceptance\/latest/);
});
