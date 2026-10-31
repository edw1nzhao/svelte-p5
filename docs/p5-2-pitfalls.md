# p5 1 to 2 pitfalls

`svelte-p5` supports p5 `>=1.11.0 <3`. The wrapper hides most differences between the majors, but a few p5 2 changes still reach your sketch code. Everything here was checked against p5 2.3.4 unless a source is linked.

- [`preload` is gone, use async `setup`](#preload-is-gone-use-async-setup)
- [`width`, `height` and `pixels` are getters](#width-height-and-pixels-are-getters)
- [`createCanvas` resets `pixelDensity`](#createcanvas-resets-pixeldensity)
- [Add-ons and types](#add-ons-and-types)

## `preload` is gone, use async `setup`

p5 2 removed `preload()` ([2.0.0 release notes](https://github.com/processing/p5.js/releases/tag/v2.0.0)). Loaders return promises, and `setup()` may be `async`.

p5 1.x:

<!-- snippet: skip (p5 1 preload API, which the p5 2 types do not declare) -->

```ts
let img: p5.Image;
p.preload = () => {
	img = p.loadImage('/cat.jpg');
};
p.setup = () => {
	p.createCanvas(400, 400);
};
```

p5 2.x:

<!-- snippet: declare const p = stub<P5>(); -->

```ts
import type p5 from 'p5';

let img: p5.Image;
let font: p5.Font;
p.setup = async () => {
	p.createCanvas(400, 400);
	[img, font] = await Promise.all([p.loadImage('/cat.jpg'), p.loadFont('/MyFont.ttf')]);
};
```

`draw()` does not start until the promise returned by `setup()` resolves, so it can use `img` without a null check.

`<P5Canvas>` and `<Sketch>` call `onReady` once your `setup()` has finished, awaited if it is async. This holds on p5 1 and p5 2, so a loading state in Svelte can hang off `onReady` whichever version is installed:

<!-- snippet: declare const sketch = stub<(p: P5) => void>(); -->

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';

	let ready = $state(false);
</script>

<P5Canvas {sketch} onReady={() => (ready = true)} />
{#if !ready}<p>Loading</p>{/if}
```

If a p5 2 sketch still assigns `p.preload`, p5 logs "The preload() function has been removed in p5.js 2.0" and, in instance mode on 2.3.4, then throws `TypeError: Cannot set properties of null (setting 'hitCriticalError')` from the constructor. The TypeError hides the real cause, so search the sketch for `preload` first. The [p5.js-compatibility](https://github.com/processing/p5.js-compatibility) package restores `preload` as an add-on if you cannot port yet. A forum thread shows the same mistake with Vite and TypeScript: [Error when using preload() with Vite + TypeScript](https://discourse.processing.org/t/error-when-using-preload-with-vite-typescript-cannot-read-properties-of-undefined-reading-pixels/46431).

## `width`, `height` and `pixels` are getters

In p5 1, `width` and `height` are plain properties. In p5 2.3.4 they are getters on the instance that forward to the renderer (`get width() { return this._renderer?.width; }`), and so is `pixels`. A read costs a function call. Reading them a few times per frame is free. Reading them inside a per-pixel or per-cell loop is not.

A September 2026 forum thread reports a Game of Life on a 1024 by 640 grid dropping from about 60 fps on p5 1.11.13 to about 4 fps on 2.3.2, with the getter as the cause. A p5.js maintainer's reply, relayed in the thread: "It is a known limitation, the trade off is a slight performance hit by using getters" ([Accessing width and height variables much slower in P5 Ver 2.0 compared to Ver 1.0](https://discourse.processing.org/t/accessing-width-and-height-variables-much-slower-in-p5-ver-2-0-compared-to-ver-1-0/49325)). The same thread shows the workaround.

Read once, outside the loop:

<!-- snippet: declare const p = stub<P5>(); const grid = stub<Uint8Array>(); const next = stub<Uint8Array>(); const SCALE = 2; -->

```ts
// slow on p5 2: a getter call per neighbour
for (let y = 0; y < p.height / SCALE; y++) {
	for (let x = 0; x < p.width / SCALE; x++) {
		const i = y * (p.width / SCALE) + x;
		next[i] = grid[i];
	}
}

// fast: two reads per frame
const cols = Math.floor(p.width / SCALE);
const rows = Math.floor(p.height / SCALE);
for (let y = 0; y < rows; y++) {
	for (let x = 0; x < cols; x++) {
		const i = y * cols + x;
		next[i] = grid[i];
	}
}
```

Pixel loops follow the same rule. `loadPixels()` copies the canvas into a new `pixels` array each call, so read `p.pixels` once after it, every frame, and index into the local:

<!-- snippet: declare const p = stub<P5>(); -->

```ts
p.draw = () => {
	p.loadPixels();
	const px = p.pixels;
	const d = p.pixelDensity();
	const w = Math.floor(p.width * d);
	const h = Math.floor(p.height * d);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = 4 * (y * w + x);
			px[i] = x % 256;
			px[i + 1] = y % 256;
			px[i + 2] = 128;
			px[i + 3] = 255;
		}
	}
	p.updatePixels();
};
```

`pixels` has `width * pixelDensity` columns, so index with the density-scaled size, not the CSS size.

`<Sketch>` passes the new size to `onResize(instance, width, height)`, so a sketch that rebuilds a grid on resize can store those numbers instead of reading the getters:

<!-- snippet: declare const sketch = stub<(p: P5) => void>(); -->

```svelte
<script lang="ts">
	import { Sketch } from 'svelte-p5-components';

	let size = { width: 0, height: 0 };
</script>

<Sketch {sketch} onResize={(_p, width, height) => (size = { width, height })} />
```

### Try it

The playground has a Game of Life sketch that switches between the two forms on click and shows fps and step time: [open the example](https://svelte-p5.dev/playground?example=size-cache). The Speed slider raises the work per frame.

One run in headless Chromium with software rendering, a 560 by 420 canvas, `draw()` time per frame:

| work per frame | p5 1.11.11, getters read in loop | p5 1.11.11, cached | p5 2.3.4, getters read in loop | p5 2.3.4, cached |
| -------------- | -------------------------------- | ------------------ | ------------------------------ | ---------------- |
| 3 generations  | 4.1 ms                           | 4.3 ms             | 15.5 ms                        | 7.3 ms           |
| 6 generations  | 6.4 ms                           | 6.9 ms             | 25.8 ms                        | 9.6 ms           |

p5 1 shows no difference, and p5 2 roughly halves its frame time with the cache. The forum report is far larger than this. Browsers optimise getters differently, so measure in the browser your users have.

## `createCanvas` resets `pixelDensity`

In p5 2, `createCanvas()` builds a new renderer, and the renderer starts at `Math.ceil(window.devicePixelRatio)`. A `pixelDensity(n)` call placed before `createCanvas()` is discarded. This is open as [processing/p5.js#9221](https://github.com/processing/p5.js/issues/9221), and the p5 reference page shows the order that does not work.

On a 2x display with p5 2.3.4:

<!-- snippet: declare const p = stub<P5>(); -->

```ts
p.setup = () => {
	p.pixelDensity(3);
	p.createCanvas(100, 100);
	console.log(p.pixelDensity()); // 2, not 3
};
```

Call `pixelDensity()` after `createCanvas()`. Anything that calls `createCanvas()` again, such as switching to WEBGL, resets it again.

`<Sketch>` is not affected. It applies `pixelDensity` in its ready handler, after your `setup()` has run and the canvas exists, and only then sizes the canvas to its container. The `hidpi` prop decides the value: `true` (default) uses `window.devicePixelRatio` exactly (1.5 on a 1.5x display, where the p5 2 default would round up to 2), `false` pins 1, and a number is used as given. A `pixelDensity()` call inside your own `setup()` is overwritten by it. In the same test, `hidpi={1.5}` gave 1.5, `hidpi={false}` gave 1 and the default gave 2 at a device pixel ratio of 2. See [HiDPI](./recipes/hidpi.md).

A bare `<P5Canvas>` applies nothing, so call `p.pixelDensity()` after `createCanvas()` there.

## Add-ons and types

| package                                    | p5 2 status                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `p5.sound` (npm, `processing/p5.sound.js`) | Works with p5 1 and 2 per its README. Loaded here on p5 2.3.4 after setting `globalThis.p5`. Replaces `p5/lib/addons/p5.sound`. |
| the old bundled `p5.sound`                 | Does not work on p5 2. Classes such as `MonoSynth` and `Part` were dropped, and the compatibility README recommends Tone.js.    |
| `p5.brush` 3                               | Needs `p5 ^2.2` (peer dependency) and a WEBGL canvas. Ran here on p5 2.3.4.                                                     |
| `p5.js-svg`                                | README documents p5 1.11.x only. Not tested with `svelte-p5`.                                                                   |
| `@types/p5`                                | Latest is 1.7.7. p5 2 ships its own types, so do not install it for p5 2.                                                       |

Sources: [p5.sound.js](https://github.com/processing/p5.sound.js), [p5.js-compatibility README](https://github.com/processing/p5.js-compatibility), [p5.brush README](https://github.com/acamposuribe/p5.brush), [p5.js-svg](https://github.com/zenozeng/p5.js-svg). How to load these from a bundler is in [loading p5 add-ons](./recipes/loading-addons.md).

Other removals that show up when porting shape code: p5 2.3.4 has no `curveVertex()`; use `splineVertex()`. The compatibility package ships a `shapes.js` add-on for code you cannot port yet.
