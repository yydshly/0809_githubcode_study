import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../web/quality-hub.html", import.meta.url), "utf8");
const script = await readFile(new URL("../web/quality-hub.js", import.meta.url), "utf8");
const css = await readFile(new URL("../web/quality-hub.css", import.meta.url), "utf8");
const errorPage = await readFile(new URL("../web/error-reference.html", import.meta.url), "utf8");
const examplesPage = await readFile(new URL("../web/examples.html", import.meta.url), "utf8");
const walkthroughPage = await readFile(new URL("../web/internal-walkthrough.html", import.meta.url), "utf8");
const productAcceptance = await readFile(new URL("../web/product-acceptance.html", import.meta.url), "utf8");

test("quality hub separates automated QA, review fixtures and human walkthroughs", () => {
  assert.match(page, /自动回归检查代码有没有破坏/);
  assert.match(page, /四种结果不能互相替代/);
  assert.match(page, /0 \/ 2–3/);
  assert.match(page, /不能自动填充/);
  assert.equal((page.match(/data-quality-card=/g) ?? []).length, 4);
  assert.match(page, /所有页面都有角色、上级入口和能力归属/);
  for (const route of ["product-acceptance.html", "examples.html", "error-reference.html", "internal-walkthrough.html"]) assert.match(page, new RegExp(route.replace(".", "\\.")));
});

test("quality hub reads only bounded loopback QA reports and has a narrow layout", () => {
  for (const endpoint of ["product-acceptance", "examples-acceptance", "error-acceptance", "walkthrough-acceptance"]) assert.match(script, new RegExp(`/api/internal/${endpoint}/latest`));
  assert.match(script, /qualityHubReady/);
  assert.match(script, /PAGE_REGISTRY/);
  assert.match(script, /data-page-directory-entry/);
  assert.doesNotMatch(script, /\/api\/runs|background-removal\/runs|localStorage|sessionStorage/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.quality-boundaries, \.quality-grid, \.page-directory-group > div \{ grid-template-columns: 1fr/);
});

test("every internal surface links back to the quality hub", () => {
  for (const content of [errorPage, examplesPage, walkthroughPage, productAcceptance]) assert.match(content, /quality-hub\.html/);
});
