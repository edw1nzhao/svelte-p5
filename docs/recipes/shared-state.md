# Multiple sketches sharing state

When you have more than one canvas on a page and they need to react to the same controls - or to each other - put state in a reactive class and import it everywhere. This is the foundation of any "dashboard" pattern.

## The pattern

A single class in a `.svelte.ts` file, exported as a singleton:

```ts
// sharedState.svelte.ts
class DashboardState {
	tick = $state(0);
	selectedSpeaker = $state<string | null>(null);
	timelinePosition = $state(0); // 0 to 1
	paused = $state(false);

	#raf = 0;

	constructor() {
		if (typeof window !== 'undefined') {
			const loop = () => {
				if (!this.paused) this.tick += 1;
				this.#raf = window.requestAnimationFrame(loop);
			};
			this.#raf = window.requestAnimationFrame(loop);
		}
	}

	dispose() {
		if (typeof window !== 'undefined') window.cancelAnimationFrame(this.#raf);
	}
}

export const dashboard = new DashboardState();
```

Then any sketch reads from it:

```svelte
<script>
	import { P5Canvas } from 'svelte-p5';
	import { dashboard } from './sharedState.svelte.ts';

	const sketch = (p) => {
		p.setup = () => p.createCanvas(400, 300);
		p.draw = () => {
			p.background(245);
			// All three sketches advance from the same tick.
			const t = dashboard.tick * 0.02;
			p.fill(dashboard.selectedSpeaker === 'A' ? 'tomato' : 'gray');
			p.circle(p.width / 2 + Math.cos(t) * 80, p.height / 2 + Math.sin(t) * 80, 30);
		};
	};
</script>

<P5Canvas {sketch} />
```

And any control mutates it:

```svelte
<script>
	import { dashboard } from './sharedState.svelte.ts';
</script>

<button onclick={() => (dashboard.paused = !dashboard.paused)}>
	{dashboard.paused ? 'Play' : 'Pause'}
</button>

<input type="range" min="0" max="1" step="0.001" bind:value={dashboard.timelinePosition} />
```

## Why a class instead of a plain object

Three things classes give you that plain `$state` objects don't:

1. **Methods.** `dashboard.togglePanel('orbit')` reads better than mutating `panels.orbit` in three places.
2. **Private fields with `#`.** Internal state (the rAF handle, intermediate caches) doesn't leak into the public API.
3. **A constructor.** Animation loops, network subscriptions, anything that needs to run once and once only on app start.

## Why the rAF lives in the state, not in any sketch

In a multi-sketch dashboard, each sketch has its own draw loop. If you tied your animation clock to one sketch's `p.frameCount`, closing that sketch would freeze the others. Putting the rAF on the state keeps the clock independent of any single canvas.

Pause toggles work the same way - `dashboard.paused = true` stops `tick` from advancing, every sketch reading from `tick` freezes in place, no cross-sketch event needed.

## Reading state consistently within a single frame

A subtle issue with reactive proxies: if you read the same field five times during one `p.draw` call, you get the value at five potentially different moments. For most cases this doesn't matter (a few microseconds apart, no UI updates in between). But if you have many derived calculations and want them all consistent, snapshot at the top of `draw`:

```ts
p.draw = () => {
	const tick = dashboard.tick;
	const speaker = dashboard.selectedSpeaker;
	const pos = dashboard.timelinePosition;

	// All downstream calculations use the same values for this frame
	const x = pos * p.width;
	const t = tick * 0.02;
	// ...
};
```

This pattern shows up in larger viz codebases (e.g. transcript-explorer's `DrawContext` class snapshots a dozen store values at the top of every frame). For 1–3 fields, just read them inline.

## Cross-highlighting between sketches

Two canvases, hover on one dims items in the other:

```ts
// sharedState.svelte.ts (additions)
class DashboardState {
	// ...
	hoveredId = $state<string | null>(null);
}
```

```svelte
<!-- Sketch A -->
<script>
	import { dashboard } from './sharedState.svelte.ts';

	const sketch = (p) => {
		p.draw = () => {
			for (const item of itemsA) {
				const dimmed = dashboard.hoveredId !== null && dashboard.hoveredId !== item.id;
				p.fill(dimmed ? 'rgba(0,0,0,0.15)' : item.color);
				p.circle(item.x, item.y, 12);
			}
		};

		p.mouseMoved = () => {
			const hit = itemsA.find((i) => p.dist(p.mouseX, p.mouseY, i.x, i.y) < 12);
			dashboard.hoveredId = hit?.id ?? null;
		};
	};
</script>

<P5Canvas {sketch} />
```

The other sketches read `dashboard.hoveredId` the same way. One source of truth, no event plumbing.

## Disposal

If your state owns a `requestAnimationFrame` loop, make sure you call `dispose()` when the app tears down. For a SvelteKit app, this rarely matters in practice (the page unloads), but it's necessary for testing and HMR cleanliness:

```svelte
<script>
	import { onDestroy } from 'svelte';
	import { dashboard } from './sharedState.svelte.ts';

	onDestroy(() => dashboard.dispose());
</script>
```

## Reference

The dashboard example ([`docs/examples/03-draggable-dashboard`](../examples/03-draggable-dashboard)) is a complete app using this pattern with three sketches, a toolbar, and a `DraggableSketch` layout.
