# Releasing

Two distribution channels off a single `main` branch:

- **Stable** — `pnpm add svelte-p5` → latest tagged release, driven by [release-please](https://github.com/googleapis/release-please).
- **Canary preview** — `pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@<sha>` → per-commit preview builds via [pkg-pr-new](https://pkg.pr.new/), published automatically on every PR and every push to `main`.

No `next` branch, no `@alpha` dist-tag. For the contributor-facing quick view, see [`.github/CONTRIBUTING.md#branch--release-model`](../.github/CONTRIBUTING.md#branch--release-model). This document is the deep-dive reference.

## Workflows that drive releases

| File                                   | Trigger             | Responsibility                                                                                                   |
| -------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`             | push / PR           | Lint, typecheck, test, build — and the `pkg-pr-new publish` step that drops preview-URL sticky comments on PRs.  |
| `.github/workflows/release-please.yml` | push to `main`      | Opens/updates the release PR; on merge, dispatches `publish.yml` with `--tag latest` for each released package.  |
| `.github/workflows/publish.yml`        | `workflow_dispatch` | Holds the actual `npm publish` step. Registered as the **trusted publisher** on npmjs.com for all four packages. |

`publish.yml` is what npm OIDC pins for trusted publishing. **Do not rename `publish.yml`** without updating the trusted publisher on all four packages at npmjs.com. A new package cannot be given a trusted publisher until it exists on npm, so its first publish is manual (see `packages/create-svelte-p5/FIRST_PUBLISH.md`).

### Why `publish.yml` is dispatched, not called

npm trusted publishing validates the **top-level** workflow that is running, not the workflow containing `npm publish`. When `release-please.yml` called `publish.yml` as a reusable workflow, npm saw `release-please.yml`, which is not the registered publisher. Every automated publish (0.7.0, 1.0.0, 1.1.0) failed with `npm error code ENEEDAUTH` and had to be dispatched by hand.

`release-please.yml` now runs `gh workflow run publish.yml` once per released package, so each publish is its own top-level run of the registered file. Publish results appear as separate `publish` runs, not inside the `release-please` run; check those (and the registry) after a release.

To republish an existing tag by hand:

```sh
gh workflow run publish.yml -R edw1nzhao/svelte-p5 -f package-dir=packages/components -f ref=components-v1.1.0 -f npm-tag=latest
```

### Before a major

`updatePeerDependencies` is `false`, so peer ranges are maintained by hand. A package going to a new major means every sibling that peers on it needs its range widened first, **in a separate PR merged before the release PR**.

This is checked: `pnpm check:peers` fails when a declared peer range does not admit the sibling version in the workspace, when it uses the `workspace:` protocol, or when it has no upper bound. CI gates on it. It nearly did not exist in time: `svelte-p5-components@1.0.0` was one merge away from publishing with a peer of `>=0.4.0 <1`, which excludes `svelte-p5@1.0.0`.

Widening a sibling's range is only safe in a patch when it _adds_ versions. Narrowing it, or requiring a newer major, is a breaking change and needs a major of its own.

### Verifying a release actually published

`npm publish` can print `+ package@version`, write a provenance statement to the sigstore transparency log, and exit 0 **without the version reaching the registry**. Never treat a green publish job as proof. Check the registry:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org/svelte-p5-components/0.7.0
```

Expect `200`. Propagation is not instant and has taken up to several minutes, so a 404 immediately after a publish is not yet a failure; a 404 after ten minutes is.

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
2. `release-please` opens/updates a release PR titled like `chore: release main`. It aggregates all unreleased commits into the changelog, bumps versions in affected packages, and updates `.release-please-manifest.json`.
3. Review and merge the release PR. The `dispatch-publish` job starts one `publish` run per released package; each publishes with the `latest` dist-tag via OIDC trusted publishing.
4. Users get the new version via `pnpm add svelte-p5`.

Per-package independence: if a commit only touches `packages/viz/**`, only `svelte-p5-viz` bumps. The other packages stay on their existing versions.

## Canary preview builds

Automatic. No manual steps.

Every time CI runs (PR open, PR update, push to `main`), the `Publish preview packages` step at the end of the p5 2.x `build-and-test` leg runs:

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

Preview-per-commit is strictly better than periodic `-alpha.N` publishes for a library at this scale:

- Every commit is installable; you don't wait for a maintainer to "cut" an alpha.
- No npm registry pollution — the stable package's version history stays clean.
- No `Release-As:` gymnastics to switch alpha → beta prerelease tags.
- PRs from contributors get installable previews automatically.

The trade-off is that preview installs go through a third-party CDN (pkg.pr.new) rather than npm. That's fine for testing; it's not how you'd ship production dependencies.

## Pre-1.0 semantics

`svelte-p5` and `svelte-p5-components` are past 1.0 and follow semver. `svelte-p5-viz` is still `0.x`, which is unstable by design: minor bumps can break its public API, and release-please bumps the minor (not major) for a `BREAKING CHANGE:` while `bump-minor-pre-major` is `true`. See the versioning note in [`architecture.md`](./architecture.md#versioning). When viz stabilises enough to warrant 1.0, flip `bump-minor-pre-major` to `false` for it in the config.

## Emergency / manual publish

If `release-please` is wedged and you need to ship:

```bash
cd packages/<pkg>
pnpm build
npm publish  # defaults to --tag latest
```

Don't do this without recording the new version in `.release-please-manifest.json`, or the next automated run will re-propose the same version and fail. Prefer fixing release-please.
