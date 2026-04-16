# svelte-p5-components

Higher-level Svelte 5 components built on [`svelte-p5`](../core). The pieces that almost every sketch-driven app ends up writing.

## Install

```bash
pnpm add svelte-p5 svelte-p5-components p5
```

## `<Sketch>`

`<P5Canvas>` plus a `ResizeObserver` on the parent element and automatic `pixelDensity(devicePixelRatio)`. The default you probably want.

```svelte
<script lang="ts">
	import { Sketch } from 'svelte-p5-components';
	import type p5 from 'p5';

	const sketch = (p: p5) => {
		p.setup = () => p.createCanvas(p.windowWidth, p.windowHeight);
		p.draw = () => {
			p.background(240);
			p.circle(p.mouseX, p.mouseY, 40);
		};
	};
</script>

<div style="width: 100%; height: 400px;">
	<Sketch {sketch} />
</div>
```

## `<FPSMonitor>`

Absolute-positioned FPS readout. Takes the p5 instance and samples `p.frameRate()` every 30 frames by default.

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import { FPSMonitor } from 'svelte-p5-components';
	import type p5 from 'p5';

	let instance = $state<p5 | null>(null);
</script>

<div style="position: relative;">
	<P5Canvas {sketch} bind:instance />
	<FPSMonitor {instance} position="top-right" />
</div>
```

## `<SketchDebug>`

Development overlay with mouse position, canvas size, frame count, delta time, and FPS. Same rAF-driven pattern as `<FPSMonitor>`.

## `<DraggableWindow>`

A floating, draggable, resizable panel powered by [neodrag](https://neodrag.dev/). Covers the floating-palette pattern: inspectors, info panels, notes, anything you'd otherwise build on top of a bare drag library.

What it handles for you:

- Drag-by-title-bar only, so buttons in the header stay clickable.
- Focus to front on click. Every `<DraggableWindow>` on the page shares a z-index manager; clicking raises.
- Clamps back into view on drag end and on window resize. `minVisible` (default 60px) guarantees a reachable grab handle.
- Passes extra neodrag plugins through, so you can add grid snapping, axis locks, thresholds without forking the component.

```svelte
<script lang="ts">
	import { DraggableWindow } from 'svelte-p5-components';
	import { grid, axis } from '@neodrag/svelte';

	let showInspector = $state(true);
</script>

{#if showInspector}
	<DraggableWindow
		title="Inspector"
		initialX={40}
		initialY={80}
		width={320}
		height={240}
		plugins={[grid([20, 20]), axis('x')]}
		onClose={() => (showInspector = false)}
	>
		<p>Snaps to a 20px grid, slides horizontally only.</p>
	</DraggableWindow>
{/if}
```

## `<DraggableSketch>`

`<DraggableWindow>` with a `<Sketch>` inside. One line for a floating, draggable, resizable p5 sketch. This is the primitive for multi-window visualization suites.

```svelte
<DraggableSketch
	title="Speaker Garden"
	{sketch}
	initialX={80}
	initialY={80}
	width={420}
	height={320}
/>
```

Same `plugins` escape hatch as `<DraggableWindow>`.

## License

MIT
