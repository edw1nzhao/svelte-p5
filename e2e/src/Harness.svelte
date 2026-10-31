<script lang="ts">
	import p5 from 'p5';
	import { P5Canvas, type SketchFn } from 'svelte-p5';
	import { Sketch } from 'svelte-p5-components';
	import type { E2EState } from './state.js';

	const params = new URLSearchParams(window.location.search);
	const component = params.get('component') ?? 'sketch';
	const setupKind = params.get('setup') ?? 'sync';
	const hidpiParam = params.get('hidpi') ?? 'true';
	const misuse = params.has('fes');
	const hidpi = hidpiParam === 'true' ? true : hidpiParam === 'false' ? false : Number(hidpiParam);

	const state: E2EState = {
		p5Version: (p5 as unknown as { VERSION: string }).VERSION,
		events: [],
		readyCount: 0,
		firstFrame: null,
		frames: 0,
		disableFriendlyErrors: undefined
	};
	window.__e2e = state;

	let host: HTMLDivElement;

	const sketch: SketchFn = (p) => {
		if (setupKind === 'sync') {
			p.setup = () => {
				state.events.push('setup');
				p.createCanvas(100, 100);
			};
		} else if (setupKind === 'async') {
			p.setup = (async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
				p.createCanvas(100, 100);
				state.events.push('setup');
			}) as unknown as () => void;
		}
		p.draw = () => {
			p.background(220);
			state.frames++;
			if (state.frames !== 1) return;
			state.events.push('draw');
			if (misuse) p.circle('x' as unknown as number, 10, 10);
			const canvas = host.querySelector('canvas')!;
			const rect = canvas.getBoundingClientRect();
			state.firstFrame = {
				cssWidth: rect.width,
				cssHeight: rect.height,
				backingWidth: canvas.width,
				backingHeight: canvas.height,
				density: p.pixelDensity()
			};
		};
	};

	function onReady() {
		state.readyCount++;
		state.events.push('ready');
		state.disableFriendlyErrors = (
			p5 as unknown as { disableFriendlyErrors?: boolean }
		).disableFriendlyErrors;
	}
</script>

<div id="host" bind:this={host} style="width: 320px; height: 200px;">
	{#if component === 'canvas'}
		<P5Canvas {sketch} {onReady} />
	{:else}
		<Sketch {sketch} {hidpi} {onReady} />
	{/if}
</div>
