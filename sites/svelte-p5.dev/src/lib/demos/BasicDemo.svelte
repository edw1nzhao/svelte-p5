<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	const sketch = (p: p5) => {
		let x = 200;
		let y = 100;
		let vx = 3;
		let vy = 2;
		const radius = 20;

		p.setup = () => {
			p.createCanvas(400, 300);
			p.noStroke();
		};

		p.draw = () => {
			p.background(245);
			x += vx;
			y += vy;
			if (x - radius < 0 || x + radius > p.width) vx *= -1;
			if (y - radius < 0 || y + radius > p.height) vy *= -1;

			p.fill(0, 0, 0, 15);
			p.circle(x + 3, y + 3, radius * 2);
			p.fill(220, 60, 60);
			p.circle(x, y, radius * 2);
			p.fill(255, 255, 255, 80);
			p.circle(x - 6, y - 6, radius * 0.8);
		};
	};
</script>

<P5Canvas {sketch} />
