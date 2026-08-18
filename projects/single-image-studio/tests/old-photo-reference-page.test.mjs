import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, styles] = await Promise.all([
  readFile(new URL("../web/old-photo-reference.html", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
]);

test("old-photo visual reference is complete, bounded, and never presented as a live result", () => {
  assert.match(html, /项目原创合成图 · Codex 视觉参考/);
  assert.match(html, /不是产品 API 的实时结果，也不是档案级真值/);
  assert.match(html, /old-photo-demo-v1\.png/);
  assert.match(html, /old-photo-codex-reference-v1\.png/);
  assert.match(html, /width="1448" height="1086"/);
  assert.match(html, /看起来更干净不代表人物身份与历史细节完全正确/);
  assert.doesNotMatch(html, /修复已成功|无损修复完成|身份完全一致/);
});

test("reference images use contain fitting and collapse to one readable column", () => {
  assert.match(styles, /\.reference-demo-image-frame img[^}]+object-fit:\s*contain/s);
  assert.match(styles, /@media \(max-width: 760px\)[^{]+\{[^}]*\.reference-demo-shell/s);
  assert.match(styles, /\.reference-demo-grid, \.reference-demo-checklist \{ grid-template-columns: 1fr; \}/);
});
