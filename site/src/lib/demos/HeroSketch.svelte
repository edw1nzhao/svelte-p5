<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';
	import { onMount } from 'svelte';

	// shouldMount gates the p5 import + instantiation. It stays false during
	// SSR and hydration; flipping it client-side triggers the dynamic import.
	//
	// Why defer: p5 is ~250 KiB gzipped and dominates the critical path. By
	// waiting for requestIdleCallback, FCP/LCP stop blocking on the p5 fetch
	// + parse. The CSS backdrop below covers the hero area in the meantime.
	//
	// Why skip entirely on mobile / reduced-motion / save-data: these users
	// benefit most from not downloading p5 at all. The decorative canvas
	// (aria-hidden) isn't worth the CPU + bandwidth.
	let shouldMount = $state(false);
	let isMobile = false;

	onMount(() => {
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		isMobile = window.matchMedia('(max-width: 640px)').matches;
		// navigator.connection is Chromium-only; treat unknown as "no saver".
		const saveData = Boolean(
			(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
		);

		if (reduceMotion || isMobile || saveData) return;

		const schedule =
			'requestIdleCallback' in window
				? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2000 })
				: (cb: () => void) => window.setTimeout(cb, 200);

		schedule(() => {
			shouldMount = true;
		});
	});

	const sketch = (p: p5) => {
		const dots: { x: number; y: number; vx: number; vy: number; hue: number }[] = [];
		// Only desktop reaches this path (mobile is short-circuited above),
		// but keep the mobile-tuned constants in case the breakpoint changes.
		const COUNT = isMobile ? 30 : 60;
		const LINK_DIST = isMobile ? 120 : 180;

		p.setup = () => {
			p.createCanvas(p.windowWidth, 520);
			p.pixelDensity(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
			p.colorMode(p.HSB, 360, 100, 100, 1);
			p.noStroke();
			for (let i = 0; i < COUNT; i++) {
				dots.push({
					x: p.random(p.width),
					y: p.random(p.height),
					vx: p.random(-0.4, 0.4),
					vy: p.random(-0.4, 0.4),
					hue: p.random(220, 280)
				});
			}
		};

		p.windowResized = () => {
			p.resizeCanvas(p.windowWidth, 520);
		};

		p.draw = () => {
			p.background(0, 0, 100);
			p.strokeWeight(1);
			for (let i = 0; i < dots.length; i++) {
				for (let j = i + 1; j < dots.length; j++) {
					const d = p.dist(dots[i]!.x, dots[i]!.y, dots[j]!.x, dots[j]!.y);
					if (d < LINK_DIST) {
						p.stroke(dots[i]!.hue, 35, 75, (1 - d / LINK_DIST) * 0.2);
						p.line(dots[i]!.x, dots[i]!.y, dots[j]!.x, dots[j]!.y);
					}
				}
			}
			p.noStroke();
			for (const dot of dots) {
				dot.x += dot.vx;
				dot.y += dot.vy;
				if (dot.x < 0 || dot.x > p.width) dot.vx *= -1;
				if (dot.y < 0 || dot.y > p.height) dot.vy *= -1;
				const mx = p.mouseX - dot.x;
				const my = p.mouseY - dot.y;
				const md = Math.sqrt(mx * mx + my * my);
				if (md < 200 && md > 0) {
					dot.vx += (mx / md) * 0.01;
					dot.vy += (my / md) * 0.01;
				}
				dot.vx *= 0.995;
				dot.vy *= 0.995;
				p.fill(dot.hue, 45, 75, 0.6);
				p.circle(dot.x, dot.y, 8);
			}
		};
	};
</script>

<div class="hero-backdrop absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
	{#if shouldMount}
		<P5Canvas {sketch} />
	{/if}
</div>

<style>
	/* Decorative gradient shown before p5 loads, and permanently for mobile /
	   reduced-motion / save-data users who never mount the sketch. Matches the
	   hue range the sketch uses so there's continuity when the canvas fades in. */
	.hero-backdrop {
		background:
			radial-gradient(60% 80% at 20% 30%, rgb(99 102 241 / 0.1), transparent 60%),
			radial-gradient(50% 70% at 85% 60%, rgb(139 92 246 / 0.08), transparent 55%),
			linear-gradient(to bottom, rgb(248 250 252), rgb(241 245 249));
	}

	/* Canvas must fill the hero - needs !important to override p5's inline styles.
	   Fade in so there's no harsh pop when the sketch finishes loading. */
	.hero-backdrop :global(canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
		animation: hero-canvas-in 320ms ease-out both;
	}

	@keyframes hero-canvas-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-backdrop :global(canvas) {
			animation: none;
		}
	}
</style>
