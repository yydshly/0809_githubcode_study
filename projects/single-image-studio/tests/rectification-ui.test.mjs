import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("document and flat-plane rectification separates geometry from optional document enhancement", async () => {
  const [catalog, main, html, css, contract, scan] = await Promise.all([
    readFile(new URL("web/task-catalog.js", root), "utf8"),
    readFile(new URL("web/main.js", root), "utf8"),
    readFile(new URL("web/index.html", root), "utf8"),
    readFile(new URL("web/styles.css", root), "utf8"),
    readFile(new URL("DOCUMENT_RECTIFICATION.md", root), "utf8"),
    readFile(new URL("web/document-scan.js", root), "utf8"),
  ]);
  assert.match(catalog, /id: "UT-RECTIFY"[\s\S]*label: "文档 \/ 平面裁正"[\s\S]*local-plane-rectification-v3/);
  assert.match(main, /调整四角[\s\S]*查看裁正结果/);
  assert.match(scan, /只裁正 · 保持原色[\s\S]*文档 · 清晰彩色[\s\S]*文档 · 灰度[\s\S]*文档 · 高对比黑白/);
  assert.match(main, /data-document-scan-mode/);
  assert.match(main, /四角裁正 <small>核心步骤<\/small>/);
  assert.match(main, /文档可读性增强 <small>可选<\/small>/);
  assert.match(main, /不会自动找纸张边缘/);
  assert.match(html, /data-rectification-point="topLeft"/);
  assert.match(html, /id="editor-rectification-preview"/);
  assert.match(css, /\.rectification-handle:focus-visible/);
  assert.match(css, /\.document-scan-mode\[aria-pressed="true"\]/);
  assert.match(contract, /不自动识别边缘/);
  assert.match(contract, /预览与下载使用同一组坐标/);
});
