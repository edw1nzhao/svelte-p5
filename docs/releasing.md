# Releasing

Two distribution channels off a single `main` branch:

- **Stable** — `pnpm add svelte-p5` → latest tagged release, driven by [release-please](https://github.com/googleapis/release-please).
- **Canary preview** — `pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@<sha>` → per-commit preview builds via [pkg-pr-new](https://pkg.pr.new/), published automatically on every PR and every push to `main`.

No `next` branch, no `@alpha` dist-tag. For the contributor-facing quick view, see [`.github/CONTRIBUTING.md#branch--release-model`](../.github/CONTRIBUTING.md#branch--release-model). This document is the deep-dive reference.

## Workflows that drive releases

| File                                   | Trigger                    | Responsibility                                                                                                    |
| -------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`             | push / PR                  | Lint, typecheck, test, build — and the `pkg-pr-new publish` step that drops preview-URL sticky comments on PRs.   |
| `.github/workflows/release-please.yml` | push to `main`             | Opens/updates the release PR; on merge, calls `publish.yml` with `--tag latest` for each affected package.        |
| `.github/workflows/publish.yml`        | `workflow_call` (reusable) | Holds the actual `npm publish` step. Registered as the **trusted publisher** on npmjs.com for all three packages. |

`publish.yml` is what npm OIDC pins for trusted publishing. `job_workflow_ref` reflects the _called_ workflow, so the trust entry covers `release-please.yml` invocations automatically. **Do not rename `publish.yml`** without updating the trusted publisher on all three packages at npmjs.com.

## Conventional commits

Every commit on `main` must match:

```
<type>(<optional scope>): <subject>
```

Types that affect versioning:

| Type                       | Bump  | Example                                        |
| -------------------------- | ----- | ---------------------------------------------- |
| `feat`                     | minor | `feat(components): add <SplitPane>`            |
| `fix`                      | patch | `fix(core): handle p5.remove() during HMR`     |
| `perf`                     | patch | `perf(viz): dedupe panel registry lookups`     |
| `feat!`                    | major | `feat(components)!: rename onready to onReady` |
| `BREAKING CHANGE:` in body | major | (semver-major bump regardless of type)         |

Types that don't bump versions: `docs`, `chore`, `ci`, `build`, `refactor`, `test`, `style`.

`commitlint` runs on every PR and rejects non-conforming commits.

## Stable releases

1. Land a `feat`/`fix`/etc. commit on `main` via a PR.
2. `release-please` opens/updates a release PR titled like `chore: release 0.3.0`. It aggregates all unreleased commits into the changelog, bumps versions in affected packages, and updates `.release-please-manifest.json`.
3. Review and merge the release PR. The `publish-core` / `publish-components` / `publish-viz` jobs fire; each publishes its package with the `latest` dist-tag via OIDC trusted publishing.
4. Users get the new version via `pnpm add svelte-p5`.

Per-package independence: if a commit only touches `packages/viz/**`, only `svelte-p5-viz` bumps. The other packages stay on their existing versions.

## Canary preview builds

Automatic. No manual steps.

Every time CI runs (PR open, PR update, push to `main`), the `Publish preview packages` step at the end of `lint-and-build` runs:

```bash
pnpm dlx pkg-pr-new publish './packages/core' './packages/components' './packages/viz'
```

pkg-pr-new:

- Packs each package into a tarball.
- Rewrites `workspace:*` / `workspace:^` deps to point at the preview URLs of the sibling packages built in the same run, so `svelte-p5-components` installs against this same-commit `svelte-p5` preview rather than the stable npm copy.
- Uploads the tarballs to pkg.pr.new's CDN keyed by `<owner>/<repo>/<pkg>@<sha>`.
- Drops a sticky comment on the PR listing the install URLs.

### Using a preview build

In a consuming project:

```bash
# pin to an exact commit
pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@abc1234

# or track the latest main
pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@main
```

If you need a coherent set across all three packages, install them together:

```bash
pnpm add \
  https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@abc1234 \
  https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5-components@abc1234 \
  https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5-viz@abc1234
```

### When to use a preview vs wait for stable

Use preview URLs when you want to:

- Test a feature or fix in your own project before it lands as a stable release.
- Share a reproducible install with a reviewer on a PR.
- Unblock yourself on a fix that's committed but not yet released.

Use stable (`pnpm add svelte-p5`) for production dependencies. Preview URLs are stable in content (they're CDN-pinned to a commit SHA) but aren't versioned — `pnpm update` won't move them, and they carry no changelog.

### Why not use `@alpha` / `@next` dist-tags on npm?

Preview-per-commit is strictly better than periodic `-alpha.N` publishes for a pre-1.0 library at this scale:

- Every commit is installable; you don't wait for a maintainer to "cut" an alpha.
- No npm registry pollution — the stable package's version history stays clean.
- No `Release-As:` gymnastics to switch alpha → beta prerelease tags.
- PRs from contributors get installable previews automatically.

The trade-off is that preview installs go through a third-party CDN (pkg.pr.new) rather than npm. That's fine for testing; it's not how you'd ship production dependencies.

## Pre-1.0 semantics

`0.x` is unstable by design. Minor bumps can break the public API — see the `versioning` note in `architecture.md`. Breaking changes are always called out with `BREAKING CHANGE:` in the commit body; release-please bumps the minor (not major) while pre-1.0. When the API stabilises enough to warrant 1.0, we flip `bump-minor-pre-major: false` on each package in the config.

## Emergency / manual publish

If `release-please` is wedged and you need to ship:

```bash
cd packages/<pkg>
pnpm build
npm publish  # defaults to --tag latest
```

Don't do this without recording the new version in `.release-please-manifest.json`, or the next automated run will re-propose the same version and fail. Prefer fixing release-please.
