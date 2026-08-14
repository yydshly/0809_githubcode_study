# Slice 03 format policy, technical observer, and seal rehearsal

This directory is a private-by-contract research workspace. It contains only
project-original procedural byte specimens in the open `dev/calibration` and
`defect/calibration` partitions. It contains no real photo, user upload,
third-party image, model, checkpoint, formal holdout, defect-holdout, escape
asset, secret, or product UI resource.

## Contents

- `format-matrix.json`: fifteen frozen `direction × format` policy rows. Every
  row has `productSupport=false`.
- `profiles/`: one closed profile per matrix row. JPEG and WebP input are
  header-probe-only research candidates; they have no decoder, normalization,
  export, calibration, or product-support meaning.
- `contracts/`: the `S03-TECHNICAL-OBSERVER@0.3.0` research contract, bound to
  the exact independent observer implementation SHA-256.
- `fixtures/` and `manifests/`: 25 open project-original calibration and
  defect-calibration byte specimens, all `catalog-denied`.
- `rights/`: the project-original, no-real-person, no-public-display boundary.
- `schemas/`: thirteen recursively closed format, fixture, observer, and seal
  ceremony schemas.

The seal ceremony tests create only temporary mock metadata outside the
repository and remove it after each test. Formal validation additionally
requires caller-held plan, bundle, and custodian trust pins, rejects the whole
Git repository and the system temporary tree, and enforces a four-event custody
sequence for every attempt. No checked-in bundle is a sealed holdout. The formal
holdout state remains `not-created`.

## Commands

Run from `projects/single-image-studio` with Node.js 22 or newer:

```powershell
node scripts/research-generate-slice03.mjs
node scripts/research-validate-slice03.mjs
node --test tests/research-slice03-observer.test.mjs
node --test tests/research-slice03-seal.test.mjs
node --test tests/research-slice03.test.mjs
```

The validator recomputes contract, matrix, profile, manifest, rights, adapter,
asset, and fixed 45-file generated-subset tree hashes; validates actual schema
instances; checks the exact 15-row matrix and 25 stable fixture dispositions;
rejects unregistered files,
forbidden partitions, source-family/session reuse, path escape, catalog leaks,
schema widening, and any `productSupport` claim.

The authoritative scope and evidence boundary are
[../SLICE_03_CONTRACT.md](../SLICE_03_CONTRACT.md) and
[../SLICE_03_EVIDENCE.md](../SLICE_03_EVIDENCE.md).
