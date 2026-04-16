<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	/**
	 * One bridge, two sketches. Move the sliders and both canvases react.
	 * In a real app this would live in a `.svelte.ts` file as a class so it
	 * could be imported anywhere - here we keep it inline to fit the demo.
	 */
	const shared = createP5Bridge({
		hue: 200,
		speed: 1,
		count: 18
	});

	const orbitSketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(220, 220);
			p.colorMode(p.HSB, 360, 100, 100, 1);
			p.noStroke();
		};
		p.draw = () => {
			p.background(220, 20, 12);
			const t = p.frameCount * 0.02 * shared.state.speed;
			const cx = p.width / 2;
			const cy = p.height / 2;
			for (let i = 0; i < shared.state.count; i++) {
				const a = (i / shared.state.count) * p.TWO_PI + t;
				const r = 60 + Math.sin(t + i) * 18;
				p.fill((shared.state.hue + i * 6) % 360, 70, 90, 0.85);
				p.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 12);
			}
		};
	};

	const gridSketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(220, 220);
			p.colorMode(p.HSB, 360, 100, 100, 1);
			p.noStroke();
		};
		p.draw = () => {
			p.background(220, 20, 12);
			const t = p.frameCount * 0.04 * shared.state.speed;
			const cols = shared.state.count;
			const rows = shared.state.count;
			const cw = p.width / cols;
			const ch = p.height / rows;
			for (let j = 0; j < rows; j++) {
				for (let i = 0; i < cols; i++) {
					const d = Math.hypot(i - cols / 2, j - rows / 2);
					const v = (Math.sin(d * 0.45 - t) + 1) / 2;
					p.fill((shared.state.hue + d * 8) % 360, 60, 28 + v * 65);
					p.rect(i * cw, j * ch, cw + 1, ch + 1);
				}
			}
		};
	};
</script>

<div class="flex flex-col h-full bg-slate-900">
	<div class="grid grid-cols-2 gap-px bg-slate-800 flex-1 min-h-0">
		<div class="bg-slate-900 overflow-hidden">
			<P5Canvas sketch={orbitSketch} />
		</div>
		<div class="bg-slate-900 overflow-hidden">
			<P5Canvas sketch={gridSketch} />
		</div>
	</div>
	<div class="flex gap-3 px-3 py-2.5 bg-slate-800 border-t border-slate-700 shrink-0">
		<label
			class="flex-1 flex items-center gap-1.5 text-[0.6875rem] text-slate-300 whitespace-nowrap"
		>
			hue
			<input
				type="range"
				min="0"
				max="360"
				bind:value={shared.state.hue}
				class="flex-1 min-w-0 accent-indigo-400"
			/>
			<span class="font-mono tabular-nums text-slate-400 min-w-8 text-right"
				>{shared.state.hue}&deg;</span
			>
		</label>
		<label
			class="flex-1 flex items-center gap-1.5 text-[0.6875rem] text-slate-300 whitespace-nowrap"
		>
			speed
			<input
				type="range"
				min="0.2"
				max="3"
				step="0.1"
				bind:value={shared.state.speed}
				class="flex-1 min-w-0 accent-indigo-400"
			/>
			<span class="font-mono tabular-nums text-slate-400 min-w-8 text-right"
				>{shared.state.speed.toFixed(1)}x</span
			>
		</label>
		<label
			class="flex-1 flex items-center gap-1.5 text-[0.6875rem] text-slate-300 whitespace-nowrap"
		>
			count
			<input
				type="range"
				min="6"
				max="40"
				bind:value={shared.state.count}
				class="flex-1 min-w-0 accent-indigo-400"
			/>
			<span class="font-mono tabular-nums text-slate-400 min-w-8 text-right"
				>{shared.state.count}</span
			>
		</label>
	</div>
</div>

<style>
	div :global(canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}
</style>
