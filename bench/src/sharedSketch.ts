import type p5 from 'p5';
import { onSetup } from './instrument';

/**
 * Identical sketch used by both harnesses. Particle count is configurable
 * via the global `__benchParticleCount` so the same sketch can be reused
 * for the lifecycle-leak test (small N) and the steady-state FPS test
 * (large N).
 *
 * Both wrappers feed identical sketches to `new p5()`, so per-frame work
 * is byte-for-byte the same. The only thing the wrappers do differently
 * is mount/unmount.
 */
declare global {
	interface Window {
		__benchParticleCount?: number;
	}
}

export const sharedSketch = (p: p5) => {
	onSetup();

	const particles: { x: number; y: number; vx: number; vy: number }[] = [];
	const N = (typeof window !== 'undefined' && window.__benchParticleCount) || 80;

	p.setup = () => {
		p.createCanvas(400, 300);
		p.noStroke();
		for (let i = 0; i < N; i++) {
			particles.push({
				x: p.random(p.width),
				y: p.random(p.height),
				vx: p.random(-1, 1),
				vy: p.random(-1, 1)
			});
		}
	};

	p.draw = () => {
		p.background(245);
		p.fill(99, 102, 241);
		for (const pt of particles) {
			pt.x += pt.vx;
			pt.y += pt.vy;
			if (pt.x < 0 || pt.x > p.width) pt.vx *= -1;
			if (pt.y < 0 || pt.y > p.height) pt.vy *= -1;
			p.circle(pt.x, pt.y, 8);
		}
	};
};
