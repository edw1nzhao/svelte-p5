<script lang="ts">
	import type { Snippet } from 'svelte';
	import TimelineTrack, {
		type TimelineSegment,
		type TimelineSelection
	} from './TimelineTrack.svelte';

	// Stacked player bar for canvas apps. Lays the timeline out like a
	// video player:
	//
	//   [=========================track (full width)==========================]
	//   [▶ ◀◀ 1×]                                         [00:12 / 03:45]
	//
	// Track takes the full width of the component. Controls live on a row
	// below it: play / skip / speed on the left, time display on the right.
	// Clicking the time display toggles between total duration and
	// remaining time (YouTube-style).
	//
	// The track itself is mostly chrome-free at rest — only the playhead
	// and a tinted selection band are visible. Hovering the track reveals
	// grab affordances for the selection handles and grows the playhead
	// knob. This keeps the resting state quiet without hiding the
	// existence of the selection range.
	//
	// Bindable: currentTime, isPlaying, speed, selectionStart, selectionEnd.
	// The consumer owns the animation loop that advances currentTime when
	// isPlaying is true.

	interface Props {
		/** Total timeline length. */
		duration: number;
		/** Current playhead position. Bindable. */
		currentTime?: number;
		/** Is playback running? Bindable. */
		isPlaying?: boolean;
		/** Current playback speed multiplier. Bindable. */
		speed?: number;
		/** Available speed presets. Default: [1, 2, 4, 8, 16]. */
		speedOptions?: number[];
		/** Render speed as disabled / muted. Use when video playback overrides it. */
		speedLocked?: boolean;
		/** Title/tooltip shown when `speedLocked` is true. */
		speedLockedReason?: string;
		/** Selection range start. Bindable. */
		selectionStart?: number;
		/** Selection range end. Bindable. */
		selectionEnd?: number;
		/** Hide the selection band + handles. Default: auto (show when both bounds set). */
		showSelection?: boolean;
		/** Include a "skip to selection start" button next to play. */
		showSkipToStart?: boolean;
		/** Highlighted labeled regions. */
		segments?: TimelineSegment[];
		/** Format a time value for display. Default: mm:ss (or h:mm:ss for ≥1h). */
		formatTime?: (seconds: number) => string;
		/** Seek callback (from track click or playhead drag). */
		onSeek?: (time: number) => void;
		/** Fired every frame while a selection handle is dragged. */
		onSelectionChange?: (selection: TimelineSelection) => void;
		/** Fired when a selection drag is released. */
		onSelectionCommit?: (selection: TimelineSelection) => void;
		/** Fired when the user toggles play. */
		onPlayToggle?: (nowPlaying: boolean) => void;
		/** Fired when the user cycles the speed. */
		onSpeedChange?: (speed: number) => void;
		/** Fired when the user clicks a segment. */
		onSegmentClick?: (segment: TimelineSegment) => void;
		/** Snippet rendered above the hover x position. */
		hoverPreview?: Snippet<[{ time: number; xPercent: number }]>;
		class?: string;
	}

	let {
		duration,
		currentTime = $bindable(0),
		isPlaying = $bindable(false),
		speed = $bindable(1),
		speedOptions = [1, 2, 4, 8, 16],
		speedLocked = false,
		speedLockedReason,
		selectionStart = $bindable<number | undefined>(undefined),
		selectionEnd = $bindable<number | undefined>(undefined),
		showSelection,
		showSkipToStart = true,
		segments = [],
		formatTime = defaultFormatTime,
		onSeek,
		onSelectionChange,
		onSelectionCommit,
		onPlayToggle,
		onSpeedChange,
		onSegmentClick,
		hoverPreview,
		class: className = ''
	}: Props = $props();

	let timeMode = $state<'total' | 'remaining'>('total');

	const remaining = $derived(Math.max(0, duration - currentTime));

	function defaultFormatTime(seconds: number): string {
		if (!isFinite(seconds)) return '00:00';
		const total = Math.max(0, Math.floor(seconds));
		const h = Math.floor(total / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;
		if (h > 0) {
			return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		}
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	function togglePlay() {
		isPlaying = !isPlaying;
		onPlayToggle?.(isPlaying);
	}

	function cycleSpeed() {
		if (speedLocked) return;
		if (speedOptions.length === 0) return;
		const idx = speedOptions.indexOf(speed);
		const next = speedOptions[(idx + 1) % speedOptions.length] ?? speedOptions[0] ?? 1;
		speed = next;
		onSpeedChange?.(next);
	}

	function handleSkipToStart() {
		const target = selectionStart ?? 0;
		currentTime = target;
		onSeek?.(target);
	}

	function toggleTimeMode() {
		timeMode = timeMode === 'total' ? 'remaining' : 'total';
	}
</script>

<div class="timeline-scrubber {className}">
	<div class="timeline-scrubber__track-row">
		<TimelineTrack
			{duration}
			bind:currentTime
			bind:selectionStart
			bind:selectionEnd
			{showSelection}
			{segments}
			{onSeek}
			{onSelectionChange}
			{onSelectionCommit}
			{onSegmentClick}
			{hoverPreview}
		/>
	</div>

	<div class="timeline-scrubber__controls-row">
		<button
			type="button"
			class="timeline-scrubber__btn timeline-scrubber__btn--play"
			aria-pressed={isPlaying}
			aria-label={isPlaying ? 'Pause' : 'Play'}
			title={isPlaying ? 'Pause' : 'Play'}
			onclick={togglePlay}
		>
			{#if isPlaying}
				<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
					<path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
					<path d="M8 5v14l11-7z" fill="currentColor" />
				</svg>
			{/if}
		</button>

		{#if showSkipToStart}
			<button
				type="button"
				class="timeline-scrubber__btn"
				aria-label="Skip to start"
				title="Skip to start"
				onclick={handleSkipToStart}
			>
				<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
					<path d="M6 5h2v14H6zM20 5 9 12l11 7z" fill="currentColor" />
				</svg>
			</button>
		{/if}

		<button
			type="button"
			class="timeline-scrubber__btn timeline-scrubber__btn--speed"
			class:is-locked={speedLocked}
			aria-label="Playback speed: {speed}x{speedLocked
				? ` (locked${speedLockedReason ? ': ' + speedLockedReason : ''})`
				: ''}"
			title={speedLocked ? (speedLockedReason ?? 'Speed locked') : 'Click to change speed'}
			disabled={speedLocked}
			onclick={cycleSpeed}
		>
			<span>{speed}×</span>
		</button>

		<button
			type="button"
			class="timeline-scrubber__time-display"
			aria-label="Toggle time display"
			title={timeMode === 'total' ? 'Click to show remaining time' : 'Click to show total time'}
			onclick={toggleTimeMode}
		>
			<span class="timeline-scrubber__time-curr">{formatTime(currentTime)}</span>
			<span class="timeline-scrubber__time-sep">/</span>
			{#if timeMode === 'remaining'}
				<span class="timeline-scrubber__time-alt">-{formatTime(remaining)}</span>
			{:else}
				<span class="timeline-scrubber__time-total">{formatTime(duration)}</span>
			{/if}
		</button>
	</div>
</div>

<style>
	.timeline-scrubber {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: 4px;
		padding: 6px 10px 8px;
		box-sizing: border-box;
		font:
			14px/1 system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;

		--ts-btn-bg: #ffffff;
		--ts-btn-bg-hover: #f9fafb;
		--ts-btn-bg-active: #f3f4f6;
		--ts-btn-border: rgba(0, 0, 0, 0.12);
		--ts-btn-border-hover: rgba(0, 0, 0, 0.22);
		--ts-btn-fg: #1f2937;
		--ts-btn-fg-hover: #111827;
		--ts-time-fg: #1f2937;
		--ts-time-muted-fg: #6b7280;
	}

	.timeline-scrubber__track-row {
		width: 100%;
	}

	.timeline-scrubber__controls-row {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
		gap: 4px;
		min-height: 36px;
		flex-wrap: nowrap;
	}

	.timeline-scrubber__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		background: var(--ts-btn-bg);
		border: 1px solid var(--ts-btn-border);
		border-radius: 6px;
		padding: 0 10px;
		min-width: 36px;
		height: 36px;
		color: var(--ts-btn-fg);
		cursor: pointer;
		font: inherit;
		line-height: 1;
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			color 120ms ease,
			opacity 120ms ease;
		flex: 0 0 auto;
	}

	.timeline-scrubber__btn:hover:not(:disabled) {
		background: var(--ts-btn-bg-hover);
		border-color: var(--ts-btn-border-hover);
		color: var(--ts-btn-fg-hover);
	}

	.timeline-scrubber__btn:active:not(:disabled) {
		background: var(--ts-btn-bg-active);
	}

	.timeline-scrubber__btn:focus-visible {
		outline: 2px solid var(--ts-btn-fg);
		outline-offset: 2px;
	}

	.timeline-scrubber__btn:disabled {
		cursor: not-allowed;
	}

	.timeline-scrubber__btn--speed {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		font-size: 13px;
		padding: 0 10px;
		min-width: 42px;
	}

	.timeline-scrubber__btn--speed.is-locked {
		opacity: 0.5;
	}

	.timeline-scrubber__time-display {
		background: transparent;
		border: 1px solid transparent;
		padding: 6px 10px;
		margin: 0;
		border-radius: 6px;
		cursor: pointer;
		font: inherit;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		color: var(--ts-time-fg);
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex: 0 0 auto;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
		white-space: nowrap;
	}

	.timeline-scrubber__time-display:hover {
		background: var(--ts-btn-bg-hover);
		border-color: var(--ts-btn-border);
	}

	.timeline-scrubber__time-display:focus-visible {
		outline: 2px solid var(--ts-btn-fg);
		outline-offset: 2px;
	}

	.timeline-scrubber__time-curr {
		color: var(--ts-time-fg);
		font-weight: 500;
	}

	.timeline-scrubber__time-sep {
		color: var(--ts-time-muted-fg);
		opacity: 0.5;
	}

	.timeline-scrubber__time-total,
	.timeline-scrubber__time-alt {
		color: var(--ts-time-muted-fg);
	}
</style>
