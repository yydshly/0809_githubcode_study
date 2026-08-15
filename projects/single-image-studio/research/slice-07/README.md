# Slice 07 workspace

Current state: `scope-frozen / implementation-in-progress / encoder-ready /
worker-adapter-runner-not-created / definition-not-frozen / Gate-B-smoke-not-run /
calibration-forbidden / non-C1 / non-product`.

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

The first implementation increment adds the project-original
[`research-canonical-png-encoder-slice07.mjs`](../../scripts/research-canonical-png-encoder-slice07.mjs)
and its independent-oracle tests. Source / test SHA-256 values are
`cf71ddd2de336f6ea8092030c43f220c49804f30798e09f9e4aaf4e8e93c5d78` /
`ca61b62d878fa8d43d490a17f940ce65b67d233b6503a46df4131f7aa8ed8011`;
the targeted suite passes `5 / 5`. Three alpha-shape fixtures reopen with only
`IHDR,sRGB,IDAT,IEND`, filter 0 and exact RGBA identity, and three independent
encodes have fixed byte hashes. The full project verify passes `330 / 330`, and
the new script / test pass explicit `node --check`. Tests use in-memory
synthetic bytes only and do not invoke Sharp.

No Slice 07 worker, adapter, runner, schema, machine record, fixture wrapper,
runtime observation, result, decision, artifact, formal holdout, UI or server
integration exists yet. Do not create a freeze timestamp until the remaining
implementation and adversarial tests are stable. Do not run the Sharp image
path until a results-zero definition commit has been validated, committed, and
pushed.

Slice 05 and Slice 06 are immutable closed history. Their requests and results
must not be replayed. Slice 07 may only pin their exact records as lineage and
reuse already-public project-original synthetic bytes under new identities.
