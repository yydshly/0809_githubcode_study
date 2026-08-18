import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";

import {
  createImageStudioServer,
  isPrivateIpv4,
  resolveServerAccessConfig,
} from "../server/server.mjs";
import { InMemoryRunStore } from "../server/run-store.mjs";
import { buildOldPhotoRestorationPrompt } from "../web/old-photo-restoration.js";

const PNG_BYTES = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const PNG_DATA_URL = `data:image/png;base64,${PNG_BYTES.toString("base64")}`;

async function start(options = {}) {
  const root = await mkdtemp(join(tmpdir(), "single-image-studio-server-"));
  const webRoot = join(root, "web");
  await mkdir(webRoot);
  await writeFile(join(webRoot, "index.html"), "<!doctype html><title>Single Image Studio</title>");
  await writeFile(join(root, "secret.txt"), "not public");

  const app = createImageStudioServer({ webRoot, ...options });
  await new Promise((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen(0, "127.0.0.1", resolve);
  });
  const address = app.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    ...app,
    baseUrl,
    async close() {
      await app.waitForIdle();
      await new Promise((resolve, reject) => app.server.close((error) => error ? reject(error) : resolve()));
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function json(response) {
  return JSON.parse(await response.text());
}

function unavailableGenerativeStatus(previewMode = "local") {
  return {
    available: false,
    model: "gpt-image-2",
    provider: null,
    candidates: [
      {
        id: "openai.images-edits",
        label: "OpenAI 图片编辑",
        model: "gpt-image-2",
        inputMode: "direct-upload",
        supportedTasks: ["CR1", "CR-RESTORE"],
        configured: false,
        enabled: true,
        available: false,
        reason: previewMode === "lan" ? "lan_disabled" : "credential_missing",
      },
      {
        id: "minimax.image-01",
        label: "MiniMax image-01",
        model: "image-01",
        inputMode: "public-reference-url",
        supportedTasks: [],
        configured: false,
        enabled: false,
        available: false,
        reason: previewMode === "lan" ? "lan_disabled" : "credential_missing",
      },
    ],
    runStore: "memory",
    previewMode,
  };
}

async function waitForStatus(baseUrl, runId, expected) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/runs/${runId}`);
    const body = await json(response);
    if (body.run.status === expected) return body.run;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Run ${runId} did not reach ${expected}`);
}

test("InMemoryRunStore enforces status transitions and returns clones", () => {
  const store = new InMemoryRunStore();
  const created = store.create({ taskId: "creative-edit" });
  created.taskId = "mutated";
  assert.equal(store.get(created.id).taskId, "creative-edit");
  store.update(created.id, { status: "running" });
  store.update(created.id, { status: "succeeded", result: { ok: true } });
  assert.throws(() => store.update(created.id, { status: "running" }), /Invalid run transition/);
});

test("InMemoryRunStore resolves identical client ids and detects fingerprint conflicts", () => {
  const store = new InMemoryRunStore();
  const id = randomUUID();
  const first = store.createOrGet({ id, inputFingerprint: "same", metadata: { taskId: "CR1" } });
  const repeated = store.createOrGet({ id, inputFingerprint: "same", metadata: { taskId: "CR1" } });
  const conflict = store.createOrGet({ id, inputFingerprint: "different", metadata: { taskId: "CR1" } });
  assert.equal(first.created, true);
  assert.equal(repeated.created, false);
  assert.equal(repeated.conflict, false);
  assert.equal(conflict.created, false);
  assert.equal(conflict.conflict, true);
});

test("serves only the configured web root and reports unavailable without a key", async (t) => {
  const app = await start({ apiKey: "" });
  t.after(() => app.close());

  const page = await fetch(`${app.baseUrl}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Single Image Studio/);

  const traversal = await fetch(`${app.baseUrl}/%2e%2e%5csecret.txt`);
  assert.equal(traversal.status, 403);
  assert.equal((await json(traversal)).error.code, "forbidden_path");

  const status = await fetch(`${app.baseUrl}/api/status`);
  assert.deepEqual(await json(status), unavailableGenerativeStatus());

  const create = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRunId: randomUUID(),
      sourceImage: PNG_DATA_URL,
      prompt: "Keep the source recognizable.",
    }),
  });
  assert.equal(create.status, 503);
  assert.equal((await json(create)).error.code, "generative_provider_unavailable");
});

test("server access defaults to loopback and requires an explicit private LAN address", () => {
  assert.deepEqual(resolveServerAccessConfig({}), {
    bindHost: "127.0.0.1",
    port: 4177,
    previewMode: "local",
  });
  assert.deepEqual(resolveServerAccessConfig({
    SINGLE_IMAGE_STUDIO_ALLOW_LAN: "1",
    SINGLE_IMAGE_STUDIO_BIND_HOST: "192.168.5.84",
    SINGLE_IMAGE_STUDIO_PORT: "4312",
  }), {
    bindHost: "192.168.5.84",
    port: 4312,
    previewMode: "lan",
  });

  assert.throws(
    () => resolveServerAccessConfig({ SINGLE_IMAGE_STUDIO_BIND_HOST: "192.168.5.84" }),
    /ALLOW_LAN=1/,
  );
  for (const host of ["0.0.0.0", "8.8.8.8", "studio.local", "127.0.0.1"]) {
    assert.throws(
      () => resolveServerAccessConfig({
        SINGLE_IMAGE_STUDIO_ALLOW_LAN: "1",
        SINGLE_IMAGE_STUDIO_BIND_HOST: host,
      }),
      /私网 IPv4/,
    );
  }
  for (const port of ["0", "65536", "4177x", "-1"]) {
    assert.throws(
      () => resolveServerAccessConfig({ SINGLE_IMAGE_STUDIO_PORT: port }),
      /1–65535/,
    );
  }
});

test("local product acceptance reports are strict, in-memory, and disabled for LAN preview", async (t) => {
  const app = await start();
  t.after(() => app.close());
  const runId = randomUUID();
  const payload = {
    version: "product-acceptance-report-v1",
    runId,
    startedAt: "2026-08-17T08:00:00.000Z",
    completedAt: "2026-08-17T08:00:05.000Z",
    browser: { userAgent: "Synthetic Chromium QA", language: "zh-CN" },
    cases: [
      { id: "desktop-min", passed: true, evidence: "1280 × 720 pass" },
      { id: "desktop-common", passed: true, evidence: "1440 × 900 pass" },
      { id: "old-photo-local", passed: true, evidence: "1366 × 768 pass" },
      { id: "upload-specification", passed: true, evidence: "1200 × 900 JPEG pass" },
      { id: "document-archive", passed: true, evidence: "1448 × 1086 JPEG pass" },
    ],
  };
  const posted = await fetch(`${app.baseUrl}/api/internal/product-acceptance/latest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(posted.status, 202);
  const accepted = await json(posted);
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.report.runId, runId);
  assert.equal(typeof accepted.report.receivedAt, "string");

  const latest = await json(await fetch(`${app.baseUrl}/api/internal/product-acceptance/latest`));
  assert.deepEqual(latest.report, accepted.report);

  const v2 = {
    ...payload,
    version: "product-acceptance-report-v2",
    runId: randomUUID(),
    cases: [{ id: "privacy-share", passed: true, evidence: "1440 × 1080 JPEG metadata-clean pass" }, ...payload.cases],
  };
  const v2Posted = await fetch(`${app.baseUrl}/api/internal/product-acceptance/latest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(v2),
  });
  assert.equal(v2Posted.status, 202);
  const v2Accepted = await json(v2Posted);
  assert.equal(v2Accepted.report.version, "product-acceptance-report-v2");
  assert.equal(v2Accepted.report.cases.length, 6);

  const tampered = await fetch(`${app.baseUrl}/api/internal/product-acceptance/latest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, secret: "must-not-be-accepted" }),
  });
  assert.equal(tampered.status, 400);
  assert.equal((await json(tampered)).error.code, "unknown_field");

  const incomplete = await fetch(`${app.baseUrl}/api/internal/product-acceptance/latest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, cases: payload.cases.slice(0, 2) }),
  });
  assert.equal(incomplete.status, 400);
  assert.equal((await json(incomplete)).error.code, "invalid_acceptance_report");

  const invalidRoot = await fetch(`${app.baseUrl}/api/internal/product-acceptance/latest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "null",
  });
  assert.equal(invalidRoot.status, 400);
  assert.equal((await json(invalidRoot)).error.code, "invalid_json_object");

  const lan = await start({ previewMode: "lan" });
  t.after(() => lan.close());
  const blocked = await fetch(`${lan.baseUrl}/api/internal/product-acceptance/latest`);
  assert.equal(blocked.status, 403);
  assert.equal((await json(blocked)).error.code, "lan_internal_qa_disabled");
});

test("local examples acceptance reports are strict, separate from product reports, and LAN-disabled", async (t) => {
  const app = await start();
  t.after(() => app.close());
  const runId = randomUUID();
  const payload = {
    version: "examples-acceptance-report-v1",
    runId,
    startedAt: "2026-08-18T01:00:00.000Z",
    completedAt: "2026-08-18T01:00:05.000Z",
    browser: { userAgent: "Synthetic Chromium Gallery QA", language: "zh-CN" },
    cases: [
      { id: "examples-desktop", passed: true, evidence: "1180 px · 5 cards pass" },
      { id: "examples-narrow", passed: true, evidence: "390 px · stacked pass" },
    ],
  };
  const posted = await fetch(`${app.baseUrl}/api/internal/examples-acceptance/latest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(posted.status, 202);
  const accepted = await json(posted);
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.report.runId, runId);
  assert.equal(typeof accepted.report.receivedAt, "string");

  const latest = await json(await fetch(`${app.baseUrl}/api/internal/examples-acceptance/latest`));
  assert.deepEqual(latest.report, accepted.report);
  assert.deepEqual((await json(await fetch(`${app.baseUrl}/api/internal/product-acceptance/latest`))).report, null);

  const tampered = await fetch(`${app.baseUrl}/api/internal/examples-acceptance/latest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, secret: "must-not-be-accepted" }),
  });
  assert.equal(tampered.status, 400);
  assert.equal((await json(tampered)).error.code, "unknown_field");

  const incomplete = await fetch(`${app.baseUrl}/api/internal/examples-acceptance/latest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, cases: payload.cases.slice(0, 1) }),
  });
  assert.equal(incomplete.status, 400);
  assert.equal((await json(incomplete)).error.code, "invalid_examples_acceptance_report");

  const lan = await start({ previewMode: "lan" });
  t.after(() => lan.close());
  const blocked = await fetch(`${lan.baseUrl}/api/internal/examples-acceptance/latest`);
  assert.equal(blocked.status, 403);
  assert.equal((await json(blocked)).error.code, "lan_internal_qa_disabled");
});

test("local error acceptance reports keep the two viewport cases strict and LAN-disabled", async (t) => {
  const app = await start();
  t.after(() => app.close());
  const payload = {
    version: "error-acceptance-report-v1",
    runId: randomUUID(),
    startedAt: "2026-08-18T02:00:00.000Z",
    completedAt: "2026-08-18T02:00:05.000Z",
    browser: { userAgent: "Synthetic Chromium Error QA", language: "zh-CN" },
    cases: [
      { id: "errors-desktop", passed: true, evidence: "1180 px · 7 contexts pass" },
      { id: "errors-narrow", passed: true, evidence: "390 px · 7 contexts pass" },
    ],
  };
  const posted = await fetch(`${app.baseUrl}/api/internal/error-acceptance/latest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  assert.equal(posted.status, 202);
  const accepted = await json(posted);
  assert.equal(accepted.report.runId, payload.runId);
  assert.deepEqual((await json(await fetch(`${app.baseUrl}/api/internal/error-acceptance/latest`))).report, accepted.report);
  const incomplete = await fetch(`${app.baseUrl}/api/internal/error-acceptance/latest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, cases: payload.cases.slice(0, 1) }) });
  assert.equal(incomplete.status, 400);
  assert.equal((await json(incomplete)).error.code, "invalid_error_acceptance_report");
  const lan = await start({ previewMode: "lan" });
  t.after(() => lan.close());
  const blocked = await fetch(`${lan.baseUrl}/api/internal/error-acceptance/latest`);
  assert.equal(blocked.status, 403);
});

test("local walkthrough acceptance reports are strict, in-memory, and never human-session evidence", async (t) => {
  const app = await start();
  t.after(() => app.close());
  const payload = {
    version: "walkthrough-acceptance-report-v1",
    runId: randomUUID(),
    startedAt: "2026-08-18T03:00:00.000Z",
    completedAt: "2026-08-18T03:00:05.000Z",
    browser: { userAgent: "Synthetic Chromium Walkthrough QA", language: "zh-CN" },
    cases: [
      { id: "walkthrough-desktop", passed: true, evidence: "1180 px · anonymous form pass" },
      { id: "walkthrough-narrow", passed: true, evidence: "390 px · anonymous form pass" },
    ],
  };
  const posted = await fetch(`${app.baseUrl}/api/internal/walkthrough-acceptance/latest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  assert.equal(posted.status, 202);
  const accepted = await json(posted);
  assert.equal(accepted.report.runId, payload.runId);
  assert.deepEqual((await json(await fetch(`${app.baseUrl}/api/internal/walkthrough-acceptance/latest`))).report, accepted.report);
  const extra = await fetch(`${app.baseUrl}/api/internal/walkthrough-acceptance/latest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, participantName: "must be rejected" }) });
  assert.equal(extra.status, 400);
  assert.equal((await json(extra)).error.code, "unknown_field");
  const lan = await start({ previewMode: "lan" });
  t.after(() => lan.close());
  const blocked = await fetch(`${lan.baseUrl}/api/internal/walkthrough-acceptance/latest`);
  assert.equal(blocked.status, 403);
});

test("private IPv4 recognition covers only RFC1918 ranges", () => {
  for (const address of ["10.0.0.1", "172.16.0.1", "172.31.255.254", "192.168.1.2"]) {
    assert.equal(isPrivateIpv4(address), true, address);
  }
  for (const address of ["172.15.1.1", "172.32.1.1", "127.0.0.1", "169.254.1.1", "256.1.1.1", "1.2.3"]) {
    assert.equal(isPrivateIpv4(address), false, address);
  }
});

test("LAN preview reports local-only mode and rejects AI before reading input", async (t) => {
  let fetchCalls = 0;
  const app = await start({
    apiKey: "must-be-ignored",
    previewMode: "lan",
    fetchImpl: async () => { fetchCalls += 1; },
  });
  t.after(() => app.close());

  const status = await fetch(`${app.baseUrl}/api/status`);
  assert.deepEqual(await json(status), unavailableGenerativeStatus("lan"));

  const create = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "this body is deliberately not JSON",
  });
  assert.equal(create.status, 403);
  assert.equal((await json(create)).error.code, "lan_ai_disabled");
  assert.equal(fetchCalls, 0);
});

test("rejects malformed image data URLs before creating a run", async (t) => {
  const app = await start({ apiKey: "test-key", fetchImpl: async () => assert.fail("fetch must not run") });
  t.after(() => app.close());

  const response = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRunId: randomUUID(),
      sourceImage: "data:image/png;base64,AAAA",
      prompt: "Keep the source recognizable.",
    }),
  });
  assert.equal(response.status, 400);
  assert.equal((await json(response)).error.code, "image_mime_mismatch");
});

test("normalizes CR1 but rejects task ids outside the server allowlist", async (t) => {
  const app = await start({ apiKey: "test-key", fetchImpl: async () => assert.fail("fetch must not run") });
  t.after(() => app.close());

  const response = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRunId: randomUUID(),
      taskId: "CR2",
      sourceImage: PNG_DATA_URL,
      prompt: "Edit this image.",
    }),
  });
  assert.equal(response.status, 400);
  assert.equal((await json(response)).error.code, "invalid_task_id");
});

test("old photo restoration accepts only the frozen prompt combinations", async (t) => {
  let fetchCalls = 0;
  const app = await start({
    apiKey: "test-key",
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ data: [{ b64_json: PNG_BYTES.toString("base64") }] }), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "req_restore_contract" },
      });
    },
  });
  t.after(() => app.close());

  const invalid = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRunId: randomUUID(),
      taskId: "CR-RESTORE",
      sourceImage: PNG_DATA_URL,
      prompt: "Restore this photo and make the person younger.",
    }),
  });
  assert.equal(invalid.status, 400);
  assert.equal((await json(invalid)).error.code, "invalid_restoration_prompt");
  assert.equal(fetchCalls, 0);

  const prompt = buildOldPhotoRestorationPrompt({ strength: "restrained", preserve: "identity" });
  const valid = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRunId: randomUUID(),
      taskId: "cr-restore",
      sourceImage: PNG_DATA_URL,
      prompt,
      outputFormat: "png",
    }),
  });
  assert.equal(valid.status, 202);
  const created = await json(valid);
  assert.equal(created.run.taskId, "CR-RESTORE");
  await waitForStatus(app.baseUrl, created.run.id, "succeeded");
  assert.equal(fetchCalls, 1);
});

test("creates a real edit request and exposes succeeded status with request id", async (t) => {
  let fetchCalls = 0;
  const clientRunId = randomUUID();
  const app = await start({
    apiKey: "test-key",
    fetchImpl: async (url, init) => {
      fetchCalls += 1;
      assert.equal(url, "https://api.openai.com/v1/images/edits");
      assert.equal(init.method, "POST");
      assert.equal(init.headers.Authorization, "Bearer test-key");
      assert.equal(init.body.get("model"), "gpt-image-2");
      assert.equal(init.body.get("prompt"), "Keep the source recognizable.");
      assert.equal(init.body.getAll("image[]").length, 2);
      return new Response(JSON.stringify({
        data: [{ b64_json: PNG_BYTES.toString("base64") }],
        usage: { total_tokens: 42 },
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_test_success",
        },
      });
    },
  });
  t.after(() => app.close());

  const create = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRunId,
      taskId: "CR1",
      sourceImage: PNG_DATA_URL,
      referenceImages: [PNG_DATA_URL],
      prompt: "Keep the source recognizable.",
      outputFormat: "png",
    }),
  });
  assert.equal(create.status, 202);
  const createdBody = await json(create);
  assert.equal(createdBody.run.status, "queued");
  assert.equal(createdBody.run.id, clientRunId);
  assert.equal(createdBody.run.taskId, "CR1");
  assert.equal(createdBody.reused, false);
  assert.match(create.headers.get("location"), new RegExp(createdBody.run.id));

  const run = await waitForStatus(app.baseUrl, createdBody.run.id, "succeeded");
  assert.equal(fetchCalls, 1);
  assert.equal(run.requestId, "req_test_success");
  assert.equal(run.result.model, "gpt-image-2");
  assert.equal(run.result.image, PNG_DATA_URL);
  assert.equal(run.input.referenceCount, 1);
  assert.equal("sourceImage" in run.input, false);
});

test("reuses the same client run id without resubmitting and rejects changed input", async (t) => {
  let calls = 0;
  const app = await start({
    apiKey: "test-key",
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({
        data: [{ b64_json: PNG_BYTES.toString("base64") }],
      }), {
        status: 200,
        headers: { "x-request-id": "req_idempotent" },
      });
    },
  });
  t.after(() => app.close());

  const clientRunId = randomUUID();
  const payload = {
    clientRunId,
    taskId: "CR1",
    sourceImage: PNG_DATA_URL,
    prompt: "Edit this image once.",
  };
  const first = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(first.status, 202);

  const repeated = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, taskId: "cr1" }),
  });
  assert.equal(repeated.status, 200);
  const repeatedBody = await json(repeated);
  assert.equal(repeatedBody.reused, true);
  assert.equal(repeatedBody.run.id, clientRunId);
  assert.equal(calls, 1);

  const conflict = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, prompt: "This is different input." }),
  });
  assert.equal(conflict.status, 409);
  assert.equal((await json(conflict)).error.code, "client_run_conflict");
  assert.equal(calls, 1);

  const query = await fetch(`${app.baseUrl}/api/runs/${clientRunId}`);
  assert.equal(query.status, 200);
  assert.equal((await json(query)).run.id, clientRunId);
  assert.equal(calls, 1);
});

test("records OpenAI failures and their request id", async (t) => {
  const app = await start({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      error: { code: "image_generation_user_error", message: "Input rejected" },
    }), {
      status: 400,
      headers: { "x-request-id": "req_test_failure" },
    }),
  });
  t.after(() => app.close());

  const create = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRunId: randomUUID(),
      sourceImage: PNG_DATA_URL,
      prompt: "Edit this image.",
    }),
  });
  const runId = (await json(create)).run.id;
  const run = await waitForStatus(app.baseUrl, runId, "failed");
  assert.equal(run.requestId, "req_test_failure");
  assert.equal(run.error.code, "image_generation_user_error");
  assert.equal(run.error.httpStatus, 400);
});

test("marks transport uncertainty unknown and never resubmits automatically", async (t) => {
  let calls = 0;
  const app = await start({
    apiKey: "test-key",
    fetchImpl: async () => {
      calls += 1;
      const error = new Error("timed out");
      error.name = "TimeoutError";
      throw error;
    },
  });
  t.after(() => app.close());

  const create = await fetch(`${app.baseUrl}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRunId: randomUUID(),
      sourceImage: PNG_DATA_URL,
      prompt: "Edit this image.",
    }),
  });
  const runId = (await json(create)).run.id;
  const run = await waitForStatus(app.baseUrl, runId, "unknown");
  assert.equal(run.error.code, "upstream_timeout");
  assert.equal(calls, 1);

  const queriedAgain = await fetch(`${app.baseUrl}/api/runs/${runId}`);
  assert.equal((await json(queriedAgain)).run.status, "unknown");
  assert.equal(calls, 1);
});
