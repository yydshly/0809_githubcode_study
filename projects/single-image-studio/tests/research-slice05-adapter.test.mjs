import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { deflateSync } from "node:zlib";

import {
  SLICE05_SHARP_POLICY,
  Slice05AdapterError,
  contentHashSlice05,
  createSlice05SharpAdapter,
  executeSlice05SharpWorker,
  preflightCanonicalPngSlice05,
  validateExportRequestSlice05,
  validateNormalizeRequestSlice05,
  validateWorkerResponseSlice05,
} from "../scripts/research-sharp-adapter-slice05.mjs";

const ZERO_HASH = "0".repeat(64);
const ONE_HASH = "1".repeat(64);
const CREATED_AT = "2026-08-15T00:00:00.000Z";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function expectCode(code) {
  return (error) => error instanceof Slice05AdapterError && error.code === code;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data, { corruptCrc = false } = {}) {
  const typeBytes = Buffer.from(type, "ascii");
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  const crc = crc32(Buffer.concat([typeBytes, data]));
  output.writeUInt32BE(corruptCrc ? (crc ^ 0xffffffff) >>> 0 : crc, data.length + 8);
  return output;
}

function header({ width = 1, height = 1, bitDepth = 8, colorType = 6, interlace = 0 } = {}) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = bitDepth;
  data[9] = colorType;
  data[10] = 0;
  data[11] = 0;
  data[12] = interlace;
  return data;
}

function canonicalPng(rgba = Buffer.from([17, 33, 65, 255])) {
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header()),
    chunk("sRGB", Buffer.from([0])),
    chunk("IDAT", deflateSync(Buffer.concat([Buffer.from([0]), rgba]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function closedRef(id, contentHash = ZERO_HASH) {
  return { id, contentHash };
}

function expectedRuntime() {
  const nativeVersions = { sharp: "0.35.3" };
  for (let index = 1; index < 29; index += 1) nativeVersions[`component_${index}`] = `v${index}`;
  return {
    sharpVersion: "0.35.3",
    nativeVersions,
    nodeVersion: "v22.15.0",
    platform: "win32",
    architecture: "x64",
    settings: {
      concurrency: 1,
      cacheMemoryMaxMiB: 0,
      cacheFilesMax: 0,
      cacheItemsMax: 0,
      simd: false,
      uvThreadpoolSize: "1",
      vipsConcurrency: "1",
      ignoreGlobalLibvips: "1",
    },
  };
}

function attempt(sourceId) {
  return {
    runId: "run.policy-only",
    sourceId,
    partition: "smoke",
    repetition: 1,
    attemptNumber: 1,
    idempotencyKey: `idem.${sourceId}`,
  };
}

function normalizeRequest(overrides = {}) {
  const sourceAssetId = "source.policy-only";
  return {
    schemaVersion: SLICE05_SHARP_POLICY.normalizeRequestVersion,
    operation: "normalize",
    outputArtifactId: "normalized.policy-only",
    outputRelativePath: "research/slice-05/smoke/normalized.policy-only.png",
    attempt: attempt(sourceAssetId),
    capabilityContractRef: closedRef(SLICE05_SHARP_POLICY.normalizeContractId),
    candidateRef: closedRef(SLICE05_SHARP_POLICY.candidateId),
    source: {
      sourceAssetId,
      sourceFileName: "source.policy-only.png",
      sourceManifestSha256: ZERO_HASH,
      mime: "image/png",
      byteLength: 1,
      fileSha256: ZERO_HASH,
      decodedPixelSha256: ONE_HASH,
      orientation: 1,
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      alphaMode: "straight-unpremultiplied",
      alphaPresent: false,
    },
    sourceBytes: Buffer.from([0]),
    ...overrides,
  };
}

function normalizedArtifact({ producerKind = "independent-fixture-generator", extra = undefined } = {}) {
  const rgba = Buffer.from([17, 33, 65, 255]);
  const png = canonicalPng(rgba);
  const fileSha256 = createHash("sha256").update(png).digest("hex");
  const decodedPixelSha256 = createHash("sha256").update(rgba).digest("hex");
  const adapterRef = {
    id: "S05-INDEPENDENT-FIXTURE-GENERATOR",
    version: "0.5.0",
    implementationSha256: ONE_HASH,
  };
  const record = {
    schemaVersion: SLICE05_SHARP_POLICY.normalizedArtifactVersion,
    artifactId: "normalized.independent.policy-only",
    operation: "normalize",
    parent: {
      sourceAssetId: "source.independent.policy-only",
      sourceFileSha256: fileSha256,
      sourceDecodedPixelSha256: decodedPixelSha256,
      sourceManifestSha256: ZERO_HASH,
    },
    capabilityContractRef: closedRef(SLICE05_SHARP_POLICY.normalizeContractId),
    candidateRef: closedRef(SLICE05_SHARP_POLICY.candidateId),
    adapterRef,
    producerRef: {
      kind: producerKind,
      id: adapterRef.id,
      version: adapterRef.version,
      implementationSha256: producerKind === "independent-fixture-generator" ? "2".repeat(64) : adapterRef.implementationSha256,
    },
    runtimeRef: closedRef("S05-RUNTIME-POLICY-ONLY", ONE_HASH),
    hardwareRef: closedRef("S05-HARDWARE-POLICY-ONLY", ONE_HASH),
    attempt: attempt("source.independent.policy-only"),
    bytes: {
      relativePath: "research/slice-05/smoke/normalized.independent.policy-only.png",
      mime: "image/png",
      byteLength: png.length,
      fileSha256,
      decodedPixelSha256,
    },
    image: {
      width: 1,
      height: 1,
      pixelLayout: "RGBA8",
      colorSpace: "embedded-sRGB",
      orientation: 1,
      alphaMode: "straight-unpremultiplied",
      alphaPresent: false,
      metadataPolicy: "strip-all-except-color-contract",
      pngFilterPolicy: "filter-0-only",
      interlace: "forbidden",
      animation: "forbidden",
    },
    createdAt: CREATED_AT,
    ...(extra ? { extra } : {}),
  };
  return { ...record, contentHash: contentHashSlice05(record) };
}

function exportRequest(artifact, rgba = Buffer.alloc(3), normalizedBytes = canonicalPng()) {
  return {
    schemaVersion: SLICE05_SHARP_POLICY.exportRequestVersion,
    operation: "export",
    outputArtifactId: "delivery.policy-only",
    outputRelativePath: "research/slice-05/smoke/delivery.policy-only.png",
    attempt: attempt(artifact.artifactId),
    capabilityContractRef: closedRef(SLICE05_SHARP_POLICY.exportContractId),
    candidateRef: structuredClone(artifact.candidateRef),
    normalizedArtifact: artifact,
    normalizedBytes,
    rgba: {
      bytes: rgba,
      byteLength: rgba.length,
      decodedPixelSha256: createHash("sha256").update(rgba).digest("hex"),
    },
  };
}

test("Slice 05 keeps Sharp import isolated to the worker", async () => {
  const adapterSource = await readFile(new URL("../scripts/research-sharp-adapter-slice05.mjs", import.meta.url), "utf8");
  const workerSource = await readFile(new URL("../scripts/research-sharp-worker-slice05.mjs", import.meta.url), "utf8");
  assert.equal(/(?:from\s+|import\s*\()(["'])sharp\1/.test(adapterSource), false);
  assert.equal((workerSource.match(/import\("sharp"\)/g) ?? []).length, 1);
  assert.equal(workerSource.includes("research-reference-adapters"), false);
});

test("Slice 05 runtime refs use the new 0.5 candidate and contracts", () => {
  assert.equal(SLICE05_SHARP_POLICY.candidateId, "REG-NORM-SHARP@0.5.0");
  assert.equal(SLICE05_SHARP_POLICY.normalizeContractId, "CC-CAP02-NORMALIZE-PNG@0.5.0");
  assert.equal(SLICE05_SHARP_POLICY.exportContractId, "CC-CAP02-EXPORT-PNG@0.5.0");
});

test("canonical preflight applies byte/type bounds before PNG work", () => {
  assert.throws(() => preflightCanonicalPngSlice05("not-bytes"), expectCode("S05_INPUT_BYTES_TYPE_INVALID"));
  assert.throws(
    () => preflightCanonicalPngSlice05(new Uint8Array(SLICE05_SHARP_POLICY.maxInputBytes + 1)),
    expectCode("S05_INPUT_BYTES_LIMIT_EXCEEDED"),
  );
  assert.throws(() => preflightCanonicalPngSlice05(Buffer.alloc(8)), expectCode("S05_INPUT_PNG_TRUNCATED"));
  assert.throws(() => preflightCanonicalPngSlice05(Buffer.alloc(33)), expectCode("S05_INPUT_SIGNATURE_MISMATCH"));
});

test("canonical preflight rejects corrupt CRC without decoding image data", () => {
  const bytes = Buffer.concat([PNG_SIGNATURE, chunk("IHDR", header(), { corruptCrc: true })]);
  assert.throws(() => preflightCanonicalPngSlice05(bytes), expectCode("S05_INPUT_CRC_MISMATCH"));
});

test("canonical preflight rejects dimensions and pixel profiles at IHDR", () => {
  const tooWide = Buffer.concat([PNG_SIGNATURE, chunk("IHDR", header({ width: 257 }))]);
  assert.throws(() => preflightCanonicalPngSlice05(tooWide), expectCode("S05_INPUT_DIMENSION_LIMIT_EXCEEDED"));

  const rgb = Buffer.concat([PNG_SIGNATURE, chunk("IHDR", header({ colorType: 2 }))]);
  assert.throws(() => preflightCanonicalPngSlice05(rgb), expectCode("S05_INPUT_PIXEL_PROFILE_INVALID"));

  const interlaced = Buffer.concat([PNG_SIGNATURE, chunk("IHDR", header({ interlace: 1 }))]);
  assert.throws(() => preflightCanonicalPngSlice05(interlaced), expectCode("S05_INPUT_PIXEL_PROFILE_INVALID"));
});

test("canonical preflight rejects every ancillary or animation chunk", () => {
  for (const type of ["tEXt", "pHYs", "iCCP", "acTL"]) {
    const bytes = Buffer.concat([PNG_SIGNATURE, chunk("IHDR", header()), chunk(type, Buffer.from([0]))]);
    assert.throws(() => preflightCanonicalPngSlice05(bytes), expectCode("S05_INPUT_CHUNK_PROFILE_INVALID"));
  }
});

test("normalize request is strict before touching source bytes", () => {
  assert.throws(
    () => validateNormalizeRequestSlice05({ ...normalizeRequest(), unexpected: true }),
    expectCode("S05_NORMALIZE_REQUEST_INVALID"),
  );
  const request = normalizeRequest();
  request.source = { ...request.source, mime: "image/jpeg" };
  assert.throws(() => validateNormalizeRequestSlice05(request), expectCode("S05_NORMALIZE_SOURCE_DECLARATION_INVALID"));

  const thirdAttempt = normalizeRequest();
  thirdAttempt.attempt = { ...thirdAttempt.attempt, attemptNumber: 3 };
  assert.throws(() => validateNormalizeRequestSlice05(thirdAttempt), expectCode("S05_NORMALIZE_REQUEST_INVALID"));
});

test("independent producer cannot reuse adapter implementation identity", () => {
  const artifact = normalizedArtifact();
  artifact.producerRef = {
    ...artifact.producerRef,
    implementationSha256: artifact.adapterRef.implementationSha256,
  };
  artifact.contentHash = contentHashSlice05(artifact);
  assert.throws(
    () => validateExportRequestSlice05(exportRequest(artifact)),
    expectCode("S05_EXPORT_NORMALIZED_ARTIFACT_INVALID"),
  );
});

test("export rejects non-independent normalized producers before raw work", () => {
  const artifact = normalizedArtifact({ producerKind: "candidate-adapter" });
  assert.throws(
    () => validateExportRequestSlice05(exportRequest(artifact)),
    expectCode("S05_EXPORT_PARENT_PRODUCER_INVALID"),
  );
});

test("export rejects artifact schema drift before raw work", () => {
  const artifact = normalizedArtifact({ extra: true });
  assert.throws(
    () => validateExportRequestSlice05(exportRequest(artifact)),
    expectCode("S05_EXPORT_NORMALIZED_ARTIFACT_INVALID"),
  );
});

test("export rejects RGBA length before hash or alpha traversal", () => {
  const artifact = normalizedArtifact();
  assert.throws(
    () => validateExportRequestSlice05(exportRequest(artifact)),
    expectCode("S05_EXPORT_RGBA_LENGTH_MISMATCH"),
  );
});

test("export accepts a closed independently-produced parent binding before worker execution", () => {
  const artifact = normalizedArtifact();
  const rgba = Buffer.from([17, 33, 65, 255]);
  const validated = validateExportRequestSlice05(exportRequest(artifact, rgba));
  assert.equal(validated.request.normalizedArtifact.artifactId, artifact.artifactId);
  assert.equal(validated.rgba.length, 4);
});

test("export rejects parent bytes, file identity and decoded-pixel drift", () => {
  const rgba = Buffer.from([17, 33, 65, 255]);
  const artifact = normalizedArtifact();
  const corruptBytes = canonicalPng(rgba);
  corruptBytes[corruptBytes.length - 1] ^= 1;
  assert.throws(
    () => validateExportRequestSlice05(exportRequest(artifact, rgba, corruptBytes)),
    expectCode("S05_EXPORT_PARENT_BYTES_IDENTITY_MISMATCH"),
  );

  const wrongFile = structuredClone(artifact);
  wrongFile.bytes.fileSha256 = ZERO_HASH;
  wrongFile.contentHash = contentHashSlice05(wrongFile);
  assert.throws(
    () => validateExportRequestSlice05(exportRequest(wrongFile, rgba)),
    expectCode("S05_EXPORT_PARENT_BYTES_IDENTITY_MISMATCH"),
  );

  const wrongPixel = structuredClone(artifact);
  wrongPixel.bytes.decodedPixelSha256 = ZERO_HASH;
  wrongPixel.parent.sourceDecodedPixelSha256 = ZERO_HASH;
  wrongPixel.contentHash = contentHashSlice05(wrongPixel);
  assert.throws(
    () => validateExportRequestSlice05(exportRequest(wrongPixel, rgba)),
    expectCode("S05_EXPORT_PARENT_BYTES_IDENTITY_MISMATCH"),
  );
});

test("export rejects cross-partition parent binding before bytes are reopened", () => {
  const artifact = normalizedArtifact();
  const request = exportRequest(artifact);
  request.attempt = { ...request.attempt, partition: "dev/calibration" };
  assert.throws(() => validateExportRequestSlice05(request), expectCode("S05_EXPORT_PARENT_BINDING_MISMATCH"));
});

test("adapter refuses missing oracle or atomic-commit dependencies", () => {
  const adapterRef = { id: "S05-ADAPTER", version: "0.5.0", implementationSha256: ZERO_HASH };
  const runtimeRef = closedRef("S05-RUNTIME");
  const hardwareRef = closedRef("S05-HARDWARE");
  assert.throws(
    () => createSlice05SharpAdapter({
      executeWorker: async () => undefined,
      verifyOutput: async () => undefined,
      adapterRef,
      runtimeRef,
      hardwareRef,
    }),
    expectCode("S05_ADAPTER_DEPENDENCY_INVALID"),
  );
});

test("fake worker runtime drift is rejected before oracle or commit", () => {
  const expected = expectedRuntime();
  const actual = structuredClone(expected);
  actual.nativeVersions.component_1 = "drifted";
  assert.throws(
    () => validateWorkerResponseSlice05({
      protocolVersion: SLICE05_SHARP_POLICY.protocolVersion,
      attemptId: "idem.fake-runtime",
      operation: "normalize",
      status: "succeeded",
      outputBytes: Buffer.from([1]),
      runtime: actual,
      durationMs: 1,
      resourceUsage: { maxRssKiB: 1, userCpuMicros: 0, systemCpuMicros: 0 },
    }, {
      operation: "normalize",
      attemptId: "idem.fake-runtime",
      expectedRuntime: expected,
    }),
    expectCode("S05_WORKER_RUNTIME_VERSION_MISMATCH"),
  );
});

test("fake worker observed resource excess is fail-closed", () => {
  const runtime = expectedRuntime();
  assert.throws(
    () => validateWorkerResponseSlice05({
      protocolVersion: SLICE05_SHARP_POLICY.protocolVersion,
      attemptId: "idem.fake-resource",
      operation: "export",
      status: "succeeded",
      outputBytes: Buffer.from([1]),
      runtime,
      durationMs: 1,
      resourceUsage: {
        maxRssKiB: SLICE05_SHARP_POLICY.observedMaxRssKiB + 1,
        userCpuMicros: 0,
        systemCpuMicros: 0,
      },
    }, {
      operation: "export",
      attemptId: "idem.fake-resource",
      expectedRuntime: runtime,
    }),
    expectCode("S05_WORKER_RESOURCE_LIMIT_EXCEEDED"),
  );
});

test("worker cancellation kills an injected process without spawning Sharp", async () => {
  class FakeChild extends EventEmitter {
    killed = false;

    send(_request, callback) {
      callback?.(null);
    }

    kill(signal) {
      assert.equal(signal, "SIGKILL");
      this.killed = true;
      return true;
    }
  }

  const child = new FakeChild();
  const controller = new AbortController();
  const pending = executeSlice05SharpWorker(
    { protocolVersion: SLICE05_SHARP_POLICY.protocolVersion },
    { forkImpl: () => child, signal: controller.signal },
  );
  controller.abort();
  child.emit("exit", null, "SIGKILL");
  await assert.rejects(pending, expectCode("S05_WORKER_CANCELLED"));
  assert.equal(child.killed, true);
});
