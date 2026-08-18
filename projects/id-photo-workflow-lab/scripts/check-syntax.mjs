import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'server.mjs',
  'scripts/start-real.mjs',
  'web/app.js',
  'public-site/showcase.js',
  'scripts/validate-project.mjs',
  'scripts/check-syntax.mjs',
  'tests/demo.test.mjs'
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
