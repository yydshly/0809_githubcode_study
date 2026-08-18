import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { deflateSync } from "node:zlib";

import {
  executePublicBackgroundRemoval,
  parsePublicBackgroundRemovalPayload,
  publicBackgroundRemovalStatus,
} from "../api/background-removal/_shared.mjs";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
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

const PNG = rgbaPng();
const SHA = createHash("sha256").update(PNG).digest("hex");
const ENV = Object.freeze({
  PHOTOROOM_ENABLED: "true",
  PHOTOROOM_API_KEY: "sandbox_test-key-not-real",
  BACKGROUND_REMOVAL_ACCESS_TOKEN: "test-access-token-123456789",
});

function payload(overrides = {}) {
  return {
    clientRunId: randomUUID(),
    sourceRevision: 1,
    geometryRevision: 1,
    sourceImage: `data:image/png;base64,${PNG.toString("base64")}`,
    sourceSha256: SHA,
    consent: {
      accepted: true,
      acceptedAt: "2026-08-18T04:00:00.000Z",
      policyVersion: "background-removal-consent.v0",
    },
    ...overrides,
  };
}

test("public status is stateless and requires all three server-only settings", () => {
  assert.deepEqual(publicBackgroundRemovalStatus({}), {
    available: false,
    provider: null,
    reason: "not_configured",
    runStore: "stateless",
    previewMode: "public-hybrid",
    accessPolicy: "shared-demo-token",
  });
  const status = publicBackgroundRemovalStatus(ENV);
  assert.equal(status.available, true);
  assert.equal(status.provider.environment, "sandbox");
  assert.equal(status.runStore, "stateless");
  assert.equal(JSON.stringify(status).includes(ENV.PHOTOROOM_API_KEY), false);
  assert.equal(JSON.stringify(status).includes(ENV.BACKGROUND_REMOVAL_ACCESS_TOKEN), false);
});

test("public request validation binds exact source bytes, hash, consent and closed fields", () => {
  const parsed = parsePublicBackgroundRemovalPayload(payload());
  assert.equal(parsed.source.sha256, SHA);
  assert.equal(parsed.source.bytes.equals(PNG), true);
  assert.throws(
    () => parsePublicBackgroundRemovalPayload(payload({ sourceSha256: "0".repeat(64) })),
    (error) => error.code === "source_hash_mismatch",
  );
  assert.throws(
    () => parsePublicBackgroundRemovalPayload({ ...payload(), extra: true }),
    (error) => error.code === "unsupported_request_field",
  );
  assert.throws(
    () => parsePublicBackgroundRemovalPayload(payload({ consent: { accepted: false, acceptedAt: "2026-08-18T04:00:00.000Z", policyVersion: "background-removal-consent.v0" } })),
    (error) => error.code === "background_removal_consent_required",
  );
});

test("stateless function rejects an invalid experience code before provider invocation", async () => {
  let calls = 0;
  await assert.rejects(
    executePublicBackgroundRemoval({
      payload: payload(),
      accessToken: "wrong-code",
      env: ENV,
      fetchImpl: async () => { calls += 1; },
    }),
    (error) => error.status === 401 && error.code === "background_removal_access_required",
  );
  assert.equal(calls, 0);
});

test("stateless function returns one validated terminal run without retaining secrets", async () => {
  let calls = 0;
  const run = await executePublicBackgroundRemoval({
    payload: payload(),
    accessToken: ENV.BACKGROUND_REMOVAL_ACCESS_TOKEN,
    env: ENV,
    now: (() => {
      const values = ["2026-08-18T04:01:00.000Z", "2026-08-18T04:01:01.000Z"];
      return () => values.shift();
    })(),
    fetchImpl: async (_url, options) => {
      calls += 1;
      assert.equal(options.headers["X-Api-Key"], ENV.PHOTOROOM_API_KEY);
      assert.equal(options.body instanceof FormData, true);
      return new Response(PNG, {
        status: 200,
        headers: { "content-type": "image/png", "x-request-id": "sandbox-request-1" },
      });
    },
  });
  assert.equal(calls, 1);
  assert.equal(run.status, "succeeded");
  assert.equal(run.requestId, "sandbox-request-1");
  assert.equal(run.result.mime, "image/png");
  assert.equal(run.result.hasAlpha, true);
  assert.equal(run.result.persistence, "none");
  assert.equal(run.result.imageSha256, SHA);
  assert.equal(run.result.width, 1);
  assert.equal(run.result.height, 1);
  const serialized = JSON.stringify(run);
  assert.equal(serialized.includes(ENV.PHOTOROOM_API_KEY), false);
  assert.equal(serialized.includes(ENV.BACKGROUND_REMOVAL_ACCESS_TOKEN), false);
});

test("provider refusal is definitive while transport uncertainty remains unknown", async () => {
  const refused = await executePublicBackgroundRemoval({
    payload: payload(),
    accessToken: ENV.BACKGROUND_REMOVAL_ACCESS_TOKEN,
    env: ENV,
    fetchImpl: async () => new Response("rate limited", { status: 429 }),
  });
  assert.equal(refused.status, "failed");
  assert.equal(refused.error.code, "provider_rate_limited");

  const unknown = await executePublicBackgroundRemoval({
    payload: payload(),
    accessToken: ENV.BACKGROUND_REMOVAL_ACCESS_TOKEN,
    env: ENV,
    fetchImpl: async () => { throw new TypeError("network lost"); },
  });
  assert.equal(unknown.status, "unknown");
  assert.equal(unknown.error.code, "provider_transport_unknown");
});
