import type p5 from 'p5';
import { dashboard } from './sharedState.svelte';

/**
 * Three sketches that all read from the shared dashboard state.
 * Because the state is a `$state` proxy, reading fields inside the
 * draw loop always sees the latest values - no subscriptions needed.
 */

export const orbitSketch = (p: p5) => {
	p.setup = () => {
		p.createCanvas(400, 300);
		p.colorMode(p.HSB, 360, 100, 100, 1);
	};
	p.draw = () => {
		p.background(220, 20, 15);
		const cx = p.width / 2;
		const cy = p.height / 2;
		const count = Math.floor(24 * dashboard.density);
		p.noStroke();
		for (let i = 0; i < count; i++) {
			const a = (i / count) * p.TWO_PI + dashboard.tick * 0.01;
			const r = 80 + Math.sin(dashboard.tick * 0.02 + i) * 30;
			p.fill((dashboard.hue + i * 4) % 360, 70, 90, 0.85);
			p.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 12);
		}
	};
};

export const gridSketch = (p: p5) => {
	p.setup = () => {
		p.createCanvas(400, 300);
		p.colorMode(p.HSB, 360, 100, 100, 1);
		p.noStroke();
	};
	p.draw = () => {
		p.background(220, 20, 15);
		const cols = Math.max(4, Math.floor(20 * dashboard.density));
		const rows = Math.max(3, Math.floor(15 * dashboard.density));
		const cw = p.width / cols;
		const ch = p.height / rows;
		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				const d = Math.hypot(i - cols / 2, j - rows / 2);
				const v = (Math.sin(d * 0.4 - dashboard.tick * 0.04) + 1) / 2;
				p.fill((dashboard.hue + d * 8) % 360, 60, 30 + v * 70);
				p.rect(i * cw, j * ch, cw + 1, ch + 1);
			}
		}
	};
};

export const noiseSketch = (p: p5) => {
	p.setup = () => {
		p.createCanvas(400, 300);
		p.colorMode(p.HSB, 360, 100, 100, 1);
		p.noStroke();
	};
	p.draw = () => {
		p.background(220, 20, 15, 0.2);
		const count = Math.floor(40 * dashboard.density);
		for (let i = 0; i < count; i++) {
			const nx = p.noise(i * 0.1, dashboard.tick * 0.01);
			const ny = p.noise(i * 0.1 + 100, dashboard.tick * 0.01);
			p.fill((dashboard.hue + i * 3) % 360, 50, 95, 0.5);
			p.circle(nx * p.width, ny * p.height, 8);
		}
	};
};
