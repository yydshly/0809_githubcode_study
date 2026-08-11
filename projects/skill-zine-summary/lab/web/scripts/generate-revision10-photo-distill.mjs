import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outputUrl = new URL(
  "../public/generated/studies/photo-distill/revision10-salt-pans-relations-effect.svg",
  import.meta.url,
);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-label="Salt-pan spatial relations distilled into pool intervals, one diagonal causeway and one cobalt anchor" data-experiment-id="salt-pans-relations" data-artifact-role="effect" data-photo-pixels="0" data-visible-text="0">
  <rect width="1200" height="1600" fill="#f2ecdf"/>

  <g fill="none" stroke="#273c39" stroke-width="6" opacity="0.84">
    <rect x="94" y="126" width="244" height="150" rx="4"/>
    <rect x="374" y="126" width="244" height="150" rx="4"/>
    <rect x="654" y="126" width="244" height="150" rx="4"/>
    <rect x="934" y="126" width="172" height="150" rx="4"/>
    <rect x="94" y="314" width="244" height="150" rx="4"/>
    <rect x="374" y="314" width="244" height="150" rx="4"/>
    <rect x="654" y="314" width="244" height="150" rx="4"/>
    <rect x="934" y="314" width="172" height="150" rx="4"/>
    <rect x="94" y="502" width="244" height="150" rx="4"/>
    <rect x="374" y="502" width="244" height="150" rx="4"/>
    <rect x="654" y="502" width="244" height="150" rx="4"/>
    <rect x="934" y="502" width="172" height="150" rx="4"/>
    <rect x="94" y="690" width="244" height="150" rx="4"/>
    <rect x="374" y="690" width="244" height="150" rx="4"/>
    <rect x="654" y="690" width="244" height="150" rx="4"/>
    <rect x="934" y="690" width="172" height="150" rx="4"/>
  </g>

  <g opacity="0.92">
    <rect x="102" y="134" width="228" height="134" fill="#e7b8b5"/>
    <rect x="382" y="134" width="228" height="134" fill="#efe1cb"/>
    <rect x="662" y="134" width="228" height="134" fill="#aec8bd"/>
    <rect x="942" y="134" width="156" height="134" fill="#dfaaa8"/>
    <rect x="102" y="322" width="228" height="134" fill="#efe1cb"/>
    <rect x="382" y="322" width="228" height="134" fill="#b9cdc1"/>
    <rect x="662" y="322" width="228" height="134" fill="#e8beb8"/>
    <rect x="942" y="322" width="156" height="134" fill="#a9c5ba"/>
    <rect x="102" y="510" width="228" height="134" fill="#b6cbbf"/>
    <rect x="382" y="510" width="228" height="134" fill="#e6b2ae"/>
    <rect x="662" y="510" width="228" height="134" fill="#efe1cb"/>
    <rect x="942" y="510" width="156" height="134" fill="#dba5a5"/>
    <rect x="102" y="698" width="228" height="134" fill="#e9c4bc"/>
    <rect x="382" y="698" width="228" height="134" fill="#aec8bd"/>
    <rect x="662" y="698" width="228" height="134" fill="#e6b0ae"/>
    <rect x="942" y="698" width="156" height="134" fill="#efe1cb"/>
  </g>

  <g fill="#c56d73" opacity="0.68">
    <rect x="102" y="240" width="228" height="28"/>
    <rect x="382" y="228" width="228" height="40"/>
    <rect x="662" y="246" width="228" height="22"/>
    <rect x="942" y="232" width="156" height="36"/>
    <rect x="102" y="420" width="228" height="36"/>
    <rect x="382" y="434" width="228" height="22"/>
    <rect x="662" y="412" width="228" height="44"/>
    <rect x="942" y="426" width="156" height="30"/>
  </g>

  <path d="M 98 1326 L 1038 160" fill="none" stroke="#f2ecdf" stroke-width="126" stroke-linecap="round"/>
  <path d="M 98 1326 L 1038 160" fill="none" stroke="#344640" stroke-width="74" stroke-linecap="round"/>
  <path d="M 98 1326 L 1038 160" fill="none" stroke="#c9b79d" stroke-width="48" stroke-linecap="round"/>
  <path d="M 98 1326 L 1038 160" fill="none" stroke="#5f6f68" stroke-width="3" stroke-dasharray="24 22" stroke-linecap="round" opacity="0.85"/>

  <g transform="translate(611 820) rotate(-51)">
    <rect x="-34" y="-19" width="68" height="38" rx="10" fill="#174fa3" stroke="#102f62" stroke-width="5"/>
    <rect x="-20" y="-12" width="28" height="24" rx="5" fill="#7da1d0" opacity="0.8"/>
    <circle cx="-22" cy="22" r="7" fill="#273c39"/>
    <circle cx="22" cy="22" r="7" fill="#273c39"/>
  </g>

  <g fill="none" stroke="#c56d73" stroke-width="8" opacity="0.48">
    <path d="M 168 1050 C 350 970 480 992 632 1052"/>
    <path d="M 168 1092 C 350 1012 480 1034 632 1094"/>
    <path d="M 168 1134 C 350 1054 480 1076 632 1136"/>
  </g>

</svg>
`;

await mkdir(fileURLToPath(new URL(".", outputUrl)), { recursive: true });
await writeFile(fileURLToPath(outputUrl), svg, "utf8");
