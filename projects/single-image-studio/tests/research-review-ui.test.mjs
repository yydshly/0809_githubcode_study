import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ASSET_KEYS,
  CATALOG_SCHEMA_VERSION,
  DEFECT_TAXONOMY,
  FixtureCatalogError,
  lockReviewDraft,
  makeBlindFixturePresentation,
  parseFixtureCatalog,
  validateReviewDraft,
} from "../web/research/research-fixtures.js";

const projectUrl = new URL("../", import.meta.url);
const catalogUrl = new URL("research/manifests/review-catalog.v0.json", projectUrl);
const htmlUrl = new URL("web/research/index.html", projectUrl);
const cssUrl = new URL("web/research/styles.css", projectUrl);
const appUrl = new URL("web/research/app.js", projectUrl);

async function rawCatalog() {
  return JSON.parse(await readFile(catalogUrl, "utf8"));
}

test("the checked-in review catalog satisfies the browser's fail-closed contract", async () => {
  const catalog = parseFixtureCatalog(await rawCatalog());
  assert.equal(catalog.schemaVersion, CATALOG_SCHEMA_VERSION);
  assert.equal(catalog.evidenceStatus.level, "C1=0");
  assert.ok(catalog.fixtures.length > 0);

  for (const fixture of catalog.fixtures) {
    assert.equal(fixture.visibility, "public-synthetic");
    assert.deepEqual(Object.keys(fixture.assets).sort(), [...ASSET_KEYS].sort());
    assert.ok(Object.values(fixture.assets).every((url) => url.includes(`/${fixture.id}/`)));
  }
});

test("catalog parsing rejects missing governance fields instead of inventing defaults", async () => {
  const value = await rawCatalog();
  delete value.fixtures[0].methodDetails;
  assert.throws(
    () => parseFixtureCatalog(value),
    (error) => error instanceof FixtureCatalogError
      && error.code === "missing_field"
      && error.path === "fixtures[0].methodDetails",
  );
});

test("catalog parsing rejects unsupported evidence, visibility, and unlisted assets", async (t) => {
  await t.test("evidence", async () => {
    const value = await rawCatalog();
    value.evidenceStatus.level = "C1";
    assert.throws(() => parseFixtureCatalog(value), /must be|必须是/u);
  });

  await t.test("visibility", async () => {
    const value = await rawCatalog();
    value.fixtures[0].visibility = "private-user";
    assert.throws(() => parseFixtureCatalog(value), /public-synthetic/u);
  });

  await t.test("allowlist", async () => {
    const value = await rawCatalog();
    value.assetAllowlist = value.assetAllowlist.filter(
      (url) => url !== value.fixtures[0].assets.alpha,
    );
    assert.throws(
      () => parseFixtureCatalog(value),
      (error) => error instanceof FixtureCatalogError && error.code === "asset_not_allowed",
    );
  });
});

test("known fields are projected and harmless future envelope fields do not enter the UI model", async () => {
  const value = await rawCatalog();
  value.futureCatalogField = "ignored";
  value.fixtures[0].futureFixtureField = "ignored";
  const catalog = parseFixtureCatalog(value);
  assert.equal(Object.hasOwn(catalog, "futureCatalogField"), false);
  assert.equal(Object.hasOwn(catalog.fixtures[0], "futureFixtureField"), false);
});

test("review validation enforces structured defects and severity coherence", () => {
  const noDefect = validateReviewDraft({
    fixtureId: "fixture-1",
    defects: [],
    severity: "none",
    conclusion: "usable",
    notes: "",
  }, "fixture-1");
  assert.equal(noDefect.valid, true);

  const inconsistent = validateReviewDraft({
    fixtureId: "fixture-1",
    defects: ["halo"],
    severity: "none",
    conclusion: "reject",
    notes: "visible on white background",
  }, "fixture-1");
  assert.equal(inconsistent.valid, false);
  assert.ok(inconsistent.errors.some((message) => message.includes("严重度")));

  const unknown = validateReviewDraft({
    fixtureId: "fixture-1",
    defects: ["invented-score"],
    severity: "major",
    conclusion: "reject",
    notes: "",
  }, "fixture-1");
  assert.equal(unknown.valid, false);
  assert.ok(unknown.errors.some((message) => message.includes("未知")));
});

test("locking returns an immutable blind judgment without method or metric fields", () => {
  const locked = lockReviewDraft({
    fixtureId: "fixture-1",
    defects: ["halo"],
    severity: "minor",
    conclusion: "usable-with-caveat",
    notes: "edge only",
    methodLabel: "must not cross the blind boundary",
    score: 99,
  }, "fixture-1");
  assert.equal(Object.isFrozen(locked), true);
  assert.equal(Object.isFrozen(locked.defects), true);
  assert.equal(Object.hasOwn(locked, "methodLabel"), false);
  assert.equal(Object.hasOwn(locked, "score"), false);

  const blind = makeBlindFixturePresentation({
    candidateAlias: "Candidate A",
    suite: "MATTE-GT",
    partition: "dev/calibration",
    evidenceStatus: { level: "C1=0" },
    label: "must stay hidden",
    sourceRevision: "must-stay-hidden",
    methodLabel: "must stay hidden",
    facts: { category: "must-stay-hidden" },
  });
  assert.deepEqual(blind, {
    candidateAlias: "Candidate A",
    suitePartition: "MATTE-GT / dev/calibration",
    evidenceLevel: "C1=0",
  });
  assert.equal(Object.hasOwn(blind, "label"), false);
  assert.equal(Object.hasOwn(blind, "sourceRevision"), false);
  assert.equal(Object.hasOwn(blind, "methodLabel"), false);
  assert.equal(Object.hasOwn(blind, "facts"), false);
});

test("the research surface exposes all required states, views, and keyboard-visible structure", async () => {
  const [html, css, app] = await Promise.all([
    readFile(htmlUrl, "utf8"),
    readFile(cssUrl, "utf8"),
    readFile(appUrl, "utf8"),
  ]);

  assert.match(html, /研究方法演练/u);
  assert.match(html, /C1=0/u);
  assert.match(html, /非产品/u);
  assert.match(html, /不产生 U1 \/ E1 \/ R1 证据/u);
  for (const view of ASSET_KEYS) assert.match(html, new RegExp(`data-view="${view}"`, "u"));
  for (const id of ["stage-loading", "stage-empty", "stage-error", "locked-review", "unblinded-details"]) {
    assert.match(html, new RegExp(`id="${id}"`, "u"));
  }
  assert.match(html, /data-scale="fit"/u);
  assert.match(html, /data-scale="actual"/u);
  assert.match(html, /id="overlay-toggle"/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /desktop zoom\/readability fallback/u);
  assert.match(app, /fetch\("\/api\/research\/fixtures"/u);
  assert.match(app, /6 \/ 6 已加载并解码/u);
  assert.doesNotMatch(app, /6 \/ 6 图片已校验/u);
  assert.match(app, /ArrowRight/u);
  assert.match(app, /Promise\.allSettled/u);
  assert.ok(DEFECT_TAXONOMY.length >= 6);
});
