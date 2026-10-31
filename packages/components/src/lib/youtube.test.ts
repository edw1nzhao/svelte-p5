/// <reference types="youtube" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TickerScheduler } from './media-port.js';
import { createMediaSync } from './createMediaSync.svelte.js';
import { createMediaPlayback } from './createMediaPlayback.svelte.js';
import {
	youTubePort,
	YouTubePlayerState as S,
	type YouTubePlayerLike,
	type YouTubeStateChangeEvent
} from './youtube.js';

function createTestScheduler() {
	let nextId = 1;
	const frames = new Map<number, () => void>();
	const scheduler: TickerScheduler = {
		raf(cb) {
			frames.set(nextId, cb);
			return nextId++;
		},
		cancelRaf: (id) => void frames.delete(id),
		interval: () => nextId++,
		clearInterval() {}
	};
	return {
		scheduler,
		get pendingFrames() {
			return frames.size;
		},
		flushFrame() {
			const queued = [...frames.values()];
			frames.clear();
			for (const cb of queued) cb();
		}
	};
}

// Methods appear only on ready, seeks land later, play passes through BUFFERING,
// and seekTo from any state but PAUSED starts playback.
function createFakePlayer(duration = 120) {
	const listeners = new Set<(e: YouTubeStateChangeEvent) => void>();
	const iframe = { isConnected: true } as HTMLIFrameElement;
	let time = 0;
	let state: number = S.UNSTARTED;
	let seekTarget: number | null = null;
	const calls: string[] = [];

	function emit(next: number) {
		state = next;
		for (const l of [...listeners]) l({ data: next });
	}

	const methods = {
		getCurrentTime: () => time,
		getDuration: () => duration,
		getPlayerState: () => state,
		getIframe: () => iframe,
		seekTo(t: number) {
			calls.push(`seekTo:${t}`);
			seekTarget = t;
			if (state !== S.PAUSED) emit(S.BUFFERING);
		},
		playVideo() {
			calls.push('playVideo');
			emit(S.BUFFERING);
		},
		pauseVideo() {
			calls.push('pauseVideo');
			emit(S.PAUSED);
		},
		setPlaybackRate: (r: number) => void calls.push(`rate:${r}`),
		mute: () => void calls.push('mute'),
		unMute: () => void calls.push('unMute'),
		destroy: () => void calls.push('destroy')
	};

	const player = {
		addEventListener: (_: string, l: (e: YouTubeStateChangeEvent) => void) => void listeners.add(l),
		removeEventListener: (_: string, l: (e: YouTubeStateChangeEvent) => void) =>
			void listeners.delete(l)
	} as unknown as YouTubePlayerLike;

	return {
		player,
		iframe,
		calls,
		listeners,
		get state() {
			return state;
		},
		get time() {
			return time;
		},
		becomeReady() {
			Object.assign(player, methods);
			emit(S.CUED);
		},
		/** Buffering finishes: a pending seek lands, and a buffering player plays. */
		land() {
			if (seekTarget !== null) time = seekTarget;
			seekTarget = null;
			if (state === S.BUFFERING) emit(S.PLAYING);
		},
		buffer() {
			emit(S.BUFFERING);
		},
		advance(seconds: number) {
			if (state === S.PLAYING) time += seconds;
		}
	};
}

function readyPort(opts: Parameters<typeof youTubePort>[1] = {}) {
	const fake = createFakePlayer();
	fake.becomeReady();
	let clock = 0;
	const port = youTubePort(fake.player, { now: () => clock, ...opts });
	return { fake, port, tick: (ms: number) => (clock += ms) };
}

describe('youTubePort readiness', () => {
	it('is inert until the player is ready, then works', () => {
		const fake = createFakePlayer();
		const port = youTubePort(fake.player);
		expect(port.ready).toBe(false);
		expect(port.currentTime).toBe(0);
		expect(port.duration).toBe(0);
		expect(port.paused).toBe(true);
		expect(() => {
			port.seek(10);
			port.play();
			port.setMuted(true);
		}).not.toThrow();

		fake.becomeReady();
		expect(port.ready).toBe(true);
		expect(port.duration).toBe(120);
		port.play();
		expect(fake.calls).toEqual(['playVideo']);
	});

	it('goes inert again once the iframe leaves the document', () => {
		const { fake, port } = readyPort();
		Object.assign(fake.iframe, { isConnected: false });
		expect(port.ready).toBe(false);
		port.pause();
		expect(fake.calls).toEqual([]);
	});

	it('swallows a throwing player method', () => {
		const { fake, port } = readyPort();
		Object.assign(fake.player, {
			getCurrentTime() {
				throw new Error('destroyed');
			}
		});
		expect(port.currentTime).toBe(0);
	});
});

describe('youTubePort with createMediaSync', () => {
	it('locks while playing, stays locked through buffering, and stops polling on pause', () => {
		const { fake, port } = readyPort();
		const t = createTestScheduler();
		const sync = createMediaSync({ scheduler: t.scheduler });
		sync.attach(port);
		expect(sync.isLocked).toBe(false);
		expect(sync.mediaDuration).toBe(120);

		port.play();
		expect(sync.isLocked).toBe(true);
		fake.land();
		fake.advance(3);
		t.flushFrame();
		expect(sync.mediaTime).toBe(3);

		fake.buffer();
		expect(sync.isLocked).toBe(true);

		fake.land();
		port.pause();
		expect(sync.isLocked).toBe(false);
		t.flushFrame();
		expect(t.pendingFrames).toBe(0);
	});

	it('reports the seek target until the asynchronous seek lands', () => {
		const { fake, port } = readyPort();
		const t = createTestScheduler();
		const sync = createMediaSync({ scheduler: t.scheduler });
		sync.attach(port);
		port.play();
		fake.land();
		fake.advance(10);

		sync.seek(50);
		expect(sync.mediaTime).toBe(50);
		t.flushFrame();
		expect(fake.time).toBe(10);
		expect(sync.mediaTime).toBe(50);

		fake.land();
		fake.advance(0.5);
		t.flushFrame();
		expect(sync.mediaTime).toBe(50.5);
	});

	it('falls back to the reported time if a seek never lands', () => {
		const { fake, port, tick } = readyPort({ seekTimeoutMs: 500 });
		port.play();
		fake.land();
		port.seek(80);
		expect(port.currentTime).toBe(80);
		tick(500);
		expect(port.currentTime).toBe(0);
	});

	it('keeps a paused player paused when seeking from the cued state', () => {
		const { fake, port } = readyPort();
		const sync = createMediaSync({ scheduler: createTestScheduler().scheduler });
		sync.attach(port);

		sync.seek(30);
		fake.land();
		expect(fake.calls).toEqual(['seekTo:30', 'pauseVideo']);
		expect(fake.state).toBe(S.PAUSED);
		expect(sync.isLocked).toBe(false);
		expect(sync.mediaTime).toBe(30);
	});

	it('does not pause a seek made while playing', () => {
		const { fake, port } = readyPort();
		port.play();
		fake.land();
		port.seek(30);
		fake.land();
		expect(fake.calls).not.toContain('pauseVideo');
		expect(port.paused).toBe(false);
	});

	it('detaching removes its state listener', () => {
		const { fake, port } = readyPort();
		const sync = createMediaSync({ scheduler: createTestScheduler().scheduler });
		sync.attach(port);
		expect(fake.listeners.size).toBe(1);
		sync.detach();
		expect(fake.listeners.size).toBe(0);
	});
});

describe('youTubePort with createMediaPlayback', () => {
	it('playFrom seeks and plays, and isPlaying follows the player', () => {
		const { fake, port } = readyPort();
		const playback = createMediaPlayback({ scheduler: createTestScheduler().scheduler });
		playback.attach(port);

		playback.playFrom(40);
		expect(fake.calls).toEqual(['seekTo:40', 'playVideo']);
		fake.land();
		expect(playback.isPlaying).toBe(true);
		expect(fake.time).toBe(40);
	});

	it('does not skip a backwards snippet while its seek is in flight', () => {
		const { fake, port } = readyPort();
		const t = createTestScheduler();
		const playback = createMediaPlayback({ scheduler: t.scheduler });
		playback.attach(port);

		playback.playSnippets([50, 10], 2);
		fake.land();
		fake.advance(2);
		t.flushFrame();
		expect(playback.activeSnippetIndex).toBe(1);

		t.flushFrame();
		expect(playback.activeSnippetIndex).toBe(1);

		fake.land();
		fake.advance(2);
		t.flushFrame();
		expect(playback.activeSnippetIndex).toBe(-1);
		expect(playback.isPlaying).toBe(false);
	});
});

describe('youTubePort extras', () => {
	it('forwards playback rate and mute', () => {
		const { fake, port } = readyPort();
		port.setPlaybackRate(1.5);
		port.setMuted(true);
		port.setMuted(false);
		expect(fake.calls).toEqual(['rate:1.5', 'mute', 'unMute']);
	});

	it('falls back to polling when the player cannot take listeners', () => {
		const fake = createFakePlayer();
		fake.becomeReady();
		Object.assign(fake.player, { addEventListener: undefined });
		expect(youTubePort(fake.player).subscribe).toBeUndefined();
	});

	it('ignores events after unsubscribing even if removal throws', () => {
		const { fake, port } = readyPort();
		Object.assign(fake.player, {
			removeEventListener() {
				throw new Error('destroyed');
			}
		});
		const onChange = vi.fn();
		const off = port.subscribe!(onChange);
		off();
		fake.buffer();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('accepts a player typed by @types/youtube', () => {
		const typed = (player: YT.Player) => youTubePort(player);
		expect(typeof typed).toBe('function');
	});
});

describe('loadYouTubeIframeApi', () => {
	type W = { YT?: unknown; onYouTubeIframeAPIReady?: () => void };
	const w = window as unknown as W;
	let appended: HTMLScriptElement[];

	beforeEach(() => {
		vi.resetModules();
		delete w.YT;
		delete w.onYouTubeIframeAPIReady;
		appended = [];
		vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
			appended.push(node as HTMLScriptElement);
			return node;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	const load = async () => (await import('./youtube.js')).loadYouTubeIframeApi;

	it('injects one script for concurrent callers and keeps an existing ready callback', async () => {
		const loadApi = await load();
		const previous = vi.fn();
		w.onYouTubeIframeAPIReady = previous;
		const a = loadApi();
		const b = loadApi();
		expect(appended).toHaveLength(1);
		expect(appended[0]?.src).toBe('https://www.youtube.com/iframe_api');

		const YT = { Player: class {} };
		w.YT = YT;
		w.onYouTubeIframeAPIReady?.();
		expect(await a).toBe(YT);
		expect(await b).toBe(YT);
		expect(previous).toHaveBeenCalledOnce();
	});

	it('resolves immediately when the API is already on the page', async () => {
		const loadApi = await load();
		const YT = { Player: class {} };
		w.YT = YT;
		expect(await loadApi()).toBe(YT);
		expect(appended).toHaveLength(0);
	});

	it('rejects on a script error and lets a later call retry', async () => {
		const loadApi = await load();
		const first = loadApi();
		appended[0]?.onerror?.(new Event('error'));
		await expect(first).rejects.toThrow(/Failed to load/);
		void loadApi();
		expect(appended).toHaveLength(2);
	});

	it('rejects during SSR instead of throwing', async () => {
		const loadApi = await load();
		vi.stubGlobal('window', undefined);
		await expect(loadApi()).rejects.toThrow(/browser/);
	});

	it('createYouTubePlayer resolves with the player once it is ready', async () => {
		const { createYouTubePlayer } = await import('./youtube.js');
		const onReady = vi.fn();
		w.YT = {
			Player: class {
				constructor(_el: unknown, opts: { events: { onReady(e: unknown): void } }) {
					queueMicrotask(() => opts.events.onReady({ target: this }));
				}
			}
		};
		const player = await createYouTubePlayer('host', { videoId: 'abc', events: { onReady } });
		expect(onReady).toHaveBeenCalledWith({ target: player });
	});

	it('createYouTubePlayer rejects on an error before ready', async () => {
		const { createYouTubePlayer } = await import('./youtube.js');
		w.YT = {
			Player: class {
				constructor(_el: unknown, opts: { events: { onError(e: unknown): void } }) {
					queueMicrotask(() => opts.events.onError({ data: 150 }));
				}
			}
		};
		await expect(createYouTubePlayer('host')).rejects.toThrow(/150/);
	});
});
