<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(600, 400);
			p.noStroke();
		};

		p.draw = () => {
			p.background(245);
			for (let r = 120; r > 0; r -= 20) {
				p.fill(100, 120, 180, 25);
				p.circle(p.mouseX, p.mouseY, r);
			}
		};
	};
</script>

<main>
	<h1>svelte-p5</h1>
	<p>Move the mouse over the canvas. Edit <code>src/routes/+page.svelte</code> to change it.</p>
	<P5Canvas {sketch} />
</main>

<style>
	main {
		font-family: system-ui, sans-serif;
		max-width: 40rem;
		margin: 2rem auto;
		padding: 0 1rem;
	}
</style>
