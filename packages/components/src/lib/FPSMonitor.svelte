<script lang="ts">
	import type p5 from 'p5';

	type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

	interface Props {
		instance: p5 | null;
		position?: Position;
		/** How many frames to average FPS over before rendering a new value. Default: 30 */
		sampleFrames?: number;
	}

	let { instance, position = 'top-right', sampleFrames = 30 }: Props = $props();

	let fps = $state(0);

	$effect(() => {
		if (!instance) return;
		const p = instance;
		let raf = 0;
		let frames = 0;
		const tick = () => {
			frames += 1;
			if (frames >= sampleFrames) {
				fps = Math.round(p.frameRate());
				frames = 0;
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
