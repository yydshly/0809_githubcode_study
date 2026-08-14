import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RESEARCH_ROOT = path.resolve(SCRIPT_DIR, "../research");

export const FIXTURE_DEFINITION = Object.freeze({
  schemaVersion: "fixture-generator.v0",
  version: "0.1.0",
  createdAt: "2026-08-15T00:00:00.000Z",
  seed: "20260815",
  sourceRevision: "local-procedural-v0.1.0-seed-20260815",
  suite: "MATTE-GT",
  partition: "dev/calibration",
  width: 160,
  height: 120,
});

const EVIDENCE_STATUS = Object.freeze({
  level: "C1=0",
  purpose: "method-rehearsal",
});

const FIXTURES = Object.freeze([
  {
    id: "matte-hard-edge-001",
    label: "Hard edge geometry",
    category: "hard-edge",
    edgeType: "hard",
    expectedUse: "Exercise exact opaque/transparent boundary inspection.",
    candidateAlias: "Candidate A",
    methodLabel: "Deterministic procedural hard-edge ground truth",
    methodDetails: "Axis-aligned and diagonal opaque geometry rendered from local equations; no model output.",
  },
  {
    id: "matte-hole-001",
    label: "Enclosed hole geometry",
    category: "interior-hole",
    edgeType: "hole",
    expectedUse: "Exercise preservation of an enclosed transparent region.",
    candidateAlias: "Candidate B",
    methodLabel: "Deterministic procedural ring ground truth",
    methodDetails: "Opaque elliptical ring with a fully transparent interior rendered from local equations; no model output.",
  },
  {
    id: "matte-soft-edge-001",
    label: "Soft edge geometry",
    category: "soft-edge",
    edgeType: "soft",
    expectedUse: "Exercise partial-alpha inspection against contrasting backgrounds.",
    candidateAlias: "Candidate C",
    methodLabel: "Deterministic procedural soft-edge ground truth",
    methodDetails: "Elliptical alpha ramp rendered from local equations with a fixed feather width; no model output.",
  },
]);

const ASSET_NAMES = Object.freeze({
  source: "source.png",
  alpha: "alpha.png",
  foreground: "foreground.png",
  compositeBlack: "composite-black.png",
  compositeWhite: "composite-white.png",
  compositeSaturated: "composite-saturated.png",
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.allocUnsafe(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  const checksumInput = Buffer.concat([typeBytes, data]);
  chunk.writeUInt32BE(crc32(checksumInput), 8 + data.length);
  return chunk;
}

export function encodeRgbaPng(width, height, rgba) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new TypeError("PNG dimensions must be positive integers");
  }
  if (!(rgba instanceof Uint8Array) || rgba.length !== width * height * 4) {
    throw new TypeError("RGBA byte length does not match PNG dimensions");
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1);
    scanlines[rowOffset] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(scanlines, rowOffset + 1);
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function alphaFor(fixture, x, y) {
  if (fixture.edgeType === "hard") {
    const body = x >= 34 && x <= 125 && y >= 22 && y <= 100;
    const diagonalCut = x + y >= 63;
    const cornerCut = x - y <= 91;
    return body && diagonalCut && cornerCut ? 255 : 0;
  }

  const dx = (x - 80) / 51;
  const dy = (y - 60) / 39;
  const radius = Math.sqrt(dx * dx + dy * dy);
  if (fixture.edgeType === "hole") {
    return radius <= 1 && radius >= 0.43 ? 255 : 0;
  }

  const feather = 0.12;
  return clampByte(((1 + feather / 2 - radius) / feather) * 255);
}

function foregroundColor(x, y) {
  return [
    212 + ((x * 7 + y * 3) % 32),
    70 + ((x * 5 + y * 11) % 70),
    38 + ((x * 13 + y * 2) % 62),
  ];
}

function sourceBackground(x, y) {
  const tile = ((Math.floor(x / 16) + Math.floor(y / 15)) & 1) * 24;
  return [
    32 + tile + ((x * 3 + y) % 18),
    89 + tile + ((x + y * 2) % 26),
    125 + tile + ((x * 2 + y * 3) % 28),
  ];
}

function renderFixture(fixture) {
  const { width, height } = FIXTURE_DEFINITION;
  const alpha = new Uint8Array(width * height * 4);
  const foreground = new Uint8Array(width * height * 4);
  const source = new Uint8Array(width * height * 4);
  const black = new Uint8Array(width * height * 4);
  const white = new Uint8Array(width * height * 4);
  const saturated = new Uint8Array(width * height * 4);

  const targets = [
    [source, null],
    [black, [0, 0, 0]],
    [white, [255, 255, 255]],
    [saturated, [0, 216, 255]],
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const matte = alphaFor(fixture, x, y);
      const amount = matte / 255;
      const fg = foregroundColor(x, y);

      alpha.set([matte, matte, matte, 255], offset);
      foreground.set([fg[0], fg[1], fg[2], matte], offset);

      for (const [target, fixedBackground] of targets) {
        const bg = fixedBackground ?? sourceBackground(x, y);
        target.set([
          clampByte(fg[0] * amount + bg[0] * (1 - amount)),
          clampByte(fg[1] * amount + bg[1] * (1 - amount)),
          clampByte(fg[2] * amount + bg[2] * (1 - amount)),
          255,
        ], offset);
      }
    }
  }

  return { source, alpha, foreground, compositeBlack: black, compositeWhite: white, compositeSaturated: saturated };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function hashRecordWithout(record, omittedKey) {
  const copy = structuredClone(record);
  delete copy[omittedKey];
  return sha256(Buffer.from(stableStringify(copy), "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, stableStringify(value), "utf8");
}

function assetUrl(fixtureId, filename) {
  return `/research-assets/${FIXTURE_DEFINITION.partition}/${FIXTURE_DEFINITION.suite}/${fixtureId}/${filename}`;
}

function assetRelativePath(fixtureId, filename) {
  return `fixtures/${FIXTURE_DEFINITION.partition}/${FIXTURE_DEFINITION.suite}/${fixtureId}/${filename}`;
}

export async function generateResearchFixtures({ researchRoot = DEFAULT_RESEARCH_ROOT } = {}) {
  const rightsRecordId = "rights.local-synthetic.v0";
  const manifestFixtures = [];
  const catalogFixtures = [];
  const assetAllowlist = [];

  for (const fixture of FIXTURES) {
    const rendered = renderFixture(fixture);
    const manifestAssets = {};
    const catalogAssets = {};

    for (const [role, filename] of Object.entries(ASSET_NAMES)) {
      const bytes = encodeRgbaPng(
        FIXTURE_DEFINITION.width,
        FIXTURE_DEFINITION.height,
        rendered[role],
      );
      const relativePath = assetRelativePath(fixture.id, filename);
      const url = assetUrl(fixture.id, filename);
      await mkdir(path.dirname(path.join(researchRoot, relativePath)), { recursive: true });
      await writeFile(path.join(researchRoot, relativePath), bytes);
      manifestAssets[role] = {
        assetId: `${fixture.id}.${role}`,
        role,
        path: relativePath,
        url,
        mimeType: "image/png",
        width: FIXTURE_DEFINITION.width,
        height: FIXTURE_DEFINITION.height,
        sha256: sha256(bytes),
      };
      catalogAssets[role] = url;
      assetAllowlist.push(url);
    }

    const sourceFamilyId = `source-family.local-synthetic.${fixture.id}.v0`;
    const captureSessionId = `capture-session.local-generator.${fixture.id}.v0`;
    manifestFixtures.push({
      id: fixture.id,
      label: fixture.label,
      category: fixture.category,
      edgeType: fixture.edgeType,
      expectedUse: fixture.expectedUse,
      sourceFamilyId,
      captureSessionId,
      rightsRecordId,
      visibility: "public-synthetic",
      width: FIXTURE_DEFINITION.width,
      height: FIXTURE_DEFINITION.height,
      assets: manifestAssets,
    });
    catalogFixtures.push({
      id: fixture.id,
      label: fixture.label,
      suite: FIXTURE_DEFINITION.suite,
      partition: FIXTURE_DEFINITION.partition,
      sourceRevision: FIXTURE_DEFINITION.sourceRevision,
      candidateAlias: fixture.candidateAlias,
      methodLabel: fixture.methodLabel,
      methodDetails: fixture.methodDetails,
      rightsRecordId,
      visibility: "public-synthetic",
      evidenceStatus: EVIDENCE_STATUS,
      assets: catalogAssets,
      facts: {
        category: fixture.category,
        edgeType: fixture.edgeType,
        expectedUse: fixture.expectedUse,
      },
    });
  }

  const rightsRecord = {
    schemaVersion: "rights-record.v0",
    rightsRecordId,
    recordVersion: "0.1.0",
    createdAt: FIXTURE_DEFINITION.createdAt,
    assetClass: "public-synthetic",
    origin: {
      type: "project-original-procedural",
      generator: "scripts/research-generate-fixtures.mjs",
      externalInputs: [],
    },
    rightsHolder: {
      name: "Single Image Studio project contributors",
      basis: "Generated locally from original geometric equations in this repository.",
    },
    license: {
      id: "project-repository-terms",
      terms: "Use is limited to this repository's research, review, test, and demonstration surfaces; no third-party rights are asserted.",
    },
    permissions: {
      processingAllowed: true,
      researchUseAllowed: true,
      publicDisplayAllowed: true,
      redistributionAllowed: false,
      commercialMarketingAllowed: false,
      restrictions: "Must retain synthetic disclosure and C1=0 method-rehearsal boundary.",
    },
    privacy: {
      containsRealPerson: false,
      containsPersonalData: false,
      containsThirdPartyMarks: false,
    },
    evidenceStatus: {
      level: "C1=0",
      purpose: "method-rehearsal",
      claimBoundary: "Repository consistency only; not matting capability evidence.",
    },
  };

  const manifest = {
    schemaVersion: "fixture-manifest.v0",
    fixtureManifestId: "fixture-manifest.matte-gt.dev-calibration.v0",
    manifestVersion: "0.1.0",
    createdAt: FIXTURE_DEFINITION.createdAt,
    suiteId: FIXTURE_DEFINITION.suite,
    partition: FIXTURE_DEFINITION.partition,
    generator: {
      name: "research-generate-fixtures",
      version: FIXTURE_DEFINITION.version,
      sourceRevision: FIXTURE_DEFINITION.sourceRevision,
      scriptPath: "scripts/research-generate-fixtures.mjs",
      seed: FIXTURE_DEFINITION.seed,
      externalInputs: [],
    },
    sourcePopulation: "Three deterministic local geometric RGBA scenes covering hard edge, enclosed hole, and partial-alpha soft edge.",
    sourceFamilyRule: "Each procedural scene has a unique family ID; no family may appear in another partition.",
    captureSessionRule: "Each generator scene has a unique synthetic session ID; no session may appear in another partition.",
    trainingContaminationRisk: "Not assessed; fixtures are method rehearsal only and must not support model-quality claims.",
    evidenceStatus: EVIDENCE_STATUS,
    fixtures: manifestFixtures,
    manifestHash: "",
  };
  manifest.manifestHash = hashRecordWithout(manifest, "manifestHash");

  const catalog = {
    schemaVersion: "review-catalog.v0",
    catalogId: "review-catalog.local-synthetic.v0",
    catalogVersion: "0.1.0",
    generatedAt: FIXTURE_DEFINITION.createdAt,
    evidenceStatus: EVIDENCE_STATUS,
    visibilityPolicy: { allowed: ["public-synthetic"] },
    assetAllowlist: [...new Set(assetAllowlist)].sort(),
    fixtures: catalogFixtures,
  };

  await writeJson(path.join(researchRoot, "rights/rights.local-synthetic.v0.json"), rightsRecord);
  await writeJson(path.join(researchRoot, "manifests/fixture-manifest.matte-gt.dev-calibration.v0.json"), manifest);
  await writeJson(path.join(researchRoot, "manifests/review-catalog.v0.json"), catalog);

  return {
    researchRoot,
    fixtureCount: manifestFixtures.length,
    assetCount: assetAllowlist.length,
    manifestHash: manifest.manifestHash,
  };
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  try {
    const result = await generateResearchFixtures();
    console.log(`Generated ${result.fixtureCount} fixtures and ${result.assetCount} PNG assets.`);
    console.log(`FixtureManifest SHA-256: ${result.manifestHash}`);
  } catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}
