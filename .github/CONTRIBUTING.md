# Contributing

Thanks for the interest. Main use case is my own four projects, but issues and PRs are welcome.

## Ground rules

- PRs, not direct commits to `main` or `next`.
- Conventional Commits. `commitlint` runs on `commit-msg`.
- `prettier` and `eslint` run on `pre-commit` via `lint-staged`.
- Tests must pass in CI before merge.

## Commit format

```
<type>(<optional scope>): <subject>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Scope is optional; use the package name (`core`, `components`, `viz`, `site`, `docs`) for package-specific changes.

```
feat(core): add createP5Bridge helper
fix(components): ResponsiveCanvas resize leak
docs: add HiDPI recipe
```

## Local setup

```bash
mise install
pnpm install
pnpm -r build
```

For iterating against local package source, run one of the examples:

```bash
pnpm --filter @svelte-p5-example/02-store-bridge dev
```

pnpm's workspace protocol picks up changes in `packages/core`, `packages/components`, and `packages/viz` automatically.

## Style

Svelte 5 runes only (`$state`, `$derived`, `$props`, `$effect`). No `export let`, no `$:`, no `createEventDispatcher`.

TypeScript strict mode. `any` is permitted only where p5's loose typings force it.

Tabs for indentation (see `.editorconfig`).

## Branch & release model

Two long-lived branches, two npm dist-tags. Everything below is automated — contributors pick which branch to target and land conventional commits; release-please handles versioning, changelogs, and npm publishing.

| Branch | npm dist-tag | Published version example | When to use                                                                                            |
| ------ | ------------ | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `main` | `latest`     | `svelte-p5@0.3.0`         | All stable work. Default target.                                                                       |
| `next` | `next`       | `svelte-p5@0.3.0-alpha.2` | Experimental or breaking work that needs real-world validation before stabilisation. Opt-in for users. |

Users install stable with `pnpm add svelte-p5`, alpha with `pnpm add svelte-p5@next`.

### Which branch should my PR target?

- **Default: `main`.** Features, fixes, docs, CI — unless they're experimental.
- **`next`:** only when the change needs alpha validation first (large refactor, new public API you want feedback on, breaking change).

A PR targeting `next` eventually reaches `main` by one of:

1. **Fast path** (most cases): open the same PR against `main` once you've validated it on alpha. No merge-back needed.
2. **Merge-back path:** when a whole feature has stabilised on `next`, open a PR to merge `next` → `main`. The next `release-please` run on `main` promotes the feature to stable (drops the `-alpha.N` suffix).

### Release pipelines

Three GitHub Actions workflows drive releases. You shouldn't need to touch them for normal contributions, but they're worth knowing exist:

- **`.github/workflows/release-please.yml`** — stable channel. Triggers on push to `main`. Opens a release PR; merging it tags, releases, and publishes with `latest`.
- **`.github/workflows/release-please-next.yml`** — alpha channel. Triggers on push to `next`. Same shape but uses the `-next` config/manifest pair and publishes with `--tag next`.
- **`.github/workflows/publish.yml`** — reusable workflow called by both pipelines. It holds the actual build + `npm publish` steps. This is the file registered as the **trusted publisher** on npmjs.com for all three packages. npm's OIDC validates `job_workflow_ref` against this file regardless of which top-level workflow called it, so one trust configuration per package covers both channels. **Do not rename this file** without updating the trust config on npmjs.com for each package.

### Keeping `next` in sync with `main`

After every successful stable release on `main`, `release-please.yml` automatically opens a sync PR (`chore: sync main into next`) that merges the new main commits into `next`. Review it and merge.

Why it matters: if `next` drifts too far from `main`, alpha versions start regressing (they won't contain recent stable fixes) and eventually alpha → stable promotion produces a noisy diff. The automated PR keeps the gap small.

The alpha-specific files — `.release-please-manifest-next.json`, `CHANGELOG-next.md`, `release-please-config-next.json` — are untouched by `main`, so the sync merge has no expected conflicts. If any of those files show up in the sync diff, something's off; investigate before merging.

### Alpha → beta transition (manual)

If the alpha stabilises partially and you want to switch to a `beta` prerelease tag, release-please can't flip `prerelease-type` cleanly ([upstream issue](https://github.com/googleapis/release-please/issues/2447)). The manual procedure:

1. Update `prerelease-type` from `"alpha"` to `"beta"` in `release-please-config-next.json`.
2. On `next`, land an empty commit with a `Release-As:` footer for each affected package:

   ```bash
   git commit --allow-empty -m "chore: prerelease 0.3.0-beta.0

   Release-As: 0.3.0-beta.0"
   ```

3. release-please will open a release PR at the requested version; merge it to cut the first beta.

### Breaking changes

Pre-1.0, breaking changes bump the minor (not major) per release-please's `bump-minor-pre-major: true`. Always flag them with `BREAKING CHANGE:` in the commit body so they surface in the changelog:

```
feat(core)!: rename onReady to onMount

BREAKING CHANGE: <Canvas> no longer fires `onReady`. Migrate to `onMount`.
```

### Emergency manual publish

If release-please is wedged and a fix needs to ship now, the manual procedure is documented in [`docs/releasing.md`](../docs/releasing.md#emergency--manual-publish). Don't use it routinely — it bypasses the trust chain and the manifest updates that release-please relies on.

### Branch protection (maintainer reference)

Recommended settings on GitHub (not contributor-facing, but documented here so they don't get lost):

- `main` and `next`: require PR before merging; require status checks (`lint-and-build`, `commitlint`) to pass; disallow force-push; disallow deletion.
- Do not require linear history on `next` — release-please creates merge commits we need to preserve.
- Allow GitHub Actions to create and approve PRs (needed for the sync-main-to-next PR).

## Releases

Versioning and changelogs are handled by [release-please](https://github.com/googleapis/release-please-action) driven by conventional commits. You don't bump versions manually. Full details in [`docs/releasing.md`](../docs/releasing.md).
