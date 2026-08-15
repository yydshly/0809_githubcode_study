import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { encodeCanonicalPngSlice07 } from "../scripts/research-canonical-png-encoder-slice07.mjs";
import { Slice07GateBError } from "../scripts/research-gateb-adapter-slice07.mjs";
import {
  SLICE07_RUNNER_SCHEMA_DOCUMENTS,
  SLICE07_RUNNER_SCHEMA_PATHS,
  runSlice07GateBOperation,
  validateSlice07GateBOperationTree,
} from "../scripts/research-gateb-runner-slice07.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const RGBA = Buffer.from([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 12, 34, 56, 255]);
const PNG = encodeCanonicalPngSlice07({ width: 2, height: 2, rgba: RGBA });
const PIXEL_SHA = sha256(RGBA);

function expected() {
  return {
    decodedPixelSha256: PIXEL_SHA, width: 2, height: 2, pixelLayout: "RGBA8",
    colorSpace: "embedded-sRGB", orientation: 1, alphaMode: "straight-unpremultiplied",
    alphaPresent: true, metadataPolicy: "strip-all-except-color-contract",
    pngFilterPolicy: "filter-0-only", interlace: "forbidden", animation: "forbidden",
  };
}

function cases(operation = "normalize") {
  return [
    ...["opaque", "partial", "holes"].map((kind) => ({
      sourceId: `${operation}.${kind}`, disposition: "applicable", expectedStableErrorCode: null,
      expected: expected(), workerRequest: { operation, kind },
    })),
    ...["crc", "srgb", "declaration"].map((kind, index) => ({
      sourceId: `${operation}.${kind}`, disposition: "rejection",
      expectedStableErrorCode: ["S07_INPUT_CRC_MISMATCH", "S07_INPUT_SRGB_REQUIRED", operation === "normalize"
        ? "S07_NORMALIZE_SOURCE_DECLARATION_INVALID" : "S07_EXPORT_NORMALIZED_ARTIFACT_INVALID"][index],
      expected: null, workerRequest: { operation, kind },
    })),
  ];
}

function passExecution() {
  return {
    outputBytes: PNG,
    oracleFacts: { fileSha256: sha256(PNG), decodedPixelSha256: PIXEL_SHA, width: 2, height: 2 },
    encoderRef: { id: "ENCODER-CANONICAL-PNG@0.7.0" },
    workerMessageSha256: "1".repeat(64), workerRuntimeSha256: "2".repeat(64),
    workerRuntime: { sharpVersion: "0.35.3", nodeVersion: process.version },
    workerTelemetry: { durationMs: 4, resourceUsage: { maxRssKiB: 64000, userCpuMicros: 1000, systemCpuMicros: 500 } },
    workerObservation: { exitConfirmed: true, exitCode: 0, signal: null },
  };
}

function fakeExecutor({ applicableFailure = false, protocolFailure = false } = {}) {
  return async ({ workerRequest, repetition }) => {
    if (protocolFailure && workerRequest.kind === "partial" && repetition === 2) {
      throw new Slice07GateBError("S07_WORKER_TIMEOUT", "fake protocol stop", {
        workerObservation: { exitConfirmed: true, exitCode: null, signal: "SIGKILL" },
      });
    }
    if (["crc", "srgb", "declaration"].includes(workerRequest.kind)) {
      const code = workerRequest.kind === "crc" ? "S07_INPUT_CRC_MISMATCH"
        : workerRequest.kind === "srgb" ? "S07_INPUT_SRGB_REQUIRED"
          : workerRequest.operation === "normalize" ? "S07_NORMALIZE_SOURCE_DECLARATION_INVALID"
            : "S07_EXPORT_NORMALIZED_ARTIFACT_INVALID";
      throw new Slice07GateBError(code, "fake preflight rejection");
    }
    if (applicableFailure && workerRequest.kind === "holes") {
      throw new Slice07GateBError("S07_OUTPUT_ORACLE_REJECTED", "fake candidate non-pass", {
        workerObservation: { exitConfirmed: true, exitCode: 0, signal: null },
        candidateOutput: {
          outputBytes: PNG, decodedPixelSha256: PIXEL_SHA,
          encoderRef: { id: "ENCODER-CANONICAL-PNG@0.7.0" },
          workerMessageSha256: "1".repeat(64), workerRuntimeSha256: "2".repeat(64),
          workerRuntime: { sharpVersion: "0.35.3", nodeVersion: process.version },
          workerTelemetry: { durationMs: 4, resourceUsage: { maxRssKiB: 64000, userCpuMicros: 1000, systemCpuMicros: 500 } },
        },
      });
    }
    return passExecution();
  };
}

function clock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 7, 15, 9, 0, 0, tick++)).toISOString();
}

async function tempRoot(t) {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s07-runner-test-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  return path.join(parent, "open-smoke", "normalize");
}

test("all-pass operation writes an exact 18-attempt durable tree", async (t) => {
  const resultsRoot = await tempRoot(t);
  const report = await runSlice07GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), executeCase: fakeExecutor(), now: clock(),
  });
  assert.equal(report.summary.passAttempts, 18);
  assert.equal(report.summary.applicableArtifactPasses, 9);
  assert.equal(report.summary.rejectionExactPasses, 9);
  assert.equal(report.summary.sourceThreeOfThreePasses, 6);
  assert.equal(report.summary.deterministicSources, 6);
  assert.equal(report.decision.gateBPassed, true);
  assert.equal(report.decision.calibrationAuthorized, false);
  assert.deepEqual(await validateSlice07GateBOperationTree({ resultsRoot, operation: "normalize" }), { valid: true, issues: [] });
  const events = (await readFile(path.join(resultsRoot, "ledger.ndjson"), "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(events.filter((event) => event.eventType === "attempt-started").length, 18);
  assert.equal(events.filter((event) => event.eventType === "attempt-terminal").length, 18);
  assert.equal(events.filter((event) => event.eventType === "publication-intent").length, 9);
  assert.equal(events.filter((event) => event.eventType === "publication-complete").length, 9);
});

test("ordinary applicable candidate non-pass is retained but Gate B is denied", async (t) => {
  const resultsRoot = await tempRoot(t);
  const report = await runSlice07GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), executeCase: fakeExecutor({ applicableFailure: true }), now: clock(),
  });
  assert.equal(report.summary.passAttempts, 15);
  assert.equal(report.summary.nonPassAttempts, 3);
  assert.equal(report.decision.state, "denied-closed-non-pass");
  assert.equal(report.decision.calibrationAuthorized, false);
  assert.equal((await readFile(path.join(resultsRoot, "closures", "s07.normalize.normalize.holes.r1", "output.bin"))).length, PNG.length);
  assert.equal((await validateSlice07GateBOperationTree({ resultsRoot, operation: "normalize" })).valid, true);
});

test("protocol failure globally stops and the partial root cannot be reused", async (t) => {
  const resultsRoot = await tempRoot(t);
  await assert.rejects(
    runSlice07GateBOperation({
      resultsRoot, operation: "normalize", cases: cases(), executeCase: fakeExecutor({ protocolFailure: true }), now: clock(),
    }),
    (error) => error.code === "S07_WORKER_TIMEOUT",
  );
  await assert.rejects(runSlice07GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), executeCase: fakeExecutor(), now: clock(),
  }));
});

test("denominator, operation, and traversal mutations fail before creating a root", async (t) => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "s07-runner-denom-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const malformed = cases();
  malformed[0] = { ...malformed[0], sourceId: "../escape" };
  await assert.rejects(runSlice07GateBOperation({
    resultsRoot: path.join(parent, "a"), operation: "normalize", cases: malformed, executeCase: fakeExecutor(), now: clock(),
  }), (error) => error.code === "S07_RUNNER_INPUT_INVALID");
  await assert.rejects(runSlice07GateBOperation({
    resultsRoot: path.join(parent, "b"), operation: "normalize", cases: cases().slice(0, 5), executeCase: fakeExecutor(), now: clock(),
  }), (error) => error.code === "S07_DENOMINATOR_INVALID");
});

test("output-byte and ledger tampering are rejected", async (t) => {
  const resultsRoot = await tempRoot(t);
  await runSlice07GateBOperation({
    resultsRoot, operation: "normalize", cases: cases(), executeCase: fakeExecutor(), now: clock(),
  });
  const output = path.join(resultsRoot, "closures", "s07.normalize.normalize.opaque.r1", "output.png");
  await writeFile(output, Buffer.from("tampered"));
  let report = await validateSlice07GateBOperationTree({ resultsRoot, operation: "normalize" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.includes("CLOSURE_BINDING_MISMATCH"));
  await writeFile(output, PNG);
  const ledger = path.join(resultsRoot, "ledger.ndjson");
  const originalLedger = await readFile(ledger, "utf8");
  const lines = originalLedger.trim().split("\n");
  lines[1] = lines[0];
  await writeFile(ledger, `${lines.join("\n")}\n`);
  report = await validateSlice07GateBOperationTree({ resultsRoot, operation: "normalize" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.includes("LEDGER_CHAIN_INVALID"));
  await writeFile(ledger, originalLedger);
  const workerPath = path.join(resultsRoot, "closures", "s07.normalize.normalize.opaque.r1", "worker.json");
  const originalWorker = await readFile(workerPath);
  const worker = JSON.parse(originalWorker);
  worker.runtime.sharpVersion = "drift";
  await writeFile(workerPath, `${JSON.stringify(worker)}\n`);
  report = await validateSlice07GateBOperationTree({ resultsRoot, operation: "normalize" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.includes("CLOSURE_BINDING_MISMATCH"));
  await writeFile(workerPath, originalWorker);
  await writeFile(path.join(resultsRoot, "unregistered.json"), "{}\n");
  report = await validateSlice07GateBOperationTree({ resultsRoot, operation: "normalize" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.includes("RESULT_FILE_ALLOWLIST_MISMATCH"));
});

test("runner schemas use a recursively closed supported vocabulary", () => {
  assert.equal(SLICE07_RUNNER_SCHEMA_PATHS.length, 6);
  const allowed = new Set([
    "$schema", "$id", "type", "const", "enum", "pattern", "minimum", "maximum", "oneOf",
    "additionalProperties", "required", "properties",
  ]);
  const walk = (schema) => {
    for (const [key, value] of Object.entries(schema)) {
      assert.ok(allowed.has(key), `unknown schema keyword ${key}`);
      if (key === "properties") {
        for (const child of Object.values(value)) walk(child);
      } else if (key === "oneOf") {
        for (const child of value) walk(child);
      }
    }
    if (schema.type === "object") {
      assert.equal(schema.additionalProperties, false);
      assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
    }
  };
  for (const schema of Object.values(SLICE07_RUNNER_SCHEMA_DOCUMENTS)) walk(schema);
});

test("runner source contains no Sharp, oracle, product, or calibration execution dependency", async () => {
  const source = await readFile(new URL("../scripts/research-gateb-runner-slice07.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /import\s+.*sharp|independent-png-oracle|server\/|web\/|calibrationAuthorized:\s*true/u);
  assert.doesNotMatch(source, /retry|replacementCount:\s*[1-9]/u);
});
