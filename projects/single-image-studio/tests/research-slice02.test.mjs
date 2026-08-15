import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  decodeReferencePng,
  buildSourceCardV0,
  encodeReferenceSrgbPng,
  exportFixturePng,
  normalizeFixturePng,
  runColorDistanceMatteBaseline,
  sha256,
} from "../scripts/research-reference-adapters.mjs";
import { encodeRgbaPng, hashRecordWithout, stableStringify } from "../scripts/research-generate-fixtures.mjs";
import { DEFAULT_SLICE02_ROOT, generateSlice02 } from "../scripts/research-generate-slice02.mjs";
import { validateJsonSchemaInstance, validateSlice02 } from "../scripts/research-validate-slice02.mjs";

const CREATED_AT = "2026-08-14T18:41:55.000Z";

async function tempCopy() {
  const wrapper = await mkdtemp(path.join(tmpdir(), "single-image-slice02-copy-"));
  const root = path.join(wrapper, "slice-02");
  await cp(DEFAULT_SLICE02_ROOT, root, { recursive: true });
  await cp(path.resolve(DEFAULT_SLICE02_ROOT, "../manifests"), path.join(wrapper, "manifests"), { recursive: true });
  return root;
}

async function tempGeneratedRoot(prefix) {
  const wrapper = await mkdtemp(path.join(tmpdir(), prefix));
  const root = path.join(wrapper, "slice-02");
  await cp(path.join(DEFAULT_SLICE02_ROOT, "schemas"), path.join(root, "schemas"), { recursive: true });
  await cp(path.resolve(DEFAULT_SLICE02_ROOT, "../manifests"), path.join(wrapper, "manifests"), { recursive: true });
  return root;
}

async function readJson(root, relative) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}

async function writeJson(root, relative, value) {
  await writeFile(path.join(root, relative), stableStringify(value), "utf8");
}

function codes(result) {
  return new Set(result.issues.map((entry) => entry.code));
}

function imageAsset(bytes, imageAssetId) {
  return {
    schemaVersion: "image-asset.v0",
    imageAssetId,
    mime: "image/png",
    byteLength: bytes.length,
    fileSha256: sha256(bytes),
    orientation: 1,
    colorProfile: "srgb",
    premultiply: "straight",
    sourceClass: "project-original-synthetic",
    createdAt: CREATED_AT,
  };
}

function normalizeRgba(rgba, width, height, suffix = "test") {
  const bytes = encodeReferenceSrgbPng(width, height, rgba);
  return normalizeFixturePng({
    bytes,
    imageAsset: imageAsset(bytes, `asset.${suffix}`),
    normalizedImageId: `normalized.${suffix}`,
    createdAt: CREATED_AT,
  });
}

function pixelBuffer(rgba, width, height, parentArtifactId = "normalized.test") {
  return {
    schemaVersion: "rgba8-pixel-buffer.v0",
    pixelBufferId: "pixel-buffer.test",
    parentArtifactId,
    width,
    height,
    mime: "image/png",
    colorProfile: "srgb",
    alphaPresent: rgba.some((value, index) => index % 4 === 3 && value < 255),
    premultiply: "straight",
    pixelSha256: sha256(Buffer.from(rgba)),
    sourceClass: "project-original-synthetic",
  };
}

function subjectMap(parentNormalizedImageId, rgb = [0, 0, 0]) {
  return {
    schemaVersion: "subject-map.v0",
    subjectMapId: "subject-map.test",
    parentNormalizedImageId,
    subjectCount: 1,
    backgroundSample: { uniform: true, rgb },
    sourceClass: "project-original-synthetic",
    containsRealPerson: false,
    sourceAlpha: "opaque",
  };
}

test("Slice 02 freezes four research contracts and ten isolated structural fixtures without evidence upgrade", async () => {
  const result = await validateSlice02();
  assert.equal(result.ok, true);
  assert.deepEqual(result.summary, {
    contracts: 4,
    fixtureManifests: 10,
    fixtures: 10,
    assets: 30,
    partitions: 5,
    suites: 2,
  });

  const contracts = await Promise.all([
    "cc-cap02-normalize.v0.2.0.json",
    "cc-cap02-export.v0.2.0.json",
    "cc-cap03-source-card-v0.v0.2.0.json",
    "cc-cap04-matte-simple.v0.2.0.json",
  ].map((name) => readJson(DEFAULT_SLICE02_ROOT, `contracts/${name}`)));
  assert.ok(contracts.every((value) => value.status === "frozen-research"));
  assert.ok(contracts.every((value) => value.evidence.status === "C1=0"));
  assert.ok(contracts.every((value) => value.releaseStatus === "research-only-not-product-fallback"));
  assert.ok(contracts.every((value) => !JSON.stringify(value).includes("pending-")));
  const adapterHash = sha256(await readFile(path.resolve(DEFAULT_SLICE02_ROOT, "../../scripts/research-reference-adapters.mjs")));
  assert.ok(contracts.every((value) => value.executor.implementationRef === `sha256:${adapterHash}`));
  const registry = await readFile(path.resolve(DEFAULT_SLICE02_ROOT, "../../CAPABILITY_REGISTRY.md"), "utf8");
  assert.equal(registry.match(new RegExp(adapterHash, "g"))?.length, 3, "registry must repeat the exact frozen adapter hash in all three Slice 02 entries");
});

test("Slice 02 generator is deterministic across independent output roots", async (t) => {
  const first = await tempGeneratedRoot("single-image-slice02-a-");
  const second = await tempGeneratedRoot("single-image-slice02-b-");
  t.after(async () => Promise.all([rm(path.dirname(first), { recursive: true, force: true }), rm(path.dirname(second), { recursive: true, force: true })]));
  const [a, b] = await Promise.all([generateSlice02({ sliceRoot: first }), generateSlice02({ sliceRoot: second })]);
  assert.equal(a.planHash, b.planHash);
  assert.equal(a.adapterHash, b.adapterHash);
  assert.deepEqual(
    await readFile(path.join(first, "preregistrations/partition-plan.slice-02.structural.v0.json")),
    await readFile(path.join(second, "preregistrations/partition-plan.slice-02.structural.v0.json")),
  );
  assert.equal((await validateSlice02(first)).ok, true);
  assert.equal((await validateSlice02(second)).ok, true);
});

test("reference normalization and export preserve decoded pixels and create verified artifact records", () => {
  const width = 8;
  const height = 6;
  const rgba = new Uint8Array(width * height * 4);
  for (let offset = 0; offset < rgba.length; offset += 4) rgba.set([offset % 251, (offset * 3) % 251, (offset * 7) % 251, offset % 12 === 0 ? 96 : 255], offset);
  const bytes = encodeReferenceSrgbPng(width, height, rgba);
  const normalized = normalizeFixturePng({ bytes, imageAsset: imageAsset(bytes, "asset.test"), normalizedImageId: "normalized.test", createdAt: CREATED_AT });
  assert.deepEqual(decodeReferencePng(normalized.bytes).rgba, rgba);
  assert.equal(decodeReferencePng(normalized.bytes).srgbDeclared, true);
  assert.equal(normalized.artifact.capabilityContractRef, "CC-CAP02-NORMALIZE@0.2.0");
  assert.equal(normalized.artifact.alphaPresent, true);

  const delivery = exportFixturePng({ rgba, pixelBuffer: pixelBuffer(rgba, width, height), deliveryArtifactId: "delivery.test", createdAt: CREATED_AT });
  assert.equal(delivery.artifact.capabilityContractRef, "CC-CAP02-EXPORT@0.2.0");
  assert.equal(delivery.artifact.fileSha256, sha256(delivery.bytes));
  assert.equal(delivery.artifact.reopenVerification.passed, true);
  assert.equal(delivery.artifact.reopenVerification.decodedColorProfile, "srgb");
  assert.equal(delivery.artifact.reopenVerification.decodedPixelSha256, sha256(Buffer.from(rgba)));
  assert.deepEqual(decodeReferencePng(delivery.bytes).rgba, rgba);
  assert.throws(() => exportFixturePng({ rgba, pixelBuffer: { ...pixelBuffer(rgba, width, height), premultiply: "unknown" }, deliveryArtifactId: "delivery.bad", createdAt: CREATED_AT }));
  assert.throws(() => exportFixturePng({ rgba, pixelBuffer: { ...pixelBuffer(rgba, width, height), pixelSha256: "0".repeat(64) }, deliveryArtifactId: "delivery.bad", createdAt: CREATED_AT }));
  assert.throws(() => exportFixturePng({ rgba, pixelBuffer: pixelBuffer(rgba, width, height), deliveryArtifactId: "delivery.bad", createdAt: "not-a-date" }));

  const noProfile = encodeRgbaPng(width, height, rgba);
  assert.throws(() => normalizeFixturePng({ bytes: noProfile, imageAsset: imageAsset(noProfile, "asset.bad"), normalizedImageId: "normalized.bad", createdAt: CREATED_AT }));
  const badCrc = Buffer.from(bytes);
  badCrc[badCrc.length - 5] ^= 1;
  assert.throws(() => decodeReferencePng(badCrc), /CRC mismatch/);
  assert.throws(() => decodeReferencePng(Buffer.alloc(1024 * 1024 + 1)), /1 MiB/);
  assert.throws(() => decodeReferencePng(new Uint8Array(1024 * 1024 + 1)), /1 MiB/);
});

test("SourceCard.v0 keeps unsupported observations explicit unknowns with per-field reasons", () => {
  const rgba = new Uint8Array(96 * 72 * 4).fill(255);
  const normalized = normalizeRgba(rgba, 96, 72, "source-card");
  const card = buildSourceCardV0({ normalizedArtifact: normalized.artifact, normalizedBytes: normalized.bytes, sourceCardId: "source-card.test", createdAt: CREATED_AT });
  assert.equal(card.technical.width.value, 96);
  assert.equal(card.technical.width.confidence.lower, 1);
  assert.equal(card.quality.blur.value, "unknown");
  assert.match(card.quality.blur.unknownReason, /observer-not-frozen/);
  assert.equal(card.subject.primarySubjectType.value, "unknown");
  assert.equal(card.content.textPresence.value, "unknown");
  assert.equal(Object.hasOwn(card.subject, "age"), false);
  assert.throws(() => buildSourceCardV0({ normalizedArtifact: { ...normalized.artifact, width: 95 }, normalizedBytes: normalized.bytes, sourceCardId: "source-card.bad", createdAt: CREATED_AT }), /does not match/);
  assert.throws(() => buildSourceCardV0({ normalizedArtifact: normalized.artifact, normalizedBytes: Buffer.alloc(0), sourceCardId: "source-card.bad", createdAt: CREATED_AT }));
});

test("simple matting baseline is deterministic, produces partial alpha, and rejects unfrozen parameters", () => {
  const width = 16;
  const height = 12;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const amount = x / (width - 1);
      rgba.set([Math.round(220 * amount), Math.round(90 * amount), Math.round(30 * amount), 255], offset);
    }
  }
  const normalized = normalizeRgba(rgba, width, height, "matte");
  const map = subjectMap(normalized.artifact.normalizedImageId);
  const run = (overrides = {}) => runColorDistanceMatteBaseline({ normalizedBytes: normalized.bytes, normalizedArtifact: normalized.artifact, subjectMap: map, alphaMatteId: "alpha-matte.test", createdAt: CREATED_AT, lowThreshold: 8, highThreshold: 180, ...overrides });
  const first = run();
  const second = run();
  assert.equal(sha256(first.bytes), sha256(second.bytes));
  assert.ok([...first.alphaRgba].some((value, index) => index % 4 === 0 && value > 0 && value < 255));
  assert.equal(first.artifact.fileSha256, sha256(first.bytes));
  assert.throws(() => run({ subjectMap: { ...map, backgroundSample: { uniform: true, rgb: [0, 0] } } }));
  assert.throws(() => run({ subjectMap: { ...map, subjectCount: 2 } }));
  assert.throws(() => run({ lowThreshold: 180, highThreshold: 8 }));
  assert.throws(() => run({ lowThreshold: undefined, highThreshold: undefined }));
  assert.throws(() => run({ lowThreshold: "10", highThreshold: "88" }));
  assert.throws(() => run({ lowThreshold: 441.5, highThreshold: 442 }));
  assert.throws(() => run({ lowThreshold: 0, highThreshold: 0.5 }));
  assert.throws(() => run({ createdAt: "not-a-date" }));
  assert.throws(() => run({ subjectMap: { ...map, sourceClass: "unknown" } }));
});

test("validator rejects contract tampering and source-family leakage across partitions", async (t) => {
  const root = await tempCopy();
  t.after(() => rm(path.dirname(root), { recursive: true, force: true }));
  const contractPath = "contracts/cc-cap02-normalize.v0.2.0.json";
  const contract = await readJson(root, contractPath);
  contract.scope = "tampered after freeze";
  await writeJson(root, contractPath, contract);

  const devPath = "manifests/fixture-manifest.matte-gt.dev-calibration.slice-02.v1.json";
  const holdoutPath = "manifests/fixture-manifest.matte-gt.holdout.slice-02.v1.json";
  const dev = await readJson(root, devPath);
  const holdout = await readJson(root, holdoutPath);
  holdout.fixtures[0].sourceFamilyId = dev.fixtures[0].sourceFamilyId;
  holdout.fixtures[0].assets[0].path = "fixtures/../escaped.png";
  holdout.manifestHash = hashRecordWithout(holdout, "manifestHash");
  await writeJson(root, holdoutPath, holdout);
  dev.fixtures[0].width = 1;
  dev.fixtures[0].height = 1;
  dev.manifestHash = hashRecordWithout(dev, "manifestHash");
  await writeJson(root, devPath, dev);

  const devAssetPath = path.join(root, dev.fixtures[0].assets[0].path);
  const devAsset = Buffer.from(await readFile(devAssetPath));
  devAsset[devAsset.length - 1] ^= 1;
  await writeFile(devAssetPath, devAsset);
  await writeFile(path.join(root, "fixtures", "unregistered.JPG"), "not registered", "utf8");
  await writeJson(path.dirname(root), "manifests/review-catalog.v0.json", { leakedFixtureId: dev.fixtures[0].id });

  const result = await validateSlice02(root, { throwOnError: false });
  assert.equal(result.ok, false);
  assert.ok(codes(result).has("CONTRACT_HASH_MISMATCH"));
  assert.ok(codes(result).has("SOURCE_FAMILY_PARTITION_LEAK"));
  assert.ok(codes(result).has("FIXTURE_ASSET_DIMENSIONS_MISMATCH"));
  assert.ok(codes(result).has("ASSET_PATH_INVALID"));
  assert.ok(codes(result).has("ASSET_HASH_MISMATCH"));
  assert.ok(codes(result).has("UNREGISTERED_ASSET"));
  assert.ok(codes(result).has("CATALOG_LEAK"));
});

test("reference adapter records validate against their frozen JSON Schemas", async () => {
  const width = 8;
  const height = 6;
  const rgba = new Uint8Array(width * height * 4).fill(255);
  const bytes = encodeReferenceSrgbPng(width, height, rgba);
  const asset = imageAsset(bytes, "asset.schema");
  const normalized = normalizeFixturePng({ bytes, imageAsset: asset, normalizedImageId: "normalized.schema", createdAt: CREATED_AT });
  const buffer = pixelBuffer(rgba, width, height, normalized.artifact.normalizedImageId);
  const delivery = exportFixturePng({ rgba, pixelBuffer: buffer, deliveryArtifactId: "delivery.schema", createdAt: CREATED_AT });
  const card = buildSourceCardV0({ normalizedArtifact: normalized.artifact, normalizedBytes: normalized.bytes, sourceCardId: "source-card.schema", createdAt: CREATED_AT });
  const map = subjectMap(normalized.artifact.normalizedImageId);
  const matte = runColorDistanceMatteBaseline({ normalizedBytes: normalized.bytes, normalizedArtifact: normalized.artifact, subjectMap: map, alphaMatteId: "alpha-matte.schema", createdAt: CREATED_AT, lowThreshold: 10, highThreshold: 88 });
  for (const [name, value] of [
    ["image-asset.v0.schema.json", asset],
    ["normalized-image.v0.schema.json", normalized.artifact],
    ["rgba8-pixel-buffer.v0.schema.json", buffer],
    ["delivery-artifact.v0.schema.json", delivery.artifact],
    ["source-card.v0.schema.json", card],
    ["subject-map.v0.schema.json", map],
    ["alpha-matte.v0.schema.json", matte.artifact],
  ]) {
    const schema = await readJson(DEFAULT_SLICE02_ROOT, `schemas/${name}`);
    assert.deepEqual(validateJsonSchemaInstance(value, schema), [], name);
  }
  const cardSchema = await readJson(DEFAULT_SLICE02_ROOT, "schemas/source-card.v0.schema.json");
  const mistypedCard = structuredClone(card);
  mistypedCard.technical.width.value = "banana";
  mistypedCard.quality.blur.value = "sharp";
  assert.ok(validateJsonSchemaInstance(mistypedCard, cardSchema).length >= 2);
  const imageAssetSchema = await readJson(DEFAULT_SLICE02_ROOT, "schemas/image-asset.v0.schema.json");
  assert.ok(validateJsonSchemaInstance({ ...asset, createdAt: "2026-02-31T00:00:00Z" }, imageAssetSchema).length >= 1);
});

test("all Slice 02 machine schemas are structurally closed", async () => {
  const names = (await readdir(path.join(DEFAULT_SLICE02_ROOT, "schemas"))).filter((name) => name.endsWith(".json"));
  function inspect(node, location) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false, `${location} must reject unknown fields`);
      assert.deepEqual(Object.keys(node.properties).sort(), [...new Set(node.required)].sort(), `${location} must require every property`);
    }
    if (node.type === "array") assert.ok(Object.hasOwn(node, "items"), `${location} must constrain items`);
    Object.entries(node).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((entry, index) => inspect(entry, `${location}.${key}[${index}]`));
      else inspect(value, `${location}.${key}`);
    });
  }
  for (const name of names) inspect(await readJson(DEFAULT_SLICE02_ROOT, `schemas/${name}`), name);
});
