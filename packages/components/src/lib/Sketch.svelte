<script lang="ts" generics="Ext = unknown">
	import { P5Canvas, type ExtendedP5 } from 'svelte-p5';
	import type { SketchProps } from './sketch-types.js';

	let {
		sketch,
		hidpi = true,
		class: className = '',
		style = 'display: block; width: 100%; height: 100%; overflow: hidden;',
		instance = $bindable(null),
		onReady,
		onResize
	}: SketchProps<Ext> = $props();

	let container: HTMLDivElement | null = $state(null);

	function handleReady(p: ExtendedP5<Ext>) {
		if (typeof window !== 'undefined') {
			if (typeof hidpi === 'number') {
				p.pixelDensity(hidpi);
			} else if (hidpi) {
				p.pixelDensity(window.devicePixelRatio);
			} else {
				// p5 defaults to devicePixelRatio, so opting out must be explicit.
				p.pixelDensity(1);
			}
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
			// Skip no-op resizes; this also swallows the observer's initial
			// fire, which would otherwise double-report the handleReady sizing.
			if (w === instance.width && h === instance.height) return;
			instance.resizeCanvas(w, h);
			onResize?.(instance, w, h);
		});
		ro.observe(el);
		return () => ro.disconnect();
	});
</script>

<div bind:this={container} class={className} {style}>
	<P5Canvas {sketch} bind:instance onReady={handleReady} />
</div>
