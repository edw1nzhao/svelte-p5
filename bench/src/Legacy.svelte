<script lang="ts">
	import LegacyP5Canvas from './LegacyP5Canvas.svelte';
	import { sharedSketch } from './sharedSketch';
	import { trackInstance } from './instrument';
	import type p5 from 'p5';

	let mounted = $state(true);
	let cycles = $state(0);
	let instance = $state<p5 | null>(null);

	$effect(() => {
		if (instance) trackInstance(instance);
	});
</script>

<div data-harness="legacy">
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
			<LegacyP5Canvas sketch={sharedSketch} bind:instance />
		{/if}
	</div>
</div>
