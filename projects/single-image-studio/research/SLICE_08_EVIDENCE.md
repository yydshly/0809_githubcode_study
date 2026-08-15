# Slice 08 definition evidence

## Outcome

Slice 08 is `definition-frozen / results-zero / Gate-B-smoke-not-run /
calibration-forbidden / non-C1 / non-product`.

The implementation-only baseline was committed and pushed as
`7ed6ad2eab829e5d801f13ff534042ae187e0982` before the canonical definition
was generated. No real Sharp image path was executed while building or
validating this definition.

## Canonical definition

- frozen UTC: `2026-08-15T13:37:23.038Z`
- definition index content hash:
  `048d1d0212ea8e59fdf3e24b0acb6d75e57535ac1fa8757d42442cb7b8623695`
- definition index file SHA-256:
  `7ff4e599eeff45865dccb5d9bd9f6e8c0faba516785f808c4063f4b11e4aa8c7`
- descendant tree, 38 files:
  `ee577c4560d2b08e9a18fb8ac8b2872916b3652bd1b664ef9b366b1e704996a4`
- schema tree, 16 files:
  `1a6f45c3415eece37bc007042a87538ff81c9262373b732aaf8fcacafa0ee9d0`
- complete definition tree, 40 files including index and README:
  `c6845e689a33607f8c031e87eec8a42cbfdc78b3ca6ca2698e2b5cf98c35cc24`
- pinned README SHA-256:
  `4dd57e7e6035209e9bfaea1a8a6ec8fc082b9f129e57fc31b8f14c886dced7f3`
- generator SHA-256:
  `d46ba04d6bbcc21604baba9906c14c67cb79cb7f331f1919e78d47a64951c23b`

The tree contains 16 strict schemas, 22 non-index machine records, one index,
12 new non-independent Slice 08 source-lineage wrappers, two operation-specific
manifests and two preregistrations. It copies zero image bytes. Every wrapper
reopens exact immutable Slice 07 lineage and exact project-original Slice 05
raw / normalized-input / gold bytes.

## Frozen denominator and boundaries

- one registered driver invocation
- two registered operation runs: normalize, then export
- six source units per operation: three applicable and three rejection
- three repetitions per source
- 12 source units and 36 planned attempts total
- zero replacement attempts
- results root: `results/open-smoke`
- result files at definition freeze: `0`
- `calibrationAuthorized=false`
- C1, U1, E1, R1, O1, G1 and V1: `0`
- `productSupport=false`, `formal=false`
- Release Gate: allowlist `none`, registered `0`, approved `0`

The definition does not authorize a partial rejection-only rerun. Slice 07
results remain immutable lineage and cannot be spliced into the Slice 08
decision.

## Implementation and validation

Implementation SHA-256 values at definition freeze:

- typed case context: `3bc4520b11c51c48ad4795caf27543a96f9bc43902c2925a03f3896ad9f825ba`
- actual-case material driver: `530e1ac963bb55f0252b1f8cb4030c481dd1d117fade3f17e3c51453e6ddd607`
- durable operation runner: `bd9b40dbe9fe923f20289716d28073f5c629ccde1acfd1f716ff9bbb63d28f9e`
- registered driver: `e586c8b57ac683333169cf512a7691180d79d6ab6cbdd98e0edf357265daab09`
- central validator after definition pins:
  `2f8bb7d25133cdb2745075611241aa67ba8705350644492feb65dca8fe47ca37`

At definition freeze, the six Slice 08 fake-only suites passed `28 / 28`. A
post-freeze canonical production-path test raises the current targeted total to
`29 / 29`. They cover closed context
schemas, exact source / manifest / disposition / code / gold binding,
worker-free rejection, durable publication and ledger rules, deterministic
definition regeneration, unknown-keyword rejection, external lineage reopening,
and a complete temporary 36-attempt post-run closure whose PNG bytes and oracle
facts are independently reopened. The repository-wide verification immediately
before definition freeze passed `392 / 392`; the final post-freeze verification
passed `393 / 393`, including the canonical literal-pin, fresh-runtime and
regeneration test.

The first generator attempt was blocked by sandbox `mkdir EPERM` before the
first child directory was created. A read-only check confirmed that only the
pre-existing README remained. An authorized candidate tree was then generated,
but the post-freeze full validator correctly found that a package-script change
made its runtime manifest incompatible with the immutable Slice 05 runtime
baseline. That uncommitted candidate tree was declared invalid and removed in
full. The unrelated package change was reverted before the final UTC above was
captured. The final tree passes both Slice 05 and Slice 08 fresh-runtime checks;
there is one retained canonical definition and no partial or competing result.

## Next hard stop

The definition must be validated, committed and pushed with a clean
`HEAD == origin/main` before the single registered command may run. The result
tree must then be preserved even if it is non-pass. No same-version replay,
selective retry, calibration, formal holdout, product/UI/server wiring, real-user
photo, third-party image, model weight or license-unclear asset is authorized.
