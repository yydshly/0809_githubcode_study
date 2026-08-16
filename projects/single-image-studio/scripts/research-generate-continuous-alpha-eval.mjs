import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { FIXTURE_DEFINITION, buildResearchFixturePixels } from "./research-generate-fixtures.mjs";
import { encodeReferenceSrgbPng, sha256 } from "./research-reference-adapters.mjs";
import { validateJsonSchemaInstance } from "./research-validate-slice02.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const RESEARCH_ROOT = path.join(PROJECT_ROOT, "research");
export const CONTINUOUS_ALPHA_ROOT = path.join(RESEARCH_ROOT, "matting-evaluation", "continuous-alpha-v0");
export const CONTINUOUS_ALPHA_CREATED_AT = "2026-08-16T02:00:00.000Z";
const CANDIDATE_REGISTRY_PATH = path.join(RESEARCH_ROOT, "matting-candidates", "continuous-alpha-candidates.v0.json");
const BASELINE_REPORT_PATH = path.join(RESEARCH_ROOT, "results", "sourcecard-matting-baseline-v0", "report.json");
const WIDTH = FIXTURE_DEFINITION.width;
const HEIGHT = FIXTURE_DEFINITION.height;
const BACKGROUND = Object.freeze([0, 216, 255]);
const EVIDENCE_BOUNDARY = Object.freeze({
  c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0,
  o1: 0, g1: 0, v1: 0, productSupport: false,
});

const SHA = { type: "string", pattern: "^[a-f0-9]{64}$" };
const STRING = { type: "string", minLength: 1, pattern: ".*\\S.*" };
const ZERO_BOUNDARY = {
  type: "object", additionalProperties: false,
  required: ["c1", "u1", "e1", "r1Pipeline", "r1ProductValidation", "r1ProductRelease", "o1", "g1", "v1", "productSupport"],
  properties: {
    c1: { const: 0 }, u1: { const: 0 }, e1: { const: 0 }, r1Pipeline: { const: 0 },
    r1ProductValidation: { const: 0 }, r1ProductRelease: { const: 0 }, o1: { const: 0 },
    g1: { const: 0 }, v1: { const: 0 }, productSupport: { const: false },
  },
};

const SCHEMAS = Object.freeze({
  "schemas/continuous-alpha-contract.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "continuous-alpha-contract.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "contractId", "createdAt", "inputProfile", "outputProfile", "metrics", "candidateRegistryRef", "baselineRef", "decisionBoundary", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "continuous-alpha-contract.v0" }, contractId: { const: "CC-CAP04-CONTINUOUS-ALPHA-EVAL@0.1.0" },
      createdAt: STRING, inputProfile: STRING, outputProfile: STRING,
      metrics: { type: "array", minItems: 6, maxItems: 6, items: STRING },
      candidateRegistryRef: { $ref: "#/$defs/fileRef" }, baselineRef: { $ref: "#/$defs/fileRef" },
      decisionBoundary: STRING, evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
    $defs: { fileRef: { type: "object", additionalProperties: false, required: ["path", "fileSha256"], properties: { path: STRING, fileSha256: SHA } } },
  },
  "schemas/continuous-alpha-manifest.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "continuous-alpha-manifest.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "manifestId", "createdAt", "visibility", "rights", "sourceCount", "assetCount", "fixtures", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "continuous-alpha-manifest.v0" }, manifestId: { const: "MANIFEST-CONTINUOUS-ALPHA-SYNTHETIC@0.1.0" },
      createdAt: STRING, visibility: { const: "public-synthetic" },
      rights: { const: "project-original-procedural-no-real-person-no-third-party-image" },
      sourceCount: { const: 6 }, assetCount: { const: 12 },
      fixtures: { type: "array", minItems: 6, maxItems: 6, items: { $ref: "#/$defs/fixture" } },
      evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
    $defs: {
      asset: { type: "object", additionalProperties: false, required: ["path", "byteLength", "fileSha256"], properties: { path: STRING, byteLength: { type: "integer", minimum: 1 }, fileSha256: SHA } },
      fixture: {
        type: "object", additionalProperties: false,
        required: ["sourceId", "category", "sourceFamilyId", "captureSessionId", "width", "height", "input", "groundTruthAlpha", "lineage"],
        properties: {
          sourceId: STRING, category: { enum: ["binary-hard", "topology-hole", "radial-soft", "diagonal-feather", "thin-structure", "semi-transparent"] },
          sourceFamilyId: STRING, captureSessionId: STRING, width: { const: 160 }, height: { const: 120 },
          input: { $ref: "#/$defs/asset" }, groundTruthAlpha: { $ref: "#/$defs/asset" }, lineage: STRING,
        },
      },
    },
  },
  "schemas/continuous-alpha-plan.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "continuous-alpha-plan.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "planId", "createdAt", "contractRef", "manifestRef", "registeredCandidateIds", "denominator", "repeatRule", "stoppingRule", "thresholdState", "naturalImageExtension", "resultState", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "continuous-alpha-plan.v0" }, planId: { const: "PLAN-CONTINUOUS-ALPHA-SYNTHETIC@0.1.0" }, createdAt: STRING,
      contractRef: { $ref: "#/$defs/recordRef" }, manifestRef: { $ref: "#/$defs/recordRef" },
      registeredCandidateIds: { type: "array", minItems: 2, maxItems: 2, items: STRING },
      denominator: {
        type: "object", additionalProperties: false,
        required: ["sourceUnit", "sourcesPerCandidate", "repetitionsPerSource", "plannedAttemptsPerCandidate", "plannedTotalAttempts"],
        properties: {
          sourceUnit: { const: "independent-project-original-synthetic-source" }, sourcesPerCandidate: { const: 6 },
          repetitionsPerSource: { const: 3 }, plannedAttemptsPerCandidate: { const: 18 }, plannedTotalAttempts: { const: 36 },
        },
      },
      repeatRule: { const: "three cold starts; all raw results retained; no majority vote and no valid-result rerun" },
      stoppingRule: { const: "any drift, missing source/repetition, invalid output, resource failure, or runtime uncertainty closes that candidate run non-pass or inconclusive without replacement" },
      thresholdState: { const: "not-frozen-no-capability-pass-decision" },
      naturalImageExtension: { const: "not-created-separate-governance-required" }, resultState: { const: "not-created" },
      evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
    $defs: { recordRef: { type: "object", additionalProperties: false, required: ["id", "contentHash", "path", "fileSha256"], properties: { id: STRING, contentHash: SHA, path: STRING, fileSha256: SHA } } },
  },
  "schemas/continuous-alpha-output.v0.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "continuous-alpha-output.v0.schema.json",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "outputId", "candidateId", "sourceId", "repetition", "width", "height", "alphaPlane", "metrics", "createdAt", "evidenceBoundary", "contentHash"],
    properties: {
      schemaVersion: { const: "continuous-alpha-output.v0" }, outputId: STRING, candidateId: STRING, sourceId: STRING,
      repetition: { type: "integer", minimum: 1, maximum: 3 }, width: { const: 160 }, height: { const: 120 },
      alphaPlane: { type: "object", additionalProperties: false, required: ["encoding", "byteLength", "sha256"], properties: { encoding: { const: "row-major-alpha8" }, byteLength: { const: 19200 }, sha256: SHA } },
      metrics: {
        type: "object", additionalProperties: false,
        required: ["meanAbsoluteError", "rootMeanSquaredError", "sumAbsoluteDifferenceNormalized", "maximumAbsoluteError", "exactPixelRate", "foregroundIouAt128", "boundaryPixelCount", "boundaryMeanAbsoluteError"],
        properties: {
          meanAbsoluteError: { type: "number", minimum: 0, maximum: 255 }, rootMeanSquaredError: { type: "number", minimum: 0, maximum: 255 },
          sumAbsoluteDifferenceNormalized: { type: "number", minimum: 0 }, maximumAbsoluteError: { type: "integer", minimum: 0, maximum: 255 },
          exactPixelRate: { type: "number", minimum: 0, maximum: 1 }, foregroundIouAt128: { type: "number", minimum: 0, maximum: 1 },
          boundaryPixelCount: { type: "integer", minimum: 0, maximum: 19200 },
          boundaryMeanAbsoluteError: { oneOf: [{ type: "number", minimum: 0, maximum: 255 }, { type: "null" }] },
        },
      },
      createdAt: STRING, evidenceBoundary: ZERO_BOUNDARY, contentHash: SHA,
    },
  },
});

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}
export function stableStringifyContinuousAlpha(value) { return JSON.stringify(stableValue(value)); }
function canonicalBytes(value) { return Buffer.from(`${stableStringifyContinuousAlpha(value)}\n`, "utf8"); }
function hashRecord(record) { const payload = { ...record }; delete payload.contentHash; return sha256(canonicalBytes(payload)); }
function withHash(record) { const value = { ...record, contentHash: "" }; value.contentHash = hashRecord(value); return value; }
function round(value) { return Number(value.toFixed(9)); }
function clampByte(value) { return Math.max(0, Math.min(255, Math.round(value))); }

function compositeScene(alphaPlane, foregroundPixel) {
  const source = new Uint8Array(WIDTH * HEIGHT * 4);
  const alphaRgba = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let index = 0; index < alphaPlane.length; index += 1) {
    const alpha = alphaPlane[index]; const x = index % WIDTH; const y = Math.floor(index / WIDTH);
    const foreground = foregroundPixel(x, y, alpha);
    for (let channel = 0; channel < 3; channel += 1) {
      source[index * 4 + channel] = clampByte((foreground[channel] * alpha + BACKGROUND[channel] * (255 - alpha)) / 255);
      alphaRgba[index * 4 + channel] = alpha;
    }
    source[index * 4 + 3] = 255; alphaRgba[index * 4 + 3] = 255;
  }
  return { source, alphaRgba };
}

function generatedNewFixtures() {
  const fixtures = [];
  const create = (id, category, alphaAt, foregroundAt) => {
    const plane = new Uint8Array(WIDTH * HEIGHT);
    for (let y = 0; y < HEIGHT; y += 1) for (let x = 0; x < WIDTH; x += 1) plane[y * WIDTH + x] = clampByte(alphaAt(x, y));
    fixtures.push({ id, category, lineage: "continuous-alpha-v0-project-original-procedural", ...compositeScene(plane, foregroundAt) });
  };
  create("matte-diagonal-feather-001", "diagonal-feather",
    (x, y) => 255 * Math.max(0, Math.min(1, (x - (0.72 * y + 30) + 7) / 14)),
    (x, y) => [220 - (y % 37), 54 + (x % 41), 96 + ((x + y) % 53)]);
  create("matte-thin-structure-001", "thin-structure",
    (x, y) => {
      let distance = Infinity;
      for (const phase of [0, 2.1, 4.2]) distance = Math.min(distance, Math.abs(y - (25 + phase * 12 + 9 * Math.sin(x / 15 + phase))));
      return 255 * Math.max(0, Math.min(1, (2.75 - distance) / 2.25));
    },
    (x, y) => [245, 72 + (x % 45), 38 + (y % 60)]);
  create("matte-semitransparent-001", "semi-transparent",
    (x, y) => {
      const dx = (x - WIDTH / 2) / 52; const dy = (y - HEIGHT / 2) / 39; const radius = Math.sqrt(dx * dx + dy * dy);
      if (radius >= 1) return 0;
      return 48 + 132 * Math.max(0, Math.min(1, (1 - radius) / 0.75));
    },
    (x, y) => [74 + (x % 70), 42 + (y % 90), 230]);
  return fixtures;
}

function allFixturePixels() {
  const legacy = buildResearchFixturePixels().map((item, index) => ({
    id: item.fixture.id,
    category: ["binary-hard", "topology-hole", "radial-soft"][index],
    lineage: `MATTE-GT/${item.fixture.id}`,
    source: item.rendered.compositeSaturated,
    alphaRgba: item.rendered.alpha,
  }));
  return [...legacy, ...generatedNewFixtures()];
}

export function scoreContinuousAlphaPlane(predicted, expected) {
  if (!(predicted instanceof Uint8Array) || !(expected instanceof Uint8Array) || predicted.length !== expected.length || predicted.length === 0) {
    throw new TypeError("alpha planes must be equal non-empty Uint8Array values");
  }
  let absolute = 0; let squared = 0; let maximum = 0; let exact = 0; let intersection = 0; let union = 0;
  let boundaryCount = 0; let boundaryAbsolute = 0;
  for (let index = 0; index < predicted.length; index += 1) {
    const difference = Math.abs(predicted[index] - expected[index]);
    absolute += difference; squared += difference * difference; maximum = Math.max(maximum, difference);
    if (difference === 0) exact += 1;
    const predictedForeground = predicted[index] >= 128; const expectedForeground = expected[index] >= 128;
    if (predictedForeground && expectedForeground) intersection += 1;
    if (predictedForeground || expectedForeground) union += 1;
    if (expected[index] > 0 && expected[index] < 255) { boundaryCount += 1; boundaryAbsolute += difference; }
  }
  return {
    meanAbsoluteError: round(absolute / predicted.length), rootMeanSquaredError: round(Math.sqrt(squared / predicted.length)),
    sumAbsoluteDifferenceNormalized: round(absolute / 255), maximumAbsoluteError: maximum,
    exactPixelRate: round(exact / predicted.length), foregroundIouAt128: round(union === 0 ? 1 : intersection / union),
    boundaryPixelCount: boundaryCount, boundaryMeanAbsoluteError: boundaryCount ? round(boundaryAbsolute / boundaryCount) : null,
  };
}

function fileRef(relativePath, bytes) { return { path: relativePath, byteLength: bytes.length, fileSha256: sha256(bytes) }; }
function recordRef(id, relativePath, record, bytes) { return { id, contentHash: record.contentHash, path: relativePath, fileSha256: sha256(bytes) }; }
function treeDigest(fileMap) {
  const hash = createHash("sha256");
  for (const relativePath of [...fileMap.keys()].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))) {
    const bytes = fileMap.get(relativePath); hash.update(relativePath); hash.update("\0"); hash.update(String(bytes.length)); hash.update("\0"); hash.update(sha256(bytes)); hash.update("\0");
  }
  return hash.digest("hex");
}

export async function buildContinuousAlphaDefinitionBundle() {
  const candidateRegistryBytes = await readFile(CANDIDATE_REGISTRY_PATH);
  const baselineReportBytes = await readFile(BASELINE_REPORT_PATH);
  const candidateRegistry = JSON.parse(candidateRegistryBytes);
  const fileMap = new Map();
  for (const [relativePath, schema] of Object.entries(SCHEMAS)) fileMap.set(relativePath, canonicalBytes(schema));
  const manifestFixtures = [];
  for (const fixture of allFixturePixels()) {
    const inputBytes = encodeReferenceSrgbPng(WIDTH, HEIGHT, fixture.source);
    const alphaBytes = encodeReferenceSrgbPng(WIDTH, HEIGHT, fixture.alphaRgba);
    const inputPath = `fixtures/${fixture.id}/input.png`; const alphaPath = `fixtures/${fixture.id}/alpha.png`;
    fileMap.set(inputPath, inputBytes); fileMap.set(alphaPath, alphaBytes);
    manifestFixtures.push({
      sourceId: `source.continuous-alpha.${fixture.id}`, category: fixture.category,
      sourceFamilyId: `source-family.continuous-alpha.${fixture.id}`, captureSessionId: `capture-session.continuous-alpha.${fixture.id}`,
      width: WIDTH, height: HEIGHT, input: fileRef(inputPath, inputBytes), groundTruthAlpha: fileRef(alphaPath, alphaBytes), lineage: fixture.lineage,
    });
  }
  const manifest = withHash({
    schemaVersion: "continuous-alpha-manifest.v0", manifestId: "MANIFEST-CONTINUOUS-ALPHA-SYNTHETIC@0.1.0",
    createdAt: CONTINUOUS_ALPHA_CREATED_AT, visibility: "public-synthetic",
    rights: "project-original-procedural-no-real-person-no-third-party-image", sourceCount: 6, assetCount: 12,
    fixtures: manifestFixtures, evidenceBoundary: { ...EVIDENCE_BOUNDARY },
  });
  const manifestBytes = canonicalBytes(manifest); fileMap.set("manifest.json", manifestBytes);
  const contract = withHash({
    schemaVersion: "continuous-alpha-contract.v0", contractId: "CC-CAP04-CONTINUOUS-ALPHA-EVAL@0.1.0", createdAt: CONTINUOUS_ALPHA_CREATED_AT,
    inputProfile: "opaque RGBA8 strict-sRGB filter-0 PNG, 160x120, candidate receives pixels only; no fixture label or ground truth",
    outputProfile: "one row-major 8-bit alpha plane of exactly 19,200 bytes plus strict ContinuousAlphaOutput.v0 record",
    metrics: ["meanAbsoluteError", "rootMeanSquaredError", "sumAbsoluteDifferenceNormalized", "maximumAbsoluteError", "exactPixelRate", "foregroundIouAt128+boundaryMeanAbsoluteError"],
    candidateRegistryRef: { path: "../matting-candidates/continuous-alpha-candidates.v0.json", fileSha256: sha256(candidateRegistryBytes) },
    baselineRef: { path: "../results/sourcecard-matting-baseline-v0/report.json", fileSha256: sha256(baselineReportBytes) },
    decisionBoundary: "definition and open synthetic characterization only; no pass threshold, Gate B, C1, natural-image, product, or release decision",
    evidenceBoundary: { ...EVIDENCE_BOUNDARY },
  });
  const contractBytes = canonicalBytes(contract); fileMap.set("contract.json", contractBytes);
  const plan = withHash({
    schemaVersion: "continuous-alpha-plan.v0", planId: "PLAN-CONTINUOUS-ALPHA-SYNTHETIC@0.1.0", createdAt: CONTINUOUS_ALPHA_CREATED_AT,
    contractRef: recordRef(contract.contractId, "contract.json", contract, contractBytes),
    manifestRef: recordRef(manifest.manifestId, "manifest.json", manifest, manifestBytes),
    registeredCandidateIds: candidateRegistry.candidates.map((entry) => entry.registryId),
    denominator: { sourceUnit: "independent-project-original-synthetic-source", sourcesPerCandidate: 6, repetitionsPerSource: 3, plannedAttemptsPerCandidate: 18, plannedTotalAttempts: 36 },
    repeatRule: "three cold starts; all raw results retained; no majority vote and no valid-result rerun",
    stoppingRule: "any drift, missing source/repetition, invalid output, resource failure, or runtime uncertainty closes that candidate run non-pass or inconclusive without replacement",
    thresholdState: "not-frozen-no-capability-pass-decision", naturalImageExtension: "not-created-separate-governance-required", resultState: "not-created",
    evidenceBoundary: { ...EVIDENCE_BOUNDARY },
  });
  const planBytes = canonicalBytes(plan); fileMap.set("plan.json", planBytes);
  const readme = Buffer.from(`# Continuous-alpha public-synthetic evaluation v0\n\nState: definition-frozen / results-zero / non-C1 / non-product.\n\nThis tree freezes six project-original sources, exact inputs and alpha ground truth, a candidate-neutral output record, eight metrics, three cold repeats per source, and no valid-result rerun. MODNet and RVM artifacts remain not downloaded. Natural-image research material is not created and requires separate governance.\n`, "utf8");
  fileMap.set("README.md", readme);
  for (const [relativePath, schema] of Object.entries(SCHEMAS)) {
    const instance = relativePath.includes("contract") ? contract : relativePath.includes("manifest") ? manifest : relativePath.includes("plan") ? plan : null;
    if (instance) {
      const issues = validateJsonSchemaInstance(instance, schema);
      if (issues.length) throw new TypeError(`${relativePath} instance mismatch: ${JSON.stringify(issues)}`);
    }
  }
  return Object.freeze({ fileMap, contract, manifest, plan, treeSha256: treeDigest(fileMap) });
}

export async function materializeContinuousAlphaDefinition({ outputRoot = CONTINUOUS_ALPHA_ROOT } = {}) {
  const bundle = await buildContinuousAlphaDefinitionBundle();
  for (const [relativePath, bytes] of bundle.fileMap) {
    const target = path.join(outputRoot, ...relativePath.split("/")); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes, { flag: "wx" });
  }
  return bundle;
}

async function readTree(root) {
  const map = new Map();
  async function walk(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name; const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) throw new TypeError(`unsupported tree entry: ${relative}`);
      if (entry.isDirectory()) await walk(absolute, relative); else map.set(relative, await readFile(absolute));
    }
  }
  await walk(root); return map;
}

export async function validateContinuousAlphaDefinition({ outputRoot = CONTINUOUS_ALPHA_ROOT } = {}) {
  const expected = await buildContinuousAlphaDefinitionBundle(); const actual = await readTree(outputRoot);
  if (actual.size !== expected.fileMap.size) throw new TypeError("continuous-alpha definition file count mismatch");
  for (const [relative, bytes] of expected.fileMap) if (!actual.has(relative) || !actual.get(relative).equals(bytes)) throw new TypeError(`continuous-alpha definition drift: ${relative}`);
  for (const forbidden of ["results", "holdout", "formal", "escape", "weights", "models", "artifacts"]) {
    try { await stat(path.join(outputRoot, forbidden)); throw new TypeError(`forbidden definition path exists: ${forbidden}`); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return Object.freeze({ valid: true, fileCount: actual.size, sourceCount: expected.manifest.sourceCount, plannedAttempts: expected.plan.denominator.plannedTotalAttempts, resultState: expected.plan.resultState, treeSha256: treeDigest(actual) });
}

export async function verifyTwoTempContinuousAlphaTrees() {
  const left = path.join(tmpdir(), `continuous-alpha-left-${process.pid}-${Date.now()}`);
  const right = path.join(tmpdir(), `continuous-alpha-right-${process.pid}-${Date.now()}`);
  const a = await materializeContinuousAlphaDefinition({ outputRoot: left }); const b = await materializeContinuousAlphaDefinition({ outputRoot: right });
  return Object.freeze({ identical: a.treeSha256 === b.treeSha256, treeSha256: a.treeSha256, fileCount: a.fileMap.size });
}

async function main() {
  if (process.argv[2] === "--write") {
    const bundle = await materializeContinuousAlphaDefinition();
    process.stdout.write(`${JSON.stringify({ written: true, fileCount: bundle.fileMap.size, sourceCount: bundle.manifest.sourceCount, plannedAttempts: bundle.plan.denominator.plannedTotalAttempts, resultState: bundle.plan.resultState, treeSha256: bundle.treeSha256 }, null, 2)}\n`);
  }
  else if (process.argv[2] === "--validate") process.stdout.write(`${JSON.stringify(await validateContinuousAlphaDefinition(), null, 2)}\n`);
  else if (process.argv[2] === "--verify-two-temp") process.stdout.write(`${JSON.stringify(await verifyTwoTempContinuousAlphaTrees(), null, 2)}\n`);
  else { process.stderr.write("Usage: node scripts/research-generate-continuous-alpha-eval.mjs --write|--validate|--verify-two-temp\n"); process.exitCode = 2; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
