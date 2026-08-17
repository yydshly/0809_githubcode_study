# Product browser acceptance evidence

## Scope

This record covers the local, synthetic, same-origin product acceptance run executed in the Codex in-app Chromium session on 2026-08-17. It is browser evidence for two desktop product journeys; it is not a full Chrome / Edge compatibility matrix or a product-release claim.

The project server was running from this directory with:

```powershell
node --env-file-if-exists=.env server/server.mjs
```

The acceptance page was opened at:

```text
http://127.0.0.1:4177/product-acceptance.html?refresh=browser-evidence-v1&reportRunId=8ede9a34-4642-4504-9454-8185294dd75d
```

## Recorded browser run

| Field | Recorded value |
| --- | --- |
| Report version | `product-acceptance-report-v1` |
| Run ID | `8ede9a34-4642-4504-9454-8185294dd75d` |
| Started | `2026-08-17T00:09:13.791Z` |
| Completed | `2026-08-17T00:09:15.127Z` |
| Browser engine report | `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36` |
| Language | `zh-CN` |

| Coverage item | Browser viewport | Product journey | Result |
| --- | --- | --- | --- |
| `desktop-min` | `1280 × 720` | `UT-TUNE` → 1:1 crop → rotate 90° → local PNG | Pass: `1080 × 1080`, `570,313` bytes; full-image presentation, PNG reopen, result-to-task navigation, focus cleanup, and stale-download invalidation passed |
| `desktop-common` | `1440 × 900` | `UT-TEMPLATE` → 16:9 cover → local PNG | Pass: `1440 × 810`, `141,549` bytes; full-image presentation, PNG reopen, result-to-task navigation, focus cleanup, and stale-download invalidation passed |

Both journeys also checked that the result image uses `object-fit: contain`, the page has no horizontal overflow, returning from settings uses the same task reset transition, the old download action cannot fire after changing task, and no unhandled console error was recorded within the journey.

## Report boundary

The acceptance page publishes only the bounded report above to `/api/internal/product-acceptance/latest`. The endpoint is loopback-only, keeps only the latest report in memory, rejects unknown fields and payloads over 16 KiB, and is disabled in LAN preview mode. It does not accept or retain image bytes, downloads, API keys, provider responses, filesystem paths, or user content.

## Deferred coverage

The following checks remain pending and are not implied by this pass:

- independently launched Chrome and Edge stable-version runs;
- native Tab / Shift+Tab order, real pointer or touch input, and OS-level download-folder observation;
- ICC / sRGB behavior outside the renderer's current container and pixel checks;
- remote background-removal, portrait, creative-generation, mask-correction, or provider-failure journeys;
- real user photos, participant testing, mobile browsers, Safari, or Firefox.

The two passed rows are Stage 7 browser evidence for the local desktop baseline only. C/U/E/R/O/G/V and product-release gates remain unchanged.
