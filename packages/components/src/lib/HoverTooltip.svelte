<script lang="ts">
	import type { Snippet } from 'svelte';

	// Position-aware tooltip, anchored to a screen-space point.
	//
	// Canvas apps hover hit-test results and want a floating tooltip that
	// tracks the pointer, flips to the other side when it would hit the
	// viewport edge, and doesn't swallow canvas input. HoverTooltip is the
	// minimum-viable version: pass `anchor` coordinates (page space) and
	// `show`; the tooltip measures itself after mount and picks the side
	// that fits.
	//
	// No floating-ui dependency — the edge-flip logic is tiny and handles
	// the common cases. If you need multi-reference positioning, portal
	// nesting, or collision detection against arbitrary boundaries, reach
	// for @floating-ui/dom directly.
	//
	// See the package README for a usage example.
	interface Props {
		/** Tooltip content. */
		children: Snippet;
		/** Anchor point in client (page) coordinates. */
		anchor: { x: number; y: number } | null;
		/** Whether the tooltip is visible. */
		show?: boolean;
		/** Offset between the anchor and the tooltip's nearest edge, in px. Default: 12. */
		offset?: number;
		/** Draw a small triangle pointer from the tooltip toward the anchor. Default: true. */
		triangle?: boolean;
		/** Preferred side when there's room. Default: `'top'`. */
		preferredSide?: 'top' | 'bottom' | 'left' | 'right';
		class?: string;
	}

	let {
		children,
		anchor,
		show = true,
		offset = 12,
		triangle = true,
		preferredSide = 'top',
		class: className = ''
	}: Props = $props();

	type Side = 'top' | 'bottom' | 'left' | 'right';

	let tooltipEl: HTMLDivElement | null = $state(null);
	let measuredWidth = $state(0);
	let measuredHeight = $state(0);

	// Remeasure whenever content changes. The ResizeObserver handles dynamic
	// content (e.g. tooltip copy updating mid-hover).
	$effect(() => {
		if (!tooltipEl) return;
		const el = tooltipEl;
		const ro = new ResizeObserver(() => {
			const r = el.getBoundingClientRect();
			measuredWidth = r.width;
			measuredHeight = r.height;
		});
		ro.observe(el);
		return () => ro.disconnect();
	});

	const placement = $derived.by<{ left: number; top: number; side: Side } | null>(() => {
		if (!anchor) return null;
		if (typeof window === 'undefined') return null;

		const vpW = window.innerWidth;
		const vpH = window.innerHeight;
		const { x, y } = anchor;

		const fits: Record<Side, boolean> = {
			top: y - measuredHeight - offset >= 0,
			bottom: y + measuredHeight + offset <= vpH,
			left: x - measuredWidth - offset >= 0,
			right: x + measuredWidth + offset <= vpW
		};

		// Order of preference: requested side first, then opposite axis, then fallbacks.
		const order: Side[] =
			preferredSide === 'top'
				? ['top', 'bottom', 'right', 'left']
				: preferredSide === 'bottom'
					? ['bottom', 'top', 'right', 'left']
					: preferredSide === 'left'
						? ['left', 'right', 'top', 'bottom']
						: ['right', 'left', 'top', 'bottom'];

		const chosen = order.find((s) => fits[s]) ?? preferredSide;

		let left = 0;
		let top = 0;
		if (chosen === 'top') {
			left = x - measuredWidth / 2;
			top = y - measuredHeight - offset;
		} else if (chosen === 'bottom') {
			left = x - measuredWidth / 2;
			top = y + offset;
		} else if (chosen === 'left') {
			left = x - measuredWidth - offset;
			top = y - measuredHeight / 2;
		} else {
			left = x + offset;
			top = y - measuredHeight / 2;
		}

		// Clamp within viewport so the tooltip can't spill over an edge when the
		// anchor is jammed against one.
		left = Math.max(4, Math.min(vpW - measuredWidth - 4, left));
		top = Math.max(4, Math.min(vpH - measuredHeight - 4, top));

		return { left, top, side: chosen };
	});
</script>

{#if show && anchor}
	<div
		bind:this={tooltipEl}
		class="hover-tooltip {className}"
		data-side={placement?.side ?? preferredSide}
		style:left="{placement?.left ?? 0}px"
		style:top="{placement?.top ?? 0}px"
		style:visibility={placement ? 'visible' : 'hidden'}
		role="tooltip"
	>
		{@render children()}
		{#if triangle}
			<div class="hover-tooltip__arrow" data-side={placement?.side ?? preferredSide}></div>
		{/if}
	</div>
{/if}

<style>
	.hover-tooltip {
		position: fixed;
		z-index: 1000;
		pointer-events: none;
		padding: 6px 10px;
		max-width: 320px;
		font:
			12px/1.4 system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;
		color: var(--tooltip-fg, #fff);
		background: var(--tooltip-bg, rgba(17, 24, 39, 0.95));
		border-radius: 6px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		user-select: none;
	}

	.hover-tooltip__arrow {
		position: absolute;
		width: 0;
		height: 0;
		border: 6px solid transparent;
	}

	.hover-tooltip__arrow[data-side='top'] {
		left: 50%;
		bottom: -12px;
		transform: translateX(-50%);
		border-top-color: var(--tooltip-bg, rgba(17, 24, 39, 0.95));
	}
	.hover-tooltip__arrow[data-side='bottom'] {
		left: 50%;
		top: -12px;
		transform: translateX(-50%);
		border-bottom-color: var(--tooltip-bg, rgba(17, 24, 39, 0.95));
	}
	.hover-tooltip__arrow[data-side='left'] {
		top: 50%;
		right: -12px;
		transform: translateY(-50%);
		border-left-color: var(--tooltip-bg, rgba(17, 24, 39, 0.95));
	}
	.hover-tooltip__arrow[data-side='right'] {
		top: 50%;
		left: -12px;
		transform: translateY(-50%);
		border-right-color: var(--tooltip-bg, rgba(17, 24, 39, 0.95));
	}
</style>
