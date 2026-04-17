# svelte-p5-viz

> Visualization panel contract, registry, and scene-config types for [`svelte-p5`](../core). The load-bearing abstraction for composing canvas-based dashboards — by hand, or eventually through a no-code studio.

```bash
pnpm add svelte-p5-viz svelte-p5 p5
```

To test an unreleased commit, install the preview build from [pkg.pr.new](https://pkg.pr.new/):

```bash
pnpm add \
  https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5-viz@main \
  https://pkg.pr.new/edw1nzhao/svelte-p5/svelte-p5@main
```

## What this is

A set of TypeScript types and tiny runtime helpers that let multiple visualizations share one canvas, coordinate hover state, and serialize to JSON. It is deliberately thin: no actual visualization code ships in this package. Visualizations live in your app (or eventually in a separate viz-pack) and implement the contract below.

```ts
import type { VizPanel } from 'svelte-p5-viz';

interface WordCloudData {
	words: { text: string; weight: number }[];
}
interface WordCloudConfig {
	minFontSize: number;
	maxFontSize: number;
}

export const WordCloudPanel: VizPanel<WordCloudData, WordCloudConfig> = {
	type: 'word-cloud',
	defaultConfig: { minFontSize: 10, maxFontSize: 48 },
	render(ctx, data, config) {
		const { sk, bounds, mouse, highlights } = ctx;
		// …draw into sk within bounds…
		return { hover: null };
	}
};
```

A scene mounts N panels into a canvas, reads hover from each, surfaces tooltips and cross-highlighting through shared chrome. Because panels share a contract, chrome doesn't care which panel type is in any given slot.

## The contract

```
┌─────────────────────────────────────────────────────────────┐
│  Scene runner  (your app, or a future studio runtime)       │
│  ────────────                                               │
│  Reads SceneConfig → resolves types via PanelRegistry →     │
│  renders each panel into its Bounds → funnels hover into    │
│  a shared SceneState → exposes hover to other panels via    │
│  PanelContext.highlights                                    │
└──────────────┬──────────────────────────────────────────────┘
               │ VizPanel.render(ctx, data, config)
               ▼
┌─────────────────────────────────────────────────────────────┐
│  Your panel implementations                                 │
│  Pure functions of (data, config, ctx) → PanelResult        │
└─────────────────────────────────────────────────────────────┘
```

The four types that matter:

- **`VizPanel<TData, TConfig>`** — the renderer. `type`, `defaultConfig`, and a `render(ctx, data, config)` method.
- **`PanelContext`** — what the renderer receives: live `sk` instance, `bounds` rect, optional `mouse` position, and `highlights` from sibling panels.
- **`PanelResult`** — what the renderer returns: at minimum a `hover: PanelHit | null`. Optional `overflow: boolean`.
- **`PanelHit`** — `{ id, meta? }`. Two panels agreeing on the same `id` shape is how cross-highlighting works — no event bus required.

## Scenes

A `SceneConfig` is JSON-serializable. Today, you hand-write one and hand it to your app's scene runner. Tomorrow, a studio app will read and write them.

```ts
import type { SceneConfig } from 'svelte-p5-viz';

const scene: SceneConfig = {
	version: 1,
	name: 'Speaker overview',
	panels: [
		{ id: 'cloud', type: 'word-cloud' },
		{ id: 'timeline', type: 'timeline-track' }
	],
	layout: {
		kind: 'split',
		orientation: 'vertical',
		position: 70,
		first: 'cloud',
		second: 'timeline'
	}
};
```

Layouts cover the three shapes every multi-panel canvas app ends up reinventing:

- `{ kind: 'single', panel }` — full-bleed.
- `{ kind: 'split', orientation, position, first, second }` — two-up with a divider.
- `{ kind: 'grid', columns, gap, padding, panels }` — N-up grid.

That's intentionally sparse. Arbitrary dock trees (tabs, nested splits, floating windows) are out of scope — for those use [`dockview`](https://dockview.dev/) or similar. Chrome for each of the three layouts lives in [`svelte-p5-components`](../components).

## Registry

```ts
import { createPanelRegistry } from 'svelte-p5-viz';

export const registry = createPanelRegistry();
registry.register(WordCloudPanel);
registry.register(TimelineTrackPanel);
// registry.get('word-cloud')  → WordCloudPanel
// registry.list()              → all of them
```

Use a single registry per scene runner. The runner's job is to look up each `PanelInstance.type`, instantiate it with merged config, and call `render(ctx, data, config)` inside the p5 draw loop.

## Shared state

Chrome that wants cross-panel hover / highlighting creates one `SceneState` per scene and threads it through `PanelContext`:

```ts
import { createSceneState } from 'svelte-p5-viz';

const scene = createSceneState();
// scene.hover       — current PanelHit across all panels
// scene.highlights  — ids other panels should emphasize
```

Scene state is a Svelte 5 `$state` proxy — mutate it directly, Svelte handles reactivity.

## What this package deliberately doesn't ship

- **Any panel implementations.** Those belong in app code or a future `svelte-p5-viz-pack`.
- **A scene runner.** One sample runner lives in [`svelte-p5-components`](../components/) as `<SceneRenderer>`; you can also write your own in ~30 lines.
- **Runtime schema validation.** `VizPanel.schema` is typed as `unknown` so you can plug zod/valibot/arktype (or none). Validation is a studio concern, not a runtime one.
- **Persistence.** Serializing a `SceneConfig` is `JSON.stringify`; loading is `JSON.parse`. That's the whole API.

## Versioning

`0.x` is unstable. Breaking changes bump the minor and are called out with `BREAKING CHANGE:` in the commit. The `version` field on `SceneConfig` will bump when the format itself changes, with a documented migration path.
