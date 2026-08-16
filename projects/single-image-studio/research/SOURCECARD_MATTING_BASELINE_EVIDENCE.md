# SourceCard.v0 + MATTE-SIMPLE dev/calibration evidence

## Outcome

The project now has one executable research-only vertical path over the three existing project-original `MATTE-GT dev/calibration` fixtures:

`procedural RGBA lineage -> strict sRGB NormalizedImage -> SourceCard.v0 -> fixture-known SubjectMap -> MATTE-SIMPLE AlphaMatte -> ground-truth metrics`

This is not a product path, independent holdout, C1 result, or model-quality claim. It uses no user photo, third-party image, model, or weight.

## Fixed inputs and implementation

- Suite / partition: `MATTE-GT / dev/calibration`.
- Fixtures: `matte-hard-edge-001`, `matte-hole-001`, `matte-soft-edge-001`.
- Contracts: `CC-CAP03-SOURCE-CARD-V0@0.2.0` and `CC-CAP04-MATTE-SIMPLE@0.2.0`.
- Baseline: `REG-BASELINE-MATTE-SIMPLE` with `lowThreshold=10`, `highThreshold=88`.
- Background sample: generator-owned saturated background `[0,216,255]`, verified against every ground-truth-zero pixel before execution.
- Runner SHA-256: `7ebc5c1e754cf0a1715b9ed32a824139fe66bd7a01cb073a8a0f8eb81be7c2fa`.
- The original fixture generator now exposes an in-memory deterministic pixel rebuild; regenerated legacy PNG hashes must still equal the frozen manifest before the strict sRGB research input is constructed.

SourceCard technical facts are byte-backed. Quality, subject, and content fields remain explicit `unknown` with `observer-not-frozen` reasons; the runner does not infer them from ground truth.

## Results

Report ID: `sourcecard-matting-baseline.matte-gt.dev-calibration.v0`
Report content hash: `bd04420dae871f3998fbc75513fef8e1785fcf6054c2b1d90e308f5bd0a17367`

| Fixture | MAE | RMSE | max error | exact-pixel rate | foreground IoU @ 128 |
| --- | ---: | ---: | ---: | ---: | ---: |
| hard edge | 0 | 0 | 0 | 1.000000 | 1.000000 |
| interior hole | 0 | 0 | 0 | 1.000000 | 1.000000 |
| soft edge | 6.93140625 | 29.216883853 | 187 | 0.922083333 | 0.922269839 |
| mean | 2.31046875 | — | — | — | 0.974089946 |

The baseline exactly recovers the two binary-alpha geometries but visibly hardens the soft transition. It is therefore useful as a comparison lower bound and unsuitable as a product fallback.

## Durable files

- Result tree: 4 files / 18,497 bytes.
- Tree SHA-256: `64227c66e4e46751b664cd3f777171a820cc672f5a59840b9e26f9644a804999` using sorted relative path + NUL + decimal byte length + NUL + file SHA-256 + NUL.
- Report: `research/results/sourcecard-matting-baseline-v0/report.json`, 15,586 bytes, SHA-256 `0572fd87cbf5a1345ee9b14964f80e9e5116d01cdb3861a7479b46f2f3be4e48`.
- Predicted matte SHA-256: hard edge `c820b0ccd06591681f68cc390b03e238a3178474c1f92a2568bccc63417b9f9f`; hole `7c8135b6948579bb89511714d0a1a944958c72a5662b2c2df98e364f9feea8dc`; soft edge `a4c7207c9c9a3eb283d8074737b3af777e7afd210362d2da6f6483cc999aa1a1`.

`--validate` reconstructs all records and output bytes and requires a byte-for-byte exact four-file set. The focused suite passes 2 / 2. All evidence axes and Release Gate remain 0 / none, and `productSupport=false`.

## Next product-relevant step

Do not tune this baseline into a hidden product algorithm. The next increment is now recorded in [SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md](SOURCECARD_EXPOSURE_AND_MATTING_CANDIDATES_EVIDENCE.md): objective exposure signals are frozen without upgrading the semantic SourceCard field, and MODNet plus RVM are registered without downloading weights. The simple baseline remains the fixed lower bound.
