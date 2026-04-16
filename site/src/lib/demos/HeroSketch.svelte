<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';
	import { onMount } from 'svelte';

	let reduceMotion = $state(false);
	let isMobile = $state(false);

	onMount(() => {
		reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		isMobile = window.matchMedia('(max-width: 640px)').matches;
	});

	const sketch = (p: p5) => {
		const dots: { x: number; y: number; vx: number; vy: number; hue: number }[] = [];
		// Lower particle count + lower density on mobile for FPS
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
			if (reduceMotion) {
				// Render one frame, then stop
				p.draw();
				p.noLoop();
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

<div class="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
	<P5Canvas {sketch} />
</div>

<style>
	/* Canvas must fill the hero - needs !important to override p5's inline styles */
	div :global(canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}
</style>
