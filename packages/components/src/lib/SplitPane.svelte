<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy } from 'svelte';

	/**
	 * Two-panel resizable split. Accepts snippets for each pane and a
	 * bindable `sizes` tuple of percentages that always sums to 100.
	 *
	 * Orientation follows CSS flex convention:
	 * - `orientation: 'vertical'` → `flex-direction: column` → panels stacked
	 *   top/bottom, divider is a horizontal bar.
	 * - `orientation: 'horizontal'` → panels side-by-side, divider is vertical.
	 *
	 * Colors and divider thickness are themable via CSS custom properties
	 * (see the style block) so consumers can match their app palette without
	 * overriding selectors.
	 *
	 * @example
	 * ```svelte
	 * <SplitPane orientation="horizontal" bind:sizes={[60, 40]} minSize={200}>
	 *   {#snippet first()}<Sketch {sketch} bind:instance />{/snippet}
	 *   {#snippet second()}<MyEditor />{/snippet}
	 * </SplitPane>
	 * ```
	 */
	interface Props {
		/** `vertical` = stacked, `horizontal` = side-by-side. Default: `vertical`. */
		orientation?: 'horizontal' | 'vertical';
		/** Panel sizes as percentages (sum to 100). Bindable. */
		sizes?: [number, number];
		/** Minimum size in px for each panel. Default: 100. */
		minSize?: number;
		/** When true, one panel collapses fully to show only the other. */
		collapsed?: boolean;
		/** Which panel collapses when `collapsed` is true. Default: `second`. */
		collapsedPanel?: 'first' | 'second';
		first?: Snippet;
		second?: Snippet;
		/** Fired when the divider starts being dragged. */
		ondragstart?: () => void;
		/** Fired when the divider is released. */
		ondragend?: () => void;
		/** Fired on every size update (drag move, keyboard arrow). */
		onresize?: (data: { sizes: [number, number] }) => void;
		class?: string;
	}

	let {
		orientation = 'vertical',
		sizes = $bindable<[number, number]>([60, 40]),
		minSize = 100,
		collapsed = false,
		collapsedPanel = 'second',
		first,
		second,
		ondragstart,
		ondragend,
		onresize,
		class: className = ''
	}: Props = $props();

	let container: HTMLElement;
	let isDragging = $state(false);
	let startPos = 0;
	let startSizes: [number, number] = [...sizes];

	const flexDirection = $derived(orientation === 'vertical' ? 'column' : 'row');
	const cursorStyle = $derived(orientation === 'vertical' ? 'row-resize' : 'col-resize');

	function containerExtent(): number {
		if (!container) return 0;
		return orientation === 'vertical' ? container.offsetHeight : container.offsetWidth;
	}

	function beginDrag(clientX: number, clientY: number) {
		if (collapsed) return;
		isDragging = true;
		startPos = orientation === 'vertical' ? clientY : clientX;
		startSizes = [...sizes];
		document.addEventListener('pointermove', handlePointerMove);
		document.addEventListener('pointerup', handlePointerUp);
		document.body.style.cursor = cursorStyle;
		document.body.style.userSelect = 'none';
		ondragstart?.();
	}

	function handlePointerDown(event: PointerEvent) {
		beginDrag(event.clientX, event.clientY);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!isDragging) return;

		const currentPos = orientation === 'vertical' ? event.clientY : event.clientX;
		const delta = currentPos - startPos;
		const extent = containerExtent();
		if (extent === 0) return;

		const deltaPercent = (delta / extent) * 100;
		let next0 = startSizes[0] + deltaPercent;
		let next1 = startSizes[1] - deltaPercent;
		const minPercent = (minSize / extent) * 100;

		if (next0 < minPercent) {
			next0 = minPercent;
			next1 = 100 - minPercent;
		} else if (next1 < minPercent) {
			next1 = minPercent;
			next0 = 100 - minPercent;
		}

		sizes = [next0, next1];
		onresize?.({ sizes });
	}

	function handlePointerUp() {
		isDragging = false;
		document.removeEventListener('pointermove', handlePointerMove);
		document.removeEventListener('pointerup', handlePointerUp);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
		ondragend?.();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (collapsed) return;

		const step = 2;
		let next: [number, number] = [...sizes];

		if (orientation === 'vertical') {
			if (event.key === 'ArrowUp') next[0] = Math.max(10, sizes[0] - step);
			else if (event.key === 'ArrowDown') next[0] = Math.min(90, sizes[0] + step);
			else return;
		} else {
			if (event.key === 'ArrowLeft') next[0] = Math.max(10, sizes[0] - step);
			else if (event.key === 'ArrowRight') next[0] = Math.min(90, sizes[0] + step);
			else return;
		}
		next[1] = 100 - next[0];

		if (next[0] !== sizes[0]) {
			sizes = next;
			onresize?.({ sizes });
			event.preventDefault();
		}
	}

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('pointermove', handlePointerMove);
			document.removeEventListener('pointerup', handlePointerUp);
		}
	});

	const firstSize = $derived.by(() => {
		if (!collapsed) return `${sizes[0]}%`;
		return collapsedPanel === 'first' ? '0%' : '100%';
	});
	const secondSize = $derived.by(() => {
		if (!collapsed) return `${sizes[1]}%`;
		return collapsedPanel === 'second' ? '0%' : '100%';
	});
	const sizeProp = $derived(orientation === 'vertical' ? 'height' : 'width');
</script>

<div
	class="split-pane {className}"
	class:vertical={orientation === 'vertical'}
	class:horizontal={orientation === 'horizontal'}
	bind:this={container}
	style="flex-direction: {flexDirection};"
>
	<div class="split-pane__panel" style="{sizeProp}: {firstSize};">
		{@render first?.()}
	</div>

	{#if !collapsed}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="split-pane__divider"
			class:is-dragging={isDragging}
			role="separator"
			tabindex="0"
			aria-orientation={orientation}
			aria-valuenow={Math.round(sizes[0])}
			aria-valuemin="10"
			aria-valuemax="90"
			onpointerdown={handlePointerDown}
			onkeydown={handleKeyDown}
		>
			<div class="split-pane__grip"></div>
		</div>
	{/if}

	<div class="split-pane__panel" style="{sizeProp}: {secondSize};">
		{@render second?.()}
	</div>
</div>

<style>
	.split-pane {
		display: flex;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;

		/* Themeable via custom properties. Defaults match a neutral gray scale. */
		--split-divider-bg: #e5e7eb;
		--split-divider-bg-active: #d1d5db;
		--split-divider-bg-focus: #3b82f6;
		--split-grip-bg: #9ca3af;
		--split-grip-bg-active: #6b7280;
		--split-divider-size: 8px;
		--split-grip-length: 40px;
		--split-grip-thickness: 4px;
	}

	.split-pane__panel {
		overflow: hidden;
		position: relative;
		min-width: 0;
		min-height: 0;
		flex-shrink: 0;
	}

	.split-pane__divider {
		flex: 0 0 auto;
		background-color: var(--split-divider-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.15s;
	}

	.split-pane__divider:hover,
	.split-pane__divider.is-dragging {
		background-color: var(--split-divider-bg-active);
	}

	.split-pane__divider:focus-visible {
		outline: 2px solid var(--split-divider-bg-focus);
		outline-offset: -2px;
	}

	.vertical .split-pane__divider {
		width: 100%;
		height: var(--split-divider-size);
		cursor: row-resize;
	}

	.horizontal .split-pane__divider {
		width: var(--split-divider-size);
		height: 100%;
		cursor: col-resize;
	}

	.split-pane__grip {
		background-color: var(--split-grip-bg);
		border-radius: 2px;
	}

	.vertical .split-pane__grip {
		width: var(--split-grip-length);
		height: var(--split-grip-thickness);
	}

	.horizontal .split-pane__grip {
		width: var(--split-grip-thickness);
		height: var(--split-grip-length);
	}

	.split-pane__divider:hover .split-pane__grip,
	.split-pane__divider.is-dragging .split-pane__grip {
		background-color: var(--split-grip-bg-active);
	}
</style>
