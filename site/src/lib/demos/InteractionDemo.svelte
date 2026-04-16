<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import { hitTest } from 'svelte-p5/utils';
	import type p5 from 'p5';

	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		hue: number;
		life: number;
	}

	interface Target {
		id: string;
		x: number;
		y: number;
		r: number;
	}

	const targets: Target[] = [
		{ id: 'a', x: 90, y: 90, r: 28 },
		{ id: 'b', x: 220, y: 130, r: 28 },
		{ id: 'c', x: 130, y: 200, r: 28 }
	];

	const ui = createP5Bridge<{ hovered: string | null; particles: number }>({
		hovered: null,
		particles: 0
	});

	const sketch = (p: p5) => {
		const particles: Particle[] = [];

		p.setup = () => {
			p.createCanvas(360, 270);
			p.colorMode(p.HSB, 360, 100, 100, 1);
			p.noStroke();
		};

		p.mousePressed = () => {
			if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
			for (let i = 0; i < 20; i++) {
				const a = p.random(p.TWO_PI);
				const s = p.random(1, 4);
				particles.push({
					x: p.mouseX,
					y: p.mouseY,
					vx: Math.cos(a) * s,
					vy: Math.sin(a) * s,
					hue: p.random(180, 320),
					life: 1
				});
			}
			ui.state.particles = particles.length;
		};

		p.draw = () => {
			p.background(220, 20, 12);

			// Hit-test targets, update shared hover state
			let hover: string | null = null;
			for (const t of targets) {
				if (hitTest.circle(p.mouseX, p.mouseY, t.x, t.y, t.r * 2)) hover = t.id;
			}
			if (ui.state.hovered !== hover) ui.state.hovered = hover;

			// Draw targets
			for (const t of targets) {
				const isHover = ui.state.hovered === t.id;
				p.fill(isHover ? 200 : 220, isHover ? 80 : 30, isHover ? 95 : 60, isHover ? 0.95 : 0.6);
				p.circle(t.x, t.y, t.r * 2);
				p.fill(0, 0, 100, 0.95);
				p.textSize(11);
				p.textAlign(p.CENTER, p.CENTER);
				p.text(t.id.toUpperCase(), t.x, t.y);
			}

			// Update + draw particles
			for (let i = particles.length - 1; i >= 0; i--) {
				const pt = particles[i]!;
				pt.x += pt.vx;
				pt.y += pt.vy;
				pt.vy += 0.08;
				pt.life -= 0.012;
				if (pt.life <= 0) {
					particles.splice(i, 1);
					continue;
				}
				p.fill(pt.hue, 70, 95, pt.life);
				p.circle(pt.x, pt.y, 6 * pt.life + 2);
			}
			if (ui.state.particles !== particles.length) ui.state.particles = particles.length;
		};
	};
</script>

<div class="flex flex-col h-full bg-slate-900">
	<div class="flex-1 min-h-0 relative overflow-hidden">
		<P5Canvas {sketch} />
		<div
			class="absolute top-2 left-2 text-[0.6875rem] text-slate-300 bg-slate-800/80 backdrop-blur px-2 py-1 rounded pointer-events-none font-mono"
		>
			click to add particles
		</div>
	</div>
	<div
		class="flex justify-between items-center px-3 py-2.5 bg-slate-800 border-t border-slate-700 shrink-0 text-[0.6875rem] font-mono"
	>
		<span class="text-slate-400">
			hovered: <span class="text-indigo-300"
				>{ui.state.hovered === null ? 'none' : ui.state.hovered}</span
			>
		</span>
		<span class="text-slate-400">
			particles: <span class="text-indigo-300 tabular-nums">{ui.state.particles}</span>
		</span>
	</div>
</div>

<style>
	div :global(canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}
</style>
