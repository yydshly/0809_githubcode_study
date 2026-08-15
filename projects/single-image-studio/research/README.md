# Single Image Studio research workspace

This directory is the executable research workspace for Slice 01 through Slice
06. Its image fixtures are small, deterministic, and project-original. Slice
05's only registered real smoke is closed non-pass, so its calibration is
forbidden. Slice 06 now has a diagnostic-only protocol implementation and
fake-only tests, but its machine definition, fixture wrappers, and results do
not yet exist and no real Sharp image path has run. It is not a model benchmark,
product dataset, completed codec evaluation, or capability claim.

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
- Slice 05 is now `definition-frozen / smoke-closed-non-pass /
  Gate-B-denied-not-entered / calibration-forbidden`. Its historical scope
  contract is unchanged; the `@0.5.0` machine definition froze at
  `2026-08-15T04:23:38.389Z` with zero results at freeze, then its only
  registered smoke produced the separate `results/open-smoke/` tree.
- Slice 05 runtime inventory imported Sharp only to read `sharp.versions`; it
  did not read, decode, encode, or transform image bytes. The later real Sharp
  smoke ran, but normalize and export both failed Gate B; no calibration ran.
- Slice 06 is `scope-frozen / implementation-and-fake-protocol-tests-ready /
  definition-not-frozen / diagnostic-characterization-not-run /
  Gate-B-no-authority / calibration-forbidden`. Four isolated research scripts,
  13 strict schemas and three fake-only test files exist; machine records,
  fixture wrappers, fresh runtime / hardware observations and results do not.
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
GitHub source archive was downloaded, and Slice 04 itself did not install a
third-party package. Slice 05 later added an exact research-only dependency
declaration and separately inventoried installed closure; that later fact does
not rewrite the Slice 04 record. Every format row remains
`productSupport=false`.

Normalize and export each have an operation-specific 30 / 30 / 18 / 18 / 0
five-partition lifecycle. Only sealed holdout 30 plus sealed defect-holdout 18
enter that operation's initial C1 decision; open calibration and append-only
escape are excluded. All 3/3 planned repetitions must pass, with at most one
no-result invalid replacement per source across the three. Every pixel
partition and operation oracle remains `not-created`, and the seal envelope is
not runnable; the request state is `not-issued-awaiting-custodian-bundle`. See
[SLICE_04_EVIDENCE.md](SLICE_04_EVIDENCE.md) for actual hashes and validation.

## Slice 05 definition freeze and closed smoke

[SLICE_05_CONTRACT.md](SLICE_05_CONTRACT.md) preserves the historical scope
freeze. The current machine definition is rooted at
`slice-05/definition-index.v0.5.0.json` and frozen at
`2026-08-15T04:23:38.389Z`. It pins the installed Windows x64 Sharp runtime,
normalize / export contracts, strict artifact and result schemas, independent
oracle / gold, adapter / worker, named hardware, local runner / fault semantics,
Gate B smoke plan, open partition plans, preregistrations, rights and every
fixture byte. See [SLICE_05_EVIDENCE.md](SLICE_05_EVIDENCE.md) for exact hashes
and checks.

```text
slice-05/
├─ definition-index.v0.5.0.json  # closed DAG root; results absent at freeze
├─ runtime/                      # actual installed closure attestation
├─ candidate-locks/              # REG-NORM-SHARP@0.5.0
├─ contracts/                    # normalize/export @0.5.0
├─ hardware/                     # named win32-x64 profile; no hostname/serial
├─ plans/                        # separate Gate B and open partition plans
├─ preregistrations/             # blocked until each operation Gate B passes
├─ manifests/                    # 2 smoke + 4 open calibration manifests
├─ assets/open/                  # 108 project-original raw fixtures
├─ sources/                      # 108 provenance records
├─ artifacts/normalized-inputs/  # 54 independent export inputs
├─ gold/                         # 54 independent applicable/control records
├─ rights/                       # open synthetic rights boundary
├─ schemas/                      # 25 strict schemas
└─ results/open-smoke/           # later registered smoke; outside definition pins
```

The frozen open partitions are operation-specific:

- normalize: 30 `dev/calibration` + 18 `defect/calibration` sources;
- export: 30 `dev/calibration` + 18 `defect/calibration` sources;
- three planned repetitions per source, for 96 sources / 288 planned runs in
  the complete open plan.

Those 96 calibration sources and their 288 planned repetitions are now frozen
machine denominators, but they have not been run and are now forbidden for this
version. Two additional independent
smoke manifests contain 6 normalize and 6 export sources, also with three
planned repetitions; smoke cases cannot enter calibration. Formal holdout,
defect-holdout, escape, bundle, request, receipt, formal result, and
EvidenceManifest material remain forbidden and `not-created`. Every format
remains `productSupport=false`, and every evidence axis remains 0.

The only registered real smoke ran from `2026-08-15T04:52:05.490Z` through
`2026-08-15T04:52:10.426Z`. It produced 36 requests, 36 claims, 36 terminal results, 72
ledger events, and zero artifacts. Normalize closed at 6 pass / 12 non-pass;
export closed at 9 pass / 9 non-pass. Both Gate B decisions are
`denied-not-entered` with `calibrationAuthorized=false`. See
[SLICE_05_EVIDENCE.md](SLICE_05_EVIDENCE.md) for exact result-tree, summary,
decision, ledger, and error-code pins.

## Slice 06 diagnostic protocol; definition still pending

[SLICE_06_CONTRACT.md](SLICE_06_CONTRACT.md) freezes a diagnostic-only bridge,
not a new Gate-B smoke. Phase B implements a strict adapter, isolated worker,
independent PNG diagnostic oracle and durable local runner. Three oracle-owned
record schemas are stored on disk and the runner exports ten additional strict
schema documents. After the pre-definition lifecycle patch, the oracle / runner /
runtime fake-only suites pass `46 / 46`;
all four scripts pass syntax checks, and the independently audited ten-file set
has SHA-256 `d7e83c8c5a70ce6929ab5d53be473f413f37abe4459a1bd810164e495d2ab76c`.
No test invoked the real Sharp image path.

The planned machine identities remain uncreated: `REG-NORM-SHARP@0.6.0`, two
operation contracts and preregistrations, fresh runtime / hardware records,
eight public-synthetic regression wrappers, manifests and the definition index.
The exact planned denominator remains 8 existing public-synthetic regression
source units × 3 repetitions = 24 attempts: three applicable Alpha shapes plus
one preflight sentinel for each operation. Any future candidate output must
remain a non-product diagnostic specimen or quarantine with complete worker and
independent-oracle records. Slice 06 cannot issue a Gate-B decision or authorize
calibration; its closure can only inform candidate selection for a later slice.

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
node scripts/research-validate-slice05.mjs
node --test tests/research-*.test.mjs
```

The Slice 05 generator produced the frozen canonical definition bytes before
results existed. Do not re-run it now: it refuses to erase or overwrite the
`results/` tree, and the current version is closed. The registered smoke was run
once with `npm.cmd run research:smoke:slice05`; do not invoke it again to select
a different outcome. Both calibration commands are forbidden because neither
operation received an all-pass Gate B decision.

Any correction requires a new candidate, contract, preregistration, version and
definition freeze. That new version must correct the output-profile behavior and
normalize sRGB rejection code and preserve worker / oracle diagnostics before a
fresh smoke may run.

The generators are deterministic. Re-running them rewrites only their declared
assets and JSON records. The validators recompute every SHA-256,
checks PNG dimensions, requires exact versioned fields, validates rights and
partition bindings, rejects family/session leakage across partitions, and
requires the review catalog to expose only Slice 01 `public-synthetic`
allowlisted assets. Slice 02 and Slice 03 assets are always `catalog-denied`;
Slice 04 contains no image asset at all and must not add catalog entries. Slice
05 open assets are not present in the Slice 01 catalog allowlist and are never
served by that review catalog or the product runtime.

## Serving contract

The review catalog is `manifests/review-catalog.v0.json`. Asset URLs use this
form:

```text
/research-assets/dev/calibration/MATTE-GT/<fixture-id>/<asset-name>.png
```

The local server must serve only URLs listed in `assetAllowlist`. Files merely
present under `fixtures/` are not automatically public.

实现范围和覆盖矩阵见 [SLICE_01_CONTRACT.md](SLICE_01_CONTRACT.md)，自动化、HTTP 与真实浏览器验收结果见 [SLICE_01_EVIDENCE.md](SLICE_01_EVIDENCE.md)。Slice 05 的实时定义冻结事实与非能力边界见 [SLICE_05_EVIDENCE.md](SLICE_05_EVIDENCE.md)；Slice 06 的诊断授权见 [SLICE_06_CONTRACT.md](SLICE_06_CONTRACT.md)，Phase B 协议实现、hash 与 definition-not-frozen 边界见 [slice-06/README.md](slice-06/README.md)。
