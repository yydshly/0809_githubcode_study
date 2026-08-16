import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = resolve(PROJECT_ROOT, "provider-evaluation/sandbox-v0/generation-manifest.json");
const RESULTS_ROOT = resolve(PROJECT_ROOT, "provider-evaluation/sandbox-v0/results");
const BASE_URL = process.env.SINGLE_IMAGE_STUDIO_ORIGIN ?? "http://127.0.0.1:4177";
const TERMINAL = new Set(["succeeded", "failed", "unknown", "cancelled"]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function responseJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function waitForTerminal(runId) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const payload = await responseJson(await fetch(`${BASE_URL}/api/background-removal/runs/${runId}`));
    if (TERMINAL.has(payload.run.status)) return payload.run;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`run ${runId} did not reach a terminal state; no retry was attempted`);
}

async function runCase(caseDefinition) {
  const inputPath = resolve(dirname(MANIFEST_PATH), caseDefinition.path);
  const inputBytes = await readFile(inputPath);
  const inputSha256 = sha256(inputBytes);
  if (inputSha256 !== caseDefinition.sha256 || inputBytes.length !== caseDefinition.byteLength) {
    throw new Error(`${caseDefinition.id} input identity drifted`);
  }

  const runId = randomUUID();
  const startedAt = new Date();
  const created = await responseJson(await fetch(`${BASE_URL}/api/background-removal/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRunId: runId,
      sourceRevision: 1,
      geometryRevision: 1,
      sourceImage: `data:image/png;base64,${inputBytes.toString("base64")}`,
      sourceSha256: inputSha256,
      consent: {
        accepted: true,
        acceptedAt: startedAt.toISOString(),
        policyVersion: "background-removal-consent.v0",
      },
    }),
  }));
  if (created.reused === true) throw new Error(`${caseDefinition.id} unexpectedly reused a run`);

  const run = await waitForTerminal(runId);
  const record = {
    schemaVersion: "provider-sandbox-observation.v0",
    caseId: caseDefinition.id,
    focus: caseDefinition.focus,
    runId,
    startedAt: startedAt.toISOString(),
    completedAt: run.completedAt ?? new Date().toISOString(),
    elapsedMs: Date.now() - startedAt.getTime(),
    status: run.status,
    input: {
      path: caseDefinition.path,
      sha256: inputSha256,
      byteLength: inputBytes.length,
      width: caseDefinition.width,
      height: caseDefinition.height,
    },
    provider: run.provider,
    requestId: run.requestId ?? null,
    error: run.error ?? null,
    output: null,
    interpretation: "sandbox-watermarked-structure-only-not-production-quality",
  };

  if (run.status === "succeeded") {
    if (!run.result?.image?.startsWith("data:image/png;base64,")) {
      throw new Error(`${caseDefinition.id} succeeded without a PNG data URL`);
    }
    const outputBytes = Buffer.from(run.result.image.split(",", 2)[1], "base64");
    const outputSha256 = sha256(outputBytes);
    if (outputSha256 !== run.result.imageSha256) throw new Error(`${caseDefinition.id} output hash drifted`);
    const outputFile = `${caseDefinition.id}.png`;
    await writeFile(resolve(RESULTS_ROOT, outputFile), outputBytes, { flag: "wx" });
    record.output = {
      path: `results/${outputFile}`,
      sha256: outputSha256,
      byteLength: outputBytes.length,
      mime: run.result.mime,
      width: run.result.width,
      height: run.result.height,
      hasAlpha: run.result.hasAlpha,
      watermarked: true,
    };
  }

  await writeFile(
    resolve(RESULTS_ROOT, `${caseDefinition.id}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
    { flag: "wx" },
  );
  if (run.status !== "succeeded") throw new Error(`${caseDefinition.id} ended ${run.status}; no retry was attempted`);
  return record;
}

async function main() {
  if (process.argv[2] !== "--execute-once") {
    throw new Error("refusing remote calls without the explicit --execute-once argument");
  }
  const status = await responseJson(await fetch(`${BASE_URL}/api/background-removal/status`));
  if (!status.available || status.provider?.environment !== "sandbox") {
    throw new Error("PhotoRoom sandbox provider is not explicitly available");
  }

  await mkdir(RESULTS_ROOT, { recursive: true });
  const existing = await readdir(RESULTS_ROOT);
  if (existing.length > 0) throw new Error("results directory is not empty; refusing replay or overwrite");

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const records = [];
  for (const caseDefinition of manifest.cases) records.push(await runCase(caseDefinition));
  await writeFile(resolve(RESULTS_ROOT, "evaluation-result.json"), `${JSON.stringify({
    schemaVersion: "provider-sandbox-evaluation.v0",
    provider: status.provider,
    attemptedCalls: records.length,
    retries: 0,
    allSucceeded: records.every((record) => record.status === "succeeded"),
    records: records.map((record) => `${record.caseId}.json`),
    completedAt: new Date().toISOString(),
  }, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ attemptedCalls: records.length, allSucceeded: true, retries: 0 }));
}

await main();
