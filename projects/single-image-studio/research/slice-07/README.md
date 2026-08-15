# Slice 07 workspace

Current state: `scope-frozen / implementation-not-started /
definition-not-frozen / Gate-B-smoke-not-run / calibration-forbidden / non-C1 /
non-product`.

The governing scope is [SLICE_07_CONTRACT.md](../SLICE_07_CONTRACT.md). Slice 07
will evaluate a new composite candidate: Sharp performs decode / pixel work and
a candidate-owned canonical PNG encoder writes the exact closed output profile.
The independent oracle only reopens and evaluates final bytes; it must never
generate, repair, rewrite, or share implementation with candidate output.

The planned Gate-B smoke contains 12 public-synthetic regression source units,
three repetitions each: normalize and export each have three applicable and
three rejection sources, for 36 planned attempts total. Normalize and export
receive separate decisions. Both must pass before a later slice may even
consider open calibration; Slice 07 itself does not authorize calibration.

No Slice 07 script, schema, machine record, fixture wrapper, runtime observation,
result, decision, artifact, formal holdout, UI or server integration exists at
this scope-only stage. Do not create a freeze timestamp until the implementation
and adversarial tests are stable. Do not run the Sharp image path until a
results-zero definition commit has been validated, committed, and pushed.

Slice 05 and Slice 06 are immutable closed history. Their requests and results
must not be replayed. Slice 07 may only pin their exact records as lineage and
reuse already-public project-original synthetic bytes under new identities.
