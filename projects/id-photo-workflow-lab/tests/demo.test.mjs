import assert from 'node:assert/strict';
import { once } from 'node:events';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../server.mjs';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function withServer(options, run) {
  const server = createAppServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function pngSignature(base64) {
  return Buffer.from(base64, 'base64').subarray(0, 8).toString('hex');
}

test('fixture mode serves the meaningful page and truthful status', async () => {
  await withServer({ fixtureMode: true }, async (baseUrl) => {
    const page = await fetch(`${baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /证件照工作流实验室/);

    const status = await (await fetch(`${baseUrl}/api/hivision/status`)).json();
    assert.equal(status.connected, true);
    assert.equal(status.mode, 'fixture');
    assert.equal(status.modelExecuted, false);
    assert.equal(status.label, '交互夹具已就绪');
    assert.deepEqual(Object.keys(status.capabilities.paper_sizes), ['six-inch', 'five-inch', 'a4', '3r', '4r']);
    assert.equal(status.capabilities.formal_wear.state, 'waiting');
  });
});

test('fixture mode closes idphoto, background and layout response contracts', async () => {
  await withServer({ fixtureMode: true }, async (baseUrl) => {
    const source = await (await fetch(`${baseUrl}/fixture-source.png`)).blob();
    const idForm = new FormData();
    idForm.append('input_image', source, 'fixture.png');
    idForm.append('height', '413');
    idForm.append('width', '295');
    const idResult = await (await fetch(`${baseUrl}/api/hivision/idphoto`, { method: 'POST', body: idForm })).json();
    assert.equal(idResult.status, true);
    assert.equal(idResult.fixture, true);
    assert.equal(pngSignature(idResult.image_base64_standard), '89504e470d0a1a0a');
    assert.equal(pngSignature(idResult.image_base64_hd), '89504e470d0a1a0a');

    const backgroundForm = new FormData();
    backgroundForm.append('input_image_base64', idResult.image_base64_standard);
    backgroundForm.append('color', '4b8bc4');
    const background = await (await fetch(`${baseUrl}/api/hivision/add-background`, { method: 'POST', body: backgroundForm })).json();
    assert.equal(background.status, true);
    assert.equal(pngSignature(background.image_base64), '89504e470d0a1a0a');

    const layoutForm = new FormData();
    layoutForm.append('input_image_base64', background.image_base64);
    layoutForm.append('fixture_color', '4b8bc4');
    layoutForm.append('paper', 'a4');
    const layout = await (await fetch(`${baseUrl}/api/hivision/layout`, { method: 'POST', body: layoutForm })).json();
    assert.equal(layout.status, true);
    assert.equal(layout.paper, 'a4');
    assert.equal(layout.layout_width, 3508);
    assert.equal(layout.layout_height, 2479);
    assert.equal(pngSignature(layout.image_base64), '89504e470d0a1a0a');
  });
});

test('adapter rejects arbitrary routes, methods and non-multipart payloads', async () => {
  await withServer({ fixtureMode: true }, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/hivision/unknown`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/hivision/idphoto`)).status, 405);
    assert.equal((await fetch(`${baseUrl}/api/hivision/idphoto`, { method: 'POST', body: '{}' })).status, 415);
    assert.equal((await fetch(`${baseUrl}/../server.mjs`)).status, 404);
  });
});

test('normal mode reports a missing upstream without inventing capability', async () => {
  await withServer({ fixtureMode: false, upstreamUrl: 'http://127.0.0.1:1' }, async (baseUrl) => {
    const status = await (await fetch(`${baseUrl}/api/hivision/status`)).json();
    assert.equal(status.connected, false);
    assert.equal(status.mode, 'upstream');
    assert.equal(status.modelExecuted, false);
  });
});

test('GitHub Pages showcase is static, subpath-safe, and owns all five paper previews', async () => {
  const html = await readFile(resolve(PROJECT_ROOT, 'public-site/index.html'), 'utf8');
  const script = await readFile(resolve(PROJECT_ROOT, 'public-site/showcase.js'), 'utf8');
  assert.doesNotMatch(html, /type="file"|\/api\//);
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.match(html, /\.\/styles\.css/);
  assert.match(html, /\.\/showcase\.js/);
  for (const paper of ['six-inch', 'five-inch', 'a4', '3r', '4r']) {
    await access(resolve(PROJECT_ROOT, `public-site/assets/layout-${paper}.png`));
    await access(resolve(PROJECT_ROOT, `public-site/assets/layout-${paper}-preview.webp`));
  }
});
