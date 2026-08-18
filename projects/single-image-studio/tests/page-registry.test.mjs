import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";

import { PAGE_CATEGORIES, PAGE_REGISTRY, getPagesForTask, getRegisteredPage } from "../web/page-registry.js";
import { getTaskCatalog } from "../web/task-catalog.js";

test("every HTML page is registered exactly once and no generated page is orphaned", async () => {
  const htmlFiles = (await readdir(new URL("../web/", import.meta.url))).filter((name) => name.endsWith(".html")).sort();
  const registeredFiles = PAGE_REGISTRY.map((page) => page.href.slice(2)).sort();
  assert.deepEqual(registeredFiles, htmlFiles);
  assert.equal(PAGE_REGISTRY.length, 13);
  assert.equal(new Set(PAGE_REGISTRY.map((page) => page.id)).size, PAGE_REGISTRY.length);
});

test("page parent graph closes at the product entry without cycles", () => {
  assert.equal(getRegisteredPage("studio").parentId, null);
  for (const page of PAGE_REGISTRY) {
    const visited = new Set();
    let cursor = page;
    while (cursor.parentId !== null) {
      assert.equal(visited.has(cursor.id), false, `${page.id} has a parent cycle`);
      visited.add(cursor.id);
      cursor = getRegisteredPage(cursor.parentId);
      assert.ok(cursor, `${page.id} parent is missing`);
    }
    assert.equal(cursor.id, "studio");
  }
});

test("every page capability references the real task catalog", () => {
  const taskIds = new Set(getTaskCatalog().map((task) => task.id));
  for (const page of PAGE_REGISTRY) for (const taskId of page.taskIds) assert.equal(taskIds.has(taskId), true, `${page.id} -> ${taskId}`);
  const privacyPages = getPagesForTask("UT-PRIVACY-SHARE").map((page) => page.id);
  for (const id of ["studio", "examples", "walkthrough", "walkthrough-summary", "product-acceptance", "walkthrough-acceptance"]) assert.equal(privacyPages.includes(id), true, id);
});

test("registry covers product, review, walkthrough, automated QA and reference roles", () => {
  assert.deepEqual(new Set(PAGE_REGISTRY.map((page) => page.category)), new Set(Object.values(PAGE_CATEGORIES)));
  assert.equal(getRegisteredPage("old-photo-reference").parentId, "examples");
  assert.equal(getRegisteredPage("browser-diagnostics").audience, "developer");
});
