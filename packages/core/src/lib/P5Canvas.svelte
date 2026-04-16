<script lang="ts">
	import { onMount } from 'svelte';
	import type p5Type from 'p5';
	import type { P5CanvasProps } from './types.js';

	let {
		sketch,
		instance = $bindable(null),
		class: className = '',
		style = 'display: block; width: 100%; height: 100%;',
		onReady
	}: P5CanvasProps = $props();

	let container: HTMLDivElement | null = null;

	onMount(() => {
		// Track the local instance so cleanup works even if `instance` is reassigned
		// by the parent binding before the async import resolves.
		let local: p5Type | null = null;
		let cancelled = false;

		(async () => {
			const mod = await import('p5');
			if (cancelled || !container) return;

			const p5Ctor = mod.default;
			local = new p5Ctor((p: p5Type) => sketch(p), container);
			instance = local;
			onReady?.(local);
		})();

		return () => {
			cancelled = true;
			try {
				local?.remove();
			} catch {
				// p5.remove() can throw if the DOM is already gone during HMR; ignore.
			}
			local = null;
			instance = null;
		};
	});
</script>

<div bind:this={container} class={className} {style}></div>
