# Single Image Studio research workspace

This directory is the executable research workspace for Slice 01. It contains
only small, deterministic, project-original synthetic fixtures. It is not a
model benchmark, product dataset, or capability claim.

## Evidence boundary

- Every artifact in the initial `MATTE-GT` set is `public-synthetic`.
- The set exists to rehearse manifests, review surfaces, hashing, and QA
  plumbing. Its evidence status is always `C1=0` / `method-rehearsal`.
- No third-party image, model, checkpoint, user upload, or personal data is
  used.
- Passing the validator proves repository consistency only. It does not prove
  matting quality, user value, reliability, governance, or release readiness.
- `methodLabel` and `methodDetails` are delivered in the local catalog and only
  hidden by the review interface until unblinding. This is an interaction
  rehearsal, not adversary-resistant or independent reviewer blinding.

## WP0 layout

```text
research/
├─ fixtures/
│  ├─ dev/calibration/MATTE-GT/   # generated public synthetic PNGs
│  ├─ holdout/                    # reserved; must use independent families
│  ├─ defect/calibration/         # reserved for QA calibration
│  ├─ defect/holdout/             # reserved and sealed before evaluation
│  └─ escape/                     # reserved for rights-cleared regressions
├─ manifests/
│  ├─ fixture-manifest.matte-gt.dev-calibration.v0.json
│  └─ review-catalog.v0.json
├─ rights/
│  └─ rights.local-synthetic.v0.json
├─ schemas/
│  ├─ fixture-manifest.v0.schema.json
│  ├─ rights-record.v0.schema.json
│  └─ review-catalog.v0.schema.json
├─ SLICE_01_CONTRACT.md
└─ SLICE_01_EVIDENCE.md
```

Reserved partitions are documented here rather than populated with placeholder
assets. A future partition is valid only after it has its own manifest, rights
records, independent `sourceFamilyId` and `captureSessionId` values, and passes
the same validator.

## Commands

Run from `projects/single-image-studio` with Node.js 22 or newer:

```powershell
node scripts/research-generate-fixtures.mjs
node scripts/research-validate-fixtures.mjs
node --test tests/research-*.test.mjs
```

The generator is deterministic. Re-running it rewrites only the declared
Slice 01 assets and JSON records. The validator recomputes every SHA-256,
checks PNG dimensions, requires exact versioned fields, validates rights and
partition bindings, rejects family/session leakage across partitions, and
requires the review catalog to expose only `public-synthetic` allowlisted
assets.

## Serving contract

The review catalog is `manifests/review-catalog.v0.json`. Asset URLs use this
form:

```text
/research-assets/dev/calibration/MATTE-GT/<fixture-id>/<asset-name>.png
```

The local server must serve only URLs listed in `assetAllowlist`. Files merely
present under `fixtures/` are not automatically public.

实现范围和覆盖矩阵见 [SLICE_01_CONTRACT.md](SLICE_01_CONTRACT.md)，自动化、HTTP 与真实浏览器验收结果见 [SLICE_01_EVIDENCE.md](SLICE_01_EVIDENCE.md)。
