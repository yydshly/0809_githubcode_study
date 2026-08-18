import assert from "node:assert/strict";
import test from "node:test";
import * as api from "../web/api-client.js";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

test("getStatus requests only the local API status endpoint", async () => {
  const calls = [];
  const client = api.createApiClient({
    baseUrl: "http://studio.test/",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ ok: true, creativeAvailable: false });
    },
  });

  assert.deepEqual(await client.getStatus(), {
    ok: true,
    creativeAvailable: false,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://studio.test/api/status");
  assert.equal(calls[0].options.method, "GET");
});

test("createRun posts JSON and accepts a wrapped run response", async () => {
  const calls = [];
  const client = api.createApiClient({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ run: { id: "run-1", status: "QUEUED" } }, { status: 201 });
    },
  });

  const run = await client.createRun({ taskId: "faithful-tidy" });

  assert.deepEqual(run, { id: "run-1", status: "QUEUED" });
  assert.equal(calls[0].url, "/api/runs");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].options.body), { taskId: "faithful-tidy" });
});

test("pollRun reports updates and stops at a successful terminal state", async () => {
  const responses = [
    { id: "run/encoded", status: "QUEUED" },
    { id: "run/encoded", status: "RUNNING" },
    { id: "run/encoded", status: "SUCCEEDED", resultUrl: "/result.png" },
  ];
  const urls = [];
  const updates = [];
  const client = api.createApiClient({
    fetchImpl: async (url) => {
      urls.push(url);
      return jsonResponse(responses.shift());
    },
  });

  const result = await client.pollRun("run/encoded", {
    intervalMs: 0,
    timeoutMs: 1_000,
    onUpdate: (run) => updates.push(run.status),
  });

  assert.equal(result.status, "SUCCEEDED");
  assert.deepEqual(updates, ["QUEUED", "RUNNING", "SUCCEEDED"]);
  assert.ok(urls.every((url) => url === "/api/runs/run%2Fencoded"));
});

test("server UNKNOWN is returned as a distinct terminal run state", async () => {
  const client = api.createApiClient({
    fetchImpl: async () => jsonResponse({ id: "run-2", status: "UNKNOWN" }),
  });

  const result = await client.pollRun("run-2", {
    intervalMs: 0,
    timeoutMs: 1_000,
  });

  assert.equal(result.status, "UNKNOWN");
});

test("HTTP failures use the unified definitive error shape", async () => {
  const client = api.createApiClient({
    fetchImpl: async () => jsonResponse(
      { error: { code: "INVALID_TASK", message: "Task is not available" } },
      { status: 422 },
    ),
  });

  await assert.rejects(
    client.createRun({ taskId: "missing" }),
    (error) => {
      assert.ok(error instanceof api.ApiClientError);
      assert.equal(error.code, "INVALID_TASK");
      assert.equal(error.outcome, "FAILED");
      assert.equal(error.status, 422);
      assert.equal(error.retryable, false);
      return true;
    },
  );
});

test("a transport failure during run creation has UNKNOWN outcome", async () => {
  const client = api.createApiClient({
    fetchImpl: async () => {
      throw new TypeError("network unavailable");
    },
  });

  await assert.rejects(
    client.createRun({ taskId: "creative" }),
    (error) => {
      assert.ok(error instanceof api.ApiClientError);
      assert.equal(error.code, "NETWORK_ERROR");
      assert.equal(error.outcome, "UNKNOWN");
      assert.equal(error.isUnknown, true);
      return true;
    },
  );
});

test("AbortController cancellation is ABORTED rather than UNKNOWN", async () => {
  const controller = new AbortController();
  const client = api.createApiClient({
    fetchImpl: async (_url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true },
      );
    }),
  });

  const pending = client.pollRun("run-3", {
    signal: controller.signal,
    intervalMs: 0,
    timeoutMs: 1_000,
  });
  controller.abort();

  await assert.rejects(pending, (error) => {
    assert.equal(error.code, "ABORTED");
    assert.equal(error.outcome, "ABORTED");
    assert.equal(error.isUnknown, false);
    return true;
  });
});

test("poll timeout is surfaced as UNKNOWN with the last observed run", async () => {
  const client = api.createApiClient({
    requestTimeoutMs: 1_000,
    fetchImpl: async () => jsonResponse({ id: "run-4", status: "RUNNING" }),
  });

  await assert.rejects(
    client.pollRun("run-4", { intervalMs: 10, timeoutMs: 5 }),
    (error) => {
      assert.equal(error.code, "POLL_TIMEOUT");
      assert.equal(error.outcome, "UNKNOWN");
      assert.equal(error.details.runId, "run-4");
      assert.equal(error.details.lastRun.status, "RUNNING");
      return true;
    },
  );
});

test("background removal client uses dedicated status, run, cancel, deletion, and polling routes", async () => {
  const calls = [];
  const responses = [
    { available: true, provider: { id: "fake.background-removal", version: "0.1.0", mode: "fake" } },
    { run: { id: "cutout-1", status: "queued" } },
    { run: { id: "cutout-1", status: "running" } },
    { run: { id: "cutout-1", status: "succeeded", result: { mime: "image/png", hasAlpha: true } } },
    { run: { id: "cutout-2", status: "cancelled" }, cancelled: true },
    { receipt: { runId: "cutout-1", localRecordDeleted: true, scope: "local-memory-run-record" } },
  ];
  const client = api.createApiClient({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse(responses.shift());
    },
  });

  const status = await client.getBackgroundRemovalStatus();
  assert.equal(status.available, true);
  const created = await client.createBackgroundRemovalRun(
    { sourceRevision: 1 },
    { accessToken: "private-demo-access" },
  );
  assert.equal(created.status, "QUEUED");
  assert.equal(calls[1].options.headers["X-Background-Removal-Access"], "private-demo-access");
  const finished = await client.pollBackgroundRemovalRun("cutout-1", { intervalMs: 0, timeoutMs: 1_000 });
  assert.equal(finished.status, "SUCCEEDED");
  const cancelled = await client.cancelBackgroundRemovalRun("cutout-2");
  assert.equal(cancelled.status, "CANCELLED");
  const deleted = await client.deleteBackgroundRemovalRecord("cutout-1");
  assert.equal(deleted.receipt.localRecordDeleted, true);

  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    ["/api/background-removal/status", "GET"],
    ["/api/background-removal/runs", "POST"],
    ["/api/background-removal/runs/cutout-1", "GET"],
    ["/api/background-removal/runs/cutout-1", "GET"],
    ["/api/background-removal/runs/cutout-2", "DELETE"],
    ["/api/background-removal/runs/cutout-1/record", "DELETE"],
  ]);
});

test("background removal creation and cancellation preserve UNKNOWN transport outcomes", async () => {
  const client = api.createApiClient({
    fetchImpl: async () => { throw new TypeError("network lost"); },
  });
  for (const operation of [
    () => client.createBackgroundRemovalRun({ sourceRevision: 1 }),
    () => client.cancelBackgroundRemovalRun("cutout-unknown"),
    () => client.deleteBackgroundRemovalRecord("cutout-unknown"),
  ]) {
    await assert.rejects(operation, (error) => {
      assert.equal(error.outcome, "UNKNOWN");
      assert.equal(error.retryable, true);
      return true;
    });
  }
});
