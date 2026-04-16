<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	// A minimal instance-mode sketch. The library passes the p5 instance;
	// you assign setup/draw/etc. on it. Nothing else wired up.
	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(600, 400);
			p.noStroke();
		};

		p.draw = () => {
			p.background(245);

			// Concentric circles that follow the mouse.
			for (let r = 120; r > 0; r -= 20) {
				p.fill(100, 120, 180, 25);
				p.circle(p.mouseX, p.mouseY, r);
			}
		};
	};
</script>

<main>
	<h1>01 · Basic sketch</h1>
	<p>
		A minimal <code>&lt;P5Canvas&gt;</code> mount. The wrapper handles lifecycle and cleanup so your
		sketch just defines <code>setup</code> and <code>draw</code>.
	</p>
	<div class="canvas-frame">
		<P5Canvas {sketch} />
	</div>
</main>

<style>
	main {
		max-width: 720px;
		margin: 40px auto;
		padding: 0 24px;
	}
	h1 {
		margin: 0 0 8px;
	}
	p {
		color: #555;
	}
	.canvas-frame {
		margin-top: 24px;
		border: 1px solid #e3e3e3;
		border-radius: 8px;
		overflow: hidden;
		background: #fff;
		display: inline-block;
	}
</style>
