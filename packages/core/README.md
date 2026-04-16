# svelte-p5

Svelte 5 bindings for p5.js. This package is the primitive layer: a canvas wrapper, a state bridge, and four small performance helpers. If you want the opinionated higher-level pieces (auto-resize, FPS readout, draggable windows), install [`svelte-p5-components`](../components) as well.

## Install

```bash
pnpm add svelte-p5 p5
```

## `<P5Canvas>`

Mounts a p5 sketch in instance mode, cleans it up on unmount.

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

The p5 instance is exposed as a bindable prop. Bind it when you need to call into the sketch from Svelte:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	let instance = $state<p5 | null>(null);
</script>

<P5Canvas {sketch} bind:instance />
<button onclick={() => instance?.redraw()}>Redraw</button>
```

`instance` is `null` before mount and after unmount, so guard with `?.`.

## `createP5Bridge`

A reactive object you can read and write from both sides. No subscriptions, no manual sync.

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

`bridge.state` is a `$state` proxy. Mutations on either side take effect on the next frame.

For one or two fields you could just as well close over a plain `$state` variable. Reach for `createP5Bridge` when the state becomes a small struct you want to pass around as a single object.

## Performance utilities

Exported from the main entry (and from `./utils` for explicit imports):

```ts
import { disableFES, createColorCache, createFontAtlas, hitTest } from 'svelte-p5';

disableFES(); // call once, before creating any p5 instance
hitTest.rect(mouseX, mouseY, x, y, w, h);
```

What each does and when to reach for it lives in the [performance recipe](../../docs/recipes/performance.md).

## Type exports

```ts
import type { SketchFn, P5CanvasProps, P5Bridge } from 'svelte-p5';
```

`SketchFn` is `(p: p5) => void`. `SketchFn`, not `Sketch`, because the components package exports a `<Sketch>` component and the collision would force aliased imports.

## License

MIT
