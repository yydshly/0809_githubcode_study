import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceAsset = resolve(projectRoot, "public/generated/source/next/poetic-line-last-train-violinist-source.png");
const sourceSvg = resolve(projectRoot, "public/generated/studies/poetic-line-zine-poster/last-train-violinist-fidelity.svg");
const outputSvg = resolve(projectRoot, "public/generated/studies/poetic-line-zine-poster/last-train-violinist-fidelity-self-contained.svg");
const marker = 'href="/generated/source/next/poetic-line-last-train-violinist-source.png"';

const [template, sourceBytes] = await Promise.all([
  readFile(sourceSvg, "utf8"),
  readFile(sourceAsset),
]);

if ((template.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length !== 1) {
  throw new Error("Expected exactly one violinist source href in the fidelity SVG template.");
}

const embeddedHref = `href="data:image/png;base64,${sourceBytes.toString("base64")}"`;
const output = template.replace(marker, embeddedHref);
await writeFile(outputSvg, output, "utf8");

const sha256 = createHash("sha256").update(sourceBytes).digest("hex");
const embeddedMatch = output.match(/href="data:image\/png;base64,([^"]+)"/);
if (!embeddedMatch) throw new Error("The self-contained SVG does not contain an embedded PNG data URI.");

const embeddedBytes = Buffer.from(embeddedMatch[1], "base64");
const embeddedSha256 = createHash("sha256").update(embeddedBytes).digest("hex");
if (!sourceBytes.equals(embeddedBytes)) throw new Error("Embedded PNG bytes differ from the controlled source.");

const externalHrefs = [...output.matchAll(/href="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((href) => !href.startsWith("data:") && !href.startsWith("#"));
if (externalHrefs.length > 0) throw new Error(`Unexpected external hrefs: ${externalHrefs.join(", ")}`);

console.log(JSON.stringify({
  outputSvg,
  sourceBytes: sourceBytes.length,
  embeddedBytes: embeddedBytes.length,
  sha256,
  embeddedSha256,
  byteIdentical: true,
  externalHrefCount: 0,
}));
