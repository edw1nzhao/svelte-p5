# Getting started

This library has two packages and three layers. Start with whichever layer fits your need.

## Install

```bash
pnpm add svelte-p5 p5
# optional, for pre-built higher-level components:
pnpm add svelte-p5-components
```

You'll need **Svelte 5** and **Node 22+** (24 recommended). Works in SvelteKit SSR out of the box - `p5` is dynamically imported on the client by the wrapper, so you don't need `{#if browser}` guards.

Coming from `p5-svelte`? See the [migration guide](./recipes/migration-from-p5-svelte.md) first.

## Layer 1 - just the wrapper

If you already know p5 and just want a correct-lifecycle Svelte wrapper:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	const sketch = (p: p5) => {
		p.setup = () => p.createCanvas(600, 400);
		p.draw = () => {
			p.background(240);
			p.circle(p.mouseX, p.mouseY, 40);
		};
	};
</script>

<P5Canvas {sketch} />
```

That's it. The wrapper mounts p5 in instance mode, hands it your sketch, and cleans up with `instance.remove()` on unmount.

Need the p5 instance from outside the sketch? Use `bind:instance`:

```svelte
<script lang="ts">
	import type p5 from 'p5';
	let instance = $state<p5 | null>(null);
</script>

<P5Canvas {sketch} bind:instance />
<button onclick={() => instance?.redraw()}>Force redraw</button>
```

## Layer 2 - reactive state bridge

When Svelte UI needs to drive sketch state (or vice-versa), skip the subscription boilerplate:

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	const bridge = createP5Bridge({ radius: 40, color: '#336699' });

	const sketch = (p: p5) => {
		p.setup = () => p.createCanvas(400, 400);
		p.draw = () => {
			p.background(240);
			p.fill(bridge.state.color);
			p.circle(p.mouseX, p.mouseY, bridge.state.radius);
		};
	};
</script>

<P5Canvas {sketch} />
<input type="range" min="10" max="200" bind:value={bridge.state.radius} />
<input type="color" bind:value={bridge.state.color} />
```

`bridge.state` is a `$state` proxy. Both the Svelte UI and the sketch mutate it directly; the sketch reads live values every frame.

Could you just close over a plain `$state` variable and skip the bridge? Yes - and for single-value cases that's usually cleanest. Reach for `createP5Bridge` when you have 3+ related fields you want to group, or when you want to pass a single `bridge` object between modules without threading individual state through.

For module-scope shared state across many sketches and components, use a **reactive class** in a `.svelte.ts` file:

```ts
// sharedState.svelte.ts
class DashboardState {
	hue = $state(200);
	density = $state(1);
}
export const dashboard = new DashboardState();
```

Import it anywhere. Writes from anywhere propagate to readers. See `docs/examples/03-draggable-dashboard/` for the full pattern.

## Layer 3 - pre-built components

When you want the 80% case solved:

```svelte
<script lang="ts">
	import { Sketch, FPSMonitor, DraggableSketch } from 'svelte-p5-components';
	import type p5 from 'p5';

	let instance = $state<p5 | null>(null);
</script>

<!-- A canvas that fills and tracks its parent, with HiDPI applied -->
<div style="width: 100%; height: 400px; position: relative;">
	<Sketch {sketch} bind:instance />
	<FPSMonitor {instance} />
</div>

<!-- Or drop a floating, draggable, resizable sketch -->
<DraggableSketch title="Orbit" {sketch} initialX={40} initialY={80} width={480} height={360} />
```

Each of these is a thin Svelte 5 component built on Layer 1 + Layer 2. Read their source - they're short.

## Performance - two lines to call before your first sketch

```ts
import { disableFES } from 'svelte-p5';
disableFES();
```

And **do not use `p.loadFont()`** with a variable font unless you absolutely need it. See [recipes/performance.md](./recipes/performance.md).
