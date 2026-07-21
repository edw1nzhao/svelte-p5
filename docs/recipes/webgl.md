# WEBGL sketches

The library is renderer-agnostic: pass `p.WEBGL` to `createCanvas` in your sketch and everything — `<P5Canvas>`, `<Sketch>`, resize, cleanup — works the same. This recipe collects the WEBGL-specific behaviors worth knowing, verified against p5 1.11.

## Origin is the center, not the corner

The WEBGL renderer puts `(0, 0)` at the canvas center. 2D-style drawing code (and most visualization math) expects a top-left origin. Recenter once per frame, first thing in `draw`:

```ts
p.draw = () => {
	p.background(255);
	p.translate(-p.width / 2, -p.height / 2, 0);
	// ... draw in familiar top-left coordinates
};
```

## Resize is safe and context-preserving

`resizeCanvas` on a WEBGL canvas resizes the existing canvas and GL context — viewport and camera are updated, nothing is recreated, GPU resources survive. `<Sketch>`'s ResizeObserver path is therefore WEBGL-safe as-is.

Two details:

- `resizeCanvas` triggers an internal `redraw()` (unless you pass `noRedraw`). A noLoop-gated sketch repaints on resize — but with whatever size-dependent state it had. If your sketch caches layout that depends on `p.width`/`p.height`, rebuild it in `<Sketch>`'s `onResize` callback:

```svelte
<Sketch
	{sketch}
	onResize={(p) => {
		p.rebuildLayout?.();
		p.loop();
	}}
/>
```

- Create the canvas small in `setup` (the container's current size, or even 1×1) and let `<Sketch>` size it. Don't reach for `window.innerWidth` or measure surrounding DOM — the container is the source of truth.

## `smooth()` and `setAttributes()` recreate the context — call them once, in setup

In WEBGL mode, `smooth()` is `setAttributes('antialias', true)`, and `setAttributes` **rebuilds the GL context**, losing GPU state. p5's WEBGL antialias default is `false` (`true` in Safari). If you want antialiasing, call `smooth()` immediately after `createCanvas` in `setup` and never again — calling it per-frame or on resize pays the context rebuild every time.

## Pixel density: cap it for big canvases

p5 defaults to `devicePixelRatio` density. A full-viewport WEBGL canvas on a 3× display is a huge framebuffer; fill-rate and memory are real limits for geometry-heavy sketches. `<Sketch>` accepts a numeric `hidpi`:

```svelte
<Sketch {sketch} hidpi={Math.min(window.devicePixelRatio, 2)} />
```

See [hidpi.md](./hidpi.md) for the full treatment.

## Recreating the canvas (Safari, big data loads)

Browsers cap live WebGL contexts (on the order of 8–16), and Safari in particular can degrade after repeated large uploads to a long-lived context. When you need a genuinely fresh canvas — e.g. after clearing a large dataset — don't fight the instance: remount the component with `{#key}` and release the old context explicitly:

```svelte
<script lang="ts">
	let epoch = $state(0);
	let instance = $state<p5 | null>(null);

	function clearAllData() {
		// release the GL context now instead of waiting for GC —
		// remove() alone leaves that to the browser's context cap.
		(instance?.drawingContext as WebGL2RenderingContext | undefined)
			?.getExtension('WEBGL_lose_context')
			?.loseContext();
		epoch += 1; // remount: old instance removed, fresh one created
	}
</script>

{#key epoch}
	<Sketch {sketch} bind:instance />
{/key}
```

`<P5Canvas>`'s teardown is `{#key}`-safe: the old instance's `remove()` runs before the new mount, the async p5 import is guarded against races, and `bind:instance` goes `null → new instance`, which is exactly the signal downstream `$effect`s need to rebind.

## What stays app-side (for now)

Handling `webglcontextlost`/`webglcontextrestored` events is your sketch's job — attach listeners via `instance.canvas` if you need resilience against the browser evicting your context. Automatic remount-on-context-loss is on the library roadmap.
