# Contributing

Thanks for the interest. Main use case is my own four projects, but issues and PRs are welcome.

## Ground rules

- PRs, not direct commits to `main`.
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

One long-lived branch (`main`) with two distribution channels:

| Channel            | How to install                                                    | Source                                                                                                              | Version scheme         |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Stable**         | `pnpm add svelte-p5`                                              | Commits on `main` accumulate into a release-please PR; merging it publishes to npm with the `latest` dist-tag       | `svelte-p5@0.3.0`      |
| **Canary preview** | `pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@<sha>` | Every PR + every push to `main` publishes a preview build to [pkg.pr.new](https://pkg.pr.new/~/edw1nzhao/svelte-p5) | CDN tarball per commit |

No `next` branch, no `@alpha` dist-tag, no sync PRs. Canary previews replace all of that.

### Which branch should my PR target?

`main`. Always.

### How canary previews work

On every PR + every push to `main`, the `ci.yml` workflow runs `pkg-pr-new publish` against all three packages. The bot drops a sticky comment on the PR with exact `pnpm add` URLs you can install in any project to test the change end-to-end:

```bash
pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@<sha>
pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5-components@<sha>
pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5-viz@<sha>
```

No npm account needed, no version bump, no release PR. Workspace deps between the three packages are rewritten to each other's preview URLs automatically, so `pnpm add <url>` installs a coherent set.

The latest build from `main` is also available at `@main` as a rolling tag:

```bash
pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@main
```

### Release pipelines

Two GitHub Actions workflows drive stable releases. You shouldn't need to touch them for normal contributions:

- **`.github/workflows/release-please.yml`** — triggers on push to `main`. Opens/updates a release PR; merging it tags, releases, and publishes with `latest`.
- **`.github/workflows/publish.yml`** — reusable workflow called by `release-please.yml`. Holds the actual build + `npm publish` steps. Registered as the **trusted publisher** on npmjs.com for all three packages. **Do not rename this file** without updating the trust config on npmjs.com.

Preview publishing is a step inside `.github/workflows/ci.yml` — no dedicated workflow.

### Breaking changes

Pre-1.0, breaking changes bump the minor (not major) per release-please's `bump-minor-pre-major: true`. Always flag them with `BREAKING CHANGE:` in the commit body so they surface in the changelog:

```
feat(core)!: rename onReady to onMount

BREAKING CHANGE: <Canvas> no longer fires `onReady`. Migrate to `onMount`.
```

If you want extra validation time before a breaking change hits stable users, share the pkg.pr.new preview URL from the PR and get feedback before merging. The preview URL is the replacement for the old "land it on alpha first" flow.

### Emergency manual publish

If release-please is wedged and a fix needs to ship now, the manual procedure is documented in [`docs/releasing.md`](../docs/releasing.md#emergency--manual-publish). Don't use it routinely — it bypasses the trust chain and the manifest updates that release-please relies on.

### Branch protection (maintainer reference)

Recommended settings on GitHub (not contributor-facing, but documented here so they don't get lost):

- `main`: require PR before merging; require status checks (`lint-and-build`, `commitlint`) to pass; disallow force-push; disallow deletion; require linear history.
- Allow GitHub Actions to create and approve PRs (needed for the release-please PR).

## Releases

Versioning and changelogs are handled by [release-please](https://github.com/googleapis/release-please-action) driven by conventional commits. You don't bump versions manually. Full details in [`docs/releasing.md`](../docs/releasing.md).
