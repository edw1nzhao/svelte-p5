<script lang="ts">
	/**
	 * Faithful port of `p5-svelte`'s <P5> component to Svelte 5 syntax.
	 * Reference: https://github.com/tonyketcham/p5-svelte/blob/main/src/lib/P5.svelte
	 *
	 * The behaviour we preserve from the original:
	 *   - construct p5 in onMount, store the instance
	 *   - DO NOT call instance.remove() on unmount (this is the leak)
	 *   - hand the instance back via a callback prop
	 *
	 * The differences are syntactic only ($props/$bindable instead of
	 * export let, no createEventDispatcher) so we can compile under
	 * Svelte 5 and compare wrappers, not Svelte versions.
	 */
	import { onMount } from 'svelte';
	import type p5Type from 'p5';

	type SketchFn = (p: p5Type) => void;

	let {
		sketch,
		instance = $bindable<p5Type | null>(null)
	}: {
		sketch: SketchFn;
		instance?: p5Type | null;
	} = $props();

	let div: HTMLDivElement | null = null;

	onMount(() => {
		// p5-svelte uses a top-level `import P5Module from 'p5'`; here we
		// match svelte-p5's dynamic import so the SSR-vs-not difference
		// is held constant. The leak is in the missing teardown, not the import.
		(async () => {
			const mod = await import('p5');
			if (!div) return;
			const p5Ctor = mod.default;
			instance = new p5Ctor((p: p5Type) => sketch(p), div);
		})();
		// NOTE: deliberately no return cleanup. This is the bug.
	});
</script>

<div bind:this={div} style="display: block; width: 100%; height: 100%;"></div>
