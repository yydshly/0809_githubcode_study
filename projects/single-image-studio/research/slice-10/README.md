# Slice 10 open-calibration workspace

> State: `scope-frozen / execution-stack-fake-tested / central-validator-fake-tested / definition-frozen-results-zero / literal-pins-frozen / calibration-not-run / formal-holdout-not-created / non-C1 / non-product`.

This directory contains the frozen results-zero Slice 10 open-calibration machine definition. The protocol passes 7 / 7 fake-only tests; the definition suite passes 9 / 9 with 22 strict schemas, 96 new source wrappers, 48 applicable gold identities and four manifests, and exact implementation pins for the runner, actual-case adapter, registered driver and runtime-end observer. The durable runner passes 7 / 7 for one 48×3 operation, zero retry, atomic publication and a 432-event ledger; it requests a distinct durable runtime-end record only after all terminals. The actual-case adapter passes 9 / 9 and reopens all 96 immutable Slice 05 source records plus 48 independent gold identities. The registered driver passes 5 / 5 for central/Git/results-zero admission, one sequential two-operation invocation, ordinary non-pass continuation and protocol global stop. The runtime-end observer passes 6 / 6 for byte-identical package/native/runtime re-observation, create-only durable publication, and drift/replay/clock/embedded-payload rejection; its inventory path reads versions only and never invokes image processing. The central validator regenerates the complete frozen tree, rechecks runtime, enforces external literal pins, and rejects results/extra-file/README drift. No runtime-end observation, request, result, calibration summary, holdout material, or copied image bytes exists at definition freeze.

The governing contract is [../SLICE_10_CONTRACT.md](../SLICE_10_CONTRACT.md). Slice 09 is immutable admission lineage: its unique registered smoke passed both Gate-B decisions, but its contract fixed `calibrationAuthorized=false`. Slice 10 therefore requires new `@0.10.0` identities and a separately frozen results-zero definition before any calibration may run.

Planned open denominator:

- normalize: 30 `dev/calibration` + 18 `defect/calibration` sources, three repetitions each = 144 attempts;
- export: 30 `dev/calibration` + 18 `defect/calibration` sources, three repetitions each = 144 attempts;
- total: 96 project-original public-synthetic source units and 288 attempts;
- zero retry and zero replacement; every source requires 3 / 3 terminal pass for an operation-level pass.

The future machine tree may reference existing project-original open bytes and gold facts only through new, self-hashed lineage wrappers with `independenceClaim=false`. It must not copy or create formal holdout, defect-holdout, escape, real-user, third-party, model-weight, product, UI, server, download, catalog, or release material.

No calibration command is authorized by this README alone. The frozen definition and validator must pass with literal pins, then this results-zero baseline must be committed and pushed before the single registered driver invocation can run normalize and export sequentially.
