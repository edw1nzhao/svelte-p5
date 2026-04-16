<script lang="ts">
	import { Sketch, FPSMonitor } from 'svelte-p5-components';
	import type p5 from 'p5';

	let instance = $state<p5 | null>(null);

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(400, 300);
			p.colorMode(p.HSB, 360, 100, 100, 1);
			p.noStroke();
		};

		p.draw = () => {
			p.background(220, 20, 15);
			const t = p.frameCount * 0.02;
			for (let i = 0; i < 24; i++) {
				const a = (i / 24) * p.TWO_PI + t;
				const r = 80 + Math.sin(t + i) * 30;
				p.fill((200 + i * 15) % 360, 70, 90);
				p.circle(p.width / 2 + Math.cos(a) * r, p.height / 2 + Math.sin(a) * r, 14);
			}
		};
	};
</script>

<div class="relative w-full h-full bg-[#1a1a2e]">
	<Sketch {sketch} bind:instance />
	<FPSMonitor {instance} />
</div>
