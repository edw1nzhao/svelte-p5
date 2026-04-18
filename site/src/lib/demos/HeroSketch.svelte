<script lang="ts">
	import { Sketch } from 'svelte-p5-components';
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
		const COUNT = isMobile ? 30 : 60;
		const LINK_DIST = isMobile ? 120 : 180;
		// Speed floor: when a dot's squared velocity drops below this we nudge
		// it with a tiny random impulse so the ambient drift never fully dies.
		// Tuned so the nudge is invisible frame-to-frame but keeps motion alive.
		const MIN_SPEED_SQ = 0.0008;

		// Canvas size tracking so we can react to resizes. Dots are placed in
		// the placeholder canvas during setup (we don't know the real size
		// yet — <Sketch>'s ResizeObserver doesn't fire until after setup), so
		// we redistribute on the first real-size frame and rescale on every
		// subsequent resize. Without this, dots stay clustered in the upper-
		// left 800×520 and the rest of the hero renders empty.
		let prevW = 0;
		let prevH = 0;

		p.setup = () => {
			// Initial size is a placeholder; <Sketch>'s ResizeObserver calls
			// resizeCanvas() with the actual container dimensions immediately
			// after mount, so createCanvas just needs to produce something valid.
			p.createCanvas(800, 520);
			p.colorMode(p.HSB, 360, 100, 100, 1);
			p.noStroke();
			for (let i = 0; i < COUNT; i++) {
				dots.push({
					x: p.random(p.width),
					y: p.random(p.height),
					vx: p.random(-0.12, 0.12),
					vy: p.random(-0.12, 0.12),
					hue: p.random(220, 280)
				});
			}
		};

		p.draw = () => {
			// React to any canvas size change: first-frame redistribute across
			// the now-known bounds, and on later resizes rescale positions
			// proportionally so dots keep their visual distribution.
			if (p.width !== prevW || p.height !== prevH) {
				if (prevW > 0 && prevH > 0) {
					const sx = p.width / prevW;
					const sy = p.height / prevH;
					for (const dot of dots) {
						dot.x *= sx;
						dot.y *= sy;
					}
				} else {
					for (const dot of dots) {
						dot.x = p.random(p.width);
						dot.y = p.random(p.height);
					}
				}
				prevW = p.width;
				prevH = p.height;
			}

			p.background(0, 0, 100);
			p.strokeWeight(1);
			for (let i = 0; i < dots.length; i++) {
				for (let j = i + 1; j < dots.length; j++) {
					const d = p.dist(dots[i]!.x, dots[i]!.y, dots[j]!.x, dots[j]!.y);
					if (d < LINK_DIST) {
						// Links share the dot palette (saturation 60, darker
						// brightness 52) so they read as continuous with the
						// circles instead of as separate pale threads. Alpha
						// coefficient raised 0.2 -> 0.42 so close pairs pull
						// solid-enough lines to actually trace the network,
						// while distant pairs still fade to invisible.
						p.stroke(dots[i]!.hue, 60, 52, (1 - d / LINK_DIST) * 0.42);
						p.line(dots[i]!.x, dots[i]!.y, dots[j]!.x, dots[j]!.y);
					}
				}
			}
			p.noStroke();
			for (const dot of dots) {
				dot.x += dot.vx;
				dot.y += dot.vy;

				// Clamp to bounds AND flip velocity, so dots can't get stranded
				// outside the canvas when a resize shrinks the container.
				if (dot.x < 0) {
					dot.x = 0;
					dot.vx *= -1;
				} else if (dot.x > p.width) {
					dot.x = p.width;
					dot.vx *= -1;
				}
				if (dot.y < 0) {
					dot.y = 0;
					dot.vy *= -1;
				} else if (dot.y > p.height) {
					dot.y = p.height;
					dot.vy *= -1;
				}

				// Mouse attraction with falloff: stronger the closer the dot is
				// to the cursor, fading to zero at 200px. This makes the hover
				// feel responsive near the pointer without the distant dots
				// flying in from the edges.
				const mx = p.mouseX - dot.x;
				const my = p.mouseY - dot.y;
				const md = Math.sqrt(mx * mx + my * my);
				if (md < 200 && md > 0) {
					const strength = 0.025 * (1 - md / 200);
					dot.vx += (mx / md) * strength;
					dot.vy += (my / md) * strength;
				}

				// Friction keeps mouse-kicks from accumulating indefinitely.
				dot.vx *= 0.99;
				dot.vy *= 0.99;

				// Floor: if friction has damped us below the floor, add a small
				// random impulse. Guarantees the ambient motion never flatlines.
				const speedSq = dot.vx * dot.vx + dot.vy * dot.vy;
				if (speedSq < MIN_SPEED_SQ) {
					dot.vx += (p.random() - 0.5) * 0.06;
					dot.vy += (p.random() - 0.5) * 0.06;
				}

				// Higher saturation + darker brightness so dots read as crisp
				// solid marks against the light hero gradient. The previous
				// values (saturation 55, brightness 78) gave a ~3:1 contrast
				// ratio — your eye reads low-contrast edges as soft even
				// when pixel-level they're sharp (antialiasing on a 10px
				// circle takes ~20% of the radius, so low-contrast AA looks
				// smeared). Darker values push contrast closer to 7:1 and
				// the dots read as defined circles instead of washes.
				p.fill(dot.hue, 72, 55);
				p.circle(dot.x, dot.y, 10);
			}
		};
	};
</script>

<div class="hero-backdrop absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
	{#if shouldMount}
		<!-- <Sketch> from svelte-p5-components wraps <P5Canvas> and adds a
		     ResizeObserver on its parent that calls p.resizeCanvas() whenever
		     the container changes size, plus applies p.pixelDensity(devicePixelRatio)
		     on ready. That's what makes circles stay true-round on resize and
		     sharp on HiDPI displays — neither happens with raw <P5Canvas>. -->
		<Sketch {sketch} />
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
		/* Give the hero its own named view-transition so the canvas snapshot
		   gets a dedicated fade instead of participating in the root fade,
		   which can look jank mid-animation over a live canvas. This does NOT
		   prevent p5 remount across routes — it only smooths the visual swap. */
		view-transition-name: hero-backdrop;
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
