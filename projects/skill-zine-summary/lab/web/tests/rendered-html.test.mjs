import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

function render(path = "/") {
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("catalog renders all 13 independent research targets", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Zine Skill 能力研究站<\/title>/i);
  assert.match(html, /13 个 Skill 视觉目录/);
  assert.match(html, /href="\/skills\/daily-photo-playground"/);
  assert.match(html, /href="\/skills\/photo-to-zine-postcard"/);
  assert.match(html, /href="\/comparison"/);
  assert.match(html, /href="\/research"/);
  assert.match(html, /href="\/choose"/);
  assert.match(html, /href="\/labs\/multi-source"/);
  assert.match(html, /href="\/reports\/revision-7"/);
  assert.match(html, /property="og:image" content="http:\/\/localhost:4317\/og\.png"/);
  assert.match(html, /研究站封面/);
  assert.match(html, /src="\/og\.png"/);
  const cards = (html.match(/<article class="skill-card"/g) ?? []).length;
  assert.equal(cards, 13);
});

test("revision 7 report explains 7 sources, 24 experiments, conclusions, and production boundaries", async () => {
  const response = await render("/reports/revision-7");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /不是多放图片/);
  assert.match(html, /7 张可控来源/);
  assert.match(html, /24 组 SOURCE/);
  assert.match(html, /19\/5/);
  assert.match(html, /成立／部分成立/);
  assert.match(html, /本地概念研究，不是 12 个上游 Skill/);
  assert.match(html, /产品预演复用同一 EFFECT/);
  assert.equal((html.match(/data-report-skill=/g) ?? []).length, 12);
  assert.equal((html.match(/data-report-case=/g) ?? []).length, 24);
  assert.equal((html.match(/data-status="部分成立"/g) ?? []).length, 5);
  assert.equal((html.match(/data-status="成立"/g) ?? []).length, 19);
  assert.match(html, /五人聚会在 GC 与 Pixel 结果中都出现成员损失/);
  assert.match(html, /href="\/skills\/pixel-style-poster#capability-explorations"/);
});

test("share metadata uses a deploy-time site origin with a local fallback", async () => {
  const layoutSource = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layoutSource, /process\.env\.NEXT_PUBLIC_SITE_URL \?\? "http:\/\/localhost:4317"/);
  assert.match(layoutSource, /metadataBase,/);
  assert.doesNotMatch(layoutSource, /metadataBase:\s*new URL\("http:\/\/localhost:4317"\)/);
});

test("controlled comparison keeps 13 studies and 37 result assets", async () => {
  const response = await render("/comparison");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /13(?:<!-- -->)? SKILLS \/ (?:<!-- -->)?37(?:<!-- -->)? EFFECTS/);
  assert.match(html, /photo-to-zine-postcard-front\.png/);
  assert.match(html, /photo-to-zine-postcard-back\.png/);
  assert.doesNotMatch(html, /object-fit:\s*cover/i);
  const studies = (html.match(/<article class="comparison-study"/g) ?? []).length;
  assert.equal(studies, 13);
  assert.doesNotMatch(html, /src=["'](?:\.\.\/|file:)/i);
});

test("all referenced local research assets exist in supported raster or SVG formats", async () => {
  const dataSources = await Promise.all([
    readFile(new URL("../app/data/skills.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/research.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/effect-applications.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/product-applications.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/capability-explorations.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/revision7-capability-explorations.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/revision7-conclusions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/delivered-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/revision5-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/revision10-independent-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/revision11-stress-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/revision12-product-system-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/multi-source-experiments.ts", import.meta.url), "utf8"),
  ]);
  const references = [
    ...new Set(
      dataSources.flatMap((source) =>
        [...source.matchAll(/["'`](\/generated\/[^"'`]+\.[a-z0-9]+)["'`]/gi)].map((match) => match[1]),
      ),
    ),
  ];

  assert.ok(references.length > 0, "expected local research asset references");
  for (const reference of references) {
    assert.match(reference, /\.(?:png|jpe?g|svg)$/i, `${reference} should use a supported image extension`);
    await assert.doesNotReject(
      access(new URL(`../public${reference}`, import.meta.url)),
      `${reference} should resolve to a local public asset`,
    );
  }
});

test("deterministic studies embed the exact source bytes and explicit comparison contracts", async () => {
  const cases = [
    {
      effect: "../public/generated/studies/poetic-line-zine-poster/last-train-violinist-fidelity-self-contained.svg",
      source: "../public/generated/source/next/poetic-line-last-train-violinist-source.png",
      contract: /data-source-fidelity="byte-identical"[^>]+data-route="gesture-mass-rhythm-path"/,
    },
    {
      effect: "../public/generated/studies/photo-abstract-editorial/outline-vs-relations-self-contained.svg",
      source: "../public/generated/source/next/north-harbor-interchange-source.png",
      contract: /data-comparison="equal-mark-budget"/,
    },
  ];

  for (const item of cases) {
    const [svg, source] = await Promise.all([
      readFile(new URL(item.effect, import.meta.url), "utf8"),
      readFile(new URL(item.source, import.meta.url)),
    ]);
    const hrefs = [...svg.matchAll(/\b(?:href|xlink:href)="([^"]+)"/g)].map((match) => match[1]);
    const embedded = hrefs.filter((href) => href.startsWith("data:image/png;base64,"));
    const external = hrefs.filter((href) => !href.startsWith("data:") && !href.startsWith("#"));
    assert.equal(embedded.length, 1, `${item.effect} should contain exactly one embedded PNG`);
    assert.equal(external.length, 0, `${item.effect} should not depend on an external image`);
    const decoded = Buffer.from(embedded[0].slice("data:image/png;base64,".length), "base64");
    const sourceHash = createHash("sha256").update(source).digest("hex");
    const embeddedHash = createHash("sha256").update(decoded).digest("hex");
    assert.equal(embeddedHash, sourceHash, `${item.effect} should embed the exact source bytes`);
    assert.match(svg, item.contract);
  }

  const abstractSvg = await readFile(new URL(cases[1].effect, import.meta.url), "utf8");
  assert.equal((abstractSvg.match(/data-mark-budget="8"/g) ?? []).length, 2, "both comparison routes should declare an eight-mark budget");
  assert.equal((abstractSvg.match(/data-mark="A[1-8]"/g) ?? []).length, 8, "outline route should expose A1–A8");
  assert.equal((abstractSvg.match(/data-mark="B[1-8]"/g) ?? []).length, 8, "relation route should expose B1–B8");
});

test("revision 5 deterministic studies expose complete, auditable visual contracts", async () => {
  const paths = {
    daily: "../public/generated/studies/daily-photo-playground/low-saturation-rain-editorial-effect.svg",
    dyy: "../public/generated/studies/dyy-photo-deconstruct/single-motion-five-mark-effect.svg",
    travel: "../public/generated/studies/travel-photo-abstraction/night-contrast-three-panel-effect.svg",
    gc: "../public/generated/studies/gc-minimal-zine-poster/equal-budget-three-variants-effect.svg",
    snow: "../public/generated/studies/scene-distillation-zine/empty-snowfield-three-role-effect.svg",
    seasons: "../public/generated/studies/scenes-gathered-zine/four-season-structure-effect.svg",
    postcardSource: "../public/generated/source/next/north-harbor-postcard-series-source-board.svg",
    postcardEffect: "../public/generated/studies/photo-to-zine-postcard/north-harbor-three-card-series-effect.svg",
  };
  const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(new URL(path, import.meta.url), "utf8")]));
  const svgs = Object.fromEntries(entries);

  for (const [key, svg] of entries) {
    const hrefs = [...svg.matchAll(/\b(?:href|xlink:href)="([^"]+)"/g)].map((match) => match[1]);
    const external = hrefs.filter((href) => !href.startsWith("data:") && !href.startsWith("#"));
    assert.equal(external.length, 0, `${key} should be self-contained`);
    assert.doesNotMatch(svg, /preserveAspectRatio="[^"]*slice"|object-fit:\s*cover/i, `${key} should not crop embedded evidence`);
  }

  assert.match(svgs.daily, /data-source-fidelity="byte-identical"/);
  assert.equal((svgs.daily.match(/data-complete-source-window="true"/g) ?? []).length, 1);
  assert.equal((svgs.dyy.match(/data-mark="M[1-5]"/g) ?? []).length, 5);
  assert.doesNotMatch(svgs.dyy, /<(?:image|text)\b/);
  assert.equal((svgs.travel.match(/data-comparison-column=/g) ?? []).length, 3);
  assert.equal((svgs.travel.match(/data-panel-lightness-role=/g) ?? []).length, 3);
  assert.equal((svgs.gc.match(/data-variant="[ABC]"/g) ?? []).length, 3);
  assert.equal((svgs.gc.match(/data-mark-budget="5"/g) ?? []).length, 3);
  assert.equal((svgs.gc.match(/data-mark="[ABC][1-5]"/g) ?? []).length, 15);
  assert.equal((svgs.snow.match(/data-role=/g) ?? []).length, 3);
  assert.equal((svgs.seasons.match(/data-series-member=/g) ?? []).length, 4);
  assert.equal((svgs.seasons.match(/data-structure-connector=/g) ?? []).length, 1);
  assert.equal((svgs.postcardSource.match(/data-source-member=/g) ?? []).length, 3);
  assert.equal((svgs.postcardEffect.match(/data-product-set=/g) ?? []).length, 3);
  assert.equal((svgs.postcardEffect.match(/data-product-completeness="front-back"/g) ?? []).length, 3);
  assert.equal((svgs.postcardEffect.match(/data-side=/g) ?? []).length, 6);
  assert.match(svgs.postcardEffect, /data-physical-proof="not-claimed"/);
});

test("all site images use full-frame contain presentation", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const homeSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const figureSource = await readFile(new URL("../app/components/DemoFigure.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(css, /object-fit\s*:\s*cover/i);
  assert.doesNotMatch(homeSource, /objectFit\s*:\s*["']cover/i);
  assert.doesNotMatch(figureSource, /\bfill\b/);
  assert.match(figureSource, /<img[^>]+src=\{image\.src\}/s);
  assert.match(css, /\.catalog-hero__visual\s*>\s*img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(css, /\.skill-card__visual\s+img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(css, /\.cover-showcase__image\s+img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(css, /\.demo-figure__frame\s+img\s*\{[^}]*width:\s*100%[^}]*height:\s*auto[^}]*object-fit:\s*contain/s);
  assert.match(css, /\.capability-product-preview__art\s*>\s*img,[\s\S]*?\.capability-product-preview__installed\s*>\s*img\s*\{[^}]*object-fit:\s*contain/s);
});

test("research figures expose an accessible immersive viewer", async () => {
  const figureSource = await readFile(new URL("../app/components/DemoFigure.tsx", import.meta.url), "utf8");
  const triggerSource = await readFile(new URL("../app/components/ImmersiveTrigger.tsx", import.meta.url), "utf8");
  const viewerSource = await readFile(new URL("../app/components/ImmersiveViewer.tsx", import.meta.url), "utf8");
  const layoutSource = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.match(figureSource, /data-viewer-item/);
  assert.match(triggerSource, /aria-haspopup="dialog"/);
  assert.match(triggerSource, /aria-controls="immersive-image-viewer"/);
  assert.match(viewerSource, /<dialog/);
  assert.match(viewerSource, /showModal\(\)/);
  assert.match(viewerSource, /ArrowLeft/);
  assert.match(viewerSource, /ArrowRight/);
  assert.match(viewerSource, /element\.dataset\.viewerSrc/);
  assert.match(viewerSource, /const itemIndexBySrc = new Map<string, number>\(\)/);
  assert.match(viewerSource, /const itemIndexByElement = new Map<HTMLElement, number>\(\)/);
  assert.match(viewerSource, /let itemIndex = itemIndexBySrc\.get\(src\)/);
  assert.match(viewerSource, /if \(itemIndex !== undefined\) \{\s*itemIndexByElement\.set\(element, itemIndex\);\s*continue;/s);
  assert.match(viewerSource, /const nextIndex = itemIndexByElement\.get\(sourceItem\)/);
  assert.match(viewerSource, /alt: sourceItem\.dataset\.viewerAlt \?\? selectedItem\.alt/);
  assert.match(viewerSource, /caption: sourceItem\.dataset\.viewerCaption \?\? selectedItem\.caption/);
  assert.match(viewerSource, /label: sourceItem\.dataset\.viewerLabel \?\? selectedItem\.label/);
  assert.doesNotMatch(viewerSource, /itemElements\.indexOf\(sourceItem\)/);
  assert.match(viewerSource, /event\.key === "Escape"/);
  assert.match(viewerSource, /trigger\.focus\(\{ preventScroll: true \}\)/);
  assert.match(viewerSource, /lockDocumentScroll/);
  assert.match(viewerSource, /objectFit: "contain"/);
  assert.match(viewerSource, /这张图片暂时无法加载/);
  assert.doesNotMatch(viewerSource, /objectFit:\s*["']cover["']/);
  assert.match(layoutSource, /<ImmersiveViewer\s*\/>/);

  const response = await render("/skills/photo-relic-editorial");
  const html = await response.text();
  assert.equal((html.match(/<figure[^>]+data-viewer-item/g) ?? []).length, 27);
  assert.equal((html.match(/<button[^>]+data-viewer-trigger/g) ?? []).length, 27);
});

test("every Skill has a complete standalone research page", async () => {
  const expectedDemoCounts = {
    "daily-photo-playground": 3, "dyy-photo-deconstruct": 6, "travel-photo-abstraction": 6,
    "scenes-gathered-zine": 4, "scene-distillation-zine": 4, "gc-minimal-zine-poster": 6,
    "photo-revival": 6, "pixel-style-poster": 3, "photo-relic-editorial": 6, "photo-distill": 6,
    "poetic-line-zine-poster": 6, "photo-abstract-editorial": 6, "photo-to-zine-postcard": 6,
  };
  const expectedExtensionCounts = {
    "daily-photo-playground": 3, "dyy-photo-deconstruct": 3, "travel-photo-abstraction": 3,
    "scenes-gathered-zine": 3, "scene-distillation-zine": 3, "gc-minimal-zine-poster": 3,
    "photo-revival": 3, "pixel-style-poster": 3, "photo-relic-editorial": 1, "photo-distill": 3,
    "poetic-line-zine-poster": 3, "photo-abstract-editorial": 3, "photo-to-zine-postcard": 3,
  };
  const expectedLocalEffectCounts = Object.fromEntries(Object.keys(expectedDemoCounts).map((slug) => [slug, 5]));
  const partialPlanSlugs = new Set(["photo-distill", "photo-to-zine-postcard"]);
  const doubleExperimentSlugs = new Set(Object.keys(expectedDemoCounts).filter((slug) => slug !== "photo-relic-editorial"));
  const expectedFuturePlanCounts = {
    "daily-photo-playground": 0, "dyy-photo-deconstruct": 0, "travel-photo-abstraction": 0,
    "scenes-gathered-zine": 0, "scene-distillation-zine": 0, "gc-minimal-zine-poster": 0,
    "photo-revival": 0, "pixel-style-poster": 1, "photo-relic-editorial": 3, "photo-distill": 1,
    "poetic-line-zine-poster": 1, "photo-abstract-editorial": 1, "photo-to-zine-postcard": 1,
  };

  for (const [slug, expectedDemoCount] of Object.entries(expectedDemoCounts)) {
    const response = await render(`/skills/${slug}`);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.match(html, /它真正解决什么/, slug);
    assert.match(html, /适用场景/, slug);
    assert.match(html, /上游内部 Demo/, slug);
    assert.match(html, /我们的场景扩展实验/, slug);
    assert.match(html, /可扩展方向/, slug);
    assert.match(html, /能力边界与验收/, slug);
    assert.match(html, /相近 Skill 对照/, slug);
    assert.match(html, /CHECK/, slug);
    assert.match(html, /下一轮演示计划/, slug);
    assert.match(html, /RESEARCH COMMIT/, slug);
    assert.match(html, /打开完整原图/, slug);
    assert.doesNotMatch(html, /object-fit:\s*cover/i, slug);
    const upstreamDemos = (html.match(/<div class="demo-figure__label">UPSTREAM DEMO/g) ?? []).length;
    assert.equal(upstreamDemos, expectedDemoCount, `${slug} upstream demo count`);
    const extensionDemos = (html.match(/<div class="demo-figure__label">OUR EFFECT/g) ?? []).length;
    assert.equal(extensionDemos, expectedExtensionCounts[slug], `${slug} extension demo count`);
    const controlledEffects = (html.match(/<div class="demo-figure__label">OUR (?:STUDY EFFECT|IMAGE-GENERATED STUDY EFFECT|DETERMINISTIC COMPOSITE|CLEAN-ROOM CODE EFFECT)/g) ?? []).length;
    const interactiveEffects = (html.match(/<p class="eyebrow">CODE-NATIVE EFFECT · (?:LIVE|ENGINE BASELINE)<\/p>/g) ?? []).length;
    const localEffects = extensionDemos + controlledEffects + interactiveEffects;
    assert.equal(localEffects, expectedLocalEffectCounts[slug], `${slug} complete local effect count`);
    assert.ok(localEffects >= 3, `${slug} should expose at least 3 complete local effects`);

    // Baseline application cards keep their own image; delivered experiments embed a complete brief beside the pair.
    const applicationCards = (html.match(/<article class="effect-application">/g) ?? []).length;
    const applicationEffects = (html.match(/<div class="demo-figure__label">APPLICATION EFFECT/g) ?? []).length;
    const applicationScenarios = (html.match(/<p class="eyebrow">APPLICATION SCENARIO · COMPLETE EFFECT<\/p>/g) ?? []).length;
    const deliveredExperiments = (html.match(/<article class="plan-experiment delivered-experiment"/g) ?? []).length;
    const deliveredApplications = (html.match(/<section class="plan-experiment__application">/g) ?? []).length;
    const expectedBaselineApplications = slug === "photo-relic-editorial" ? 5 : 3;
    const expectedDeliveredExperiments = slug === "photo-relic-editorial" ? 0 : doubleExperimentSlugs.has(slug) ? 2 : 1;
    assert.equal(applicationCards, expectedBaselineApplications, `${slug} baseline application card count`);
    assert.equal(applicationEffects, expectedBaselineApplications, `${slug} baseline application effect count`);
    assert.equal(applicationScenarios, expectedBaselineApplications, `${slug} baseline application scenario count`);
    assert.equal(deliveredExperiments, expectedDeliveredExperiments, `${slug} delivered experiment count`);
    assert.equal(deliveredApplications, expectedDeliveredExperiments, `${slug} delivered application count`);
    assert.equal(applicationScenarios + deliveredApplications, localEffects, `${slug} complete use-case coverage`);

    const productScenes = (html.match(/<article class="product-studio__case" data-product-scene=/g) ?? []).length;
    const capabilityStudies = (html.match(/<article class="capability-exploration"[^>]+data-capability-exploration=/g) ?? []).length;
    const capabilitySources = (html.match(/<div class="demo-figure__label">COMPLETE SOURCE/g) ?? []).length;
    const capabilityEffects = (html.match(/<div class="demo-figure__label">COMPLETE EFFECT/g) ?? []).length;
    const capabilityApplications = (html.match(/<section class="capability-exploration__product" data-application-kind=/g) ?? []).length;
    const capabilityConclusions = (html.match(/<section class="capability-exploration__action" data-conclusion-status=/g) ?? []).length;
    const capabilityVerdicts = (html.match(/<section class="capability-exploration__verdict"/g) ?? []).length;
    const productPresentations = [...html.matchAll(/<article class="product-studio__case"[^>]+data-product-presentation="([^"]+)"[^>]+data-product-surface-count="(\d+)"/g)];
    const completeProducts = (html.match(/<div class="product-studio__stage-label"><span>02 [^<]*COMPLETE PRODUCT<\/span>/g) ?? []).length;
    const contextPreviews = (html.match(/<div class="product-studio__stage-label"><span>03 [^<]*IN-CONTEXT PREVIEW<\/span>/g) ?? []).length;
    const processSteps = (html.match(/data-process-step=/g) ?? []).length;
    assert.equal(productScenes, 2, `${slug} product application scene count`);
    assert.equal(capabilityStudies, slug === "photo-distill" ? 3 : 2, `${slug} cross-subject capability study count`);
    assert.equal(capabilitySources, capabilityStudies, `${slug} complete capability source count`);
    assert.equal(capabilityEffects, capabilityStudies, `${slug} complete capability effect count`);
    assert.equal(capabilityApplications, slug === "photo-distill" ? 0 : 2, `${slug} cross-subject product application count`);
    assert.equal(capabilityConclusions, capabilityStudies, `${slug} explicit capability conclusion count`);
    assert.equal(capabilityVerdicts, capabilityStudies, `${slug} proves/does-not-prove/production-next count`);
    assert.equal((html.match(/<p class="eyebrow">这部分到底是什么意思<\/p>/g) ?? []).length, 1, `${slug} capability method explainer count`);
    assert.match(html, /SOURCE/);
    assert.match(html, /PRODUCT PREVIEW/);
    assert.match(html, /href="\/reports\/revision-7"/);
    assert.equal(productPresentations.length, 2, `${slug} product presentation count`);
    assert.equal(new Set(productPresentations.map((match) => match[1])).size, 2, `${slug} should use two distinct product presentations`);
    assert.ok(productPresentations.every((match) => Number(match[2]) >= 3), `${slug} should show complete multi-surface products`);
    assert.equal(completeProducts, 2, `${slug} complete product composition count`);
    assert.equal(contextPreviews, 2, `${slug} in-context preview count`);
    assert.equal(processSteps, 8, `${slug} four-step product handling coverage`);

    const futurePlans = (html.match(/<article data-plan-state=/g) ?? []).length;
    const expectedFuturePlans = expectedFuturePlanCounts[slug];
    assert.equal(futurePlans, expectedFuturePlans, `${slug} remaining future plan count`);

    if (slug === "photo-relic-editorial") {
      assert.match(html, /PLAN DELIVERED/);
      assert.match(html, /1(?:<!-- -->)? baseline · (?:<!-- -->)?4(?:<!-- -->)? plan experiment/);
      assert.match(html, /雨幕旧影院/);
      assert.match(html, /桥影过河/);
      assert.match(html, /闭市长廊/);
      assert.match(html, /末班车之前/);
      assert.match(html, /“北港”和人物均为虚构/);
      assert.match(html, /不是纪实照片或上游官方输出/);
      assert.equal((html.match(/<div class="demo-figure__label">GENERATED SOURCE/g) ?? []).length, 4);
      assert.equal(controlledEffects, 4);
      assert.doesNotMatch(html, /三张同城照片|强人物主体/);
    } else {
      const studyLabel = expectedDeliveredExperiments === 1 ? "STUDY" : "STUDIES";
      assert.match(html, new RegExp(`PLAN EXPERIMENTS · (?:<!-- -->)?${expectedDeliveredExperiments}(?:<!-- -->)? INDEPENDENT (?:<!-- -->)?${studyLabel}`));
      assert.match(html, /PROVENANCE &amp; BOUNDARY/);
      assert.match(html, /EFFECT → REAL USE/);
      assert.match(html, /SOURCE · (?:<!-- -->)?(?:synthetic|text|code|local-study)/);
      assert.match(html, /EFFECT · (?:<!-- -->)?(?:generated|deterministic-composite|clean-room-code)/);
      if (partialPlanSlugs.has(slug)) {
        assert.match(html, /PARTIAL EVIDENCE · QUESTION REMAINS OPEN/);
        assert.match(html, /OPEN AFTER PARTIAL/);
      } else {
        assert.match(html, /ORIGINAL PLAN ANSWERED/);
        assert.doesNotMatch(html, /OPEN AFTER PARTIAL/);
      }
    }
  }
});

test("photo-distill renders controls and presets", async () => {
  const labSource = await readFile(new URL("../app/components/PhotoDistillParameterLab.tsx", import.meta.url), "utf8");
  const response = await render("/skills/photo-distill");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /CODE-NATIVE EFFECT · LIVE/);
  assert.match(html, /关系量参数实验/);
  assert.equal((html.match(/<article class="capability-exploration"[^>]+data-capability-exploration=/g) ?? []).length, 3);
  assert.equal((html.match(/<div class="demo-figure__label">COMPLETE SOURCE/g) ?? []).length, 3);
  assert.equal((html.match(/<div class="demo-figure__label">COMPLETE EFFECT/g) ?? []).length, 3);
  assert.equal((html.match(/type="range"/g) ?? []).length, 3);
  assert.match(html, /MEASURING/);
  assert.match(html, /RASTER INK/);
  assert.match(labSource, /主线宽尺度/);
  assert.match(labSource, /主锚半径尺度/);
  assert.match(labSource, /缩略检查尺寸/);
  assert.match(labSource, /distill-lab__presets/);
  assert.equal((labSource.match(/onChange=/g) ?? []).length, 3);
  assert.equal((labSource.match(/type="button" onClick=/g) ?? []).length, 3);
  assert.match(labSource, /const stroke = 2 \+ strokeScale \* 0\.22/);
  assert.match(labSource, /const anchorArea = \(Math\.PI \* radius \*\* 2/);
  assert.match(labSource, /new XMLSerializer\(\)\.serializeToString\(svg\)/);
  assert.match(labSource, /context\.getImageData\(0, 0, sampleWidth, sampleHeight\)/);
  assert.match(labSource, /sampleWidth = 300/);
  assert.match(labSource, /sampleHeight = 400/);
  assert.match(labSource, /paperDistance > 42/);
  assert.match(labSource, /status: "error"/);
  assert.match(labSource, /UNAVAILABLE/);
  assert.match(labSource, /rasterMeasurement\.inkPercent <= 5/);
  assert.match(labSource, /目标 2\.5–5%/);
  assert.match(labSource, /当前浏览器无法建立 2D Canvas/);
  assert.match(labSource, /当前浏览器拒绝读取离屏 Canvas 像素/);
});

test("photo-distill renderer fingerprint exposes a live single-engine baseline and honest unavailable states", async () => {
  const source = await readFile(new URL("../app/components/PhotoDistillRendererFingerprint.tsx", import.meta.url), "utf8");
  const response = await render("/skills/photo-distill");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /CODE-NATIVE EFFECT · ENGINE BASELINE/);
  assert.match(html, /MEASURING/);
  assert.match(html, /OPEN AFTER PARTIAL/);
  assert.match(source, /document\.fonts\?\.ready/);
  assert.match(source, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(source, /getImageData\(0, 0, canvas\.width, canvas\.height\)/);
  assert.match(source, /120,000 px/);
  assert.match(source, /status: "error"/);
  assert.match(source, /family: "chromium", label: "CHROME \/ CHROMIUM"/);
  assert.match(source, /family: "gecko", label: "FIREFOX \/ GECKO"/);
  assert.match(source, /family: "webkit", label: "SAFARI \/ WEBKIT"/);
  assert.match(source, /comparisonEngines\.filter\(\(engine\) => engine\.family !== fingerprint\.engineFamily\)/);
  assert.match(source, /unavailableEngines\.map\(\(engine\) =>/);
  assert.doesNotMatch(source, /<b>FIREFOX \/ GECKO<\/b><span>UNAVAILABLE/);
  assert.doesNotMatch(source, /<b>SAFARI \/ WEBKIT<\/b><span>UNAVAILABLE/);
});

test("application cards preserve heading hierarchy", async () => {
  const applicationSource = await readFile(new URL("../app/components/EffectApplicationShowcase.tsx", import.meta.url), "utf8");
  assert.match(applicationSource, /<h4>\{application\.title\}<\/h4>/);
  assert.match(applicationSource, /headingLevel = "h5"/);
  assert.match(applicationSource, /headingLevel\?: "h5" \| "h6"/);
  assert.doesNotMatch(applicationSource, /<h3>\{application\.title\}<\/h3>/);
});

test("research atlas connects every core web surface, Skill, and first-party document", async () => {
  const response = await render("/research");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /先找到证据/);
  assert.match(html, /12(?:<!-- -->)?<\/strong><span>个唯一上游仓库/);
  assert.match(html, /13(?:<!-- -->)?<\/strong><span>个独立 Skill 研究目标/);
  assert.equal((html.match(/<article[^>]+data-research-surface=/g) ?? []).length, 7);
  assert.equal((html.match(/<article[^>]+data-index-skill=/g) ?? []).length, 13);
  assert.equal((html.match(/<article[^>]+data-research-document=/g) ?? []).length, 20);
  assert.match(html, /projects\/skill-zine-summary\/RESEARCH-INDEX\.md/);
  assert.match(html, /projects\/skill-zine-summary\/UPSTREAM\.md/);
  assert.match(html, /projects\/skill-zine-summary\/lab\/web\/REVISION7-RESEARCH\.md/);
  assert.match(html, /projects\/skill-zine-summary\/lab\/web\/REVISION10-INDEPENDENT-SOURCES\.md/);
  assert.match(html, /projects\/skill-zine-summary\/lab\/web\/REVISION11-STRESS-AND-APPLICATIONS\.md/);
  assert.match(html, /projects\/skill-zine-summary\/lab\/web\/REVISION13-SKILL-CHOOSER\.md/);
  assert.match(html, /href="\/choose"/);
  assert.match(html, /projects\/skill-zine-summary\/lab\/web\/REVISION12-PRODUCT-SYSTEMS\.md/);
  assert.match(html, /href="\/comparison#photo-distill"/);
  assert.match(html, /href="\/labs\/multi-source\?skill=photo-relic-editorial#selected-skill"/);
  assert.equal((html.match(/<h1(?:\s[^>]*)?>/g) ?? []).length, 1);
});

test("multi-source lab reports honest totals and only expands the selected Skill", async () => {
  const response = await render("/labs/multi-source");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /127(?:<!-- -->)?<\/strong><span>组图片 SOURCE/);
  assert.match(html, /57(?:<!-- -->)?<\/strong><span>个不同图片来源路径/);
  assert.match(html, /129(?:<!-- -->)?<\/strong><span>个静态效果/);
  assert.match(html, /131(?:<!-- -->)?<\/strong><span>个总效果证据/);
  assert.match(html, /13(?:<!-- -->)? 组完整产品系统实验/);
  assert.match(html, /13(?:<!-- -->)? 组反向题材压力测试/);
  assert.match(html, /13(?:<!-- -->)? 组独立原图扩样/);
  assert.match(html, /没有成对原图的 68 张上游参考图不计入 (?:<!-- -->)?127(?:<!-- -->)? 组/);
  assert.equal((html.match(/<a[^>]+data-lab-skill-selector=/g) ?? []).length, 13);
  assert.match(html, /data-selected-skill="daily-photo-playground"[^>]+data-pair-count="10"[^>]+data-unique-source-count="8"/);
  assert.equal((html.match(/<article[^>]+data-lab-case=/g) ?? []).length, 10);
  assert.equal((html.match(/<article[^>]+data-lab-case=[^>]+data-cohort="product-system"/g) ?? []).length, 1);
  assert.equal((html.match(/<article[^>]+data-lab-case=[^>]+data-cohort="stress"/g) ?? []).length, 1);
  assert.equal((html.match(/<article[^>]+data-lab-case=[^>]+data-cohort="independent"/g) ?? []).length, 1);
  assert.equal((html.match(/<figure[^>]+data-viewer-item/g) ?? []).length, 20);
  assert.equal((html.match(/<div class="demo-figure__label">COMPLETE SOURCE/g) ?? []).length, 10);
  assert.equal((html.match(/<div class="demo-figure__label">COMPLETE EFFECT/g) ?? []).length, 10);
  assert.equal((html.match(/<section[^>]+data-digital-application-preview/g) ?? []).length, 1);
  assert.equal((html.match(/<article[^>]+data-product-system-preview="true"/g) ?? []).length, 1);
  assert.equal((html.match(/data-effect-evidence="reuse"/g) ?? []).length, 1);
  assert.equal((html.match(/data-process-step=/g) ?? []).length, 4);
  assert.match(html, /完整产品系统数字实验/);
  assert.match(html, /产品画布数字预演/);
  assert.match(html, /使用环境数字预演/);
  assert.match(html, /不冒充真实印刷、客户项目、现场投放或部署照片/);
  assert.match(html, /适合的使用场景/);
  assert.match(html, /边界／不能证明什么/);
  assert.match(html, /证据披露/);
  assert.doesNotMatch(html, /object-fit:\s*cover/i);
  assert.equal((html.match(/<h1(?:\s[^>]*)?>/g) ?? []).length, 1);

  const pixelResponse = await render("/labs/multi-source?skill=pixel-style-poster");
  assert.equal(pixelResponse.status, 200);
  const pixelHtml = await pixelResponse.text();
  assert.match(pixelHtml, /data-selected-skill="pixel-style-poster"[^>]+data-pair-count="10"[^>]+data-unique-source-count="8"/);
  assert.equal((pixelHtml.match(/<article[^>]+data-lab-case=/g) ?? []).length, 10);
});

test("global navigation exposes five stable entries with one current page", async () => {
  const routes = ["/", "/research", "/choose", "/comparison", "/labs/multi-source", "/reports/revision-7", "/skills/photo-distill"];
  for (const route of routes) {
    const response = await render(route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    const navLinks = [...html.matchAll(/<a[^>]+data-nav-key="([^"]+)"[^>]*>/g)];
    assert.equal(navLinks.length, 5, `${route} nav item count`);
    assert.equal(new Set(navLinks.map((match) => match[1])).size, 5, `${route} unique nav keys`);
    assert.equal(navLinks.filter((match) => /aria-current="page"/.test(match[0])).length, 1, `${route} current nav item`);
  }

  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*?\.site-header nav \{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.site-header nav \{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(css, /\.site-header nav a:last-child \{ grid-column: 1 \/ -1; \}/);
});

test("multi-source lab covers every Skill with the audited pair and source counts", async () => {
  const expected = {
    "daily-photo-playground": [10, 8],
    "dyy-photo-deconstruct": [10, 8],
    "travel-photo-abstraction": [10, 6],
    "scenes-gathered-zine": [10, 7],
    "scene-distillation-zine": [10, 8],
    "gc-minimal-zine-poster": [8, 6],
    "photo-revival": [10, 8],
    "pixel-style-poster": [10, 8],
    "photo-relic-editorial": [10, 10],
    "photo-distill": [9, 7],
    "poetic-line-zine-poster": [10, 7],
    "photo-abstract-editorial": [10, 7],
    "photo-to-zine-postcard": [10, 8],
  };

  let totalPairs = 0;
  for (const [slug, [pairCount, sourceCount]] of Object.entries(expected)) {
    const response = await render(`/labs/multi-source?skill=${slug}`);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.match(
      html,
      new RegExp(`data-selected-skill="${slug}"[^>]+data-pair-count="${pairCount}"[^>]+data-unique-source-count="${sourceCount}"`),
      `${slug} audited summary`,
    );
    assert.equal((html.match(/<article[^>]+data-lab-case=/g) ?? []).length, pairCount, `${slug} pair cards`);
    assert.equal((html.match(/<figure[^>]+data-viewer-item/g) ?? []).length, pairCount * 2, `${slug} complete source/effect figures`);
    assert.equal((html.match(/<article[^>]+data-lab-case=[^>]+data-cohort="stress"/g) ?? []).length, 1, `${slug} stress Revision 11 card`);
    assert.equal((html.match(/<article[^>]+data-lab-case=[^>]+data-cohort="independent"/g) ?? []).length, 1, `${slug} independent Revision 10 card`);
    assert.equal((html.match(/<article[^>]+data-lab-case=[^>]+data-cohort="product-system"/g) ?? []).length, 1, `${slug} product-system Revision 12 card`);
    assert.equal((html.match(/<section[^>]+data-digital-application-preview/g) ?? []).length, 1, `${slug} one digital application study`);
    assert.equal((html.match(/<article[^>]+data-product-system-preview="true"/g) ?? []).length, 1, `${slug} one complete product-system preview`);
    const productSurfaceCounts = [...html.matchAll(/<article[^>]+data-product-surface-count="(\d+)"[^>]+data-product-system-preview="true"/g)];
    assert.equal(productSurfaceCounts.length, 1, `${slug} product-system surface contract`);
    assert.ok(productSurfaceCounts.every((match) => Number(match[1]) >= 3), `${slug} product-system should contain at least three surfaces`);
    totalPairs += pairCount;
  }
  assert.equal(totalPairs, 127);
});

test("revision 10 adds one unique independent SOURCE and EFFECT for every Skill", async () => {
  const source = await readFile(new URL("../app/data/revision10-independent-experiments.ts", import.meta.url), "utf8");
  const sourcePaths = [...source.matchAll(/src: "(\/generated\/source\/revision10\/[^"]+\.(?:png|svg))"/g)].map((match) => match[1]);
  const effectPaths = [...source.matchAll(/src: "(\/generated\/studies\/[^"]+\/revision10-[^"]+\.(?:png|svg))"/g)].map((match) => match[1]);
  const slugs = [...source.matchAll(/skillSlug: "([^"]+)"/g)].map((match) => match[1]);

  assert.equal(slugs.length, 13);
  assert.equal(new Set(slugs).size, 13);
  assert.equal(sourcePaths.length, 13);
  assert.equal(new Set(sourcePaths).size, 13);
  assert.equal(effectPaths.length, 13);
  assert.equal(new Set(effectPaths).size, 13);

  const distillSvg = await readFile(new URL("../public/generated/studies/photo-distill/revision10-salt-pans-relations-effect.svg", import.meta.url), "utf8");
  assert.match(distillSvg, /data-experiment-id="salt-pans-relations"/);
  assert.match(distillSvg, /data-artifact-role="effect"/);
  assert.match(distillSvg, /data-photo-pixels="0"/);
  assert.match(distillSvg, /data-visible-text="0"/);
  assert.doesNotMatch(distillSvg, /<(?:image|text|script|foreignObject)\b/);
  assert.doesNotMatch(distillSvg, /\b(?:href|xlink:href)=/);
});

test("revision 11 adds one unique stress SOURCE and EFFECT plus one product study for every Skill", async () => {
  const [stressSource, independentSource, previewSource] = await Promise.all([
    readFile(new URL("../app/data/revision11-stress-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/revision10-independent-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/DigitalApplicationPreview.tsx", import.meta.url), "utf8"),
  ]);
  const sourcePaths = [...stressSource.matchAll(/src: "(\/generated\/source\/revision11\/[^"]+\.(?:png|svg))"/g)].map((match) => match[1]);
  const effectPaths = [...stressSource.matchAll(/effect: \{ src: "(\/generated\/studies\/[^"]+\/revision11-[^"]+\.(?:png|svg))"/g)].map((match) => match[1]);
  const slugs = [...stressSource.matchAll(/skillSlug: "([^"]+)"/g)].map((match) => match[1]);
  const applications = stressSource.match(/^ {4}application: \{/gm) ?? [];
  const revision10Paths = new Set([...independentSource.matchAll(/src: "(\/generated\/[^"]+)"/g)].map((match) => match[1]));

  assert.equal(slugs.length, 13);
  assert.equal(new Set(slugs).size, 13);
  assert.equal(sourcePaths.length, 13);
  assert.equal(new Set(sourcePaths).size, 13);
  assert.equal(effectPaths.length, 13);
  assert.equal(new Set(effectPaths).size, 13);
  assert.equal(applications.length, 13);
  assert.equal([...sourcePaths, ...effectPaths].filter((path) => revision10Paths.has(path)).length, 0);

  assert.equal((previewSource.match(/<EmbeddedEffect image=\{image\} \/>/g) ?? []).length, 2);
  assert.match(previewSource, /loading="lazy" decoding="async"/);
  assert.match(previewSource, /这里复用同一张 EFFECT/);
  assert.match(previewSource, /不是额外生成的成品图片，也不是已生产的实物/);
  assert.match(previewSource, /不冒充真实印刷、客户项目、现场投放或部署照片/);

  const distillSvg = await readFile(new URL("../public/generated/studies/photo-distill/revision11-crosswalk-flow-effect.svg", import.meta.url), "utf8");
  assert.match(distillSvg, /data-experiment-id="crosswalk-flow-distill"/);
  assert.match(distillSvg, /data-artifact-role="effect"/);
  assert.match(distillSvg, /data-photo-pixels="0"/);
  assert.match(distillSvg, /data-visible-text="0"/);
  assert.match(distillSvg, /data-flow-count="2"/);
  assert.match(distillSvg, /data-color-role-count="4"/);
  assert.match(distillSvg, /data-stagnation-gap-count="1"/);
  assert.doesNotMatch(distillSvg, /<(?:image|text|script|foreignObject)\b/);
  assert.doesNotMatch(distillSvg, /\b(?:href|xlink:href)=/);
});

test("revision 12 adds one unique product-system experiment per Skill without inflating effect evidence", async () => {
  const [source, revision10, revision11, component, page, css] = await Promise.all([
    readFile(new URL("../app/data/revision12-product-system-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/revision10-independent-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/revision11-stress-experiments.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ProductApplicationStudio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/labs/multi-source/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const sourcePaths = [...source.matchAll(/source: \{ src: "(\/generated\/source\/revision12\/[^"\s]+\.(?:png|svg))"/g)].map((match) => match[1]);
  const effectPaths = [...source.matchAll(/effect: \{ src: "(\/generated\/studies\/[^"\s]+\/revision12-[^"\s]+\.(?:png|svg))"/g)].map((match) => match[1]);
  const slugs = [...source.matchAll(/skillSlug: "([^"]+)"/g)].map((match) => match[1]);
  const productCases = source.match(/^ {4}product: \{/gm) ?? [];
  const previousPaths = new Set(
    [revision10, revision11].flatMap((entry) => [...entry.matchAll(/src: "(\/generated\/[^"\s]+)"/g)].map((match) => match[1])),
  );

  assert.equal(slugs.length, 13);
  assert.equal(new Set(slugs).size, 13);
  assert.equal(sourcePaths.length, 13);
  assert.equal(new Set(sourcePaths).size, 13);
  assert.equal(effectPaths.length, 13);
  assert.equal(new Set(effectPaths).size, 13);
  assert.equal(productCases.length, 13);
  assert.equal([...sourcePaths, ...effectPaths].filter((path) => previousPaths.has(path)).length, 0);
  for (const label of ["保留", "适配", "生产", "应用"]) {
    assert.equal((source.match(new RegExp(`\\{ label: "${label}"`, "g")) ?? []).length, 13, `${label} process-step count`);
  }

  for (const path of [...sourcePaths, ...effectPaths]) {
    const bytes = await readFile(new URL(`../public${path}`, import.meta.url));
    if (path.endsWith(".png")) {
      assert.equal(bytes.toString("ascii", 1, 4), "PNG", `${path} PNG signature`);
      assert.equal(bytes.readUInt32BE(16), 1024, `${path} width`);
      assert.equal(bytes.readUInt32BE(20), 1536, `${path} height`);
    }
  }

  assert.match(component, /export function ProductApplicationCaseStudy/);
  assert.match(component, /variant\?: "standalone" \| "embedded"/);
  assert.match(component, /\{!embedded && <DemoFigure/);
  assert.match(component, /data-product-system-preview=\{embedded \? "true" : undefined\}/);
  assert.match(component, /data-effect-evidence=\{embedded \? "reuse" : undefined\}/);
  assert.match(component, /loading="lazy"/);
  assert.match(component, /decoding="async"/);
  assert.match(component, /objectFit: "contain"/);
  assert.match(component, /product-studio__stage-canvas" role="group"/);
  assert.doesNotMatch(component, /product-studio__stage-canvas" role="img"/);
  assert.match(component, /<p className="case-product__title">/);
  assert.doesNotMatch(component, /<h6>/);
  assert.match(page, /application=\{\{ \.\.\.entry\.product, effect: entry\.effect \}\}/);
  assert.match(css, /\.product-studio__case--embedded \.product-studio__visual-sequence \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.product-studio__case--embedded \.product-studio__visual-sequence \{ grid-template-columns: 1fr; \}/);

  const distillSource = await readFile(new URL("../public/generated/source/revision12/photo-distill-fulfillment-source.png", import.meta.url));
  const distillSvg = await readFile(new URL("../public/generated/studies/photo-distill/revision12-fulfillment-wave-effect.svg", import.meta.url), "utf8");
  const sourceHash = createHash("sha256").update(distillSource).digest("hex");
  assert.match(distillSvg, new RegExp(`data-source-sha256="${sourceHash}"`));
  assert.match(distillSvg, /width="1200" height="1600"/);
  assert.match(distillSvg, /data-flow-count="2"/);
  assert.match(distillSvg, /data-density-zone-count="4"/);
  assert.match(distillSvg, /data-abnormal-gap-count="1"/);
  assert.match(distillSvg, /data-photo-pixels="0"/);
  assert.match(distillSvg, /data-visible-text="0"/);
  assert.equal((distillSvg.match(/data-density-zone=/g) ?? []).length, 4);
  assert.doesNotMatch(distillSvg, /<(?:image|text|script|foreignObject)\b/);
  assert.doesNotMatch(distillSvg, /\b(?:href|xlink:href)=/);
});

test("Skill chooser routes four explicit contracts to all, exact, and disclosed-nearest evidence", async () => {
  const initialResponse = await render("/choose");
  assert.equal(initialResponse.status, 200);
  const initialHtml = await initialResponse.text();

  assert.equal((initialHtml.match(/<h1(?:\s[^>]*)?>/g) ?? []).length, 1);
  assert.equal((initialHtml.match(/data-common-selection-task=/g) ?? []).length, 5);
  assert.equal((initialHtml.match(/<select[^>]+name="(?:purpose|fidelity|path|format)"/g) ?? []).length, 4);
  const chooserForm = initialHtml.match(/<form[^>]+data-skill-selection-form="true"[^>]*>/)?.[0] ?? "";
  assert.match(chooserForm, /action="\/choose#results"/);
  assert.match(chooserForm, /method="get"/);
  assert.match(initialHtml, /data-selection-mode="all"[^>]+data-selection-result-count="13"/);
  assert.equal((initialHtml.match(/data-selection-skill=/g) ?? []).length, 0);
  assert.equal((initialHtml.match(/data-selection-map-skill=/g) ?? []).length, 13);
  const upstreamRepos = [...initialHtml.matchAll(/data-upstream-repo="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(upstreamRepos.length, 13);
  assert.equal(new Set(upstreamRepos).size, 12);
  assert.equal((initialHtml.match(/data-selection-default-state=/g) ?? []).length, 1);
  assert.equal((initialHtml.match(/<dt>上游仓库<\/dt>/g) ?? []).length, 13);
  assert.equal((initialHtml.match(/<dt>许可边界<\/dt>/g) ?? []).length, 13);
  assert.doesNotMatch(initialHtml, /<img\b|src="\/generated\//i);
  assert.match(initialHtml, /默认不重复铺开 13 张长卡/);
  assert.match(initialHtml, /不按效果质量、图片数量或产品成熟度排名/);
  assert.match(initialHtml, /公开托管仍然阻塞/);

  const commonTaskHrefs = [...initialHtml.matchAll(/<a href="([^"]+)" data-common-selection-task=/g)]
    .map((match) => match[1].replaceAll("&amp;", "&").split("#")[0]);
  assert.equal(commonTaskHrefs.length, 5);
  for (const taskHref of commonTaskHrefs) {
    const taskResponse = await render(taskHref);
    assert.equal(taskResponse.status, 200, taskHref);
    const taskHtml = await taskResponse.text();
    assert.match(taskHtml, /data-selection-mode="exact"/, `${taskHref} should have at least one exact route`);
  }

  const exactResponse = await render(
    "/choose?purpose=relation-analysis&fidelity=relation-only&path=code-native&format=screen-exhibition",
  );
  assert.equal(exactResponse.status, 200);
  const exactHtml = await exactResponse.text();
  assert.match(exactHtml, /data-selection-mode="exact"[^>]+data-selection-result-count="1"/);
  assert.equal((exactHtml.match(/data-selection-skill=/g) ?? []).length, 1);
  assert.match(exactHtml, /data-selection-skill="photo-distill"/);
  assert.doesNotMatch(exactHtml, /data-mismatch-dimension=/);
  const exactEvidenceSection = exactHtml.match(/<section class="choose-result-card__evidence"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.ok(exactEvidenceSection);
  assert.equal((exactEvidenceSection.match(/<li>/g) ?? []).length, 3);
  assert.match(exactEvidenceSection, /独立原图扩样 · R10/);
  assert.match(exactEvidenceSection, /反向题材压力测试 · R11/);
  assert.match(exactEvidenceSection, /完整产品系统数字实验 · R12/);
  assert.match(exactHtml, /三轮不同角度的代表案例/);
  assert.match(exactHtml, /下一步怎么测/);
  assert.match(exactHtml, /什么情况算失败/);
  assert.match(exactHtml, /yangcodingmaster\/photo-distill/);
  assert.match(exactHtml, /未声明许可证/);

  const nearestResponse = await render("/choose?path=code-native&format=print-product");
  assert.equal(nearestResponse.status, 200);
  const nearestHtml = await nearestResponse.text();
  const nearestCount = Number(nearestHtml.match(/data-selection-mode="nearest"[^>]+data-selection-result-count="(\d+)"/)?.[1] ?? 0);
  assert.ok(nearestCount > 0);
  assert.equal((nearestHtml.match(/data-selection-skill=/g) ?? []).length, nearestCount);
  assert.ok((nearestHtml.match(/data-mismatch-dimension="(?:path|format)"/g) ?? []).length >= nearestCount);
  assert.match(nearestHtml, /最近候选，不是完全匹配/);
  assert.match(nearestHtml, /<select[^>]+name="format"[\s\S]*?<option value="print-product" selected="">/);
  assert.doesNotMatch(nearestHtml, /<select[^>]+name="stage"/);

  const invalidResponse = await render("/choose?purpose=not-a-real-option");
  assert.equal(invalidResponse.status, 200);
  const invalidHtml = await invalidResponse.text();
  assert.match(invalidHtml, /data-selection-mode="all"[^>]+data-selection-result-count="13"/);

  const dailyEvidenceLink = initialHtml.match(/href="(\/labs\/multi-source\?skill=daily-photo-playground#([^"]+))"/);
  assert.ok(dailyEvidenceLink, "daily Skill should expose a stable Revision 12 evidence link");
  const dailyLabResponse = await render("/labs/multi-source?skill=daily-photo-playground");
  assert.equal(dailyLabResponse.status, 200);
  const dailyLabHtml = await dailyLabResponse.text();
  assert.match(dailyLabHtml, new RegExp(`id="${dailyEvidenceLink[2]}"`));

  const [chooserSource, guideSource, css] = await Promise.all([
    readFile(new URL("../app/choose/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/skill-selection-guide.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(chooserSource, /<fieldset/);
  assert.match(chooserSource, /<legend>/);
  assert.match(guideSource, /Skill selection guide must contain exactly 13 unique Skill slugs/);
  assert.match(guideSource, /Skill selection guide expected exactly one/);
  assert.match(guideSource, /forbiddenSelectionFieldNames/);
  assert.match(guideSource, /representativeEvidence/);
  assert.match(guideSource, /must cover all five Revision 13 falsifiable validation classes/);
  assert.doesNotMatch(guideSource, /SelectionStage|selectionOptions\.stage|filters\.stage|entry\.stages/);
  assert.match(css, /\.choose-results__grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.choose-results__grid,[\s\S]*?grid-template-columns:\s*1fr/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.choose-result-card__contracts,[\s\S]*?grid-template-columns:\s*1fr/s);
  assert.match(css, /\.choose-filter__form select\s*\{[^}]*min-height:\s*48px/s);
  assert.match(css, /\.choose-map__grid nav a\s*\{[^}]*min-height:\s*44px/s);
});
