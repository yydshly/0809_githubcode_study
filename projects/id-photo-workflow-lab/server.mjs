import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const WEB_ROOT = resolve(PROJECT_ROOT, 'web');
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_UPSTREAM_BYTES = 32 * 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png'
};

const PROXY_ROUTES = new Map([
  ['/api/hivision/idphoto', '/idphoto'],
  ['/api/hivision/add-background', '/add_background'],
  ['/api/hivision/layout', '/layout']
]);

const PAPER_SIZES = {
  'six-inch': { label: '六寸', height: 1205, width: 1795 },
  'five-inch': { label: '五寸', height: 1051, width: 1500 },
  a4: { label: 'A4', height: 2479, width: 3508 },
  '3r': { label: '3R', height: 1051, width: 1500 },
  '4r': { label: '4R', height: 1205, width: 1795 }
};

function sendJson(response, statusCode, value) {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'cache-control': 'no-store'
  });
  response.end(body);
}

function securityHeaders() {
  return {
    'content-security-policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cross-origin-opener-policy': 'same-origin'
  };
}

async function readBoundedBody(request) {
  const declared = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    const error = new Error('请求超过 12 MiB 上限');
    error.code = 'REQUEST_TOO_LARGE';
    throw error;
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_REQUEST_BYTES) {
      const error = new Error('请求超过 12 MiB 上限');
      error.code = 'REQUEST_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return result;
}

function createPng(width, height, pixelAt) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (1 + width * 4);
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelAt(x, y);
      const offset = rowOffset + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function parseHexColor(value, fallback = [238, 244, 250]) {
  const normalized = String(value ?? '').replace(/^#/, '');
  if (!/^[a-f0-9]{6}$/i.test(normalized)) return fallback;
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
}

function portraitPixel(x, y, width, height, background = null) {
  const nx = x / width;
  const ny = y / height;
  const base = background ? [...background, 255] : [255, 255, 255, 0];
  const head = ((nx - 0.5) / 0.18) ** 2 + ((ny - 0.33) / 0.145) ** 2;
  const hair = ((nx - 0.5) / 0.195) ** 2 + ((ny - 0.285) / 0.13) ** 2;
  const shoulders = ((nx - 0.5) / 0.39) ** 2 + ((ny - 0.82) / 0.32) ** 2;
  const neck = Math.abs(nx - 0.5) < 0.085 && ny > 0.43 && ny < 0.64;
  if (shoulders <= 1) return [36, 66, 98, 255];
  if (neck) return [224, 174, 146, 255];
  if (head <= 1) {
    if (hair <= 1 && ny < 0.28 + Math.abs(nx - 0.5) * 0.42) return [49, 42, 39, 255];
    const cheek = Math.max(0, 1 - Math.abs(nx - 0.5) * 5);
    return [225 + Math.round(cheek * 8), 178 + Math.round(cheek * 5), 150, 255];
  }
  return base;
}

function createPortraitPng(width, height, background = null) {
  return createPng(width, height, (x, y) => portraitPixel(x, y, width, height, background));
}

function createLayoutPng(background = [75, 139, 196]) {
  const width = 1200;
  const height = 800;
  const tileWidth = 170;
  const tileHeight = 238;
  const origins = [];
  for (const row of [0, 1]) {
    for (const column of [0, 1, 2, 3, 4]) {
      origins.push([82 + column * 218, 126 + row * 310]);
    }
  }
  return createPng(width, height, (x, y) => {
    for (const [ox, oy] of origins) {
      if (x >= ox && x < ox + tileWidth && y >= oy && y < oy + tileHeight) {
        const border = x === ox || y === oy || x === ox + tileWidth - 1 || y === oy + tileHeight - 1;
        if (border) return [189, 198, 207, 255];
        return portraitPixel(x - ox, y - oy, tileWidth, tileHeight, background);
      }
    }
    return [249, 248, 245, 255];
  });
}

function extractMultipartField(buffer, fieldName) {
  const source = buffer.toString('latin1');
  const pattern = new RegExp(`name="${fieldName}"(?:;[^\\r\\n]*)?\\r\\n(?:Content-Type:[^\\r\\n]*\\r\\n)?\\r\\n([^\\r\\n]*)`, 'i');
  return pattern.exec(source)?.[1]?.trim() ?? null;
}

function fixtureResponse(pathname, body) {
  if (pathname === '/api/hivision/idphoto') {
    return {
      status: true,
      fixture: true,
      image_base64_standard: createPortraitPng(295, 413).toString('base64'),
      image_base64_hd: createPortraitPng(590, 826).toString('base64')
    };
  }
  if (pathname === '/api/hivision/add-background') {
    const color = parseHexColor(extractMultipartField(body, 'color'));
    return {
      status: true,
      fixture: true,
      image_base64: createPortraitPng(295, 413, color).toString('base64')
    };
  }
  const color = parseHexColor(extractMultipartField(body, 'fixture_color'), [75, 139, 196]);
  const paper = extractMultipartField(body, 'paper') ?? 'six-inch';
  const paperSize = PAPER_SIZES[paper] ?? PAPER_SIZES['six-inch'];
  return {
    status: true,
    fixture: true,
    paper,
    paper_label: paperSize.label,
    layout_width: paperSize.width,
    layout_height: paperSize.height,
    image_base64: createLayoutPng(color).toString('base64')
  };
}

async function serveStatic(request, response, pathname, fixtureMode) {
  if (pathname === '/fixture-source.png' && fixtureMode) {
    const body = createPortraitPng(420, 588, [226, 222, 214]);
    response.writeHead(200, { ...securityHeaders(), 'content-type': 'image/png', 'content-length': body.length, 'cache-control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
    return;
  }

  const requested = pathname === '/' ? '/index.html' : pathname;
  let decoded;
  try {
    decoded = decodeURIComponent(requested);
  } catch {
    sendJson(response, 400, { error: 'INVALID_PATH' });
    return;
  }
  const filePath = resolve(WEB_ROOT, `.${decoded}`);
  if (filePath !== WEB_ROOT && !filePath.startsWith(`${WEB_ROOT}${sep}`)) {
    sendJson(response, 404, { error: 'NOT_FOUND' });
    return;
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      ...securityHeaders(),
      'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    sendJson(response, 404, { error: 'NOT_FOUND' });
  }
}

export function createAppServer({ fixtureMode = false, upstreamUrl = 'http://127.0.0.1:8080' } = {}) {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = url.pathname;

    if (pathname === '/api/hivision/status') {
      if (request.method !== 'GET') {
        sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
        return;
      }
      if (fixtureMode) {
        sendJson(response, 200, {
          connected: true,
          mode: 'fixture',
          modelExecuted: false,
          label: '交互夹具已就绪',
          runtime: { python: null, opencv: null, onnxruntime: null, onnx_device: null, providers: [] },
          models: [],
          capabilities: {
            offline_cpu_matting: false,
            standard_sizes: true,
            paper_sizes: PAPER_SIZES,
            beauty: false,
            edge_cloud_face_plus: false,
            formal_wear: { state: 'waiting', implemented: false }
          }
        });
        return;
      }
      try {
        const statusResponse = await fetch(new URL('/health', upstreamUrl), { signal: AbortSignal.timeout(3000) });
        if (!statusResponse.ok) throw new Error('UPSTREAM_HEALTH_FAILED');
        const health = await statusResponse.json();
        sendJson(response, 200, { ...health, connected: true, modelExecuted: false });
      } catch {
        sendJson(response, 200, { connected: false, mode: 'upstream', modelExecuted: false, label: 'Hivision 未连接' });
      }
      return;
    }

    if (PROXY_ROUTES.has(pathname)) {
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
        return;
      }
      const contentType = request.headers['content-type'] ?? '';
      if (!contentType.startsWith('multipart/form-data;')) {
        sendJson(response, 415, { error: 'MULTIPART_REQUIRED' });
        return;
      }
      let body;
      try {
        body = await readBoundedBody(request);
      } catch (error) {
        sendJson(response, error.code === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: error.code ?? 'REQUEST_READ_FAILED' });
        return;
      }
      if (fixtureMode) {
        sendJson(response, 200, fixtureResponse(pathname, body));
        return;
      }
      try {
        const upstreamResponse = await fetch(new URL(PROXY_ROUTES.get(pathname), upstreamUrl), {
          method: 'POST',
          headers: { 'content-type': contentType },
          body,
          signal: AbortSignal.timeout(120000)
        });
        const upstreamBody = Buffer.from(await upstreamResponse.arrayBuffer());
        if (upstreamBody.length > MAX_UPSTREAM_BYTES) {
          sendJson(response, 502, { error: 'UPSTREAM_RESPONSE_TOO_LARGE' });
          return;
        }
        response.writeHead(upstreamResponse.status, {
          'content-type': upstreamResponse.headers.get('content-type') ?? 'application/json; charset=utf-8',
          'content-length': upstreamBody.length,
          'cache-control': 'no-store'
        });
        response.end(upstreamBody);
      } catch (error) {
        sendJson(response, 502, { error: error.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE' });
      }
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' });
      return;
    }
    await serveStatic(request, response, pathname, fixtureMode);
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const fixtureMode = process.argv.includes('--fixture');
  const host = '127.0.0.1';
  const port = Number(process.env.ID_PHOTO_DEMO_PORT ?? 4191);
  const upstreamUrl = process.env.HIVISION_API_URL ?? 'http://127.0.0.1:8080';
  const server = createAppServer({ fixtureMode, upstreamUrl });
  server.listen(port, host, () => {
    console.log(`ID Photo Workflow Lab: http://${host}:${port}/`);
    console.log(fixtureMode ? 'Mode: fixture (no model execution)' : `Mode: Hivision upstream ${upstreamUrl}`);
  });
}
