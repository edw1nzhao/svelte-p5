# HiDPI

On a 2× display, a `<canvas>` renders at 1× and the browser upscales, which looks blurry. Calling `pixelDensity(window.devicePixelRatio)` in your sketch fixes it.

## The easy way

```svelte
<script lang="ts">
	import { Sketch } from 'svelte-p5-components';
</script>

<Sketch {sketch} />
```

`<Sketch>` calls `p.pixelDensity(window.devicePixelRatio)` once after the p5 instance is created. `hidpi` defaults to `true`.

Two other forms:

- `hidpi={false}` pins `pixelDensity(1)`. This matters because p5's _own_ default is already `devicePixelRatio` — skipping the call wouldn't opt you out of anything.
- `hidpi={number}` applies that exact density. The escape hatch for large WEBGL canvases: `hidpi={Math.min(window.devicePixelRatio, 2)}` caps the back buffer without giving up crispness on 2× displays.

## Manually

If you're using bare `<P5Canvas>`:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(600, 400);
			p.pixelDensity(window.devicePixelRatio);
		};
		p.draw = () => {
			/* ... */
		};
	};
</script>

<P5Canvas {sketch} />
```

## When to skip HiDPI

Pixel-art aesthetics, deliberately crunchy rendering, or anything where you want pixels to be pixels. Use `hidpi={false}` (or `pixelDensity(1)` manually).

Very large canvases on high-DPR displays. A 4K canvas at 3× DPR is a 36-megapixel back buffer; fill-rate and memory are real limits. Cap with `hidpi={Math.min(window.devicePixelRatio, 2)}` (or the equivalent `pixelDensity` call).

Dense small text with a loaded font. OpenType.js path rendering at 3× DPR is even slower than at 1×. Cap pixel density, use a font atlas, or fall back to system fonts.

## Things that don't change

`p.mouseX` and `p.mouseY` stay in CSS pixels regardless of `pixelDensity`. Don't multiply them. `p.width` and `p.height` are also CSS pixels - p5 hides the backing-store scaling from you, which is almost always what you want.
