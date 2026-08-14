# Slice 02 frozen contracts and structural fixtures

This directory is a private-by-contract research fixture workspace. It contains
project-original procedural PNGs only. No user photo, real person, third-party
asset, model, checkpoint, network service, or product UI is involved.

## Contents

- `contracts/`: four frozen research `CapabilityContract@0.2.0` records.
- `schemas/`: eleven strict contract I/O, capability, fixture, rights, and plan schemas.
- `fixtures/`: `NORMALIZE-DELIVER` and `MATTE-GT` across five partitions.
- `manifests/`: one hashed manifest per suite and partition.
- `preregistrations/`: structural isolation plan, not a C1 quality plan.
- `rights/`: project-original, research-only, catalog-denied rights boundary.

Every contract is `C1=0` and `research-only-not-product-fallback`. Every asset
is `catalog-denied`. The checked-in holdout files verify isolation mechanics;
they are visible to repository readers and therefore cannot be reused as a
genuinely sealed quality holdout.

Run from the project root:

```powershell
node scripts/research-generate-slice02.mjs
node scripts/research-validate-slice02.mjs
node --test tests/research-slice02.test.mjs
```

The authoritative scope and evidence boundary are
[../SLICE_02_CONTRACT.md](../SLICE_02_CONTRACT.md) and
[../SLICE_02_EVIDENCE.md](../SLICE_02_EVIDENCE.md).
