<script lang="ts">
	import { createP5Bridge } from 'svelte-p5';
	import { FPSMonitor, Sketch } from 'svelte-p5-components';
	import type p5 from 'p5';

	const bridge = createP5Bridge({ radius: 40, hue: 210 });

	let instance = $state<p5 | null>(null);

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(p.windowWidth, p.windowHeight);
			p.colorMode(p.HSB, 360, 100, 100);
			p.noStroke();
		};

		p.draw = () => {
			p.background(0, 0, 96);
			p.fill(bridge.state.hue, 70, 90);
			p.circle(p.mouseX, p.mouseY, bridge.state.radius * 2);
		};
	};
</script>

<main>
	<h1>svelte-p5 components</h1>
	<div class="controls">
		<label>
			Radius
			<input type="range" min="10" max="120" bind:value={bridge.state.radius} />
		</label>
		<label>
			Hue
			<input type="range" min="0" max="360" bind:value={bridge.state.hue} />
		</label>
	</div>
	<div class="stage">
		<Sketch {sketch} bind:instance />
		<FPSMonitor {instance} />
	</div>
</main>

<style>
	main {
		font-family: system-ui, sans-serif;
		max-width: 48rem;
		margin: 2rem auto;
		padding: 0 1rem;
	}
	.controls {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 1rem;
	}
	.stage {
		position: relative;
		width: 100%;
		height: 24rem;
	}
</style>
