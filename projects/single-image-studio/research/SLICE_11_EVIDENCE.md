# Slice 11 definition and startup-failure evidence

## Frozen baseline

- Baseline state: `definition-frozen / results-zero / calibration-not-run / non-C1 / non-product`.
- Frozen at: `2026-08-15T23:01:50.529Z`.
- Definition index content / file SHA-256: `10676a4490d7019e56a65d683e2b29fd5ddc78bae155f54683d5e99ba2c33bba` / `04d2f89975b2bcc2aca68c53379f4a6dbd9b6568244e72dfa114472664708266`.
- Descendant / schema / full-tree SHA-256: `e5a9e69987eac7d178b58274e50606eacfe2a3e12ad1bf111ff9ccb1a4ae9b55` / `631c4113c2bbd506477258e9bdce95363cd845ff2ed2166b96cc342de493d24f` / `d33d254a78eec2a96b2abdb98891fd94279359b4a7e7bf0bb6d0505779a2e90c`.
- README / generator SHA-256: `8c7e1197e19462c4db4ee2c7e7dafebf10e7a2127d3e511fc6128736749f6d25` / `7a622b4bc63e454463cac5dc24911b25b1152abb7252535515b6312085eb0b41`.
- Counts: 180 definition files including README; 23 strict schemas; 96 new source wrappers; 48 gold identities; 4 manifests; 96 sources / 288 planned attempts; 0 copied image bytes; 0 request / result / artifact / formal material.

The [central validator](../scripts/research-validate-slice11.mjs) reports `valid=true`, `issues=[]`, `pinsVerified=true`, `runtimeRechecked=true`, and `regenerationVerified=true`. The definition only references already registered project-original public-synthetic Slice 05 / Slice 10 lineage; it does not introduce user photos, third-party images, model weights, or a product capability claim.

## Verification

- Slice 11 suites after startup-failure closure: 43 / 43.
- Full project verification: 522 / 522 tests, all research validators and syntax checks passed.
- The tests cover deterministic definition regeneration, 96-source identity closure, exact 48×3 operation denominators, replay denial, applicable / rejection / failure closure, 288-event fsynced publication chains, runtime drift, atomic operation close, tree tamper and unregistered-result rejection.
- No real Sharp calibration or candidate pixel operation was run while producing this baseline.

## Execution boundary

The [Slice 11 contract](SLICE_11_CONTRACT.md) permitted one registered open-calibration invocation only after this baseline was committed and pushed, `HEAD == origin/main`, and the worktree was clean. Commit `33f24395e9ad2cd672d156a6f491e02118a62ed1` satisfied that admission boundary.

## Registered invocation result

- State: `startup-runtime-drift / zero-attempt / closed / replay-denied / non-C1 / non-product`.
- The invocation wrote exactly `operation-claim.json` (937 bytes, SHA-256 `c1ad3a2efc0a73b09689a6fcb6fa52e51d7c2e816f459458cb028684a9eed9df`) and `runtime/start.json` (28,684 bytes, SHA-256 `0ff1bee5421308548413fcd88110b96402af47eb24d42caeeab1fb080dea99aa`).
- Result tree: 2 files / 29,621 bytes; SHA-256 `a638a17afa69ab41015181b61ef7a64fa58e9057a9f64f7bc29bfe2f35dd3689` using sorted relative path + NUL + decimal byte length + NUL + file SHA-256 + NUL.
- Claim/start interval: `2026-08-15T23:12:43.642Z`–`2026-08-15T23:12:43.967Z`.
- Frozen payload SHA-256 was `eef8cac84c1be92c1a381b8536c25ffbebe81e6e0bcc01201287d64fcb451545`; start observation SHA-256 was `e3342169fecbf8d70309815a8eb02ee936d8331a2db3d5b734d9e7c79133bbe5`.
- Parsing both canonical JSON strings produces objects with no field differences. The mismatch is internal canonicalization: the definition hashed the JSON bytes without a trailing newline, while `createSlice11RuntimeObservation` hashed the same JSON with a trailing newline.
- The failure occurred before request creation and before `executeAttempt`; actual request / attempt / worker / pixel / terminal / artifact / oracle / export counts are all 0. No candidate-quality conclusion can be drawn.
- The central validator accepts only this exact two-file, self-hashed, cross-bound startup-failure shape, reports `status=startup-runtime-drift`, and makes `postRun` non-null so the registered driver rejects replay. Extra or mutated material still fails closed.

This closes Slice 11. The project will not create Slice 12 to continue the normalize/export runner loop; it returns to the original SourceCard.v0 and Matting baseline work. Formal holdout remains not created, all evidence axes remain 0, Release Gate remains none/0/0, and `productSupport=false`.
