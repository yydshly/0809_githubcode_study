# Slice 07 workspace

Current state: `scope-frozen / implementation-ready / fake-tested-runtime-protocol /
definition-frozen / results-zero / Gate-B-smoke-not-run /
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

The implementation adds the project-original
[`research-canonical-png-encoder-slice07.mjs`](../../scripts/research-canonical-png-encoder-slice07.mjs)
plus an isolated raw-RGBA worker, adapter and durable operation runner:

- [`research-sharp-raw-worker-slice07.mjs`](../../scripts/research-sharp-raw-worker-slice07.mjs), SHA-256 `4ce6b725d509e35328c6826f1a7345c34b2582d2df19a9cb4b6115b8990f30bd`;
- [`research-gateb-adapter-slice07.mjs`](../../scripts/research-gateb-adapter-slice07.mjs), SHA-256 `88c0543204fe4f28c564cd945d952e20b7f455c589d4c6ab0ce6a49e1d2af61e`;
- [`research-gateb-runner-slice07.mjs`](../../scripts/research-gateb-runner-slice07.mjs), SHA-256 `6decec76a29cfe922b0718950503e027e51e67386442c0f91809e3c7af8a71f8`.

The encoder source / test SHA-256 values are
`cf71ddd2de336f6ea8092030c43f220c49804f30798e09f9e4aaf4e8e93c5d78` /
`ca61b62d878fa8d43d490a17f940ce65b67d233b6503a46df4131f7aa8ed8011`;
the encoder suite passes `5 / 5`. Three alpha-shape fixtures reopen with only
`IHDR,sRGB,IDAT,IEND`, filter 0 and exact RGBA identity, and three independent
encodes have fixed byte hashes. The runtime and runner tests add fake child-process
message / exit ordering, timeout / reconciliation, exact 6-source × 3 denominator,
atomic pass and candidate-non-pass publication, hash-chain ledger, tamper rejection,
and six recursively closed dynamic schemas. The combined targeted suites pass
`25 / 25`; runtime test SHA-256 is
`8ef8fb459723ae52104698d0674dee4ea1e3d117376572d99076b6bc85747ca0`,
and runner test SHA-256 is
`559619d0d6769f6dd8cc70446f91252555ad6c2824b8c95168c813750e880ca6`.
Tests use in-memory synthetic bytes, fake child processes and system-temporary
result trees only. They do not fork the real worker or invoke Sharp.
The Phase B full-project baseline passed `350 / 350`. At definition freeze, the
six Slice 07 suites pass `38 / 38` using only in-memory synthetic bytes, fake
children and system-temporary trees. The definition generator, registered
driver and central validator are
[`research-generate-slice07.mjs`](../../scripts/research-generate-slice07.mjs),
[`research-run-slice07.mjs`](../../scripts/research-run-slice07.mjs), and
[`research-validate-slice07.mjs`](../../scripts/research-validate-slice07.mjs).
Final full-project verification and its exact count are recorded outside this
pinned README so the validator is not indirectly self-referential.

The frozen results-zero machine definition contains exactly 16 schemas, 23
non-index records, one index, 12 lineage-only source wrappers, two manifests,
12 planned sources and 36 planned attempts. It copies no image bytes and
contains a fresh runtime observation. No Slice 07 result, decision, artifact,
calibration, formal holdout, UI or server integration exists. Do not run the
Sharp image path until this definition commit has been validated, committed,
and pushed.

Slice 05 and Slice 06 are immutable closed history. Their requests and results
must not be replayed. Slice 07 may only pin their exact records as lineage and
reuse already-public project-original synthetic bytes under new identities.
