# Product browser acceptance evidence

## 2026-08-18 · Old-photo example visibility repair

- Gallery run: `9f5e9f31-4b7c-4d8e-ae21-223344556677`, `2/2 pass`
- Browser: isolated Playwright with installed Chrome, `zh-CN`

The old-photo local example previously used the deliberately mild faded preset, with a measured mean absolute channel delta near `6.36`, and the static generated reference could briefly show an empty checkerboard while its large PNG was still decoding. The local card now uses the existing monochrome preset, not a new algorithm; both old-photo cards load eagerly, show an explicit loading state, wait for runtime decode and expose a standalone result link. At 1180 px and 390 px, all 18 images were complete. The local old-photo result measured `10.67` mean channel delta and `98.4%` changed-pixel coverage. This makes the demonstrated local change observable while retaining the explicit boundary that scratches, faces and missing content are not repaired.

## 2026-08-18 · Local execution plan extraction regression

- Product run: `8e4d8e20-3a6b-4c7d-9e10-112233445566`, `6/6 pass`
- Browser: isolated Playwright with installed Chrome, `zh-CN`

The first isolated run exposed a real wiring defect: non-rectification tasks read `rectificationPostProcess.label` from `null`, leaving five journeys at the task-loading state while document archive passed. Unit tests had not exercised that main-controller path. After changing the label input to an explicit optional value and adding a source-boundary assertion, the isolated run completed all six journeys in about 5.7 seconds with zero page errors. Dimensions remained exact; encoded byte lengths differed slightly from the in-app Chromium checkpoint as expected across browser sessions. One top-level missing-favicon 404 remained outside the product iframe; every journey's own console-error assertion passed. No provider was invoked.

## 2026-08-18 · Settings controller extraction regression

- Product run: `28e728ca-d455-4617-b7aa-bbccddeeff00`, `6/6 pass`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`

After workflow parameter drift checks, task-specific settings normalization and remote-consent gates moved into `settings-controller.js`, all six local journeys reproduced their checkpoint output dimensions and byte lengths. The product still submitted the same crop, size, format, compression, document and privacy settings, reopened every output and preserved task-change, stale-download and focus behavior. No provider call was made. This is a no-behavior-change settings refactor, not additional image capability.

## 2026-08-18 · Source/task controller extraction regression

- Product run: `17d617b9-c344-4506-a699-aabbccddeeff`, `6/6 pass`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`

After product task ordering, runtime classification, runnable selection and source-session reset decisions moved into `source-task-controller.js`, all six local journeys reproduced the checkpoint dimensions and byte lengths. Task discovery, settings entry, result reopen, change-task navigation, stale-download invalidation and focus cleanup passed. This was a no-behavior-change refactor and made no provider call; it adds maintainability evidence, not image-quality or user-value evidence.

## 2026-08-18 · Internal-alpha checkpoint regression

- Product run: `f5b4f597-a122-43e4-8477-8899aabbccdd`, `6/6 pass`
- Page / walkthrough run: `06c506a8-b233-44f5-9588-99aabbccddee`, `2/2 pass`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`

After the integrated product/engineering plan was landed and the historical `UT-SOLID-BG` top-level task was removed, all six local product journeys reproduced their prior dimensions and byte lengths. The second run verified both walkthrough viewports, the 13-page registry and every registered route with `HTTP 200 + text/html`. Solid-background export remains available inside the cutout, product and portrait result workbenches; only the duplicate, permanently unrunnable catalog identity was removed. No remote provider was invoked. These runs are checkpoint regression evidence, not human usability or natural-image quality evidence.

## 2026-08-18 · Privacy-friendly share scenario

- Product run: `6b6c6d6e-7f70-4ba9-8fdc-4567890123bc`, `6/6 pass`
- Gallery run: `7c7d7e7f-8081-4cba-8aed-5678901234cd`, `2/2 pass`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`

The new local journey selected `UT-PRIVACY-SHARE`, kept the complete 4:3 synthetic source, generated a `1440 × 1080`, `38,471`-byte JPEG, displayed the metadata/size/byte checks, reopened the captured Blob, changed task, invalidated the stale download and restored focus. The five prior local journeys also passed. The gallery then passed at 1180 px and 390 px with 9 cards, 18 complete images and 6 runtime results; its privacy-share example produced `1536 × 1024` / `290 KB`. No remote provider was called. These runs prove the local file-metadata output policy and browser flow, not visible-content anonymity or platform acceptance.

## 2026-08-18 · Unified error experience second batch

- Error matrix run: `2d2c2b2a-3938-4765-8bf8-0123456789de`, `2/2 pass`
- Product regression run: `3e3d3c3b-4a49-4876-9ca9-1234567890ef`, `5/5 pass`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`

The error matrix confirmed all seven contexts after settings/output/network integration at 1180 px and 390 px. It additionally required local output failure to offer “返回设置” and network-unavailable copy to preserve local capability. The separate product regression confirmed the five local success journeys still produced and reopened the same PNG/JPEG dimensions and byte lengths with navigation, stale-download and focus checks intact. The matrix is deterministic UI evidence and did not trigger a real network outage, download corruption or provider call.

## 2026-08-18 · Unified error experience first batch

- Error matrix run: `0b0a0908-1716-4543-8fd6-8901234567bc`, `2/2 pass`
- Product regression run: `1c1b1a19-2827-4654-8ae7-9012345678cd`, `5/5 pass`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`

The error matrix rendered the same strict presentation and recovery mappings used by the product at 1180 px and 390 px. Both viewports passed 7-context facts, default-closed technical disclosure, remote-definitive local fallback, remote-unknown original-run query and horizontal-overflow checks. No provider request was made. The separate five-journey product run then confirmed the expanded error DOM did not regress successful PNG/JPEG output, reopen, navigation, stale-download cleanup or focus. This is interface and recovery evidence; it is not evidence of a real provider incident, refund, deletion or network outage.

## 2026-08-18 · Examples gallery second batch

- Run ID: `faf9f8f7-a6b5-4342-8ec5-7890123456ab`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`
- Interval: `2026-08-17T16:24:08.140Z` to `2026-08-17T16:24:10.365Z`
- Result: `2/2 pass`

The 1180 px and 390 px gallery frames each loaded 8 cards, 16 complete images and 5 product-renderer runtime results. Local/reference filtering, `object-fit: contain`, desktop side-by-side layout, narrow stacking and horizontal-overflow checks passed. The new project-original skewed document produced three distinct local outcomes: rectified clean-color JPEG `709 × 823` / `100 KB`, strict-upload JPEG `1200 × 800` / `177 KB`, and 500 KB-target compression JPEG `1536 × 1024` / `290 KB`. The run made no remote provider call and does not prove OCR, automatic document detection, website acceptance or semantic quality.

## 2026-08-18 · Examples gallery first batch

- Run ID: `c7c6c5c4-d3e2-4f10-8b92-4567890123de`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`
- Interval: `2026-08-17T16:15:07.725Z` to `2026-08-17T16:15:09.170Z`
- Result: `2/2 pass`

The gallery acceptance loaded `/examples.html` in same-origin `1180 px` and `390 px` iframes. Each viewport contained 5 cards, 10 fully loaded `object-fit: contain` images, and 2 local runtime results generated through the product renderer. Local/reference filtering and horizontal-overflow checks passed; the narrow viewport placed each source/result pair vertically. The run used only registered repository assets and made no remote provider call. It verifies the first gallery batch, not natural-image quality, provider quality or public release readiness.

## 2026-08-17 · S1 runtime-profile and comparison-copy regression

- Run ID: `d9742750-f7bb-4898-b412-bde47f12fcb9`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`
- Interval: `2026-08-17T15:54:23.361Z` to `2026-08-17T15:55:00.652Z`
- Result: `5/5 pass`

This run followed the third S1 structure refactor. One runtime profile now owns execution/editor/composed-background/rectification classification for all 17 catalog tasks, and source/result/reference/split size copy now comes from the pure result-presentation module. All five local journeys passed with unchanged dimensions and byte lengths. Full display, PNG/JPEG reopen, task change, stale-download cleanup and focus cleanup passed. No remote provider was invoked. This closes the current S1 browser-regression scope and does not add capability or release evidence.

## 2026-08-17 · S1 document-workflow and result-facts regression

- Run ID: `c4b26b77-f423-4a59-88e4-dfba9ed047c2`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`
- Interval: `2026-08-17T15:46:57.554Z` to `2026-08-17T15:47:33.795Z`
- Result: `5/5 pass`

This run followed the second S1 structure refactor: `UT-DOC-ARCHIVE` joined the strict workflow-definition registry, and result summary / QA / size facts moved into the pure result-presentation module. The same five local journeys passed again. Upload specification reopened a `1200 × 900`, `33,550`-byte JPEG; document archive reopened a `1448 × 1086`, `446,362`-byte JPEG. The three existing PNG journeys retained their prior dimensions and byte lengths. Full display, result reopen, task change, stale-download cleanup and focus cleanup passed. No remote provider was invoked, and no image-quality or release claim changed.

## 2026-08-17 · S1 structure-refactor regression

- Run ID: `b671637d-2a0e-4e55-93fa-8d460912e85c`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`
- Interval: `2026-08-17T15:38:51.115Z` to `2026-08-17T15:39:39.915Z`
- Result: `5/5 pass`

This run followed the first S1 structure refactor: error copy, result labels / visibility, and the first strict `UT-UPLOAD` workflow definition were moved out of `main.js`. The same five local journeys passed again with the same observed dimensions and byte lengths as the immediately preceding five-journey baseline: `1080 × 1080` / `570,313`-byte PNG, `1440 × 810` / `155,447`-byte PNG, `1448 × 1086` / `1,893,410`-byte PNG, `1200 × 900` / `33,550`-byte JPEG, and `1448 × 1086` / `446,362`-byte JPEG. Full display, container reopen, task change, stale-download cleanup and focus cleanup passed. No remote provider was invoked. This is regression evidence for preserved browser behavior, not new image-quality or release evidence.

## 2026-08-17 · Five local journeys closed

- Run ID: `53b27d40-83d2-4c82-942d-7c683d64bb30`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`
- Interval: `2026-08-17T15:12:04.181Z` to `2026-08-17T15:12:24.586Z`
- Result: `5/5 pass`

| Journey | Result | Browser evidence |
| --- | --- | --- |
| Basic editing | pass | `1080 × 1080` PNG, `570,313` bytes; full display, reopen, task change, stale-download cleanup, and focus passed |
| Social layout | pass | `1440 × 810` PNG, `155,447` bytes; full display, reopen, task change, and focus passed |
| Old-photo local整理 | pass | `1448 × 1086` PNG, `1,893,410` bytes; full display, reopen, task change, and focus passed |
| Upload specification | pass | `1200 × 900` JPEG, `33,550` bytes; strict-form target, full display, reopen, task change, and focus passed |
| Document archive | pass | `1448 × 1086` JPEG, `446,362` bytes; non-square source, clean-color mode, full display, reopen, task change, and focus passed |

This run used project-synthetic images and no remote provider. It verifies the current Chromium session and browser-captured Blob outputs; it does not verify the operating-system download directory, real user images, native keyboard/pointer input, or public release readiness. Earlier two- and three-journey records remain historical and are not rewritten.

## Scope

This record covers the local, synthetic, same-origin product acceptance runs executed in the Codex in-app Chromium session and the independently installed Chrome and Edge browsers on 2026-08-17. Two desktop product journeys ran in all three browser sessions; a third old-photo local journey later ran in the Codex in-app Chromium session. It is not native keyboard, pointer, or operating-system download evidence and is not a product-release claim.

The project server was running from this directory with:

```powershell
node --env-file-if-exists=.env server/server.mjs
```

The acceptance page was opened at:

```text
http://127.0.0.1:4177/product-acceptance.html?refresh=browser-evidence-v1&reportRunId=8ede9a34-4642-4504-9454-8185294dd75d
```

## Recorded browser runs

All runs used report version `product-acceptance-report-v1`. The independently installed browser product versions were read from their Windows executable metadata before launch: Chrome `151.0.7922.138` and Edge `151.0.4129.78`.

| Browser session | Run ID | UTC interval | Browser report | Language | Result |
| --- | --- | --- | --- | --- | --- |
| Codex in-app Chromium | `8ede9a34-4642-4504-9454-8185294dd75d` | `00:09:13.791`–`00:09:15.127` | `Chrome/151.0.0.0` | `zh-CN` | 2/2 pass |
| Installed Chrome `151.0.7922.138` | `195bf2ad-c746-4a97-9f62-1e47dc38b451` | `00:18:44.706`–`00:18:58.780` | `Chrome/151.0.0.0` | `zh-CN` | 2/2 pass |
| Installed Edge `151.0.4129.78` | `96345db4-e051-4f0a-b05e-742285f502dd` | `00:19:17.419`–`00:19:34.760` | `Edg/151.0.0.0` | `en-US` | 2/2 pass |

| Coverage item | Browser viewport | Product journey | Result |
| --- | --- | --- | --- |
| `desktop-min` | `1280 × 720` | `UT-TUNE` → 1:1 crop → rotate 90° → local PNG | Pass: `1080 × 1080`, `570,313` bytes; full-image presentation, PNG reopen, result-to-task navigation, focus cleanup, and stale-download invalidation passed |
| `desktop-common` | `1440 × 900` | `UT-TEMPLATE` → 16:9 cover → local PNG | Pass: `1440 × 810`, `141,549` bytes; full-image presentation, PNG reopen, result-to-task navigation, focus cleanup, and stale-download invalidation passed |

The installed Chrome and Edge runs produced `571,220`-byte square outputs and `139,078`-byte wide outputs; both dimensions and all journey checks matched. Encoded byte lengths are browser-session observations, not a cross-browser byte-identity requirement.

Every run checked that the result image uses `object-fit: contain`, the page has no horizontal overflow, returning from settings uses the same task reset transition, the old download action cannot fire after changing task, and no unhandled console error was recorded within the journey.

## Scenario-skill integration rerun

After the task selector was reorganized around real use cases, the same self-driven in-app Chromium route was rerun as `4a12b957-68e6-4bee-9cc5-48dd2c714ae8` from `2026-08-17T02:30:14.065Z` to `02:30:15.907Z`. Before either local journey, the route asserted this exact group and scenario order:

```text
按实际用途开始: UT-PRODUCT → UT-PORTRAIT → UT-TEMPLATE
自由调整工具
创意生成
```

It also asserted each scenario card's registry identity. Both existing local journeys then passed again: `desktop-min` produced a reopened `1080 × 1080` PNG of `570,313` bytes, and `desktop-common` produced a reopened `1440 × 810` PNG of `141,549` bytes. This proves the scenario layer did not break the local renderer, download, full-image presentation, task reset or focus cleanup paths. At that revision it deliberately did not click the two remote scenarios, so it made no provider call and is not remote quality evidence.

After `CR-RESTORE` was added as a fourth scenario, the no-call route was rerun as `cae0c93e-0c47-42c4-a744-5fcf8419868f` from `2026-08-17T02:46:03.233Z` to `02:46:04.659Z`. The route first asserted the exact scenario order `UT-PRODUCT → UT-PORTRAIT → UT-TEMPLATE → CR-RESTORE` and the `old-photo-restoration` registry identity, then repeated both local journeys. `desktop-min` again produced a reopened `1080 × 1080` PNG of `570,313` bytes and `desktop-common` a reopened `1440 × 810` PNG of `141,549` bytes. It did not click `CR-RESTORE`, did not send an image to OpenAI, and provides no evidence about restoration fidelity or model quality.

After the project-original old-photo fixture and the three-layer capability summary were added, the route was expanded to three local journeys and rerun in the Codex in-app Chromium session as `583c38ca-a65c-475d-8b19-843061a2ae4c` from `2026-08-17T03:48:33.602Z` to `03:48:35.535Z`. The server accepted the complete three-case report. `desktop-min` and `desktop-common` retained the same reopened dimensions and byte lengths above; `old-photo-local` ran at `1366 × 768`, loaded the bounded demo asset, applied the local black-and-white-levels preset, and reopened a `1448 × 1086` PNG of `1,870,944` bytes. All three cases passed full-image presentation, PNG reopen, result-to-task navigation, focus cleanup and stale-download invalidation. The route also required exactly three capability-summary cards in local / cutout / generative order, with the local layer available and the unconfigured generative layer unavailable. This is evidence for the deterministic local preset workflow and its interface state, not evidence for scratch removal, face reconstruction or AI restoration quality.

After the optional social-title renderer was connected, the three-case route was rerun in the Codex in-app Chromium session as `c3d2e1f0-1234-4abc-8def-0123456789ab` from `2026-08-17T05:27:28.857Z` to `05:27:31.211Z`. All 3 cases passed. In `desktop-common`, the route selected the wide-cover preset, entered the exact title `今天的城市散步`, selected bottom / left / light, and required the editor overlay to be visible with the same text. It then required the result QA copy to include `标题安全区`, captured the actual Blob download and reopened a `1440 × 810` PNG of `155,447` bytes. `desktop-min` again reopened `1080 × 1080` / `570,313` bytes and `old-photo-local` reopened `1448 × 1086` / `1,870,944` bytes. This proves the title is painted into the Canvas result and download rather than existing only as a DOM overlay. The 7% inset is a generic project safe area, not an official platform specification; the route still does not witness native pointer input or the operating-system download folder.

## Stage 7 coverage decisions

| Coverage row | Decision | Evidence or retest trigger |
| --- | --- | --- |
| Local journey × 1280×720 × in-app Chromium / Chrome / Edge | pass | Three sessions completed `desktop-min`; PNG reopened and navigation/focus assertions passed |
| Local journey × 1440×900 × in-app Chromium / Chrome / Edge | pass | Three sessions completed `desktop-common`; PNG reopened and navigation/focus assertions passed |
| Old-photo local journey × 1366×768 × in-app Chromium | pass | Run `583c38ca-a65c-475d-8b19-843061a2ae4c` completed `old-photo-local`; `1448 × 1086` PNG reopened and navigation/focus assertions passed |
| Social short title × 1440×900 × in-app Chromium | pass | Run `c3d2e1f0-1234-4abc-8def-0123456789ab` checked exact editor preview, title-safe-area QA, Canvas pixels, Blob capture and reopened `1440 × 810` PNG |
| Scenario grouping × 1280×720 / 1440×900 × in-app Chromium | pass | Registry order and identities were asserted before both local journeys in run `4a12b957-68e6-4bee-9cc5-48dd2c714ae8` |
| Three-layer capability summary × in-app Chromium | pass | The three-case run required local / cutout / generative ordering and truthful available/unavailable states before every journey |
| Native keyboard focus order and visible focus | defer | The self-driven route verifies product-generated focus transitions but cannot inject or witness native Tab / Shift+Tab; retest when a browser-control connection or attended manual keyboard session is available |
| Native pointer and OS download destination | defer | The route exercises click handlers and captured Blob downloads but does not witness physical pointer input or the operating-system download folder; retest in an attended Chrome / Edge session |

## Report boundary

The acceptance page publishes only the bounded report above to `/api/internal/product-acceptance/latest`. The endpoint is loopback-only, keeps only the latest report in memory, rejects unknown fields and payloads over 16 KiB, and is disabled in LAN preview mode. It does not accept or retain image bytes, downloads, API keys, provider responses, filesystem paths, or user content.

## Deferred coverage

The following checks remain pending and are not implied by this pass:

- native Tab / Shift+Tab order, real pointer or touch input, and OS-level download-folder observation;
- ICC / sRGB behavior outside the renderer's current container and pixel checks;
- remote background-removal, portrait, creative-generation, mask-correction, or provider-failure journeys;
- real user photos, participant testing, mobile browsers, Safari, or Firefox.

The passed rows are Stage 7 browser evidence for the local desktop engine and viewport baseline only. The two explicit defers prevent declaring the complete M1b input/download matrix finished. C/U/E/R/O/G/V and product-release gates remain unchanged.
## 2026-08-18 · Internal walkthrough tool acceptance

- Run ID: `e4a3e486-9011-42d3-b376-778899aabbcc`
- Browser: Codex in-app Chromium, `Chrome/151.0.0.0`, `zh-CN`
- Interval: `2026-08-17T23:39:14.633Z` to `23:39:15.184Z`
- Result: `2/2 pass`

The same-origin acceptance page loaded the internal quality hub, walkthrough tool and local aggregate page in 1180 px and 390 px frames. Both views rendered all 13 registered HTML pages in five roles with task-capability labels, fetched every registered route and required `HTTP 200 + text/html`, exposed the four distinct quality routes and explicit `0/2–3` human denominator, enforced the consent and project-image gates, produced a locally validated anonymous record, imported two synthetic JSON records through the real browser file input, aggregated them without session IDs or free text, cleared prior state and had no horizontal overflow. The report endpoint is loopback-only and in-memory.

This is browser QA for the facilitator tool, not a participant session. It does not change `human-sessions=0`, the `0/2–3` method-rehearsal denominator, M2 `0/5–8`, image-quality evidence or any release gate.
