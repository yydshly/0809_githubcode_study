import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = join(PROJECT_ROOT, "web");
const DEFAULT_OUTPUT = join(PROJECT_ROOT, "dist-public");
const PUBLIC_PAGES = Object.freeze(["index.html", "examples.html", "straighten-reference.html", "old-photo-reference.html"]);
const ENTRY_MODULES = Object.freeze(["main.js", "examples.js", "straighten-reference.js"]);
const STYLES = Object.freeze(["styles.css", "examples.css"]);

function publicHtml(source, pageName) {
  let html = source.replace(/<a href="\.\/quality-hub\.html">内部质量(?:入口)?<\/a>/gu, "");
  if (pageName === "index.html") {
    html = html.replace("<html lang=\"zh-CN\">", "<html lang=\"zh-CN\" data-deployment-mode=\"public-hybrid\">");
  }
  return html;
}

async function copyFile(relativePath, outputRoot) {
  const source = join(WEB_ROOT, relativePath);
  const destination = join(outputRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}

async function copyModuleGraph(entry, outputRoot, copied = new Set()) {
  if (copied.has(entry)) return;
  copied.add(entry);
  const sourcePath = join(WEB_ROOT, entry);
  const source = await readFile(sourcePath, "utf8");
  await mkdir(dirname(join(outputRoot, entry)), { recursive: true });
  await writeFile(join(outputRoot, entry), source);
  for (const match of source.matchAll(/\bfrom\s+["'](\.\/[^"']+\.js)["']/gu)) {
    const dependency = relative(WEB_ROOT, resolve(dirname(sourcePath), match[1])).replaceAll("\\", "/");
    if (dependency.startsWith("..")) throw new Error(`public module escapes web root: ${entry} -> ${match[1]}`);
    await copyModuleGraph(dependency, outputRoot, copied);
  }
}

export async function buildPublicPreview({ outputRoot = DEFAULT_OUTPUT } = {}) {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  for (const page of PUBLIC_PAGES) {
    const source = await readFile(join(WEB_ROOT, page), "utf8");
    await writeFile(join(outputRoot, page), publicHtml(source, page));
  }
  for (const style of STYLES) await copyFile(style, outputRoot);
  const copiedModules = new Set();
  for (const entry of ENTRY_MODULES) await copyModuleGraph(entry, outputRoot, copiedModules);
  await cp(join(WEB_ROOT, "demo-assets"), join(outputRoot, "demo-assets"), { recursive: true });
  return Object.freeze({ outputRoot, pages: PUBLIC_PAGES, modules: Object.freeze([...copiedModules].sort()) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await buildPublicPreview();
  process.stdout.write(`Public preview built: ${report.pages.length} pages, ${report.modules.length} modules -> ${report.outputRoot}\n`);
}
