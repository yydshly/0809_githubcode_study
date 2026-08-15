# Slice 08 workspace

Current state: `scope-frozen / implementation-not-started /
definition-not-created / Gate-B-smoke-not-run / calibration-forbidden /
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

No Slice 08 implementation, schema, machine definition, fixture wrapper, runtime
observation, result, decision, calibration, formal holdout, product integration,
or real-user asset exists at this scope-only stage. Real Sharp image execution is
forbidden until a results-zero definition has been validated, committed, and
pushed.
