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

export interface MediaPlayback {
	/** True while the attached media is playing. */
	readonly isPlaying: boolean;
	/** Index into the current snippet queue, or -1 when not in a snippet sequence. */
	readonly activeSnippetIndex: number;
	/** Attach to an HTMLMediaElement. Re-attaching switches to the new one. */
	attach(el: HTMLMediaElement | null): void;
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

export function createMediaPlayback(): MediaPlayback {
	let el: HTMLMediaElement | null = null;
	let isPlaying = $state(false);
	let activeSnippetIndex = $state(-1);

	// Snippet queue: the start times to play and how long to hold each.
	let queue: number[] = [];
	let snippetSeconds = 0;

	function clampTime(time: number): number | null {
		if (!el) return null;
		const dur = isFinite(el.duration) ? el.duration : Number.MAX_SAFE_INTEGER;
		const clamped = Math.max(0, Math.min(dur, time));
		if (!isFinite(clamped)) return null;
		return clamped;
	}

	function clearQueue() {
		queue = [];
		snippetSeconds = 0;
		activeSnippetIndex = -1;
	}

	function playEl() {
		// play() can reject under autoplay policies — swallow it safely.
		el?.play()?.catch(() => {});
	}

	function onPlay() {
		isPlaying = true;
	}
	function onPause() {
		isPlaying = false;
	}
	function onEnded() {
		isPlaying = false;
	}

	function onTimeUpdate() {
		// Only meaningful while running a snippet sequence.
		if (!el || activeSnippetIndex < 0) return;
		const start = queue[activeSnippetIndex];
		if (start === undefined) return;
		if (el.currentTime - start < snippetSeconds) return;

		// This snippet's time is up — advance to the next, or stop.
		const nextIndex = activeSnippetIndex + 1;
		if (nextIndex >= queue.length) {
			stopInner();
			return;
		}
		const nextStart = clampTime(queue[nextIndex] as number);
		activeSnippetIndex = nextIndex;
		if (nextStart !== null) el.currentTime = nextStart;
	}

	function stopInner() {
		clearQueue();
		if (el) el.pause();
	}

	function detachInner() {
		if (!el) return;
		el.removeEventListener('timeupdate', onTimeUpdate);
		el.removeEventListener('play', onPlay);
		el.removeEventListener('pause', onPause);
		el.removeEventListener('ended', onEnded);
		el = null;
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
			el = next;
			if (!el) {
				isPlaying = false;
				return;
			}
			isPlaying = !el.paused && !el.ended;
			el.addEventListener('timeupdate', onTimeUpdate);
			el.addEventListener('play', onPlay);
			el.addEventListener('pause', onPause);
			el.addEventListener('ended', onEnded);
		},
		detach() {
			detachInner();
			clearQueue();
			isPlaying = false;
		},
		playFrom(time) {
			if (!el) return;
			clearQueue();
			const clamped = clampTime(time);
			if (clamped === null) return;
			el.currentTime = clamped;
			playEl();
		},
		playSnippets(times, secondsEach) {
			if (!el) return;
			const finite = times.filter((t) => isFinite(t));
			if (finite.length === 0) return;
			queue = finite;
			snippetSeconds = secondsEach;
			activeSnippetIndex = 0;
			const start = clampTime(queue[0] as number);
			if (start !== null) el.currentTime = start;
			playEl();
		},
		pause() {
			if (!el) return;
			el.pause();
		},
		stop() {
			stopInner();
		}
	};
}
