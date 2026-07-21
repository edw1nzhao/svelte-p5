<script lang="ts" generics="Ext = unknown">
	import { onMount } from 'svelte';
	import type p5Type from 'p5';
	import type { ExtendedP5, P5CanvasProps } from './types.js';

	let {
		sketch,
		instance = $bindable(null),
		class: className = '',
		style = 'display: block; width: 100%; height: 100%;',
		onReady
	}: P5CanvasProps<Ext> = $props();

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
			// The sketch installs its Ext members during construction (p5 calls the
			// sketch function synchronously inside the constructor), so by the time
			// the instance is observable it is already the extended type.
			local = new p5Ctor((p: p5Type) => sketch(p as ExtendedP5<Ext>), container);
			instance = local as ExtendedP5<Ext>;
			onReady?.(local as ExtendedP5<Ext>);
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
