import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildPublicPreview } from "../scripts/build-public-preview.mjs";
import { DEPLOYMENT_MODES, deploymentMode, isPublicHybrid, isPublicLocalOnly } from "../web/deployment-mode.js";

test("deployment mode defaults local and requires an explicit public marker", () => {
  assert.equal(deploymentMode({ dataset: {} }), DEPLOYMENT_MODES.LOCAL_SERVICE);
  assert.equal(isPublicLocalOnly({ dataset: { deploymentMode: "public-local-only" } }), true);
  assert.equal(isPublicHybrid({ dataset: { deploymentMode: "public-hybrid" } }), true);
  assert.equal(isPublicLocalOnly({ dataset: { deploymentMode: "public-hybrid" } }), false);
  assert.equal(isPublicLocalOnly({ dataset: { deploymentMode: "something-else" } }), false);
});

test("public preview contains product surfaces and excludes internal QA pages", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "single-image-public-preview-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const report = await buildPublicPreview({ outputRoot: root });
  assert.deepEqual(report.pages, ["index.html", "examples.html", "straighten-reference.html", "old-photo-reference.html"]);
  const index = await readFile(join(root, "index.html"), "utf8");
  const examples = await readFile(join(root, "examples.html"), "utf8");
  assert.match(index, /data-deployment-mode="public-hybrid"/);
  assert.doesNotMatch(examples, /quality-hub\.html/);
  for (const forbidden of ["quality-hub.html", "product-acceptance.html", "browser-diagnostics.html", "internal-walkthrough.html"]) await assert.rejects(access(join(root, forbidden)));
  assert.ok(report.modules.includes("deployment-mode.js"));
  assert.ok(report.modules.includes("task-catalog.js"));
  assert.equal((await readdir(join(root, "demo-assets"))).length > 0, true);
});

test("Vercel config deploys only the generated public directory with security headers", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.framework, null);
  assert.equal(config.buildCommand, "npm run build:public");
  assert.equal(config.outputDirectory, "dist-public");
  assert.deepEqual(config.build, { env: { NPM_CONFIG_OMIT: "dev" } });
  assert.match(config.installCommand, /Node built-ins only/);
  const headers = Object.fromEntries(config.headers[0].headers.map((entry) => [entry.key, entry.value]));
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.deepEqual(config.functions, {
    "api/background-removal/status.mjs": { maxDuration: 10 },
    "api/background-removal/runs.mjs": { maxDuration: 30, memory: 1024 },
  });
});
