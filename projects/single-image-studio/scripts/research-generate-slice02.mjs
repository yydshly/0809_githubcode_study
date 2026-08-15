import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashRecordWithout, stableStringify } from "./research-generate-fixtures.mjs";
import {
  averageHashRgba,
  encodeReferenceSrgbPng,
  exportFixturePng,
  normalizeFixturePng,
  runColorDistanceMatteBaseline,
  sha256,
} from "./research-reference-adapters.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SLICE02_ROOT = path.resolve(SCRIPT_DIR, "../research/slice-02");
const ADAPTER_PATH = path.resolve(SCRIPT_DIR, "research-reference-adapters.mjs");
const CREATED_AT = "2026-08-14T18:41:55.000Z";
const VERSION = "0.2.0";
const SOURCE_REVISION = "local-procedural-slice-02-v0.2.0-seed-20260815";
const RIGHTS_RECORD_ID = "rights.project-original-synthetic.slice-02.v1";
const EVIDENCE_STATUS = Object.freeze({
  level: "C1=0",
  purpose: "contract-and-isolation-rehearsal",
});
const PARTITIONS = Object.freeze([
  "dev/calibration",
  "holdout",
  "defect/calibration",
  "defect/holdout",
  "escape",
]);
const PARTITION_SLUG = Object.freeze({
  "dev/calibration": "dev-calibration",
  holdout: "holdout",
  "defect/calibration": "defect-calibration",
  "defect/holdout": "defect-holdout",
  escape: "escape",
});
const SEALED_STATE = Object.freeze({
  "dev/calibration": "open-calibration",
  holdout: "sealed-structural-only",
  "defect/calibration": "open-calibration",
  "defect/holdout": "sealed-structural-only",
  escape: "open-regression",
});
const SUITES = Object.freeze(["NORMALIZE-DELIVER", "MATTE-GT"]);
const WIDTH = 96;
const HEIGHT = 72;

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function makeRgba(fill = [0, 0, 0, 255]) {
  const rgba = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let offset = 0; offset < rgba.length; offset += 4) rgba.set(fill, offset);
  return rgba;
}

function hasPartialAlpha(rgba) {
  return rgba.some((value, index) => index % 4 === 3 && value < 255);
}

function imageAssetFor(bytes, imageAssetId) {
  return {
    schemaVersion: "image-asset.v0",
    imageAssetId,
    mime: "image/png",
    byteLength: bytes.length,
    fileSha256: sha256(bytes),
    orientation: 1,
    colorProfile: "srgb",
    premultiply: "straight",
    sourceClass: "project-original-synthetic",
    createdAt: CREATED_AT,
  };
}

function pixelBufferFor(rgba, width, height, pixelBufferId, parentArtifactId) {
  return {
    schemaVersion: "rgba8-pixel-buffer.v0",
    pixelBufferId,
    parentArtifactId,
    width,
    height,
    mime: "image/png",
    colorProfile: "srgb",
    alphaPresent: hasPartialAlpha(rgba),
    premultiply: "straight",
    pixelSha256: sha256(Buffer.from(rgba)),
    sourceClass: "project-original-synthetic",
  };
}

function partitionIndex(partition) {
  return PARTITIONS.indexOf(partition);
}

function renderNormalizeCase(partition) {
  const index = partitionIndex(partition);
  const source = makeRgba();
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4;
      const checker = ((Math.floor(x / (7 + index)) + Math.floor(y / (6 + index))) & 1) * 34;
      source.set([
        24 + index * 25 + checker,
        62 + ((x * (3 + index) + y) % 120),
        118 + ((x + y * (4 + index)) % 100),
        x < 12 + index * 2 ? 96 + index * 20 : 255,
      ], offset);
    }
  }
  const sourceBytes = encodeReferenceSrgbPng(WIDTH, HEIGHT, source);
  const normalized = normalizeFixturePng({
    bytes: sourceBytes,
    imageAsset: imageAssetFor(sourceBytes, `image-asset.normalize-${PARTITION_SLUG[partition]}`),
    normalizedImageId: `normalized-image.normalize-${PARTITION_SLUG[partition]}`,
    createdAt: CREATED_AT,
  });
  const candidate = new Uint8Array(source);
  let defectLabel = "none";
  let expectedDisposition = "accept";
  if (partition === "defect/calibration") {
    defectLabel = "alpha-flattened";
    expectedDisposition = "reject-candidate-delivery";
    for (let offset = 3; offset < candidate.length; offset += 4) candidate[offset] = 255;
  } else if (partition === "defect/holdout") {
    defectLabel = "right-edge-pixels-erased";
    expectedDisposition = "reject-candidate-delivery";
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = WIDTH - 8; x < WIDTH; x += 1) {
        const offset = (y * WIDTH + x) * 4;
        candidate.set([0, 0, 0, 0], offset);
      }
    }
  } else if (partition === "escape") {
    defectLabel = "reconstructed-single-pixel-corruption-escape";
    expectedDisposition = "regression-only";
    candidate[0] = candidate[0] ^ 1;
  }
  const delivery = exportFixturePng({
    rgba: candidate,
    pixelBuffer: pixelBufferFor(
      candidate,
      WIDTH,
      HEIGHT,
      `pixel-buffer.normalize-${PARTITION_SLUG[partition]}`,
      normalized.artifact.normalizedImageId,
    ),
    deliveryArtifactId: `delivery-artifact.normalize-${PARTITION_SLUG[partition]}`,
    createdAt: CREATED_AT,
  });
  return {
    assets: {
      source: sourceBytes,
      expectedNormalized: normalized.bytes,
      candidateDelivery: delivery.bytes,
    },
    sourceRgba: source,
    caseKind: partition.startsWith("defect/") ? "injected-export-defect" : "normalization-export-contract",
    defectLabel,
    expectedDisposition,
    difficultCategories: ["rgba8", "alpha-policy", `partition-${PARTITION_SLUG[partition]}`],
  };
}

function groundTruthAlphaFor(partition, x, y) {
  const index = partitionIndex(partition);
  const cx = 43 + index * 2;
  const cy = 35 - index;
  const dx = (x - cx) / (26 + index);
  const dy = (y - cy) / (22 - Math.min(index, 3));
  const radius = Math.sqrt(dx * dx + dy * dy);
  const feather = 0.14 + index * 0.01;
  let alpha = clampByte(((1 + feather / 2 - radius) / feather) * 255);
  if ((partition === "holdout" || partition === "defect/holdout") && radius < 0.28) alpha = 0;
  return alpha;
}

function renderMatteCase(partition) {
  const index = partitionIndex(partition);
  const backgroundColor = [20 + index * 26, 58 + index * 18, 118 - index * 12];
  const foregroundColor = [226 - index * 10, 72 + index * 20, 34 + index * 27];
  const source = makeRgba([...backgroundColor, 255]);
  const alpha = makeRgba([0, 0, 0, 255]);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4;
      const matte = groundTruthAlphaFor(partition, x, y);
      const amount = matte / 255;
      alpha.set([matte, matte, matte, 255], offset);
      source.set([
        clampByte(foregroundColor[0] * amount + backgroundColor[0] * (1 - amount)),
        clampByte(foregroundColor[1] * amount + backgroundColor[1] * (1 - amount)),
        clampByte(foregroundColor[2] * amount + backgroundColor[2] * (1 - amount)),
        255,
      ], offset);
    }
  }
  const encodedSource = encodeReferenceSrgbPng(WIDTH, HEIGHT, source);
  const normalized = normalizeFixturePng({
    bytes: encodedSource,
    imageAsset: imageAssetFor(encodedSource, `image-asset.matte-${PARTITION_SLUG[partition]}`),
    normalizedImageId: `normalized-image.matte-${PARTITION_SLUG[partition]}`,
    createdAt: CREATED_AT,
  });
  const subjectMap = {
    schemaVersion: "subject-map.v0",
    subjectMapId: `subject-map.matte-${PARTITION_SLUG[partition]}`,
    parentNormalizedImageId: normalized.artifact.normalizedImageId,
    subjectCount: 1,
    backgroundSample: { uniform: true, rgb: backgroundColor },
    sourceClass: "project-original-synthetic",
    containsRealPerson: false,
    sourceAlpha: "opaque",
  };
  const baseline = runColorDistanceMatteBaseline({
    normalizedBytes: normalized.bytes,
    normalizedArtifact: normalized.artifact,
    subjectMap,
    alphaMatteId: `alpha-matte.baseline-${PARTITION_SLUG[partition]}`,
    createdAt: CREATED_AT,
    lowThreshold: 10,
    highThreshold: 88,
  });
  const candidate = new Uint8Array(baseline.alphaRgba);
  let defectLabel = "baseline-unmodified";
  let expectedDisposition = "measure-baseline-not-pass";
  if (partition === "defect/calibration") {
    defectLabel = "injected-subject-hole";
    expectedDisposition = "reject-candidate-alpha";
    for (let y = 27; y < 42; y += 1) {
      for (let x = 35; x < 54; x += 1) candidate.set([0, 0, 0, 255], (y * WIDTH + x) * 4);
    }
  } else if (partition === "defect/holdout") {
    defectLabel = "injected-opaque-halo";
    expectedDisposition = "reject-candidate-alpha";
    for (let y = 8; y < HEIGHT - 8; y += 1) {
      for (let x = 8; x < WIDTH - 8; x += 1) {
        if (x < 13 || x >= WIDTH - 13 || y < 13 || y >= HEIGHT - 13) {
          candidate.set([168, 168, 168, 255], (y * WIDTH + x) * 4);
        }
      }
    }
  } else if (partition === "escape") {
    defectLabel = "human-reconstructed-wrong-subject-escape";
    expectedDisposition = "regression-only";
    candidate.fill(0);
    for (let offset = 3; offset < candidate.length; offset += 4) candidate[offset] = 255;
    for (let y = 12; y < 30; y += 1) {
      for (let x = 8; x < 25; x += 1) candidate.set([255, 255, 255, 255], (y * WIDTH + x) * 4);
    }
  }
  return {
    assets: {
      source: normalized.bytes,
      groundTruthAlpha: encodeReferenceSrgbPng(WIDTH, HEIGHT, alpha),
      candidateAlpha: encodeReferenceSrgbPng(WIDTH, HEIGHT, candidate),
    },
    sourceRgba: source,
    caseKind: partition.startsWith("defect/") ? "injected-matting-defect" : "matting-baseline-contract",
    defectLabel,
    expectedDisposition,
    difficultCategories: [
      partition.includes("holdout") ? "interior-hole" : "soft-edge",
      "controlled-uniform-background",
      `partition-${PARTITION_SLUG[partition]}`,
    ],
  };
}

async function writeJson(root, relative, value) {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, stableStringify(value), "utf8");
}

function contract({ id, domain, inputs, outputs, inputSchemas, outputSchemas, scope, eligibility, rejection, parameters, executor, preserve, mayChange, mustNotChange, checks, fallback }) {
  const value = {
    schemaVersion: "capability-contract.v0",
    capabilityContractId: id,
    capabilityDomain: domain,
    contractVersion: VERSION,
    frozenAt: CREATED_AT,
    status: "frozen-research",
    inputArtifactTypes: inputs,
    outputArtifactTypes: outputs,
    inputSchemaRefs: inputSchemas,
    outputSchemaRefs: outputSchemas,
    scope,
    eligibility,
    rejectionConditions: rejection,
    parameterFields: parameters,
    executor,
    semantics: {
      idempotencyScope: "canonical input bytes + contract version + canonical parameters",
      query: "synchronous local reference call; result returned once",
      cancel: "not-applicable: bounded <=1 MiB and <=256x256 synchronous fixture call; timeoutMs is a caller-side post-call acceptance budget, not preemptive cancellation",
      timeoutMs: 2000,
      retry: "no automatic retry",
      reconciliation: "not-applicable: no remote or persisted unknown terminal state",
    },
    changeContract: {
      mustPreserve: preserve,
      mayChange,
      mustNotChange,
    },
    qa: {
      profileId: `qa-profile.${id.toLowerCase()}.v0.2.0`,
      checks,
      fallback,
    },
    operations: {
      costClass: "local-research-zero-external-cost",
      latencyClass: "fixture-only-unbenchmarked",
      hardwareRequirements: ["Node.js >=22", "CPU", "maximum 1 MiB and 256x256 RGBA8 fixture"],
      observabilityProfile: "observability-not-qualified-for-O1",
      sliSloProfile: "not-established",
      runbookIds: ["not-applicable-reference-only"],
    },
    governance: {
      codeLicense: "project-repository-terms; external distribution not granted",
      weightLicense: "not-applicable-no-model-weights",
      dataTerms: "project-original synthetic fixtures only; no user or third-party images",
    },
    evidence: {
      status: "C1=0",
      evidenceManifestId: "not-established",
      claimBoundary: "Executable contract and fixture-isolation rehearsal only; no capability, effect, product, operational, governance, value, or release evidence.",
    },
    releaseStatus: "research-only-not-product-fallback",
    contractHash: "",
  };
  value.contractHash = hashRecordWithout(value, "contractHash");
  return value;
}

async function buildContracts(adapterHash) {
  const executor = (registryId, adapterId, algorithm) => ({
    registryId,
    adapterId,
    adapterVersion: VERSION,
    implementationRef: `sha256:${adapterHash}`,
    algorithm,
    model: "not-applicable",
    checkpoint: "not-applicable",
    executionLocation: "local-node-reference-process",
    processingRegion: "local-only",
    dataPolicyVersion: "data-policy.synthetic-fixtures-only.v0.2.0",
  });
  return [
    contract({
      id: "CC-CAP02-NORMALIZE", domain: "CAP-02",
      inputs: ["ImageAsset"], outputs: ["NormalizedImage"],
      inputSchemas: ["schemas/image-asset.v0.schema.json"], outputSchemas: ["schemas/normalized-image.v0.schema.json"],
      scope: "Fixture-only project-original RGBA8 PNG with exact IHDR/sRGB/IDAT/IEND profile, orientation 1, straight alpha, <=1 MiB bytes, and <=256x256 dimensions; all broader inputs remain rejected.",
      eligibility: ["ImageAsset.v0 descriptor matches supplied bytes", "input byte length <=1 MiB", "exact closed PNG chunk profile", "RGBA8", "orientation 1", "embedded and declared sRGB", "single frame", "project-original synthetic source"],
      rejection: ["JPEG/WebP/HEIC", "input above 1 MiB", "EXIF or any out-of-profile chunk", "ICC conversion required", "animation", "interlace", "non-filter-0", "dimensions above fixture limit", "descriptor/byte hash mismatch"],
      parameters: [],
      executor: executor("REG-NORM-REFERENCE-RGBA8", "normalizeFixturePng", "CRC-validated RGBA8 decode then canonical filter-0 PNG re-encode with embedded sRGB declaration"),
      preserve: ["decoded RGBA pixels", "width", "height", "alpha"], mayChange: ["PNG byte encoding", "chunk layout"],
      mustNotChange: ["orientation", "pixel geometry", "color values", "alpha semantics"],
      checks: ["input chunk CRC", "embedded sRGB declaration", "reopen output", "decoded dimensions equal", "decoded pixel hash equal"], fallback: "reject; never return original bytes as NormalizedImage",
    }),
    contract({
      id: "CC-CAP02-EXPORT", domain: "CAP-02",
      inputs: ["ForegroundLayer", "CompositeImage", "GeneratedCandidate"], outputs: ["DeliveryArtifact"],
      inputSchemas: ["schemas/rgba8-pixel-buffer.v0.schema.json"], outputSchemas: ["schemas/delivery-artifact.v0.schema.json"],
      scope: "Fixture-only PNG delivery with straight alpha, sRGB declaration, metadata stripping, hash, byte count, and mandatory reopen verification.",
      eligibility: ["RGBA8 pixel buffer", "positive dimensions <=256x256", "straight-alpha declaration"],
      rejection: ["premultiply state unknown", "byte length mismatch", "unsupported output MIME", "reopen verification failure"],
      parameters: [],
      executor: executor("REG-NORM-REFERENCE-RGBA8", "exportFixturePng", "canonical filter-0 RGBA8 PNG encoding with embedded sRGB declaration and reopen verification"),
      preserve: ["decoded RGBA pixels", "width", "height", "straight alpha"], mayChange: ["container bytes", "file hash"],
      mustNotChange: ["pixel geometry", "alpha presence", "color profile contract"],
      checks: ["MIME", "dimensions", "alpha presence", "embedded sRGB declaration", "reopened pixel SHA-256", "byte length", "file SHA-256"], fallback: "reject and do not create DeliveryArtifact or unlock download",
    }),
    contract({
      id: "CC-CAP03-SOURCE-CARD-V0", domain: "CAP-03",
      inputs: ["NormalizedImage"], outputs: ["SourceCard.v0"],
      inputSchemas: ["schemas/normalized-image.v0.schema.json"], outputSchemas: ["schemas/source-card.v0.schema.json"],
      scope: "Freeze SourceCard.v0 field shape and unknown policy. Technical PNG facts are observed by reopening normalized bytes and cross-checking the artifact; quality, subject, and content remain explicit unknown values.",
      eligibility: ["valid NormalizedImage.v0 artifact from the frozen normalization contract", "normalized bytes match every technical artifact field"],
      rejection: ["parent artifact missing", "normalized bytes missing", "artifact/byte mismatch", "technical field absent", "observer contract absent", "unknown without unknown reason"],
      parameters: [],
      executor: executor("REG-SOURCE-CARD-REFERENCE-V0", "buildSourceCardV0", "reopen normalized PNG bytes, cross-check artifact, then emit technical observations and fail-honest unknowns"),
      preserve: ["parent normalized artifact identity", "technical facts"], mayChange: ["new SourceCard instance ID"],
      mustNotChange: ["identity inference", "age inference", "sensitive attributes", "aesthetic judgment", "unknown converted to guessed values"],
      checks: ["reopened byte/artifact equality", "all v0 fields present", "observer contract per field", "confidence range per field", "unknown reason per unknown"], fallback: "emit unknown with reason for unimplemented observers; reject malformed or mismatched technical facts",
    }),
    contract({
      id: "CC-CAP04-MATTE-SIMPLE", domain: "CAP-04",
      inputs: ["NormalizedImage", "SubjectMap"], outputs: ["AlphaMatte"],
      inputSchemas: ["schemas/normalized-image.v0.schema.json", "schemas/subject-map.v0.schema.json"], outputSchemas: ["schemas/alpha-matte.v0.schema.json"],
      scope: "Comparison lower bound for controlled project-original synthetic scenes with one subject and a known uniform background RGB sample; never a product fallback.",
      eligibility: ["RGBA8 sRGB normalized fixture whose artifact matches bytes", "project-original synthetic provenance", "containsRealPerson=false", "fully opaque source", "strict SubjectMap with subjectCount=1", "known uniform background RGB sample in SubjectMap", "foreground/background color distance within registered synthetic design"],
      rejection: ["non-synthetic or unknown provenance", "real person declaration", "unknown or non-uniform background", "multiple subjects", "source alpha not fully opaque", "background sample absent", "artifact/byte mismatch"],
      parameters: [
        { name: "lowThreshold", type: "number", required: true, constraint: "required; 0..441 and below highThreshold; checked-in fixture profile uses 10" },
        { name: "highThreshold", type: "number", required: true, constraint: "required; >=1, above lowThreshold, and <=442; checked-in fixture profile uses 88" },
      ],
      executor: executor("REG-BASELINE-MATTE-SIMPLE", "runColorDistanceMatteBaseline", "Euclidean RGB distance from known background mapped linearly to 0..255 alpha"),
      preserve: ["input dimensions", "pixel alignment"], mayChange: ["alpha values only"],
      mustNotChange: ["source RGB", "geometry", "subject selection", "input artifact"],
      checks: ["alpha dimensions", "8-bit alpha range", "deterministic repeat hash", "record baseline failures without fallback"], fallback: "none; record baseline failure and continue comparative research with no user result",
    }),
  ];
}

export async function generateSlice02({ sliceRoot = DEFAULT_SLICE02_ROOT } = {}) {
  const adapterHash = sha256(await readFile(ADAPTER_PATH));
  const contracts = await buildContracts(adapterHash);
  for (const value of contracts) {
    const slug = value.capabilityContractId.toLowerCase().replaceAll("_", "-");
    await writeJson(sliceRoot, `contracts/${slug}.v0.2.0.json`, value);
  }

  const rightsRecord = {
    schemaVersion: "rights-record.v1",
    rightsRecordId: RIGHTS_RECORD_ID,
    recordVersion: VERSION,
    createdAt: CREATED_AT,
    assetClass: "project-original-synthetic",
    origin: { type: "project-original-procedural", generator: "scripts/research-generate-slice02.mjs", externalInputs: [] },
    permissions: {
      processingAllowed: true,
      researchUseAllowed: true,
      publicDisplayAllowed: false,
      redistributionAllowed: false,
      commercialMarketingAllowed: false,
      restrictions: "Private research fixtures only; holdout and defect/holdout are excluded from every review catalog and release allowlist.",
    },
    privacy: { containsRealPerson: false, containsPersonalData: false, containsThirdPartyMarks: false },
    evidenceStatus: { ...EVIDENCE_STATUS, claimBoundary: "Project-original structural fixtures only; no quality or release claim." },
  };
  await writeJson(sliceRoot, "rights/rights.project-original-synthetic.slice-02.v1.json", rightsRecord);

  const manifestRefs = [];
  let fixtureCount = 0;
  let assetCount = 0;
  for (const suiteId of SUITES) {
    for (const partition of PARTITIONS) {
      const rendered = suiteId === "NORMALIZE-DELIVER" ? renderNormalizeCase(partition) : renderMatteCase(partition);
      const id = `${suiteId === "NORMALIZE-DELIVER" ? "normalize" : "matte"}-${PARTITION_SLUG[partition]}-s02-001`;
      const assets = [];
      for (const [role, bytes] of Object.entries(rendered.assets)) {
        const filename = `${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}.png`;
        const relative = `fixtures/${partition}/${suiteId}/${id}/${filename}`;
        await mkdir(path.dirname(path.join(sliceRoot, relative)), { recursive: true });
        await writeFile(path.join(sliceRoot, relative), bytes);
        assets.push({ assetId: `${id}.${role}`, role, path: relative, mimeType: "image/png", width: WIDTH, height: HEIGHT, sha256: sha256(bytes), exposure: "catalog-denied" });
        assetCount += 1;
      }
      const familySuffix = `${suiteId.toLowerCase()}-${PARTITION_SLUG[partition]}-family-s02-001`;
      const fixture = {
        id,
        label: `${suiteId} ${partition} structural fixture`,
        caseKind: rendered.caseKind,
        defectLabel: rendered.defectLabel,
        expectedDisposition: rendered.expectedDisposition,
        sourceFamilyId: `source-family.${familySuffix}`,
        captureSessionId: `capture-session.${familySuffix}`,
        derivationLineage: [partition === "escape" ? `human-reconstructed-synthetic-regression:${id}` : `project-original-procedural:${id}`],
        perceptualHash: averageHashRgba(WIDTH, HEIGHT, rendered.sourceRgba),
        rightsRecordId: RIGHTS_RECORD_ID,
        visibility: "research-private-synthetic",
        difficultCategories: rendered.difficultCategories,
        width: WIDTH,
        height: HEIGHT,
        assets,
      };
      const manifest = {
        schemaVersion: "fixture-manifest.v1",
        fixtureManifestId: `fixture-manifest.${suiteId.toLowerCase()}.${PARTITION_SLUG[partition]}.slice-02.v1`,
        manifestVersion: VERSION,
        createdAt: CREATED_AT,
        suiteId,
        suiteVersion: VERSION,
        partition,
        sealedState: SEALED_STATE[partition],
        generator: { name: "research-generate-slice02", version: VERSION, sourceRevision: SOURCE_REVISION, scriptPath: "scripts/research-generate-slice02.mjs", seed: `20260815-${suiteId}-${PARTITION_SLUG[partition]}`, externalInputs: [] },
        preregistrationId: "partition-plan.slice-02.structural.v0",
        sourcePopulation: "Project-original procedural structural fixture; not a real-photo population and not sufficient for C1.",
        isolationPolicy: "Unique source family, capture session, exact source hash, and perceptual hash across every partition; catalog exposure denied.",
        evidenceStatus: EVIDENCE_STATUS,
        fixtures: [fixture],
        manifestHash: "",
      };
      manifest.manifestHash = hashRecordWithout(manifest, "manifestHash");
      const manifestPath = `manifests/fixture-manifest.${suiteId.toLowerCase()}.${PARTITION_SLUG[partition]}.slice-02.v1.json`;
      await writeJson(sliceRoot, manifestPath, manifest);
      manifestRefs.push(manifestPath);
      fixtureCount += 1;
    }
  }

  const partitionPlan = {
    schemaVersion: "suite-partition-plan.v0",
    preregistrationId: "partition-plan.slice-02.structural.v0",
    planVersion: VERSION,
    frozenAt: "2026-08-14T18:41:55.000Z",
    purpose: "Freeze contract and partition-isolation invariants before generating structural fixtures; not a C1 quality preregistration.",
    contractRefs: contracts.map((value) => `${value.capabilityContractId}@${value.contractVersion}`).sort(),
    suites: SUITES,
    partitions: PARTITIONS,
    manifestRefs: manifestRefs.sort(),
    sourceFamilyRule: "No sourceFamilyId may occur in more than one partition or suite fixture.",
    captureSessionRule: "No captureSessionId may occur in more than one partition or suite fixture.",
    deduplicationRule: "Exact source SHA-256 and 64-bit average perceptual hash must both be unique across fixtures.",
    catalogRule: "No Slice 02 asset may appear in review-catalog.v0 or any server allowlist.",
    sealedRule: "holdout and defect/holdout are committed structural rehearsals only; future C1 requires a new genuinely sealed fixture version after a quality preregistration.",
    escapeRule: "Only human-reconstructed project-original synthetic minimal reproductions; no retained user pixels or metadata.",
    evidenceStatus: EVIDENCE_STATUS,
    planHash: "",
  };
  partitionPlan.planHash = hashRecordWithout(partitionPlan, "planHash");
  await writeJson(sliceRoot, "preregistrations/partition-plan.slice-02.structural.v0.json", partitionPlan);

  return { sliceRoot, contracts: contracts.length, fixtureManifests: manifestRefs.length, fixtures: fixtureCount, assets: assetCount, adapterHash, planHash: partitionPlan.planHash };
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  try {
    const result = await generateSlice02();
    console.log(`Generated Slice 02: ${result.contracts} contracts, ${result.fixtures} fixtures, ${result.assets} PNG assets.`);
    console.log(`Partition plan SHA-256: ${result.planHash}`);
  } catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}
