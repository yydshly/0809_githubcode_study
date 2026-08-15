# Slice 04 metadata workspace

This directory contains the machine-readable source lock and preregistration
records for `NORMALIZE-DELIVER`. It is metadata only. It does not contain an
installed codec, executable adapter, decoded or encoded image, calibration
result, formal fixture, holdout bundle, secret seed, run request, receipt, or
EvidenceManifest result.

## Frozen boundary

Slice 04 records one composite source-resolved candidate:

- Sharp `v0.35.3`, commit
  `1018449164723ba0203c1beffaba0e21f7829c18`;
- the Sharp `0.35.3` npm package and Windows x64 native bundle;
- `sharp-libvips` `1.3.2`, commit
  `4da6d14c0d59866adfb9d8cf52bcaa53846dc4f6`, including its Windows x64
  bundle, `versions.properties`, and `THIRD-PARTY-NOTICES.md` boundary;
- upstream libvips `v8.18.3`, commit
  `3664cfc5dc2c5661288f5bf5a85ccc51c64c1626`.

The six npm registry tarballs (`sharp`, `@img/sharp-win32-x64`,
`@img/sharp-libvips-win32-x64`, `@img/colour`, `detect-libc`, and `semver`) used
to calculate SHA-256 values were downloaded to the uncommitted
repository-local temporary directory `.tmp/slice04-artifacts`, were never
unpacked or executed, and were deleted after hashing. GitHub commit IDs were
resolved through official pages / APIs; no GitHub source archive or libvips
tarball was downloaded. No Sharp or libvips package is installed in this
project. The bundled libvips is part of the same Sharp composite
candidate and is not an independent comparison arm. Standalone
`REG-NORM-LIBVIPS` remains pending freeze.

License declarations remain artifact-specific: `sharp@0.35.3` is Apache-2.0,
`@img/sharp-libvips-win32-x64@1.3.2` declares LGPL-3.0-or-later,
`@img/sharp-win32-x64@0.35.3` declares Apache-2.0 AND
LGPL-3.0-or-later, while the upstream libvips repository is
LGPL-2.1-or-later. The pinned third-party notices explain the use of the
upstream v2 / v2.1 any-later clause; these declarations are not collapsed into
one label.

The candidate lock pairs all 28 entries in `versions.properties` with their
component-level `usedUnder` declarations from the pinned notices. The two
commit-fixed raw metadata files were fetched only into the uncommitted
repository-root `.tmp/slice04-metadata-audit` directory for an independent
hash check and then deleted: `versions.properties` is 599 bytes with SHA-256
`cebb421de9568ae3ce8cfd66be62c3da53c2d549232c2e4327d9a9f97276c237`, and
`THIRD-PARTY-NOTICES.md` is 4230 bytes with SHA-256
`25ffcfa69e28b1913ced27ec778b90f24911a1bb3021253577e8b0af55db0d49`.

## Contents

The canonical record set contains 10 metadata records plus seven strict
schemas:

- one candidate lock;
- one 15-row format matrix, with `productSupport=false` on every row;
- two metadata-only capability contracts, for normalize and export;
- two operation-specific five-partition plans, one for normalize and one for
  export;
- one offline evidence-QA profile;
- two preregistrations;
- one seal intent whose request state is
  `not-issued-awaiting-custodian-bundle`;
- strict schemas for every record type.

Each operation has its own 30 `dev/calibration`, 30 `holdout`, 18
`defect/calibration`, 18 `defect/holdout`, and event-driven-zero escape
lifecycle. These are plans, not files. Only the sealed holdout 30 plus sealed
defect-holdout 18 enter that operation's initial C1 decision: 48 independent
sources. Open calibration partitions and escape are non-formal and excluded.
Defect partitions require separately registered, operation-specific injected
defects. Checked-in Slice 02 and Slice 03 fixtures cannot satisfy either plan.

Every finite source has three planned repetitions, and all 3/3 must pass. At
most one predeclared no-result invalid attempt may be replaced per source
across all three repetitions, only for runner crash before result, custody
interruption, or integrity-check failure. A valid pass or valid non-pass can
never be rerun, overwritten, or replaced. Escape is an append-only diagnostic
invalidation ledger: a confirmed contract-relevant escape invalidates the
dependent QA/C1 and requires a new version and new sealed holdout.

Applicable acceptance, defect rejection, and identity match are preregistered
at exactly 1, while false allow/reject, failure, timeout, missing, unknown, and
catastrophic tolerance are exactly 0. These are frozen future gates, not
measured results.

The QA profile pins the Slice 03 byte-backed observer only as design lineage.
That observer is incompatible with the Slice 04 contracts, so it is not a
formal oracle. The normalize and export artifact schemas, operation-specific
independent oracle implementations, and gold are all
`not-created-blocks-gate-b`. The candidate cannot produce or solely decode its
own gold. Each preregistration states its own research question and separate
C1 decision.

The seal intent pins the Slice 03 schemas/helper only as an
execution-envelope reference. It is not runnable: the actual runner, durable
cross-process consumed-request ledger, trusted authority, operation-specific
oracle, role assignments, and approval are all absent. Its request remains
`not-issued-awaiting-custodian-bundle`, and formal execution is blocked.

See [the Slice 04 contract](../SLICE_04_CONTRACT.md) for the normative scope and
[the evidence record](../SLICE_04_EVIDENCE.md) for actual hashes and checks.

## Validation

Run from `projects/single-image-studio`:

```powershell
node --test tests/research-slice04.test.mjs
npm.cmd run research:prepare
npm.cmd run verify
```

The validator proves only that the metadata tree is strict, complete,
hash-bound, and internally consistent. It must fail on source-version drift,
format-support escalation, merging the operation plans, changing the 48-source
initial C1 denominator, weakening 3/3 repetition or replacement rules,
promoting Slice 03 into a compatible oracle, inventing formal-run
prerequisites, premature request issuance, schema relaxation, unregistered
files, or checked-in formal fixture material. Passing it does not grant Gate B
or C1.

## Next authorized slice

The next slice may, under a new explicit contract, implement the pinned
candidate adapter, name the execution hardware and runtime semantics, run
codec smoke checks, and then use only open project-original calibration
fixtures. It must still leave the formal holdout uncreated. The later formal
sequence is preregistration freeze, independent custodian bundle creation,
external pin/audit, issuance of the one-time bundle-bound request, and run.
