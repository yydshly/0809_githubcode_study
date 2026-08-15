import { createHash } from "node:crypto";

export const SLICE11_EXPECTED_PROJECTION_ID = "EXPECTED-PROJECTION-GOLD-TO-ADAPTER@0.11.0";
export const SLICE11_EXPECTED_PROJECTION_SCHEMA_VERSION = "expected-projection.slice11.v0";
export const SLICE11_ADAPTER_EXPECTED_KEYS = Object.freeze([
  "decodedPixelSha256",
  "width",
  "height",
  "pixelLayout",
  "colorSpace",
  "orientation",
  "alphaMode",
  "alphaPresent",
  "metadataPolicy",
  "pngFilterPolicy",
  "interlace",
  "animation",
]);

const RECORD_KEYS = Object.freeze([
  "schemaVersion",
  "projectionId",
  "goldExpectedCanonicalJson",
  "goldExpectedSha256",
  "adapterExpected",
  "adapterExpectedSha256",
  "projectionKeys",
  "projectionKeysSha256",
  "contentHash",
]);

export class Slice11ExpectedProjectionError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "Slice11ExpectedProjectionError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new Slice11ExpectedProjectionError(code, message);
}

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (plain(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  fail("S11_EXPECTED_PROJECTION_INVALID", "expected values must be canonical JSON data");
}

export function stableStringifySlice11(value) {
  return JSON.stringify(stableValue(value));
}

export function sha256Slice11(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashCanonical(value) {
  return sha256Slice11(Buffer.from(`${stableStringifySlice11(value)}\n`, "utf8"));
}

export function contentHashProjectionSlice11(record) {
  if (!plain(record)) fail("S11_EXPECTED_PROJECTION_INVALID", "projection record must be an object");
  const payload = { ...record };
  delete payload.contentHash;
  return hashCanonical(payload);
}

function validateAdapterExpected(expected) {
  if (!plain(expected) || Object.keys(expected).length !== SLICE11_ADAPTER_EXPECTED_KEYS.length
    || SLICE11_ADAPTER_EXPECTED_KEYS.some((key) => !Object.hasOwn(expected, key))) {
    fail("S11_EXPECTED_PROJECTION_INVALID", "adapter expected must contain the exact frozen key set");
  }
  if (typeof expected.decodedPixelSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(expected.decodedPixelSha256)
    || !Number.isInteger(expected.width) || expected.width < 1 || expected.width > 256
    || !Number.isInteger(expected.height) || expected.height < 1 || expected.height > 256
    || expected.pixelLayout !== "RGBA8" || expected.colorSpace !== "embedded-sRGB"
    || expected.orientation !== 1 || expected.alphaMode !== "straight-unpremultiplied"
    || typeof expected.alphaPresent !== "boolean"
    || expected.metadataPolicy !== "strip-all-except-color-contract"
    || expected.pngFilterPolicy !== "filter-0-only"
    || expected.interlace !== "forbidden" || expected.animation !== "forbidden") {
    fail("S11_EXPECTED_PROJECTION_INVALID", "adapter expected is outside the frozen canonical profile");
  }
}

export function projectGoldExpectedSlice11({ projectionId, goldExpected } = {}) {
  if (typeof projectionId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/u.test(projectionId)
    || projectionId.includes("..") || !plain(goldExpected)) {
    fail("S11_EXPECTED_PROJECTION_INVALID", "projection identity and complete gold expected are required");
  }
  const adapterExpected = {};
  for (const key of SLICE11_ADAPTER_EXPECTED_KEYS) {
    if (!Object.hasOwn(goldExpected, key)) fail("S11_EXPECTED_PROJECTION_INVALID", `gold expected is missing ${key}`);
    adapterExpected[key] = structuredClone(goldExpected[key]);
  }
  validateAdapterExpected(adapterExpected);
  const goldExpectedCanonicalJson = stableStringifySlice11(goldExpected);
  const projectionKeys = [...SLICE11_ADAPTER_EXPECTED_KEYS];
  const record = {
    schemaVersion: SLICE11_EXPECTED_PROJECTION_SCHEMA_VERSION,
    projectionId,
    goldExpectedCanonicalJson,
    goldExpectedSha256: sha256Slice11(Buffer.from(`${goldExpectedCanonicalJson}\n`, "utf8")),
    adapterExpected,
    adapterExpectedSha256: hashCanonical(adapterExpected),
    projectionKeys,
    projectionKeysSha256: hashCanonical(projectionKeys),
    contentHash: "",
  };
  record.contentHash = contentHashProjectionSlice11(record);
  return Object.freeze({
    ...record,
    adapterExpected: Object.freeze({ ...adapterExpected }),
    projectionKeys: Object.freeze(projectionKeys),
  });
}

export function validateExpectedProjectionSlice11(record, { goldExpected } = {}) {
  if (!plain(record) || Object.keys(record).length !== RECORD_KEYS.length
    || RECORD_KEYS.some((key) => !Object.hasOwn(record, key))) {
    fail("S11_EXPECTED_PROJECTION_INVALID", "projection record shape is not closed");
  }
  if (record.schemaVersion !== SLICE11_EXPECTED_PROJECTION_SCHEMA_VERSION
    || record.projectionId !== SLICE11_EXPECTED_PROJECTION_ID
    || record.contentHash !== contentHashProjectionSlice11(record)) {
    fail("S11_EXPECTED_PROJECTION_INVALID", "projection identity or self hash drifted");
  }
  const parsedGold = JSON.parse(record.goldExpectedCanonicalJson);
  const rebuilt = projectGoldExpectedSlice11({ projectionId: record.projectionId, goldExpected: parsedGold });
  if (stableStringifySlice11(rebuilt) !== stableStringifySlice11(record)) {
    fail("S11_EXPECTED_PROJECTION_INVALID", "projection cannot be deterministically reconstructed");
  }
  if (goldExpected !== undefined && stableStringifySlice11(goldExpected) !== record.goldExpectedCanonicalJson) {
    fail("S11_EXPECTED_PROJECTION_INVALID", "projection is not bound to the supplied complete gold expected");
  }
  return true;
}

export const SLICE11_EXPECTED_PROJECTION_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://single-image-studio.invalid/research/slice-11/schemas/expected-projection.slice11.v0.schema.json",
  type: "object",
  additionalProperties: false,
  required: [...RECORD_KEYS],
  properties: {
    schemaVersion: { const: SLICE11_EXPECTED_PROJECTION_SCHEMA_VERSION },
    projectionId: { const: SLICE11_EXPECTED_PROJECTION_ID },
    goldExpectedCanonicalJson: { type: "string", minLength: 2 },
    goldExpectedSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    adapterExpected: {
      type: "object",
      additionalProperties: false,
      required: [...SLICE11_ADAPTER_EXPECTED_KEYS],
      properties: {
        decodedPixelSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        width: { type: "integer", minimum: 1, maximum: 256 },
        height: { type: "integer", minimum: 1, maximum: 256 },
        pixelLayout: { const: "RGBA8" },
        colorSpace: { const: "embedded-sRGB" },
        orientation: { const: 1 },
        alphaMode: { const: "straight-unpremultiplied" },
        alphaPresent: { type: "boolean" },
        metadataPolicy: { const: "strip-all-except-color-contract" },
        pngFilterPolicy: { const: "filter-0-only" },
        interlace: { const: "forbidden" },
        animation: { const: "forbidden" },
      },
    },
    adapterExpectedSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    projectionKeys: {
      type: "array",
      minItems: SLICE11_ADAPTER_EXPECTED_KEYS.length,
      maxItems: SLICE11_ADAPTER_EXPECTED_KEYS.length,
      items: { type: "string" },
    },
    projectionKeysSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    contentHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
});
