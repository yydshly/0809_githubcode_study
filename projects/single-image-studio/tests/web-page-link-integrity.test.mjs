import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { PAGE_REGISTRY } from "../web/page-registry.js";

const webRoot = fileURLToPath(new URL("../web/", import.meta.url));
const registeredHtml = new Set(PAGE_REGISTRY.map((page) => page.href.slice(2)));

function localTarget(sourcePath, rawValue) {
  if (!rawValue || /^(?:#|https?:|mailto:|data:|javascript:)/i.test(rawValue)) return null;
  const clean = rawValue.split(/[?#]/, 1)[0];
  if (!clean || clean === "." || clean === "./" || clean === "/") return resolve(webRoot, "index.html");
  const normalized = clean.startsWith("/") ? clean.slice(1) : clean;
  const target = resolve(dirname(sourcePath), normalized);
  const boundary = relative(webRoot, target);
  assert.equal(boundary.startsWith("..") || boundary.includes(":"), false, `${sourcePath} escapes web root: ${rawValue}`);
  return target;
}

test("every static HTML href and src resolves inside the web root", async () => {
  for (const page of PAGE_REGISTRY) {
    const sourcePath = resolve(webRoot, page.href.slice(2));
    const html = await readFile(sourcePath, "utf8");
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const target = localTarget(sourcePath, match[1]);
      if (target) await assert.doesNotReject(access(target), `${page.id} -> ${match[1]}`);
    }
  }
});

test("every statically linked HTML target is part of the page registry", async () => {
  for (const page of PAGE_REGISTRY) {
    const sourcePath = resolve(webRoot, page.href.slice(2));
    const html = await readFile(sourcePath, "utf8");
    for (const match of html.matchAll(/\bhref=["']([^"']+\.html)(?:[?#][^"']*)?["']/gi)) {
      const target = localTarget(sourcePath, match[1]);
      const name = relative(webRoot, target).replaceAll("\\", "/");
      assert.equal(registeredHtml.has(name), true, `${page.id} links unregistered page ${name}`);
    }
  }
});
