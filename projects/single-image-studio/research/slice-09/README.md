# Slice 09 workspace

Current state: `scope-frozen / identity-layer-fake-tested /
driver-runner-not-started / definition-not-created / Gate-B-smoke-not-run /
calibration-forbidden / non-C1 / non-product`.

The governing scope is [SLICE_09_CONTRACT.md](../SLICE_09_CONTRACT.md). Slice 09
does not modify or replay Slice 08. It creates a new versioned gold-identity
boundary because Slice 08 stopped before its first worker when the driver read
`id` from a record whose frozen key is `goldRecordId`.

The first project-original implementation is
[`research-gateb-gold-identity-slice09.mjs`](../../scripts/research-gateb-gold-identity-slice09.mjs).
Its closed schema and runtime validator bind the exact record/file/pixel/source
identity and expose only `goldRecordId` plus frozen expected facts to the
applicable branch. Tests read the actual immutable Slice 05 gold JSON and pass
6 / 6; `.id` fallback, dual-key records, self-rehashed drift and rejection-side
gold access fail closed. Source/test SHA-256 values are
`2ae836fc9f0f85ce5b4a0adaf19f4f44e8bc2975f1fb0479a2aa289c4dd8365a` and
`1fb865cb80d370469ba095822f0361b128f0ae0c9b2ffd9e13d04a0d0a908a86`.
The repository-wide `npm.cmd run verify` passes `399 / 399` after adding this
layer.

No complete Slice 09 case context, actual driver, durable runner, machine
definition, runtime observation, fixture copy, request, result, decision,
calibration, formal material, model weight, third-party image, real-user image
or product integration exists. Real Sharp execution remains forbidden until a
future results-zero definition is independently validated, committed and pushed.
