import { createHash, timingSafeEqual } from "node:crypto";

import { createPhotoroomBackgroundRemovalProvider } from "../../server/providers/background-removal/photoroom-provider.mjs";
import {
  BackgroundRemovalProviderError,
  validateBackgroundRemovalProviderOutput,
} from "../../server/providers/background-removal/provider.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_JSON_BODY_BYTES = 24 * 1024 * 1024;
const SOURCE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAGIC = Object.freeze({
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff]),
  "image/png": Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  "image/webp": Buffer.from("RIFF", "ascii"),
});

export class PublicBackgroundRemovalError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "PublicBackgroundRemovalError";
    this.status = status;
    this.code = code;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PublicBackgroundRemovalError(400, "invalid_request", `${label}必须是对象`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new PublicBackgroundRemovalError(400, "unsupported_request_field", `${label}包含不支持的字段`);
  }
}

function exactUtc(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new PublicBackgroundRemovalError(400, "invalid_background_removal_consent", `${label}必须是精确 UTC 时间`);
  }
  return value;
}

function canonicalBase64(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    throw new PublicBackgroundRemovalError(400, "invalid_image_data_url", `${label}不是规范 base64`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    throw new PublicBackgroundRemovalError(400, "invalid_image_data_url", `${label}不是规范 base64`);
  }
  return bytes;
}

function hasExpectedMagic(bytes, mime) {
  const signature = MAGIC[mime];
  if (!signature || bytes.length < signature.length || !bytes.subarray(0, signature.length).equals(signature)) return false;
  return mime !== "image/webp" || bytes.length >= 12 && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

function parseImageDataUrl(value) {
  if (typeof value !== "string") {
    throw new PublicBackgroundRemovalError(400, "invalid_image_data_url", "sourceImage必须是图片 data URL");
  }
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/u.exec(value);
  if (!match || !SOURCE_MIME_TYPES.has(match[1])) {
    throw new PublicBackgroundRemovalError(400, "invalid_image_data_url", "sourceImage必须是 PNG、JPEG 或 WebP data URL");
  }
  const bytes = canonicalBase64(match[2], "sourceImage");
  if (bytes.length < 1 || bytes.length > MAX_IMAGE_BYTES) {
    throw new PublicBackgroundRemovalError(413, "invalid_image_size", "图片必须小于或等于 16 MB");
  }
  if (!hasExpectedMagic(bytes, match[1])) {
    throw new PublicBackgroundRemovalError(400, "image_mime_mismatch", "图片内容与声明格式不一致");
  }
  return Object.freeze({ bytes, mime: match[1], sha256: sha256(bytes) });
}

export function parsePublicBackgroundRemovalPayload(payload) {
  exactKeys(payload, ["clientRunId", "sourceRevision", "geometryRevision", "sourceImage", "sourceSha256", "consent"], "请求");
  if (typeof payload.clientRunId !== "string" || !UUID_PATTERN.test(payload.clientRunId)) {
    throw new PublicBackgroundRemovalError(400, "invalid_client_run_id", "clientRunId必须是有效 UUID");
  }
  if (!Number.isInteger(payload.sourceRevision) || payload.sourceRevision < 1) {
    throw new PublicBackgroundRemovalError(400, "invalid_source_revision", "sourceRevision必须是正整数");
  }
  if (!Number.isInteger(payload.geometryRevision) || payload.geometryRevision < 1) {
    throw new PublicBackgroundRemovalError(400, "invalid_geometry_revision", "geometryRevision必须是正整数");
  }
  const source = parseImageDataUrl(payload.sourceImage);
  if (typeof payload.sourceSha256 !== "string" || !SHA256_PATTERN.test(payload.sourceSha256.toLowerCase()) || payload.sourceSha256.toLowerCase() !== source.sha256) {
    throw new PublicBackgroundRemovalError(400, "source_hash_mismatch", "sourceSha256与图片 bytes 不一致");
  }
  exactKeys(payload.consent, ["accepted", "acceptedAt", "policyVersion"], "consent");
  if (payload.consent.accepted !== true || payload.consent.policyVersion !== "background-removal-consent.v0") {
    throw new PublicBackgroundRemovalError(400, "background_removal_consent_required", "发送图片前必须明确同意远程抠图处理");
  }
  const consent = Object.freeze({
    accepted: true,
    acceptedAt: exactUtc(payload.consent.acceptedAt, "consent.acceptedAt"),
    policyVersion: payload.consent.policyVersion,
  });
  return Object.freeze({
    clientRunId: payload.clientRunId.toLowerCase(),
    sourceRevision: payload.sourceRevision,
    geometryRevision: payload.geometryRevision,
    source,
    consent,
  });
}

function publicAccessPolicy(env) {
  const key = typeof env.PHOTOROOM_API_KEY === "string" ? env.PHOTOROOM_API_KEY.trim() : "";
  if (!key) return "none";
  return key.startsWith("sandbox_") ? "open-sandbox" : "shared-demo-token";
}

function configurationReason(env) {
  const key = typeof env.PHOTOROOM_API_KEY === "string" ? env.PHOTOROOM_API_KEY.trim() : "";
  if (env.PHOTOROOM_ENABLED !== "true" || !key) return "not_configured";
  if (publicAccessPolicy(env) === "shared-demo-token"
    && (typeof env.BACKGROUND_REMOVAL_ACCESS_TOKEN !== "string" || env.BACKGROUND_REMOVAL_ACCESS_TOKEN.length < 16)) {
    return "access_token_not_configured";
  }
  return null;
}

export function publicBackgroundRemovalStatus(env = process.env) {
  const reason = configurationReason(env);
  const accessPolicy = publicAccessPolicy(env);
  if (reason !== null) {
    return Object.freeze({
      available: false,
      provider: null,
      reason,
      runStore: "stateless",
      previewMode: "public-hybrid",
      accessPolicy,
    });
  }
  const sandbox = env.PHOTOROOM_API_KEY.trim().startsWith("sandbox_");
  return Object.freeze({
    available: true,
    provider: Object.freeze({
      id: "photoroom.background-removal",
      version: "1.0.0",
      mode: "remote",
      environment: sandbox ? "sandbox" : "production",
    }),
    reason: null,
    runStore: "stateless",
    previewMode: "public-hybrid",
    accessPolicy,
  });
}

export function assertPublicBackgroundRemovalAccess(candidate, env = process.env) {
  if (publicAccessPolicy(env) === "open-sandbox") return;
  const expected = typeof env.BACKGROUND_REMOVAL_ACCESS_TOKEN === "string"
    ? Buffer.from(env.BACKGROUND_REMOVAL_ACCESS_TOKEN, "utf8")
    : Buffer.alloc(0);
  const actual = typeof candidate === "string" ? Buffer.from(candidate, "utf8") : Buffer.alloc(0);
  if (expected.length < 16 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new PublicBackgroundRemovalError(401, "background_removal_access_required", "远程体验码无效或尚未填写");
  }
}

function providerError(error) {
  return {
    code: String(error?.code ?? "background_removal_status_unknown").slice(0, 100),
    message: String(error?.message ?? "无法确认抠图是否完成；不会自动重复提交").slice(0, 1000),
    httpStatus: Number.isInteger(error?.httpStatus) ? error.httpStatus : null,
  };
}

export async function executePublicBackgroundRemoval({
  payload,
  accessToken,
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date().toISOString(),
  timeoutMs = 28_000,
} = {}) {
  const status = publicBackgroundRemovalStatus(env);
  if (!status.available) {
    throw new PublicBackgroundRemovalError(503, "background_removal_unavailable", "公开抠图服务尚未配置");
  }
  assertPublicBackgroundRemovalAccess(accessToken, env);
  const input = parsePublicBackgroundRemovalPayload(payload);
  const createdAt = now();
  const baseRun = {
    id: input.clientRunId,
    taskId: "BACKGROUND_REMOVAL",
    status: "running",
    requestId: null,
    result: null,
    error: null,
    createdAt,
    updatedAt: createdAt,
    startedAt: createdAt,
    completedAt: null,
    input: {
      sourceRevision: input.sourceRevision,
      geometryRevision: input.geometryRevision,
      sourceSha256: input.source.sha256,
      sourceMime: input.source.mime,
      sourceBytes: input.source.bytes.length,
      consentPolicyVersion: input.consent.policyVersion,
    },
  };
  const provider = createPhotoroomBackgroundRemovalProvider({ apiKey: env.PHOTOROOM_API_KEY, fetchImpl });
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Background removal timed out", "TimeoutError"));
  }, timeoutMs);
  try {
    const rawOutput = await provider.removeBackground({
      source: {
        bytes: input.source.bytes,
        mime: input.source.mime,
        sha256: input.source.sha256,
        sourceRevision: input.sourceRevision,
        geometryRevision: input.geometryRevision,
      },
      signal: controller.signal,
      context: { runId: input.clientRunId, consentPolicyVersion: input.consent.policyVersion },
    });
    const output = validateBackgroundRemovalProviderOutput(rawOutput);
    const completedAt = now();
    return Object.freeze({
      ...baseRun,
      status: "succeeded",
      requestId: output.providerRequestId,
      updatedAt: completedAt,
      completedAt,
      result: Object.freeze({
        image: `data:image/png;base64,${output.image.bytes.toString("base64")}`,
        imageSha256: sha256(output.image.bytes),
        imageBytes: output.image.bytes.length,
        mime: output.image.mime,
        hasAlpha: true,
        width: output.image.width,
        height: output.image.height,
        provider: status.provider,
        persistence: "none",
      }),
    });
  } catch (error) {
    const completedAt = now();
    const definitive = error instanceof BackgroundRemovalProviderError && error.definitive && !timedOut;
    return Object.freeze({
      ...baseRun,
      status: definitive ? "failed" : "unknown",
      updatedAt: completedAt,
      completedAt,
      error: providerError(timedOut ? {
        code: "background_removal_timeout",
        message: "抠图服务超时；无法确认供应商是否完成，不会自动重复提交",
      } : error),
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function readNodeJsonBody(request) {
  const contentType = String(request.headers?.["content-type"] ?? "").toLowerCase();
  if (!/^application\/json(?:\s*;|$)/u.test(contentType)) {
    throw new PublicBackgroundRemovalError(415, "unsupported_media_type", "请求必须使用 application/json");
  }
  const declaredLength = Number.parseInt(String(request.headers?.["content-length"] ?? ""), 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    throw new PublicBackgroundRemovalError(413, "request_too_large", "图片请求过大");
  }
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body) && !Array.isArray(request.body)) {
    return request.body;
  }
  if (typeof request.body === "string" || Buffer.isBuffer(request.body)) {
    const raw = Buffer.from(request.body);
    if (raw.length > MAX_JSON_BODY_BYTES) throw new PublicBackgroundRemovalError(413, "request_too_large", "图片请求过大");
    try {
      return JSON.parse(raw.toString("utf8"));
    } catch {
      throw new PublicBackgroundRemovalError(400, "invalid_json", "请求不是有效 JSON");
    }
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_JSON_BODY_BYTES) throw new PublicBackgroundRemovalError(413, "request_too_large", "图片请求过大");
    chunks.push(Buffer.from(chunk));
  }
  if (length === 0) throw new PublicBackgroundRemovalError(400, "empty_json", "请求内容不能为空");
  try {
    return JSON.parse(Buffer.concat(chunks, length).toString("utf8"));
  } catch {
    throw new PublicBackgroundRemovalError(400, "invalid_json", "请求不是有效 JSON");
  }
}

export function sendNodeJson(response, status, payload, headers = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", String(body.length));
  response.setHeader("X-Content-Type-Options", "nosniff");
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  response.end(body);
}

export function sendNodeError(response, error) {
  const status = error instanceof PublicBackgroundRemovalError ? error.status : 500;
  const code = error instanceof PublicBackgroundRemovalError ? error.code : "server_error";
  const message = error instanceof PublicBackgroundRemovalError ? error.message : "服务端发生异常";
  sendNodeJson(response, status, { error: { code, message, requestId: null } });
}
