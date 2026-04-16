# svelte-p5

Svelte 5 bindings for p5.js. Low-level primitives if you want control, pre-built components if you want defaults.

## Packages

| Package                                         | Version | Contents                                                                              |
| ----------------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| [`svelte-p5`](./packages/core)                  | 0.1.0   | `<P5Canvas>`, `createP5Bridge`, a handful of perf utilities                           |
| [`svelte-p5-components`](./packages/components) | 0.1.0   | `<Sketch>`, `<FPSMonitor>`, `<SketchDebug>`, `<DraggableWindow>`, `<DraggableSketch>` |

## Why this exists

`p5-svelte` hasn't seen a commit since 2022, was written for Svelte 3, and never calls `instance.remove()` when its component unmounts. That last part is the reason for this library: toggling a sketch on and off with `{#if}`, switching routes in SvelteKit, or just editing a file in dev leaves ghost canvases behind that keep running `requestAnimationFrame` forever.

`<P5Canvas>` fixes that, runs on Svelte 5 runes, and exposes the p5 instance through a bindable prop instead of event dispatchers. Everything else in the library is built on top.

## Quick start

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

Already using `p5-svelte`? The [migration guide](./docs/recipes/migration-from-p5-svelte.md) is the fastest way over. Otherwise [docs/getting-started.md](./docs/getting-started.md) walks through each layer.

## Examples

Three runnable apps in `docs/examples/`, ordered by increasing scope:

- [`01-basic`](./docs/examples/01-basic) — `<P5Canvas>` and a sketch, nothing else
- [`02-store-bridge`](./docs/examples/02-store-bridge) — UI sliders drive a particle field through `createP5Bridge`
- [`03-draggable-dashboard`](./docs/examples/03-draggable-dashboard) — three floating sketches sharing one reactive class

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

## Releases

Automated via [release-please](https://github.com/googleapis/release-please-action) with a monorepo manifest. Merging a conventional-commit (`feat:`, `fix:`, `feat!:`) to `main` maintains a release PR per package; merging that PR publishes to npm.

## Roadmap

- 0.2 — dockable panel variant (via dockview), broader test coverage
- 0.3 — CSS Grid layout helper for multi-viz dashboards
- 0.4 — neodrag 3 stable, bun workspace evaluation
- 1.0 — p5.js 2.0 support, API freeze

## License

MIT © Edwin Zhao
