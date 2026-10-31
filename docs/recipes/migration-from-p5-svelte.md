# Migrating from `p5-svelte`

[`p5-svelte`](https://github.com/tonyketcham/p5-svelte) was last released as 3.1.2 in 2022 and peers on `p5 ^1.4.0`. The port to `svelte-p5` is usually ten minutes per component, because your sketch code does not change.

## Why move

- **Maintained.** `p5-svelte` has had no release since 2022; open issues such as the [`package.json` `svelte` field](https://github.com/tonyketcham/p5-svelte/issues/371) and the [missing `exports` condition](https://github.com/tonyketcham/p5-svelte/pull/370) sit unfixed. This repo ships through release-please and CI against both p5 majors.
- **Svelte 5.** Runes, `$bindable`, `bind:instance` instead of an event dispatcher.
- **p5 2 support.** `peerDependencies` allow `p5 >=1.11.0 <3`. Async `setup()` works, and `onReady` fires after it on p5 1 and 2 alike. See [p5 1 to 2 pitfalls](../p5-2-pitfalls.md).
- **Cleanup on unmount.** `p5-svelte` never calls `instance.remove()`, which is the cause of [p5-svelte#322](https://github.com/tonyketcham/p5-svelte/issues/322) (canvases accumulating when you leave and re-enter a page). `<P5Canvas>` removes the instance in its `onMount` teardown. See the [cleanup recipe](./cleanup.md) and the [wrapper comparison](../perf-comparison.md) for numbers.
- **Optional layer on top.** Auto-resize, FPS, timelines and draggable windows live in `svelte-p5-components`.

## Checklist

1. Replace the package: `pnpm remove p5-svelte && pnpm add svelte-p5`.
2. Replace `import P5 from 'p5-svelte'` with `import { P5Canvas } from 'svelte-p5'` and `<P5 ...>` with `<P5Canvas ...>`.
3. Replace `on:instance` with `bind:instance`, and `on:ref` or `target` with a wrapper element.
4. Give the container a size. The default `style` is `display: block; width: 100%; height: 100%;`, and passing your own `style` replaces it.
5. Replace `preload` with an async `setup` if you moved to p5 2. On p5 1.11 `preload` still works.
6. Replace `import type { Sketch } from 'p5-svelte'` with `import type { SketchFn } from 'svelte-p5'`, or type the sketch as `(p: p5) => void`.
7. Drop `debug`, and any reads of `window._p5Instance`.
8. Replace writable-store mirrors with `createP5Bridge`.
9. Check add-ons: they need the [add-on recipe](./loading-addons.md).

## Install

```bash
pnpm remove p5-svelte
pnpm add svelte-p5
# optional:
pnpm add svelte-p5-components
```

## API mapping

| `p5-svelte`                                  | `svelte-p5`                                                    | Notes                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `import P5 from 'p5-svelte'`                 | `import { P5Canvas } from 'svelte-p5'`                         | Named export.                                                                          |
| `<P5 {sketch} />`                            | `<P5Canvas {sketch} />`                                        | Same shape.                                                                            |
| `on:instance={(e) => (inst = e.detail)}`     | `bind:instance={inst}`                                         | `null` before mount and after unmount.                                                 |
| (no equivalent)                              | `onReady={(p) => ...}`                                         | Runs once after `setup()` has finished, awaited if async.                              |
| `on:ref` / `target`                          | `bind:this` on your own wrapper element                        | `P5Canvas` renders its own `div`; size and position it from the outside.               |
| `parentDivStyle` (default `display: block;`) | `style` (default `display: block; width: 100%; height: 100%;`) | `class` is also accepted.                                                              |
| `debug`                                      | removed                                                        | It only logged the instance and the p5 module's exports.                               |
| `import type { Sketch } from 'p5-svelte'`    | `import type { SketchFn } from 'svelte-p5'`                    | `SketchFn<Ext>` also types members your sketch adds to the instance.                   |
| `window._p5Instance`                         | `bind:instance`                                                | The global was a side effect of the wrapper.                                           |
| p5 module exports copied onto the instance   | `p.constructor.Vector`, `p.createVector()`                     | `p5-svelte` copied the module's named exports onto the instance; `svelte-p5` does not. |
| writable store plus `subscribe` mirror       | `createP5Bridge({ ... })`                                      | See [state](#state-replacing-manual-subscription).                                     |

## Minimal port

Before:

<!-- snippet: skip (old p5-svelte API, which is not a dependency here) -->

```svelte
<script>
	import P5 from 'p5-svelte';

	let p5Instance;

	const sketch = (p5) => {
		p5.setup = () => {
			p5.createCanvas(400, 400);
		};
		p5.draw = () => {
			p5.background(240);
			p5.circle(p5.mouseX, p5.mouseY, 40);
		};
	};
</script>

<P5 {sketch} on:instance={(e) => (p5Instance = e.detail)} />
```

After:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	let p5Instance = $state<p5 | null>(null);

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(400, 400);
		};
		p.draw = () => {
			p.background(240);
			p.circle(p.mouseX, p.mouseY, 40);
		};
	};
</script>

<P5Canvas {sketch} bind:instance={p5Instance} />
```

## `preload` becomes async `setup` ([p5-svelte#239](https://github.com/tonyketcham/p5-svelte/issues/239))

p5 2 removed `preload()`. Load assets with `await` in `setup()`. `<P5Canvas>` wraps your `setup`, so `onReady` runs after the awaited work is done:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	let loaded = $state(false);

	const sketch = (p: p5) => {
		let img: p5.Image;
		p.setup = async () => {
			p.createCanvas(400, 400);
			img = await p.loadImage('/cat.jpg');
		};
		p.draw = () => {
			p.image(img, 0, 0, p.width, p.height);
		};
	};
</script>

<P5Canvas {sketch} onReady={() => (loaded = true)} />
{#if !loaded}<p>Loading</p>{/if}
```

On p5 1.11 the same sketch needs `p.preload = () => { img = p.loadImage('/cat.jpg'); }` instead, because `loadImage` returns the image synchronously there. See [p5 1 to 2 pitfalls](../p5-2-pitfalls.md#preload-is-gone-use-async-setup).

## Importing classes from other files ([p5-svelte#372](https://github.com/tonyketcham/p5-svelte/issues/372))

Keep sketch helpers in plain modules and pass the instance in. A type-only `p5` import keeps the module safe to load during SSR:

```ts
// particle.ts
import type p5 from 'p5';

export class Particle {
	x: number;
	y: number;
	constructor(
		private p: p5,
		private speed: number
	) {
		this.x = p.random(p.width);
		this.y = p.random(p.height);
	}
	update() {
		this.y = (this.y + this.speed) % this.p.height;
	}
	show() {
		this.p.circle(this.x, this.y, 6);
	}
}
```

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';
	import { Particle } from './particle';

	const sketch = (p: p5) => {
		let particles: Particle[] = [];
		p.setup = () => {
			p.createCanvas(400, 400);
			particles = Array.from({ length: 100 }, () => new Particle(p, p.random(1, 3)));
		};
		p.draw = () => {
			p.background(240);
			for (const pt of particles) {
				pt.update();
				pt.show();
			}
		};
	};
</script>

<P5Canvas {sketch} />
```

## Add-ons and p5.SVG ([p5-svelte#125](https://github.com/tonyketcham/p5-svelte/issues/125))

Add-on loading is the same problem in both wrappers, and the answer is in the [add-on recipe](./loading-addons.md). `p5.js-svg` documents p5 1.11 only, and this repo has not tested it.

## State: replacing manual subscription

`p5-svelte` focused on the canvas wrapper itself, leaving state management to the consumer (typically writable stores). svelte-p5 ships `createP5Bridge` for the same job, plus reactive class patterns for shared state.

Before:

<!-- snippet: skip (old p5-svelte API, which is not a dependency here) -->

```svelte
<script>
	import P5 from 'p5-svelte';
	import { writable } from 'svelte/store';

	const radius = writable(40);
	let currentRadius = 40;
	radius.subscribe((v) => (currentRadius = v));

	const sketch = (p5) => {
		p5.draw = () => p5.circle(100, 100, currentRadius);
	};
</script>

<P5 {sketch} />
<input type="range" bind:value={$radius} />
```

After:

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	const bridge = createP5Bridge({ radius: 40 });

	const sketch = (p: p5) => {
		p.draw = () => p.circle(100, 100, bridge.state.radius);
	};
</script>

<P5Canvas {sketch} />
<input type="range" bind:value={bridge.state.radius} />
```

No `subscribe`, no mirror variable.

## What you should notice after migrating

Detached-canvas counts stay flat on `{#if}` toggles, HMR no longer accumulates canvases, and route transitions with a `<P5Canvas>` inside release cleanly. You do nothing to get this; the wrapper handles it.

## Dependency version

`p5-svelte` peered on `p5 ^1.4.0`. This library peers `p5 >=1.11.0 <3`. If you are on an older p5 minor, bump to 1.11.x, or move to p5 2.x, which is also supported.

## Typing custom instance members

Sketches migrated from `p5-svelte` often carry `(p5 as any).myHelper = ...` casts for members installed onto the instance. `SketchFn<Ext>` removes them: declare an interface for your custom members, type the sketch as `SketchFn<MyExt>`, and both the sketch body and `bind:instance` come out fully typed (`ExtendedP5<MyExt>`). See the [core README](../../packages/core/README.md#typed-instance-extensions).

## What migrating doesn't change

Your sketch code is unchanged. `p.setup`, `p.draw`, `p.loadFont`, every p5 API call ports 1:1.

On p5 1.x the `loadFont()` perf trap isn't a library issue either. Variable-font path rendering is slow in p5 regardless of the wrapper (p5 2 draws loaded fonts natively). See [performance.md](./performance.md) for the full treatment.

SSR is the same story. `<P5Canvas>` dynamically imports p5 on the client, so SvelteKit SSR works without `{#if browser}` guards.

## Stuck?

Open an [issue](https://github.com/edw1nzhao/svelte-p5/issues) with your before/after.
