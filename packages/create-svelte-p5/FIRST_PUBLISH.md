# First publish of create-svelte-p5

npm trusted publishing can only be configured for a package that already exists on the registry, so the first version is published by hand. After that, `release-please.yml` and `publish.yml` handle every release.

Do this once, as a maintainer of the npm account that owns `svelte-p5`.

1. Start from a clean checkout of `main` at the commit that contains this package.

   ```sh
   git switch main && git pull --ff-only
   pnpm install --frozen-lockfile
   pnpm build
   pnpm --filter create-svelte-p5 test
   ```

2. Check what will ship (expect `bin/`, `src/`, `templates/`, `README.md`, `LICENSE`; templates include `_gitignore`, not `.gitignore`).

   ```sh
   cd packages/create-svelte-p5
   npm pack --dry-run
   ```

3. Publish. Provenance is not available from a local machine, so there is no `--provenance` flag here.

   ```sh
   npm login
   npm publish --access public
   ```

   The published version is `0.1.0`, the number in `package.json` and `.release-please-manifest.json`.

4. Tell release-please that `0.1.0` is released, so its next release PR bumps from there.

   ```sh
   git tag create-v0.1.0 "$(git rev-parse HEAD)"
   git push origin create-v0.1.0
   ```

   Do this before merging any release PR that includes `create-svelte-p5`. A release before step 5 would fail at the publish step with an auth error.

5. On npmjs.com open `create-svelte-p5` > Settings > Trusted Publisher > GitHub Actions and enter the same values as the other packages:

   | Field             | Value         |
   | ----------------- | ------------- |
   | Organization/user | `edw1nzhao`   |
   | Repository        | `svelte-p5`   |
   | Workflow filename | `publish.yml` |
   | Environment       | `npm-publish` |

   Optionally set "Require two-factor authentication and disallow tokens" under Publishing access afterwards, as on the other packages.

6. The first release that release-please cuts after this (`create-v0.2.0` or later) is the proof the trusted publisher works. If its `publish` run fails with an OIDC auth error, recheck the four fields in step 5 against the other packages.

7. Check the first manual publish.

   ```sh
   npm view create-svelte-p5 version
   npm create svelte-p5@latest /tmp/sp5-check -- --yes
   ```
