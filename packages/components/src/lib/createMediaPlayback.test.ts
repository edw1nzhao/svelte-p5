import { describe, it, expect, vi } from 'vitest';
import { createMediaPlayback } from './createMediaPlayback.svelte.js';

// A minimal stand-in for HTMLMediaElement. We only need the surface the
// orchestrator touches: currentTime, duration, paused, play(), pause(), and
// add/removeEventListener. Built on EventTarget so we can dispatch real
// 'timeupdate' events to drive the snippet queue.
function createFakeMedia(duration = 100) {
	const target = new EventTarget();
	const el = {
		currentTime: 0,
		duration,
		paused: true,
		ended: false,
		play: vi.fn(function (this: { paused: boolean }) {
			el.paused = false;
			target.dispatchEvent(new Event('play'));
			return Promise.resolve();
		}),
		pause: vi.fn(function () {
			el.paused = true;
			target.dispatchEvent(new Event('pause'));
		}),
		addEventListener: vi.fn((type: string, cb: EventListener) => target.addEventListener(type, cb)),
		removeEventListener: vi.fn((type: string, cb: EventListener) =>
			target.removeEventListener(type, cb)
		),
		// Test helper: set currentTime then fire a timeupdate.
		tick(time: number) {
			el.currentTime = time;
			target.dispatchEvent(new Event('timeupdate'));
		}
	};
	return el as unknown as HTMLMediaElement & { tick(time: number): void };
}

describe('createMediaPlayback', () => {
	it('playFrom seeks (clamped) and plays', () => {
		const media = createFakeMedia(100);
		const pb = createMediaPlayback();
		pb.attach(media);

		pb.playFrom(42);
		expect(media.currentTime).toBe(42);
		expect(media.play).toHaveBeenCalled();
		expect(pb.isPlaying).toBe(true);

		// Out-of-range seeks clamp into [0, duration].
		pb.playFrom(999);
		expect(media.currentTime).toBe(100);
		pb.playFrom(-5);
		expect(media.currentTime).toBe(0);
	});

	it('playFrom ignores NaN; Infinity clamps to duration (matching createMediaSync.seek)', () => {
		const media = createFakeMedia(100);
		const pb = createMediaPlayback();
		pb.attach(media);
		media.currentTime = 10;

		// NaN never clears the isFinite guard — left untouched.
		pb.playFrom(NaN);
		expect(media.currentTime).toBe(10);

		// Infinity clamps to the (finite) duration, exactly like createMediaSync.
		pb.playFrom(Infinity);
		expect(media.currentTime).toBe(100);
	});

	it('playSnippets advances on timeupdate and stops at the end', () => {
		const media = createFakeMedia(100);
		const pb = createMediaPlayback();
		pb.attach(media);

		pb.playSnippets([10, 30, 50], 2);
		expect(media.currentTime).toBe(10);
		expect(pb.activeSnippetIndex).toBe(0);
		expect(media.play).toHaveBeenCalled();

		// Still within snippet 0 — no advance.
		media.tick(11);
		expect(pb.activeSnippetIndex).toBe(0);

		// Snippet 0 duration elapsed — advance to snippet 1.
		media.tick(12);
		expect(pb.activeSnippetIndex).toBe(1);
		expect(media.currentTime).toBe(30);

		// Advance to snippet 2.
		media.tick(32);
		expect(pb.activeSnippetIndex).toBe(2);
		expect(media.currentTime).toBe(50);

		// Queue exhausted — stop.
		media.tick(52);
		expect(pb.activeSnippetIndex).toBe(-1);
		expect(media.pause).toHaveBeenCalled();
	});

	it('playSnippets filters non-finite times and does nothing on an empty list', () => {
		const media = createFakeMedia(100);
		const pb = createMediaPlayback();
		pb.attach(media);

		pb.playSnippets([NaN, 20, Infinity], 2);
		expect(media.currentTime).toBe(20);
		expect(pb.activeSnippetIndex).toBe(0);

		// All non-finite collapses to empty — a no-op that leaves prior state
		// (the in-progress queue from above) untouched.
		const before = media.currentTime;
		pb.playSnippets([NaN, Infinity], 2);
		expect(pb.activeSnippetIndex).toBe(0);
		expect(media.currentTime).toBe(before);
	});

	it('playFrom cancels an active snippet sequence', () => {
		const media = createFakeMedia(100);
		const pb = createMediaPlayback();
		pb.attach(media);

		pb.playSnippets([10, 30], 2);
		expect(pb.activeSnippetIndex).toBe(0);

		pb.playFrom(70);
		expect(pb.activeSnippetIndex).toBe(-1);
		expect(media.currentTime).toBe(70);

		// A timeupdate that would have advanced the old queue does nothing now.
		media.tick(73);
		expect(pb.activeSnippetIndex).toBe(-1);
	});

	it('stop() clears the queue, pauses, and resets activeSnippetIndex', () => {
		const media = createFakeMedia(100);
		const pb = createMediaPlayback();
		pb.attach(media);

		pb.playSnippets([10, 30], 2);
		expect(pb.activeSnippetIndex).toBe(0);

		pb.stop();
		expect(pb.activeSnippetIndex).toBe(-1);
		expect(media.pause).toHaveBeenCalled();

		// Subsequent timeupdates are inert.
		media.tick(40);
		expect(pb.activeSnippetIndex).toBe(-1);
	});

	it('pause() pauses without clearing the queue position', () => {
		const media = createFakeMedia(100);
		const pb = createMediaPlayback();
		pb.attach(media);

		pb.playSnippets([10, 30], 2);
		pb.pause();
		expect(media.pause).toHaveBeenCalled();
		// Queue index is preserved (pause is not stop).
		expect(pb.activeSnippetIndex).toBe(0);
	});

	it('detach() removes listeners and is idempotent', () => {
		const media = createFakeMedia(100);
		const pb = createMediaPlayback();
		pb.attach(media);
		pb.playSnippets([10, 30], 2);

		pb.detach();
		expect(media.removeEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function));
		expect(media.removeEventListener).toHaveBeenCalledWith('play', expect.any(Function));
		expect(media.removeEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
		expect(media.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
		expect(pb.activeSnippetIndex).toBe(-1);
		expect(pb.isPlaying).toBe(false);

		// After detach, dispatching a timeupdate must not throw or mutate state.
		media.tick(50);
		expect(pb.activeSnippetIndex).toBe(-1);

		// Idempotent.
		expect(() => pb.detach()).not.toThrow();
	});

	it('attach(null) detaches the previous element', () => {
		const media = createFakeMedia(100);
		const pb = createMediaPlayback();
		pb.attach(media);
		pb.attach(null);

		expect(media.removeEventListener).toHaveBeenCalled();
		// Calls into a null element are safe no-ops.
		expect(() => pb.playFrom(10)).not.toThrow();
		expect(media.play).not.toHaveBeenCalled();
	});

	it('re-attaching detaches the old element and clears the queue', () => {
		const a = createFakeMedia(100);
		const b = createFakeMedia(100);
		const pb = createMediaPlayback();

		pb.attach(a);
		pb.playSnippets([10, 30], 2);
		expect(pb.activeSnippetIndex).toBe(0);

		pb.attach(b);
		expect(a.removeEventListener).toHaveBeenCalled();
		expect(pb.activeSnippetIndex).toBe(-1);

		// The old element's timeupdate no longer drives the queue.
		(a as ReturnType<typeof createFakeMedia>).tick(40);
		expect(pb.activeSnippetIndex).toBe(-1);
	});
});
