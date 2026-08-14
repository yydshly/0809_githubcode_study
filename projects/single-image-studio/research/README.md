# Single Image Studio research workspace

This directory is the executable research workspace for Slice 01 through Slice 03.
It contains only small, deterministic, project-original synthetic fixtures. It
is not a model benchmark, product dataset, or capability claim.

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

## Slice 02 contract and isolation workspace

`slice-02/` is deliberately separate from the Slice 01 public review catalog.
It freezes four `CapabilityContract v0.2.0` records, seven contract I/O schemas, a
structural partition plan, and private synthetic fixtures for
`NORMALIZE-DELIVER` and `MATTE-GT` across all five registered partitions.

```text
slice-02/
├─ contracts/          # normalize, export, SourceCard.v0, simple matte baseline
├─ fixtures/           # 2 suites × 5 partitions; all catalog-denied
├─ manifests/          # one strict v1 manifest per suite × partition
├─ preregistrations/   # structural isolation plan; not a C1 quality plan
├─ rights/             # project-original private synthetic boundary
└─ schemas/            # strict contract, artifact, fixture, rights and plan schemas
```

The checked-in holdout files rehearse source-family, session, hash, sealed-state,
and catalog isolation. Because their generator and pixels are visible in this
repository, they cannot be reused as a genuinely sealed C1 quality holdout. See
[SLICE_02_CONTRACT.md](SLICE_02_CONTRACT.md) and
[SLICE_02_EVIDENCE.md](SLICE_02_EVIDENCE.md).

## Slice 03 format, observer, and seal workspace

`slice-03/` implements the narrow scope frozen in
[SLICE_03_CONTRACT.md](SLICE_03_CONTRACT.md): fifteen policy / implementation /
evidence format rows, an independently hashed byte-backed technical observer,
25 open calibration / defect-calibration byte fixtures, and six strict
out-of-repository sealing ceremony schemas. The formal holdout remains
`not-created`; JPEG / WebP are probe-only, every format row has
`productSupport=false`, and no Slice 03 asset enters the review catalog. See
[SLICE_03_EVIDENCE.md](SLICE_03_EVIDENCE.md) for the actual checks and limits.

```text
slice-03/
├─ contracts/          # one frozen technical-observer research contract
├─ fixtures/           # only dev/calibration and defect/calibration
├─ manifests/          # two open NORMALIZE-DELIVER manifests
├─ profiles/           # one profile per 15-row format matrix entry
├─ rights/             # project-original, catalog-denied boundary
└─ schemas/            # format, fixture, observer and seal schemas
```

## Commands

Run from `projects/single-image-studio` with Node.js 22 or newer:

```powershell
node scripts/research-generate-fixtures.mjs
node scripts/research-validate-fixtures.mjs
node scripts/research-generate-slice02.mjs
node scripts/research-validate-slice02.mjs
node scripts/research-generate-slice03.mjs
node scripts/research-validate-slice03.mjs
node --test tests/research-*.test.mjs
```

The generators are deterministic. Re-running them rewrites only their declared
assets and JSON records. The validators recompute every SHA-256,
checks PNG dimensions, requires exact versioned fields, validates rights and
partition bindings, rejects family/session leakage across partitions, and
requires the review catalog to expose only Slice 01 `public-synthetic`
allowlisted assets. Slice 02 and Slice 03 assets are always `catalog-denied`.

## Serving contract

The review catalog is `manifests/review-catalog.v0.json`. Asset URLs use this
form:

```text
/research-assets/dev/calibration/MATTE-GT/<fixture-id>/<asset-name>.png
```

The local server must serve only URLs listed in `assetAllowlist`. Files merely
present under `fixtures/` are not automatically public.

实现范围和覆盖矩阵见 [SLICE_01_CONTRACT.md](SLICE_01_CONTRACT.md)，自动化、HTTP 与真实浏览器验收结果见 [SLICE_01_EVIDENCE.md](SLICE_01_EVIDENCE.md)。
