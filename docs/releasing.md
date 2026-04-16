# Releasing

Two channels: **stable** (`main`, npm dist-tag `latest`) and **alpha** (`next`, npm dist-tag `next`). Both are driven entirely by [release-please](https://github.com/googleapis/release-please) — version bumps, changelogs, and publishes are automatic when conventional-commit messages land on the right branch.

## Conventional commits

Every commit on `main` or `next` must match:

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

`commitlint` runs on every PR and will reject non-conforming commits.

## Stable releases — merge to `main`

1. Land a `feat`/`fix`/etc. commit on `main`.
2. `release-please` opens a release PR titled like `chore: release 0.3.0`. It aggregates all unreleased commits into the changelog, bumps versions in affected packages, and updates `.release-please-manifest.json`.
3. Review and merge the release PR. The publish jobs (`publish-core`, `publish-components`, `publish-viz`) then run; each publishes its package with the default `latest` dist-tag.
4. Users get the new version via `pnpm add svelte-p5`.

Per-package independence: if a commit only touches `packages/viz/**`, only `svelte-p5-viz` bumps. The other packages stay on their existing versions.

## Alpha releases — work on `next`

1. Create the `next` branch from `main` if it doesn't exist:
   ```bash
   git checkout -b next main
   git push -u origin next
   ```
2. Commit your experimental work to `next` with conventional messages.
3. `release-please` opens a release PR on `next` titled like `chore: release alpha 0.3.0-alpha.0`. It uses `.release-please-manifest-next.json` and `release-please-config-next.json` so the alpha version bookkeeping is isolated from stable.
4. Merge the PR. Publish jobs run with `npm publish --tag next`.
5. Users install alpha with `pnpm add svelte-p5@next`.

Each alpha bump is `-alpha.N` with N incrementing: `0.3.0-alpha.0`, `0.3.0-alpha.1`, etc. When an alpha stabilizes, merge `next` into `main` — the next `release-please` run on `main` promotes the feature to stable by dropping the `-alpha.N` suffix.

### Per-package alpha independence

Same as stable: a commit touching only `packages/components/**` on `next` bumps only `svelte-p5-components@0.3.0-alpha.0`. `svelte-p5` and `svelte-p5-viz` stay at their current versions. Release-please is path-aware; no extra branches per package needed.

## Initial alpha cutover (one-time)

These steps bootstrap the alpha channel starting from the current `main`:

```bash
# from an up-to-date local main
git checkout -b next main
git push -u origin next
```

The first commit on `next` with a `feat:` message will trigger `release-please` to open a release PR proposing `0.3.0-alpha.0` for whichever packages were touched. That PR's merge is the first alpha publish.

## The versioning mental model

| State                            | `main` (stable) | `next` (alpha) | npm dist-tags                                                        |
| -------------------------------- | --------------- | -------------- | -------------------------------------------------------------------- |
| Feature in flight on alpha       | 0.2.2           | 0.3.0-alpha.2  | `latest`=0.2.2, `next`=0.3.0-alpha.2                                 |
| Alpha stabilised, merged to main | 0.3.0           | (caught up)    | `latest`=0.3.0, `next`=0.3.0                                         |
| Patch fix on stable              | 0.3.1           | 0.3.0          | `latest`=0.3.1, `next`=0.3.0 (stale; bump by merging main into next) |

## When to `git merge main` into `next`

Periodically, especially after a stable release lands, merge `main` into `next`. This keeps the alpha branch from drifting and lets `release-please` pick up the stable patches so the next alpha is based on the latest code.

```bash
git checkout next
git merge main
git push origin next
```

## Emergency / manual publish

If `release-please` is wedged and you need to ship:

```bash
# Stable
cd packages/<pkg>
pnpm build
npm publish  # defaults to --tag latest

# Alpha
npm publish --tag next
```

Don't do this without recording the new version in the manifest files, or the next automated run will re-propose the same version and fail.

## Pre-1.0 semantics

`0.x` is unstable by design. Minor bumps can break the public API — see the `versioning` note in `architecture.md`. Breaking changes are always called out with `BREAKING CHANGE:` in the commit body; release-please bumps the minor (not major) while pre-1.0. When the API stabilises enough to warrant 1.0, we flip `bump-minor-pre-major: false` on each package in the config.
