import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const jobs = [
  {
    sourceSvg: "public/generated/studies/travel-photo-abstraction/next-shop-sign-lock-effect.svg",
    outputSvg: "public/generated/studies/travel-photo-abstraction/next-shop-sign-lock-effect-self-contained.svg",
    replacements: [
      { href: "/generated/source/next/night-camera-shop-source.png", asset: "public/generated/source/next/night-camera-shop-source.png" },
    ],
  },
  {
    sourceSvg: "public/generated/studies/photo-to-zine-postcard/next-print-preflight-sheet.svg",
    outputSvg: "public/generated/studies/photo-to-zine-postcard/next-print-preflight-sheet-self-contained.svg",
    replacements: [
      { href: "/generated/results/photo-to-zine-postcard-front.png", asset: "public/generated/results/photo-to-zine-postcard-front.png" },
      { href: "/generated/results/photo-to-zine-postcard-back.png", asset: "public/generated/results/photo-to-zine-postcard-back.png" },
    ],
  },
  {
    sourceSvg: "public/generated/studies/photo-abstract-editorial/outline-vs-relations.svg",
    outputSvg: "public/generated/studies/photo-abstract-editorial/outline-vs-relations-self-contained.svg",
    replacements: [
      { href: "/generated/source/next/north-harbor-interchange-source.png", asset: "public/generated/source/next/north-harbor-interchange-source.png" },
    ],
  },
];

const requestedJobs = new Set(process.argv.slice(2));
const selectedJobs = requestedJobs.size > 0
  ? jobs.filter((job) => requestedJobs.has(job.sourceSvg) || requestedJobs.has(job.outputSvg))
  : jobs;

for (const job of selectedJobs) {
  const sourcePath = resolve(projectRoot, job.sourceSvg);
  let source = await readFile(sourcePath, "utf8");

  for (const replacement of job.replacements) {
    const marker = `href="${replacement.href}"`;
    if (!source.includes(marker)) continue;
    const bytes = await readFile(resolve(projectRoot, replacement.asset));
    source = source.replace(marker, `href="data:image/png;base64,${bytes.toString("base64")}"`);
  }

  await writeFile(resolve(projectRoot, job.outputSvg), source, "utf8");
}
