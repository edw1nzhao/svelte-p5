<script lang="ts">
	import { P5Canvas, type SketchFn } from 'svelte-p5';
	import type p5 from 'p5';

	interface Props {
		sketch: SketchFn;
		/** Apply `pixelDensity(devicePixelRatio)` on ready. Default: true */
		hidpi?: boolean;
		class?: string;
		style?: string;
		instance?: p5 | null;
		onReady?: (instance: p5) => void;
	}

	let {
		sketch,
		hidpi = true,
		class: className = '',
		style = 'display: block; width: 100%; height: 100%; overflow: hidden;',
		instance = $bindable(null),
		onReady
	}: Props = $props();

	let container: HTMLDivElement | null = $state(null);

	function handleReady(p: p5) {
		if (hidpi && typeof window !== 'undefined') {
			p.pixelDensity(window.devicePixelRatio);
		}
		// Size immediately to the current container dimensions.
		if (container) {
			const rect = container.getBoundingClientRect();
			p.resizeCanvas(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
		}
		onReady?.(p);
	}

	$effect(() => {
		if (!container) return;
		const el = container;
		const ro = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry || !instance) return;
			const w = Math.max(1, Math.floor(entry.contentRect.width));
			const h = Math.max(1, Math.floor(entry.contentRect.height));
			instance.resizeCanvas(w, h);
		});
		ro.observe(el);
		return () => ro.disconnect();
	});
</script>

<div bind:this={container} class={className} {style}>
	<P5Canvas {sketch} bind:instance onReady={handleReady} />
</div>
