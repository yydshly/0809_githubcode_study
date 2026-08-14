import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { DEFAULT_SLICE03_ROOT, generateSlice03 } from "../scripts/research-generate-slice03.mjs";
import { averageHashRgba, encodeReferenceSrgbPng, sha256 } from "../scripts/research-reference-adapters.mjs";
import {
  CANONICAL_SLICE03_GENERATED_TREE_SHA256,
  CANONICAL_SLICE03_OBSERVER_CONTRACT_HASH,
  CANONICAL_SLICE03_SCHEMA_TREE_SHA256,
  validateSlice03,
  validateSlice03SchemaInstance,
} from "../scripts/research-validate-slice03.mjs";

const PROJECT_ROOT = path.resolve(DEFAULT_SLICE03_ROOT, "../..");
const REVIEW_CATALOG = path.resolve(DEFAULT_SLICE03_ROOT, "../manifests/review-catalog.v0.json");
const CAPABILITY_REGISTRY = path.resolve(PROJECT_ROOT, "CAPABILITY_REGISTRY.md");

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}

function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function hashRecordWithout(record, field) {
  const clone = structuredClone(record);
  delete clone[field];
  return createHash("sha256").update(stableStringify(clone)).digest("hex");
}

async function readJson(root, relative) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}

async function writeJson(root, relative, value) {
  await writeFile(path.join(root, relative), stableStringify(value), "utf8");
}

async function listFiles(root, base = "") {
  const entries = await readdir(path.join(root, base), { withFileTypes: true });
  const output = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) output.push(...await listFiles(root, relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output;
}

async function treeDigest(root, { generatedSubsetOnly = false } = {}) {
  const digest = createHash("sha256");
  const files = (await listFiles(root)).filter((relative) => (
    !generatedSubsetOnly || relative !== "README.md" && !relative.startsWith("schemas/")
  ));
  for (const relative of files) {
    digest.update(relative);
    digest.update("\0");
    digest.update(await readFile(path.join(root, relative)));
    digest.update("\0");
  }
  return { files, sha256: digest.digest("hex") };
}

async function tempGeneratedRoot(prefix) {
  const wrapper = await mkdtemp(path.join(tmpdir(), prefix));
  const root = path.join(wrapper, "slice-03");
  await cp(path.join(DEFAULT_SLICE03_ROOT, "schemas"), path.join(root, "schemas"), { recursive: true });
  const slice02SchemaRoot = path.join(wrapper, "slice-02", "schemas");
  await mkdir(slice02SchemaRoot, { recursive: true });
  await cp(
    path.resolve(DEFAULT_SLICE03_ROOT, "../slice-02/schemas/normalized-image.v0.schema.json"),
    path.join(slice02SchemaRoot, "normalized-image.v0.schema.json"),
  );
  await generateSlice03({ sliceRoot: root });
  return { wrapper, root };
}

async function validateTemp(root, overrides = {}) {
  return validateSlice03(root, {
    throwOnError: false,
    reviewCatalogPath: REVIEW_CATALOG,
    capabilityRegistryPath: CAPABILITY_REGISTRY,
    ...overrides,
  });
}

function codes(result) {
  return new Set(result.issues.map((issue) => issue.code));
}

test("Slice 03 validates one observer contract, fifteen no-support format rows, open fixtures, and seal schemas", async () => {
  const result = await validateSlice03();
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.deepEqual(result.summary, {
    contracts: 1,
    schemas: 13,
    matrixRows: 15,
    profiles: 15,
    fixtureManifests: 2,
    fixtures: 25,
    assets: 25,
    sealSchemas: 6,
    formalHoldoutStatus: "not-created",
    observerAdapterHash: "99596ad7030ae8db2e9861d0dae1689448221ca7876ef94fbf9e04f5fdbbf0e3",
    observerContractHash: CANONICAL_SLICE03_OBSERVER_CONTRACT_HASH,
    matrixHash: "57ade2ad28bb4ecae40941ca084990aafc8f3182348085a9ab20158bfb61503e",
    generatedSubsetTreeHash: CANONICAL_SLICE03_GENERATED_TREE_SHA256,
    schemaTreeHash: CANONICAL_SLICE03_SCHEMA_TREE_SHA256,
  });

  const matrix = await readJson(DEFAULT_SLICE03_ROOT, "format-matrix.json");
  assert.ok(matrix.rows.every((row) => row.productSupport === false));
  assert.deepEqual(
    matrix.rows.filter((row) => row.evidenceState === "structural-only").map((row) => `${row.direction}:${row.formatId}`),
    ["input:png", "output:png"],
  );
  assert.deepEqual(
    matrix.rows.filter((row) => row.policyState === "research-candidate").map((row) => `${row.direction}:${row.formatId}`),
    ["input:jpeg", "input:webp"],
  );
});

test("Slice 03 generator is byte-deterministic across independent temporary roots", async (t) => {
  const [first, second] = await Promise.all([
    tempGeneratedRoot("single-image-slice03-a-"),
    tempGeneratedRoot("single-image-slice03-b-"),
  ]);
  t.after(() => Promise.all([
    rm(first.wrapper, { recursive: true, force: true }),
    rm(second.wrapper, { recursive: true, force: true }),
  ]));
  const [firstTree, secondTree, checkedInTree] = await Promise.all([
    treeDigest(first.root, { generatedSubsetOnly: true }),
    treeDigest(second.root, { generatedSubsetOnly: true }),
    treeDigest(DEFAULT_SLICE03_ROOT, { generatedSubsetOnly: true }),
  ]);
  assert.deepEqual(firstTree.files, secondTree.files);
  assert.equal(firstTree.sha256, secondTree.sha256);
  assert.equal(firstTree.files.length, 45);
  assert.deepEqual(checkedInTree.files, firstTree.files);
  assert.equal(checkedInTree.sha256, firstTree.sha256);
  assert.equal(firstTree.sha256, CANONICAL_SLICE03_GENERATED_TREE_SHA256);
  assert.equal((await validateTemp(first.root)).ok, true);
  assert.equal((await validateTemp(second.root)).ok, true);
});

test("Slice 03 validator fails closed on support claims, profile widening, isolation leaks, asset drift, forbidden partitions, and catalog leaks", async (t) => {
  const wrapper = await mkdtemp(path.join(tmpdir(), "single-image-slice03-tamper-"));
  const root = path.join(wrapper, "slice-03");
  const catalogPath = path.join(wrapper, "review-catalog.v0.json");
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  await cp(DEFAULT_SLICE03_ROOT, root, { recursive: true });

  const matrix = await readJson(root, "format-matrix.json");
  matrix.rows[1].productSupport = true;
  matrix.matrixHash = hashRecordWithout(matrix, "matrixHash");
  await writeJson(root, "format-matrix.json", matrix);

  const profilePath = "profiles/input.jpeg-probe.v0.3.0.json";
  const profile = await readJson(root, profilePath);
  profile.bytePolicy.decoderAllowed = true;
  profile.profileHash = hashRecordWithout(profile, "profileHash");
  await writeJson(root, profilePath, profile);

  const manifestPath = "manifests/fixture-manifest.normalize-deliver.defect-calibration.slice-03.v0.json";
  const manifest = await readJson(root, manifestPath);
  manifest.fixtures[1].sourceFamilyId = manifest.fixtures[0].sourceFamilyId;
  const crcFixture = manifest.fixtures.find((fixture) => fixture.expectedCode === "S03_PNG_CRC_MISMATCH");
  const trailingFixture = manifest.fixtures.find((fixture) => fixture.expectedCode === "S03_PNG_TRAILING_BYTES");
  [crcFixture.expectedCode, trailingFixture.expectedCode] = [trailingFixture.expectedCode, crcFixture.expectedCode];
  manifest.manifestHash = hashRecordWithout(manifest, "manifestHash");
  await writeJson(root, manifestPath, manifest);
  const assetPath = manifest.fixtures[0].assets[0].path;
  const bytes = Buffer.from(await readFile(path.join(root, assetPath)));
  bytes[0] ^= 1;
  await writeFile(path.join(root, assetPath), bytes);

  const forbidden = path.join(root, "fixtures", "holdout", "NORMALIZE-DELIVER", "forbidden");
  await mkdir(forbidden, { recursive: true });
  await writeFile(path.join(forbidden, "source.png"), "not-a-holdout", "utf8");
  await writeFile(path.join(root, "contracts", "unregistered.contract.txt"), "not registered", "utf8");
  await writeFile(path.join(root, "profiles", "unregistered.profile.bin"), "not registered", "utf8");
  await writeFile(catalogPath, JSON.stringify({ leaked: manifest.fixtures[0].fixtureId }), "utf8");

  const result = await validateTemp(root, { reviewCatalogPath: catalogPath });
  const actual = codes(result);
  for (const expected of [
    "PRODUCT_SUPPORT_OVERCLAIM",
    "PROFILE_EXECUTOR_OVERCLAIM",
    "SOURCE_FAMILY_DUPLICATE",
    "FIXTURE_POLICY_BINDING_MISMATCH",
    "PNG_DEFECT_REJECTION_CODE_MISMATCH",
    "ASSET_HASH_MISMATCH",
    "SEALED_OR_SECRET_ARTIFACT_FORBIDDEN",
    "UNREGISTERED_ASSET",
    "CATALOG_LEAK",
    "CONTRACT_SET_MISMATCH",
    "PROFILE_COUNT_INVALID",
    "GENERATED_FILE_SET_MISMATCH",
    "CHECKED_IN_GENERATED_TREE_MISMATCH",
    "GENERATED_FILE_CONTENT_MISMATCH",
  ]) assert.ok(actual.has(expected), `${expected}: ${JSON.stringify(result.issues)}`);
});

test("Slice 03 validator detects implementation drift and recursively open schemas", async (t) => {
  const wrapper = await mkdtemp(path.join(tmpdir(), "single-image-slice03-contract-"));
  const root = path.join(wrapper, "slice-03");
  const adapterPath = path.join(wrapper, "research-reference-adapters-slice03.mjs");
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  await cp(DEFAULT_SLICE03_ROOT, root, { recursive: true });
  await cp(path.resolve(PROJECT_ROOT, "scripts/research-reference-adapters-slice03.mjs"), adapterPath);
  await writeFile(adapterPath, `${await readFile(adapterPath, "utf8")}\n// tampered\n`, "utf8");
  const schemaPath = "schemas/slice03-format-matrix.v0.schema.json";
  const schema = await readJson(root, schemaPath);
  schema.additionalProperties = true;
  schema.properties.status.maxLength = 1;
  await writeJson(root, schemaPath, schema);

  const result = await validateTemp(root, { observerAdapterPath: adapterPath });
  assert.ok(codes(result).has("IMPLEMENTATION_HASH_MISMATCH"));
  assert.ok(codes(result).has("SCHEMA_OBJECT_OPEN"));
  assert.ok(codes(result).has("SCHEMA_KEYWORD_UNSUPPORTED"));
  assert.ok(codes(result).has("SCHEMA_TREE_DIGEST_MISMATCH"));
});

test("Slice 03 validator pins the full observer contract instead of trusting a recomputed self-hash", async (t) => {
  const wrapper = await mkdtemp(path.join(tmpdir(), "single-image-slice03-contract-policy-"));
  const root = path.join(wrapper, "slice-03");
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  await cp(DEFAULT_SLICE03_ROOT, root, { recursive: true });
  await mkdir(path.join(wrapper, "slice-02", "schemas"), { recursive: true });
  await cp(
    path.resolve(DEFAULT_SLICE03_ROOT, "../slice-02/schemas/normalized-image.v0.schema.json"),
    path.join(wrapper, "slice-02", "schemas", "normalized-image.v0.schema.json"),
  );

  const contractPath = "contracts/technical-observer.slice03.v0.3.0.json";
  const contract = await readJson(root, contractPath);
  contract.unknownPolicy.forbiddenInferences = contract.unknownPolicy.forbiddenInferences
    .filter((value) => value !== "identity");
  contract.contractHash = hashRecordWithout(contract, "contractHash");
  await writeJson(root, contractPath, contract);

  const result = await validateTemp(root);
  assert.ok(codes(result).has("CONTRACT_CANONICAL_HASH_MISMATCH"));
  assert.ok(codes(result).has("CONTRACT_FORBIDDEN_INFERENCES_MISMATCH"));
  assert.ok(codes(result).has("CHECKED_IN_GENERATED_TREE_MISMATCH"));
});

test("Slice 03 validator binds checked-in canonical bytes to the pinned generator tree", async (t) => {
  const wrapper = await mkdtemp(path.join(tmpdir(), "single-image-slice03-generated-drift-"));
  const root = path.join(wrapper, "slice-03");
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  await cp(DEFAULT_SLICE03_ROOT, root, { recursive: true });
  await mkdir(path.join(wrapper, "slice-02", "schemas"), { recursive: true });
  await cp(
    path.resolve(DEFAULT_SLICE03_ROOT, "../slice-02/schemas/normalized-image.v0.schema.json"),
    path.join(wrapper, "slice-02", "schemas", "normalized-image.v0.schema.json"),
  );

  const manifestPath = "manifests/fixture-manifest.normalize-deliver.dev-calibration.slice-03.v0.json";
  const manifest = await readJson(root, manifestPath);
  const fixture = manifest.fixtures.find((entry) => entry.caseKind === "canonical-reference");
  const width = 17;
  const height = 13;
  const rgba = new Uint8Array(width * height * 4);
  for (let offset = 0; offset < rgba.length; offset += 4) {
    rgba.set([(offset * 7) % 256, (offset * 11) % 256, (offset * 13) % 256, offset % 20 === 0 ? 77 : 255], offset);
  }
  const bytes = encodeReferenceSrgbPng(width, height, rgba);
  await writeFile(path.join(root, fixture.assets[0].path), bytes);
  fixture.observedDimensions = { width, height };
  fixture.perceptualHash = averageHashRgba(width, height, rgba);
  fixture.assets[0].byteLength = bytes.length;
  fixture.assets[0].sha256 = sha256(bytes);
  manifest.manifestHash = hashRecordWithout(manifest, "manifestHash");
  await writeJson(root, manifestPath, manifest);

  const result = await validateTemp(root);
  assert.ok(codes(result).has("CHECKED_IN_GENERATED_TREE_MISMATCH"));
  assert.ok(codes(result).has("GENERATED_FILE_CONTENT_MISMATCH"));
});

test("Slice 03 validator rejects schema-valid synchronized drift across every profile policy surface", async (t) => {
  const wrapper = await mkdtemp(path.join(tmpdir(), "single-image-slice03-profile-semantics-"));
  const root = path.join(wrapper, "slice-03");
  t.after(() => rm(wrapper, { recursive: true, force: true }));
  await cp(DEFAULT_SLICE03_ROOT, root, { recursive: true });
  await mkdir(path.join(wrapper, "slice-02", "schemas"), { recursive: true });
  await cp(
    path.resolve(DEFAULT_SLICE03_ROOT, "../slice-02/schemas/normalized-image.v0.schema.json"),
    path.join(wrapper, "slice-02", "schemas", "normalized-image.v0.schema.json"),
  );

  const matrix = await readJson(root, "format-matrix.json");
  const row = matrix.rows.find((entry) => entry.direction === "input" && entry.formatId === "webp");
  const profile = await readJson(root, row.profileRef);
  const rejectionCode = "S03_INPUT_WEBP_ALTERNATE_PROBE_ONLY";
  const claimBoundary = "Tampered but schema-valid synchronized policy text.";
  Object.assign(row, { rejectionCode, claimBoundary });
  Object.assign(profile, {
    mediaTypes: ["image/png"],
    extensions: ["png"],
    rejectionCode,
    claimBoundary,
  });
  Object.assign(profile.bytePolicy, {
    probeKind: "stable-policy-rejection",
    signatureLabels: ["tampered signature label"],
    constraints: ["tampered byte policy"],
  });
  matrix.matrixHash = hashRecordWithout(matrix, "matrixHash");
  profile.profileHash = hashRecordWithout(profile, "profileHash");
  await writeJson(root, "format-matrix.json", matrix);
  await writeJson(root, row.profileRef, profile);

  const result = await validateTemp(root);
  const actual = codes(result);
  assert.ok(actual.has("CHECKED_IN_GENERATED_TREE_MISMATCH"));
  assert.ok(actual.has("GENERATED_FILE_CONTENT_MISMATCH"));
  assert.equal(actual.has("PROFILE_MATRIX_VALUE_MISMATCH"), false, "drift is synchronized and needs canonical pinning");
  assert.equal(actual.has("PROFILE_EXECUTOR_OVERCLAIM"), false, "drift remains schema-valid and decoder-disabled");
});

test("Slice 03 schema evaluator enforces oneOf nullable fields instead of silently accepting arbitrary values", async () => {
  const schema = await readJson(DEFAULT_SLICE03_ROOT, "schemas/slice03-format-profile.v0.schema.json");
  const profile = await readJson(DEFAULT_SLICE03_ROOT, "profiles/input.jpeg-probe.v0.3.0.json");
  assert.deepEqual(validateSlice03SchemaInstance(profile, schema), []);
  const invalid = structuredClone(profile);
  invalid.bytePolicy.maxWidth = "unknown";
  assert.ok(validateSlice03SchemaInstance(invalid, schema).some((error) => error.location.endsWith("maxWidth")));
  assert.ok(validateSlice03SchemaInstance("too-long", { type: "string", maxLength: 1 })
    .some((error) => error.message.includes("unsupported schema keyword: maxLength")));
});
