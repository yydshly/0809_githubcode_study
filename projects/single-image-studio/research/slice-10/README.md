# Slice 10 open-calibration workspace

> State: `scope-frozen / protocol-foundation-fake-tested / definition-preview-fake-tested / runner-foundation-fake-tested / actual-case-adapter-fake-tested / registered-driver-foundation-fake-tested / durable-runtime-end-observer-not-created / central-validator-not-created / definition-not-created / calibration-not-run / formal-holdout-not-created / non-C1 / non-product`.

This directory is reserved for the versioned Slice 10 open-calibration machine definition. The protocol passes 7 / 7 fake-only tests; the definition preview passes 9 / 9 with 16 strict schemas, 96 new source wrappers, 48 applicable gold identities and four manifests. The durable runner passes 7 / 7 for one 48×3 operation, zero retry, atomic publication and a 432-event ledger; it requests a distinct durable runtime-end record only after all terminals. The actual-case adapter passes 9 / 9 and reopens all 96 immutable Slice 05 source records plus 48 independent gold identities. The registered-driver foundation passes 5 / 5 for central/Git/results-zero admission, one sequential two-operation invocation, ordinary non-pass continuation and protocol global stop. It is not executable because the durable runtime-end observer and central validator do not exist yet. This directory still contains no materialized definition, runtime-end observation, requests, results, calibration summary, holdout material, or copied image bytes.

The governing contract is [../SLICE_10_CONTRACT.md](../SLICE_10_CONTRACT.md). Slice 09 is immutable admission lineage: its unique registered smoke passed both Gate-B decisions, but its contract fixed `calibrationAuthorized=false`. Slice 10 therefore requires new `@0.10.0` identities and a separately frozen results-zero definition before any calibration may run.

Planned open denominator:

- normalize: 30 `dev/calibration` + 18 `defect/calibration` sources, three repetitions each = 144 attempts;
- export: 30 `dev/calibration` + 18 `defect/calibration` sources, three repetitions each = 144 attempts;
- total: 96 project-original public-synthetic source units and 288 attempts;
- zero retry and zero replacement; every source requires 3 / 3 terminal pass for an operation-level pass.

The future machine tree may reference existing project-original open bytes and gold facts only through new, self-hashed lineage wrappers with `independenceClaim=false`. It must not copy or create formal holdout, defect-holdout, escape, real-user, third-party, model-weight, product, UI, server, download, catalog, or release material.

No calibration command is authorized by this README. The required order is scope commit and push, fake-only tooling, fresh runtime and results-zero definition freeze, definition commit and push, then one registered operation-specific calibration run per operation within the single frozen driver invocation.
