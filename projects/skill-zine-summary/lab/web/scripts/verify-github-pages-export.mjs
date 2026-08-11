import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const outputRoot = path.resolve(process.env.GITHUB_PAGES_OUTPUT ?? "github-pages-dist");
const basePath = (process.env.GITHUB_PAGES_BASE_PATH ?? "/0809_githubcode_study").replace(/\/$/, "");
const evidenceOrigin = (process.env.RESEARCH_EVIDENCE_ORIGIN ?? "https://skill-zine-private-lab.yydshly.chatgpt.site").replace(/\/$/, "");

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectHtml(target);
    return entry.isFile() && entry.name.endsWith(".html") ? [target] : [];
  }));
  return nested.flat();
}

const skillsSource = await readFile(path.resolve("app/data/skills.ts"), "utf8");
const slugs = [...skillsSource.matchAll(/^\s+slug: "([^"]+)",$/gm)].map((match) => match[1]);
if (slugs.length !== 13 || new Set(slugs).size !== 13) throw new Error("Skill slug contract failed");

const htmlFiles = await collectHtml(outputRoot);
if (htmlFiles.length !== 35) throw new Error(`Expected 35 HTML files, received ${htmlFiles.length}`);

for (const slug of slugs) {
  await access(path.join(outputRoot, "skills", slug, "index.html"));
  await access(path.join(outputRoot, "labs", "multi-source", slug, "index.html"));
}
await access(path.join(outputRoot, "start", "index.html"));
await access(path.join(outputRoot, ".nojekyll"));

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if (path.relative(outputRoot, file).split(path.sep)[0] === "start") continue;
  if (!html.includes('name="github-pages-static-export"')) throw new Error(`Missing export marker: ${file}`);
  if (/(?:href|src|action)="\/(?!0809_githubcode_study)/.test(html)) throw new Error(`Unprefixed internal URL: ${file}`);
  if (/src="\/generated\//.test(html)) throw new Error(`Local generated asset leaked: ${file}`);
}

const directoryHtml = await readFile(path.join(outputRoot, "skills", "index.html"), "utf8");
if ((directoryHtml.match(/<article[^>]+data-skill-directory=/g) ?? []).length !== 13) {
  throw new Error("GitHub Pages directory does not expose 13 Skill cards");
}
if (!directoryHtml.includes(`href="${basePath}/skills/daily-photo-playground"`)) {
  throw new Error("GitHub Pages Skill child link was not prefixed");
}
if ((directoryHtml.match(new RegExp(`src="${evidenceOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/generated/`, "g")) ?? []).length !== 13) {
  throw new Error("GitHub Pages directory does not externalize all 13 evidence thumbnails");
}

console.log(JSON.stringify({ htmlFiles: htmlFiles.length, skillPages: slugs.length, labVariants: slugs.length, status: "pass" }));
