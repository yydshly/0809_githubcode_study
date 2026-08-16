import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const probeRoot = path.join(projectRoot, "provider-evaluation", "sandbox-v0");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(probeRoot, relativePath), "utf8"));
}

test("generated sandbox fixtures are project-bound and match the frozen manifest", async () => {
  const manifest = await json("generation-manifest.json");
  assert.equal(manifest.schemaVersion, "provider-generated-fixtures.v0");
  assert.equal(manifest.generator, "OpenAI built-in image_gen");
  assert.deepEqual(manifest.rights, {
    projectGenerated: true,
    containsRealPerson: false,
    containsUserPhoto: false,
    containsThirdPartyPhoto: false,
    productAsset: false,
  });
  assert.equal(manifest.cases.length, 4);
  assert.equal(new Set(manifest.cases.map(({ id }) => id)).size, 4);

  for (const fixture of manifest.cases) {
    const bytes = await readFile(path.join(probeRoot, fixture.path));
    assert.equal(bytes.byteLength, fixture.byteLength, fixture.id);
    assert.equal(sha256(bytes), fixture.sha256, fixture.id);
    assert.equal(fixture.width, 1254);
    assert.equal(fixture.height, 1254);
    assert.ok(fixture.prompt.length > 100);
  }
});

test("sandbox observations close four calls without retry or a quality claim", async () => {
  const manifest = await json("generation-manifest.json");
  const summary = await json("results/evaluation-result.json");
  const review = await json("reviewed-evidence.json");

  assert.equal(summary.provider.environment, "sandbox");
  assert.equal(summary.attemptedCalls, 4);
  assert.equal(summary.retries, 0);
  assert.equal(summary.allSucceeded, true);
  assert.equal(summary.records.length, 4);
  assert.equal(review.execution.succeededCalls, 4);
  assert.equal(review.execution.retries, 0);
  assert.equal(review.conclusion.transportAndAlphaStructure, "pass");
  assert.equal(review.conclusion.productionQuality, "not-demonstrated");
  assert.equal(review.conclusion.formalProviderPlanContribution, 0);

  const manifestById = new Map(manifest.cases.map((fixture) => [fixture.id, fixture]));
  for (const recordPath of summary.records) {
    const record = await json(path.join("results", recordPath));
    const fixture = manifestById.get(record.caseId);
    assert.ok(fixture, record.caseId);
    assert.equal(record.status, "succeeded");
    assert.equal(record.input.sha256, fixture.sha256);
    assert.equal(record.output.mime, "image/png");
    assert.equal(record.output.hasAlpha, true);
    assert.equal(record.output.watermarked, true);
    assert.equal(record.interpretation, "sandbox-watermarked-structure-only-not-production-quality");
    assert.match(record.requestId, /^client-run:/);
  }

  for (const reviewedCase of review.cases) {
    assert.equal(reviewedCase.alpha.totalPixels, 1254 * 1254);
    assert.equal(
      reviewedCase.alpha.transparentPixels
        + reviewedCase.alpha.partialPixels
        + reviewedCase.alpha.opaquePixels,
      reviewedCase.alpha.totalPixels,
    );
    assert.equal(reviewedCase.visualReview.productionReady, false);
    assert.ok(reviewedCase.visualReview.findings.length >= 2);
  }
});

test("the sandbox runner requires explicit one-shot execution and is not part of default verification", async () => {
  const script = await readFile(path.join(projectRoot, "scripts", "run-provider-sandbox-probe.mjs"), "utf8");
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));

  assert.match(script, /--execute-once/);
  assert.match(script, /environment !== "sandbox"/);
  assert.match(script, /flag: "wx"/);
  assert.match(script, /results directory is not empty/i);
  assert.equal(
    packageJson.scripts["provider:sandbox:probe"],
    "node scripts/run-provider-sandbox-probe.mjs --execute-once",
  );
  assert.doesNotMatch(packageJson.scripts.test, /provider:sandbox:probe/);
  assert.doesNotMatch(packageJson.scripts["verify:product"], /provider:sandbox:probe/);
});
