<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import { disableFES } from 'svelte-p5/utils';
	import { FPSMonitor } from 'svelte-p5-components';
	import type p5 from 'p5';

	// Disable p5's Friendly Error System before we create any instance (perf win).
	disableFES();

	// One bridge, many inputs. Every field is reactive — writes from the UI
	// are visible to the sketch on the very next frame; writes from inside
	// the sketch (e.g. from mousePressed) are visible to Svelte immediately.
	const bridge = createP5Bridge({
		particleCount: 180,
		speed: 2,
		radius: 4,
		trail: 0.08,
		hue: 200,
		paused: false,
		clicks: 0
	});

	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
	}

	let instance = $state<p5 | null>(null);

	const sketch = (p: p5) => {
		const particles: Particle[] = [];

		const respawn = () => {
			particles.length = 0;
			for (let i = 0; i < bridge.state.particleCount; i++) {
				particles.push({
					x: p.random(p.width),
					y: p.random(p.height),
					vx: p.random(-1, 1),
					vy: p.random(-1, 1)
				});
			}
		};

		p.setup = () => {
			p.createCanvas(600, 400);
			p.colorMode(p.HSB, 360, 100, 100, 1);
			respawn();
		};

		// Svelte-side clicks reset; p5-side clicks count up.
		p.mousePressed = () => {
			bridge.state.clicks += 1;
			respawn();
		};

		p.draw = () => {
			// "Trail" effect: semi-transparent background each frame.
			p.noStroke();
			p.fill(220, 6, 98, bridge.state.trail);
			p.rect(0, 0, p.width, p.height);

			// If the UI changes the count, keep the particle list in sync.
			while (particles.length < bridge.state.particleCount) {
				particles.push({
					x: p.random(p.width),
					y: p.random(p.height),
					vx: p.random(-1, 1),
					vy: p.random(-1, 1)
				});
			}
			while (particles.length > bridge.state.particleCount) particles.pop();

			if (bridge.state.paused) return;

			p.noStroke();
			p.fill(bridge.state.hue, 70, 90, 0.85);

			const s = bridge.state.speed;
			const r = bridge.state.radius;
			for (const pt of particles) {
				pt.x += pt.vx * s;
				pt.y += pt.vy * s;
				if (pt.x < 0 || pt.x > p.width) pt.vx *= -1;
				if (pt.y < 0 || pt.y > p.height) pt.vy *= -1;
				p.circle(pt.x, pt.y, r * 2);
			}
		};
	};
</script>

<main>
	<h1>02 · Reactive state bridge</h1>
	<p>
		One <code>createP5Bridge</code> shared between Svelte UI and the sketch. UI writes flow into the
		draw loop; sketch writes flow back to the UI. No subscriptions, no <code>bind:</code>
		chains — just a <code>$state</code> proxy.
	</p>

	<div class="layout">
		<div class="controls">
			<label>
				particles <span>{bridge.state.particleCount}</span>
				<input type="range" min="10" max="1000" bind:value={bridge.state.particleCount} />
			</label>
			<label>
				speed <span>{bridge.state.speed.toFixed(1)}</span>
				<input type="range" min="0.1" max="8" step="0.1" bind:value={bridge.state.speed} />
			</label>
			<label>
				radius <span>{bridge.state.radius}</span>
				<input type="range" min="1" max="20" bind:value={bridge.state.radius} />
			</label>
			<label>
				trail <span>{bridge.state.trail.toFixed(2)}</span>
				<input type="range" min="0.01" max="1" step="0.01" bind:value={bridge.state.trail} />
			</label>
			<label>
				hue <span>{bridge.state.hue}°</span>
				<input type="range" min="0" max="360" bind:value={bridge.state.hue} />
			</label>
			<label class="checkbox">
				<input type="checkbox" bind:checked={bridge.state.paused} />
				<span>paused</span>
			</label>
			<p class="clicks">
				canvas clicks (written by sketch, read here):
				<strong>{bridge.state.clicks}</strong>
			</p>
		</div>

		<div class="canvas-frame">
			<P5Canvas {sketch} bind:instance />
			<FPSMonitor {instance} position="top-right" />
		</div>
	</div>
</main>

<style>
	main {
		max-width: 960px;
		margin: 40px auto;
		padding: 0 24px;
	}
	h1 {
		margin: 0 0 8px;
	}
	p {
		color: #555;
	}
	.layout {
		display: grid;
		grid-template-columns: 220px 1fr;
		gap: 24px;
		margin-top: 24px;
		align-items: start;
	}
	.controls {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		background: #fff;
		border: 1px solid #e3e3e3;
		border-radius: 8px;
	}
	.controls label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font:
			12px/1.4 system-ui,
			sans-serif;
		color: #444;
	}
	.controls label span {
		color: #888;
		font-variant-numeric: tabular-nums;
	}
	.controls label.checkbox {
		flex-direction: row;
		align-items: center;
		gap: 8px;
	}
	.controls input[type='range'] {
		width: 100%;
	}
	.clicks {
		font:
			12px/1.4 system-ui,
			sans-serif;
		margin: 8px 0 0;
	}
	.canvas-frame {
		position: relative;
		border: 1px solid #e3e3e3;
		border-radius: 8px;
		overflow: hidden;
		background: #fff;
		display: inline-block;
	}
</style>
