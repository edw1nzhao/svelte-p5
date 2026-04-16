<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import { sharedSketch } from './sharedSketch';
	import { trackInstance } from './instrument';
	import type p5 from 'p5';

	let mounted = $state(true);
	let cycles = $state(0);
	let instance = $state<p5 | null>(null);

	// Patch the bound instance so we count its remove() + draw() calls.
	$effect(() => {
		if (instance) trackInstance(instance);
	});
</script>

<div data-harness="modern">
	<button id="toggle" type="button" onclick={() => ((mounted = !mounted), cycles++)}>toggle</button>
	<button
		id="cycle"
		type="button"
		onclick={() => {
			mounted = false;
			queueMicrotask(() => {
				mounted = true;
				cycles++;
			});
		}}
	>
		cycle
	</button>
	<span id="cycles" data-cycles={cycles}>{cycles}</span>
	<div id="canvas-host" style="width: 400px; height: 300px;">
		{#if mounted}
			<P5Canvas sketch={sharedSketch} bind:instance />
		{/if}
	</div>
</div>
