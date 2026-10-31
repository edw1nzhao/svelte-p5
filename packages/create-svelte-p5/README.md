# create-svelte-p5

Scaffold a SvelteKit + [svelte-p5](https://github.com/edw1nzhao/svelte-p5) project.

```sh
npm create svelte-p5@latest
```

```sh
pnpm create svelte-p5
yarn create svelte-p5
bun create svelte-p5
```

It asks for a project name and a template. Both can be passed instead, which skips the prompts:

```sh
npm create svelte-p5@latest my-sketch -- --template components
```

## Options

| Flag                          | Meaning                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `[directory]`                 | Where to create the project; its basename is the package name. `.` uses the current directory. |
| `-t, --template <name>`       | `minimal` or `components`.                                                                     |
| `-f, --force`                 | Scaffold into a directory that is not empty.                                                   |
| `-y, --yes`                   | Accept defaults (`svelte-p5-app`, `minimal`) and never prompt.                                 |
| `-h, --help`, `-v, --version` |                                                                                                |

Without a TTY the prompts are skipped and the defaults apply. The printed next steps use the package manager that launched the command.

## Templates

Each template is a complete SvelteKit app (TypeScript, Svelte 5 runes, p5 2.x) and opens in StackBlitz without installing anything.

| Template     | Contents                                                          | StackBlitz                                                                                                         |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `minimal`    | `P5Canvas` and one sketch                                         | [Open](https://stackblitz.com/github/edw1nzhao/svelte-p5/tree/main/packages/create-svelte-p5/templates/minimal)    |
| `components` | `Sketch`, `FPSMonitor` and sliders wired in with `createP5Bridge` | [Open](https://stackblitz.com/github/edw1nzhao/svelte-p5/tree/main/packages/create-svelte-p5/templates/components) |

## Development

```sh
pnpm --filter create-svelte-p5 test              # unit tests, including template version sync
pnpm --filter create-svelte-p5 test:integration  # scaffold, install, svelte-check and build both templates
```

The integration test packs the local `svelte-p5` and `svelte-p5-components` (build them first with `pnpm build`) and installs those tarballs into the scaffolded projects. The unit tests fail when a template's dependency ranges drift from the workspace packages or the shared catalog.

Maintainers: `FIRST_PUBLISH.md` covers the one-time manual publish.
