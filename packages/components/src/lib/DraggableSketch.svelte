<script lang="ts">
	import DraggableWindow from './DraggableWindow.svelte';
	import Sketch from './Sketch.svelte';
	import type { SketchFn } from 'svelte-p5';
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
		/** Lock dragging to one axis. Both axes when unset. */
		axis?: 'x' | 'y';
		/** Snap the window position to a `[x, y]` grid in px. */
		grid?: [number, number];
		/** Pointer travel in px before a drag starts. Default: 3 */
		threshold?: number;
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
		axis,
		grid,
		threshold,
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
	{axis}
	{grid}
	{threshold}
	{onClose}
>
	<Sketch {sketch} {hidpi} bind:instance />
</DraggableWindow>
