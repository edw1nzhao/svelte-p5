<script lang="ts">
	import type p5 from 'p5';

	type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

	interface Props {
		instance: p5 | null;
		position?: Position;
	}

	let { instance, position = 'bottom-right' }: Props = $props();

	let stats = $state({
		mouseX: 0,
		mouseY: 0,
		width: 0,
		height: 0,
		frameCount: 0,
		deltaTime: 0,
		fps: 0
	});

	$effect(() => {
		if (!instance) return;
		const p = instance;
		let raf = 0;
		const tick = () => {
			stats.mouseX = Math.round(p.mouseX);
			stats.mouseY = Math.round(p.mouseY);
			stats.width = p.width;
			stats.height = p.height;
			stats.frameCount = p.frameCount;
			stats.deltaTime = Math.round(p.deltaTime);
			stats.fps = Math.round(p.frameRate());
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

<div class="sketch-debug" style={positionStyles[position]}>
	<div>mouse {stats.mouseX}, {stats.mouseY}</div>
	<div>size {stats.width}×{stats.height}</div>
	<div>frame {stats.frameCount}</div>
	<div>dt {stats.deltaTime}ms · {stats.fps}fps</div>
</div>

<style>
	.sketch-debug {
		position: absolute;
		padding: 6px 10px;
		font:
			10px/1.4 ui-monospace,
			'SF Mono',
			Menlo,
			monospace;
		color: #fff;
		background: rgba(0, 0, 0, 0.7);
		border-radius: 4px;
		pointer-events: none;
		user-select: none;
		z-index: 10;
	}
	.sketch-debug > div {
		margin: 0;
	}
</style>
