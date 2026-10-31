# Exporting images and frames

`svelte-p5` can render a sketch to an image file at any resolution and step it frame by frame for video. It does not encode video or GIFs: hand the frames to FFmpeg or another encoder.

Needs `svelte-p5` 1.2 or later; `<ExportButton>` also needs `svelte-p5-components` 2.2.

## `exportCanvas` and `downloadCanvas`

<!-- snippet: declare const instance = stub<P5>(); -->

```ts
import { downloadCanvas, exportCanvas } from 'svelte-p5';

const png = await exportCanvas(instance); // a Blob at the screen's resolution
const print = await exportCanvas(instance, { width: 3508 }); // 3508 px wide
await downloadCanvas(instance, { scale: 4, format: 'jpeg', quality: 0.9, seed: 1234 });
```

| option     | default                      | meaning                                                                   |
| ---------- | ---------------------------- | ------------------------------------------------------------------------- |
| `scale`    | the current `pixelDensity()` | output pixels per CSS pixel of the canvas                                 |
| `width`    |                              | output width in pixels; sets `scale` to `width / instance.width`          |
| `height`   |                              | output height in pixels; with `width`, must match the canvas aspect ratio |
| `format`   | `'png'`                      | `'png'`, `'jpeg'` or `'webp'`                                             |
| `quality`  | browser default              | 0 to 1, for JPEG and WebP                                                 |
| `filename` | see below                    | `downloadCanvas` only                                                     |
| `seed`     |                              | appended to the default filename, so the file records the seed            |

Pass either `scale` or a size, not both. The default filename is `sketch-YYYYMMDD-HHMMSS.png`, or `sketch-YYYYMMDD-HHMMSS-<seed>.png` with a seed; `exportFilename(options)` returns the same string if you want to save the blob yourself. JPEG has no alpha, so transparent pixels come out black: call `background()` in `draw()` first.

Both functions throw if called before `setup()` has finished or from inside `draw()`, because p5 ignores `redraw()` at those times.

## How it renders at a higher resolution

At the current density, `exportCanvas` encodes the canvas as it is, without calling `draw()`. At any other scale it:

1. sets `pixelDensity(scale)`, which resizes the canvas backing store but not its CSS size or `width`/`height`,
2. calls `redraw()` once,
3. snapshots the bitmap with `canvas.toBlob()`,
4. restores the original density, calls `redraw()` again and resets `frameCount`.

Steps 1 to 4 run without yielding to the browser, so the page never paints the enlarged canvas, and the live canvas ends with the same size, density, pixels and `frameCount` it started with (the e2e test compares all of them before and after, in 2D and WEBGL, on p5 1.11 and 2.x).

The trade-offs of this approach, against drawing into an offscreen `createGraphics()` buffer:

- It works with any sketch unchanged. An offscreen buffer would need every drawing call in `draw()` rewritten to target the buffer.
- `draw()` runs twice more. Any state it advances (a particle step, a counter you keep yourself) advances too; only `frameCount` is restored. Keep simulation steps out of `draw()`, or export from a stopped sketch.
- It re-renders from scratch, because changing the density clears the canvas. A sketch that accumulates drawing across frames (no `background()` call) exports only its latest frame at a non-native scale. Export those at the current density, which copies the canvas as it is.
- Size-dependent caches keyed on `width` and `height` stay valid, because those do not change.

## Print sizes

Choose the output width in pixels: inches times ppi, or millimetres divided by 25.4 times ppi. At 300 ppi:

| print size             | pixels at 300 ppi | canvas aspect |
| ---------------------- | ----------------- | ------------- |
| 4 × 6 in               | 1200 × 1800       | 2 : 3         |
| 8 × 10 in              | 2400 × 3000       | 4 : 5         |
| US Letter, 8.5 × 11 in | 2550 × 3300       | 17 : 22       |
| A4, 210 × 297 mm       | 2480 × 3508       | 1 : √2        |
| A3, 297 × 420 mm       | 3508 × 4961       | 1 : √2        |
| 11 × 17 in             | 3300 × 5100       | 11 : 17       |

Size the sketch to the print's aspect ratio first, then pass `width`. For an A4 portrait from a 420 × 594 canvas, `{ width: 2480 }` gives a scale of about 5.9 and an output of 2480 × 3507: the height follows the canvas aspect and can differ by a pixel from the nominal size. A `width` and `height` that do not match the canvas aspect throw.

## WEBGL

WEBGL sketches export the same way. Two things differ:

- p5 creates WEBGL contexts with `preserveDrawingBuffer: true` on both majors, so the canvas can be read at any time. If you turned it off with `setAttributes`, `exportCanvas` always takes the re-render path, which reads the buffer in the same task as the `draw()` that filled it.
- The GPU caps each side at `MAX_TEXTURE_SIZE` (often 8192 or 16384). p5 would silently shrink `width` and `height` past it, so `exportCanvas` throws a `RangeError` instead, before touching the canvas.

2D canvases have browser size limits too. Exports up to 3000 px wide are tested in CI; very large ones depend on the browser and the device's memory.

## Frame-by-frame capture with `stepFrames`

Recording a running sketch in real time drops frames whenever a frame takes longer than its slot. `stepFrames` avoids that: it stops the loop and draws one frame at a time, waiting for your callback before the next.

<!-- snippet: declare const instance = stub<P5>(); -->

```ts
import { stepFrames } from 'svelte-p5';

await stepFrames(instance, {
	count: 300, // 10 seconds at 30 fps
	fps: 30,
	scale: 2,
	onFrame: async (frame) => {
		const png = await frame.toBlob('png');
		const name = `frame-${String(frame.index).padStart(4, '0')}.png`;
		await fetch(`/frames/${name}`, { method: 'PUT', body: png });
	}
});
```

Each frame object has `index`, `frameCount`, `time` (`index * 1000 / fps` ms), the `canvas` and `toBlob(format?, quality?)`. Before each `redraw()`, `deltaTime` is set to `1000 / fps`, so motion written as `speed * p.deltaTime` advances by exactly one frame's worth. Pass a `signal` from an `AbortController` to stop early. Afterwards the original density is restored, and the loop restarts if it was running.

The frames can then be encoded offline, for example `ffmpeg -framerate 30 -i frame-%04d.png -pix_fmt yuv420p out.mp4`.

Limits:

- Only `frameCount` and `deltaTime` are controlled. `millis()`, `Date.now()` and `performance.now()` keep reporting wall-clock time, so animation driven by them will not be deterministic. Drive time from `frameCount` or `deltaTime` instead.
- `frameRate()` is not updated by stepped frames.
- Randomness is only reproducible if you seed it with `randomSeed()` and `noiseSeed()` before stepping.
- If the sketch was looping, p5 draws one more frame of its own just after `noLoop()`; `stepFrames` waits for it before the first step.

## The `ExportButton` component

`svelte-p5-components/export` has a small button that finds the instance through the [sketch context](./sketch-context.md):

```svelte
<script lang="ts">
	import type { SketchFn } from 'svelte-p5';
	import { Sketch } from 'svelte-p5-components';
	import { ExportButton } from 'svelte-p5-components/export';

	const sketch: SketchFn = (p) => {
		p.draw = () => {
			p.background(250);
			p.circle(p.width / 2, p.height / 2, 120);
		};
	};
</script>

<div style="height: 320px">
	<Sketch {sketch}>
		<ExportButton options={{ width: 2400, seed: 'study-3' }} />
	</Sketch>
</div>
```

| prop       | default         | meaning                                                     |
| ---------- | --------------- | ----------------------------------------------------------- |
| `instance` | sketch context  | the sketch to export, for a button outside the canvas       |
| `options`  | `{}`            | passed to `downloadCanvas`                                  |
| `position` | `'bottom-left'` | overlay corner, or `'static'` for an ordinary inline button |
| `children` | "Export PNG"    | button content                                              |
| `onExport` |                 | called with the `Blob` after the download starts            |
| `onError`  |                 | called with the error; without it the error is rethrown     |

It is a separate entry because it needs `svelte-p5` 1.2, while the main `svelte-p5-components` entry still supports `svelte-p5` 1.0 and 1.1.
