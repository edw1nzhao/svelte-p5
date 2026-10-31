// YouTube adapter for the media port. Kept out of the main entry so the library
// carries no YouTube code or types; callers bring any `YT.Player`-shaped object.

import type { MediaPort } from './media-port.js';

/** The IFrame API's player states, as `getPlayerState()` reports them. */
export const YouTubePlayerState = {
	UNSTARTED: -1,
	ENDED: 0,
	PLAYING: 1,
	PAUSED: 2,
	BUFFERING: 3,
	CUED: 5
} as const;

/** The `onStateChange` payload, reduced to the part the adapter reads. */
export interface YouTubeStateChangeEvent {
	data: number;
}

/** The subset of `YT.Player` this module uses. A real `YT.Player` satisfies it. */
export interface YouTubePlayerLike {
	getCurrentTime(): number;
	getDuration(): number;
	getPlayerState(): number;
	seekTo(seconds: number, allowSeekAhead: boolean): void;
	playVideo(): void;
	pauseVideo(): void;
	setPlaybackRate(rate: number): void;
	mute(): void;
	unMute(): void;
	addEventListener(
		event: 'onStateChange',
		listener: (event: YouTubeStateChangeEvent) => void
	): void;
	removeEventListener(
		event: 'onStateChange',
		listener: (event: YouTubeStateChangeEvent) => void
	): void;
	getIframe?(): HTMLIFrameElement | null;
	destroy(): void;
}

export interface YouTubePortOptions {
	/** A reported time within this many seconds of a seek target counts as landed. Default 1. */
	seekTolerance?: number;
	/** Stop reporting a seek target after this many ms even if the player never got there. Default 1000. */
	seekTimeoutMs?: number;
	/** Millisecond clock, for tests. Default `performance.now`. */
	now?: () => number;
}

/** A `MediaPort` plus the YouTube controls apps reach for beside it. */
export interface YouTubeMediaPort extends MediaPort {
	/** True once the player's methods exist and its iframe is in the document. */
	readonly ready: boolean;
	setPlaybackRate(rate: number): void;
	setMuted(muted: boolean): void;
}

const { UNSTARTED, ENDED, PLAYING, PAUSED, BUFFERING } = YouTubePlayerState;

/** Wrap a YouTube player as a `MediaPort`. Every call is a safe no-op until it is ready. */
export function youTubePort(
	player: YouTubePlayerLike,
	options: YouTubePortOptions = {}
): YouTubeMediaPort {
	const tolerance = options.seekTolerance ?? 1;
	const timeoutMs = options.seekTimeoutMs ?? 1000;
	const now = options.now ?? (() => performance.now());

	let lastState: number = UNSTARTED;
	let wantsPlay = false;
	let holdPaused = false;
	let pendingSeek: { time: number; deadline: number } | null = null;

	function isReady(): boolean {
		if (typeof player.getCurrentTime !== 'function') return false;
		try {
			const iframe = player.getIframe?.();
			return iframe === undefined || (!!iframe && iframe.isConnected);
		} catch {
			return false;
		}
	}

	function call<T>(fn: () => T, fallback: T): T {
		if (!isReady()) return fallback;
		try {
			return fn();
		} catch {
			return fallback;
		}
	}

	function observe(state: number): number {
		if (state === PLAYING && holdPaused) {
			// seekTo from any state but PAUSED starts playback; undo that.
			holdPaused = false;
			call(() => player.pauseVideo(), undefined);
			lastState = PAUSED;
			return PAUSED;
		}
		if (state === PLAYING) wantsPlay = true;
		else if (state === PAUSED || state === ENDED) wantsPlay = false;
		if (state === PAUSED) holdPaused = false;
		lastState = state;
		return state;
	}

	function state(): number {
		return observe(call(() => player.getPlayerState(), lastState));
	}

	const port: YouTubeMediaPort = {
		get ready() {
			return isReady();
		},
		get currentTime() {
			const actual = call(() => player.getCurrentTime(), 0);
			if (!pendingSeek) return actual;
			if (Math.abs(actual - pendingSeek.time) <= tolerance || now() >= pendingSeek.deadline) {
				pendingSeek = null;
				return actual;
			}
			return pendingSeek.time;
		},
		get duration() {
			const d = call(() => player.getDuration(), 0);
			return isFinite(d) && d > 0 ? d : 0;
		},
		get paused() {
			const s = state();
			return !(s === PLAYING || (s === BUFFERING && wantsPlay));
		},
		get ended() {
			return state() === ENDED;
		},
		seek(time) {
			if (!isReady()) return;
			const s = state();
			if (!wantsPlay && s !== PAUSED) holdPaused = true;
			pendingSeek = { time, deadline: now() + timeoutMs };
			call(() => player.seekTo(time, true), undefined);
		},
		play() {
			if (!isReady()) return;
			holdPaused = false;
			wantsPlay = true;
			call(() => player.playVideo(), undefined);
		},
		pause() {
			if (!isReady()) return;
			wantsPlay = false;
			call(() => player.pauseVideo(), undefined);
		},
		setPlaybackRate(rate) {
			call(() => player.setPlaybackRate(rate), undefined);
		},
		setMuted(muted) {
			call(() => (muted ? player.mute() : player.unMute()), undefined);
		}
	};

	if (typeof player.addEventListener === 'function') {
		port.subscribe = (onChange) => {
			let live = true;
			const listener = (event: YouTubeStateChangeEvent) => {
				if (!live) return;
				observe(event.data);
				onChange();
			};
			player.addEventListener('onStateChange', listener);
			return () => {
				live = false;
				try {
					player.removeEventListener('onStateChange', listener);
				} catch {
					// A destroyed player throws here; the `live` flag already silences it.
				}
			};
		};
	}

	return port;
}

/** Options for `new YT.Player(...)`, reduced to what is commonly passed. */
export interface YouTubePlayerOptions {
	videoId?: string;
	width?: number | string;
	height?: number | string;
	host?: string;
	playerVars?: Record<string, string | number | undefined>;
	events?: {
		onReady?: (event: { target: YouTubePlayerLike }) => void;
		onStateChange?: (event: YouTubeStateChangeEvent) => void;
		onError?: (event: { data: number }) => void;
	};
}

/** The `window.YT` namespace, reduced to the constructor. */
export interface YouTubeIframeApi {
	Player: new (element: HTMLElement | string, options?: YouTubePlayerOptions) => YouTubePlayerLike;
}

interface YouTubeWindow {
	YT?: Partial<YouTubeIframeApi>;
	onYouTubeIframeAPIReady?: () => void;
}

export const YOUTUBE_IFRAME_API_SRC = 'https://www.youtube.com/iframe_api';

let loading: Promise<YouTubeIframeApi> | null = null;

/** Load the IFrame API once and resolve with `window.YT`. Rejects, never throws, during SSR. */
export function loadYouTubeIframeApi(
	src: string = YOUTUBE_IFRAME_API_SRC
): Promise<YouTubeIframeApi> {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return Promise.reject(new Error('loadYouTubeIframeApi needs a browser'));
	}
	const w = window as unknown as YouTubeWindow;
	if (w.YT?.Player) return Promise.resolve(w.YT as YouTubeIframeApi);
	if (loading) return loading;

	loading = new Promise<YouTubeIframeApi>((resolve, reject) => {
		const previous = w.onYouTubeIframeAPIReady;
		w.onYouTubeIframeAPIReady = () => {
			previous?.();
			resolve(w.YT as YouTubeIframeApi);
		};
		const script = document.createElement('script');
		script.src = src;
		script.async = true;
		script.onerror = () => {
			loading = null;
			w.onYouTubeIframeAPIReady = previous;
			script.remove();
			reject(new Error(`Failed to load the YouTube IFrame API from ${src}`));
		};
		document.head.appendChild(script);
	});
	return loading;
}

/** Create a player in `element` and resolve once it is ready, when its methods exist. */
export async function createYouTubePlayer(
	element: HTMLElement | string,
	options: YouTubePlayerOptions = {}
): Promise<YouTubePlayerLike> {
	const YT = await loadYouTubeIframeApi();
	return new Promise((resolve, reject) => {
		let settled = false;
		const events = options.events ?? {};
		new YT.Player(element, {
			...options,
			events: {
				...events,
				onReady(event) {
					settled = true;
					events.onReady?.(event);
					resolve(event.target);
				},
				onError(event) {
					events.onError?.(event);
					if (settled) return;
					settled = true;
					reject(new Error(`YouTube player error ${event.data}`));
				}
			}
		});
	});
}
