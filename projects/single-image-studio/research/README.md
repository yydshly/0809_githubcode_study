# Single Image Studio research workspace

This directory is the executable research workspace for Slice 01 through Slice 04
and the frozen scope record for Slice 05. Its image fixtures are small,
deterministic, and project-original; Slice 04 adds only source-lock and
preregistration metadata, while Slice 05 currently adds only a human-readable
scope contract. It is not a model benchmark, product dataset, codec installation,
or capability claim.

## Evidence boundary

- Every artifact in the initial `MATTE-GT` set is `public-synthetic`.
- The set exists to rehearse manifests, review surfaces, hashing, and QA
  plumbing. Its evidence status is always `C1=0` / `method-rehearsal`.
- No third-party image, model, checkpoint, user upload, or personal data is
  used.
- Passing the validator proves repository consistency only. It does not prove
  matting quality, user value, reliability, governance, or release readiness.
- Slice 04 does not decode, normalize, encode, benchmark, or calibrate an image.
  Its source-resolved Sharp record is a non-Gate-B candidate, not format support.
- Slice 05 is `scope-frozen / implementation-not-started`. Its scope becomes
  effective with the Git commit that contains `SLICE_05_CONTRACT.md`; no machine
  preregistration, fixture, artifact schema, oracle, adapter, smoke, or
  calibration record exists yet.
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

## Slice 04 candidate-lock and preregistration workspace

`slice-04/` implements the metadata-only scope frozen in
[SLICE_04_CONTRACT.md](SLICE_04_CONTRACT.md). It pins Sharp `v0.35.3`, its
Windows x64 npm / native bundle, `sharp-libvips@1.3.2` and upstream libvips
`v8.18.3` as one composite `REG-NORM-SHARP` candidate, then binds that source
lock to `NORMALIZE-DELIVER` contracts, QA, denominators, preregistrations and a
seal intent.

```text
slice-04/
├─ candidate-locks/    # composite-sharp-win32-x64.v0.4.0.json
├─ profiles/           # 15-row format-target.normalize-deliver.v0.4.0.json
├─ contracts/          # normalize/export metadata-only contract JSON
├─ preregistrations/   # two operation plans, QA, two preregistrations and seal intent
└─ schemas/            # strict schemas for every generated record type
```

The six npm registry tarballs were downloaded only to the uncommitted
repository-local `.tmp/slice04-artifacts` directory for SHA-256 calculation,
then deleted without unpacking, execution, installation, or retention. No
GitHub source archive was downloaded, and no third-party package is installed
in this project. Every format row remains
`productSupport=false`.

Normalize and export each have an operation-specific 30 / 30 / 18 / 18 / 0
five-partition lifecycle. Only sealed holdout 30 plus sealed defect-holdout 18
enter that operation's initial C1 decision; open calibration and append-only
escape are excluded. All 3/3 planned repetitions must pass, with at most one
no-result invalid replacement per source across the three. Every pixel
partition and operation oracle remains `not-created`, and the seal envelope is
not runnable; the request state is `not-issued-awaiting-custodian-bundle`. See
[SLICE_04_EVIDENCE.md](SLICE_04_EVIDENCE.md) for actual hashes and validation.

## Slice 05 scope freeze

[SLICE_05_CONTRACT.md](SLICE_05_CONTRACT.md) freezes the next implementation
boundary without implementing it. Only canonical PNG normalize and export are
in scope. They have separate Gate B decisions: an operation may run open
calibration only after its own artifact / independent-oracle / adapter /
hardware / runtime prerequisites are frozen and every required smoke case
passes.

The planned open partitions are operation-specific:

- normalize: 30 `dev/calibration` + 18 `defect/calibration` sources;
- export: 30 `dev/calibration` + 18 `defect/calibration` sources;
- three planned repetitions per source, for 96 sources / 288 planned runs in
  the complete open plan.

Those numbers are authorization limits and future machine-preregistration
targets, not existing files or frozen machine denominators. Smoke cases are
separate and cannot enter them. Formal holdout, defect-holdout, escape, bundle,
request, receipt, formal result, and EvidenceManifest material remain forbidden
and `not-created`. Every format remains `productSupport=false`, and every
evidence axis remains 0.

## Commands

Run from `projects/single-image-studio` with Node.js 22 or newer:

```powershell
node scripts/research-generate-fixtures.mjs
node scripts/research-validate-fixtures.mjs
node scripts/research-generate-slice02.mjs
node scripts/research-validate-slice02.mjs
node scripts/research-generate-slice03.mjs
node scripts/research-validate-slice03.mjs
node scripts/research-generate-slice04.mjs
node scripts/research-validate-slice04.mjs
node --test tests/research-*.test.mjs
```

Slice 05 currently has no generator, validator, runner, fixture, or execution
command. Adding a command before its machine records and prerequisites are
frozen would exceed the current `implementation-not-started` state.

The generators are deterministic. Re-running them rewrites only their declared
assets and JSON records. The validators recompute every SHA-256,
checks PNG dimensions, requires exact versioned fields, validates rights and
partition bindings, rejects family/session leakage across partitions, and
requires the review catalog to expose only Slice 01 `public-synthetic`
allowlisted assets. Slice 02 and Slice 03 assets are always `catalog-denied`;
Slice 04 contains no image asset at all and must not add catalog entries.
Slice 05 currently contains only its scope contract and exposes no catalog or
runtime asset.

## Serving contract

The review catalog is `manifests/review-catalog.v0.json`. Asset URLs use this
form:

```text
/research-assets/dev/calibration/MATTE-GT/<fixture-id>/<asset-name>.png
```

The local server must serve only URLs listed in `assetAllowlist`. Files merely
present under `fixtures/` are not automatically public.

实现范围和覆盖矩阵见 [SLICE_01_CONTRACT.md](SLICE_01_CONTRACT.md)，自动化、HTTP 与真实浏览器验收结果见 [SLICE_01_EVIDENCE.md](SLICE_01_EVIDENCE.md)。
