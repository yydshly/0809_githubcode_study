import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FIXTURE_DEFINITION, buildResearchFixturePixels, encodeRgbaPng,
} from "./research-generate-fixtures.mjs";
import {
  buildSourceCardV0, encodeReferenceSrgbPng, normalizeFixturePng,
  runColorDistanceMatteBaseline, sha256,
} from "./research-reference-adapters.mjs";
import { validateJsonSchemaInstance } from "./research-validate-slice02.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const RESEARCH_ROOT = path.join(PROJECT_ROOT, "research");
export const SOURCECARD_MATTING_OUTPUT_ROOT = path.join(RESEARCH_ROOT, "results", "sourcecard-matting-baseline-v0");
export const SOURCECARD_MATTING_CREATED_AT = "2026-08-16T00:00:00.000Z";
const MANIFEST_PATH = path.join(RESEARCH_ROOT, "manifests", "fixture-manifest.matte-gt.dev-calibration.v0.json");
const SLICE02_SCHEMA_ROOT = path.join(RESEARCH_ROOT, "slice-02", "schemas");
const BACKGROUND_RGB = Object.freeze([0, 216, 255]);
const THRESHOLDS = Object.freeze({ lowThreshold: 10, highThreshold: 88 });
const EVIDENCE_BOUNDARY = Object.freeze({
  c1: 0, u1: 0, e1: 0, r1Pipeline: 0, r1ProductValidation: 0, r1ProductRelease: 0,
  o1: 0, g1: 0, v1: 0, productSupport: false,
});

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}
export function stableStringifySourceCardMatting(value) { return JSON.stringify(stableValue(value)); }
function canonicalBytes(value) { return Buffer.from(`${stableStringifySourceCardMatting(value)}\n`, "utf8"); }
function hashRecord(record) {
  const payload = { ...record }; delete payload.contentHash;
  return createHash("sha256").update(canonicalBytes(payload)).digest("hex");
}
function withHash(record) { const value = { ...record, contentHash: "" }; value.contentHash = hashRecord(value); return value; }
function round(value) { return Number(value.toFixed(9)); }

function imageAsset(bytes, fixtureId) {
  return {
    schemaVersion: "image-asset.v0", imageAssetId: `image-asset.baseline.${fixtureId}`,
    mime: "image/png", byteLength: bytes.length, fileSha256: sha256(bytes), orientation: 1,
    colorProfile: "srgb", premultiply: "straight", sourceClass: "project-original-synthetic",
    createdAt: SOURCECARD_MATTING_CREATED_AT,
  };
}
function subjectMap(normalizedImageId, fixtureId) {
  return {
    schemaVersion: "subject-map.v0", subjectMapId: `subject-map.baseline.${fixtureId}`,
    parentNormalizedImageId: normalizedImageId, subjectCount: 1,
    backgroundSample: { uniform: true, rgb: [...BACKGROUND_RGB] },
    sourceClass: "project-original-synthetic", containsRealPerson: false, sourceAlpha: "opaque",
  };
}
function alphaPlaneFromRgba(rgba) {
  const plane = new Uint8Array(rgba.length / 4);
  for (let offset = 0; offset < rgba.length; offset += 4) plane[offset / 4] = rgba[offset];
  return plane;
}
function metrics(predicted, expected) {
  if (predicted.length !== expected.length || predicted.length === 0) throw new TypeError("alpha planes must have equal nonzero lengths");
  let absolute = 0; let squared = 0; let maximum = 0; let exact = 0;
  let intersection = 0; let union = 0;
  for (let index = 0; index < predicted.length; index += 1) {
    const difference = Math.abs(predicted[index] - expected[index]);
    absolute += difference; squared += difference * difference; maximum = Math.max(maximum, difference);
    if (difference === 0) exact += 1;
    const predictedForeground = predicted[index] >= 128; const expectedForeground = expected[index] >= 128;
    if (predictedForeground && expectedForeground) intersection += 1;
    if (predictedForeground || expectedForeground) union += 1;
  }
  return {
    pixelCount: predicted.length,
    meanAbsoluteError: round(absolute / predicted.length),
    rootMeanSquaredError: round(Math.sqrt(squared / predicted.length)),
    sumAbsoluteDifferenceNormalized: round(absolute / 255),
    maximumAbsoluteError: maximum,
    exactPixelRate: round(exact / predicted.length),
    foregroundIouAt128: round(union === 0 ? 1 : intersection / union),
  };
}
async function readSchema(name) { return JSON.parse(await readFile(path.join(SLICE02_SCHEMA_ROOT, name), "utf8")); }
function assertSchema(value, schema, label) {
  const issues = validateJsonSchemaInstance(value, schema);
  if (issues.length) throw new TypeError(`${label} schema mismatch: ${JSON.stringify(issues)}`);
}

export async function buildSourceCardMattingBaselineBundle() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const schemas = {
    imageAsset: await readSchema("image-asset.v0.schema.json"),
    normalized: await readSchema("normalized-image.v0.schema.json"),
    sourceCard: await readSchema("source-card.v0.schema.json"),
    subjectMap: await readSchema("subject-map.v0.schema.json"),
    alphaMatte: await readSchema("alpha-matte.v0.schema.json"),
  };
  const generated = buildResearchFixturePixels();
  if (generated.length !== 3 || manifest.fixtures.length !== 3) throw new TypeError("baseline requires the exact three MATTE-GT dev/calibration fixtures");
  const fileMap = new Map(); const cases = [];
  for (const item of generated) {
    const fixture = manifest.fixtures.find((entry) => entry.id === item.fixture.id);
    if (!fixture || fixture.visibility !== "public-synthetic" || fixture.rightsRecordId !== "rights.local-synthetic.v0") {
      throw new TypeError(`fixture lineage invalid: ${item.fixture.id}`);
    }
    const legacyComposite = encodeRgbaPng(item.width, item.height, item.rendered.compositeSaturated);
    const legacyAlpha = encodeRgbaPng(item.width, item.height, item.rendered.alpha);
    if (sha256(legacyComposite) !== fixture.assets.compositeSaturated.sha256 || sha256(legacyAlpha) !== fixture.assets.alpha.sha256) {
      throw new TypeError(`procedural rebuild differs from frozen fixture lineage: ${fixture.id}`);
    }
    for (let offset = 0; offset < item.rendered.compositeSaturated.length; offset += 4) {
      if (item.rendered.compositeSaturated[offset + 3] !== 255) throw new TypeError(`source must be opaque: ${fixture.id}`);
      if (item.rendered.alpha[offset] === 0 && (
        item.rendered.compositeSaturated[offset] !== BACKGROUND_RGB[0]
        || item.rendered.compositeSaturated[offset + 1] !== BACKGROUND_RGB[1]
        || item.rendered.compositeSaturated[offset + 2] !== BACKGROUND_RGB[2])) {
        throw new TypeError(`transparent ground-truth region is not the frozen uniform background: ${fixture.id}`);
      }
    }
    const strictInputBytes = encodeReferenceSrgbPng(item.width, item.height, item.rendered.compositeSaturated);
    const asset = imageAsset(strictInputBytes, fixture.id);
    const normalized = normalizeFixturePng({
      bytes: strictInputBytes, imageAsset: asset,
      normalizedImageId: `normalized.baseline.${fixture.id}`, createdAt: SOURCECARD_MATTING_CREATED_AT,
    });
    const card = buildSourceCardV0({
      normalizedArtifact: normalized.artifact, normalizedBytes: normalized.bytes,
      sourceCardId: `source-card.baseline.${fixture.id}`, createdAt: SOURCECARD_MATTING_CREATED_AT,
    });
    const map = subjectMap(normalized.artifact.normalizedImageId, fixture.id);
    const matte = runColorDistanceMatteBaseline({
      normalizedBytes: normalized.bytes, normalizedArtifact: normalized.artifact, subjectMap: map,
      alphaMatteId: `alpha-matte.baseline.${fixture.id}`, createdAt: SOURCECARD_MATTING_CREATED_AT,
      ...THRESHOLDS,
    });
    assertSchema(asset, schemas.imageAsset, `${fixture.id} ImageAsset`);
    assertSchema(normalized.artifact, schemas.normalized, `${fixture.id} NormalizedImage`);
    assertSchema(card, schemas.sourceCard, `${fixture.id} SourceCard`);
    assertSchema(map, schemas.subjectMap, `${fixture.id} SubjectMap`);
    assertSchema(matte.artifact, schemas.alphaMatte, `${fixture.id} AlphaMatte`);
    const predictedRelativePath = `predicted/${fixture.id}.png`;
    fileMap.set(predictedRelativePath, Buffer.from(matte.bytes));
    cases.push({
      fixtureId: fixture.id, category: fixture.category, edgeType: fixture.edgeType,
      sourceFamilyId: fixture.sourceFamilyId, captureSessionId: fixture.captureSessionId,
      lineage: {
        manifestId: manifest.fixtureManifestId, manifestHash: manifest.manifestHash,
        compositeSaturated: { path: fixture.assets.compositeSaturated.path, fileSha256: fixture.assets.compositeSaturated.sha256 },
        groundTruthAlpha: { path: fixture.assets.alpha.path, fileSha256: fixture.assets.alpha.sha256 },
        strictInputFileSha256: asset.fileSha256,
      },
      sourceCard: card, subjectMap: map, alphaMatte: matte.artifact,
      predicted: { path: `results/sourcecard-matting-baseline-v0/${predictedRelativePath}`, byteLength: matte.bytes.length, fileSha256: sha256(matte.bytes) },
      metrics: metrics(alphaPlaneFromRgba(matte.alphaRgba), alphaPlaneFromRgba(item.rendered.alpha)),
    });
  }
  const report = withHash({
    schemaVersion: "sourcecard-matting-baseline-report.v0",
    reportId: "sourcecard-matting-baseline.matte-gt.dev-calibration.v0",
    createdAt: SOURCECARD_MATTING_CREATED_AT,
    suiteId: FIXTURE_DEFINITION.suite, partition: FIXTURE_DEFINITION.partition,
    sourceCardContractRef: "CC-CAP03-SOURCE-CARD-V0@0.2.0",
    matteContractRef: "CC-CAP04-MATTE-SIMPLE@0.2.0",
    baselineId: "REG-BASELINE-MATTE-SIMPLE",
    thresholds: { ...THRESHOLDS },
    backgroundSample: { derivation: "fixed composite-saturated generator background verified on every ground-truth-zero pixel", rgb: [...BACKGROUND_RGB] },
    cases,
    summary: {
      caseCount: cases.length,
      meanAbsoluteError: round(cases.reduce((sum, entry) => sum + entry.metrics.meanAbsoluteError, 0) / cases.length),
      meanForegroundIouAt128: round(cases.reduce((sum, entry) => sum + entry.metrics.foregroundIouAt128, 0) / cases.length),
      interpretation: "comparison-lower-bound-only-no-pass-threshold-no-capability-claim",
    },
    evidenceBoundary: { ...EVIDENCE_BOUNDARY },
    limitations: [
      "project-original synthetic dev/calibration only",
      "SourceCard semantic observations remain explicit unknown",
      "SubjectMap background sample is fixture-known and not inferred for user images",
      "No independent holdout, real-user photo, model, weight, product fallback, or release evidence",
    ],
  });
  fileMap.set("report.json", canonicalBytes(report));
  return Object.freeze({ report: Object.freeze(report), fileMap });
}

export async function materializeSourceCardMattingBaseline({ outputRoot = SOURCECARD_MATTING_OUTPUT_ROOT } = {}) {
  const bundle = await buildSourceCardMattingBaselineBundle();
  for (const [relativePath, bytes] of bundle.fileMap) {
    const target = path.join(outputRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
  return bundle;
}

export async function validateSourceCardMattingBaseline({ outputRoot = SOURCECARD_MATTING_OUTPUT_ROOT } = {}) {
  const expected = await buildSourceCardMattingBaselineBundle();
  const actual = new Map();
  async function walk(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink() || !entry.isFile() && !entry.isDirectory()) throw new TypeError(`unsupported result entry: ${relative}`);
      if (entry.isDirectory()) await walk(path.join(directory, entry.name), relative);
      else actual.set(relative, await readFile(path.join(directory, entry.name)));
    }
  }
  await walk(outputRoot);
  if (actual.size !== expected.fileMap.size) throw new TypeError("result file count differs from deterministic rebuild");
  for (const [relative, bytes] of expected.fileMap) {
    if (!actual.has(relative) || !actual.get(relative).equals(bytes)) throw new TypeError(`result bytes differ: ${relative}`);
  }
  return Object.freeze({ valid: true, reportId: expected.report.reportId, caseCount: expected.report.cases.length, fileCount: actual.size, contentHash: expected.report.contentHash });
}

async function main() {
  if (process.argv[2] === "--write") {
    const result = await materializeSourceCardMattingBaseline();
    process.stdout.write(`${JSON.stringify({ written: true, reportId: result.report.reportId, contentHash: result.report.contentHash, files: result.fileMap.size }, null, 2)}\n`);
  } else if (process.argv[2] === "--validate") {
    process.stdout.write(`${JSON.stringify(await validateSourceCardMattingBaseline(), null, 2)}\n`);
  } else {
    process.stderr.write("Usage: node scripts/research-run-sourcecard-matting-baseline.mjs --write|--validate\n");
    process.exitCode = 2;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) await main();
