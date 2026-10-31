<script lang="ts">
	import { P5Canvas, type SketchFn } from 'svelte-p5';
	import { Sketch } from 'svelte-p5-components';

	const useCanvas = new URLSearchParams(window.location.search).get('kind') === 'canvas';
	let description = $state('A grey circle in the middle of the canvas');
	window.__describe = { ready: false, set: (text) => (description = text) };

	const sketch: SketchFn = (p) => {
		p.setup = () => {
			p.createCanvas(200, 100);
			p.noLoop();
		};
		p.draw = () => p.circle(100, 50, 40);
	};
	const onReady = () => (window.__describe.ready = true);
</script>

<div style="width: 200px; height: 100px">
	{#if useCanvas}
		<P5Canvas {sketch} {description} {onReady} />
	{:else}
		<Sketch {sketch} {description} {onReady} />
	{/if}
</div>
