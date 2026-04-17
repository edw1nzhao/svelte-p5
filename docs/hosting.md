# Hosting

> **Status:** this document describes the original GitHub Pages → Cloudflare Pages migration plan. The site actually migrated to **Cloudflare Workers Static Assets** (configured via `wrangler.toml`, deployed via the Cloudflare Workers GitHub App) in a later pass. The high-level motivation below is still accurate; the specific CF Pages instructions are superseded. Treat as historical reference until rewritten.

The `site/` package (landing page + docs) currently deploys to GitHub Pages via `.github/workflows/deploy-site.yml`. This document proposes a migration to **Cloudflare Pages** and lays out how to do it.

## Why switch

GitHub Pages works for a single-environment static site. It doesn't give us:

- **Preview deploys per PR.** Every Cloudflare build from a non-production branch gets its own preview URL. Invaluable for visual review before merging, and for sharing works-in-progress.
- **Analytics and logs.** Cloudflare includes basic web analytics (privacy-respecting, no cookies) and build/deploy logs with retention.

Cloudflare Pages is free for open source projects. There's no credit card required, and the free tier's limits (500 builds/month, 100 custom domains) are well beyond what this repo needs.

## Migration steps

### 1. Connect the repo in Cloudflare

1. Go to https://dash.cloudflare.com → Workers & Pages → Create → Pages.
2. Connect the GitHub repo `edw1nzhao/svelte-p5`.
3. Configure the build:
   - **Framework preset:** SvelteKit
   - **Build command:** `pnpm install && pnpm build && pnpm --filter @svelte-p5/site build`
   - **Build output directory:** `site/build`
   - **Root directory:** `/` (monorepo root)
   - **Node version:** `24` (under Environment Variables, set `NODE_VERSION=24`)
4. Set the production branch to `main` and check "Include preview deployments for all non-production branches."

### 2. Point the domain

In DNS (Cloudflare or whatever registrar holds the zone), update `svelte-p5.dev` to CNAME to `svelte-p5.pages.dev`. Cloudflare auto-provisions the certificate.

### 3. Remove the GitHub Pages workflow

Once the Cloudflare deploys are confirmed green:

```bash
git rm .github/workflows/deploy-site.yml
git commit -m "ci: remove GitHub Pages workflow, deploys now run on Cloudflare Pages"
```

In the GitHub repo settings → Pages, disable the source.

## What changes in the dev flow

Nothing, mostly. You push to any branch and Cloudflare builds automatically. PRs get preview URLs posted as checks. Merging to `main` promotes to production.

## What stays the same

- The `site/` package source. Same SvelteKit app, same structure, same build command.
- The CI pipeline in `.github/workflows/ci.yml`. CF builds run in parallel with CI checks — they're not gated on each other.
- `pnpm --filter @svelte-p5/site dev` for local development.

## Roll-back plan

If Cloudflare Pages hits an outage or we decide to revert, keep `.github/workflows/deploy-site.yml` around in git history and restore it:

```bash
git revert <cloudflare-switchover-commit>
```

Re-enable the GitHub Pages source in repo settings. Takes ~5 minutes.

## Multiple release environments on one deploy

| Branch            | CF environment               | Domain                                  |
| ----------------- | ---------------------------- | --------------------------------------- |
| `main`            | production                   | `svelte-p5.dev`                         |
| `feat/*`, `fix/*` | preview (auto-generated URL) | `<build-id>.svelte-p5-site.workers.dev` |

Feature-branch PRs get preview URLs automatically, posted as deployment status checks by the Cloudflare Workers GitHub App. No staging branch is needed — the pkg-pr-new-powered canary install URLs (see `releasing.md`) give library consumers a way to test unmerged commits without a second hosted site.
