import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [main, styles, contract] = await Promise.all([
  readFile(new URL("../web/main.js", import.meta.url), "utf8"),
  readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../STRAIGHTEN_TOOL.md", import.meta.url), "utf8"),
]);

test("the editor exposes one bounded, live manual straighten control", () => {
  assert.match(main, /name="straighten" type="range" min="-10" max="10" step="0\.1"/u);
  assert.match(main, /data-straighten-reset>归零/u);
  assert.match(main, /自动等比放大并裁去少量边缘/u);
  assert.match(main, /不做自动地平线或透视校正/u);
  assert.match(main, /href="\.\/straighten-reference\.html"[^>]*>查看项目原创测试图的真实渲染演示/u);
  assert.match(main, /name === "straighten" \? "°"/u);
  assert.match(styles, /\.field-inline-action/u);
});

test("the tool contract keeps preview, export, history and non-capabilities explicit", () => {
  for (const phrase of [
    "预览与导出共同使用渲染计划",
    "现有撤销、重做和全部重置",
    "不提供：自动检测地平线",
    "不要求账号、模型或外部 API",
  ]) assert.match(contract, new RegExp(phrase, "u"));
});
