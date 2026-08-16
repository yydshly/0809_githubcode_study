import { createHash } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import {
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import { InMemoryRunStore } from "./run-store.mjs";
import { createBackgroundRemovalRuntime } from "./providers/background-removal/runtime.mjs";

const DEFAULT_PORT = 4177;
const MAX_JSON_BODY_BYTES = 36 * 1024 * 1024;
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 24 * 1024 * 1024;
const MAX_REFERENCE_IMAGES = 4;
const MAX_UPSTREAM_BODY_BYTES = 48 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 180_000;
const MAX_RESEARCH_CATALOG_BYTES = 2 * 1024 * 1024;
const OPENAI_IMAGE_EDIT_URL = "https://api.openai.com/v1/images/edits";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TASK_IDS = new Set(["CR1"]);
const LOOPBACK_HOST = "127.0.0.1";

const MIME_EXTENSIONS = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
});

const OUTPUT_MIME_TYPES = Object.freeze({
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
});

const CONTENT_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
});

class HttpError extends Error {
  constructor(status, code, message, requestId = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sendJson(response, status, payload, headers = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Length": body.length,
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(body);
}

function sendError(response, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const code = typeof error?.code === "string" ? error.code : "server_error";
  const message = status >= 500 && !(error instanceof HttpError)
    ? "服务端发生异常"
    : String(error?.message || "请求失败").slice(0, 1000);
  sendJson(response, status, {
    error: {
      code,
      message,
      requestId: error?.requestId ?? null,
    },
  });
}

async function readJson(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) {
    throw new HttpError(415, "unsupported_media_type", "请求必须使用 application/json");
  }

  const declaredLength = Number.parseInt(String(request.headers["content-length"] ?? ""), 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    throw new HttpError(413, "request_too_large", "图片请求过大");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BODY_BYTES) {
      throw new HttpError(413, "request_too_large", "图片请求过大");
    }
    chunks.push(chunk);
  }
  if (size === 0) throw new HttpError(400, "empty_json", "请求内容不能为空");

  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid_json", "请求不是有效 JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "invalid_json_object", "请求必须是 JSON 对象");
  }
  return parsed;
}

function assertAllowedKeys(value, allowedKeys) {
  const unknown = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknown.length) {
    throw new HttpError(400, "unknown_field", `不支持的字段：${unknown.join(", ")}`);
  }
}

function hasExpectedMagic(bytes, mime) {
  if (mime === "image/png") {
    return bytes.length >= 8
      && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/webp") {
    return bytes.length >= 12
      && bytes.subarray(0, 4).toString("ascii") === "RIFF"
      && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

function decodeCanonicalBase64(
  encoded,
  label,
  { status = 400, code = "invalid_image_base64" } = {},
) {
  if (!encoded || encoded.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new HttpError(status, code, `${label}不是规范的 base64 图片`);
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded) {
    throw new HttpError(status, code, `${label}不是规范的 base64 图片`);
  }
  return bytes;
}

function parseImageDataUrl(value, label) {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_image_data_url", `${label}必须是图片 data URL`);
  }
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) {
    throw new HttpError(400, "invalid_image_data_url", `${label}必须是 PNG、JPEG 或 WebP data URL`);
  }
  const mime = match[1];
  const bytes = decodeCanonicalBase64(match[2], label);
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    throw new HttpError(400, "invalid_image_size", `${label}大小不符合要求`);
  }
  if (!hasExpectedMagic(bytes, mime)) {
    throw new HttpError(400, "image_mime_mismatch", `${label}内容与声明格式不一致`);
  }
  return {
    bytes,
    mime,
    extension: MIME_EXTENSIONS[mime],
    sha256: sha256(bytes),
  };
}

function parseRunPayload(payload) {
  assertAllowedKeys(payload, new Set([
    "clientRunId",
    "taskId",
    "sourceImage",
    "referenceImages",
    "prompt",
    "quality",
    "size",
    "outputFormat",
  ]));

  if (typeof payload.clientRunId !== "string" || !UUID_PATTERN.test(payload.clientRunId)) {
    throw new HttpError(400, "invalid_client_run_id", "clientRunId 必须是有效 UUID");
  }
  const clientRunId = payload.clientRunId.toLowerCase();

  if (payload.taskId !== undefined && typeof payload.taskId !== "string") {
    throw new HttpError(400, "invalid_task_id", "taskId 格式无效");
  }
  const taskId = (payload.taskId ?? "CR1").toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(taskId) || !ALLOWED_TASK_IDS.has(taskId)) {
    throw new HttpError(400, "invalid_task_id", "taskId 格式无效");
  }

  if (typeof payload.prompt !== "string" || !payload.prompt.trim() || payload.prompt.length > 4000) {
    throw new HttpError(400, "invalid_prompt", "prompt 必须是 1–4000 字符的字符串");
  }

  const quality = payload.quality ?? "medium";
  if (!new Set(["low", "medium", "high", "auto"]).has(quality)) {
    throw new HttpError(400, "invalid_quality", "quality 必须是 low、medium、high 或 auto");
  }
  const size = payload.size ?? "1024x1024";
  if (!new Set(["1024x1024", "1536x1024", "1024x1536", "auto"]).has(size)) {
    throw new HttpError(400, "invalid_size", "size 不是支持的图片尺寸");
  }
  const outputFormat = payload.outputFormat ?? "png";
  if (!new Set(Object.keys(OUTPUT_MIME_TYPES)).has(outputFormat)) {
    throw new HttpError(400, "invalid_output_format", "outputFormat 必须是 png、jpeg 或 webp");
  }

  const source = parseImageDataUrl(payload.sourceImage, "sourceImage");
  const referenceValues = payload.referenceImages ?? [];
  if (!Array.isArray(referenceValues) || referenceValues.length > MAX_REFERENCE_IMAGES) {
    throw new HttpError(400, "invalid_reference_images", `referenceImages 最多允许 ${MAX_REFERENCE_IMAGES} 张`);
  }
  const references = referenceValues.map((value, index) => parseImageDataUrl(value, `referenceImages[${index}]`));
  const totalBytes = [source, ...references].reduce((sum, image) => sum + image.bytes.length, 0);
  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
    throw new HttpError(413, "images_too_large", "图片解码后的总大小超过限制");
  }

  return {
    clientRunId,
    taskId,
    prompt: payload.prompt.trim(),
    quality,
    size,
    outputFormat,
    source,
    references,
  };
}

function runInputFingerprint(input) {
  const canonical = JSON.stringify({
    model: "gpt-image-2",
    taskId: input.taskId,
    sourceSha256: input.source.sha256,
    referenceSha256: input.references.map((image) => image.sha256),
    prompt: input.prompt,
    quality: input.quality,
    size: input.size,
    outputFormat: input.outputFormat,
  });
  return sha256(Buffer.from(canonical, "utf8"));
}

function exactUtc(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new HttpError(400, "invalid_background_removal_consent", `${label} 必须是精确 UTC 时间`);
  }
  return value;
}

function parseBackgroundRemovalPayload(payload) {
  assertAllowedKeys(payload, new Set([
    "clientRunId",
    "sourceRevision",
    "geometryRevision",
    "sourceImage",
    "sourceSha256",
    "consent",
  ]));
  if (typeof payload.clientRunId !== "string" || !UUID_PATTERN.test(payload.clientRunId)) {
    throw new HttpError(400, "invalid_client_run_id", "clientRunId 必须是有效 UUID");
  }
  if (!Number.isInteger(payload.sourceRevision) || payload.sourceRevision < 1) {
    throw new HttpError(400, "invalid_source_revision", "sourceRevision 必须是正整数");
  }
  if (!Number.isInteger(payload.geometryRevision) || payload.geometryRevision < 1) {
    throw new HttpError(400, "invalid_geometry_revision", "geometryRevision 必须是正整数");
  }
  const source = parseImageDataUrl(payload.sourceImage, "sourceImage");
  if (typeof payload.sourceSha256 !== "string" || payload.sourceSha256.toLowerCase() !== source.sha256) {
    throw new HttpError(400, "source_hash_mismatch", "sourceSha256 与 sourceImage bytes 不一致");
  }
  assertAllowedKeys(payload.consent ?? {}, new Set(["accepted", "acceptedAt", "policyVersion"]));
  if (payload.consent?.accepted !== true || payload.consent.policyVersion !== "background-removal-consent.v0") {
    throw new HttpError(400, "background_removal_consent_required", "发送图片前必须明确同意远程抠图处理");
  }
  const consent = {
    accepted: true,
    acceptedAt: exactUtc(payload.consent.acceptedAt, "consent.acceptedAt"),
    policyVersion: payload.consent.policyVersion,
  };
  return {
    clientRunId: payload.clientRunId.toLowerCase(),
    sourceRevision: payload.sourceRevision,
    geometryRevision: payload.geometryRevision,
    source,
    consent,
  };
}

function backgroundRemovalFingerprint(input, providerStatus) {
  return sha256(Buffer.from(JSON.stringify({
    provider: providerStatus.provider,
    sourceRevision: input.sourceRevision,
    geometryRevision: input.geometryRevision,
    sourceSha256: input.source.sha256,
    consentPolicyVersion: input.consent.policyVersion,
  }), "utf8"));
}

async function readUpstreamJson(response) {
  const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPSTREAM_BODY_BYTES) {
    throw new HttpError(502, "upstream_response_too_large", "图片服务返回内容过大");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_UPSTREAM_BODY_BYTES) {
    throw new HttpError(502, "upstream_response_too_large", "图片服务返回内容过大");
  }
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new HttpError(502, "invalid_upstream_json", "图片服务返回了无效响应");
  }
}

function outputDataUrl(encoded, outputFormat) {
  const mime = OUTPUT_MIME_TYPES[outputFormat];
  const bytes = decodeCanonicalBase64(encoded, "OpenAI output", {
    status: 502,
    code: "invalid_upstream_image",
  });
  if (bytes.length > MAX_IMAGE_BYTES || !hasExpectedMagic(bytes, mime)) {
    throw new HttpError(502, "invalid_upstream_image", "图片服务返回了无效图片");
  }
  return {
    dataUrl: `data:${mime};base64,${encoded}`,
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

function publicRun(run) {
  return run;
}

async function executeRun({ runId, input, store, apiKey, fetchImpl, timeoutMs }) {
  store.update(runId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  let requestId = null;
  try {
    const form = new FormData();
    form.append("model", "gpt-image-2");
    [input.source, ...input.references].forEach((image, index) => {
      form.append(
        "image[]",
        new Blob([image.bytes], { type: image.mime }),
        `${index === 0 ? "source" : `reference-${index}`}.${image.extension}`,
      );
    });
    form.append("prompt", input.prompt);
    form.append("quality", input.quality);
    form.append("size", input.size);
    form.append("output_format", input.outputFormat);

    const response = await fetchImpl(OPENAI_IMAGE_EDIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
    requestId = response.headers.get("x-request-id");
    const body = await readUpstreamJson(response);

    if (!response.ok) {
      const upstreamError = body?.error ?? {};
      store.update(runId, {
        status: "failed",
        requestId,
        completedAt: new Date().toISOString(),
        error: {
          code: String(upstreamError.code ?? upstreamError.type ?? "openai_error").slice(0, 100),
          message: String(upstreamError.message ?? "OpenAI 图片编辑失败").slice(0, 1000),
          httpStatus: response.status,
        },
      });
      return;
    }

    const encoded = body?.data?.[0]?.b64_json;
    if (typeof encoded !== "string") {
      throw new HttpError(502, "missing_upstream_image", "图片服务没有返回图片结果", requestId);
    }
    const output = outputDataUrl(encoded, input.outputFormat);
    store.update(runId, {
      status: "succeeded",
      requestId,
      completedAt: new Date().toISOString(),
      result: {
        image: output.dataUrl,
        imageSha256: output.sha256,
        imageBytes: output.bytes,
        model: "gpt-image-2",
        outputFormat: input.outputFormat,
        size: input.size,
        quality: input.quality,
        usage: body.usage ?? null,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      store.update(runId, {
        status: "failed",
        requestId: error.requestId ?? requestId,
        completedAt: new Date().toISOString(),
        error: {
          code: error.code,
          message: error.message,
          httpStatus: error.status,
        },
      });
      return;
    }

    store.update(runId, {
      status: "unknown",
      requestId,
      completedAt: new Date().toISOString(),
      error: {
        code: error?.name === "TimeoutError" || error?.name === "AbortError"
          ? "upstream_timeout"
          : "upstream_status_unknown",
        message: "无法确认 OpenAI 图片任务是否完成；不会自动重复提交",
        httpStatus: null,
      },
    });
  }
}

function isInside(root, target) {
  const child = relative(root, target);
  return child === "" || (!child.startsWith(`..${sep}`) && child !== ".." && !isAbsolute(child));
}

function researchCatalogUnavailable() {
  return new HttpError(
    503,
    "research_catalog_unavailable",
    "研究夹具清单不可用",
  );
}

function parseResearchAssetUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/research-assets/")) return null;
  if (value.includes("\\") || value.includes("?") || value.includes("#") || value.includes("%")) return null;

  const relativePath = value.slice("/research-assets/".length);
  const segments = relativePath.split("/");
  if (
    !relativePath.endsWith(".png")
    || segments.some((segment) => !segment || segment === "." || segment === "..")
    || !segments.every((segment) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment))
  ) {
    return null;
  }
  return relativePath;
}

function hasExactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isNonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function hasResearchEvidenceZero(value) {
  return hasExactKeys(value, ["level", "purpose"])
    && value.level === "C1=0"
    && value.purpose === "method-rehearsal";
}

function validateResearchCatalog(value) {
  try {
    if (!hasExactKeys(value, [
      "schemaVersion",
      "catalogId",
      "catalogVersion",
      "generatedAt",
      "evidenceStatus",
      "visibilityPolicy",
      "assetAllowlist",
      "fixtures",
    ])) throw new Error("catalog");
    if (value.schemaVersion !== "review-catalog.v0") throw new Error("schema");
    if (
      !isNonEmptyString(value.catalogId)
      || typeof value.catalogVersion !== "string"
      || !/^0\.[0-9]+\.[0-9]+$/.test(value.catalogVersion)
    ) {
      throw new Error("catalog identity");
    }
    if (
      !isNonEmptyString(value.generatedAt)
      || Number.isNaN(Date.parse(value.generatedAt))
    ) {
      throw new Error("catalog date");
    }
    if (!hasResearchEvidenceZero(value.evidenceStatus)) throw new Error("evidence");
    if (
      !hasExactKeys(value.visibilityPolicy, ["allowed"])
      || !Array.isArray(value.visibilityPolicy.allowed)
      || value.visibilityPolicy.allowed.length !== 1
      || value.visibilityPolicy.allowed[0] !== "public-synthetic"
    ) {
      throw new Error("visibility policy");
    }
    if (
      !Array.isArray(value.fixtures)
      || !Array.isArray(value.assetAllowlist)
    ) {
      throw new Error("fixtures");
    }

    const referencedAssets = new Set();
    const fixtureIds = new Set();
    for (const fixture of value.fixtures) {
      if (
        !hasExactKeys(fixture, [
          "id",
          "label",
          "suite",
          "partition",
          "sourceRevision",
          "candidateAlias",
          "methodLabel",
          "methodDetails",
          "rightsRecordId",
          "visibility",
          "evidenceStatus",
          "assets",
          "facts",
        ])
        || typeof fixture.id !== "string"
        || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(fixture.id)
        || !isNonEmptyString(fixture.label)
        || fixture.suite !== "MATTE-GT"
        || fixture.partition !== "dev/calibration"
        || !isNonEmptyString(fixture.sourceRevision)
        || !isNonEmptyString(fixture.candidateAlias)
        || !isNonEmptyString(fixture.methodLabel)
        || !isNonEmptyString(fixture.methodDetails)
        || !isNonEmptyString(fixture.rightsRecordId)
        || fixture.visibility !== "public-synthetic"
        || !hasResearchEvidenceZero(fixture.evidenceStatus)
        || !hasExactKeys(fixture.assets, [
          "source",
          "alpha",
          "foreground",
          "compositeBlack",
          "compositeWhite",
          "compositeSaturated",
        ])
        || !hasExactKeys(fixture.facts, ["category", "edgeType", "expectedUse"])
        || !isNonEmptyString(fixture.facts.category)
        || !new Set(["hard", "hole", "soft"]).has(fixture.facts.edgeType)
        || !isNonEmptyString(fixture.facts.expectedUse)
      ) {
        throw new Error("fixture schema");
      }
      if (fixtureIds.has(fixture.id)) throw new Error("duplicate fixture");
      fixtureIds.add(fixture.id);
      const assets = Object.values(fixture.assets);
      if (new Set(assets).size !== assets.length) throw new Error("fixture assets");
      const fixtureAssetPrefix = `/research-assets/${fixture.partition}/${fixture.suite}/${fixture.id}/`;
      for (const assetUrl of assets) {
        if (!parseResearchAssetUrl(assetUrl) || !assetUrl.startsWith(fixtureAssetPrefix)) {
          throw new Error("fixture asset URL");
        }
        referencedAssets.add(assetUrl);
      }
    }

    const declaredAssets = new Set();
    for (const assetUrl of value.assetAllowlist) {
      if (!parseResearchAssetUrl(assetUrl) || declaredAssets.has(assetUrl)) {
        throw new Error("asset allowlist");
      }
      declaredAssets.add(assetUrl);
    }
    if (!value.assetAllowlist.every((assetUrl, index, values) => index === 0 || values[index - 1] < assetUrl)) {
      throw new Error("asset allowlist order");
    }
    if (
      declaredAssets.size !== referencedAssets.size
      || [...declaredAssets].some((assetUrl) => !referencedAssets.has(assetUrl))
    ) {
      throw new Error("asset allowlist mismatch");
    }

    return {
      catalog: value,
      assetAllowlist: declaredAssets,
    };
  } catch {
    throw researchCatalogUnavailable();
  }
}

async function loadResearchCatalog(catalogPath, researchRoot) {
  try {
    const configuredResearchRoot = resolve(researchRoot);
    const configuredCatalogPath = resolve(catalogPath);
    if (!isInside(configuredResearchRoot, configuredCatalogPath)) {
      throw new Error("catalog path");
    }
    const [researchRootReal, catalogReal] = await Promise.all([
      realpath(configuredResearchRoot),
      realpath(configuredCatalogPath),
    ]);
    if (!isInside(researchRootReal, catalogReal)) throw new Error("catalog escape");

    const info = await stat(catalogReal);
    if (!info.isFile() || info.size <= 0 || info.size > MAX_RESEARCH_CATALOG_BYTES) {
      throw new Error("catalog size");
    }
    const contents = await readFile(catalogReal, "utf8");
    return validateResearchCatalog(JSON.parse(contents));
  } catch (error) {
    if (error instanceof HttpError && error.code === "research_catalog_unavailable") throw error;
    throw researchCatalogUnavailable();
  }
}

function requestPathBeforeQuery(request) {
  const requestUrl = String(request.url ?? "/");
  const queryIndex = requestUrl.indexOf("?");
  return queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex);
}

function requestedResearchAssetPath(request) {
  const rawPath = requestPathBeforeQuery(request);
  if (!rawPath.startsWith("/research-assets/")) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    throw new HttpError(400, "invalid_path", "请求路径无效");
  }
  if (decodedPath.includes("\0")) {
    throw new HttpError(400, "invalid_path", "请求路径无效");
  }
  if (decodedPath !== rawPath) {
    throw new HttpError(403, "research_asset_forbidden", "禁止访问该研究资源");
  }
  const assetRelativePath = parseResearchAssetUrl(decodedPath);
  if (!assetRelativePath) {
    throw new HttpError(403, "research_asset_forbidden", "禁止访问该研究资源");
  }
  return { assetRelativePath, decodedPath };
}

async function serveResearchAsset({ request, response, researchRoot, catalogPath, requestedAsset }) {
  const { assetAllowlist } = await loadResearchCatalog(catalogPath, researchRoot);
  if (!assetAllowlist.has(requestedAsset.decodedPath)) {
    throw new HttpError(404, "research_asset_not_found", "研究资源不存在");
  }

  const configuredFixturesRoot = resolve(researchRoot, "fixtures");
  const lexicalTarget = resolve(configuredFixturesRoot, ...requestedAsset.assetRelativePath.split("/"));
  if (!isInside(configuredFixturesRoot, lexicalTarget)) {
    throw new HttpError(403, "research_asset_forbidden", "禁止访问该研究资源");
  }

  let researchRootReal;
  let fixturesRootReal;
  let targetReal;
  try {
    [researchRootReal, fixturesRootReal, targetReal] = await Promise.all([
      realpath(researchRoot),
      realpath(configuredFixturesRoot),
      realpath(lexicalTarget),
    ]);
  } catch {
    throw new HttpError(404, "research_asset_not_found", "研究资源不存在");
  }
  if (
    !isInside(researchRootReal, fixturesRootReal)
    || !isInside(fixturesRootReal, targetReal)
  ) {
    throw new HttpError(403, "research_asset_forbidden", "禁止访问该研究资源");
  }

  let info;
  try {
    info = await stat(targetReal);
  } catch {
    throw new HttpError(404, "research_asset_not_found", "研究资源不存在");
  }
  if (!info.isFile()) {
    throw new HttpError(404, "research_asset_not_found", "研究资源不存在");
  }

  const body = await readFile(targetReal);
  if (!hasExpectedMagic(body, "image/png")) {
    throw new HttpError(422, "invalid_research_asset", "研究资源不是有效 PNG");
  }
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": body.length,
    "Content-Type": "image/png",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : body);
}

async function serveStatic({ request, response, webRoot }) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
  } catch {
    throw new HttpError(400, "invalid_path", "请求路径无效");
  }
  if (pathname.includes("\0")) throw new HttpError(400, "invalid_path", "请求路径无效");
  if (pathname === "/") pathname = "/index.html";
  else if (pathname.endsWith("/")) pathname += "index.html";

  const configuredRoot = resolve(webRoot);
  const lexicalTarget = resolve(configuredRoot, `.${pathname}`);
  if (!isInside(configuredRoot, lexicalTarget)) {
    throw new HttpError(403, "forbidden_path", "禁止访问该路径");
  }

  let rootReal;
  let targetReal;
  try {
    [rootReal, targetReal] = await Promise.all([realpath(configuredRoot), realpath(lexicalTarget)]);
  } catch {
    throw new HttpError(404, "not_found", "文件不存在");
  }
  if (!isInside(rootReal, targetReal)) {
    throw new HttpError(403, "forbidden_path", "禁止访问该路径");
  }

  const info = await stat(targetReal);
  if (!info.isFile()) throw new HttpError(404, "not_found", "文件不存在");
  const body = await readFile(targetReal);
  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Length": body.length,
    "Content-Type": CONTENT_TYPES[extname(targetReal).toLowerCase()] ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : body);
}

function apiRoute(pathname) {
  if (pathname === "/api/status") return { kind: "status" };
  if (pathname === "/api/runs") return { kind: "runs" };
  if (pathname === "/api/background-removal/status") return { kind: "background-removal-status" };
  if (pathname === "/api/background-removal/runs") return { kind: "background-removal-runs" };
  const backgroundRemovalMatch = /^\/api\/background-removal\/runs\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(pathname);
  if (backgroundRemovalMatch) return { kind: "background-removal-run", id: backgroundRemovalMatch[1].toLowerCase() };
  const runMatch = /^\/api\/runs\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(pathname);
  return runMatch ? { kind: "run", id: runMatch[1].toLowerCase() } : { kind: "unknown" };
}

export function createImageStudioServer({
  apiKey = process.env.OPENAI_API_KEY ?? "",
  fetchImpl = globalThis.fetch,
  previewMode = "local",
  store = new InMemoryRunStore(),
  timeoutMs = UPSTREAM_TIMEOUT_MS,
  webRoot = fileURLToPath(new URL("../web/", import.meta.url)),
  researchRoot = fileURLToPath(new URL("../research/", import.meta.url)),
  researchCatalogPath,
  catalogPath,
  backgroundRemovalProvider = null,
  backgroundRemovalStore = new InMemoryRunStore(),
  backgroundRemovalTimeoutMs = 30_000,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (!new Set(["local", "lan"]).has(previewMode)) {
    throw new TypeError("previewMode must be local or lan");
  }
  if (researchCatalogPath !== undefined && catalogPath !== undefined) {
    throw new TypeError("use either researchCatalogPath or catalogPath, not both");
  }

  const effectiveResearchRoot = resolve(researchRoot);
  const effectiveResearchCatalogPath = resolve(
    researchCatalogPath
      ?? catalogPath
      ?? resolve(effectiveResearchRoot, "manifests", "review-catalog.v0.json"),
  );

  // LAN preview deliberately serves only the browser-local processing path.
  // A server-side key may exist in the parent environment, but it is ignored.
  const effectiveApiKey = previewMode === "local" ? apiKey : "";
  const backgroundRemoval = createBackgroundRemovalRuntime({
    provider: previewMode === "local" ? backgroundRemovalProvider : null,
    store: backgroundRemovalStore,
    timeoutMs: backgroundRemovalTimeoutMs,
  });

  const inflight = new Set();
  const server = createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const route = apiRoute(url.pathname);

      if (route.kind === "status") {
        if (request.method !== "GET") {
          throw new HttpError(405, "method_not_allowed", "该接口只支持 GET");
        }
        sendJson(response, 200, {
          available: Boolean(effectiveApiKey),
          model: "gpt-image-2",
          runStore: "memory",
          previewMode,
        });
        return;
      }

      if (route.kind === "background-removal-status") {
        if (request.method !== "GET") throw new HttpError(405, "method_not_allowed", "该接口只支持 GET");
        const status = backgroundRemoval.status();
        sendJson(response, 200, {
          ...status,
          reason: previewMode === "lan" ? "lan_disabled" : status.reason,
          previewMode,
        });
        return;
      }

      if (route.kind === "background-removal-runs") {
        if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "该接口只支持 POST");
        if (previewMode === "lan") throw new HttpError(403, "lan_background_removal_disabled", "手机局域网预览不开放远程抠图");
        const providerStatus = backgroundRemoval.status();
        if (!providerStatus.available) throw new HttpError(503, "background_removal_unavailable", "尚未配置抠图服务");
        const input = parseBackgroundRemovalPayload(await readJson(request));
        const resolved = backgroundRemoval.create({
          id: input.clientRunId,
          inputFingerprint: backgroundRemovalFingerprint(input, providerStatus),
          input,
          metadata: {
            taskId: "BACKGROUND_REMOVAL",
            provider: providerStatus.provider,
            input: {
              sourceRevision: input.sourceRevision,
              geometryRevision: input.geometryRevision,
              sourceSha256: input.source.sha256,
              sourceMime: input.source.mime,
              sourceBytes: input.source.bytes.length,
              consentPolicyVersion: input.consent.policyVersion,
            },
          },
        });
        if (resolved.conflict) throw new HttpError(409, "client_run_conflict", "clientRunId 已用于不同抠图输入");
        sendJson(response, resolved.created ? 202 : 200, { run: publicRun(resolved.run), reused: !resolved.created }, {
          Location: `/api/background-removal/runs/${resolved.run.id}`,
        });
        return;
      }

      if (route.kind === "background-removal-run") {
        if (previewMode === "lan") throw new HttpError(403, "lan_background_removal_disabled", "手机局域网预览不开放远程抠图");
        if (request.method === "GET") {
          const run = backgroundRemoval.get(route.id);
          if (!run) throw new HttpError(404, "run_not_found", "抠图任务不存在");
          sendJson(response, 200, { run: publicRun(run) });
          return;
        }
        if (request.method === "DELETE") {
          const cancelled = backgroundRemoval.cancel(route.id);
          if (!cancelled) throw new HttpError(404, "run_not_found", "抠图任务不存在");
          sendJson(response, 200, cancelled);
          return;
        }
        throw new HttpError(405, "method_not_allowed", "该接口只支持 GET 或 DELETE");
      }

      if (url.pathname === "/api/research/fixtures") {
        if (request.method !== "GET") {
          throw new HttpError(405, "method_not_allowed", "该接口只支持 GET");
        }
        if (previewMode === "lan") {
          throw new HttpError(403, "lan_research_disabled", "局域网预览不开放研究夹具");
        }
        const { catalog } = await loadResearchCatalog(
          effectiveResearchCatalogPath,
          effectiveResearchRoot,
        );
        sendJson(response, 200, catalog);
        return;
      }

      const requestedAsset = requestedResearchAssetPath(request);
      if (requestedAsset) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          throw new HttpError(405, "method_not_allowed", "研究资源只支持 GET 或 HEAD");
        }
        if (previewMode === "lan") {
          throw new HttpError(403, "lan_research_disabled", "局域网预览不开放研究夹具");
        }
        await serveResearchAsset({
          request,
          response,
          researchRoot: effectiveResearchRoot,
          catalogPath: effectiveResearchCatalogPath,
          requestedAsset,
        });
        return;
      }

      if (route.kind === "runs") {
        if (request.method !== "POST") {
          throw new HttpError(405, "method_not_allowed", "该接口只支持 POST");
        }
        if (previewMode === "lan") {
          throw new HttpError(403, "lan_ai_disabled", "手机局域网预览不开放 AI 生成");
        }
        const input = parseRunPayload(await readJson(request));
        const fingerprint = runInputFingerprint(input);
        const resolved = store.createOrGet({
          id: input.clientRunId,
          inputFingerprint: fingerprint,
          metadata: {
            taskId: input.taskId,
            model: "gpt-image-2",
            input: {
              sourceSha256: input.source.sha256,
              referenceSha256: input.references.map((image) => image.sha256),
              referenceCount: input.references.length,
              quality: input.quality,
              size: input.size,
              outputFormat: input.outputFormat,
            },
          },
        });
        if (resolved.conflict) {
          throw new HttpError(
            409,
            "client_run_conflict",
            "clientRunId 已用于不同输入；请查询原任务或使用新的 UUID",
          );
        }
        if (!resolved.created) {
          sendJson(response, 200, { run: publicRun(resolved.run), reused: true }, {
            Location: `/api/runs/${resolved.run.id}`,
          });
          return;
        }
        if (!effectiveApiKey) {
          // A run without an upstream request must not occupy the client UUID.
          store.delete(resolved.run.id);
          throw new HttpError(503, "api_key_missing", "服务端尚未配置 OPENAI_API_KEY");
        }
        const run = resolved.run;
        const task = executeRun({
          runId: run.id,
          input,
          store,
          apiKey: effectiveApiKey,
          fetchImpl,
          timeoutMs,
        }).finally(() => inflight.delete(task));
        inflight.add(task);
        sendJson(response, 202, { run: publicRun(run), reused: false }, {
          Location: `/api/runs/${run.id}`,
        });
        return;
      }

      if (route.kind === "run") {
        if (request.method !== "GET") {
          throw new HttpError(405, "method_not_allowed", "该接口只支持 GET");
        }
        if (previewMode === "lan") {
          throw new HttpError(403, "lan_ai_disabled", "手机局域网预览不开放 AI 任务查询");
        }
        const run = store.get(route.id);
        if (!run) throw new HttpError(404, "run_not_found", "任务不存在");
        sendJson(response, 200, { run: publicRun(run) });
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        throw new HttpError(404, "api_not_found", "接口不存在");
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        throw new HttpError(405, "method_not_allowed", "静态资源只支持 GET 或 HEAD");
      }
      await serveStatic({ request, response, webRoot });
    } catch (error) {
      sendError(response, error);
    }
  });

  return {
    server,
    store,
    backgroundRemovalStore,
    async waitForIdle() {
      await Promise.allSettled([...inflight, backgroundRemoval.waitForIdle()]);
    },
  };
}

function parseIpv4(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const bytes = parts.map((part) => {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return NaN;
    const parsed = Number(part);
    return parsed <= 255 ? parsed : NaN;
  });
  return bytes.every(Number.isInteger) ? bytes : null;
}

export function isPrivateIpv4(value) {
  const bytes = parseIpv4(value);
  if (!bytes) return false;
  return bytes[0] === 10
    || (bytes[0] === 172 && bytes[1] >= 16 && bytes[1] <= 31)
    || (bytes[0] === 192 && bytes[1] === 168);
}

export function resolveServerAccessConfig(env = process.env) {
  const rawPort = env.SINGLE_IMAGE_STUDIO_PORT;
  const portText = rawPort === undefined || rawPort === "" ? String(DEFAULT_PORT) : String(rawPort);
  if (!/^[1-9][0-9]{0,4}$/.test(portText)) {
    throw new Error("SINGLE_IMAGE_STUDIO_PORT 必须是 1–65535 的整数");
  }
  const port = Number(portText);
  if (port > 65535) throw new Error("SINGLE_IMAGE_STUDIO_PORT 必须是 1–65535 的整数");

  const allowLan = env.SINGLE_IMAGE_STUDIO_ALLOW_LAN === "1";
  const bindHost = String(env.SINGLE_IMAGE_STUDIO_BIND_HOST ?? LOOPBACK_HOST).trim();

  if (!allowLan) {
    if (bindHost !== LOOPBACK_HOST) {
      throw new Error("非本机监听必须同时设置 SINGLE_IMAGE_STUDIO_ALLOW_LAN=1");
    }
    return Object.freeze({ bindHost, port, previewMode: "local" });
  }

  if (!isPrivateIpv4(bindHost)) {
    throw new Error("手机预览必须绑定明确的 RFC1918 私网 IPv4；不允许 0.0.0.0、公网 IP 或主机名");
  }
  return Object.freeze({ bindHost, port, previewMode: "lan" });
}

export function startConfiguredServer(env = process.env) {
  const config = resolveServerAccessConfig(env);
  const app = createImageStudioServer({
    apiKey: env.OPENAI_API_KEY ?? "",
    previewMode: config.previewMode,
  });
  const listening = new Promise((resolveListening, rejectListening) => {
    app.server.once("error", rejectListening);
    app.server.listen(config.port, config.bindHost, () => {
      app.server.removeListener("error", rejectListening);
      const origin = `http://${config.bindHost}:${config.port}`;
      console.log(`Single Image Studio server: ${origin}/`);
      if (config.previewMode === "lan") {
        console.log("LAN preview: local processing only; OpenAI image edits disabled");
      } else {
        console.log(env.OPENAI_API_KEY ? "OpenAI image edits: available" : "OpenAI image edits: OPENAI_API_KEY missing");
      }
      resolveListening(origin);
    });
  });
  return { ...app, config, listening };
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === resolve(modulePath)) {
  try {
    await startConfiguredServer().listening;
  } catch (error) {
    console.error(`Single Image Studio 无法启动：${error.message}`);
    process.exitCode = 1;
  }
}
