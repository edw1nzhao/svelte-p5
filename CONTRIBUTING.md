# Contributing

Thanks for the interest. Main use case is my own four projects, but issues and PRs are welcome.

## Ground rules

- PRs, not direct commits to `main`.
- Conventional Commits. `commitlint` runs on `commit-msg`.
- `prettier` and `eslint` run on `pre-commit` via `lint-staged`.
- Tests (once they exist) must pass in CI before merge.

## Commit format

```
<type>(<optional scope>): <subject>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Scope is optional; use the package name (`core`, `components`, `docs`) for package-specific changes.

```
feat(core): add createP5Bridge helper
fix(components): ResponsiveCanvas resize leak
docs: add HiDPI recipe
```

## Releases

[release-please](https://github.com/googleapis/release-please-action) handles versioning and changelogs from conventional commits. You don't bump versions; the action maintains a release PR, and merging that PR publishes to npm.

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

pnpm's workspace protocol picks up changes in `packages/core` and `packages/components` automatically.

## Style

Svelte 5 runes only (`$state`, `$derived`, `$props`, `$effect`). No `export let`, no `$:`, no `createEventDispatcher`.

TypeScript strict mode. `any` is permitted only where p5's loose typings force it.

Tabs for indentation (see `.editorconfig`).
