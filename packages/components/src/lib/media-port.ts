/**
 * The media port: what `createMediaSync` and `createMediaPlayback` need from a
 * playback source, independent of what that source actually is.
 *
 * An `HTMLMediaElement` is one implementation; `htmlMediaPort` ships with the
 * library and both helpers accept a raw element, so the common case needs none
 * of this. Implement a port yourself to drive a source that is not a media
 * element at all: a YouTube iframe player, a WebAudio graph, a remote
 * transport, a fake in a test.
 */

/** Observe-and-seek. This is all `createMediaSync` requires. */
export interface MediaSource {
	/** Current playback position, in seconds. */
	readonly currentTime: number;
	/** Total duration in seconds, or 0 when unknown or not finite. */
	readonly duration: number;
	readonly paused: boolean;
	readonly ended: boolean;
	/** Jump to `time`. Callers clamp into `[0, duration]` first. */
	seek(time: number): void;
	/**
	 * Report state changes (play, pause, end, duration). Return an unsubscribe.
	 *
	 * Optional. A source that cannot push events omits it and the helper polls
	 * instead, so an adapter is never obliged to invent an event system.
	 */
	subscribe?(onChange: () => void): () => void;
}

/** Adds transport control. This is what `createMediaPlayback` requires. */
export interface MediaPort extends MediaSource {
	play(): void;
	pause(): void;
}

/** Wrap an `HTMLMediaElement` as a port. */
export function htmlMediaPort(el: HTMLMediaElement): MediaPort {
	return {
		get currentTime() {
			return el.currentTime;
		},
		get duration() {
			return isFinite(el.duration) ? el.duration : 0;
		},
		get paused() {
			return el.paused;
		},
		get ended() {
			return el.ended;
		},
		seek(time) {
			el.currentTime = time;
		},
		play() {
			// play() rejects under autoplay policies; that is not an error here.
			el.play()?.catch(() => {});
		},
		pause() {
			el.pause();
		},
		subscribe(onChange) {
			const events = ['timeupdate', 'durationchange', 'play', 'pause', 'ended'] as const;
			for (const e of events) el.addEventListener(e, onChange);
			return () => {
				for (const e of events) el.removeEventListener(e, onChange);
			};
		}
	};
}

// Duck-typed rather than `instanceof HTMLMediaElement`, which is not defined
// during SSR and would throw before the element check could run.
function isPort(src: unknown): src is MediaSource {
	return !!src && typeof (src as MediaSource).seek === 'function';
}

/** Normalise an element or an already-built port into a port. */
export function toMediaPort(src: HTMLMediaElement | MediaPort | null): MediaPort | null {
	if (!src) return null;
	return isPort(src) ? (src as MediaPort) : htmlMediaPort(src as HTMLMediaElement);
}

/** Normalise an element or source into a source. */
export function toMediaSource(src: HTMLMediaElement | MediaSource | null): MediaSource | null {
	if (!src) return null;
	return isPort(src) ? src : htmlMediaPort(src as HTMLMediaElement);
}

/** Scheduling seams, so tests can drive the poll loop deterministically. */
export interface TickerScheduler {
	raf(cb: () => void): number;
	cancelRaf(id: number): void;
	interval(cb: () => void, ms: number): number;
	clearInterval(id: number): void;
}

export const defaultScheduler: TickerScheduler = {
	raf: (cb) => requestAnimationFrame(cb),
	cancelRaf: (id) => cancelAnimationFrame(id),
	interval: (cb, ms) => setInterval(cb, ms) as unknown as number,
	clearInterval: (id) => clearInterval(id)
};

/** How often a port with no `subscribe` is checked while it is paused. */
export const IDLE_POLL_MS = 250;

/**
 * Samples a source: once per animation frame while `isActive()` holds, and at
 * `idleMs` otherwise.
 *
 * The idle phase exists only for ports with no `subscribe`; without it, a
 * paused polled source could start playing and never be noticed. Ports that do
 * subscribe pass `idleMs: 0` and go fully quiet when paused.
 *
 * Stopping on inactive is the point. Consumers of these helpers have twice
 * hand-rolled a loop that reschedules unconditionally and burns a frame
 * callback for the lifetime of the component.
 */
export function createPoller(
	onSample: () => void,
	isActive: () => boolean,
	options: { scheduler?: TickerScheduler; idleMs?: number } = {}
) {
	const scheduler = options.scheduler ?? defaultScheduler;
	const idleMs = options.idleMs ?? 0;
	let rafId = 0;
	let idleId = 0;

	function stopIdle() {
		if (!idleId) return;
		scheduler.clearInterval(idleId);
		idleId = 0;
	}

	function startIdle() {
		if (idleId || idleMs <= 0) return;
		idleId = scheduler.interval(() => {
			onSample();
			if (isActive()) {
				stopIdle();
				startFrames();
			}
		}, idleMs);
	}

	function frame() {
		onSample();
		if (isActive()) {
			rafId = scheduler.raf(frame);
		} else {
			rafId = 0;
			startIdle();
		}
	}

	function startFrames() {
		if (rafId) return;
		rafId = scheduler.raf(frame);
	}

	return {
		get running() {
			return rafId !== 0;
		},
		get idling() {
			return idleId !== 0;
		},
		/** Begin sampling. Picks the frame loop or the idle loop from `isActive()`. */
		start() {
			if (isActive()) {
				stopIdle();
				startFrames();
			} else {
				startIdle();
			}
		},
		/** Called by the owner when a subscribed source reports a change. */
		sync() {
			if (isActive()) {
				stopIdle();
				startFrames();
			}
		},
		stop() {
			if (rafId) {
				scheduler.cancelRaf(rafId);
				rafId = 0;
			}
			stopIdle();
		}
	};
}
