<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
	}

	const bridge = createP5Bridge({
		radius: 12,
		hue: 200,
		speed: 2
	});

	const sketch = (p: p5) => {
		const particles: Particle[] = [];

		p.setup = () => {
			p.createCanvas(400, 300);
			p.colorMode(p.HSB, 360, 100, 100, 1);
			p.noStroke();
			for (let i = 0; i < 80; i++) {
				particles.push({
					x: p.random(p.width),
					y: p.random(p.height),
					vx: p.random(-1, 1),
					vy: p.random(-1, 1)
				});
			}
		};

		p.draw = () => {
			p.background(220, 6, 98, 0.08);
			p.fill(bridge.state.hue, 70, 90, 0.85);
			for (const pt of particles) {
				pt.x += pt.vx * bridge.state.speed;
				pt.y += pt.vy * bridge.state.speed;
				if (pt.x < 0 || pt.x > p.width) pt.vx *= -1;
				if (pt.y < 0 || pt.y > p.height) pt.vy *= -1;
				p.circle(pt.x, pt.y, bridge.state.radius);
			}
		};
	};
</script>

<div class="flex flex-col h-full">
	<P5Canvas {sketch} />
	<div class="flex gap-4 px-3 py-2 bg-slate-50 border-t border-slate-200 shrink-0">
		<label
			class="flex-1 flex items-center gap-1.5 text-[0.6875rem] text-slate-500 whitespace-nowrap"
		>
			radius
			<input
				type="range"
				min="4"
				max="40"
				bind:value={bridge.state.radius}
				class="flex-1 min-w-0 accent-indigo-500"
			/>
			<span class="font-mono tabular-nums text-slate-400 min-w-8 text-right"
				>{bridge.state.radius}</span
			>
		</label>
		<label
			class="flex-1 flex items-center gap-1.5 text-[0.6875rem] text-slate-500 whitespace-nowrap"
		>
			hue
			<input
				type="range"
				min="0"
				max="360"
				bind:value={bridge.state.hue}
				class="flex-1 min-w-0 accent-indigo-500"
			/>
			<span class="font-mono tabular-nums text-slate-400 min-w-8 text-right"
				>{bridge.state.hue}&deg;</span
			>
		</label>
		<label
			class="flex-1 flex items-center gap-1.5 text-[0.6875rem] text-slate-500 whitespace-nowrap"
		>
			speed
			<input
				type="range"
				min="0.5"
				max="6"
				step="0.1"
				bind:value={bridge.state.speed}
				class="flex-1 min-w-0 accent-indigo-500"
			/>
			<span class="font-mono tabular-nums text-slate-400 min-w-8 text-right"
				>{bridge.state.speed.toFixed(1)}</span
			>
		</label>
	</div>
</div>

<style>
	/* Canvas needs flex: 1 to fill remaining space above controls */
	div :global(canvas) {
		flex: 1;
		min-height: 0;
	}
</style>
