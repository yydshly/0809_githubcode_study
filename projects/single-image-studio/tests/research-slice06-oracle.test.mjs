import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";

import {
  SLICE06_DIAGNOSTIC_LIMITS,
  SLICE06_DIAGNOSTIC_ORACLE_ID,
  buildCandidateOutputObservationSlice06,
  buildDiagnosticEnvelopeSlice06,
  buildOracleDiagnosticSlice06,
  contentHashSlice06Diagnostic,
  validateCandidateOutputObservationSlice06,
  validateDiagnosticEnvelopeSlice06,
  validateOracleDiagnosticSlice06,
  validatePngDiagnosticVerificationSlice06,
  verifyOutputBytesSlice06,
} from "../scripts/research-diagnostic-png-oracle-slice06.mjs";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts", "research-diagnostic-png-oracle-slice06.mjs");
const SCHEMA_ROOT = path.join(PROJECT_ROOT, "research", "slice-06", "schemas");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const T0 = "2026-08-15T05:00:00.000Z";
const PIXELS = Buffer.from([
  5, 10, 15, 255, 20, 25, 30, 128,
  35, 40, 45, 255, 50, 55, 60, 0,
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0), { corruptCrc = false } = {}) {
  const typeBytes = Buffer.from(type, "ascii");
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  if (corruptCrc) output[output.length - 1] ^= 0x01;
  return output;
}

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const dl = Math.abs(estimate - left);
  const du = Math.abs(estimate - up);
  const dul = Math.abs(estimate - upperLeft);
  if (dl <= du && dl <= dul) return left;
  return du <= dul ? up : upperLeft;
}

function filteredRows(rgba, width, height, filterType) {
  const stride = width * 4;
  const output = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    output[y * (stride + 1)] = filterType;
    for (let x = 0; x < stride; x += 1) {
      const at = y * stride + x;
      const left = x >= 4 ? rgba[at - 4] : 0;
      const up = y > 0 ? rgba[at - stride] : 0;
      const upperLeft = y > 0 && x >= 4 ? rgba[at - stride - 4] : 0;
      let predictor = 0;
      if (filterType === 1) predictor = left;
      else if (filterType === 2) predictor = up;
      else if (filterType === 3) predictor = Math.floor((left + up) / 2);
      else if (filterType === 4) predictor = paeth(left, up, upperLeft);
      output[y * (stride + 1) + 1 + x] = (rgba[at] - predictor) & 0xff;
    }
  }
  return output;
}

function encodePng({
  rgba = PIXELS,
  width = 2,
  height = 2,
  filterType = 0,
  includeSrgb = true,
  srgbData = Buffer.from([0]),
  beforeIdat = [],
  afterIdat = [],
  trailing = Buffer.alloc(0),
  corruptHeaderCrc = false,
} = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const chunks = [pngChunk("IHDR", header, { corruptCrc: corruptHeaderCrc })];
  if (includeSrgb) chunks.push(pngChunk("sRGB", srgbData));
  chunks.push(...beforeIdat);
  chunks.push(pngChunk("IDAT", deflateSync(filteredRows(rgba, width, height, filterType))));
  chunks.push(...afterIdat, pngChunk("IEND"));
  return Buffer.concat([PNG_SIGNATURE, ...chunks, trailing]);
}

function expectedFacts(rgba = PIXELS) {
  return {
    decodedPixelSha256: sha256(rgba),
    width: 2,
    height: 2,
    pixelLayout: "RGBA8",
    colorSpace: "embedded-sRGB",
    orientation: 1,
    alphaMode: "straight-unpremultiplied",
    alphaPresent: true,
    metadataPolicy: "strip-all-except-color-contract",
    pngFilterPolicy: "filter-0-only",
    interlace: "forbidden",
    animation: "forbidden",
  };
}

function ref(id, contentHash = HASH_A) {
  return { id, contentHash };
}

function implementationRef(id, implementationSha256 = HASH_B) {
  return { id, version: "0.6.0", implementationSha256 };
}

function attempt(overrides = {}) {
  return {
    runId: "RUN-DIAGNOSTIC-0001",
    sourceId: "source-original-01",
    partition: "diagnostic",
    repetition: 1,
    attemptNumber: 1,
    idempotencyKey: "diagnostic.normalize.source-original-01.r1",
    ...overrides,
  };
}

function rights(overrides = {}) {
  return {
    rightsRef: ref("RIGHTS-S06-OPEN@0.6.0"),
    assetClass: "project-original-deterministic-synthetic-open-research-fixtures",
    containsRealPerson: false,
    realUserPhotosUsed: false,
    thirdPartyAssetsUsed: false,
    modelWeightsUsed: false,
    candidateDerivativeRepositoryRetention: true,
    diagnosticPublicDisplay: true,
    ...overrides,
  };
}

function retention(state = "retained") {
  return {
    state,
    reasonCode: state === "retained"
      ? "S06_DIAGNOSTIC_RETENTION_AUTHORIZED_OPEN_SYNTHETIC"
      : "S06_DIAGNOSTIC_RETENTION_HASH_ONLY",
    policyRef: ref("RETENTION-S06@0.6.0"),
    maxPerOutputBytes: 1048576,
    maxSessionBytes: 18874368,
  };
}

function outputObservation(bytes, strictDecision, overrides = {}) {
  return buildCandidateOutputObservationSlice06({
    operation: "normalize",
    strictDecision,
    requestRef: ref("REQUEST-S06-001"),
    attempt: attempt(),
    candidateRef: ref("REG-NORM-SHARP@0.6.0"),
    adapterRef: implementationRef("ADAPTER-NORMALIZE-S06@0.6.0"),
    workerRef: implementationRef("WORKER-S06@0.6.0", HASH_C),
    runtimeRef: ref("RUNTIME-S06@0.6.0"),
    hardwareRef: ref("HARDWARE-S06@0.6.0"),
    rights: rights(),
    retention: retention(),
    bytes,
    producedAt: T0,
    ...overrides,
  });
}

function oracleDiagnostic(observation, verification) {
  return buildOracleDiagnosticSlice06({
    requestRef: ref("REQUEST-S06-001"),
    attempt: attempt(),
    oracleRef: implementationRef(SLICE06_DIAGNOSTIC_ORACLE_ID),
    candidateOutputObservation: observation,
    verification,
    observedAt: "2026-08-15T05:00:00.050Z",
  });
}

function workerObservation() {
  return {
    message: { received: true, receivedAt: "2026-08-15T05:00:00.100Z", protocolVersion: "slice06.v0", status: "succeeded", payloadSha256: HASH_A },
    runtime: { payloadSha256: HASH_B, matchesFrozen: true },
    telemetry: { source: "worker-self-reported-not-hard-isolation", workerDurationMs: 90, resourceUsage: { maxRssKiB: 2048, userCpuMicros: 500, systemCpuMicros: 100 } },
    parentWall: { startedAt: T0, messageAt: "2026-08-15T05:00:00.100Z", exitedAt: "2026-08-15T05:00:00.200Z", finishedAt: "2026-08-15T05:00:00.250Z", durationMs: 250 },
    exit: { confirmed: true, exitCode: 0, signal: null, terminationRequested: false },
  };
}

function rehash(record) {
  record.contentHash = contentHashSlice06Diagnostic(record);
  return record;
}

test("diagnostic oracle imports only Node builtins and has no candidate or prior decoder dependency", async () => {
  const source = await readFile(SCRIPT_PATH, "utf8");
  const imports = [...source.matchAll(/^import .* from "([^"]+)";$/gmu)].map((match) => match[1]);
  assert.deepEqual(imports, ["node:crypto", "node:zlib"]);
  assert.doesNotMatch(source, /research-independent-png-oracle-slice05/iu);
  assert.doesNotMatch(source, /from ["'][^"']*sharp/iu);
});

test("canonical RGBA8 sRGB filter-0 PNG passes with independently recomputed file and pixel hashes", () => {
  const png = encodePng();
  const result = verifyOutputBytesSlice06({ operation: "normalize", bytes: png, expected: expectedFacts() });
  assert.equal(result.overallStatus, "pass");
  assert.equal(result.primaryCode, null);
  assert.equal(result.actualBytes.mediaType, "image/png");
  assert.equal(result.actualBytes.fileSha256, sha256(png));
  assert.equal(result.actualBytes.decodedPixelSha256, sha256(PIXELS));
  assert.deepEqual(result.facts.filterTypes, [0, 0]);
  assert.equal(result.contentHash, contentHashSlice06Diagnostic(result));
  assert.equal(validatePngDiagnosticVerificationSlice06(result), result);
});

test("missing sRGB is the exact primary taxonomy while decoded partial facts remain durable", () => {
  const png = encodePng({ includeSrgb: false });
  const result = verifyOutputBytesSlice06({ operation: "export", bytes: png, expected: expectedFacts() });
  assert.equal(result.overallStatus, "non-pass");
  assert.equal(result.primaryCode, "S06_ORACLE_PNG_SRGB_REQUIRED");
  assert.equal(result.actualBytes.fileSha256, sha256(png));
  assert.equal(result.actualBytes.decodedPixelSha256, sha256(PIXELS));
  assert.equal(result.facts.width, 2);
  assert.equal(result.facts.colorSpace, null);
  assert(result.findings.some(({ code }) => code === "S06_ORACLE_EXPECTED_IDENTITY_MISMATCH"));
});

test("all PNG filters are independently decoded and nonzero filters receive a precise policy finding", () => {
  for (let filterType = 0; filterType <= 4; filterType += 1) {
    const result = verifyOutputBytesSlice06({ operation: "normalize", bytes: encodePng({ filterType }), expected: expectedFacts() });
    assert.equal(result.actualBytes.decodedPixelSha256, sha256(PIXELS));
    assert.deepEqual(result.facts.filterTypes, [filterType, filterType]);
    assert.equal(result.overallStatus, filterType === 0 ? "pass" : "non-pass");
    assert.equal(result.primaryCode, filterType === 0 ? null : "S06_ORACLE_PNG_FILTER_POLICY_MISMATCH");
  }
});

test("frozen precedence chooses structural CRC ahead of profile findings", () => {
  const result = verifyOutputBytesSlice06({ operation: "normalize", bytes: encodePng({ includeSrgb: false, corruptHeaderCrc: true }), expected: expectedFacts() });
  assert.equal(result.primaryCode, "S06_ORACLE_PNG_CRC_MISMATCH");
  assert.equal(result.actualBytes.decodedPixelSha256, null);
});

test("APNG, metadata, invalid sRGB, and trailing bytes retain distinct structured findings", () => {
  const cases = [
    [encodePng({ beforeIdat: [pngChunk("acTL", Buffer.alloc(8))] }), "S06_ORACLE_PNG_APNG_FORBIDDEN"],
    [encodePng({ beforeIdat: [pngChunk("tEXt", Buffer.from("x"))] }), "S06_ORACLE_PNG_METADATA_FORBIDDEN"],
    [encodePng({ srgbData: Buffer.alloc(0) }), "S06_ORACLE_PNG_SRGB_INVALID"],
    [encodePng({ trailing: Buffer.from([1, 2, 3]) }), "S06_ORACLE_PNG_TRAILING_BYTES"],
  ];
  for (const [bytes, code] of cases) {
    const result = verifyOutputBytesSlice06({ operation: "normalize", bytes, expected: expectedFacts() });
    assert(result.findings.some((entry) => entry.code === code), code);
  }
});

test("byte envelope is bounded before hashing and arbitrary non-PNG bytes stay octet-stream", () => {
  const oversized = new Uint8Array(SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes + 1);
  const over = verifyOutputBytesSlice06({ operation: "normalize", bytes: oversized, expected: expectedFacts() });
  assert.equal(over.primaryCode, "S06_ORACLE_BYTES_LIMIT_EXCEEDED");
  assert.equal(over.actualBytes.fileSha256, null);
  const arbitrary = Buffer.from("not a png", "utf8");
  const invalid = verifyOutputBytesSlice06({ operation: "normalize", bytes: arbitrary, expected: expectedFacts() });
  assert.equal(invalid.primaryCode, "S06_ORACLE_PNG_SIGNATURE_MISMATCH");
  assert.equal(invalid.actualBytes.mediaType, "application/octet-stream");
  assert.equal(invalid.actualBytes.fileSha256, sha256(arbitrary));
});

test("verification validator rejects unknown fields, self-hash tampering, and status laundering", () => {
  const valid = verifyOutputBytesSlice06({ operation: "normalize", bytes: encodePng(), expected: expectedFacts() });
  assert.throws(() => validatePngDiagnosticVerificationSlice06({ ...valid, surprise: true }), /S06_DIAGNOSTIC_RECORD_INVALID/u);
  assert.throws(() => validatePngDiagnosticVerificationSlice06({ ...valid, contentHash: HASH_A }), /S06_DIAGNOSTIC_CONTENT_HASH_MISMATCH/u);
  const laundered = rehash({ ...structuredClone(valid), overallStatus: "non-pass", primaryCode: "S06_ORACLE_PNG_SRGB_REQUIRED" });
  assert.throws(() => validatePngDiagnosticVerificationSlice06(laundered), /status and primaryCode/u);
});

test("candidate output observation separates pass specimens from non-pass quarantine and remains nonartifact", () => {
  const bytes = encodePng();
  const pass = outputObservation(bytes, "pass");
  assert.equal(pass.bytes.relativePath, "specimens/normalize/source-original-01/r1/candidate-output.bin");
  assert.equal(pass.artifactEligible, false);
  assert.equal(pass.evidenceBoundary.c1, 0);
  assert.equal(validateCandidateOutputObservationSlice06(pass), pass);
  const nonpass = outputObservation(bytes, "non-pass");
  assert.equal(nonpass.bytes.relativePath, "quarantine/normalize/source-original-01/r1/candidate-output.bin");
  const pathLaundered = structuredClone(nonpass);
  pathLaundered.bytes.relativePath = "specimens/normalize/source-original-01/r1/candidate-output.bin";
  assert.throws(() => validateCandidateOutputObservationSlice06(rehash(pathLaundered)), /path does not match/u);
  const hashOnly = outputObservation(bytes, "non-pass", { retention: retention("hash-only") });
  assert.equal(hashOnly.bytes.relativePath, null);
  const empty = outputObservation(Buffer.alloc(0), "non-pass");
  assert.equal(empty.bytes.byteLength, 0);
  assert.equal(empty.bytes.fileSha256, sha256(Buffer.alloc(0)));
  const oversized = new Uint8Array(SLICE06_DIAGNOSTIC_LIMITS.maxOutputBytes + 1);
  const bounded = outputObservation(oversized, "non-pass", { retention: retention("hash-only") });
  assert.equal(bounded.bytes.byteLength, oversized.byteLength);
  assert.equal(bounded.bytes.fileSha256, null);
  assert.throws(() => outputObservation(oversized, "non-pass"), /over-limit candidate output/u);
  assert.throws(() => outputObservation(bytes, "pass", { attempt: attempt({ attemptNumber: 2 }) }), /replacements are not authorized/u);
  assert.throws(() => outputObservation(bytes, "pass", { attempt: attempt({ sourceId: "../escape" }) }), /safe path atom/u);
  assert.throws(() => outputObservation(bytes, "pass", { rights: rights({ diagnosticPublicDisplay: false }) }), /RETENTION_RIGHTS_DENIED/u);
});

test("oracle diagnostic binds candidate bytes, decision, operation, and self hash", () => {
  const png = encodePng({ includeSrgb: false });
  const verification = verifyOutputBytesSlice06({ operation: "normalize", bytes: png, expected: expectedFacts() });
  const observation = outputObservation(png, "non-pass");
  const record = oracleDiagnostic(observation, verification);
  assert.equal(record.candidateOutputObservationRef.contentHash, observation.contentHash);
  assert.equal(validateOracleDiagnosticSlice06(record), record);
  const wrongDecision = outputObservation(png, "pass");
  assert.throws(() => oracleDiagnostic(wrongDecision, verification), /BINDING_MISMATCH/u);
  assert.throws(() => buildOracleDiagnosticSlice06({
    requestRef: ref("REQUEST-S06-WRONG"), attempt: attempt(), oracleRef: implementationRef(SLICE06_DIAGNOSTIC_ORACLE_ID),
    candidateOutputObservation: observation, verification, observedAt: "2026-08-15T05:00:00.050Z",
  }), /BINDING_MISMATCH/u);
  assert.throws(() => validateOracleDiagnosticSlice06({ ...record, extra: 1 }), /S06_DIAGNOSTIC_RECORD_INVALID/u);
  const invalidDate = rehash({ ...structuredClone(record), observedAt: "2026-02-31T00:00:00.000Z" });
  assert.throws(() => validateOracleDiagnosticSlice06(invalidDate), /not a real UTC instant/u);
});

test("durable envelope persists complete oracle pass and non-pass worker/lifecycle evidence", () => {
  for (const missingSrgb of [false, true]) {
    const png = encodePng({ includeSrgb: !missingSrgb });
    const verification = verifyOutputBytesSlice06({ operation: "normalize", bytes: png, expected: expectedFacts() });
    const observation = outputObservation(png, verification.overallStatus);
    const diagnostic = oracleDiagnostic(observation, verification);
    const isPass = verification.overallStatus === "pass";
    const envelope = buildDiagnosticEnvelopeSlice06({
      operation: "normalize",
      requestRef: ref("REQUEST-S06-001"),
      attempt: attempt(),
      outcomeClass: isPass ? "oracle-pass" : "oracle-nonpass",
      primaryCode: verification.primaryCode,
      secondaryCodes: verification.findings.slice(1).map(({ code }) => code),
      candidateOutputObservation: observation,
      oracleDiagnostic: diagnostic,
      worker: workerObservation(),
      rights: rights(),
      retention: retention(),
      publication: { state: "committed", transactionId: "TX-S06-001", publishedAt: "2026-08-15T05:00:00.300Z", fileRoles: ["candidate-output-bytes", "candidate-output-observation", "oracle-diagnostic", "diagnostic-envelope", "result"] },
      cleanup: { state: "confirmed", stagingRemoved: true, confirmedAt: "2026-08-15T05:00:00.350Z" },
      createdAt: "2026-08-15T05:00:00.400Z",
    });
    assert.equal(envelope.strictDecision, verification.overallStatus);
    assert.equal(envelope.artifactEligible, false);
    assert.equal(envelope.evidenceBoundary.productSupport, false);
    assert.equal(validateDiagnosticEnvelopeSlice06(envelope), envelope);
  }
});

test("envelope validator rejects unknown fields, hash tamper, telemetry loss, exit uncertainty, and support upgrades", () => {
  const png = encodePng({ includeSrgb: false });
  const verification = verifyOutputBytesSlice06({ operation: "normalize", bytes: png, expected: expectedFacts() });
  const observation = outputObservation(png, "non-pass");
  const diagnostic = oracleDiagnostic(observation, verification);
  const base = {
    operation: "normalize", requestRef: ref("REQUEST-S06-001"), attempt: attempt(), outcomeClass: "oracle-nonpass",
    primaryCode: verification.primaryCode, secondaryCodes: verification.findings.slice(1).map(({ code }) => code),
    candidateOutputObservation: observation, oracleDiagnostic: diagnostic, worker: workerObservation(), rights: rights(), retention: retention(),
    publication: { state: "committed", transactionId: "TX-S06-001", publishedAt: "2026-08-15T05:00:00.300Z", fileRoles: ["candidate-output-bytes", "candidate-output-observation", "oracle-diagnostic", "diagnostic-envelope", "result"] },
    cleanup: { state: "confirmed", stagingRemoved: true, confirmedAt: "2026-08-15T05:00:00.350Z" }, createdAt: "2026-08-15T05:00:00.400Z",
  };
  const valid = buildDiagnosticEnvelopeSlice06(base);
  assert.throws(() => validateDiagnosticEnvelopeSlice06({ ...valid, extra: true }), /S06_DIAGNOSTIC_RECORD_INVALID/u);
  assert.throws(() => validateDiagnosticEnvelopeSlice06({ ...valid, contentHash: HASH_A }), /CONTENT_HASH_MISMATCH/u);
  const noTelemetry = structuredClone(valid);
  noTelemetry.worker.telemetry = { source: null, workerDurationMs: null, resourceUsage: null };
  assert.throws(() => validateDiagnosticEnvelopeSlice06(rehash(noTelemetry)), /complete successful worker/u);
  const uncertainExit = structuredClone(valid);
  uncertainExit.worker.exit.confirmed = false;
  assert.throws(() => validateDiagnosticEnvelopeSlice06(rehash(uncertainExit)), /parent wall timestamps|complete successful worker/u);
  const upgraded = structuredClone(valid);
  upgraded.evidenceBoundary.productSupport = true;
  assert.throws(() => validateDiagnosticEnvelopeSlice06(rehash(upgraded)), /EVIDENCE_BOUNDARY_INVALID/u);
});

test("all three schemas are strict, recursively closed, and require every declared object property", async () => {
  const names = [
    "candidate-output-observation.slice06.v0.schema.json",
    "oracle-diagnostic.slice06.v0.schema.json",
    "diagnostic-envelope.slice06.v0.schema.json",
  ];
  function inspect(node, location) {
    if (!node || typeof node !== "object") return;
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false, `${location} must be closed`);
      assert.deepEqual(new Set(node.required ?? []), new Set(Object.keys(node.properties ?? {})), `${location} must require every property`);
    }
    for (const [key, child] of Object.entries(node)) inspect(child, `${location}/${key}`);
  }
  for (const name of names) {
    const source = await readFile(path.join(SCHEMA_ROOT, name), "utf8");
    assert.doesNotMatch(source, /"(?:allOf|if|then|else|anyOf)"\s*:/u);
    const schema = JSON.parse(source);
    assert.equal(schema.$id, `https://single-image-studio.invalid/research/slice-06/schemas/${name}`);
    inspect(schema, name);
    assert.equal(schema.properties.artifactEligible?.const, false);
  }
});
