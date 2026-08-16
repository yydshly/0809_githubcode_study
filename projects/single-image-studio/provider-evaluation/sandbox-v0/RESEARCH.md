# PhotoRoom sandbox generated-image review

## Outcome

The four project-generated challenge images completed one sandbox call each with zero retry. All four responses were `1254×1254` RGBA PNG files with nontrivial Alpha, so the authentication, upload, run polling, download, output validation, and Alpha transport path worked.

That is not the same as a quality pass. Visual inspection found edge haze or retained background in every case:

| Case | Structural result | Visible limitation |
| --- | --- | --- |
| Fictional mannequin / curly hair | Many strands and gaps retained | Brown haze and color fringe around hair |
| Transparent glass bottle | Partial Alpha represents transparency and refraction | Backdrop color bleed and soft halo around bottle and cap |
| Fictional long-haired dog | Fine fur and whiskers mostly retained | Strong fur halo and small meadow remnants near paws |
| Woven rattan chair | Many holes and thin strands retained | Severe retained background inside and around lattice openings |

The sandbox provider is therefore usable as an engineering integration candidate, but this run does not demonstrate production-ready cutout quality. The results make the next product requirement clearer: a provider result must open in a non-destructive correction surface with keep/erase tools, checkerboard inspection, and preview on multiple background colors. The basic editor must remain usable when remote removal is unavailable or rejected.

## Method

- Inputs were created with the built-in OpenAI image generation tool and contain no user photo, third-party photo, or real identity.
- Exact prompts, file hashes, dimensions, and rights statements are in [generation-manifest.json](generation-manifest.json).
- The explicit command `npm.cmd run provider:sandbox:probe` performed four sequential calls and no retry.
- Raw JSON observations are under [results/](results/); watermarked output PNG files are ignored by Git and remain local.
- Machine-readable Alpha counts and qualitative observations are in [reviewed-evidence.json](reviewed-evidence.json).

## Interpretation boundary

The four calls are an exploratory sandbox probe outside the frozen 12-source provider evaluation denominator. The inputs have no ground-truth Alpha matte and sandbox outputs are watermarked, so this evidence cannot establish edge accuracy, provider selection, production quality, cost, privacy approval, or release support. A non-watermarked ordinary-API evaluation would require a separate explicit budget and the already frozen privacy/quality gates.
