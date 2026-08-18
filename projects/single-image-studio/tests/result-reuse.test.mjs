import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("a verified local result can re-enter source intake without bypassing consent", async () => {
  const [index, main] = await Promise.all([
    readFile(new URL("web/index.html", root), "utf8"),
    readFile(new URL("web/main.js", root), "utf8"),
  ]);
  assert.match(index, /id="result-use-as-source-button"[\s\S]*用此结果继续处理/);
  assert.match(main, /resultUseAsSource\.hidden = !presentation\.allowUseAsSource/);
  assert.match(main, /useLocalResultAsNewSource[\s\S]*buildResultDownloadContract[\s\S]*sha256Bytes[\s\S]*contract\.download\.byteLength/);
  assert.match(main, /new File\(\[blob\][\s\S]*await acceptSource\(file\)/);
  assert.match(main, /确认后可选择下一项处理/);
});

test("remote and creative results are excluded from direct reuse", async () => {
  const main = await readFile(new URL("web/main.js", root), "utf8");
  assert.match(main, /if \(!currentResult \|\| !selectedTask \|\| !isLocalEditorTask\(selectedTask\.id\)\) return/);
});
