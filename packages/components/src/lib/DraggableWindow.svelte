<script lang="ts">
	import {
		draggable,
		controls,
		ControlFrom,
		bounds,
		BoundsFrom,
		events,
		position,
		Compartment,
		type Plugin
	} from '@neodrag/svelte';
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
		/** Constrain drag within the viewport, the parent element, or not at all. */
		constrained?: ConstrainTo;
		/** Pixels of the window that must remain visible after clamp. Default: 60 */
		minVisible?: number;
		/** Extra neodrag plugins appended to the ones the window sets internally. Escape hatch for power users (axis, grid, threshold, etc.). */
		plugins?: Plugin<unknown>[];
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
		plugins: userPlugins,
		onClose,
		header,
		children
	}: Props = $props();

	function toCssSize(v: string | number): string {
		return typeof v === 'number' ? `${v}px` : v;
	}

	// Focus management — each window gets a reactive z-index slot shared
	// across every DraggableWindow on the page. Clicking brings it to top.
	const win = registerWindow();

	// Live position. Neodrag's `position` plugin drives the element via
	// transform; we update this state from onDrag AND on resize/clamp,
	// and the Compartment re-evaluates to push changes back into neodrag.
	// `untrack` prevents these props from forming a reactive dep — they're
	// *initial* values only; later position comes from user drag.
	let pos = $state(untrack(() => ({ x: initialX, y: initialY })));

	// Window size (tracked so we can compute clamp bounds). Updated once
	// the element mounts and on every resize of the element itself.
	let size = $state(untrack(() => ({ w: typeof width === 'number' ? width : 480, h: 40 })));
	let rootEl: HTMLDivElement | null = $state(null);

	function clampToViewport() {
		if (typeof window === 'undefined') return;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		// Never allow the titlebar above the viewport top — that's the
		// "unreachable" case. Allow partial horizontal overflow so narrow
		// screens don't trap wide windows, but always keep `minVisible`
		// pixels of the window on-screen for a grab handle.
		const minX = -(size.w - minVisible);
		const maxX = vw - minVisible;
		const minY = 0;
		const maxY = vh - minVisible;
		pos = {
			x: Math.max(minX, Math.min(maxX, pos.x)),
			y: Math.max(minY, Math.min(maxY, pos.y))
		};
	}

	// Keep size fresh (used for clamp math) — ResizeObserver on our own
	// root element catches CSS resize-from-corner too.
	$effect(() => {
		if (!rootEl) return;
		const el = rootEl;
		const ro = new ResizeObserver(() => {
			const r = el.getBoundingClientRect();
			size = { w: r.width, h: r.height };
		});
		ro.observe(el);
		// seed
		const r = el.getBoundingClientRect();
		size = { w: r.width, h: r.height };
		return () => ro.disconnect();
	});

	// Re-clamp on window resize — this is the "snap back in when the
	// viewport shrinks" case.
	$effect(() => {
		if (typeof window === 'undefined') return;
		const onResize = () => clampToViewport();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	// The neodrag `position` plugin takes a `current: {x, y}` and forces
	// the element to that transform. Wrapped in a Compartment so updates
	// to `pos` re-run just this plugin (not the whole plugin list).
	const posComp = Compartment.of(() => position({ current: pos }));

	const plugins = $derived([
		posComp,
		controls({ allow: ControlFrom.selector('.dw-handle') }),
		events({
			onDragStart: () => win.focus(),
			onDrag: ({ offset }) => {
				pos = { x: offset.x, y: offset.y };
			},
			onDragEnd: () => clampToViewport()
		}),
		...(constrained === 'viewport' ? [bounds(BoundsFrom.viewport())] : []),
		...(constrained === 'parent' ? [bounds(BoundsFrom.parent())] : []),
		...(userPlugins ?? [])
	]);
</script>

<div
	bind:this={rootEl}
	class="draggable-window"
	style:width={toCssSize(width)}
	style:height={toCssSize(height)}
	style:min-width={toCssSize(minWidth)}
	style:min-height={toCssSize(minHeight)}
	style:z-index={win.z}
	onpointerdowncapture={() => win.focus()}
	{@attach draggable(() => plugins)}
>
	<div class="dw-titlebar">
		<div class="dw-handle">
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
		position: fixed;
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
		/* Native resize from the bottom-right corner. */
		resize: both;
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
