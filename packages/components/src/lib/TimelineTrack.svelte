<script lang="ts" module>
	/**
	 * A named region on the timeline. Rendered as a tinted band; clicking
	 * it emits `onSegmentClick` with the full segment.
	 */
	export interface TimelineSegment {
		id: string;
		start: number;
		end: number;
		label?: string;
		color?: string;
	}

	export interface TimelineViewWindow {
		start: number;
		end: number;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy } from 'svelte';

	// Low-level timeline primitive: a horizontal track with a movable playhead,
	// optional view window (zoom range with draggable handles), optional
	// segment overlays, and seek/hover/segment-click event callbacks.
	//
	// This component is unopinionated about playback — it doesn't know how
	// currentTime changes, only how to display it and how to collect user
	// seek/hover input. Pair with <TimelineScrubber> (which adds play/pause
	// and speed) or drive directly from your own animation loop.
	//
	// Units are arbitrary (seconds, frames, steps) — TimelineTrack just works
	// in the same unit you pass in as `duration`.
	//
	// See the package README for usage examples.

	interface Props {
		/** Total timeline length in your chosen unit. */
		duration: number;
		/** Current playhead position. Bindable. */
		currentTime?: number;
		/**
		 * Optional zoomed view window. When set, only this range is visible on
		 * the track; clicks and hover map into this window. Bindable.
		 */
		viewWindow?: TimelineViewWindow;
		/** Highlighted regions rendered as labeled bands. */
		segments?: TimelineSegment[];
		/** Show draggable handles for the view window when it's set. Default: true. */
		showViewWindowHandles?: boolean;
		/** Show a vertical playhead line. Default: true. */
		showPlayhead?: boolean;
		/** Called when the user clicks or drags the playhead. */
		onSeek?: (time: number) => void;
		/** Called when the user drags a view window handle. */
		onViewWindowChange?: (window: TimelineViewWindow) => void;
		/** Called when the user clicks a segment band. */
		onSegmentClick?: (segment: TimelineSegment) => void;
		/** Called whenever the mouse moves over or leaves the track. `null` on leave. */
		onHover?: (time: number | null) => void;
		/** Snippet rendered above the hovered-time position. Use for preview tooltips. */
		hoverIndicator?: Snippet<[{ time: number; left: number }]>;
		class?: string;
	}

	let {
		duration,
		currentTime = $bindable(0),
		viewWindow = $bindable(undefined),
		segments = [],
		showViewWindowHandles = true,
		showPlayhead = true,
		onSeek,
		onViewWindowChange,
		onSegmentClick,
		onHover,
		hoverIndicator,
		class: className = ''
	}: Props = $props();

	let trackEl: HTMLDivElement | null = $state(null);
	let dragging = $state<null | 'playhead' | 'window-start' | 'window-end'>(null);
	let hoverX = $state<number | null>(null);

	const effectiveStart = $derived(viewWindow?.start ?? 0);
	const effectiveEnd = $derived(viewWindow?.end ?? duration);
	const effectiveRange = $derived(Math.max(0.0001, effectiveEnd - effectiveStart));

	function timeToPercent(t: number): number {
		return ((t - effectiveStart) / effectiveRange) * 100;
	}

	function eventToTime(event: PointerEvent): number | null {
		if (!trackEl) return null;
		const rect = trackEl.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const pct = Math.max(0, Math.min(1, x / rect.width));
		return effectiveStart + pct * effectiveRange;
	}

	function eventToClientX(event: PointerEvent): number | null {
		if (!trackEl) return null;
		const rect = trackEl.getBoundingClientRect();
		return Math.max(0, Math.min(rect.width, event.clientX - rect.left));
	}

	function handleTrackPointerDown(event: PointerEvent) {
		// Ignore clicks on segment buttons / handles (they handle themselves).
		if ((event.target as HTMLElement).closest('[data-skip-seek]')) return;

		const time = eventToTime(event);
		if (time === null) return;

		currentTime = time;
		onSeek?.(time);
		dragging = 'playhead';
		document.addEventListener('pointermove', handleDocPointerMove);
		document.addEventListener('pointerup', handleDocPointerUp);
	}

	function handleDocPointerMove(event: PointerEvent) {
		if (!dragging) return;
		const time = eventToTime(event);
		if (time === null) return;

		if (dragging === 'playhead') {
			currentTime = time;
			onSeek?.(time);
		} else if (dragging === 'window-start' && viewWindow) {
			const next = {
				start: Math.max(0, Math.min(viewWindow.end - 0.1, time)),
				end: viewWindow.end
			};
			viewWindow = next;
			onViewWindowChange?.(next);
		} else if (dragging === 'window-end' && viewWindow) {
			const next = {
				start: viewWindow.start,
				end: Math.min(duration, Math.max(viewWindow.start + 0.1, time))
			};
			viewWindow = next;
			onViewWindowChange?.(next);
		}
	}

	function handleDocPointerUp() {
		dragging = null;
		document.removeEventListener('pointermove', handleDocPointerMove);
		document.removeEventListener('pointerup', handleDocPointerUp);
	}

	function handleHandlePointerDown(which: 'window-start' | 'window-end', event: PointerEvent) {
		event.stopPropagation();
		dragging = which;
		document.addEventListener('pointermove', handleDocPointerMove);
		document.addEventListener('pointerup', handleDocPointerUp);
	}

	function handleTrackPointerMove(event: PointerEvent) {
		if (dragging) return;
		const x = eventToClientX(event);
		const time = eventToTime(event);
		hoverX = x;
		onHover?.(time);
	}

	function handleTrackPointerLeave() {
		if (dragging) return;
		hoverX = null;
		onHover?.(null);
	}

	function handleSegmentClick(segment: TimelineSegment, event: MouseEvent) {
		event.stopPropagation();
		onSegmentClick?.(segment);
	}

	const hoveredTime = $derived.by(() => {
		if (hoverX === null || !trackEl) return null;
		const rect = trackEl.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, hoverX / rect.width));
		return effectiveStart + pct * effectiveRange;
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('pointermove', handleDocPointerMove);
			document.removeEventListener('pointerup', handleDocPointerUp);
		}
	});
</script>

<div
	bind:this={trackEl}
	class="timeline-track {className}"
	class:is-dragging={dragging !== null}
	onpointerdown={handleTrackPointerDown}
	onpointermove={handleTrackPointerMove}
	onpointerleave={handleTrackPointerLeave}
	role="slider"
	aria-valuemin={effectiveStart}
	aria-valuemax={effectiveEnd}
	aria-valuenow={currentTime}
	tabindex="0"
>
	<div class="timeline-track__rail"></div>

	{#each segments as segment (segment.id)}
		{@const left = timeToPercent(segment.start)}
		{@const width = timeToPercent(segment.end) - left}
		{#if width > 0 && left < 100 && left + width > 0}
			<button
				type="button"
				data-skip-seek
				class="timeline-track__segment"
				style:left="{Math.max(0, left)}%"
				style:width="{Math.min(100, left + width) - Math.max(0, left)}%"
				style:background-color={segment.color ??
					'var(--timeline-segment-bg, rgba(59, 130, 246, 0.18))'}
				title={segment.label ?? `${segment.start.toFixed(1)}–${segment.end.toFixed(1)}`}
				onclick={(e) => handleSegmentClick(segment, e)}
			>
				{#if segment.label}<span class="timeline-track__segment-label">{segment.label}</span>{/if}
			</button>
		{/if}
	{/each}

	{#if viewWindow && showViewWindowHandles}
		<div
			data-skip-seek
			class="timeline-track__handle timeline-track__handle--start"
			style:left="0%"
			onpointerdown={(e) => handleHandlePointerDown('window-start', e)}
			role="slider"
			aria-label="View window start"
			aria-valuenow={viewWindow.start}
			aria-valuemin={0}
			aria-valuemax={viewWindow.end}
			tabindex="0"
		></div>
		<div
			data-skip-seek
			class="timeline-track__handle timeline-track__handle--end"
			style:left="100%"
			onpointerdown={(e) => handleHandlePointerDown('window-end', e)}
			role="slider"
			aria-label="View window end"
			aria-valuenow={viewWindow.end}
			aria-valuemin={viewWindow.start}
			aria-valuemax={duration}
			tabindex="0"
		></div>
	{/if}

	{#if showPlayhead}
		<div
			class="timeline-track__playhead"
			style:left="{timeToPercent(currentTime)}%"
			aria-hidden="true"
		></div>
	{/if}

	{#if hoverIndicator && hoveredTime !== null && hoverX !== null}
		<div
			class="timeline-track__hover-indicator"
			style:left="{timeToPercent(hoveredTime)}%"
			aria-hidden="true"
		>
			{@render hoverIndicator({ time: hoveredTime, left: hoverX })}
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

		--timeline-rail-bg: #e5e7eb;
		--timeline-rail-height: 6px;
		--timeline-playhead-color: #ef4444;
		--timeline-playhead-width: 2px;
		--timeline-handle-color: #6b7280;
		--timeline-handle-width: 4px;
	}

	.timeline-track:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.timeline-track__rail {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: var(--timeline-rail-height);
		transform: translateY(-50%);
		background: var(--timeline-rail-bg);
		border-radius: calc(var(--timeline-rail-height) / 2);
		pointer-events: none;
	}

	.timeline-track__segment {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		height: calc(var(--timeline-rail-height) + 6px);
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
	}

	.timeline-track__segment:hover {
		filter: brightness(0.92);
	}

	.timeline-track__segment-label {
		opacity: 0.75;
	}

	.timeline-track__playhead {
		position: absolute;
		top: 15%;
		bottom: 15%;
		width: var(--timeline-playhead-width);
		margin-left: calc(var(--timeline-playhead-width) / -2);
		background: var(--timeline-playhead-color);
		pointer-events: none;
		border-radius: 1px;
	}

	.timeline-track__handle {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 10px;
		margin-left: -5px;
		cursor: ew-resize;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.timeline-track__handle::before {
		content: '';
		display: block;
		width: var(--timeline-handle-width);
		height: 100%;
		background: var(--timeline-handle-color);
		border-radius: 2px;
	}

	.timeline-track__handle:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.timeline-track__hover-indicator {
		position: absolute;
		bottom: 100%;
		pointer-events: none;
	}
</style>
