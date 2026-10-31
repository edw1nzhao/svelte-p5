# Sketch context

`<P5Canvas>`, and so `<Sketch>`, share their p5 instance with every component rendered inside them through Svelte context. A child reads it with `getSketchContext()` instead of taking an `instance` prop, the same way a Threlte component reads its scene with `useThrelte()`.

Needs `svelte-p5` 1.2 or later.

## Overlays go in the children snippet

Both components take children. They render inside the canvas container, before the `<canvas>` element, and the container gets `position: relative` so absolutely positioned children sit over the canvas:

```svelte
<script lang="ts">
	import type { SketchFn } from 'svelte-p5';
	import { FPSMonitor, Sketch, SketchDebug } from 'svelte-p5-components';

	const sketch: SketchFn = (p) => {
		p.draw = () => {
			p.background(240);
			p.circle(p.mouseX, p.mouseY, 40);
		};
	};
</script>

<div style="height: 320px">
	<Sketch {sketch}>
		<FPSMonitor />
		<SketchDebug position="top-left" />
	</Sketch>
</div>
```

`FPSMonitor` and `SketchDebug` use the context instance when you pass no `instance` prop. An explicit `instance` still wins, so existing code keeps working. Without children the markup is exactly what it was before 1.2.

Children are laid out in normal flow before the canvas, so a child that is not absolutely positioned pushes the canvas down. Keep overlays `position: absolute`, or put ordinary UI outside the component.

## Reading the context

`getSketchContext()` returns `undefined` outside a canvas. Call it while the component initialises, as with any Svelte context:

```svelte
<!-- FrameBadge.svelte -->
<script lang="ts">
	import { getSketchContext } from 'svelte-p5';

	const sketch = getSketchContext();
	let frame = $state(0);

	$effect(() => {
		const p = sketch?.instance;
		if (!p) return;
		const id = setInterval(() => (frame = p.frameCount), 250);
		return () => clearInterval(id);
	});
</script>

<span style="position: absolute; left: 8px; bottom: 8px">frame {frame}</span>
```

| member         | type                               | meaning                                                                                   |
| -------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `instance`     | `ExtendedP5<Ext> \| null`          | the instance once `setup()` has finished; `null` before that and after unmount. Reactive. |
| `ready`        | `boolean`                          | `instance !== null`. Reactive.                                                            |
| `loop`         | `'always' \| 'demand' \| 'manual'` | the canvas's [loop mode](./on-demand-rendering.md). Reactive.                             |
| `invalidate()` | `() => void`                       | request one redraw; see [on-demand rendering](./on-demand-rendering.md).                  |

`instance` is `null` until `setup()` has finished, including an `async` setup on p5 2, so a child never sees a half-built sketch. That is later than `bind:instance`, which is set as soon as the p5 constructor returns.

To type members your sketch adds, pass the same `Ext` you gave `SketchFn`: `getSketchContext<MyExt>()`.

## Version notes

`svelte-p5-components` reads the context key directly rather than importing `getSketchContext`, so its main entry still works with `svelte-p5` 1.0 and 1.1; there the overlays simply find no context and need an `instance` prop. [`ExportButton`](./export.md#the-exportbutton-component) lives in the separate `svelte-p5-components/export` entry because it needs 1.2.
