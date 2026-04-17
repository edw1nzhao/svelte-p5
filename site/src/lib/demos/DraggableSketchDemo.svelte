<script lang="ts">
	import { DraggableSketch } from 'svelte-p5-components';
	import type p5 from 'p5';

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(260, 180);
			p.colorMode(p.HSB, 360, 100, 100, 1);
			p.noStroke();
		};
		p.draw = () => {
			p.background(220, 20, 12);
			const t = p.frameCount * 0.03;
			for (let i = 0; i < 16; i++) {
				const a = (i / 16) * p.TWO_PI + t;
				const r = 50 + Math.sin(t + i * 0.5) * 16;
				p.fill((220 + i * 8) % 360, 70, 90);
				p.circle(p.width / 2 + Math.cos(a) * r, p.height / 2 + Math.sin(a) * r, 10);
			}
		};
	};
</script>

<!-- h-full fills the CodeDemo cell, which the shared grid sizes to match
     the bordered code card on the left. The DraggableSketch window itself
     is absolutely positioned and contributes nothing to flow height, so
     without a sized parent the container would collapse to 0 and
     overflow-hidden would clip the window entirely — h-full gives it real
     pixels to work with. -->
<div
	class="relative h-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 overflow-hidden"
>
	<!-- Subtle grid backdrop -->
	<svg
		class="absolute inset-0 w-full h-full opacity-40"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<defs>
			<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
				<path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgb(51,65,85)" stroke-width="0.5" />
			</pattern>
		</defs>
		<rect width="100%" height="100%" fill="url(#grid)" />
	</svg>

	<DraggableSketch
		{sketch}
		title="orbit.svelte"
		initialX={20}
		initialY={20}
		width={280}
		height={220}
		constrained="parent"
	/>

	<div
		class="absolute bottom-3 left-1/2 -translate-x-1/2 text-[0.6875rem] text-slate-300 bg-slate-800/85 backdrop-blur px-2.5 py-1 rounded font-mono pointer-events-none whitespace-nowrap"
	>
		drag the title bar to move
	</div>
</div>
