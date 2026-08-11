import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const outputRoot = path.resolve(process.env.GITHUB_PAGES_OUTPUT ?? "github-pages-dist");
const basePath = (process.env.GITHUB_PAGES_BASE_PATH ?? "/0809_githubcode_study").replace(/\/$/, "");
const publicOrigin = (process.env.GITHUB_PAGES_ORIGIN ?? "https://yydshly.github.io").replace(/\/$/, "");
const evidenceOrigin = (process.env.RESEARCH_EVIDENCE_ORIGIN ?? "https://skill-zine-private-lab.yydshly.chatgpt.site").replace(/\/$/, "");
const canonicalOrigin = `${publicOrigin}${basePath}`;

const skillsSource = await readFile(path.join(projectRoot, "app/data/skills.ts"), "utf8");
const skillSlugs = [...skillsSource.matchAll(/^\s+slug: "([^"]+)",$/gm)].map((match) => match[1]);
if (skillSlugs.length !== 13 || new Set(skillSlugs).size !== 13) {
  throw new Error(`Expected 13 unique Skill slugs, received ${skillSlugs.length}`);
}

const workerUrl = pathToFileURL(path.join(projectRoot, "dist/server/index.js"));
workerUrl.searchParams.set("static-export", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(path.join(projectRoot, "dist/client"), outputRoot, {
  recursive: true,
  filter(source) {
    const relative = path.relative(path.join(projectRoot, "dist/client"), source);
    return !relative.split(path.sep).includes("generated");
  },
});

const publicGuide = path.resolve(projectRoot, "../../public-site");
await cp(path.join(publicGuide, "start"), path.join(outputRoot, "start"), { recursive: true });
await writeFile(path.join(outputRoot, ".nojekyll"), "");

function rewriteForGitHubPages(html) {
  let rewritten = html
    .replaceAll("http://localhost:4317", canonicalOrigin)
    .replaceAll("/generated/", `${evidenceOrigin}/generated/`)
    .replace(/\/labs\/multi-source\?skill=([^&#"\\]+)(#[^"\\]*)?/g, "/labs/multi-source/$1/$2")
    .replace(/\/choose\?([^"\\]+)/g, `${evidenceOrigin}/choose?$1`)
    .replaceAll('action="/choose"', `action="${evidenceOrigin}/choose"`)
    .replace(/\b(href|src|action)="\/(?!\/)/g, `$1="${basePath}/`)
    .replaceAll(`\\"/_next/`, `\\"${basePath}/_next/`);

  rewritten = rewritten.replace(
    /<head>/,
    `<head><meta name="github-pages-static-export" content="true"><meta name="research-evidence-origin" content="${evidenceOrigin}">`,
  );
  return rewritten;
}

async function renderRoute(requestPath, outputDirectory) {
  const response = await worker.fetch(
    new Request(`${publicOrigin}${requestPath}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  if (response.status !== 200) throw new Error(`${requestPath} returned ${response.status}`);
  const html = rewriteForGitHubPages(await response.text());
  const target = path.join(outputRoot, outputDirectory);
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, "index.html"), html);
}

const coreRoutes = [
  ["/", ""],
  ["/skills", "skills"],
  ["/research", "research"],
  ["/documents", "documents"],
  ["/choose", "choose"],
  ["/comparison", "comparison"],
  ["/labs/multi-source", "labs/multi-source"],
  ["/reports/revision-7", "reports/revision-7"],
];

for (const [requestPath, outputDirectory] of coreRoutes) {
  await renderRoute(requestPath, outputDirectory);
}
for (const slug of skillSlugs) {
  await renderRoute(`/skills/${slug}`, `skills/${slug}`);
  await renderRoute(`/labs/multi-source?skill=${slug}`, `labs/multi-source/${slug}`);
}

const rootHtml = await readFile(path.join(outputRoot, "index.html"), "utf8");
await writeFile(path.join(outputRoot, "404.html"), rootHtml);

console.log(JSON.stringify({
  basePath,
  evidenceOrigin,
  routes: coreRoutes.length + skillSlugs.length * 2,
  skillPages: skillSlugs.length,
  labVariants: skillSlugs.length,
  outputRoot,
}));
