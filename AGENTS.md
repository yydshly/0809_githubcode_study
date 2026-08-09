# Repository Instructions

These instructions apply to the whole repository.

- Keep the root `README.md` as the human-readable catalog. Update its project table whenever a project is added, renamed, archived, or receives a repository/demo URL.
- Put in-repository studies under `projects/<kebab-case-slug>/`.
- Every study must be understandable on its own. It needs a `README.md` and an `UPSTREAM.md`; substantial investigations should also keep a `RESEARCH.md`.
- Record the upstream URL, exact tag or commit, retrieval date, license, and the boundary between upstream work and local changes before copying third-party code or assets.
- Preserve upstream license and attribution files. Never imply that the root repository license overrides a child project's third-party obligations.
- Do not commit nested `.git` directories, secrets, generated dependency directories, or build caches.
- Do not create source-code dependencies between sibling projects through relative paths. A project should remain runnable if its directory is later split into a standalone repository.
- Keep language-specific dependency files, lockfiles, commands, tests, and deployment configuration inside the project that owns them.
- Run the checks documented by the affected project before declaring work complete. If a check cannot run, state the reason in that project's README or handoff.
- Avoid introducing root-level workspaces, shared build systems, or global CI until at least two real projects have demonstrated the same requirement.
