<script lang="ts">
	import { P5Canvas, type SketchFn } from 'svelte-p5';
	import { Sketch } from 'svelte-p5-components';
	import type { LifecycleE2EState } from './state.js';

	const params = new URLSearchParams(window.location.search);
	const ids = Array.from({ length: Number(params.get('count') ?? 1) }, (_, i) => i);
	const useSketch = params.get('kind') === 'sketch';
	const gated = params.has('gated');

	let release: () => void = () => {};
	const gate = new Promise<void>((resolve) => (release = resolve));

	const lc: LifecycleE2EState = {
		created: 0,
		removed: 0,
		setupStarted: 0,
		setupFinished: 0,
		ready: 0,
		frames: 0,
		release
	};
	window.__lifecycle = lc;

	let mounted = $state(window.location.hash !== '#/other');
	window.addEventListener('hashchange', () => (mounted = window.location.hash !== '#/other'));

	const sketch: SketchFn = (p) => {
		lc.created++;
		const remove = p.remove.bind(p);
		p.remove = () => {
			lc.removed++;
			return remove();
		};
		p.setup = async () => {
			lc.setupStarted++;
			if (gated) await gate;
			p.createCanvas(100, 100);
			lc.setupFinished++;
		};
		p.draw = () => {
			lc.frames++;
			p.background(200);
		};
	};

	const onReady = () => lc.ready++;
</script>

{#if mounted}
	{#each ids as id (id)}
		<div style="width: 120px; height: 120px">
			{#if useSketch}
				<Sketch {sketch} {onReady} />
			{:else}
				<P5Canvas {sketch} {onReady} />
			{/if}
		</div>
	{/each}
{:else}
	<p id="away">away</p>
{/if}
