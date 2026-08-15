# Slice 06 diagnostic characterization evidence

## Outcome

Slice 06 `@0.6.0` is closed as `characterization-complete`. This means the
pre-registered diagnostic record closure is complete; it is **not** a candidate
conformance pass, Gate-B decision, calibration authorization, C1 result, format
support claim, or product capability.

The frozen definition commit was `786cf23b384737307d4f7d37523eabd8b634795a`.
Its definition index content / file SHA-256 values remain:

- `d537199c8bc6147761da297daeddb03e1ff837a83c8d2c57af29c9e5b9b67e08`
- `1cb934a1d870a62e9ccb706e3c21dcdbb54de55f027a325e31230ac4bf3cb20c`

The first sandboxed invocation failed while creating the result root with
`EPERM`; it created no result directory, request, claim, ledger event, or
selectable outcome. The exact command was then run once with the required
workspace permission. That successful execution is the only registered Slice
06 invocation and must not be rerun.

## Registered denominator and closure

One driver invocation registered two operation runs:

| Operation | Source units | Repetitions | Attempts | Replacements | Interval UTC | Outcome |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| normalize | 4 | 3 | 12 | 0 | `2026-08-15T10:21:24.678Z`–`2026-08-15T10:21:26.471Z` | `characterization-complete` |
| export | 4 | 3 | 12 | 0 | `2026-08-15T10:21:26.675Z`–`2026-08-15T10:21:28.506Z` | `characterization-complete` |

The closed result root is `research/slice-06/results/open-diagnostic`:

- 152 regular files in 34 non-empty directories;
- 583,198 total bytes;
- tree SHA-256
  `4c82a65083ccc1675a65d632010360d991171255ec5ef74b4a50092f701dd146`;
- 24 requests, 24 durable claims, 24 terminal results;
- two 42-event append-only ledgers (84 events total);
- 18 retained candidate outputs in `quarantine/`, six worker-free preflight
  result records, two summaries and two close records;
- zero `artifacts/`, calibration, formal, holdout, defect-holdout, escape,
  product, or release material.

The result tree is excluded from the immutable definition-tree digest but is
automatically and strictly validated by the same central validator. Any other
`results/` subtree remains forbidden.

## Exact characterization result

Each operation has the same terminal distribution:

| Status | normalize | export |
| --- | ---: | ---: |
| `characterized-oracle-non-pass` | 9 | 9 |
| `characterized-preflight-rejection` | 3 | 3 |
| `characterized-oracle-pass` | 0 | 0 |
| `protocol-failed` | 0 | 0 |
| `inconclusive` | 0 | 0 |

All 18 applicable outputs have:

- `workerExitConfirmed=true`, exit code `0`, signal `null`;
- complete bounded worker telemetry and a runtime payload matching the frozen
  attestation;
- byte-for-byte, decoded-pixel, classification, oracle-outcome, and runtime
  determinism across all three repetitions;
- expected RGBA8 dimensions, Alpha semantics, decoded pixel SHA-256 and only
  filter type `0`;
- PNG chunk sequence `IHDR,pHYs,IDAT,IEND`;
- primary code `S06_ORACLE_PNG_SRGB_REQUIRED`;
- secondary findings including `S06_ORACLE_PNG_METADATA_FORBIDDEN` and the
  resulting color-space / metadata identity mismatch.

Therefore the observed defect is precise: Sharp produced the expected pixels
deterministically, but its PNG encoding omitted the required `sRGB` chunk and
added the contract-forbidden `pHYs` ancillary chunk. The independent oracle did
not repair or rewrite candidate bytes.

The normalize missing-sRGB sentinel rejected 3 / 3 before worker invocation
with exact code `S06_INPUT_SRGB_REQUIRED`. The export invalid-artifact sentinel
rejected 3 / 3 before worker invocation with exact code
`S06_EXPORT_NORMALIZED_ARTIFACT_INVALID`.

## Durable pins

| Record | Content hash | File SHA-256 |
| --- | --- | --- |
| normalize registered run | `c232388afb8cad247dea2ea8588c5bf4df8a667b278d85ee61b3cdca680aa354` | `c9bee6fe2d7712cdf9727650b5f9d6ab3e9e22220b6dc77b5ae9bd35ab65ce6a` |
| export registered run | `cbba3c46c0fce26d9f9cf1de958241607783030e8049904e29ddadbf557b2743` | `9404c9bc1f511b0898ec0547515d3f90865f0ac905ed1e631826d094fd5beb20` |
| normalize summary | `70f80c7aed75c4d5e494f5adb6123b8e9cc413f934db2a762b3c806fa2b1900f` | `8e6d79ecf1110df74ae7f355017289e655f1f19f105d0e2d64c4c0de95700e3b` |
| export summary | `1b60c9f1a9404972b2f5079d14bb31f715135f936f958ee17945fb0a1da829a0` | `a381f5f5928211d0a7ce72329aa60b944af58c4ecbc1d5c907362a6a89e22c4b` |
| normalize close | `aa09bfd5470af359b4784aa2ca399cb00cd0f3fbdd9020387085a9cb62696601` | `3160c08053c9ed54d3af18526009fd9ddd07319c2adff95ca372031db8b82d8f` |
| export close | `ec715e13e01d0d0d752c34b9510318ab8386707ff3769cd6fffc265ba9d18ce6` | `a052f26e6df737216894882f8a5cea4a4766fb8301be007f26e519a7ba8b8005` |

Ledger file SHA-256 values are
`e3728efb6cc63c7a68b95aaec718d53b5097835d833cb9b84325364bd50cdbc8`
(normalize) and
`59d5d1845db87e68b998af085e0956388f8c88afe2a970bdd7fa1079277b03d9`
(export). Their tail content hashes are
`30cdadb198eaf197f4267b492127f0732995689310020ca53d9b5359bacde9b9`
and `905348fb08bad74252051229594457decaf68b19e3f61827f7d14a790e9fffb3`.

## Verification

The post-run validator independently reopens all 18 retained byte streams,
recomputes each oracle verification, checks all request / claim / terminal /
publication cross-links, validates both ledger chains, rebuilds both summaries,
and recomputes both operation close trees and the complete result-tree digest.

Adversarial tests additionally reject:

- retained candidate-output byte tampering;
- ledger sequence / predecessor tampering;
- a self-rehashed summary that changes aggregate facts;
- an extra unregistered result file.

The final central Slice 06 suite passes `33 / 33`; full
`npm.cmd run verify` passes `325 / 325`, including syntax checks. The central
validator implementation SHA-256 is
`c6906528c4d9ca4c5d054046b63378365a27d5f6f3a37d70dd19a9c740712e7b`.

## Decision boundary and next slice

Slice 06 remains:

```text
Gate-B-not-entered-diagnostic-only
gateBDecisionAuthority=false
calibrationAuthorized=false
C1=U1=E1=R1=O1=G1=V1=0
releaseAllowlist=none
releaseRegistered=0
releaseApproved=0
productSupport=false
```

Do not rerun or patch `@0.6.0`, do not loosen the embedded-sRGB / metadata
contract, and do not let the oracle repair candidate bytes. The next slice may
select a new composite candidate in which Sharp produces pixels and a
candidate-owned canonical PNG encoder emits the exact closed profile. That
encoder must be independent from the oracle implementation, and the new
candidate, contracts, runtime, Gate-B plan, preregistration, denominator and
stop rules must all be frozen before any new real smoke.
