import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = {
  'README.md': ['# ID Photo Workflow Lab', '## 已实现 Demo', 'npm.cmd run start:fixture'],
  'UPSTREAM.md': ['5c191e2577f14755a69d9df6db415fab23aca484', '## 模型方案记录', '## API 与 bridge 来源'],
  'RESEARCH.md': ['## 能力结论', '## 展示策略', '## 复用策略'],
  'HIVISION_CAPABILITY_MAP.md': ['## 用户可见能力', '## 原理分层', '## API 合同'],
  'RELATED_TECHNOLOGY_NOTES.md': ['## IMG.LY Background Removal JS', '## MagicQuill', '## 对当前项目的决策'],
  'DEMO_ARCHITECTURE.md': ['## 两种模式', '## 安全与数据', '## 状态机'],
  'RUNTIME_RECEIPT.md': ['5c191e2577f14755a69d9df6db415fab23aca484', '07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9', '## 真实 smoke'],
  'DESIGN_CONTRACT.md': ['Primary journey:', 'Coverage record:', '用户明确要求构建 Demo'],
  'BROWSER_ACCEPTANCE.md': ['# 浏览器验收'],
  'STATIC_PAGES_ACCEPTANCE.md': ['# GitHub Pages 静态站验收', 'NO_HORIZONTAL_OVERFLOW', 'showcase.js'],
  'STATIC_DISPLAY_REPAIR.md': ['# 静态效果图显示修复', '543.5×760.9', 'Decision: pass'],
  'public-site/index.html': ['GitHub Pages 静态快照', 'Static effect demo', '五种纸张'],
  'public-site/assets/PROVENANCE.md': ['fb37e342480258b723c38d2c1887934a87e532ddc68603ad4d8bc288e6428bb2', 'Hivision commit']
};
const forbidden = [/\{\{[A-Z0-9_]+\}\}/u, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u];
const issues = [];

for (const [relativePath, requiredText] of Object.entries(requiredFiles)) {
  let content;
  try {
    content = await readFile(resolve(projectRoot, relativePath), 'utf8');
  } catch (error) {
    issues.push(`${relativePath}: cannot read (${error.code ?? error.message})`);
    continue;
  }
  for (const text of requiredText) {
    if (!content.includes(text)) issues.push(`${relativePath}: missing ${JSON.stringify(text)}`);
  }
  for (const pattern of forbidden) {
    if (pattern.test(content)) issues.push(`${relativePath}: forbidden pattern ${pattern}`);
  }
}

if (issues.length) {
  console.error('Project validation failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log('Project validation passed: capability, principle, API boundary, demo contract and browser record present.');
}
