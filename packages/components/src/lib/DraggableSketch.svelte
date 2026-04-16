<script lang="ts">
	import DraggableWindow from './DraggableWindow.svelte';
	import Sketch from './Sketch.svelte';
	import type { SketchFn } from 'svelte-p5';
	import type { Plugin } from '@neodrag/svelte';
	import type p5 from 'p5';

	interface Props {
		sketch: SketchFn;
		title?: string;
		initialX?: number;
		initialY?: number;
		width?: string | number;
		height?: string | number;
		minWidth?: string | number;
		minHeight?: string | number;
		minVisible?: number;
		hidpi?: boolean;
		constrained?: 'viewport' | 'parent' | 'none';
		/** Extra neodrag plugins appended to the ones DraggableWindow sets internally. Escape hatch for power users (axis, grid, threshold, etc.). */
		plugins?: Plugin<unknown>[];
		onClose?: () => void;
		instance?: p5 | null;
	}

	let {
		sketch,
		title = 'Sketch',
		initialX = 40,
		initialY = 40,
		width = 400,
		height = 300,
		minWidth = 200,
		minHeight = 150,
		minVisible = 60,
		hidpi = true,
		constrained = 'viewport',
		plugins,
		onClose,
		instance = $bindable(null)
	}: Props = $props();
</script>

<DraggableWindow
	{title}
	{initialX}
	{initialY}
	{width}
	{height}
	{minWidth}
	{minHeight}
	{minVisible}
	{constrained}
	{plugins}
	{onClose}
>
	<Sketch {sketch} {hidpi} bind:instance />
</DraggableWindow>
