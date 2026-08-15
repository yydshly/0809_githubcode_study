import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { deflateSync } from "node:zlib";

import {
  Slice05OracleError,
  contentHashSlice05,
  decodeIndependentPngSlice05,
  evaluateDeliveryArtifactSlice05,
  evaluateNormalizedImageSlice05,
  sha256Slice05,
  stableStringifySlice05,
  validateDeliveryArtifactSlice05,
  validateGoldRecordSlice05,
  validateNormalizedImageSlice05,
  validateOracleResultSlice05,
  verifyOutputBytesSlice05,
} from "../scripts/research-independent-png-oracle-slice05.mjs";
import { validateJsonSchemaInstance } from "../scripts/research-validate-slice02.mjs";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);
const GOLD_AT = "2026-08-15T01:00:00.000Z";
const ARTIFACT_AT = "2026-08-15T01:01:00.000Z";
const DELIVERY_AT = "2026-08-15T01:02:00.000Z";
const OBSERVED_AT = "2026-08-15T01:03:00.000Z";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBytes = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBytes.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return result;
}

function paeth(left, up, upLeft) {
  const prediction = left + up - upLeft;
  const distances = [Math.abs(prediction - left), Math.abs(prediction - up), Math.abs(prediction - upLeft)];
  if (distances[0] <= distances[1] && distances[0] <= distances[2]) return left;
  return distances[1] <= distances[2] ? up : upLeft;
}

function filteredRows(width, height, rgba, filters) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const filter = filters[y] ?? 0;
    raw[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x += 1) {
      const current = rgba[y * stride + x];
      const left = x >= 4 ? rgba[y * stride + x - 4] : 0;
      const up = y > 0 ? rgba[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? rgba[(y - 1) * stride + x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paeth(left, up, upLeft);
      raw[y * (stride + 1) + 1 + x] = (current - predictor) & 0xff;
    }
  }
  return raw;
}

function makePixels(width = 3, height = 2) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const pixel = offset / 4;
    rgba.set([(pixel * 37 + 3) % 256, (pixel * 61 + 7) % 256, (pixel * 83 + 11) % 256, pixel % 3 === 0 ? 96 : 255], offset);
  }
  return rgba;
}

function encodePng({
  width = 3,
  height = 2,
  rgba = makePixels(width, height),
  filters = Array(height).fill(0),
  beforeIdat = [],
  afterIdat = [],
  includeSrgb = true,
  compressedSuffix = Buffer.alloc(0),
  interlace = 0,
} = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, interlace], 8);
  const compressed = Buffer.concat([deflateSync(filteredRows(width, height, rgba, filters)), compressedSuffix]);
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    ...(includeSrgb ? [chunk("sRGB", Buffer.from([0]))] : []),
    ...beforeIdat,
    chunk("IDAT", compressed),
    ...afterIdat,
    chunk("IEND"),
  ]);
}

function withContentHash(record) {
  const output = { ...record, contentHash: "" };
  output.contentHash = contentHashSlice05(output);
  return output;
}

function commonArtifact({ bytes, decoded, operation, producerKind = "candidate-adapter", createdAt = ARTIFACT_AT }) {
  const adapterRef = { id: "adapter.normalize-deliver", version: "0.5.0", implementationSha256: HASH_A };
  const producerRef = producerKind === "candidate-adapter"
    ? { kind: producerKind, ...adapterRef }
    : { kind: producerKind, id: "fixture.generator", version: "0.5.0", implementationSha256: HASH_B };
  return {
    schemaVersion: operation === "normalize" ? "normalized-image.slice04.v0" : "delivery-artifact.slice04.v0",
    artifactId: operation === "normalize" ? "normalized.smoke.001" : "delivery.smoke.001",
    operation,
    parent: null,
    capabilityContractRef: {
      id: operation === "normalize" ? "CC-CAP02-NORMALIZE-PNG@0.5.0" : "CC-CAP02-EXPORT-PNG@0.5.0",
      contentHash: HASH_B,
    },
    candidateRef: { id: "REG-NORM-SHARP@0.5.0", contentHash: HASH_C },
    adapterRef,
    producerRef,
    runtimeRef: { id: "runtime.win32-x64.node22", contentHash: HASH_C },
    hardwareRef: { id: "hardware.test.win32-x64", contentHash: HASH_D },
    attempt: {
      runId: "run.smoke.001",
      sourceId: "source.smoke.001",
      partition: "smoke",
      repetition: 1,
      attemptNumber: 1,
      idempotencyKey: `idem.${operation}.smoke.001`,
    },
    bytes: {
      relativePath: `outputs/${operation}.smoke.001.png`,
      mime: "image/png",
      byteLength: bytes.length,
      fileSha256: decoded.fileSha256,
      decodedPixelSha256: decoded.decodedPixelSha256,
    },
    image: {
      width: decoded.width,
      height: decoded.height,
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      orientation: 1,
      alphaMode: "straight-unpremultiplied",
      alphaPresent: decoded.alphaPresent,
      metadataPolicy: "strip-all-except-color-contract",
      pngFilterPolicy: "filter-0-only",
      interlace: "forbidden",
      animation: "forbidden",
    },
    createdAt,
    contentHash: "",
  };
}

function normalizedFixture({ bytes = encodePng(), producerKind = "candidate-adapter", createdAt = ARTIFACT_AT } = {}) {
  const decoded = decodeIndependentPngSlice05(bytes);
  const artifact = commonArtifact({ bytes, decoded, operation: "normalize", producerKind, createdAt });
  artifact.parent = {
    sourceAssetId: "source-asset.smoke.001",
    sourceFileSha256: HASH_A,
    sourceDecodedPixelSha256: HASH_B,
    sourceManifestSha256: HASH_C,
  };
  return { bytes, decoded, artifact: withContentHash(artifact) };
}

function deliveryFixture(parentNormalizedImage, { bytes = encodePng(), createdAt = DELIVERY_AT } = {}) {
  const decoded = decodeIndependentPngSlice05(bytes);
  const artifact = commonArtifact({ bytes, decoded, operation: "export", createdAt });
  artifact.attempt.sourceId = parentNormalizedImage.artifactId;
  artifact.parent = {
    normalizedImageId: parentNormalizedImage.artifactId,
    normalizedArtifactSha256: parentNormalizedImage.contentHash,
    normalizedFileSha256: parentNormalizedImage.bytes.fileSha256,
    normalizedDecodedPixelSha256: parentNormalizedImage.bytes.decodedPixelSha256,
  };
  return { bytes, decoded, artifact: withContentHash(artifact) };
}

function expectedParent(artifact) {
  if (artifact.operation === "normalize") {
    return {
      id: artifact.parent.sourceAssetId,
      artifactSha256: null,
      fileSha256: artifact.parent.sourceFileSha256,
      decodedPixelSha256: artifact.parent.sourceDecodedPixelSha256,
      manifestSha256: artifact.parent.sourceManifestSha256,
    };
  }
  return {
    id: artifact.parent.normalizedImageId,
    artifactSha256: artifact.parent.normalizedArtifactSha256,
    fileSha256: artifact.parent.normalizedFileSha256,
    decodedPixelSha256: artifact.parent.normalizedDecodedPixelSha256,
    manifestSha256: null,
  };
}

function goldFor(artifact, decoded, overrides = {}) {
  const record = {
    schemaVersion: "gold-record.slice05.v0",
    goldRecordId: `gold.${artifact.operation}.${artifact.attempt.sourceId}`,
    operation: artifact.operation,
    sourceId: artifact.attempt.sourceId,
    partition: artifact.attempt.partition,
    provenance: {
      kind: "project-original-procedural",
      producerId: "gold.generator.independent",
      producerVersion: "0.5.0",
      implementationSha256: HASH_D,
      authorIds: ["role.gold-author"],
      candidateAuthorIds: ["role.candidate-author"],
      candidateProduced: false,
      candidateOutputUsed: false,
      candidateDependencyUsed: false,
    },
    expected: {
      parentIdentity: expectedParent(artifact),
      mime: "image/png",
      width: decoded.width,
      height: decoded.height,
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      orientation: 1,
      alphaMode: "straight-unpremultiplied",
      alphaPresent: decoded.alphaPresent,
      metadataPolicy: "strip-all-except-color-contract",
      pngFilterPolicy: "filter-0-only",
      interlace: "forbidden",
      animation: "forbidden",
      fileSha256: decoded.fileSha256,
      decodedPixelSha256: decoded.decodedPixelSha256,
    },
    frozenAt: GOLD_AT,
    contentHash: "",
  };
  const merged = {
    ...record,
    ...overrides,
    provenance: { ...record.provenance, ...(overrides.provenance ?? {}) },
    expected: { ...record.expected, ...(overrides.expected ?? {}) },
  };
  return withContentHash(merged);
}

function assertOracleCode(action, code) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof Slice05OracleError);
    assert.equal(error.code, code);
    return true;
  });
}

async function loadSchema(name) {
  return JSON.parse(await readFile(new URL(`../research/slice-05/schemas/${name}`, import.meta.url), "utf8"));
}

function assertEveryObjectClosed(schema) {
  const visit = (node, location) => {
    if (node === null || typeof node !== "object") return;
    if (node.type === "object" || (Array.isArray(node.type) && node.type.includes("object"))) {
      assert.equal(node.additionalProperties, false, `${location} must be closed`);
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), `${location} must require every property`);
    }
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value)) value.forEach((entry, index) => visit(entry, `${location}.${key}[${index}]`));
      else visit(value, `${location}.${key}`);
    }
  };
  visit(schema, "$schema");
}

test("Slice 05 oracle implementation imports only Node builtins and has no Sharp/candidate/shared-decoder dependency", async () => {
  const source = await readFile(new URL("../scripts/research-independent-png-oracle-slice05.mjs", import.meta.url), "utf8");
  const imports = [...source.matchAll(/^import .* from "([^"]+)";/gm)].map((match) => match[1]).sort();
  assert.deepEqual(imports, ["node:crypto", "node:zlib"]);
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:sharp|reference-adapters|candidate)[^"']*["']/i);
});

test("independent decoder reopens closed RGBA8/sRGB PNG and recomputes file and decoded-pixel hashes", () => {
  const rgba = makePixels(4, 3);
  const bytes = encodePng({ width: 4, height: 3, rgba });
  const facts = decodeIndependentPngSlice05(bytes);
  assert.equal(facts.width, 4);
  assert.equal(facts.height, 3);
  assert.deepEqual(facts.rgba, rgba);
  assert.equal(facts.fileSha256, sha256Slice05(bytes));
  assert.equal(facts.decodedPixelSha256, sha256Slice05(rgba));
  assert.equal(facts.filter0Only, true);
  assert.deepEqual(facts.chunkTypes, ["IHDR", "sRGB", "IDAT", "IEND"]);
});

test("independent decoder implements PNG filters 0 through 4 while exposing noncanonical output filtering", () => {
  const width = 4;
  const height = 5;
  const rgba = makePixels(width, height);
  const bytes = encodePng({ width, height, rgba, filters: [0, 1, 2, 3, 4] });
  const facts = decodeIndependentPngSlice05(bytes);
  assert.deepEqual(facts.rgba, rgba);
  assert.deepEqual(facts.filterTypes, [0, 1, 2, 3, 4]);
  assert.equal(facts.filter0Only, false);
});

test("adapter-facing verifier returns the exact fact contract and rejects output identity drift", () => {
  const bytes = encodePng();
  const decoded = decodeIndependentPngSlice05(bytes);
  const expected = {
    mime: "image/png",
    byteLength: bytes.length,
    fileSha256: decoded.fileSha256,
    decodedPixelSha256: decoded.decodedPixelSha256,
    width: decoded.width,
    height: decoded.height,
    pixelLayout: "RGBA8",
    colorSpace: "embedded-sRGB",
    orientation: 1,
    alphaMode: "straight-unpremultiplied",
    alphaPresent: decoded.alphaPresent,
    metadataPolicy: "strip-all-except-color-contract",
    pngFilterPolicy: "filter-0-only",
    interlace: "forbidden",
    animation: "forbidden",
  };
  const facts = verifyOutputBytesSlice05({ operation: "normalize", bytes, expected });
  assert.deepEqual(facts, expected);
  assertOracleCode(
    () => verifyOutputBytesSlice05({ operation: "normalize", bytes, expected: { ...expected, decodedPixelSha256: HASH_D } }),
    "ORACLE_EXPECTED_IDENTITY_MISMATCH",
  );
  const exportExpected = Object.fromEntries(Object.entries(expected).filter(([key]) => !["mime", "byteLength", "fileSha256"].includes(key)));
  assert.deepEqual(verifyOutputBytesSlice05({ operation: "export", bytes, expected: exportExpected }), expected);
  assertOracleCode(
    () => verifyOutputBytesSlice05({ operation: "export", bytes: encodePng({ filters: [1, 0] }), expected: exportExpected }),
    "ORACLE_PNG_FILTER_POLICY_MISMATCH",
  );
});

test("decoder fails closed on CRC, color/metadata/animation/critical chunks, interlace, and trailing bytes", () => {
  const base = encodePng();
  const badCrc = Buffer.from(base);
  badCrc[badCrc.length - 1] ^= 1;
  const cases = [
    [badCrc, "ORACLE_PNG_CRC_MISMATCH"],
    [encodePng({ includeSrgb: false }), "ORACLE_PNG_STRUCTURE_INVALID"],
    [encodePng({ beforeIdat: [chunk("acTL", Buffer.alloc(8))] }), "ORACLE_PNG_APNG_FORBIDDEN"],
    [encodePng({ beforeIdat: [chunk("iCCP", Buffer.from([0]))] }), "ORACLE_PNG_ICCP_FORBIDDEN"],
    [encodePng({ beforeIdat: [chunk("eXIf", Buffer.from([0]))] }), "ORACLE_PNG_EXIF_FORBIDDEN"],
    [encodePng({ beforeIdat: [chunk("ABCD", Buffer.from([0]))] }), "ORACLE_PNG_UNKNOWN_CRITICAL"],
    [encodePng({ beforeIdat: [chunk("tEXt", Buffer.from("x\0y"))] }), "ORACLE_PNG_METADATA_FORBIDDEN"],
    [encodePng({ interlace: 1 }), "ORACLE_PNG_INTERLACE_FORBIDDEN"],
    [Buffer.concat([base, Buffer.from([0])]), "ORACLE_PNG_TRAILING_BYTES"],
    [encodePng({ compressedSuffix: Buffer.from([1, 2, 3]) }), "ORACLE_PNG_DECODE_LENGTH_MISMATCH"],
  ];
  for (const [bytes, code] of cases) assertOracleCode(() => decodeIndependentPngSlice05(bytes), code);
});

test("decoder rejects invalid filter types and over-limit bytes", () => {
  assertOracleCode(() => decodeIndependentPngSlice05(encodePng({ filters: [5, 0] })), "ORACLE_PNG_FILTER_INVALID");
  assertOracleCode(() => decodeIndependentPngSlice05(Buffer.alloc(1024 * 1024 + 1)), "ORACLE_BYTES_LIMIT_EXCEEDED");
});

test("normalized evaluation emits exact facts, 21 per-check outcomes, and a schema-valid all-pass result", async () => {
  const fixture = normalizedFixture();
  const gold = goldFor(fixture.artifact, fixture.decoded);
  const result = evaluateNormalizedImageSlice05({
    artifact: fixture.artifact,
    actualBytes: fixture.bytes,
    goldRecord: gold,
    oracleImplementationSha256: HASH_C,
    observedAt: OBSERVED_AT,
  });
  assert.equal(result.overallStatus, "pass");
  assert.equal(result.checks.length, 21);
  assert.ok(result.checks.every(({ status, reason }) => status === "pass" && reason === null));
  assert.deepEqual(Object.keys(result.facts).sort(), ["alphaMode", "alphaPresent", "animation", "byteLength", "colorSpace", "decodedPixelSha256", "fileSha256", "height", "interlace", "metadataPolicy", "mime", "orientation", "pixelLayout", "pngFilterPolicy", "width"].sort());
  assert.equal(result.facts.fileSha256, sha256Slice05(fixture.bytes));
  assert.equal(result.facts.decodedPixelSha256, sha256Slice05(fixture.decoded.rgba));
  assert.equal(result.contentHash, contentHashSlice05(result));

  const schemas = await Promise.all([
    loadSchema("normalized-image.slice04.v0.schema.json"),
    loadSchema("gold-record.slice05.v0.schema.json"),
    loadSchema("oracle-result.slice05.v0.schema.json"),
  ]);
  assert.deepEqual(validateJsonSchemaInstance(fixture.artifact, schemas[0]), []);
  assert.deepEqual(validateJsonSchemaInstance(gold, schemas[1]), []);
  assert.deepEqual(validateJsonSchemaInstance(result, schemas[2]), []);
});

test("durable oracle-result validator rejects unknown fields, self-rehashed semantic drift, and invalid UTC", () => {
  const fixture = normalizedFixture();
  const gold = goldFor(fixture.artifact, fixture.decoded);
  const result = evaluateNormalizedImageSlice05({
    artifact: fixture.artifact,
    actualBytes: fixture.bytes,
    goldRecord: gold,
    oracleImplementationSha256: HASH_C,
    observedAt: OBSERVED_AT,
  });
  assert.equal(validateOracleResultSlice05(result), result);

  const extra = { ...result, unexpected: true, contentHash: "" };
  extra.contentHash = contentHashSlice05(extra);
  assertOracleCode(() => validateOracleResultSlice05(extra), "ORACLE_OBJECT_SHAPE_MISMATCH");

  const statusDrift = { ...result, overallStatus: "non-pass", contentHash: "" };
  statusDrift.contentHash = contentHashSlice05(statusDrift);
  assertOracleCode(() => validateOracleResultSlice05(statusDrift), "ORACLE_RESULT_STATUS_MISMATCH");

  const duplicateCheck = structuredClone(result);
  duplicateCheck.checks[1].checkId = duplicateCheck.checks[0].checkId;
  duplicateCheck.contentHash = contentHashSlice05(duplicateCheck);
  assertOracleCode(() => validateOracleResultSlice05(duplicateCheck), "ORACLE_RESULT_CHECKS_INVALID");

  const rolloverDate = { ...result, observedAt: "2026-02-31T01:03:00.000Z", contentHash: "" };
  rolloverDate.contentHash = contentHashSlice05(rolloverDate);
  assertOracleCode(() => validateOracleResultSlice05(rolloverDate), "ORACLE_TIME_INVALID");
});

test("all PNG filters decode, but a non-zero filter produces a specific contract non-pass", () => {
  const bytes = encodePng({ filters: [1, 4] });
  const fixture = normalizedFixture({ bytes });
  const gold = goldFor(fixture.artifact, fixture.decoded);
  const result = evaluateNormalizedImageSlice05({ artifact: fixture.artifact, actualBytes: bytes, goldRecord: gold, oracleImplementationSha256: HASH_C, observedAt: OBSERVED_AT });
  assert.equal(result.overallStatus, "non-pass");
  assert.deepEqual(result.checks.filter(({ status }) => status !== "pass").map(({ checkId }) => checkId), ["png-filter-policy"]);
  assert.equal(result.facts.pngFilterPolicy, "noncanonical-filter-present");
});

test("reopened byte and pixel identities cannot be self-certified by artifact declarations", () => {
  const fixture = normalizedFixture();
  const forged = structuredClone(fixture.artifact);
  forged.bytes.fileSha256 = HASH_D;
  forged.bytes.decodedPixelSha256 = HASH_D;
  const artifact = withContentHash(forged);
  const gold = goldFor(artifact, fixture.decoded, { expected: { fileSha256: fixture.decoded.fileSha256, decodedPixelSha256: fixture.decoded.decodedPixelSha256 } });
  const result = evaluateNormalizedImageSlice05({ artifact, actualBytes: fixture.bytes, goldRecord: gold, oracleImplementationSha256: HASH_C, observedAt: OBSERVED_AT });
  assert.equal(result.overallStatus, "non-pass");
  assert.equal(result.checks.find(({ checkId }) => checkId === "file-sha256").status, "non-pass");
  assert.equal(result.checks.find(({ checkId }) => checkId === "decoded-pixel-sha256").status, "non-pass");
});

test("gold provenance fails closed on candidate production, candidate dependencies, and author overlap", () => {
  const fixture = normalizedFixture();
  const base = goldFor(fixture.artifact, fixture.decoded);
  for (const provenance of [
    { candidateProduced: true },
    { candidateOutputUsed: true },
    { candidateDependencyUsed: true },
  ]) {
    const gold = withContentHash({ ...base, provenance: { ...base.provenance, ...provenance }, contentHash: "" });
    assertOracleCode(() => validateGoldRecordSlice05(gold), "ORACLE_GOLD_CANDIDATE_TAINTED");
  }
  const overlap = withContentHash({ ...base, provenance: { ...base.provenance, authorIds: [base.provenance.candidateAuthorIds[0]] }, contentHash: "" });
  assertOracleCode(() => validateGoldRecordSlice05(overlap), "ORACLE_GOLD_ROLE_CONFLICT");

  const candidateImplementation = withContentHash({ ...base, provenance: { ...base.provenance, implementationSha256: HASH_A }, contentHash: "" });
  assertOracleCode(
    () => evaluateNormalizedImageSlice05({ artifact: fixture.artifact, actualBytes: fixture.bytes, goldRecord: candidateImplementation, oracleImplementationSha256: HASH_C, observedAt: OBSERVED_AT }),
    "ORACLE_GOLD_CANDIDATE_TAINTED",
  );
});

test("candidate adapter cannot be reused as oracle or mislabeled as an independent producer", () => {
  const fixture = normalizedFixture();
  const gold = goldFor(fixture.artifact, fixture.decoded);
  assertOracleCode(() => evaluateNormalizedImageSlice05({ artifact: fixture.artifact, actualBytes: fixture.bytes, goldRecord: gold, oracleImplementationSha256: HASH_A, observedAt: OBSERVED_AT }), "ORACLE_NOT_INDEPENDENT");

  const mislabeled = structuredClone(fixture.artifact);
  mislabeled.producerRef = { kind: "independent-fixture-generator", ...mislabeled.adapterRef };
  const artifact = withContentHash(mislabeled);
  assertOracleCode(() => validateNormalizedImageSlice05(artifact), "ORACLE_PRODUCER_BINDING_MISMATCH");
});

test("export evaluation requires an independently generated and hash-bound NormalizedImage parent", async () => {
  const parent = normalizedFixture({ producerKind: "independent-fixture-generator", createdAt: "2026-08-15T00:59:00.000Z" });
  const delivery = deliveryFixture(parent.artifact);
  const gold = goldFor(delivery.artifact, delivery.decoded, {
    expected: {
      parentIdentity: {
        ...expectedParent(delivery.artifact),
        manifestSha256: parent.artifact.parent.sourceManifestSha256,
      },
    },
  });
  const result = evaluateDeliveryArtifactSlice05({ artifact: delivery.artifact, parentNormalizedImage: parent.artifact, actualBytes: delivery.bytes, goldRecord: gold, oracleImplementationSha256: HASH_C, observedAt: OBSERVED_AT });
  assert.equal(result.overallStatus, "pass");

  const wrongManifest = withContentHash({
    ...gold,
    expected: {
      ...gold.expected,
      parentIdentity: { ...gold.expected.parentIdentity, manifestSha256: HASH_D },
    },
    contentHash: "",
  });
  assertOracleCode(
    () => evaluateDeliveryArtifactSlice05({ artifact: delivery.artifact, parentNormalizedImage: parent.artifact, actualBytes: delivery.bytes, goldRecord: wrongManifest, oracleImplementationSha256: HASH_C, observedAt: OBSERVED_AT }),
    "ORACLE_EXPORT_PARENT_MANIFEST_MISMATCH",
  );

  const upstreamRawSource = structuredClone(delivery.artifact);
  upstreamRawSource.attempt.sourceId = parent.artifact.attempt.sourceId;
  upstreamRawSource.contentHash = contentHashSlice05(upstreamRawSource);
  assertOracleCode(
    () => evaluateDeliveryArtifactSlice05({ artifact: upstreamRawSource, parentNormalizedImage: parent.artifact, actualBytes: delivery.bytes, goldRecord: gold, oracleImplementationSha256: HASH_C, observedAt: OBSERVED_AT }),
    "ORACLE_EXPORT_PARENT_LINEAGE_MISMATCH",
  );

  const wrongPartition = structuredClone(delivery.artifact);
  wrongPartition.attempt.partition = "dev/calibration";
  wrongPartition.contentHash = contentHashSlice05(wrongPartition);
  assertOracleCode(
    () => evaluateDeliveryArtifactSlice05({ artifact: wrongPartition, parentNormalizedImage: parent.artifact, actualBytes: delivery.bytes, goldRecord: gold, oracleImplementationSha256: HASH_C, observedAt: OBSERVED_AT }),
    "ORACLE_EXPORT_PARENT_LINEAGE_MISMATCH",
  );

  const predatesParent = structuredClone(delivery.artifact);
  predatesParent.createdAt = "2026-08-15T00:58:59.999Z";
  predatesParent.contentHash = contentHashSlice05(predatesParent);
  assertOracleCode(
    () => evaluateDeliveryArtifactSlice05({ artifact: predatesParent, parentNormalizedImage: parent.artifact, actualBytes: delivery.bytes, goldRecord: gold, oracleImplementationSha256: HASH_C, observedAt: OBSERVED_AT }),
    "ORACLE_EXPORT_PARENT_LINEAGE_MISMATCH",
  );

  const candidateParent = normalizedFixture({ producerKind: "candidate-adapter" });
  const candidateDelivery = deliveryFixture(candidateParent.artifact);
  const candidateGold = goldFor(candidateDelivery.artifact, candidateDelivery.decoded);
  assertOracleCode(() => evaluateDeliveryArtifactSlice05({ artifact: candidateDelivery.artifact, parentNormalizedImage: candidateParent.artifact, actualBytes: candidateDelivery.bytes, goldRecord: candidateGold, oracleImplementationSha256: HASH_C, observedAt: OBSERVED_AT }), "ORACLE_EXPORT_PARENT_CANDIDATE_TAINTED");

  const schema = await loadSchema("delivery-artifact.slice04.v0.schema.json");
  assert.deepEqual(validateJsonSchemaInstance(delivery.artifact, schema), []);
  assert.equal(validateDeliveryArtifactSlice05(delivery.artifact), delivery.artifact);
});

test("artifact and gold records are strict, content-addressed, and cannot enter formal partitions", () => {
  const fixture = normalizedFixture();
  assert.equal(validateNormalizedImageSlice05(fixture.artifact), fixture.artifact);
  assert.equal(stableStringifySlice05({ z: 1, a: { y: 2, x: 3 } }), "{\n  \"a\": {\n    \"x\": 3,\n    \"y\": 2\n  },\n  \"z\": 1\n}\n");

  const extra = withContentHash({ ...fixture.artifact, unexpected: true, contentHash: "" });
  assertOracleCode(() => validateNormalizedImageSlice05(extra), "ORACLE_OBJECT_SHAPE_MISMATCH");
  const formal = structuredClone(fixture.artifact);
  formal.attempt.partition = "holdout";
  const formalArtifact = withContentHash(formal);
  assertOracleCode(() => validateNormalizedImageSlice05(formalArtifact), "ORACLE_PARTITION_FORBIDDEN");
  const staleHash = { ...fixture.artifact, image: { ...fixture.artifact.image, width: 2 } };
  assertOracleCode(() => validateNormalizedImageSlice05(staleHash), "ORACLE_CONTENT_HASH_MISMATCH");

  const rolloverDate = withContentHash({ ...fixture.artifact, createdAt: "2026-02-31T01:01:00.000Z", contentHash: "" });
  assertOracleCode(() => validateNormalizedImageSlice05(rolloverDate), "ORACLE_TIME_INVALID");
});

test("all four Slice 05 schemas recursively close every object and require every declared property", async () => {
  const names = [
    "normalized-image.slice04.v0.schema.json",
    "delivery-artifact.slice04.v0.schema.json",
    "oracle-result.slice05.v0.schema.json",
    "gold-record.slice05.v0.schema.json",
  ];
  for (const name of names) assertEveryObjectClosed(await loadSchema(name));
});
