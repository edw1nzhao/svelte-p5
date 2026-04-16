# State bridges and reactivity

The single hardest decision when wrapping p5 in a reactive framework is _where state lives_. p5's draw loop reads variables on every frame; Svelte wants its UI driven by reactive primitives. When the two have to meet, you have three options. Pick whichever is smallest for the job.

## The decision tree

| Situation                                                   | Use                                   |
| ----------------------------------------------------------- | ------------------------------------- |
| Single value, used only inside one component                | Plain `$state` variable               |
| 3+ related fields, still scoped to one component            | `createP5Bridge({ ... })`             |
| State shared across multiple sketches, components, or files | Reactive class in a `.svelte.ts` file |

There's no "always right" answer. The smallest tool that fits the situation is the right one. Reaching for a reactive class for one slider is overkill; a bare `$state` variable for a 12-field dashboard becomes painful as it grows.

## Option 1 - plain `$state`

When you have one value (or two) and a single component owns it, just close over a `$state` variable:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	let radius = $state(40);

	const sketch = (p: p5) => {
		p.setup = () => p.createCanvas(400, 400);
		p.draw = () => {
			p.background(240);
			p.circle(p.mouseX, p.mouseY, radius);
		};
	};
</script>

<P5Canvas {sketch} />
<input type="range" bind:value={radius} min="10" max="200" />
```

The sketch closure captures `radius`. Every `p.draw` reads its current value. No subscription, no effect, no proxy - Svelte's runes already give you live values.

**When this is enough**: single value, single component, you don't need to share it.

## Option 2 - `createP5Bridge({ ... })`

When you have several related fields you want to group, `createP5Bridge` returns an object with a `state` proxy. It's a thin wrapper around `$state` whose only job is to give you a single object you can pass around as one prop instead of threading every field individually:

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	const bridge = createP5Bridge({
		radius: 40,
		hue: 200,
		speed: 2
	});

	const sketch = (p: p5) => {
		p.setup = () => p.createCanvas(400, 300);
		p.draw = () => {
			p.background(0, 0, 100);
			p.fill(bridge.state.hue, 70, 90);
			p.circle(p.mouseX, p.mouseY, bridge.state.radius);
		};
	};
</script>

<P5Canvas {sketch} />
<input type="range" bind:value={bridge.state.radius} />
<input type="range" bind:value={bridge.state.hue} min="0" max="360" />
<input type="range" bind:value={bridge.state.speed} min="0.5" max="6" step="0.1" />
```

Internally, `createP5Bridge` is approximately:

```ts
export function createP5Bridge<T extends object>(initial: T) {
	const state = $state<T>(initial);
	return { state };
}
```

That's it. The value-add isn't reactivity (which `$state` already provides) - it's _grouping_ and a stable reference you can hand off:

```svelte
<P5Canvas {sketch} />
<ControlPanel {bridge} />
<DebugReadout {bridge} />
```

vs. threading three or seven props through every consumer.

**When to reach for it**: ≥3 related fields, all owned by one component, that you want to group as a single object.

## Option 3 - reactive class in a `.svelte.ts` file

When the state is shared - multiple sketches, multiple components, maybe an animation tick driving everything - put it in a class with `$state` fields and import it everywhere:

```ts
// sharedState.svelte.ts
class DashboardState {
	tick = $state(0);
	hue = $state(200);
	density = $state(1);
	paused = $state(false);

	panels = $state({
		orbit: true,
		grid: true,
		noise: true
	});

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

	togglePanel(key: keyof DashboardState['panels']) {
		this.panels[key] = !this.panels[key];
	}

	dispose() {
		if (typeof window !== 'undefined') window.cancelAnimationFrame(this.#raf);
	}
}

export const dashboard = new DashboardState();
```

Anywhere you import `dashboard`, mutations propagate. A toolbar mutates `dashboard.hue`, three sketches read it on the next frame:

```svelte
<script>
	import { dashboard } from './sharedState.svelte.ts';
	import { P5Canvas } from 'svelte-p5';

	const sketch = (p) => {
		p.draw = () => {
			p.background(dashboard.hue, 30, 100);
			// `tick` is the master clock - never use p.frameCount here
			const t = dashboard.tick * 0.01;
			// ...
		};
	};
</script>

<P5Canvas {sketch} />
```

Three reasons this pattern beats per-component state for dashboards:

1. **Cross-sketch synchronization for free.** All sketches read from the same `tick`. Toggle `paused` and they all freeze together. No event bus.
2. **The owner of the animation loop survives any individual sketch closing.** If a panel unmounts, the others keep ticking from where they were.
3. **Methods and private fields.** `togglePanel`, `dispose`, the `#raf` handle - these don't fit naturally on a `$state` proxy.

The dashboard example ([`docs/examples/03-draggable-dashboard`](./examples/03-draggable-dashboard)) is the reference for this pattern.

## Common confusion: do I need an effect to push state into p5?

No. p5's draw runs every frame and reads from your closure. Svelte's `$state` always returns the current value when you read it. So as long as the sketch closure captures a `$state` variable (or a bridge / class), every frame sees the latest value.

You only need `$effect` if something has to happen _at the moment_ a value changes (e.g. force a redraw on a non-looping sketch):

```svelte
<script>
	let instance = $state<p5 | null>(null);
	const bridge = createP5Bridge({ snapshot: 0 });

	$effect(() => {
		// Re-render when snapshot changes, even if the loop is stopped
		bridge.state.snapshot;
		instance?.redraw();
	});
</script>

<P5Canvas {sketch} bind:instance />
```

For looping sketches (`p.draw` running every frame), you don't need this.

## What about Svelte stores?

Svelte 5 runes replace `writable()` for almost every case. If you're starting fresh, use `$state` (or one of the patterns above). If you're migrating from Svelte 3/4 code with stores: replace `$store` with a reactive class field. The [migration guide](./recipes/migration-from-p5-svelte.md) shows the pattern.

## Read-only state passing _from_ p5 _to_ Svelte

Bridges aren't one-way. The sketch can write to the same `$state`:

```svelte
<script lang="ts">
	import { createP5Bridge, P5Canvas } from 'svelte-p5';

	const bridge = createP5Bridge({ fps: 0, mouseX: 0, mouseY: 0 });

	const sketch = (p) => {
		p.draw = () => {
			bridge.state.fps = Math.round(p.frameRate());
			bridge.state.mouseX = p.mouseX;
			bridge.state.mouseY = p.mouseY;
			// ...drawing
		};
	};
</script>

<P5Canvas {sketch} />
<p>fps: {bridge.state.fps} - at ({bridge.state.mouseX}, {bridge.state.mouseY})</p>
```

Be aware that writing to `$state` every frame triggers a Svelte update every frame. For high-frequency telemetry, throttle inside the sketch (write every Nth frame) or use a bare `let` and only commit at the end of an interaction.
