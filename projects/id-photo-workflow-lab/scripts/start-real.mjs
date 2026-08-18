import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createAppServer } from '../server.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const python = process.platform === 'win32'
  ? resolve(projectRoot, '.venv', 'Scripts', 'python.exe')
  : resolve(projectRoot, '.venv', 'bin', 'python');
const bridgeScript = resolve(projectRoot, 'runtime', 'hivision_bridge.py');
const model = resolve(projectRoot, 'vendor', 'HivisionIDPhotos', 'hivision', 'creator', 'weights', 'modnet_photographic_portrait_matting.onnx');
const host = '127.0.0.1';
const appPort = Number(process.env.ID_PHOTO_DEMO_PORT ?? 4191);
const bridgePort = Number(process.env.HIVISION_BRIDGE_PORT ?? 8080);
const upstreamUrl = `http://${host}:${bridgePort}`;

for (const [label, path] of [['Python environment', python], ['Hivision bridge', bridgeScript], ['MODNet model', model]]) {
  if (!existsSync(path)) {
    console.error(`${label} is missing: ${path}`);
    console.error('Run: npm.cmd run setup:real');
    process.exit(1);
  }
}

const bridge = spawn(python, [bridgeScript], {
  cwd: projectRoot,
  env: { ...process.env, HIVISION_BRIDGE_PORT: String(bridgePort) },
  stdio: 'inherit',
  windowsHide: true
});
let bridgeReady = false;
for (let attempt = 0; attempt < 80; attempt += 1) {
  if (bridge.exitCode !== null) break;
  try {
    const response = await fetch(`${upstreamUrl}/health`, { signal: AbortSignal.timeout(500) });
    if (response.ok) {
      bridgeReady = true;
      break;
    }
  } catch {
    await delay(250);
  }
}

if (!bridgeReady) {
  bridge.kill();
  console.error('Hivision bridge did not become ready.');
  process.exit(1);
}

const app = createAppServer({ fixtureMode: false, upstreamUrl });
app.listen(appPort, host, () => {
  console.log(`ID Photo Workflow Lab real runtime: http://${host}:${appPort}/`);
});

let closing = false;
function close() {
  if (closing) return;
  closing = true;
  app.close(() => bridge.kill());
  setTimeout(() => process.exit(0), 500).unref();
}

process.on('SIGINT', close);
process.on('SIGTERM', close);
bridge.on('exit', (code) => {
  if (!closing) {
    console.error(`Hivision bridge exited unexpectedly (${code}).`);
    app.close(() => process.exit(code || 1));
  }
});
