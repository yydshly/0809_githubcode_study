import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { inflateSync } from "node:zlib";

import {
  DEFAULT_RESEARCH_ROOT,
  generateResearchFixtures,
  hashRecordWithout,
  stableStringify,
} from "../scripts/research-generate-fixtures.mjs";
import { validateResearchTree } from "../scripts/research-validate-fixtures.mjs";

const MANIFEST_PATH = "manifests/fixture-manifest.matte-gt.dev-calibration.v0.json";
const CATALOG_PATH = "manifests/review-catalog.v0.json";
const RIGHTS_PATH = "rights/rights.local-synthetic.v0.json";

async function temporaryResearchCopy() {
  const root = await mkdtemp(path.join(tmpdir(), "single-image-research-test-"));
  await cp(DEFAULT_RESEARCH_ROOT, root, { recursive: true });
  return root;
}

async function emptyGeneratedResearchRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "single-image-research-generated-"));
  await mkdir(path.join(root, "schemas"), { recursive: true });
  await cp(path.join(DEFAULT_RESEARCH_ROOT, "schemas"), path.join(root, "schemas"), { recursive: true });
  return root;
}

async function readJson(root, relative) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}

async function writeJson(root, relative, value) {
  await writeFile(path.join(root, relative), stableStringify(value), "utf8");
}

function issueCodes(result) {
  return new Set(result.issues.map((entry) => entry.code));
}

function decodeGeneratedRgbaPng(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const idat = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") idat.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === "IEND") break;
  }
  const scanlines = inflateSync(Buffer.concat(idat));
  const rgba = Buffer.alloc(width * height * 4);
  const stride = width * 4;
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * (stride + 1);
    assert.equal(scanlines[sourceOffset], 0, "generator must use deterministic PNG filter 0");
    scanlines.copy(rgba, y * stride, sourceOffset + 1, sourceOffset + 1 + stride);
  }
  return { width, height, rgba };
}

function alphaAt(decoded, x, y) {
  return decoded.rgba[(y * decoded.width + x) * 4];
}

test("committed WP1 fixtures pass strict validation with an honest evidence boundary", async () => {
  const result = await validateResearchTree(DEFAULT_RESEARCH_ROOT);
  assert.equal(result.ok, true);
  assert.deepEqual(result.summary, {
    rightsRecords: 1,
    fixtureManifests: 1,
    fixtures: 3,
    assets: 18,
    catalogFixtures: 3,
  });

  const manifest = await readJson(DEFAULT_RESEARCH_ROOT, MANIFEST_PATH);
  const catalog = await readJson(DEFAULT_RESEARCH_ROOT, CATALOG_PATH);
  assert.deepEqual(manifest.evidenceStatus, { level: "C1=0", purpose: "method-rehearsal" });
  assert.deepEqual(catalog.evidenceStatus, { level: "C1=0", purpose: "method-rehearsal" });
  assert.equal(catalog.assetAllowlist.length, 18);
  assert.ok(catalog.assetAllowlist.every((url) => url.startsWith("/research-assets/dev/calibration/MATTE-GT/")));
});

test("validator accepts an intentionally empty review catalog without erasing registered fixtures", async (t) => {
  const root = await temporaryResearchCopy();
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalog = await readJson(root, CATALOG_PATH);
  catalog.fixtures = [];
  catalog.assetAllowlist = [];
  await writeJson(root, CATALOG_PATH, catalog);

  const result = await validateResearchTree(root);
  assert.equal(result.ok, true);
  assert.deepEqual(result.summary, {
    rightsRecords: 1,
    fixtureManifests: 1,
    fixtures: 3,
    assets: 18,
    catalogFixtures: 0,
  });
});

test("validator rejects empty and non-empty catalog sides that do not agree", async (t) => {
  for (const mismatch of ["fixtures-empty", "allowlist-empty"]) {
    await t.test(mismatch, async (subtest) => {
      const root = await temporaryResearchCopy();
      subtest.after(() => rm(root, { recursive: true, force: true }));
      const catalog = await readJson(root, CATALOG_PATH);
      if (mismatch === "fixtures-empty") catalog.fixtures = [];
      if (mismatch === "allowlist-empty") catalog.assetAllowlist = [];
      await writeJson(root, CATALOG_PATH, catalog);

      const result = await validateResearchTree(root, { throwOnError: false });
      assert.equal(result.ok, false);
      assert.ok(issueCodes(result).has("ALLOWLIST_CATALOG_MISMATCH"));
    });
  }
});

test("machine schemas keep every declared object and array structurally closed", async () => {
  const schemaFiles = [
    "fixture-manifest.v0.schema.json",
    "review-catalog.v0.schema.json",
    "rights-record.v0.schema.json",
  ];

  function inspect(node, location) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false, `${location} must reject unknown fields`);
      assert.ok(node.properties && typeof node.properties === "object", `${location} must declare properties`);
      assert.deepEqual(
        [...new Set(node.required)].sort(),
        Object.keys(node.properties).sort(),
        `${location} must require every declared field`,
      );
    }
    if (node.type === "array") {
      assert.ok(Object.hasOwn(node, "items"), `${location} must constrain array items`);
    }
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value)) {
        value.forEach((entry, index) => inspect(entry, `${location}.${key}[${index}]`));
      } else {
        inspect(value, `${location}.${key}`);
      }
    }
  }

  for (const filename of schemaFiles) {
    const schema = await readJson(DEFAULT_RESEARCH_ROOT, `schemas/${filename}`);
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    inspect(schema, filename);
  }

  const fixtureSchema = await readJson(DEFAULT_RESEARCH_ROOT, "schemas/fixture-manifest.v0.schema.json");
  const catalogSchema = await readJson(DEFAULT_RESEARCH_ROOT, "schemas/review-catalog.v0.schema.json");
  assert.equal(fixtureSchema.properties.fixtures.minItems, 1);
  assert.equal(catalogSchema.properties.fixtures.minItems, 0);
  assert.equal(catalogSchema.properties.assetAllowlist.minItems, 0);
  assert.equal(catalogSchema.$defs.catalogFixture.additionalProperties, false);
  assert.equal(catalogSchema.$defs.assets.additionalProperties, false);
});

test("validator fails if a nested machine schema is loosened", async (t) => {
  const root = await temporaryResearchCopy();
  t.after(() => rm(root, { recursive: true, force: true }));
  const schemaPath = "schemas/review-catalog.v0.schema.json";
  const schema = await readJson(root, schemaPath);
  delete schema.$defs.catalogFixture.additionalProperties;
  await writeJson(root, schemaPath, schema);

  const result = await validateResearchTree(root, { throwOnError: false });
  assert.equal(result.ok, false);
  assert.ok(issueCodes(result).has("SCHEMA_OBJECT_NOT_STRICT"));
});

test("generator is deterministic and the three alpha fixtures cover hard, hole, and soft edges", async (t) => {
  const first = await emptyGeneratedResearchRoot();
  const second = await emptyGeneratedResearchRoot();
  t.after(async () => Promise.all([
    rm(first, { recursive: true, force: true }),
    rm(second, { recursive: true, force: true }),
  ]));

  const firstResult = await generateResearchFixtures({ researchRoot: first });
  const secondResult = await generateResearchFixtures({ researchRoot: second });
  assert.equal(firstResult.manifestHash, secondResult.manifestHash);
  assert.deepEqual(
    await readFile(path.join(first, MANIFEST_PATH)),
    await readFile(path.join(second, MANIFEST_PATH)),
  );
  await validateResearchTree(first);
  await validateResearchTree(second);

  const fixtureBase = path.join(first, "fixtures/dev/calibration/MATTE-GT");
  const hard = decodeGeneratedRgbaPng(await readFile(path.join(fixtureBase, "matte-hard-edge-001/alpha.png")));
  const hole = decodeGeneratedRgbaPng(await readFile(path.join(fixtureBase, "matte-hole-001/alpha.png")));
  const soft = decodeGeneratedRgbaPng(await readFile(path.join(fixtureBase, "matte-soft-edge-001/alpha.png")));

  const hardValues = new Set([...hard.rgba.filter((_, index) => index % 4 === 0)]);
  assert.deepEqual([...hardValues].sort((a, b) => a - b), [0, 255]);
  assert.equal(alphaAt(hole, 80, 60), 0, "hole center must remain transparent");
  assert.equal(alphaAt(hole, 80, 24), 255, "ring must contain opaque pixels");
  assert.ok([...soft.rgba].some((value, index) => index % 4 === 0 && value > 0 && value < 255));
});

test("validator rejects a tampered PNG and a stale unregistered PNG", async (t) => {
  const root = await temporaryResearchCopy();
  t.after(() => rm(root, { recursive: true, force: true }));
  const asset = "fixtures/dev/calibration/MATTE-GT/matte-hard-edge-001/source.png";
  await writeFile(path.join(root, asset), Buffer.concat([await readFile(path.join(root, asset)), Buffer.from([0])]));
  await cp(path.join(root, asset), path.join(root, "fixtures/dev/calibration/MATTE-GT/unregistered.png"));

  const result = await validateResearchTree(root, { throwOnError: false });
  const codes = issueCodes(result);
  assert.equal(result.ok, false);
  assert.ok(codes.has("ASSET_HASH_MISMATCH"));
  assert.ok(codes.has("UNREGISTERED_ASSET"));
});

test("validator fails closed for unknown fields and schema version drift", async (t) => {
  const root = await temporaryResearchCopy();
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalog = await readJson(root, CATALOG_PATH);
  catalog.schemaVersion = "review-catalog.v1";
  catalog.unreviewedExtension = true;
  await writeJson(root, CATALOG_PATH, catalog);

  const codes = issueCodes(await validateResearchTree(root, { throwOnError: false }));
  assert.ok(codes.has("SCHEMA_VERSION_INVALID"));
  assert.ok(codes.has("UNKNOWN_FIELD"));
});

test("validator rejects missing public-display rights", async (t) => {
  const root = await temporaryResearchCopy();
  t.after(() => rm(root, { recursive: true, force: true }));
  const rights = await readJson(root, RIGHTS_PATH);
  rights.permissions.publicDisplayAllowed = false;
  await writeJson(root, RIGHTS_PATH, rights);

  const codes = issueCodes(await validateResearchTree(root, { throwOnError: false }));
  assert.ok(codes.has("RIGHTS_PERMISSION_MISSING"));
  assert.ok(codes.has("RIGHTS_PUBLIC_DISPLAY_DENIED"));
});

test("validator detects source-family and capture-session leakage across partitions", async (t) => {
  const root = await temporaryResearchCopy();
  t.after(() => rm(root, { recursive: true, force: true }));
  const leaked = await readJson(root, MANIFEST_PATH);
  leaked.fixtureManifestId = "fixture-manifest.matte-gt.holdout.leak.v0";
  leaked.partition = "holdout";
  leaked.manifestHash = hashRecordWithout(leaked, "manifestHash");
  await writeJson(root, "manifests/fixture-manifest.matte-gt.holdout.leak.v0.json", leaked);

  const codes = issueCodes(await validateResearchTree(root, { throwOnError: false }));
  assert.ok(codes.has("SOURCE_FAMILY_PARTITION_LEAK"));
  assert.ok(codes.has("CAPTURE_SESSION_PARTITION_LEAK"));
});

test("review catalog cannot expose a non-public fixture or path traversal", async (t) => {
  const root = await temporaryResearchCopy();
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalog = await readJson(root, CATALOG_PATH);
  catalog.fixtures[0].visibility = "private-research";
  catalog.fixtures[0].assets.source = "/research-assets/../private.png";
  catalog.assetAllowlist = catalog.fixtures
    .flatMap((fixture) => Object.values(fixture.assets))
    .sort();
  await writeJson(root, CATALOG_PATH, catalog);

  const codes = issueCodes(await validateResearchTree(root, { throwOnError: false }));
  assert.ok(codes.has("CATALOG_NON_PUBLIC_ASSET"));
  assert.ok(codes.has("ASSET_URL_UNSAFE"));
  assert.ok(codes.has("ALLOWLIST_NON_PUBLIC_OR_UNKNOWN"));
});
