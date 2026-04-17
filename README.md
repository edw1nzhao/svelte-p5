# svelte-p5

Svelte 5 bindings for p5.js. Low-level primitives if you want control, pre-built components if you want defaults.

**[svelte-p5.dev](https://svelte-p5.dev)** is the docs site, with live demos and full reference.

## Packages

| Package                                         | Version                                                                                                                             | Contents                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`svelte-p5`](./packages/core)                  | [![npm](https://img.shields.io/npm/v/svelte-p5?label=&color=6366f1)](https://www.npmjs.com/package/svelte-p5)                       | `<P5Canvas>`, `createP5Bridge`, a handful of perf utilities                           |
| [`svelte-p5-components`](./packages/components) | [![npm](https://img.shields.io/npm/v/svelte-p5-components?label=&color=6366f1)](https://www.npmjs.com/package/svelte-p5-components) | `<Sketch>`, `<FPSMonitor>`, `<SketchDebug>`, `<DraggableWindow>`, `<DraggableSketch>` |
| [`svelte-p5-viz`](./packages/viz)               | [![npm](https://img.shields.io/npm/v/svelte-p5-viz?label=&color=6366f1)](https://www.npmjs.com/package/svelte-p5-viz)               | `VizPanel` contract, `createPanelRegistry`, `createSceneState`, `SceneConfig` types   |

## What it adds

[`p5-svelte`](https://github.com/tonyketcham/p5-svelte) was the original Svelte wrapper for p5; this library is a Svelte-5-native rebuild with three additions on top of the wrapper itself:

- **Lifecycle teardown.** `<P5Canvas>` calls `instance.remove()` on unmount. If your app mounts/unmounts sketches (route changes, `{#if}` toggles, HMR), this releases each instance instead of leaving it scheduled. The [wrapper comparison](https://svelte-p5.dev/docs/perf-comparison) has the data and explains when this is and isn't a meaningful difference.
- **Reactive state bridge.** `createP5Bridge` returns a `$state` proxy that both Svelte UI and the sketch can read and write directly, so you don't need stores or subscription boilerplate.
- **Pre-built components.** Optional package with auto-resize + HiDPI canvas, FPS overlay, draggable windows, and debug overlays.

Built for Svelte 5 runes and instance-based p5; the API is `bind:instance` instead of event dispatchers.

## Quick starts

```bash
pnpm add svelte-p5 p5
```

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	const sketch = (p: p5) => {
		p.setup = () => p.createCanvas(400, 400);
		p.draw = () => {
			p.background(240);
			p.circle(p.mouseX, p.mouseY, 40);
		};
	};
</script>

<P5Canvas {sketch} />
```

Already using `p5-svelte`? The [migration guide](https://svelte-p5.dev/docs/recipes/migration-from-p5-svelte) is the fastest way over. Otherwise the [getting started guide](https://svelte-p5.dev/docs/getting-started) walks through each layer.

## Documentation

Full docs at **[svelte-p5.dev/docs](https://svelte-p5.dev/docs)**:

- [Getting started](https://svelte-p5.dev/docs/getting-started) - install and use the three layers
- [Three layers](https://svelte-p5.dev/docs/architecture) - primitives, components, composition
- [State bridges](https://svelte-p5.dev/docs/bridges) - when to use `$state`, `createP5Bridge`, or a reactive class
- [Wrapper behavior comparison](https://svelte-p5.dev/docs/perf-comparison) - reproducible benchmark with honest framing on when it matters
- Recipes for [shared state](https://svelte-p5.dev/docs/recipes/shared-state), [interaction](https://svelte-p5.dev/docs/recipes/interaction), [data-driven viz](https://svelte-p5.dev/docs/recipes/data-driven-viz), [cleanup](https://svelte-p5.dev/docs/recipes/cleanup), [performance](https://svelte-p5.dev/docs/recipes/performance), [HiDPI](https://svelte-p5.dev/docs/recipes/hidpi), and [migration](https://svelte-p5.dev/docs/recipes/migration-from-p5-svelte)

The same markdown also lives in [`docs/`](./docs) for browsing on GitHub.

## Runnable examples

Three apps in `docs/examples/`, ordered by increasing scope:

- [`01-basic`](./docs/examples/01-basic) - `<P5Canvas>` and a sketch, nothing else
- [`02-store-bridge`](./docs/examples/02-store-bridge) - UI sliders drive a particle field through `createP5Bridge`
- [`03-draggable-dashboard`](./docs/examples/03-draggable-dashboard) - three floating sketches sharing one reactive class

```bash
pnpm --filter @svelte-p5-example/01-basic dev
pnpm --filter @svelte-p5-example/02-store-bridge dev
pnpm --filter @svelte-p5-example/03-draggable-dashboard dev
```

## Development

[mise](https://mise.jdx.dev/) pins node 24, pnpm 10, and bun. If you prefer not to install mise, `nvm use` + `corepack enable pnpm` works (reads `.nvmrc`).

```bash
mise install
pnpm install
pnpm build         # both packages
pnpm typecheck     # workspace-wide
pnpm lint          # prettier + eslint
pnpm test          # vitest
```

The site lives in [`site/`](./site) and the perf benchmark in [`bench/`](./bench).

## Releases

Two channels off `main`:

- **Stable** — `pnpm add svelte-p5`. Automated via [release-please](https://github.com/googleapis/release-please-action) with a monorepo manifest. Merging a conventional-commit (`feat:`, `fix:`, `feat!:`) to `main` maintains a release PR per package; merging that PR publishes to npm.
- **Canary preview** — every PR and every push to `main` publishes per-commit preview builds via [pkg-pr-new](https://pkg.pr.new/). Install any commit directly:

  ```bash
  pnpm add https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@<sha-or-main>
  ```

  Handy for testing a fix before the stable release lands. Full details in [`docs/releasing.md`](./docs/releasing.md#canary-preview-builds).

## Roadmap

- 0.2 - dockable panel variant (via dockview), broader test coverage
- 0.3 - CSS Grid layout helper for multi-viz dashboards
- 0.4 - neodrag 3 stable, bun workspace evaluation
- 1.0 - p5.js 2.0 support, API freeze

## License

MIT © Edwin Zhao
