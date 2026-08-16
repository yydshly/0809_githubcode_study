import {
  assertBackgroundRemovalProvider,
  BackgroundRemovalProviderError,
} from "./provider.mjs";

const PHOTOROOM_REMOVE_BACKGROUND_URL = "https://sdk.photoroom.com/v1/segment";
const DEFAULT_MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const ERROR_BODY_LIMIT = 64 * 1024;

const SOURCE_EXTENSIONS = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

function assertApiKey(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("PhotoRoom API key must be a non-empty string");
  }
  return value.trim();
}

function assertSource(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("PhotoRoom source must be an object");
  }
  if (!(source.bytes instanceof Uint8Array) || source.bytes.byteLength < 1) {
    throw new TypeError("PhotoRoom source bytes must be non-empty");
  }
  if (!SOURCE_EXTENSIONS[source.mime]) {
    throw new BackgroundRemovalProviderError(
      "provider_input_mime_unsupported",
      "抠图服务只接受 PNG、JPEG 或 WebP 图片",
      { httpStatus: 415 },
    );
  }
}

async function readBoundedBody(response, maxBytes) {
  const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new BackgroundRemovalProviderError(
      "provider_output_too_large",
      "抠图服务返回的图片超过大小限制",
      { httpStatus: 502 },
    );
  }

  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel("response too large").catch(() => {});
      throw new BackgroundRemovalProviderError(
        "provider_output_too_large",
        "抠图服务返回的图片超过大小限制",
        { httpStatus: 502 },
      );
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, length);
}

function providerHttpError(response) {
  const status = response.status;
  const mapping = {
    400: ["provider_input_rejected", "抠图服务拒绝了当前图片"],
    401: ["provider_auth_failed", "抠图服务凭据无效"],
    402: ["provider_billing_required", "抠图服务额度或计费状态不可用"],
    403: ["provider_access_denied", "抠图服务没有授权当前请求"],
    413: ["provider_input_too_large", "图片超过抠图服务的大小限制"],
    415: ["provider_input_mime_unsupported", "抠图服务不支持当前图片格式"],
    429: ["provider_rate_limited", "抠图服务当前请求过多，请稍后手动重试"],
  };
  const [code, message] = mapping[status] ?? [
    status >= 500 ? "provider_service_unavailable" : "provider_request_failed",
    status >= 500 ? "抠图服务暂时不可用" : "抠图服务没有接受当前请求",
  ];
  return new BackgroundRemovalProviderError(code, message, { httpStatus: status });
}

export function createPhotoroomBackgroundRemovalProvider({
  apiKey,
  fetchImpl = globalThis.fetch,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
} = {}) {
  const resolvedApiKey = assertApiKey(apiKey);
  if (typeof fetchImpl !== "function") throw new TypeError("PhotoRoom fetchImpl must be a function");
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) {
    throw new TypeError("PhotoRoom maxOutputBytes must be a positive safe integer");
  }

  const provider = Object.freeze({
    id: "photoroom.background-removal",
    version: "1.0.0",
    mode: "remote",
    async removeBackground({ source, signal, context }) {
      assertSource(source);
      if (!context || typeof context.runId !== "string" || !context.runId) {
        throw new TypeError("PhotoRoom context.runId is required");
      }

      const form = new FormData();
      form.append(
        "image_file",
        new Blob([source.bytes], { type: source.mime }),
        `source.${SOURCE_EXTENSIONS[source.mime]}`,
      );
      form.append("format", "png");
      form.append("channels", "rgba");
      form.append("size", "full");
      form.append("crop", "false");
      form.append("despill", "false");

      let response;
      try {
        response = await fetchImpl(PHOTOROOM_REMOVE_BACKGROUND_URL, {
          method: "POST",
          headers: { "X-Api-Key": resolvedApiKey },
          body: form,
          signal,
        });
      } catch (error) {
        throw new BackgroundRemovalProviderError(
          "provider_transport_unknown",
          "无法确认抠图服务是否收到请求；不会自动重复提交",
          { definitive: false },
        );
      }

      if (!response.ok) {
        await readBoundedBody(response, ERROR_BODY_LIMIT).catch(() => Buffer.alloc(0));
        throw providerHttpError(response);
      }

      const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
      if (!contentType.startsWith("image/png")) {
        throw new BackgroundRemovalProviderError(
          "provider_output_mime_invalid",
          "抠图服务没有返回 PNG 图片",
          { httpStatus: 502 },
        );
      }
      const bytes = await readBoundedBody(response, maxOutputBytes);
      const providerRequestId = response.headers.get("x-request-id")
        ?? response.headers.get("x-photoroom-request-id")
        ?? `client-run:${context.runId}`;
      return {
        providerRequestId,
        image: { bytes, mime: "image/png", hasAlpha: true },
      };
    },
  });
  assertBackgroundRemovalProvider(provider);
  return provider;
}
