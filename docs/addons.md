# The `addons` prop

p5 2 add-ons are functions passed to `p5.registerAddon(function (p5, fn, lifecycles) { ... })`. `<P5Canvas>` and `<Sketch>` take an `addons` array and register each one before the sketch is created:

```svelte
<script lang="ts">
	import type p5 from 'p5';
	import { P5Canvas, type P5Addon, type SketchFn } from 'svelte-p5';

	interface Grain {
		grain(amount: number): void;
	}

	// Module level, so the function keeps one identity across remounts.
	const grain: P5Addon = (_p5, fn) => {
		fn.grain = function (this: p5, amount: number) {
			this.loadPixels();
			for (let i = 0; i < this.pixels.length; i += 4) {
				const n = (Math.random() - 0.5) * amount;
				this.pixels[i] += n;
				this.pixels[i + 1] += n;
				this.pixels[i + 2] += n;
			}
			this.updatePixels();
		};
	};

	const sketch: SketchFn<Grain> = (p) => {
		p.setup = () => {
			p.createCanvas(300, 200);
			p.pixelDensity(1);
		};
		p.draw = () => {
			p.background(230, 200, 160);
			p.grain(40);
		};
	};
</script>

<P5Canvas {sketch} addons={[grain]} />
```

Needs `svelte-p5` 1.2 and p5 2.x. For loading published add-ons that register themselves, and for p5 1.x, see [loading p5 add-ons](./recipes/loading-addons.md).

## What the prop guarantees

- Each add-on is registered **before** `new p5(...)`, so its `presetup` hook runs for the sketch that asked for it.
- Each add-on function is registered **once per p5 constructor**. Remounting the canvas, an `{#key}` block or a component hot reload pass the same function again, and it is skipped. p5 2.3 also ignores a function it has already seen, but the wrapper does not rely on every 2.x release doing so.
- The prop is read once, at mount. Changing the array later has no effect until the canvas remounts.

## What it cannot do

p5 keeps add-on hooks on the class, not on the instance, and has no way to unregister them. So:

- An add-on stays registered for the rest of the page's life, and its hooks run for **every** sketch on the page, including sketches that did not list it. In the spike for this page, a second, unrelated sketch on the page ran the add-on's `predraw` and `postdraw` hooks on every frame. Guard hooks that should only apply to some sketches, for example by checking a flag your sketch sets on the instance.
- Editing the add-on's own module under HMR creates a new function, which registers alongside the old one until a full reload.

## Lifecycle hooks, verified on p5 2.3.4

| hook        | when                                                                                                 | may be `async`                            |
| ----------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `presetup`  | its synchronous part runs inside `new p5()`, after your sketch function and before any canvas exists | yes; `setup()` waits for it               |
| `postsetup` | after `setup()` has finished                                                                         | yes; the first `draw()` waits for it      |
| `predraw`   | before each `draw()`, after `frameCount` is incremented                                              | yes; `draw()` waits, which slows the loop |
| `postdraw`  | after each `draw()`                                                                                  | yes                                       |
| `remove`    | when the sketch is removed                                                                           | yes                                       |

In every hook `this` is the sketch instance, so write hooks with `function`, not arrows. Use `{ signal: this._removeSignal }` with `addEventListener` so listeners go away with the sketch.

Because `presetup` can delay `setup()`, an `async` `presetup` also delays `onReady` and the [sketch context](./sketch-context.md) instance. `<P5Canvas>` handles that the same way as an `async` `setup()`.

## Add-ons that register themselves

Many published add-ons call `p5.registerAddon` themselves when they load and do not export the function, so there is nothing to put in the array. p5.brush 3.0.0 is one: its ES build registers only `if (typeof p5 !== 'undefined')`, and exports no add-on function. In the spike, importing it with no global `p5` registered nothing; setting `globalThis.p5` first registered its hooks once, and a WEBGL sketch drew brush strokes on p5 2.3.4. Load such add-ons as [loading p5 add-ons](./recipes/loading-addons.md) shows. Use the `addons` prop for add-ons you write, and for packages that export their add-on function.

## p5 1.x

p5 1.x has no `registerAddon`. A non-empty `addons` prop there throws:

```text
svelte-p5: the addons prop needs p5.registerAddon, which p5 1.11.13 does not have (it arrived in p5 2.0). On p5 1.x, import the add-on for its side effects instead; see https://svelte-p5.dev/docs/addons.
```

The error surfaces as an unhandled promise rejection from the mount, and no sketch is created. p5 1 has a similar mechanism, `p5.prototype.registerMethod('pre', fn)`, but mapping p5 2 hooks onto it would quietly drop two things add-ons rely on: p5 1 does not await `async` hooks, and it has no `_removeSignal`. Failing loudly is safer than running an add-on half right. An empty array or no prop is fine on p5 1.
