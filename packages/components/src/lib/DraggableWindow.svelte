<script lang="ts">
	import { Draggable, type DragPlugin } from '@neodrag/svelte';
	import { untrack, type Snippet } from 'svelte';
	import { registerWindow } from './windowManager.svelte.js';

	type ConstrainTo = 'viewport' | 'parent' | 'none';

	interface Props {
		title?: string;
		initialX?: number;
		initialY?: number;
		width?: string | number;
		height?: string | number;
		minWidth?: string | number;
		minHeight?: string | number;
		/**
		 * Constrain drag within the viewport, the parent element, or not at all.
		 * With `'parent'` the window is positioned absolutely inside its parent,
		 * so the parent must be a positioning context (`position: relative` or similar).
		 */
		constrained?: ConstrainTo;
		/** Pixels of the window that must remain visible after clamp. Default: 60 */
		minVisible?: number;
		/** Lock dragging to one axis. Both axes when unset. */
		axis?: 'x' | 'y';
		/** Snap the window position to a `[x, y]` grid in px. */
		grid?: [number, number];
		/** Pointer travel in px before a drag starts. Default: 3 */
		threshold?: number;
		/** Called when the close (×) button is clicked. Omit to hide the button. */
		onClose?: () => void;
		/** Optional custom content for the title-bar (defaults to `title`). */
		header?: Snippet;
		children?: Snippet;
	}

	let {
		title = 'Window',
		initialX = 40,
		initialY = 40,
		width = 480,
		height = 320,
		minWidth = 200,
		minHeight = 120,
		constrained = 'viewport',
		minVisible = 60,
		axis,
		grid,
		threshold = 3,
		onClose,
		header,
		children
	}: Props = $props();

	function toCssSize(v: string | number): string {
		return typeof v === 'number' ? `${v}px` : v;
	}

	const win = registerWindow();

	let pos = $state(untrack(() => ({ x: initialX, y: initialY })));

	let size = $state(untrack(() => ({ w: typeof width === 'number' ? width : 480, h: 40 })));
	let rootEl: HTMLDivElement | null = $state(null);

	function clamp() {
		if (typeof window === 'undefined' || !rootEl) return;

		if (constrained === 'parent') {
			const parent = rootEl.parentElement;
			if (!parent) return;
			const r = parent.getBoundingClientRect();
			const maxX = Math.max(0, r.width - size.w);
			const maxY = Math.max(0, r.height - size.h);
			pos = {
				x: Math.max(0, Math.min(maxX, pos.x)),
				y: Math.max(0, Math.min(maxY, pos.y))
			};
			return;
		}

		if (constrained === 'viewport') {
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const minX = -(size.w - minVisible);
			const maxX = vw - minVisible;
			const minY = 0;
			const maxY = vh - minVisible;
			pos = {
				x: Math.max(minX, Math.min(maxX, pos.x)),
				y: Math.max(minY, Math.min(maxY, pos.y))
			};
		}
	}

	$effect(() => {
		if (!rootEl) return;
		const el = rootEl;
		const ro = new ResizeObserver(() => {
			const r = el.getBoundingClientRect();
			size = { w: r.width, h: r.height };
			clamp();
		});
		ro.observe(el);
		const r = el.getBoundingClientRect();
		size = { w: r.width, h: r.height };
		return () => ro.disconnect();
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const onResize = () => clamp();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		if (constrained !== 'parent' || !rootEl) return;
		const parent = rootEl.parentElement;
		if (!parent) return;
		const ro = new ResizeObserver(() => clamp());
		ro.observe(parent);
		return () => ro.disconnect();
	});

	let dragCount = $state(0);

	let dragStart = { x: 0, y: 0 };
	const axisLock: DragPlugin = {
		name: 'svelte-p5:axis-lock',
		onStart: ({ offset }) => {
			dragStart = { x: offset.x, y: offset.y };
		},
		onMove: ({ offset }) => {
			if (axis === 'x') return { x: offset.x, y: dragStart.y };
			if (axis === 'y') return { x: dragStart.x, y: offset.y };
		}
	};

	const drag = new Draggable({
		get position() {
			return pos;
		},
		get bounds() {
			return constrained === 'none' ? undefined : constrained;
		},
		get grid() {
			return grid;
		},
		get threshold() {
			return threshold;
		},
		touchAction: 'none',
		use: [axisLock],
		onDragStart: () => win.focus(),
		onDrag: ({ offset }) => {
			pos = { x: offset.x, y: offset.y };
		},
		onDragEnd: () => {
			dragCount++;
			clamp();
		}
	});
</script>

<div
	bind:this={rootEl}
	class="draggable-window"
	class:dw-fixed={constrained !== 'parent'}
	class:dw-absolute={constrained === 'parent'}
	style:width={toCssSize(width)}
	style:height={toCssSize(height)}
	style:min-width={toCssSize(minWidth)}
	style:min-height={toCssSize(minHeight)}
	style:z-index={win.z}
	onpointerdowncapture={() => win.focus()}
	data-neodrag=""
	data-neodrag-state={drag.isDragging ? 'dragging' : 'idle'}
	data-neodrag-count={dragCount}
	{...drag.attach}
>
	<div class="dw-titlebar">
		<div class="dw-handle" {...drag.handle()}>
			{#if header}{@render header()}{:else}<span class="dw-title-text">{title}</span>{/if}
		</div>
		{#if onClose}
			<button class="dw-close" onclick={onClose} aria-label="Close window">×</button>
		{/if}
	</div>
	<div class="dw-body">
		{@render children?.()}
	</div>
</div>

<style>
	.draggable-window {
		top: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		background: #fff;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 8px;
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.04),
			0 10px 30px rgba(0, 0, 0, 0.12);
		overflow: hidden;
		resize: both;
	}
	.dw-fixed {
		position: fixed;
	}
	.dw-absolute {
		position: absolute;
	}
	.dw-titlebar {
		display: flex;
		align-items: center;
		padding: 0 4px 0 10px;
		background: #f3f3f5;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
		user-select: none;
	}
	.dw-handle {
		flex: 1;
		padding: 6px 0;
		cursor: move;
		font:
			12px/1.4 system-ui,
			-apple-system,
			sans-serif;
		font-weight: 600;
		color: #333;
	}
	.dw-title-text {
		display: inline-block;
		vertical-align: middle;
	}
	.dw-close {
		background: none;
		border: 0;
		font:
			18px/1 system-ui,
			sans-serif;
		color: #555;
		cursor: pointer;
		padding: 2px 8px;
		border-radius: 4px;
	}
	.dw-close:hover {
		background: rgba(0, 0, 0, 0.06);
		color: #000;
	}
	.dw-body {
		flex: 1;
		overflow: hidden;
		position: relative;
	}
</style>
