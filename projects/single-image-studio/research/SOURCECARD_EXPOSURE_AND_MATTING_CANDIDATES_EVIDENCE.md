# SourceCard exposure signals and continuous-alpha candidate registry

## Outcome

The next product-relevant research increment is now closed without changing the frozen `SourceCard.v0@0.2.0` record shape:

- `SCO-EXPOSURE-SIGNALS@0.1.0` reopens opaque strict-sRGB `NormalizedImage.v0` bytes and emits deterministic luminance-distribution signals.
- The existing `quality.exposure` projection remains explicit `unknown`; four synthetic patterns do not establish a natural-image exposure judgment.
- Two continuous-alpha candidates are registered with exact official source refs and explicit license obligations. No repository, package, model, or weight was downloaded or executed.

This work is research-only, non-C1, non-product, and uses no user or third-party image.

## Exposure observer

The observer computes integer Rec.709-like luma as `Y'=(54R+183G+19B+128)>>8`, then freezes mean, p01/p50/p99, the fraction at `Y'<=16`, and the fraction at `Y'>=239`. Its four labels describe the measured distribution only: `shadow-heavy`, `balanced`, `highlight-heavy`, and `mixed-extremes`.

| Project-original synthetic input | Expected / observed signal | Mean | p50 | Shadow fraction | Highlight fraction |
| --- | --- | ---: | ---: | ---: | ---: |
| uniform RGB 16 | shadow-heavy | 16 | 16 | 1 | 0 |
| uniform RGB 128 | balanced | 128 | 128 | 0 | 0 |
| uniform RGB 240 | highlight-heavy | 240 | 240 | 0 | 1 |
| alternating RGB 0 / 255 | mixed-extremes | 127.5 | 0 | 0.5 | 0.5 |

The three existing `MATTE-GT dev/calibration` inputs all produce `balanced` objective signals, with mean luma `156.132708333`, `160.991458333`, and `158.276145833`. These observations do not mean that a natural photograph is correctly exposed.

Durable pins:

- Report content hash: `2fac6594058d0c1c19518f5a0e1aa1f619359f1e78036d9adc784893c0646d33`.
- Report file: `research/results/sourcecard-exposure-observer-v0/report.json`, 9,422 bytes, SHA-256 `0690dedf12de0584c5f5082c295454145d9fccd62f234e09f6e56facf928c76e`.
- Observer implementation SHA-256: `04b94e3d4dd5303b34f639a58b3afdf10a397d1669f81574db8eda0e5d4a3239`.
- Observation schema SHA-256: `5f3ffe01a2666f3b52e0eac8e6df53782aa70b1fec2044773bee8d1d37c8d7fc`.
- Observer contract SHA-256: `7a216f6476ef92cc14c8c3dbe9624bcea7f0dc6595dbb3fe0babd4a8377d8247`.

## Registered continuous-alpha candidates

The machine-readable registry is `research/matting-candidates/continuous-alpha-candidates.v0.json`, SHA-256 `2332b5d3d5188872dee88fd297b4ebf7cdaf90280e0e500e1087cc5fa7445351`.

| Candidate | Exact source | Official license evidence | Selected artifact state |
| --- | --- | --- | --- |
| `REG-MATTE-MODNET@0.1.0` | `ZHKKKe/MODNet` master commit `28165a451e4610c9d77cfdf925a94610bb2810fb` | [Official README](https://github.com/ZHKKKe/MODNet/blob/28165a451e4610c9d77cfdf925a94610bb2810fb/README.md#license) says repository code, models, and demos except `doc/gif` are Apache-2.0 | `modnet_photographic_portrait_matting.ckpt`: not downloaded; SHA pending acquisition |
| `REG-MATTE-RVM-MOBILENETV3@0.1.0` | `PeterL1n/RobustVideoMatting` tag `v1.0.0`, commit `17d1774b032fd503bfe53c57d295db719f9e3da1` | [Official repository](https://github.com/PeterL1n/RobustVideoMatting/tree/17d1774b032fd503bfe53c57d295db719f9e3da1) publishes source and pretrained models under the GPL-3.0 project boundary | `rvm_mobilenetv3.pth`: not downloaded; SHA pending acquisition |

MODNet is portrait-only. RVM is temporally designed and its proposed still-image research use is exactly one initial frame with empty recurrent state; that requires a new contract. GPL-3.0 obligations make RVM research-comparison-only until distribution review. Neither candidate can be called a general person, product, animal, or multi-subject matting capability.

## Verification and next boundary

The focused suite passes 4 / 4. It covers deterministic rebuild, four signal bands, opaque-only enforcement, invalid timestamps, normalized artifact mismatch, schema laundering, exact two-candidate registration, and no-overwrite materialization.

Next work must freeze a candidate-neutral continuous-alpha evaluation contract and public-synthetic denominator before acquiring any artifact. A separately governed natural-person research set is required for portrait-quality claims; it must not use real user uploads. Exact checkpoint URL, bytes, SHA-256, dependency closure, hardware profile, and distribution decision are prerequisites to any model download or inference. All evidence axes remain 0, Release Gate remains none/0/0, and `productSupport=false`.
