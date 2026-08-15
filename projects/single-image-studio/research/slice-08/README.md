# Slice 08 workspace

Current state: `scope-frozen / implementation-fake-tested /
definition-frozen / results-zero / Gate-B-smoke-not-run / calibration-forbidden /
non-C1 / non-product`.

The governing scope is [SLICE_08_CONTRACT.md](../SLICE_08_CONTRACT.md). Slice 08
does not rerun or rewrite Slice 07. It versions the runner-to-driver boundary so
every operation callback receives one closed, hash-bound `caseContext` carrying
the frozen disposition, exact expected error code, source and manifest identity,
and attempt identity.

The candidate image architecture remains unchanged from Slice 07: Sharp produces
RGBA8 and dimensions, the project-owned canonical PNG encoder writes the closed
`IHDR,sRGB,IDAT,IEND` profile, and the independent oracle reopens the final bytes.
The new evidence unit must nevertheless execute all 12 public-synthetic source
units three times: normalize and export each contain three applicable and three
rejection sources, for 36 new attempts. Slice 07 passes cannot be spliced into
the Slice 08 decision.

Phase B adds the project-original
[`research-gateb-case-context-slice08.mjs`](../../scripts/research-gateb-case-context-slice08.mjs)
and [`research-gateb-driver-slice08.mjs`](../../scripts/research-gateb-driver-slice08.mjs),
with fake-only tests
[`research-slice08-case-context.test.mjs`](../../tests/research-slice08-case-context.test.mjs)
and [`research-slice08-driver.test.mjs`](../../tests/research-slice08-driver.test.mjs).
Their SHA-256 values are `3bc4520b11c51c48ad4795caf27543a96f9bc43902c2925a03f3896ad9f825ba`,
`530e1ac963bb55f0252b1f8cb4030c481dd1d117fade3f17e3c51453e6ddd607`,
`1833c5b69c8f4fd76e30392052f0bcb1191d39017e56316e99df3265536ef181`
and `72fd8446195d697bace1420cdbe7568b9c3841eb23388a3475e767d146c532e5`.
The targeted suites pass `12 / 12` and exercise recursive schema closure, the production callback shape,
closed self-hashed contexts, operation/source/code laundering, generic errors,
worker-touched rejection, old-S07 replay and the complete 36-attempt denominator.
The actual-case layer additionally binds source bytes / hashes and gold records;
rejection material cannot load gold and cannot invoke the raw worker.
It uses fake functions and in-memory records only; it does not fork Sharp or
create canonical repository results. Both new files pass `node --check`.

Phase C now also implements the durable operation runner, explicit registered
driver, deterministic results-zero definition generator and central validator:
[`research-gateb-runner-slice08.mjs`](../../scripts/research-gateb-runner-slice08.mjs),
[`research-run-slice08.mjs`](../../scripts/research-run-slice08.mjs),
[`research-generate-slice08.mjs`](../../scripts/research-generate-slice08.mjs)
and [`research-validate-slice08.mjs`](../../scripts/research-validate-slice08.mjs).
The six Slice 08 fake-only suites pass `28 / 28`. They cover the complete
36-attempt denominator, atomic result closure, ledger binding, exact-code
rejection, 16 recursively closed schemas, two-temp regeneration, external
Slice 05 / 07 lineage reopening, and full fake post-run output/oracle reopening.
The canonical definition is frozen with zero results. Its exact UTC and tree
pins are recorded outside this pinned README so the README cannot create a
self-referential hash cycle. The post-run pin remains unset until the single
registered smoke has closed.

No Slice 08 registered result, decision, calibration, formal holdout, product
integration, or real-user asset exists. Real Sharp image execution remains
forbidden until this results-zero definition has been validated, committed,
and pushed.
