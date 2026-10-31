<script lang="ts">
	import type p5 from 'p5';
	import { createP5Bridge, invalidate, P5Canvas, type LoopMode, type SketchFn } from 'svelte-p5';
	import { Sketch } from 'svelte-p5-components';
	import type { DemandE2EState } from './state.js';

	const params = new URLSearchParams(window.location.search);
	const loop = (params.get('loop') ?? 'demand') as LoopMode;
	const useCanvas = params.get('kind') === 'canvas';
	const bridge = createP5Bridge({ radius: 10 });
	let width = $state(200);
	let instance = $state<p5 | null>(null);

	const harness: DemandE2EState = {
		frames: 0,
		ready: false,
		setRadius: (r) => (bridge.state.radius = r),
		invalidate: () => invalidate(instance),
		resize: (w) => (width = w)
	};
	window.__demand = harness;

	const sketch: SketchFn = (p) => {
		p.setup = () => {
			p.createCanvas(200, 100);
		};
		p.draw = () => {
			harness.frames++;
			p.background(240);
			p.circle(p.width / 2, p.height / 2, bridge.state.radius);
		};
	};
	const onReady = () => (harness.ready = true);
</script>

<div style="width: {width}px; height: 100px">
	{#if useCanvas}
		<P5Canvas {sketch} {loop} {bridge} bind:instance {onReady} />
	{:else}
		<Sketch {sketch} {loop} {bridge} bind:instance {onReady} />
	{/if}
</div>
