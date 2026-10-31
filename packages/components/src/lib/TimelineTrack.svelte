<script lang="ts" module>
	/**
	 * A labeled band on the track. Rendered as a tinted region; clicking
	 * emits `onSegmentClick` with the full segment.
	 */
	export interface TimelineSegment {
		id: string;
		start: number;
		end: number;
		label?: string;
		color?: string;
	}

	/**
	 * A {start,end} clip range overlaid on the track. When present, the
	 * region is highlighted and draggable handles appear at both edges.
	 * Use this for Twitch-style clip editing or TE-style filter windows.
	 */
	export interface TimelineSelection {
		start: number;
		end: number;
	}

	/** What the `underlay` snippet receives: the visible view and a time to left-% mapper. */
	export interface TimelineViewContext {
		view: TimelineView;
		duration: number;
		timeToPercent: (time: number) => number;
	}

	/** The track's position in viewport (client) pixels. */
	export interface TimelineTrackBounds {
		left: number;
		right: number;
		width: number;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy } from 'svelte';
	import {
		clampView,
		panView,
		xToTime,
		zoomView,
		zoomViewToRange,
		type TimelineView
	} from './timeline-view.js';

	// TimelineTrack is a horizontal scrub track for canvas apps. It models
	// three draggable concepts at once:
	//
	//   1. A playhead — where "now" is.
	//   2. A selection range (optional) — clip start/end handles and a
	//      tinted band between them. Think Twitch's clip editor, or a
	//      filter window in a data-viz dashboard.
	//   3. Labeled segments (optional) — chapters, highlights, etc.
	//
	// Interaction model is YouTube-ish:
	//   - Track is normally thin. Hovering expands it vertically and shows
	//     a time tooltip + hover guideline.
	//   - Clicking the rail seeks.
	//   - The playhead is a visible grabbable knob that grows on hover.
	//   - Selection handles are visible vertical bars with grip dots;
	//     dragging them adjusts start/end. Dragging the tinted band
	//     between them shifts the whole selection.
	//
	// The component is unopinionated about playback — it just displays
	// state and surfaces user intent. Pair with <TimelineScrubber> for a
	// full player bar, or drive directly from your own animation loop.
	//
	// Units are arbitrary (seconds, frames, words) — the track treats
	// `duration` and everything derived from it as opaque numbers.

	interface Props {
		/** Total timeline length. */
		duration: number;
		/** Current playhead position. Bindable. */
		currentTime?: number;
		/** Selection range start. Bindable. */
		selectionStart?: number;
		/** Selection range end. Bindable. */
		selectionEnd?: number;
		/**
		 * Render the selection range + its handles. Default: true when both
		 * selectionStart and selectionEnd are provided.
		 */
		showSelection?: boolean;
		/** Highlighted labeled regions. */
		segments?: TimelineSegment[];
		/** Hide the playhead knob but still let the rail respond to clicks. */
		showPlayhead?: boolean;
		/** Called when the user clicks or drags the playhead. */
		onSeek?: (time: number) => void;
		/** Called while the user drags a selection handle or the selection band. */
		onSelectionChange?: (selection: TimelineSelection) => void;
		/** Called at the end of a selection interaction (drag release). */
		onSelectionCommit?: (selection: TimelineSelection) => void;
		/** Called when the user clicks a segment band. */
		onSegmentClick?: (segment: TimelineSegment) => void;
		/** Called whenever the mouse moves over or leaves the track. `null` on leave. */
		onHoverTime?: (time: number | null) => void;
		/** Snippet rendered above the hover x position. Use for preview tooltips. */
		hoverPreview?: Snippet<[{ time: number; xPercent: number }]>;
		/**
		 * When dragging the selection start handle, also move the playhead to
		 * the new start (and fire `onSeek`). Handy for "scrub-to-trim" UIs where
		 * the start handle should preview the frame it lands on. Default: false.
		 */
		playheadFollowsSelectionStart?: boolean;
		/** Start of the visible window. Bindable. Default: 0. */
		viewStart?: number;
		/** End of the visible window. Bindable. Default: `duration`. */
		viewEnd?: number;
		/** Let the user zoom and pan with drag, wheel, pinch and keys. Default: false. */
		zoomable?: boolean;
		/** Narrowest view the user can zoom to. Default: `duration / 1000`. */
		minViewDuration?: number;
		/** Called when the user changes the view. */
		onViewChange?: (view: TimelineView) => void;
		/** Called with the track's client-pixel bounds on mount and whenever they change. */
		onBoundsChange?: (bounds: TimelineTrackBounds) => void;
		/** Snippet rendered behind the rail, e.g. an activity gradient. */
		underlay?: Snippet<[TimelineViewContext]>;
		class?: string;
	}

	let {
		duration,
		currentTime = $bindable(0),
		selectionStart = $bindable<number | undefined>(undefined),
		selectionEnd = $bindable<number | undefined>(undefined),
		showSelection = undefined,
		segments = [],
		showPlayhead = true,
		onSeek,
		onSelectionChange,
		onSelectionCommit,
		onSegmentClick,
		onHoverTime,
		hoverPreview,
		playheadFollowsSelectionStart = false,
		viewStart = $bindable<number | undefined>(undefined),
		viewEnd = $bindable<number | undefined>(undefined),
		zoomable = false,
		minViewDuration,
		onViewChange,
		onBoundsChange,
		underlay,
		class: className = ''
	}: Props = $props();

	type DragKind =
		| 'playhead'
		| 'selection-start'
		| 'selection-end'
		| 'selection-body'
		| 'zoom-region'
		| 'pan'
		| 'pinch';

	const ZOOM_DRAG_THRESHOLD_PX = 5;
	const KEY_ZOOM_IN = 0.7;
	const KEY_ZOOM_OUT = 1.4;
	const WHEEL_ZOOM_BASE = 1.15;

	let trackEl: HTMLDivElement | null = $state(null);
	let dragging = $state<null | DragKind>(null);
	let zoomRegion = $state<{ from: number; to: number } | null>(null);
	let gestureStartX = 0;
	let gestureStartView: TimelineView = { start: 0, end: 0 };
	let pinchCenter = 0;
	let touches: { id: number; x: number }[] = [];
	let dragStartTime = $state(0);
	let dragStartSelection = $state<TimelineSelection>({ start: 0, end: 0 });
	let hoverX = $state<number | null>(null);
	let isHovered = $state(false);

	const hasSelection = $derived(
		(showSelection ?? (selectionStart !== undefined && selectionEnd !== undefined)) &&
			selectionStart !== undefined &&
			selectionEnd !== undefined
	);

	const safeDuration = $derived(Math.max(0.0001, duration));
	const view = $derived(
		clampView({ start: viewStart ?? 0, end: viewEnd ?? safeDuration }, safeDuration)
	);
	const viewWidth = $derived(view.end - view.start);
	const isZoomed = $derived(view.start > 0 || view.end < safeDuration);
	const minWidth = $derived(minViewDuration ?? safeDuration / 1000);

	function timeToPercent(t: number): number {
		return Math.max(0, Math.min(100, ((t - view.start) / viewWidth) * 100));
	}

	// Off-view items hide only while zoomed, so the unzoomed track renders as before.
	function isVisible(t: number): boolean {
		return !isZoomed || (t >= view.start && t <= view.end);
	}

	function eventToTime(event: PointerEvent): number | null {
		if (!trackEl) return null;
		const rect = trackEl.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const pct = Math.max(0, Math.min(1, x / rect.width));
		return view.start + pct * viewWidth;
	}

	function setView(next: TimelineView): boolean {
		if (next.start === view.start && next.end === view.end) return false;
		viewStart = next.start;
		viewEnd = next.end;
		onViewChange?.(next);
		return true;
	}

	function zoomBy(factor: number, center: number): boolean {
		return setView(zoomView(view, factor, center, safeDuration, minWidth));
	}

	function seekTo(time: number) {
		currentTime = clamp(time, 0, safeDuration);
		onSeek?.(currentTime);
	}

	function addDocListeners() {
		document.addEventListener('pointermove', handleDocPointerMove);
		document.addEventListener('pointerup', handleDocPointerUp);
		document.addEventListener('pointercancel', handleDocPointerUp);
	}

	function removeDocListeners() {
		document.removeEventListener('pointermove', handleDocPointerMove);
		document.removeEventListener('pointerup', handleDocPointerUp);
		document.removeEventListener('pointercancel', handleDocPointerUp);
	}

	function capturePointer(event: PointerEvent) {
		const target = event.target as Element & { setPointerCapture?: (id: number) => void };
		try {
			target.setPointerCapture?.(event.pointerId);
		} catch {
			/* fall back to document listeners */
		}
	}

	function handleZoomablePointerDown(event: PointerEvent) {
		if (event.pointerType === 'touch' && (!dragging || dragging === 'zoom-region')) {
			touches = [
				...touches.filter((t) => t.id !== event.pointerId),
				{ id: event.pointerId, x: event.clientX }
			];
		}
		if (touches.length === 2 && trackEl) {
			const rect = trackEl.getBoundingClientRect();
			const [a, b] = touches.map((t) => t.x) as [number, number];
			dragging = 'pinch';
			zoomRegion = null;
			gestureStartX = Math.abs(a - b);
			gestureStartView = view;
			pinchCenter = xToTime((a + b) / 2 - rect.left, view, 0, rect.width);
			return;
		}
		if (dragging) return;
		const time = eventToTime(event);
		if (time === null) return;
		dragging = event.button === 1 || event.altKey ? 'pan' : 'zoom-region';
		gestureStartX = event.clientX;
		gestureStartView = view;
		dragStartTime = time;
		capturePointer(event);
		addDocListeners();
	}

	function handleZoomableMove(event: PointerEvent) {
		if (!trackEl) return;
		const rect = trackEl.getBoundingClientRect();
		if (dragging === 'pinch') {
			const touch = touches.find((t) => t.id === event.pointerId);
			if (!touch) return;
			touch.x = event.clientX;
			if (touches.length < 2) return;
			const [a, b] = touches.map((t) => t.x) as [number, number];
			const dist = Math.abs(a - b);
			if (dist > 0 && gestureStartX > 0) {
				const factor = gestureStartX / dist;
				setView(zoomView(gestureStartView, factor, pinchCenter, safeDuration, minWidth));
			}
		} else if (dragging === 'pan') {
			const width = gestureStartView.end - gestureStartView.start;
			const delta = -((event.clientX - gestureStartX) / rect.width) * width;
			setView(panView(gestureStartView, delta, safeDuration));
		} else if (dragging === 'zoom-region') {
			if (Math.abs(event.clientX - gestureStartX) < ZOOM_DRAG_THRESHOLD_PX) return;
			const time = eventToTime(event);
			if (time !== null) zoomRegion = { from: dragStartTime, to: time };
		}
	}

	function handleZoomableUp(event: PointerEvent) {
		touches = touches.filter((t) => t.id !== event.pointerId);
		if (dragging === 'pinch' && touches.length > 0) return;
		if (dragging === 'zoom-region') {
			if (zoomRegion) {
				setView(zoomViewToRange(zoomRegion.from, zoomRegion.to, safeDuration, minWidth));
			} else if (event.type === 'pointerup') {
				seekTo(dragStartTime);
			}
		}
		zoomRegion = null;
		dragging = null;
		touches = [];
		removeDocListeners();
	}

	function eventToClientX(event: PointerEvent): number | null {
		if (!trackEl) return null;
		const rect = trackEl.getBoundingClientRect();
		return Math.max(0, Math.min(rect.width, event.clientX - rect.left));
	}

	function clamp(n: number, lo: number, hi: number): number {
		return Math.max(lo, Math.min(hi, n));
	}

	function handleRailPointerDown(event: PointerEvent) {
		// Skip if user grabbed a child that manages its own drag (handles,
		// segments, the playhead knob, or the selection band drag zone).
		if ((event.target as HTMLElement).closest('[data-skip-rail]')) return;

		if (zoomable) {
			handleZoomablePointerDown(event);
			return;
		}

		const time = eventToTime(event);
		if (time === null) return;

		currentTime = time;
		onSeek?.(time);
		startDrag('playhead', event);
	}

	function startDrag(
		which: 'playhead' | 'selection-start' | 'selection-end' | 'selection-body',
		event: PointerEvent
	) {
		const time = eventToTime(event);
		if (time === null) return;

		dragging = which;
		dragStartTime = time;
		dragStartSelection = {
			start: selectionStart ?? 0,
			end: selectionEnd ?? safeDuration
		};

		if (event.target instanceof Element && 'setPointerCapture' in event.target) {
			try {
				(event.target as Element & { setPointerCapture: (id: number) => void }).setPointerCapture(
					event.pointerId
				);
			} catch {
				/* fall back to document listeners */
			}
		}

		document.addEventListener('pointermove', handleDocPointerMove);
		document.addEventListener('pointerup', handleDocPointerUp);
	}

	function handleDocPointerMove(event: PointerEvent) {
		if (!dragging) return;
		if (dragging === 'zoom-region' || dragging === 'pan' || dragging === 'pinch') {
			handleZoomableMove(event);
			return;
		}
		const time = eventToTime(event);
		if (time === null) return;

		if (dragging === 'playhead') {
			currentTime = clamp(time, 0, safeDuration);
			onSeek?.(currentTime);
		} else if (dragging === 'selection-start' && hasSelection) {
			const end = selectionEnd as number;
			const next = clamp(time, 0, Math.max(0, end - 0.001));
			selectionStart = next;
			onSelectionChange?.({ start: next, end });
			if (playheadFollowsSelectionStart) {
				currentTime = next;
				onSeek?.(next);
			}
		} else if (dragging === 'selection-end' && hasSelection) {
			const start = selectionStart as number;
			const next = clamp(time, Math.min(safeDuration, start + 0.001), safeDuration);
			selectionEnd = next;
			onSelectionChange?.({ start, end: next });
		} else if (dragging === 'selection-body' && hasSelection) {
			const delta = time - dragStartTime;
			const width = dragStartSelection.end - dragStartSelection.start;
			const nextStart = clamp(dragStartSelection.start + delta, 0, safeDuration - width);
			const nextEnd = nextStart + width;
			selectionStart = nextStart;
			selectionEnd = nextEnd;
			onSelectionChange?.({ start: nextStart, end: nextEnd });
		}
	}

	function handleDocPointerUp(event: PointerEvent) {
		if (!dragging) return;
		if (dragging === 'zoom-region' || dragging === 'pan' || dragging === 'pinch') {
			handleZoomableUp(event);
			return;
		}
		const wasDragging = dragging;
		dragging = null;
		document.removeEventListener('pointermove', handleDocPointerMove);
		document.removeEventListener('pointerup', handleDocPointerUp);

		if (
			wasDragging === 'selection-start' ||
			wasDragging === 'selection-end' ||
			wasDragging === 'selection-body'
		) {
			if (selectionStart !== undefined && selectionEnd !== undefined) {
				onSelectionCommit?.({ start: selectionStart, end: selectionEnd });
			}
		}
	}

	function handleRailPointerMove(event: PointerEvent) {
		if (dragging) return;
		const x = eventToClientX(event);
		hoverX = x;
		const time = eventToTime(event);
		onHoverTime?.(time);
	}

	function handleRailPointerEnter() {
		isHovered = true;
	}

	function handleRailPointerLeave() {
		isHovered = false;
		if (dragging) return;
		hoverX = null;
		onHoverTime?.(null);
	}

	function handleSegmentClick(segment: TimelineSegment, event: MouseEvent) {
		event.stopPropagation();
		onSegmentClick?.(segment);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			const step = event.shiftKey ? viewWidth / 20 : viewWidth / 100;
			const delta = event.key === 'ArrowRight' ? step : -step;
			currentTime = clamp(currentTime + delta, 0, safeDuration);
			onSeek?.(currentTime);
			return;
		}
		if (!zoomable || event.ctrlKey || event.metaKey || event.altKey) return;
		const center =
			currentTime >= view.start && currentTime <= view.end
				? currentTime
				: view.start + viewWidth / 2;
		let handled = true;
		if (event.key === '+' || event.key === '=') zoomBy(KEY_ZOOM_IN, center);
		else if (event.key === '-' || event.key === '_') zoomBy(KEY_ZOOM_OUT, center);
		else if (event.key === '0') setView({ start: 0, end: safeDuration });
		else if (event.key === '[' || event.key === ']') {
			const delta = (event.key === ']' ? 1 : -1) * viewWidth * 0.1;
			setView(panView(view, delta, safeDuration));
		} else handled = false;
		if (handled) event.preventDefault();
	}

	function handleWheel(event: WheelEvent) {
		if (!trackEl) return;
		const rect = trackEl.getBoundingClientRect();
		const unit = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? rect.width : 1;
		if (event.ctrlKey || event.metaKey) {
			event.preventDefault();
			const center = xToTime(event.clientX - rect.left, view, 0, rect.width);
			const steps = clamp((event.deltaY * unit) / 100, -1, 1);
			zoomBy(Math.pow(WHEEL_ZOOM_BASE, steps), center);
			return;
		}
		const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
		const delta = ((raw * unit) / rect.width) * viewWidth * 0.5;
		// Let the page scroll when there is nothing left to pan.
		if (setView(panView(view, delta, safeDuration))) event.preventDefault();
	}

	$effect(() => {
		if (!zoomable || !trackEl) return;
		const el = trackEl;
		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	});

	$effect(() => {
		if (!onBoundsChange || !trackEl) return;
		const el = trackEl;
		const report = () => {
			const r = el.getBoundingClientRect();
			onBoundsChange?.({ left: r.left, right: r.right, width: r.width });
		};
		report();
		const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(report);
		ro?.observe(el);
		window.addEventListener('resize', report);
		return () => {
			ro?.disconnect();
			window.removeEventListener('resize', report);
		};
	});

	const hoveredTime = $derived.by(() => {
		if (hoverX === null || !trackEl) return null;
		const rect = trackEl.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, hoverX / rect.width));
		return view.start + pct * viewWidth;
	});

	const hoveredPercent = $derived.by(() => {
		if (hoverX === null || !trackEl) return null;
		const rect = trackEl.getBoundingClientRect();
		return Math.max(0, Math.min(100, (hoverX / rect.width) * 100));
	});

	const currentPercent = $derived(timeToPercent(currentTime));
	const selectionStartPercent = $derived(
		hasSelection ? timeToPercent(selectionStart as number) : 0
	);
	const selectionEndPercent = $derived(hasSelection ? timeToPercent(selectionEnd as number) : 100);

	// Track is "active" (expanded) while hovered or dragging.
	const isActive = $derived(isHovered || dragging !== null);

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			removeDocListeners();
		}
	});
</script>

<div
	bind:this={trackEl}
	class="timeline-track {className}"
	class:is-active={isActive}
	class:is-dragging={dragging !== null}
	class:is-zooming={dragging === 'zoom-region'}
	class:is-panning={dragging === 'pan' || dragging === 'pinch'}
	onpointerdown={handleRailPointerDown}
	onpointermove={handleRailPointerMove}
	onpointerenter={handleRailPointerEnter}
	onpointerleave={handleRailPointerLeave}
	onkeydown={handleKeyDown}
	role="slider"
	aria-valuemin={0}
	aria-valuemax={safeDuration}
	aria-valuenow={currentTime}
	aria-keyshortcuts={zoomable ? '+ - 0 [ ]' : undefined}
	tabindex="0"
>
	{#if underlay}
		<div class="timeline-track__underlay" aria-hidden="true">
			{@render underlay({ view, duration: safeDuration, timeToPercent })}
		</div>
	{/if}

	<div class="timeline-track__rail"></div>

	<div class="timeline-track__progress" style:width="{currentPercent}%" aria-hidden="true"></div>

	{#each segments as segment (segment.id)}
		{@const left = timeToPercent(segment.start)}
		{@const right = timeToPercent(segment.end)}
		{@const width = right - left}
		{#if width > 0}
			<button
				type="button"
				data-skip-rail
				class="timeline-track__segment"
				style:left="{left}%"
				style:width="{width}%"
				style:background-color={segment.color ??
					'var(--timeline-segment-bg, rgba(59, 130, 246, 0.22))'}
				title={segment.label ?? `${segment.start.toFixed(1)}–${segment.end.toFixed(1)}`}
				onclick={(e) => handleSegmentClick(segment, e)}
			>
				{#if segment.label}<span class="timeline-track__segment-label">{segment.label}</span>{/if}
			</button>
		{/if}
	{/each}

	{#if hasSelection}
		{@const selLeft = selectionStartPercent}
		{@const selWidth = Math.max(0, selectionEndPercent - selectionStartPercent)}

		<!-- Selection band. Draggable as a whole when grabbed away from the handles/playhead. -->
		<div
			data-skip-rail
			class="timeline-track__selection"
			class:is-dragging={dragging === 'selection-body'}
			style:left="{selLeft}%"
			style:width="{selWidth}%"
			onpointerdown={(e) => {
				// Don't start a body-drag if the user clicked on a child that
				// handles its own drag (the two handles).
				if ((e.target as HTMLElement).closest('[data-selection-handle]')) return;
				// Also don't body-drag if shift-clicking the playhead area.
				e.stopPropagation();
				startDrag('selection-body', e);
			}}
			aria-hidden="true"
		></div>

		<!-- Start handle -->
		{#if isVisible(selectionStart as number)}<div
				data-skip-rail
				data-selection-handle
				class="timeline-track__handle timeline-track__handle--start"
				class:is-dragging={dragging === 'selection-start'}
				style:left="{selectionStartPercent}%"
				onpointerdown={(e) => {
					e.stopPropagation();
					startDrag('selection-start', e);
				}}
				role="slider"
				aria-label="Selection start"
				aria-valuemin={0}
				aria-valuemax={selectionEnd}
				aria-valuenow={selectionStart}
				tabindex="0"
			>
				<div class="timeline-track__handle-bar"></div>
			</div>{/if}

		<!-- End handle -->
		{#if isVisible(selectionEnd as number)}<div
				data-skip-rail
				data-selection-handle
				class="timeline-track__handle timeline-track__handle--end"
				class:is-dragging={dragging === 'selection-end'}
				style:left="{selectionEndPercent}%"
				onpointerdown={(e) => {
					e.stopPropagation();
					startDrag('selection-end', e);
				}}
				role="slider"
				aria-label="Selection end"
				aria-valuemin={selectionStart}
				aria-valuemax={safeDuration}
				aria-valuenow={selectionEnd}
				tabindex="0"
			>
				<div class="timeline-track__handle-bar"></div>
			</div>{/if}
	{/if}

	{#if zoomRegion}
		{@const zLeft = timeToPercent(Math.min(zoomRegion.from, zoomRegion.to))}
		{@const zRight = timeToPercent(Math.max(zoomRegion.from, zoomRegion.to))}
		<div
			class="timeline-track__zoom-region"
			style:left="{zLeft}%"
			style:width="{zRight - zLeft}%"
			aria-hidden="true"
		></div>
	{/if}

	{#if showPlayhead && isVisible(currentTime)}
		<div
			data-skip-rail
			class="timeline-track__playhead"
			class:is-dragging={dragging === 'playhead'}
			style:left="{currentPercent}%"
			onpointerdown={(e) => {
				e.stopPropagation();
				startDrag('playhead', e);
			}}
			aria-hidden="true"
		>
			<div class="timeline-track__playhead-line"></div>
			<div class="timeline-track__playhead-knob"></div>
		</div>
	{/if}

	{#if hoveredPercent !== null && dragging === null}
		<div class="timeline-track__hover-line" style:left="{hoveredPercent}%" aria-hidden="true"></div>
	{/if}

	{#if hoverPreview && hoveredTime !== null && hoveredPercent !== null}
		<div class="timeline-track__hover-preview" style:left="{hoveredPercent}%" aria-hidden="true">
			{@render hoverPreview({ time: hoveredTime, xPercent: hoveredPercent })}
		</div>
	{/if}
</div>

<style>
	.timeline-track {
		position: relative;
		width: 100%;
		height: var(--timeline-track-height, 32px);
		user-select: none;
		touch-action: none;
		cursor: pointer;
		display: flex;
		align-items: center;

		--timeline-rail-bg: rgba(0, 0, 0, 0.12);
		--timeline-rail-height: 6px;
		--timeline-rail-height-active: 12px;
		--timeline-accent: #ef4444;
		--timeline-accent-hover: #dc2626;
		--timeline-selection-bg: rgba(100, 116, 139, 0.22);
		--timeline-playhead-size: 14px;
		--timeline-playhead-size-active: 20px;
		--timeline-handle-hit-width: 22px;
		--timeline-handle-bar-width: 5px;

		/* Contrast ring drawn around the playhead knob so it reads against any
		   rail/segment color. Light-mode fallback; consuming apps override for
		   dark mode. */
		--timeline-knob-ring: #ffffff;
		/* Grip dots inset into the selection handle bars. */
		--timeline-handle-dot: rgba(255, 255, 255, 0.85);
	}

	.timeline-track.is-zooming {
		cursor: crosshair;
	}

	.timeline-track.is-panning {
		cursor: grabbing;
	}

	.timeline-track__underlay {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.timeline-track__zoom-region {
		position: absolute;
		top: 0;
		bottom: 0;
		background: var(--timeline-zoom-region-bg, rgba(59, 130, 246, 0.18));
		border-inline: 1px solid var(--timeline-zoom-region-border, rgba(59, 130, 246, 0.7));
		pointer-events: none;
		z-index: 5;
	}

	.timeline-track:focus-visible {
		outline: 2px solid var(--timeline-accent);
		outline-offset: 2px;
		border-radius: 4px;
	}

	.timeline-track__rail {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		height: var(--timeline-rail-height);
		background: var(--timeline-rail-bg);
		border-radius: 999px;
		pointer-events: none;
		transition: height 120ms ease;
	}

	.timeline-track.is-active .timeline-track__rail {
		height: var(--timeline-rail-height-active);
	}

	/* Played-progress fill: 0 → currentTime, sits on top of the rail. */
	.timeline-track__progress {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		height: var(--timeline-rail-height);
		background: var(--timeline-accent);
		border-radius: 999px 0 0 999px;
		pointer-events: none;
		transition: height 120ms ease;
		max-width: 100%;
	}

	.timeline-track.is-active .timeline-track__progress {
		height: var(--timeline-rail-height-active);
	}

	/* Selection band: tinted slab between the handles. Drag-offsets the range.
	   Uses a neutral slate tint so it doesn't compete with the red progress
	   fill — the metaphors are different (selection = filter range; progress
	   = playhead position). */
	.timeline-track__selection {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		height: calc(var(--timeline-rail-height) + 4px);
		background: var(--timeline-selection-bg);
		border-radius: 3px;
		cursor: grab;
		transition: height 120ms ease;
		z-index: 1;
	}

	.timeline-track.is-active .timeline-track__selection {
		height: calc(var(--timeline-rail-height-active) + 4px);
	}

	.timeline-track__selection.is-dragging {
		cursor: grabbing;
	}

	/* Handles: a wide transparent hit zone with a centered visible bar + grip dots. */
	.timeline-track__handle {
		position: absolute;
		top: 0;
		bottom: 0;
		width: var(--timeline-handle-hit-width);
		margin-left: calc(var(--timeline-handle-hit-width) / -2);
		cursor: ew-resize;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 3;
	}

	.timeline-track__handle-bar {
		width: var(--timeline-handle-bar-width);
		height: var(--timeline-rail-height-active);
		background-color: var(--timeline-accent);
		/* A vertical column of subtle grip dots, centered on the bar, so the
		   handle reads as something to grab rather than a plain stripe. */
		background-image: radial-gradient(
			circle at center,
			var(--timeline-handle-dot) 0 1px,
			transparent 1.4px
		);
		background-repeat: repeat-y;
		background-position: center;
		background-size: 100% 6px;
		border-radius: 999px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
		opacity: 0;
		transition:
			height 120ms ease,
			width 120ms ease,
			opacity 120ms ease,
			box-shadow 120ms ease;
	}

	.timeline-track.is-active .timeline-track__handle-bar {
		opacity: 1;
		height: calc(var(--timeline-rail-height-active) + 8px);
	}

	.timeline-track__handle:hover .timeline-track__handle-bar,
	.timeline-track__handle.is-dragging .timeline-track__handle-bar {
		opacity: 1;
		height: calc(var(--timeline-rail-height-active) + 14px);
		width: calc(var(--timeline-handle-bar-width) + 1px);
	}

	.timeline-track__handle:focus-visible {
		outline: 2px solid var(--timeline-accent);
		outline-offset: 2px;
		border-radius: 2px;
	}

	/* Playhead: a vertical line with a circular knob at the current position.
	   The knob grows on hover/drag; the line fades in with the active state. */
	.timeline-track__playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		transform: translateX(-50%);
		width: var(--timeline-playhead-size-active);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 4;
		cursor: grab;
	}

	.timeline-track__playhead.is-dragging {
		cursor: grabbing;
	}

	.timeline-track__playhead-line {
		position: absolute;
		top: 10%;
		bottom: 10%;
		left: 50%;
		transform: translateX(-50%);
		width: 2px;
		background: var(--timeline-accent);
		opacity: 0;
		transition: opacity 120ms ease;
		pointer-events: none;
	}

	.timeline-track.is-active .timeline-track__playhead-line,
	.timeline-track__playhead:hover .timeline-track__playhead-line {
		opacity: 0.85;
	}

	.timeline-track__playhead-knob {
		position: relative;
		width: var(--timeline-playhead-size);
		height: var(--timeline-playhead-size);
		border-radius: 50%;
		background: var(--timeline-accent);
		/* A contrast ring (border) plus a soft drop shadow so the knob lifts off
		   the rail. The inset white ring keeps it legible over the red progress
		   fill it sits on top of. */
		border: 2px solid var(--timeline-knob-ring);
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.28),
			0 0 0 1px rgba(0, 0, 0, 0.06);
		box-sizing: border-box;
		transition:
			width 110ms cubic-bezier(0.2, 0, 0, 1),
			height 110ms cubic-bezier(0.2, 0, 0, 1),
			background-color 120ms ease,
			box-shadow 120ms ease;
	}

	.timeline-track__playhead:hover .timeline-track__playhead-knob,
	.timeline-track__playhead.is-dragging .timeline-track__playhead-knob {
		background: var(--timeline-accent-hover);
	}

	.timeline-track__playhead:hover .timeline-track__playhead-knob,
	.timeline-track__playhead.is-dragging .timeline-track__playhead-knob,
	.timeline-track.is-active .timeline-track__playhead-knob {
		width: var(--timeline-playhead-size-active);
		height: var(--timeline-playhead-size-active);
		box-shadow:
			0 3px 8px rgba(0, 0, 0, 0.38),
			0 0 0 1px rgba(0, 0, 0, 0.06);
	}

	.timeline-track__hover-line {
		position: absolute;
		top: 20%;
		bottom: 20%;
		width: 1px;
		margin-left: -0.5px;
		background: rgba(0, 0, 0, 0.35);
		pointer-events: none;
		z-index: 2;
	}

	.timeline-track__hover-preview {
		position: absolute;
		bottom: 100%;
		transform: translateX(-50%);
		pointer-events: none;
		z-index: 10;
	}

	.timeline-track__segment {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		height: calc(var(--timeline-rail-height-active) + 4px);
		padding: 0 4px;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		font:
			10px/1 system-ui,
			sans-serif;
		color: #1f2937;
		overflow: hidden;
		white-space: nowrap;
		z-index: 1;
	}

	.timeline-track__segment:hover {
		filter: brightness(0.92);
	}

	.timeline-track__segment-label {
		opacity: 0.8;
	}
</style>
