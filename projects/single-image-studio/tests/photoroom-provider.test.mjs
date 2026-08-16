import assert from "node:assert/strict";
import test from "node:test";

import { createPhotoroomBackgroundRemovalProvider } from "../server/providers/background-removal/photoroom-provider.mjs";
import { resolveConfiguredBackgroundRemovalProvider } from "../server/server.mjs";

const SOURCE = Object.freeze({
  bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  mime: "image/png",
});

test("server requires an explicit enable flag in addition to the PhotoRoom key", () => {
  assert.equal(resolveConfiguredBackgroundRemovalProvider({ PHOTOROOM_API_KEY: "stored-key" }, "local"), null);
  assert.equal(resolveConfiguredBackgroundRemovalProvider({
    PHOTOROOM_API_KEY: "stored-key",
    PHOTOROOM_ENABLED: "true",
  }, "lan"), null);
  const enabled = resolveConfiguredBackgroundRemovalProvider({
    PHOTOROOM_API_KEY: "stored-key",
    PHOTOROOM_ENABLED: "true",
  }, "local");
  assert.equal(enabled.id, "photoroom.background-removal");
});

test("PhotoRoom provider sends one explicit RGBA PNG segmentation request", async () => {
  let observed;
  const provider = createPhotoroomBackgroundRemovalProvider({
    apiKey: "server-secret",
    fetchImpl: async (url, options) => {
      observed = { url, options };
      return new Response(Buffer.from([1, 2, 3, 4]), {
        status: 200,
        headers: {
          "content-type": "image/png",
          "x-request-id": "photoroom-request-1",
        },
      });
    },
  });

  const result = await provider.removeBackground({
    source: SOURCE,
    context: { runId: "run-1" },
  });

  assert.equal(observed.url, "https://sdk.photoroom.com/v1/segment");
  assert.equal(observed.options.method, "POST");
  assert.equal(observed.options.headers["X-Api-Key"], "server-secret");
  assert.equal(observed.options.body.get("format"), "png");
  assert.equal(observed.options.body.get("channels"), "rgba");
  assert.equal(observed.options.body.get("size"), "full");
  assert.equal(observed.options.body.get("crop"), "false");
  assert.equal(observed.options.body.get("despill"), "false");
  assert.equal(observed.options.body.get("image_file").type, "image/png");
  assert.equal(result.providerRequestId, "photoroom-request-1");
  assert.equal(result.image.mime, "image/png");
  assert.deepEqual(result.image.bytes, Buffer.from([1, 2, 3, 4]));
});

test("PhotoRoom provider maps definitive upstream refusals without retrying", async () => {
  let calls = 0;
  const provider = createPhotoroomBackgroundRemovalProvider({
    apiKey: "server-secret",
    fetchImpl: async () => {
      calls += 1;
      return new Response("rate limited", { status: 429 });
    },
  });

  await assert.rejects(
    provider.removeBackground({ source: SOURCE, context: { runId: "run-1" } }),
    (error) => error.code === "provider_rate_limited" && error.definitive === true && error.httpStatus === 429,
  );
  assert.equal(calls, 1);
});

test("PhotoRoom provider keeps transport uncertainty distinct from a definitive failure", async () => {
  const provider = createPhotoroomBackgroundRemovalProvider({
    apiKey: "server-secret",
    fetchImpl: async () => { throw new TypeError("socket reset"); },
  });

  await assert.rejects(
    provider.removeBackground({ source: SOURCE, context: { runId: "run-1" } }),
    (error) => error.code === "provider_transport_unknown" && error.definitive === false,
  );
});

test("PhotoRoom provider rejects oversized and non-PNG responses", async () => {
  const oversized = createPhotoroomBackgroundRemovalProvider({
    apiKey: "server-secret",
    maxOutputBytes: 3,
    fetchImpl: async () => new Response(Buffer.from([1, 2, 3, 4]), {
      status: 200,
      headers: { "content-type": "image/png", "content-length": "4" },
    }),
  });
  await assert.rejects(
    oversized.removeBackground({ source: SOURCE, context: { runId: "run-1" } }),
    (error) => error.code === "provider_output_too_large",
  );

  const wrongMime = createPhotoroomBackgroundRemovalProvider({
    apiKey: "server-secret",
    fetchImpl: async () => new Response("not png", {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  });
  await assert.rejects(
    wrongMime.removeBackground({ source: SOURCE, context: { runId: "run-1" } }),
    (error) => error.code === "provider_output_mime_invalid",
  );
});
