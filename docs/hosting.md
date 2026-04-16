# Hosting

The `site/` package (landing page + docs) currently deploys to GitHub Pages via `.github/workflows/deploy-site.yml`. This document proposes a migration to **Cloudflare Pages** and lays out how to do it.

## Why switch

GitHub Pages works for a single-environment static site. It doesn't give us:

- **Preview deploys per PR.** Every Cloudflare Pages build from a non-production branch gets its own preview URL (`<pr-id>.svelte-p5.pages.dev`). Invaluable for visual review before merging, and for sharing works-in-progress.
- **Branch-aliased environments.** `main` → production (`svelte-p5.dev`), `next` → staging (`next.svelte-p5.dev`), any feature branch → preview. GitHub Pages gives us one site per repo unless we jury-rig subpath routing.
- **Analytics and logs.** Cloudflare Pages includes basic web analytics (privacy-respecting, no cookies) and build/deploy logs with retention.

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

Optional staging subdomain:

- Add a CNAME for `next.svelte-p5.dev` → `next.svelte-p5.pages.dev`.
- In Cloudflare Pages → Custom domains, add `next.svelte-p5.dev`.
- Deployments from the `next` branch now auto-alias to that domain.

### 3. Remove the GitHub Pages workflow

Once the Cloudflare deploys are confirmed green:

```bash
git rm .github/workflows/deploy-site.yml
git commit -m "ci: remove GitHub Pages workflow, deploys now run on Cloudflare Pages"
```

In the GitHub repo settings → Pages, disable the source.

## What changes in the dev flow

Nothing, mostly. You push to any branch and Cloudflare builds automatically. PRs get preview URLs posted as checks. Merging to `main` promotes to production; merging to `next` promotes to staging.

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

## Multiple release environments on one deploy — the question that prompted this doc

You can't cleanly do multi-environment deploys with GitHub Pages, at least not without subpath hackery (`/` for stable, `/next/` for alpha, maintained by hand). Cloudflare's production-branch + preview-branch model maps cleanly onto the `main`/`next` release channels documented in `releasing.md`:

| Branch            | CF environment               | Domain                           |
| ----------------- | ---------------------------- | -------------------------------- |
| `main`            | production                   | `svelte-p5.dev`                  |
| `next`            | preview (aliased)            | `next.svelte-p5.dev`             |
| `feat/*`, `fix/*` | preview (auto-generated URL) | `<build-id>.svelte-p5.pages.dev` |

This is the answer to "how do I do multiple release environments on a single deploy?" — CF does it natively; GH Pages doesn't.
