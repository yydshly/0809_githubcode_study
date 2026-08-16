# Continuous-alpha public-synthetic evaluation definition

## Outcome

`CC-CAP04-CONTINUOUS-ALPHA-EVAL@0.1.0` now freezes a candidate-neutral, results-zero definition for comparing the two registered continuous-alpha candidates. It does not download or run either model and does not define a capability-pass threshold.

The definition contains six project-original synthetic source units:

1. binary hard edge;
2. topology with an interior hole;
3. radial soft edge;
4. diagonal feathered edge;
5. three thin soft strands;
6. a semi-transparent feathered object.

Each source has one opaque strict-sRGB input and one exact 8-bit alpha ground truth. No source contains a real person, user photo, third-party image, model-derived pixel, or licensed dataset asset.

## Frozen protocol

- Candidate input: opaque RGBA8, strict-sRGB, filter-0 PNG, exactly `160x120`; the adapter receives pixels only, never fixture category or ground truth.
- Candidate output: one row-major 8-bit alpha plane of exactly 19,200 bytes plus a strict `ContinuousAlphaOutput.v0` record.
- Metrics: MAE, RMSE, normalized SAD, maximum absolute error, exact-pixel rate, foreground IoU at 128, boundary-pixel count, and boundary MAE.
- Denominator: 6 independent synthetic sources x 3 cold repetitions = 18 planned attempts per candidate; MODNet + RVM total 36 planned attempts.
- Repeat rule: retain all raw results; no majority vote and no valid-result rerun.
- Stop rule: drift, missing source/repetition, invalid output, resource failure, or runtime uncertainty closes that candidate run non-pass or inconclusive without replacement.
- Threshold state: `not-frozen-no-capability-pass-decision`.
- Natural-image extension: `not-created-separate-governance-required`.
- Result state: `not-created`.

The metric unit test includes a hardened alpha prediction whose binary IoU remains 1 while boundary MAE is non-zero. This prevents a thresholded overlap score from hiding destroyed continuous edges.

## Exact tree

- Root: `research/matting-evaluation/continuous-alpha-v0`.
- 20 files / 151,013 bytes.
- Tree SHA-256: `67889d4eb9dc888cf3267b89ead7be2b8534db1eac11065ebdeb2c81561a256a`, using sorted relative path + NUL + decimal length + NUL + file SHA-256 + NUL.
- Contract content / file SHA-256: `e68e9c780cde73145d2be86f6cf991bff5b2a8e1101fa0ad4c822023c0434583` / `7daaddcb2072bfeb7f53e38329c0650b018a774b7fac9c080bbfcca656413f77`.
- Manifest content / file SHA-256: `bd4b5d12678edaa2a7813689c317b44d5e1883b1bb99d253c6fa224d0189ffbb` / `043cd76445843f5691b6cffe33407198ffda14cee44a5d8c982de70dcae86958`.
- Plan content / file SHA-256: `d874da1e36f4e8da06f5139413d9dae2f15f6bf272fa91714daf3dc9bf21dd8b` / `c3b8fb73123c3129aeca18f2aed61dc56323000dd8bc76a7bf65c233d5715078`.
- Generator SHA-256: `0f84fe4d8e36687aac8f53be4775ef1b444d4ae56c774330524f72f74dbe2cbb`.
- Test SHA-256: `2abf77a9ce3a0367d016707d2789cf0957dc0b3396df99aed5845f69ee4b8cf0`.

`--validate` rebuilds and byte-compares all 20 files. Independent two-temp materialization returns the same tree hash. The focused suite passes 4 / 4 and covers exact counts/categories, strict schemas, zero evidence, metric behavior, two-root determinism, and rejection of extra result material.

## Boundary and next step

This definition is public-synthetic characterization only. It is not Gate B, C1, a model-quality result, natural-person evidence, product support, or release evidence. All evidence axes remain 0 and `productSupport=false`.

The acquisition and natural-person governance boundary is now frozen in [MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md](MATTING_ACQUISITION_GOVERNANCE_EVIDENCE.md), still with zero model and natural-image bytes. Exact dependency/runtime inventories, an immutable MODNet artifact locator, resource bounds, and a versioned safe loader remain unresolved. No existing synthetic result can substitute for the separately governed natural-person population.
