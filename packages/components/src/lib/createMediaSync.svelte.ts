/**
 * Sync a timeline's `currentTime` with an HTMLMediaElement (video or audio).
 *
 * The "speed multiplier quietly becomes a no-op while video is playing" bug
 * appears in every app that wires a timeline to a video player without
 * thinking about it carefully. `createMediaSync` handles the branch
 * explicitly:
 *
 * - If the media element is playing, `isLocked === true` — the timeline
 *   should display the video's currentTime and should *not* advance
 *   currentTime from its own animation loop. Surface `isLocked` to the user
 *   (see `<TimelineScrubber speedLocked>`) so the speed multiplier's
 *   inactivity is visible rather than silent.
 *
 * - If the media element is paused or unloaded, the timeline is free to run
 *   its own animation loop and the consumer's speed multiplier applies.
 *
 * Consumers own the animation loop (an rAF tick that advances currentTime
 * by `speed * deltaMs / 1000`). `createMediaSync` only bridges the
 * media→timeline direction and surfaces the lock signal.
 *
 * Use `.seek(time)` to write the other direction (timeline→media) — the
 * helper clamps to the media's duration and guards against NaN.
 *
 * @example
 * ```ts
 * const sync = createMediaSync();
 *
 * $effect(() => { sync.attach(videoElement); });
 *
 * // In your rAF loop:
 * if (sync.isLocked) currentTime = sync.mediaTime;
 * else currentTime += speed * dt / 1000;
 *
 * // When user scrubs the timeline:
 * sync.seek(newTime);
 * ```
 */

export interface MediaSync {
	/** The media element's currentTime, when attached. */
	readonly mediaTime: number;
	/** The media element's duration (possibly Infinity for streams). */
	readonly mediaDuration: number;
	/** True when the media is playing — timeline should follow, not drive. */
	readonly isLocked: boolean;
	/** Attach the sync to an HTMLMediaElement. Re-attaching switches to the new one. */
	attach(el: HTMLMediaElement | null): void;
	/** Remove listeners; idempotent. Called automatically when `attach(null)`. */
	detach(): void;
	/** Seek the attached media to `time`, clamped into [0, duration]. */
	seek(time: number): void;
}

export function createMediaSync(): MediaSync {
	let el: HTMLMediaElement | null = null;
	let mediaTime = $state(0);
	let mediaDuration = $state(0);
	let isLocked = $state(false);

	function onTimeUpdate() {
		if (el) mediaTime = el.currentTime;
	}
	function onDurationChange() {
		if (el) mediaDuration = isFinite(el.duration) ? el.duration : 0;
	}
	function onPlay() {
		isLocked = true;
	}
	function onPause() {
		isLocked = false;
	}
	function onEnded() {
		isLocked = false;
	}

	function detachInner() {
		if (!el) return;
		el.removeEventListener('timeupdate', onTimeUpdate);
		el.removeEventListener('durationchange', onDurationChange);
		el.removeEventListener('play', onPlay);
		el.removeEventListener('pause', onPause);
		el.removeEventListener('ended', onEnded);
		el = null;
	}

	return {
		get mediaTime() {
			return mediaTime;
		},
		get mediaDuration() {
			return mediaDuration;
		},
		get isLocked() {
			return isLocked;
		},
		attach(next) {
			detachInner();
			el = next;
			if (!el) {
				mediaTime = 0;
				mediaDuration = 0;
				isLocked = false;
				return;
			}
			mediaTime = el.currentTime;
			mediaDuration = isFinite(el.duration) ? el.duration : 0;
			isLocked = !el.paused && !el.ended;
			el.addEventListener('timeupdate', onTimeUpdate);
			el.addEventListener('durationchange', onDurationChange);
			el.addEventListener('play', onPlay);
			el.addEventListener('pause', onPause);
			el.addEventListener('ended', onEnded);
		},
		detach() {
			detachInner();
			mediaTime = 0;
			mediaDuration = 0;
			isLocked = false;
		},
		seek(time) {
			if (!el) return;
			const dur = isFinite(el.duration) ? el.duration : Number.MAX_SAFE_INTEGER;
			const clamped = Math.max(0, Math.min(dur, time));
			if (!isFinite(clamped)) return;
			el.currentTime = clamped;
		}
	};
}
