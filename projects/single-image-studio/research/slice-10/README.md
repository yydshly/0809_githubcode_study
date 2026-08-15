# Slice 10 open-calibration workspace

> State: `scope-frozen / protocol-foundation-fake-tested / definition-preview-fake-tested / runner-foundation-fake-tested / actual-case-adapter-fake-tested / registered-driver-not-created / definition-not-created / calibration-not-run / formal-holdout-not-created / non-C1 / non-product`.

This directory is reserved for the versioned Slice 10 open-calibration machine definition. The standalone protocol module defines strict admission, request, terminal and summary records and passes 7 / 7 fake-only tests. The definition-preview generator passes another 9 / 9: fixed-UTC twin temporary builds are byte-identical and contain 16 strict schemas, 96 new source wrappers, 48 applicable gold identities and four operation-by-partition manifests. The durable runner foundation passes 7 / 7 system-temp fake-only tests: one operation closes 48×3 slots with zero retry, per-file fsync, atomic prepared/rename/complete publication and a 432-event hash chain; ordinary non-pass stays in the full denominator, while protocol uncertainty and runtime-end drift prevent a summary. The actual-case adapter foundation passes 9 / 9 fake-only tests: it reopens all 96 immutable Slice 05 source records and bytes plus 48 independent gold identities, keeps all 48 rejection cases worker-free and sends applicable fake outputs through the independent PNG decoder. The preview generator has no materialization CLI, and no registered driver exists. This directory still contains no materialized schemas, source wrappers, manifests, preregistrations, runtime observation, requests, results, calibration summary, holdout material, or copied image bytes.

The governing contract is [../SLICE_10_CONTRACT.md](../SLICE_10_CONTRACT.md). Slice 09 is immutable admission lineage: its unique registered smoke passed both Gate-B decisions, but its contract fixed `calibrationAuthorized=false`. Slice 10 therefore requires new `@0.10.0` identities and a separately frozen results-zero definition before any calibration may run.

Planned open denominator:

- normalize: 30 `dev/calibration` + 18 `defect/calibration` sources, three repetitions each = 144 attempts;
- export: 30 `dev/calibration` + 18 `defect/calibration` sources, three repetitions each = 144 attempts;
- total: 96 project-original public-synthetic source units and 288 attempts;
- zero retry and zero replacement; every source requires 3 / 3 terminal pass for an operation-level pass.

The future machine tree may reference existing project-original open bytes and gold facts only through new, self-hashed lineage wrappers with `independenceClaim=false`. It must not copy or create formal holdout, defect-holdout, escape, real-user, third-party, model-weight, product, UI, server, download, catalog, or release material.

No calibration command is authorized by this README. The required order is scope commit and push, fake-only tooling, fresh runtime and results-zero definition freeze, definition commit and push, then one registered operation-specific calibration run per operation within the single frozen driver invocation.
