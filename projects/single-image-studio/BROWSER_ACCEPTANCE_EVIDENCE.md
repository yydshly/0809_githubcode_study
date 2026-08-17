# Product browser acceptance evidence

## Scope

This record covers the local, synthetic, same-origin product acceptance runs executed in the Codex in-app Chromium session and the independently installed Chrome and Edge browsers on 2026-08-17. It is browser evidence for two desktop product journeys in three browser sessions; it is not native keyboard, pointer, or operating-system download evidence and is not a product-release claim.

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

## Stage 7 coverage decisions

| Coverage row | Decision | Evidence or retest trigger |
| --- | --- | --- |
| Local journey × 1280×720 × in-app Chromium / Chrome / Edge | pass | Three sessions completed `desktop-min`; PNG reopened and navigation/focus assertions passed |
| Local journey × 1440×900 × in-app Chromium / Chrome / Edge | pass | Three sessions completed `desktop-common`; PNG reopened and navigation/focus assertions passed |
| Scenario grouping × 1280×720 / 1440×900 × in-app Chromium | pass | Registry order and identities were asserted before both local journeys in run `4a12b957-68e6-4bee-9cc5-48dd2c714ae8` |
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
