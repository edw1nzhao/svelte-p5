<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Layout shell for canvas-driven apps.
	 *
	 * Every multi-panel p5 app ends up with the same picture: a canvas filling
	 * the bulk of the viewport, one or more toolbars anchored to its edges,
	 * and overlays (tooltips, FPS readouts, legends) painted on top. Each app
	 * reinvents the flex math, the ResizeObserver coordination (so the canvas
	 * doesn't thrash when a toolbar's height changes), and the z-index/pointer
	 * discipline for overlays that must *not* swallow canvas input.
	 *
	 * `<CanvasFrame>` is that shell. It exposes snippet slots for each region
	 * and otherwise stays out of the way:
	 *
	 * - `canvas` (required): render your `<Sketch>` / `<P5Canvas>` here.
	 * - `top` / `bottom` / `leftRail` / `rightRail` (optional): chrome docked
	 *   to each edge. Natural content height/width; does not fight the canvas
	 *   for flex space.
	 * - `overlay` (optional): absolutely positioned over the canvas region.
	 *   `pointer-events: none` by default so it doesn't block canvas input;
	 *   individual children can opt in with `pointer-events: auto`.
	 *
	 * The frame itself fills whatever parent it's mounted in — typically
	 * `height: 100vh` or a flex child. It assumes a bounded height from the
	 * parent; inside it, the canvas region flexes to consume whatever remains
	 * after the toolbars.
	 *
	 * @example
	 * ```svelte
	 * <div style="height: 100vh">
	 *   <CanvasFrame>
	 *     {#snippet top()}<MyMenuBar />{/snippet}
	 *     {#snippet bottom()}<MyTimeline /><MySpeakerList />{/snippet}
	 *     {#snippet canvas()}<Sketch {sketch} bind:instance />{/snippet}
	 *     {#snippet overlay()}<FPSMonitor {instance} />{/snippet}
	 *   </CanvasFrame>
	 * </div>
	 * ```
	 */
	interface Props {
		canvas: Snippet;
		top?: Snippet;
		bottom?: Snippet;
		leftRail?: Snippet;
		rightRail?: Snippet;
		overlay?: Snippet;
		class?: string;
		style?: string;
	}

	let {
		canvas,
		top,
		bottom,
		leftRail,
		rightRail,
		overlay,
		class: className = '',
		style
	}: Props = $props();
</script>

<div class="canvas-frame {className}" {style}>
	{#if top}
		<div class="canvas-frame__region canvas-frame__top">{@render top()}</div>
	{/if}
	<div class="canvas-frame__middle">
		{#if leftRail}
			<div class="canvas-frame__region canvas-frame__rail">{@render leftRail()}</div>
		{/if}
		<div class="canvas-frame__stage">
			{@render canvas()}
			{#if overlay}
				<div class="canvas-frame__overlay">{@render overlay()}</div>
			{/if}
		</div>
		{#if rightRail}
			<div class="canvas-frame__region canvas-frame__rail">{@render rightRail()}</div>
		{/if}
	</div>
	{#if bottom}
		<div class="canvas-frame__region canvas-frame__bottom">{@render bottom()}</div>
	{/if}
</div>

<style>
	.canvas-frame {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		position: relative;
	}

	.canvas-frame__region {
		flex: 0 0 auto;
	}

	.canvas-frame__middle {
		display: flex;
		flex: 1 1 auto;
		min-width: 0;
		min-height: 0;
	}

	.canvas-frame__rail {
		min-height: 0;
	}

	.canvas-frame__stage {
		flex: 1 1 auto;
		min-width: 0;
		min-height: 0;
		position: relative;
		overflow: hidden;
	}

	.canvas-frame__overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 10;
	}
</style>
