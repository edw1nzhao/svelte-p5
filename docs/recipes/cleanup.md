# Cleanup and lifecycle

## The problem

`p5-svelte` creates a p5 instance in `onMount` and never tears it down. When the hosting component unmounts, the p5 instance keeps its draw loop running, holds its canvas node in memory, and retains every closure it captured. The visible symptoms:

- HMR reloads stack ghost canvases on top of each other.
- `{#if showing}<P5Canvas />{/if}` leaks an instance every toggle.
- SvelteKit route transitions silently accumulate instances.
- The Performance tab shows `requestAnimationFrame` callbacks from unmounted components.

## The fix

`<P5Canvas>` is mostly one `onMount` with a teardown:

```ts
onMount(() => {
	let local: p5 | null = null;
	let cancelled = false;

	(async () => {
		const { default: p5Ctor } = await import('p5');
		if (cancelled || !container) return;
		local = new p5Ctor((p) => sketch(p), container);
		instance = local;
	})();

	return () => {
		cancelled = true;
		try {
			local?.remove();
		} catch {
			/* ignore */
		}
		local = null;
		instance = null;
	};
});
```

Three things do the work:

`local?.remove()` is p5's official teardown. It stops the draw loop, removes the canvas node, and drops internal references.

The `cancelled` flag guards against a race where the component unmounts before `import('p5')` resolves. Without it, you'd create a p5 instance inside a DOM node that's already been disposed.

The `try/catch` around `remove()` is defensive. During HMR the container can disappear before Svelte runs the teardown, and `remove()` will throw on a missing node.

## Using the bindable instance

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	let instance = $state<p5 | null>(null);
</script>

<P5Canvas {sketch} bind:instance />

<button onclick={() => instance?.loop()}>Resume</button>
<button onclick={() => instance?.noLoop()}>Pause</button>
<button onclick={() => instance?.saveCanvas('frame', 'png')}>Export</button>
```

`instance` is `null` before mount and after unmount; always guard.

## Resize

`<P5Canvas>` doesn't auto-resize. That's a separate concern and different visualizations want different resize behaviour. Two ways to handle it:

1. Use `<Sketch>` from the components package. It's `<P5Canvas>` plus a `ResizeObserver` on the parent and auto `pixelDensity`.
2. Do it yourself: read the container size with `getBoundingClientRect()` in `p.setup`, call `instance.resizeCanvas(w, h)` from Svelte when you need.

## HMR

Editing a component that contains a `<P5Canvas>` triggers a normal unmount/remount. No leak, no stacking. If you do see double canvases during HMR, check whether your sketch adds listeners via `window.addEventListener` outside p5's scope — p5's `remove()` can't unwind those. Use `p.mousePressed` and friends, which are tied to the instance.

## Verifying

Chrome DevTools → Memory → take a heap snapshot, toggle your sketch N times, take another snapshot. Filter by `p5` or `_default`. Detached node count should stay flat.
