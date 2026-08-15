# Slice 07 registered Gate-B smoke evidence

Slice 07 executed its only registered `@0.7.0` open smoke after definition
commit `d056390bdec8b4f0ae129336f18301ec9ea24eb9` was pushed and all Git,
definition, runtime and regeneration admission checks matched. The registered
interval was `2026-08-15T12:24:23.501Z` through
`2026-08-15T12:24:31.249Z`.

An earlier sandboxed invocation failed with `EPERM` before the `results`
directory existed. It created no request, event or selectable outcome. The
subsequent authorized invocation is the only registered result.

## Immutable result tree

- 150 files / 26 child directories / 173,726 bytes;
- definition-relative tree SHA-256:
  `80b242de729df5e5974c90c0342d2e10e9609559aae5f3c2e1162afb4f1ccf9c`;
- open-smoke-root-relative tree SHA-256:
  `6eea966b8e7407208db93798bafa45a292d7582499859924b66bebbb10b0dda1`;
- 36 requests and 36 terminal results, zero replacements;
- 108 ledger events: 54 normalize plus 54 export;
- 18 applicable publication closures with candidate PNG, worker/runtime,
  telemetry, independent oracle facts and terminal result;
- 18 rejection terminal records with no worker publication closure.

Both operation-tree validators and the central post-run validator return
`valid=true / issues=[]`. The latter independently reopens all 18 candidate
PNGs, checks `IHDR,sRGB,IDAT,IEND` and filter 0, compares decoded pixels and
dimensions to frozen gold, binds request and terminal ledger payloads, and
verifies the immutable result-tree pin.

## Outcome

Normalize and export each closed with 18 / 18 terminals, 9 pass / 9 non-pass,
9 / 9 applicable oracle passes, 3 / 3 applicable source units passing all
three repetitions, 0 / 9 exact rejection passes, zero replacements and zero
protocol failures. Both decisions are `denied-closed-non-pass`,
`gateBPassed=false`, `calibrationAuthorized=false`.

Normalize summary content/file hashes:
`fd99c311333a5e3c628f5cc7c3705aea44331e73d557d9635e2aa8a165135bd4` /
`c14e86573c60f05f621f0445db91bfecfb7dcf43e65267c393598ac3b63d094f`.
Normalize decision content/file hashes:
`7dd593f89f1125da78470b42020635ee76201aa069b2d6607661330c21f14e16` /
`2ed89cc3a4c82854ad2944f7ff5874dd3eeff109344ba68b75b263eb78390dbd`.
Export summary content/file hashes:
`4d1125552e3d8026c047e8224a110868fbc60f021a222b15518bfaa8898c9b83` /
`dac6712fe4cfb9a624bf6be75e8711f84f2233a6d64810f48d265d4215ee03e3`.
Export decision content/file hashes:
`a92768610e9e13147f72395b82470ec151e0f3531159668c66f03bdd76782b34` /
`9d5fd5701f77b7a7eaef1719bd219254cbd4072981bc89a1c3371c5b9746c748`.
Ledger tails are
`1fbe278ce9d01b0951cde26c3fbe690290c0dede1e6a2777a99247fa3f8fc5e1`
and
`c5eb2288b14125802a68cda488c9e1df121daf12b8000e643432e1ecf2a47fc2`.

## Exact failure cause

All 18 rejection attempts ended with `ERR_INVALID_ARG_TYPE` before worker
execution (`workerExitConfirmed=false`, no closure). The frozen runner passes
only attempt, operation, source, repetition, worker request and expected facts
to `executeCase`; the registered driver incorrectly expected the omitted
`disposition` and `expectedStableErrorCode`. It skipped rejection
classification and attempted to open a null gold-record path. This is a driver
protocol/classification defect, not a Sharp, pixel, encoder or oracle failure.

Audit severity is `P1=0 / P2=1 / P3=0`: evidence failed closed and no false
Gate-B authorization occurred, but the rejection denominator was not evaluated
as intended. Slice 07 is closed and must not be rerun or rewritten. A later
version must freeze a corrected binding and new definition before another
smoke.

Post-run regression checks pass: Slice 07 targeted suites `39 / 39` and full
`npm.cmd run verify` `364 / 364`, followed by syntax checks with exit code 0.

All evidence axes remain `0`, Release Gate remains `none / 0 / 0`,
`productSupport=false`, and calibration, formal holdout, real-user photos,
model weights, UI and server integration remain forbidden.
