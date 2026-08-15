# Slice 11 definition evidence

## Frozen baseline

- State: `definition-frozen / results-zero / calibration-not-run / non-C1 / non-product`.
- Frozen at: `2026-08-15T23:01:50.529Z`.
- Definition index content / file SHA-256: `10676a4490d7019e56a65d683e2b29fd5ddc78bae155f54683d5e99ba2c33bba` / `04d2f89975b2bcc2aca68c53379f4a6dbd9b6568244e72dfa114472664708266`.
- Descendant / schema / full-tree SHA-256: `e5a9e69987eac7d178b58274e50606eacfe2a3e12ad1bf111ff9ccb1a4ae9b55` / `631c4113c2bbd506477258e9bdce95363cd845ff2ed2166b96cc342de493d24f` / `d33d254a78eec2a96b2abdb98891fd94279359b4a7e7bf0bb6d0505779a2e90c`.
- README / generator SHA-256: `8c7e1197e19462c4db4ee2c7e7dafebf10e7a2127d3e511fc6128736749f6d25` / `7a622b4bc63e454463cac5dc24911b25b1152abb7252535515b6312085eb0b41`.
- Counts: 180 definition files including README; 23 strict schemas; 96 new source wrappers; 48 gold identities; 4 manifests; 96 sources / 288 planned attempts; 0 copied image bytes; 0 request / result / artifact / formal material.

The [central validator](../scripts/research-validate-slice11.mjs) reports `valid=true`, `issues=[]`, `pinsVerified=true`, `runtimeRechecked=true`, and `regenerationVerified=true`. The definition only references already registered project-original public-synthetic Slice 05 / Slice 10 lineage; it does not introduce user photos, third-party images, model weights, or a product capability claim.

## Verification

- Slice 11 fake-only suites: 42 / 42.
- Full project verification: 521 / 521 tests, all research validators and syntax checks passed.
- The tests cover deterministic definition regeneration, 96-source identity closure, exact 48×3 operation denominators, replay denial, applicable / rejection / failure closure, 288-event fsynced publication chains, runtime drift, atomic operation close, tree tamper and unregistered-result rejection.
- No real Sharp calibration or candidate pixel operation was run while producing this baseline.

## Execution boundary

The [Slice 11 contract](SLICE_11_CONTRACT.md) permits one registered open-calibration invocation only after this baseline is committed and pushed, `HEAD == origin/main`, and the worktree is clean. Normalize and export each retain 48 sources × 3 repetitions, no retry or replacement. A protocol, lifecycle, runtime, timeout, cancellation, missing-record, or reconciliation failure stops globally. Any candidate failure closes this candidate/version; it does not authorize another runner slice or a same-version rerun.
