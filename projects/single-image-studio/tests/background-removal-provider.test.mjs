import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";

import { createImageStudioServer } from "../server/server.mjs";
import { createFakeBackgroundRemovalProvider } from "../server/providers/background-removal/fake-provider.mjs";
import {
  BackgroundRemovalProviderError,
  validateBackgroundRemovalProviderOutput,
} from "../server/providers/background-removal/provider.mjs";

const SOURCE_BYTES = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBytes.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return result;
}

function rgbaPng() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(Buffer.from([0, 32, 64, 96, 128]))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const OUTPUT_BYTES = rgbaPng();
const SOURCE_DATA_URL = `data:image/png;base64,${SOURCE_BYTES.toString("base64")}`;
const SOURCE_SHA256 = createHash("sha256").update(SOURCE_BYTES).digest("hex");

function payload(overrides = {}) {
  return {
    clientRunId: randomUUID(),
    sourceRevision: 1,
    geometryRevision: 1,
    sourceImage: SOURCE_DATA_URL,
    sourceSha256: SOURCE_SHA256,
    consent: {
      accepted: true,
      acceptedAt: "2026-08-16T12:00:00.000Z",
      policyVersion: "background-removal-consent.v0",
    },
    ...overrides,
  };
}

async function start(options = {}) {
  const root = await mkdtemp(join(tmpdir(), "single-image-background-removal-"));
  const webRoot = join(root, "web");
  await mkdir(webRoot);
  await writeFile(join(webRoot, "index.html"), "<!doctype html><title>test</title>");
  const app = createImageStudioServer({ webRoot, ...options });
  await new Promise((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen(0, "127.0.0.1", resolve);
  });
  const address = app.server.address();
  return {
    ...app,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await app.waitForIdle();
      await new Promise((resolve, reject) => app.server.close((error) => error ? reject(error) : resolve()));
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function body(response) {
  return JSON.parse(await response.text());
}

async function createRun(app, value) {
  return fetch(`${app.baseUrl}/api/background-removal/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}

async function waitFor(app, runId, expected) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${app.baseUrl}/api/background-removal/runs/${runId}`);
    const value = await body(response);
    if (value.run.status === expected) return value.run;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`background removal run did not reach ${expected}`);
}

function successProvider(handler = null) {
  return createFakeBackgroundRemovalProvider({
    removeBackground: handler ?? (async () => ({
      providerRequestId: "fake-request-1",
      image: { bytes: OUTPUT_BYTES, mime: "image/png", hasAlpha: true },
    })),
  });
}

test("provider output is strict PNG-with-alpha data rather than an unverified image claim", () => {
  const valid = validateBackgroundRemovalProviderOutput({
    providerRequestId: "fake-request",
    image: { bytes: OUTPUT_BYTES, mime: "image/png", hasAlpha: true },
  });
  assert.equal(valid.image.bytes.equals(OUTPUT_BYTES), true);
  assert.deepEqual({ width: valid.image.width, height: valid.image.height }, { width: 1, height: 1 });
  assert.throws(
    () => validateBackgroundRemovalProviderOutput({
      providerRequestId: "fake-request",
      image: { bytes: OUTPUT_BYTES, mime: "image/jpeg", hasAlpha: true },
    }),
    (error) => error.code === "provider_output_mime_invalid",
  );
  assert.throws(
    () => validateBackgroundRemovalProviderOutput({
      providerRequestId: "fake-request",
      image: { bytes: OUTPUT_BYTES, mime: "image/png", hasAlpha: false },
    }),
    (error) => error.code === "provider_output_alpha_missing",
  );
  const opaquePng = Buffer.from(OUTPUT_BYTES);
  opaquePng[25] = 2;
  const ihdrTypeAndData = opaquePng.subarray(12, 29);
  opaquePng.writeUInt32BE(crc32(ihdrTypeAndData), 29);
  assert.throws(
    () => validateBackgroundRemovalProviderOutput({
      providerRequestId: "fake-request",
      image: { bytes: opaquePng, mime: "image/png", hasAlpha: true },
    }),
    (error) => error.code === "provider_output_alpha_missing",
  );
  const badCrc = Buffer.from(OUTPUT_BYTES);
  badCrc[29] ^= 0xff;
  assert.throws(
    () => validateBackgroundRemovalProviderOutput({
      providerRequestId: "fake-request",
      image: { bytes: badCrc, mime: "image/png", hasAlpha: true },
    }),
    (error) => error.code === "provider_output_png_crc_invalid",
  );
});

test("production default reports background removal unavailable before reading image input", async (t) => {
  const app = await start();
  t.after(() => app.close());
  const status = await body(await fetch(`${app.baseUrl}/api/background-removal/status`));
  assert.deepEqual(status, {
    available: false,
    provider: null,
    reason: "not_configured",
    runStore: "memory",
    previewMode: "local",
  });
  const response = await fetch(`${app.baseUrl}/api/background-removal/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not-json-and-must-not-be-read",
  });
  assert.equal(response.status, 503);
  assert.equal((await body(response)).error.code, "background_removal_unavailable");
});

test("dedicated run route binds source and geometry, returns validated alpha PNG, and is idempotent", async (t) => {
  let calls = 0;
  const app = await start({
    backgroundRemovalProvider: successProvider(async ({ source, context }) => {
      calls += 1;
      assert.equal(source.sha256, SOURCE_SHA256);
      assert.equal(source.sourceRevision, 1);
      assert.equal(source.geometryRevision, 1);
      assert.match(context.runId, /^[0-9a-f-]{36}$/u);
      return {
        providerRequestId: "fake-request-success",
        image: { bytes: OUTPUT_BYTES, mime: "image/png", hasAlpha: true },
      };
    }),
  });
  t.after(() => app.close());
  const request = payload();
  const createdResponse = await createRun(app, request);
  assert.equal(createdResponse.status, 202);
  const created = await body(createdResponse);
  const run = await waitFor(app, request.clientRunId, "succeeded");
  assert.equal(run.result.mime, "image/png");
  assert.equal(run.result.hasAlpha, true);
  assert.equal(run.result.width, 1);
  assert.equal(run.result.height, 1);
  assert.equal(run.result.provider.mode, "fake");
  assert.equal(run.input.sourceSha256, SOURCE_SHA256);
  assert.equal("sourceImage" in run.input, false);
  assert.equal(created.run.status, "queued");

  const reused = await createRun(app, request);
  assert.equal(reused.status, 200);
  assert.equal((await body(reused)).reused, true);
  assert.equal(calls, 1);

  const conflict = await createRun(app, { ...request, geometryRevision: 2 });
  assert.equal(conflict.status, 409);
  assert.equal((await body(conflict)).error.code, "client_run_conflict");
  assert.equal(calls, 1);
});

test("request validation rejects hash drift, missing consent, and unknown fields before provider invocation", async (t) => {
  let calls = 0;
  const app = await start({ backgroundRemovalProvider: successProvider(async () => { calls += 1; }) });
  t.after(() => app.close());
  const invalid = [
    { value: payload({ sourceSha256: "0".repeat(64) }), code: "source_hash_mismatch" },
    { value: payload({ consent: { accepted: false, acceptedAt: "2026-08-16T12:00:00.000Z", policyVersion: "background-removal-consent.v0" } }), code: "background_removal_consent_required" },
    { value: { ...payload(), surprise: true }, code: "unknown_field" },
  ];
  for (const scenario of invalid) {
    const response = await createRun(app, scenario.value);
    assert.equal(response.status, 400);
    assert.equal((await body(response)).error.code, scenario.code);
  }
  assert.equal(calls, 0);
});

test("definitive provider refusal is failed while transport uncertainty remains unknown", async (t) => {
  const refused = await start({
    backgroundRemovalProvider: successProvider(async () => {
      throw new BackgroundRemovalProviderError("provider_policy_rejected", "Input rejected", { httpStatus: 422 });
    }),
  });
  t.after(() => refused.close());
  const refusal = payload();
  await createRun(refused, refusal);
  const failed = await waitFor(refused, refusal.clientRunId, "failed");
  assert.equal(failed.error.code, "provider_policy_rejected");
  assert.equal(failed.error.httpStatus, 422);

  const uncertain = await start({
    backgroundRemovalProvider: successProvider(async () => { throw new Error("connection reset after send"); }),
  });
  t.after(() => uncertain.close());
  const unknownRequest = payload();
  await createRun(uncertain, unknownRequest);
  const unknown = await waitFor(uncertain, unknownRequest.clientRunId, "unknown");
  assert.equal(unknown.error.code, "background_removal_status_unknown");
});

test("timeout is terminal unknown and never auto-resubmits", async (t) => {
  let calls = 0;
  const app = await start({
    backgroundRemovalTimeoutMs: 20,
    backgroundRemovalProvider: successProvider(() => new Promise(() => {
      calls += 1;
    })),
  });
  t.after(() => app.close());
  const request = payload();
  await createRun(app, request);
  const run = await waitFor(app, request.clientRunId, "unknown");
  assert.equal(run.error.code, "background_removal_timeout");
  await app.waitForIdle();
  await fetch(`${app.baseUrl}/api/background-removal/runs/${request.clientRunId}`);
  assert.equal(calls, 1);
});

test("cancellation wins over a late provider result and cannot unlock output", async (t) => {
  let resolveProvider;
  const providerResult = new Promise((resolve) => { resolveProvider = resolve; });
  const app = await start({ backgroundRemovalProvider: successProvider(async () => providerResult) });
  t.after(() => app.close());
  const request = payload();
  await createRun(app, request);
  const cancelResponse = await fetch(`${app.baseUrl}/api/background-removal/runs/${request.clientRunId}`, { method: "DELETE" });
  assert.equal(cancelResponse.status, 200);
  assert.equal((await body(cancelResponse)).run.status, "cancelled");
  resolveProvider({
    providerRequestId: "late-success-must-be-ignored",
    image: { bytes: OUTPUT_BYTES, mime: "image/png", hasAlpha: true },
  });
  await app.waitForIdle();
  const run = await waitFor(app, request.clientRunId, "cancelled");
  assert.equal(run.result, null);
  assert.equal(run.requestId, null);
});

test("LAN preview rejects background removal even when a provider was injected", async (t) => {
  let calls = 0;
  const app = await start({
    previewMode: "lan",
    backgroundRemovalProvider: successProvider(async () => { calls += 1; }),
  });
  t.after(() => app.close());
  const status = await body(await fetch(`${app.baseUrl}/api/background-removal/status`));
  assert.equal(status.available, false);
  assert.equal(status.reason, "lan_disabled");
  const response = await createRun(app, payload());
  assert.equal(response.status, 403);
  assert.equal((await body(response)).error.code, "lan_background_removal_disabled");
  assert.equal(calls, 0);
});
