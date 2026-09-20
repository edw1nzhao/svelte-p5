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
 * `attach` takes a raw `HTMLMediaElement` or any `MediaSource` port, so a
 * source that is not a media element (a YouTube iframe player, say) is wired
 * by writing a small adapter rather than a second sync path. A port without
 * `subscribe` is polled; see `media-port.ts`.
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

import {
	createPoller,
	toMediaSource,
	IDLE_POLL_MS,
	type MediaSource,
	type TickerScheduler
} from './media-port.js';

export interface MediaSyncOptions {
	/** Injectable scheduling, for tests. */
	scheduler?: TickerScheduler;
}

export interface MediaSync {
	/** The media element's currentTime, when attached. */
	readonly mediaTime: number;
	/** The media element's duration (possibly Infinity for streams). */
	readonly mediaDuration: number;
	/** True when the media is playing — timeline should follow, not drive. */
	readonly isLocked: boolean;
	/** Attach to a media element or a port. Re-attaching switches to the new one. */
	attach(src: HTMLMediaElement | MediaSource | null): void;
	/** Remove listeners; idempotent. Called automatically when `attach(null)`. */
	detach(): void;
	/** Seek the attached media to `time`, clamped into [0, duration]. */
	seek(time: number): void;
}

export function createMediaSync(options: MediaSyncOptions = {}): MediaSync {
	let port: MediaSource | null = null;
	let unsubscribe: (() => void) | null = null;
	let poller: ReturnType<typeof createPoller> | null = null;
	let mediaTime = $state(0);
	let mediaDuration = $state(0);
	let isLocked = $state(false);

	function read() {
		if (!port) return;
		mediaTime = port.currentTime;
		mediaDuration = isFinite(port.duration) ? port.duration : 0;
		isLocked = !port.paused && !port.ended;
	}

	function isPlaying() {
		return !!port && !port.paused && !port.ended;
	}

	function detachInner() {
		poller?.stop();
		poller = null;
		unsubscribe?.();
		unsubscribe = null;
		port = null;
	}

	function clearState() {
		mediaTime = 0;
		mediaDuration = 0;
		isLocked = false;
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
			port = toMediaSource(next);
			if (!port) {
				clearState();
				return;
			}
			read();
			poller = createPoller(read, isPlaying, {
				scheduler: options.scheduler,
				// A subscribing port announces its own resume; one that cannot
				// must be checked for it, or a paused source would never restart.
				idleMs: port.subscribe ? 0 : IDLE_POLL_MS
			});
			if (port.subscribe) {
				unsubscribe = port.subscribe(() => {
					read();
					poller?.sync();
				});
			}
			poller.start();
		},
		detach() {
			detachInner();
			clearState();
		},
		seek(time) {
			if (!port) return;
			const dur =
				isFinite(port.duration) && port.duration > 0 ? port.duration : Number.MAX_SAFE_INTEGER;
			const clamped = Math.max(0, Math.min(dur, time));
			if (!isFinite(clamped)) return;
			port.seek(clamped);
			read();
		}
	};
}
