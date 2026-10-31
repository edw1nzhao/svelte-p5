# On-demand rendering

p5 calls `draw()` on every animation frame, about 60 times a second, whether or not anything changed. For a chart, a diagram or a parameter-driven still image that burns CPU and battery for nothing. The `loop` prop on `<P5Canvas>` and `<Sketch>` stops the loop and redraws only when something changes, the pattern Threlte calls on-demand rendering.

Needs `svelte-p5` 1.2 or later.

## Modes

| `loop`               | `draw()` runs                                                                      |
| -------------------- | ---------------------------------------------------------------------------------- |
| `'always'` (default) | every frame, as p5 does by itself. Nothing changes from earlier releases.          |
| `'demand'`           | once after setup, then once per change to `bridge` state, resize or `invalidate()` |
| `'manual'`           | once after setup, then once per `invalidate()` or resize                           |

Both non-default modes call `noLoop()` after `setup()` has finished. Switching the prop back to `'always'` calls `loop()`. In `'always'` the wrapper never touches the loop, so a sketch that calls `noLoop()` in its own `setup()` keeps working.

## Redraw when bridge state changes

Pass the bridges your sketch reads as `bridge`. In `'demand'` mode the canvas tracks every field of their state, nested objects and arrays included, and redraws after any change:

```svelte
<script lang="ts">
	import { createP5Bridge, type SketchFn } from 'svelte-p5';
	import { Sketch } from 'svelte-p5-components';

	const bridge = createP5Bridge({ radius: 80, hue: 200 });

	const sketch: SketchFn = (p) => {
		p.setup = () => {
			p.colorMode(p.HSB);
		};
		p.draw = () => {
			p.background(0, 0, 96);
			p.fill(bridge.state.hue, 70, 90);
			p.circle(p.width / 2, p.height / 2, bridge.state.radius * 2);
		};
	};
</script>

<div style="height: 320px">
	<Sketch {sketch} loop="demand" {bridge} />
</div>
<input type="range" min="10" max="150" bind:value={bridge.state.radius} />
<input type="range" min="0" max="360" bind:value={bridge.state.hue} />
```

Dragging a slider fires many input events per frame; they collapse into one `draw()` on the next animation frame. Pass an array to track several bridges: `bridge={[style, data]}`.

The bridge is declared explicitly rather than detected from what `draw()` reads. Tracking reads inside `draw()` would mean running p5's frame inside a Svelte effect, which the library rule "p5 draws pixels, Svelte owns UI and state" rules out. Tracking walks the whole state on each change, so for a bridge holding a large data array, keep the array out of the bridge and call `invalidate()` when you replace it.

## Redraw from anywhere with `invalidate`

`invalidate(instance)` asks for one redraw on the next animation frame. Calls within the same frame coalesce into one `draw()`. It does nothing while the sketch is looping, so it is safe to call in every mode.

<!-- snippet: declare const data = stub<{ points: number[] }>(); -->

```svelte
<script lang="ts">
	import { invalidate, P5Canvas, type SketchFn } from 'svelte-p5';
	import type p5 from 'p5';

	let instance = $state<p5 | null>(null);
	let points = data.points;

	const sketch: SketchFn = (p) => {
		p.setup = () => {
			p.createCanvas(400, 200);
		};
		p.draw = () => {
			p.background(250);
			points.forEach((y, x) => p.point(x * 4, y));
		};
		p.mousePressed = () => {
			points = [...points, p.mouseY];
			invalidate(p);
		};
	};

	async function reload() {
		points = await (await fetch('/points.json')).json();
		invalidate(instance);
	}
</script>

<P5Canvas {sketch} loop="manual" bind:instance />
<button onclick={reload}>Reload</button>
```

p5's own input handlers (`mousePressed`, `keyPressed` and so on) still fire while the loop is stopped, so call `invalidate(p)` from them when they change what is drawn. Components inside the canvas can use [`getSketchContext().invalidate()`](./sketch-context.md) without needing the instance.

Under the hood `invalidate` schedules `redraw()` with `requestAnimationFrame`. It waits until p5 has finished `setup()`, because `redraw()` before then is silently dropped by p5. On p5 2, where `redraw()` is `async`, an invalidation that arrives while a redraw is still running queues exactly one more.

## Resizing

p5's `resizeCanvas()` already calls `redraw()` on both p5 1.11 and 2.x, so `<Sketch>`'s container tracking repaints in every mode with no extra work. Rebuild size-dependent state in `onResize`, as the [WEBGL recipe](./recipes/webgl.md) describes.

## What it saves

Measured in the repo's Playwright harness, headless Chromium, a sketch that draws one circle, over idle periods with no input:

| mode       | `draw()` calls in 1 s idle | main-thread task time in 5 s idle |
| ---------- | -------------------------- | --------------------------------- |
| `'always'` | 61                         | 155 ms                            |
| `'demand'` | 0                          | 4 ms                              |

The e2e suite asserts 0 idle frames for `'demand'` and exactly one `draw()` per bridge change, coalesced bursts and `invalidate()` calls, on p5 1.11 and 2.x. The saving grows with the cost of your `draw()`.

## When to use which

- `'always'`: animation, physics, anything time-based, or sketches that read `millis()` or `frameCount` to move.
- `'demand'`: charts, diagrams and generative stills whose input is Svelte state. This is the common case for dashboards.
- `'manual'`: you decide exactly when to paint, for example after a data fetch, or when a sketch is driven by a timeline you step yourself.

A sketch that is mostly static but sometimes animates (a transition, playback) can stay in `'demand'` and call `p.loop()` and `p.noLoop()` itself around the animation; `invalidate()` does nothing while it loops. See also the hand-rolled version in [data-driven visualizations](./recipes/data-driven-viz.md).

`FPSMonitor` reports p5's `frameRate()`, which is only updated by frames p5 schedules itself, so it shows a stale number in the non-default modes.
