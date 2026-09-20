/**
 * Drive an HTMLMediaElement with per-visualization playback strategies.
 *
 * Where `createMediaSync` only bridges the media→timeline direction (and
 * surfaces the speed-lock signal), `createMediaPlayback` owns the playback
 * verbs that consuming apps reach for repeatedly:
 *
 * - `playFrom(time)` — seek somewhere and start playing. The bread-and-butter
 *   "jump to this word / this event and watch it" action.
 *
 * - `playSnippets(times, secondsEach)` — play a series of short clips back to
 *   back (each `times[i]` for `secondsEach` seconds), then stop. Think
 *   "preview every match" or "play the highlight reel". The orchestrator
 *   advances the queue on each `timeupdate` so the consumer doesn't have to
 *   babysit timers.
 *
 * - `pause()` / `stop()` — the obvious two, where `stop()` also clears any
 *   pending snippet queue.
 *
 * `isPlaying` and `activeSnippetIndex` are `$state`, so a component can react
 * to them (highlight the snippet currently playing, flip a play/pause icon).
 *
 * Seeks are clamped exactly like `createMediaSync.seek` — guarding NaN /
 * Infinity and clamping into [0, duration].
 *
 * @example
 * ```ts
 * const playback = createMediaPlayback();
 *
 * $effect(() => { playback.attach(videoElement); });
 *
 * // Jump to a word and play it:
 * playback.playFrom(word.start);
 *
 * // Preview every match for 2s each:
 * playback.playSnippets(matches.map((m) => m.start), 2);
 *
 * // React in markup:
 * class:is-active={i === playback.activeSnippetIndex}
 * ```
 */

import {
	createPoller,
	toMediaPort,
	IDLE_POLL_MS,
	type MediaPort,
	type TickerScheduler
} from './media-port.js';

export interface MediaPlaybackOptions {
	/** Injectable scheduling, for tests. */
	scheduler?: TickerScheduler;
}

export interface MediaPlayback {
	/** True while the attached media is playing. */
	readonly isPlaying: boolean;
	/** Index into the current snippet queue, or -1 when not in a snippet sequence. */
	readonly activeSnippetIndex: number;
	/** Attach to a media element or a port. Re-attaching switches to the new one. */
	attach(src: HTMLMediaElement | MediaPort | null): void;
	/** Remove listeners + clear the queue; idempotent. Called automatically when `attach(null)`. */
	detach(): void;
	/** Seek to `time` (clamped) and play. Cancels any active snippet sequence. */
	playFrom(time: number): void;
	/** Play each start time in `times` for `secondsEach` seconds, in order, then stop. */
	playSnippets(times: number[], secondsEach: number): void;
	/** Pause without clearing position. */
	pause(): void;
	/** Stop playback and clear any snippet queue. */
	stop(): void;
}

export function createMediaPlayback(options: MediaPlaybackOptions = {}): MediaPlayback {
	let port: MediaPort | null = null;
	let unsubscribe: (() => void) | null = null;
	let poller: ReturnType<typeof createPoller> | null = null;
	let isPlaying = $state(false);
	let activeSnippetIndex = $state(-1);

	// Snippet queue: the start times to play and how long to hold each.
	let queue: number[] = [];
	let snippetSeconds = 0;

	function clampTime(time: number): number | null {
		if (!port) return null;
		const dur =
			isFinite(port.duration) && port.duration > 0 ? port.duration : Number.MAX_SAFE_INTEGER;
		const clamped = Math.max(0, Math.min(dur, time));
		if (!isFinite(clamped)) return null;
		return clamped;
	}

	function clearQueue() {
		queue = [];
		snippetSeconds = 0;
		activeSnippetIndex = -1;
	}

	function running() {
		return !!port && !port.paused && !port.ended;
	}

	function sample() {
		if (!port) return;
		isPlaying = running();
		advanceSnippet();
	}

	function advanceSnippet() {
		if (!port || activeSnippetIndex < 0) return;
		const start = queue[activeSnippetIndex];
		if (start === undefined) return;
		if (port.currentTime - start < snippetSeconds) return;

		const nextIndex = activeSnippetIndex + 1;
		if (nextIndex >= queue.length) {
			stopInner();
			return;
		}
		const nextStart = clampTime(queue[nextIndex] as number);
		activeSnippetIndex = nextIndex;
		if (nextStart !== null) port.seek(nextStart);
	}

	function stopInner() {
		clearQueue();
		port?.pause();
		isPlaying = false;
	}

	function detachInner() {
		poller?.stop();
		poller = null;
		unsubscribe?.();
		unsubscribe = null;
		port = null;
	}

	return {
		get isPlaying() {
			return isPlaying;
		},
		get activeSnippetIndex() {
			return activeSnippetIndex;
		},
		attach(next) {
			detachInner();
			clearQueue();
			port = toMediaPort(next);
			if (!port) {
				isPlaying = false;
				return;
			}
			isPlaying = running();
			poller = createPoller(sample, running, {
				scheduler: options.scheduler,
				idleMs: port.subscribe ? 0 : IDLE_POLL_MS
			});
			if (port.subscribe) {
				unsubscribe = port.subscribe(() => {
					sample();
					poller?.sync();
				});
			}
			poller.start();
		},
		detach() {
			detachInner();
			clearQueue();
			isPlaying = false;
		},
		playFrom(time) {
			if (!port) return;
			clearQueue();
			const clamped = clampTime(time);
			if (clamped === null) return;
			port.seek(clamped);
			port.play();
			isPlaying = running();
			poller?.sync();
		},
		playSnippets(times, secondsEach) {
			if (!port) return;
			const finite = times.filter((t) => isFinite(t));
			if (finite.length === 0) return;
			queue = finite;
			snippetSeconds = secondsEach;
			activeSnippetIndex = 0;
			const start = clampTime(queue[0] as number);
			if (start !== null) port.seek(start);
			port.play();
			isPlaying = running();
			poller?.sync();
		},
		pause() {
			port?.pause();
			isPlaying = running();
		},
		stop() {
			stopInner();
		}
	};
}
