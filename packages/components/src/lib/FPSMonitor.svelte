<script lang="ts">
	import type p5 from 'p5';
	import { sketchContext } from './sketch-context.js';

	type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

	interface Props {
		/** Defaults to the instance of the enclosing `<Sketch>` or `<P5Canvas>`. */
		instance?: p5 | null;
		position?: Position;
		/** How many frames to average FPS over before rendering a new value. Default: 30 */
		sampleFrames?: number;
	}

	let { instance, position = 'top-right', sampleFrames = 30 }: Props = $props();

	let fps = $state(0);

	const context = sketchContext();
	const target = $derived(instance ?? context?.instance ?? null);

	$effect(() => {
		if (!target) return;
		const p = target;
		let raf = 0;
		let ticks = 0;
		let startTime = -1;
		let startCount = 0;
		// Count draws rather than read frameRate(), which stays at its last value while
		// a 'demand' or 'manual' sketch is idle.
		const tick = () => {
			const time = performance.now();
			if (startTime < 0) {
				startTime = time;
				startCount = p.frameCount;
			} else if (++ticks >= sampleFrames && time > startTime) {
				fps = Math.round(((p.frameCount - startCount) * 1000) / (time - startTime));
				ticks = 0;
				startTime = time;
				startCount = p.frameCount;
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	const positionStyles: Record<Position, string> = {
		'top-left': 'top: 8px; left: 8px;',
		'top-right': 'top: 8px; right: 8px;',
		'bottom-left': 'bottom: 8px; left: 8px;',
		'bottom-right': 'bottom: 8px; right: 8px;'
	};
</script>

<div class="fps-monitor" style={positionStyles[position]}>
	{fps} fps
</div>

<style>
	.fps-monitor {
		position: absolute;
		padding: 4px 8px;
		font:
			11px/1 ui-monospace,
			'SF Mono',
			Menlo,
			monospace;
		color: #fff;
		background: rgba(0, 0, 0, 0.65);
		border-radius: 4px;
		pointer-events: none;
		user-select: none;
		z-index: 10;
	}
</style>
