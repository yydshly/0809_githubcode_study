import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "public/generated/source/revision11/distill-crosswalk-flow-source.png");
const effectPath = resolve(root, "public/generated/studies/photo-distill/revision11-crosswalk-flow-effect.svg");
const sourceBytes = readFileSync(sourcePath);
const sourceHash = createHash("sha256").update(sourceBytes).digest("hex");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" data-experiment-id="crosswalk-flow-distill" data-artifact-role="effect" data-source-sha256="${sourceHash}" data-photo-pixels="0" data-visible-text="0" data-flow-count="2" data-color-role-count="4" data-stagnation-gap-count="1" data-crop="none">
  <rect width="1200" height="1600" fill="#f1eadb"/>
  <g data-role="crosswalk-rhythm" fill="#1e262a" opacity=".075" transform="rotate(-18 600 800)">
    <rect x="-100" y="292" width="1400" height="42" rx="6"/><rect x="-100" y="410" width="1400" height="42" rx="6"/><rect x="-100" y="528" width="1400" height="42" rx="6"/><rect x="-100" y="646" width="1400" height="42" rx="6"/><rect x="-100" y="764" width="1400" height="42" rx="6"/><rect x="-100" y="882" width="1400" height="42" rx="6"/><rect x="-100" y="1000" width="1400" height="42" rx="6"/><rect x="-100" y="1118" width="1400" height="42" rx="6"/>
  </g>
  <path data-role="flow-northeast" d="M145 1320 C260 1120 390 985 530 875 C680 756 825 580 1035 258" fill="none" stroke="#263c58" stroke-width="44" stroke-linecap="round" opacity=".88"/>
  <path data-role="flow-southwest" d="M1080 1230 C895 1098 760 1010 662 908 C542 786 400 610 185 340" fill="none" stroke="#326f69" stroke-width="34" stroke-linecap="round" opacity=".78"/>
  <g data-role="coral-density" fill="#d85c52">
    <circle cx="260" cy="1160" r="34"/><circle cx="336" cy="1078" r="24"/><circle cx="414" cy="1008" r="17"/><circle cx="842" cy="650" r="22"/><circle cx="914" cy="552" r="31"/>
  </g>
  <g data-role="mustard-density" fill="#d1a23b">
    <circle cx="950" cy="1115" r="33"/><circle cx="862" cy="1052" r="21"/><circle cx="785" cy="988" r="16"/><circle cx="360" cy="570" r="21"/><circle cx="276" cy="470" r="29"/>
  </g>
  <g data-role="cobalt-density" fill="#3f6791">
    <circle cx="486" cy="940" r="19"/><circle cx="528" cy="902" r="13"/><circle cx="724" cy="790" r="14"/><circle cx="770" cy="730" r="19"/>
  </g>
  <g data-role="teal-density" fill="#4f8c7e">
    <circle cx="690" cy="960" r="17"/><circle cx="738" cy="1002" r="12"/><circle cx="470" cy="714" r="13"/><circle cx="425" cy="660" r="18"/>
  </g>
  <g data-role="stagnation-gap" data-gap-count="1">
    <circle cx="600" cy="820" r="122" fill="#f1eadb"/>
    <circle cx="600" cy="820" r="86" fill="none" stroke="#222b2f" stroke-width="2" stroke-dasharray="3 16" opacity=".34"/>
  </g>
  <g data-role="rain-reflection" stroke="#222b2f" stroke-width="4" stroke-linecap="round" opacity=".18">
    <path d="M168 1390h168M750 1298h220M110 232h186M828 330h230"/><path d="M228 1430h82M806 1340h116M162 270h86M902 370h90"/>
  </g>
</svg>`;

if (/<(?:image|text|script|foreignObject)\b|\bhref\s*=/.test(svg)) throw new Error("Revision 11 Photo Distill effect must remain self-contained, textless, and photo-free.");
if (!svg.includes(`data-source-sha256="${sourceHash}"`)) throw new Error("Missing source provenance hash.");

mkdirSync(dirname(effectPath), { recursive: true });
writeFileSync(effectPath, svg, "utf8");
const effectHash = createHash("sha256").update(svg).digest("hex");
console.log(JSON.stringify({ sourcePath, sourceHash, effectPath, effectHash, width: 1200, height: 1600 }, null, 2));
