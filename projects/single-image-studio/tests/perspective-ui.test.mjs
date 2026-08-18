import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [main, html, styles, contract, taskCatalog] = await Promise.all([
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../PERSPECTIVE_TOOL.md", import.meta.url), "utf8"),
  readFile(new URL("../web/task-catalog.js", import.meta.url), "utf8"),
]);

test("editor exposes a bounded manual vertical perspective control with an exact canvas preview", () => {
  assert.match(taskCatalog, /id: "UT-TUNE",[\s\S]*?label: "基础编辑",[\s\S]*?裁剪、旋转、拉直、透视/u);
  assert.match(main, /templateTask \? "场景与构图" : "构图与方向"/u);
  assert.match(main, /name="verticalPerspective" type="range" min="-20" max="20" step="1"/u);
  assert.match(main, /data-perspective-reset>归零/u);
  assert.match(main, /正值扩展上方，负值扩展下方/u);
  assert.match(main, /href="\.\/straighten-reference\.html\?refresh=perspective-v1"/u);
  assert.match(main, /renderPerspectivePreview\(\{/u);
  assert.match(html, /id="editor-perspective-preview"/u);
  assert.match(styles, /\.editor-perspective-preview \{[^}]*position: absolute;[^}]*width: 100%;[^}]*height: 100%/u);
});

test("perspective contract keeps automatic and four-corner correction out of scope", () => {
  assert.match(contract, /不是自动识别、四角透视、文档扫描/u);
  assert.match(contract, /预览不能用 CSS 近似梯形/u);
  assert.match(contract, /0.*沿用原渲染路径/u);
  assert.match(contract, /浏览器截图\/DOM 控制证据/u);
});
