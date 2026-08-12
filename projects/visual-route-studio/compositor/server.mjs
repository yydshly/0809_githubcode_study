import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number.parseInt(process.env.IMAGE_STUDIO_PORT ?? "4332", 10);
const apiKey = process.env.OPENAI_API_KEY ?? "";
const maxBodyBytes = 42 * 1024 * 1024;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error("图片请求过大"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("请求格式无效"), { status: 400 });
  }
}

function parseDataUrl(value, fallbackName) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value ?? "");
  if (!match) throw Object.assign(new Error(`${fallbackName}不是可用的 PNG、JPEG 或 WebP 图片`), { status: 400 });
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 20 * 1024 * 1024) {
    throw Object.assign(new Error(`${fallbackName}大小不符合要求`), { status: 400 });
  }
  const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
  return { bytes, mime: match[1], name: `${fallbackName}.${extension}` };
}

async function generateImage(payload) {
  if (!apiKey) {
    throw Object.assign(new Error("服务端尚未配置 OPENAI_API_KEY"), {
      status: 503,
      code: "api_key_missing",
    });
  }
  const sourceValues = Array.isArray(payload.sourceImages) ? payload.sourceImages.slice(0, 12) : [payload.sourceImage];
  const sources = sourceValues.filter(Boolean).map((value, index) => parseDataUrl(value, `source-${index + 1}`));
  if (!sources.length) throw Object.assign(new Error("至少需要一张来源图片"), { status: 400 });
  const reference = parseDataUrl(payload.referenceImage, "reference");
  const prompt = String(payload.prompt ?? "").trim().slice(0, 4000);
  if (!prompt) throw Object.assign(new Error("生成说明不能为空"), { status: 400 });

  const form = new FormData();
  form.append("model", "gpt-image-2");
  sources.forEach((source) => form.append("image[]", new Blob([source.bytes], { type: source.mime }), source.name));
  form.append("image[]", new Blob([reference.bytes], { type: reference.mime }), reference.name);
  form.append("prompt", prompt);
  form.append("quality", payload.quality === "high" ? "high" : payload.quality === "low" ? "low" : "medium");
  form.append("size", "1024x1536");
  form.append("output_format", "png");

  const upstream = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(180_000),
  });
  const requestId = upstream.headers.get("x-request-id");
  const result = await upstream.json();
  if (!upstream.ok) {
    const error = result?.error ?? {};
    throw Object.assign(new Error(error.message ?? "图片生成失败"), {
      status: upstream.status,
      code: error.code ?? error.type ?? "generation_failed",
      requestId,
    });
  }
  const imageBase64 = result?.data?.[0]?.b64_json;
  if (!imageBase64) throw Object.assign(new Error("模型没有返回图片结果"), { status: 502, requestId });
  return {
    image: `data:image/png;base64,${imageBase64}`,
    model: "gpt-image-2",
    requestId,
    usage: result.usage ?? null,
  };
}

async function serveStatic(requestUrl, response) {
  const url = new URL(requestUrl, `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/compositor/";
  if (pathname.endsWith("/")) pathname += "index.html";
  const target = resolve(projectRoot, `.${pathname}`);
  if (target !== projectRoot && !target.startsWith(`${projectRoot}${sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("Not a file");
    const body = await readFile(target);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(target).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url?.startsWith("/api/status")) {
      sendJson(response, 200, {
        available: Boolean(apiKey),
        model: "gpt-image-2",
        message: apiKey ? "AI 图片生成服务已连接" : "需要在服务端配置 OPENAI_API_KEY",
      });
      return;
    }
    if (request.method === "POST" && request.url === "/api/generate") {
      const payload = await readJson(request);
      sendJson(response, 200, await generateImage(payload));
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: { code: "method_not_allowed", message: "不支持此请求" } });
      return;
    }
    await serveStatic(request.url ?? "/", response);
  } catch (error) {
    sendJson(response, error.status ?? 500, {
      error: {
        code: error.code ?? "server_error",
        message: error.message ?? "服务异常",
        requestId: error.requestId ?? null,
      },
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Image Product Studio: http://127.0.0.1:${port}/compositor/`);
  console.log(apiKey ? "AI generation: connected" : "AI generation: OPENAI_API_KEY missing");
});
