import { describe, it, expect, vi } from 'vitest';
import { htmlMediaPort, createPoller, type MediaPort, type TickerScheduler } from './media-port.js';
import { createMediaSync } from './createMediaSync.svelte.js';

/** A scheduler whose frames and intervals only advance when the test says so. */
function createTestScheduler() {
	let nextId = 1;
	const frames = new Map<number, () => void>();
	const intervals = new Map<number, { cb: () => void; ms: number }>();

	const scheduler: TickerScheduler = {
		raf(cb) {
			const id = nextId++;
			frames.set(id, cb);
			return id;
		},
		cancelRaf(id) {
			frames.delete(id);
		},
		interval(cb, ms) {
			const id = nextId++;
			intervals.set(id, { cb, ms });
			return id;
		},
		clearInterval(id) {
			intervals.delete(id);
		}
	};

	return {
		scheduler,
		get pendingFrames() {
			return frames.size;
		},
		get pendingIntervals() {
			return intervals.size;
		},
		/** Run every queued frame callback once. */
		flushFrame() {
			const queued = [...frames.entries()];
			frames.clear();
			for (const [, cb] of queued) cb();
		},
		tickInterval() {
			for (const [, { cb }] of [...intervals.entries()]) cb();
		}
	};
}

/** A port for a source that cannot push events, like the YouTube iframe API. */
function createPolledPort(duration = 100): MediaPort & { setPlaying(v: boolean): void } {
	let currentTime = 0;
	let paused = true;
	return {
		get currentTime() {
			return currentTime;
		},
		get duration() {
			return duration;
		},
		get paused() {
			return paused;
		},
		get ended() {
			return false;
		},
		seek(t) {
			currentTime = t;
		},
		play() {
			paused = false;
		},
		pause() {
			paused = true;
		},
		setPlaying(v) {
			paused = !v;
			if (v) currentTime += 1;
		}
	};
}

describe('htmlMediaPort', () => {
	function fakeElement(duration = 100) {
		const target = new EventTarget();
		return {
			currentTime: 0,
			duration,
			paused: true,
			ended: false,
			play: vi.fn(() => Promise.resolve()),
			pause: vi.fn(),
			addEventListener: (t: string, cb: EventListener) => target.addEventListener(t, cb),
			removeEventListener: (t: string, cb: EventListener) => target.removeEventListener(t, cb),
			dispatch: (t: string) => target.dispatchEvent(new Event(t))
		} as unknown as HTMLMediaElement & { dispatch(t: string): void };
	}

	it('reports a non-finite duration as 0', () => {
		const el = fakeElement(Infinity);
		expect(htmlMediaPort(el).duration).toBe(0);
	});

	it('unsubscribes every listener it added', () => {
		const el = fakeElement();
		const onChange = vi.fn();
		const off = htmlMediaPort(el).subscribe!(onChange);
		el.dispatch('play');
		expect(onChange).toHaveBeenCalledTimes(1);
		off();
		el.dispatch('play');
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('swallows a rejected play(), which autoplay policies produce', () => {
		const el = fakeElement();
		(el.play as ReturnType<typeof vi.fn>).mockReturnValue(Promise.reject(new Error('blocked')));
		expect(() => htmlMediaPort(el).play()).not.toThrow();
	});
});

describe('createPoller', () => {
	it('stops rescheduling once inactive', () => {
		const t = createTestScheduler();
		let active = true;
		const onSample = vi.fn();
		const poller = createPoller(onSample, () => active, { scheduler: t.scheduler });

		poller.start();
		t.flushFrame();
		expect(poller.running).toBe(true);

		active = false;
		t.flushFrame();

		expect(poller.running).toBe(false);
		expect(t.pendingFrames).toBe(0);

		// The regression this whole port exists for: a loop that keeps a frame
		// callback alive after playback stops.
		const callsAfterStop = onSample.mock.calls.length;
		t.flushFrame();
		expect(onSample.mock.calls.length).toBe(callsAfterStop);
	});

	it('never starts a frame loop for a source that is already inactive', () => {
		const t = createTestScheduler();
		const poller = createPoller(vi.fn(), () => false, { scheduler: t.scheduler });
		poller.start();
		expect(poller.running).toBe(false);
		expect(t.pendingFrames).toBe(0);
	});

	it('idles on an interval, not a frame loop, when given idleMs', () => {
		const t = createTestScheduler();
		let active = false;
		const poller = createPoller(vi.fn(), () => active, { scheduler: t.scheduler, idleMs: 250 });

		poller.start();
		expect(poller.running).toBe(false);
		expect(poller.idling).toBe(true);

		active = true;
		t.tickInterval();

		expect(poller.idling).toBe(false);
		expect(poller.running).toBe(true);
	});

	it('stop() clears both the frame loop and the idle interval', () => {
		const t = createTestScheduler();
		const poller = createPoller(vi.fn(), () => false, { scheduler: t.scheduler, idleMs: 250 });
		poller.start();
		poller.stop();
		expect(t.pendingFrames).toBe(0);
		expect(t.pendingIntervals).toBe(0);
	});
});

describe('createMediaSync with a port', () => {
	it('tracks a polled source that cannot push events', () => {
		const t = createTestScheduler();
		const port = createPolledPort();
		const sync = createMediaSync({ scheduler: t.scheduler });

		sync.attach(port);
		expect(sync.isLocked).toBe(false);

		port.setPlaying(true);
		t.tickInterval();

		expect(sync.isLocked).toBe(true);
		expect(sync.mediaTime).toBe(1);
	});

	it('clamps a seek into the source duration', () => {
		const t = createTestScheduler();
		const port = createPolledPort(60);
		const sync = createMediaSync({ scheduler: t.scheduler });
		sync.attach(port);

		sync.seek(9999);
		expect(port.currentTime).toBe(60);

		sync.seek(-5);
		expect(port.currentTime).toBe(0);
	});

	it('detach stops all scheduled work', () => {
		const t = createTestScheduler();
		const port = createPolledPort();
		const sync = createMediaSync({ scheduler: t.scheduler });

		sync.attach(port);
		port.setPlaying(true);
		t.tickInterval();
		expect(t.pendingFrames).toBeGreaterThan(0);

		sync.detach();
		expect(t.pendingFrames).toBe(0);
		expect(t.pendingIntervals).toBe(0);
		expect(sync.isLocked).toBe(false);
	});

	it('re-attaching releases the previous source', () => {
		const t = createTestScheduler();
		const first = createPolledPort();
		const second = createPolledPort();
		const sync = createMediaSync({ scheduler: t.scheduler });

		sync.attach(first);
		sync.attach(second);
		sync.seek(10);

		expect(second.currentTime).toBe(10);
		expect(first.currentTime).toBe(0);
	});
});
