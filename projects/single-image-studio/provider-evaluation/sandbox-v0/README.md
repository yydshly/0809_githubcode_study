# PhotoRoom sandbox generated-image probe v0

This is an exploratory, non-production PhotoRoom sandbox probe. It uses four project-bound images generated with the built-in OpenAI image generation tool. No user photos, third-party photos, real identities, API keys, or PhotoRoom output bytes are committed.

The four cases deliberately cover:

- fictional mannequin with fine curly hair and flyaways;
- transparent glass and refraction;
- fictional animal with long fur and whiskers;
- woven furniture with holes and thin crossing structures.

Each input may be submitted exactly once by `npm.cmd run provider:sandbox:probe`. The runner refuses to start if any prior result record exists, performs no retry, requires the configured provider to report `environment=sandbox`, and writes returned watermarked PNG files under `results/`. Result PNGs are local-only and ignored by Git; bounded JSON observations may be committed after review.

This probe evaluates transport, PNG/Alpha structure, obvious subject loss, holes, fine edges, and sandbox UX. It has no ground-truth Alpha and the watermark can alter visible pixels, so it cannot satisfy the formal 12-source provider plan or support a production-quality claim.

Exact prompts, hashes, dimensions, and generator provenance are in [generation-manifest.json](generation-manifest.json). The completed execution observations and qualitative review are in [RESEARCH.md](RESEARCH.md) and [reviewed-evidence.json](reviewed-evidence.json).

## Completed sandbox observation

All four one-shot calls succeeded with zero retry in 1.6–3.2 seconds and returned `1254×1254` RGBA PNG files. Visual review did **not** classify the results as production-ready: hair and fur retained visible halos, the transparent bottle retained backdrop color, and the chair retained substantial original background through its lattice. The result is an integration pass and a quality warning, not a provider quality pass.
