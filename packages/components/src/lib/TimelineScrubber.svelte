<script lang="ts">
	import type { Snippet } from 'svelte';
	import TimelineTrack, {
		type TimelineSegment,
		type TimelineViewWindow
	} from './TimelineTrack.svelte';

	// Full timeline widget: scrub track + play/pause + speed picker + time
	// display. For apps that want the standard canvas-app timeline shape
	// without reinventing controls.
	//
	// TimelineScrubber layers on top of <TimelineTrack> — reach for the track
	// directly if you want custom chrome around it.
	//
	// Bindable: currentTime, isPlaying, speed, viewWindow. The consumer owns
	// the animation loop that advances currentTime when isPlaying is true —
	// this component just displays state and surfaces user intent.
	//
	// `speedLocked` (with an optional reason) is the UX-disclosure hook for
	// video-driven playback, where the speed multiplier is effectively
	// ignored. Set it to true and the speed button renders muted with a
	// title-tip.
	//
	// See the package README for usage examples.

	interface Props {
		duration: number;
		currentTime?: number;
		isPlaying?: boolean;
		speed?: number;
		/** Available speed presets. Default: [1, 2, 4, 8, 16]. */
		speedOptions?: number[];
		/** Render speed as disabled / muted. Use when video playback overrides it. */
		speedLocked?: boolean;
		/** Title/tooltip shown when `speedLocked` is true. */
		speedLockedReason?: string;
		/** Optional zoomed view window; bindable. */
		viewWindow?: TimelineViewWindow;
		segments?: TimelineSegment[];
		/** Format `currentTime` and `duration` for display. Default: mm:ss. */
		formatTime?: (seconds: number) => string;
		onSeek?: (time: number) => void;
		onPlayToggle?: (nowPlaying: boolean) => void;
		onSpeedChange?: (speed: number) => void;
		onSegmentClick?: (segment: TimelineSegment) => void;
		/** Snippet rendered above the hovered time, e.g. for a turn-preview tooltip. */
		hoverIndicator?: Snippet<[{ time: number; left: number }]>;
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
		viewWindow = $bindable(undefined),
		segments = [],
		formatTime = defaultFormatTime,
		onSeek,
		onPlayToggle,
		onSpeedChange,
		onSegmentClick,
		hoverIndicator,
		class: className = ''
	}: Props = $props();

	function defaultFormatTime(seconds: number): string {
		if (!isFinite(seconds)) return '00:00';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
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
</script>

<div class="timeline-scrubber {className}">
	<div class="timeline-scrubber__track">
		<span class="timeline-scrubber__time" aria-label="start"
			>{formatTime(viewWindow?.start ?? 0)}</span
		>
		<TimelineTrack
			{duration}
			bind:currentTime
			bind:viewWindow
			{segments}
			{onSeek}
			{onSegmentClick}
			{hoverIndicator}
		/>
		<span class="timeline-scrubber__time" aria-label="end">
			{formatTime(viewWindow?.end ?? duration)}
		</span>
	</div>

	<div class="timeline-scrubber__controls">
		<button
			type="button"
			class="timeline-scrubber__btn"
			aria-pressed={isPlaying}
			aria-label={isPlaying ? 'Pause' : 'Play'}
			onclick={togglePlay}
		>
			{isPlaying ? '❚❚' : '▶'}
		</button>

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
			{speed}×{speedLocked ? ' ·' : ''}
		</button>

		<span class="timeline-scrubber__currtime" aria-label="Current time">
			{formatTime(currentTime)}
		</span>
	</div>
</div>

<style>
	.timeline-scrubber {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font:
			12px/1 system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;
	}

	.timeline-scrubber__track {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.timeline-scrubber__track :global(.timeline-track) {
		flex: 1 1 auto;
		min-width: 0;
	}

	.timeline-scrubber__time {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 11px;
		color: #6b7280;
		min-width: 3.5em;
		text-align: center;
	}

	.timeline-scrubber__controls {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: center;
	}

	.timeline-scrubber__btn {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 4px 10px;
		cursor: pointer;
		font: inherit;
		line-height: 1;
	}

	.timeline-scrubber__btn:hover:not(:disabled) {
		background: #f3f4f6;
	}

	.timeline-scrubber__btn:disabled {
		cursor: not-allowed;
	}

	.timeline-scrubber__btn--speed {
		min-width: 3em;
		font-variant-numeric: tabular-nums;
	}

	.timeline-scrubber__btn--speed.is-locked {
		opacity: 0.5;
	}

	.timeline-scrubber__currtime {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 12px;
		color: #111;
		min-width: 4em;
		text-align: right;
	}
</style>
