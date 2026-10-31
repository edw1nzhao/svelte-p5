import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyLoopMode, disposeInvalidation, invalidate } from './render.js';

let frames: FrameRequestCallback[] = [];
const runFrame = async () => {
	const queued = frames;
	frames = [];
	for (const cb of queued) cb(0);
	await new Promise((r) => setTimeout(r, 0));
};

beforeEach(() => {
	frames = [];
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		frames[id - 1] = () => {};
	});
});
afterEach(() => vi.unstubAllGlobals());

function fakeP5(overrides: Record<string, unknown> = {}) {
	const p = {
		looping: false,
		_setupDone: true,
		_inUserDraw: false,
		frameCount: 0,
		redraw: vi.fn(function (this: { frameCount: number }) {
			p.frameCount++;
		}),
		isLooping: () => p.looping,
		loop: vi.fn(() => (p.looping = true)),
		noLoop: vi.fn(() => (p.looping = false)),
		...overrides
	};
	return p;
}

describe('invalidate', () => {
	it('coalesces calls in one frame into one redraw', async () => {
		const p = fakeP5();
		invalidate(p);
		invalidate(p);
		invalidate(p);
		expect(frames).toHaveLength(1);
		await runFrame();
		expect(p.redraw).toHaveBeenCalledTimes(1);
		await runFrame();
		expect(p.redraw).toHaveBeenCalledTimes(1);
	});

	it('does nothing while the sketch loops', async () => {
		const p = fakeP5({ looping: true });
		invalidate(p);
		await runFrame();
		expect(p.redraw).not.toHaveBeenCalled();
	});

	it('waits for setup to finish instead of dropping the redraw', async () => {
		const p = fakeP5({ _setupDone: false });
		invalidate(p);
		await runFrame();
		expect(p.redraw).not.toHaveBeenCalled();
		p._setupDone = true;
		await runFrame();
		expect(p.redraw).toHaveBeenCalledTimes(1);
	});

	it('queues exactly one more redraw when invalidated during an async redraw', async () => {
		let finish: () => void = () => {};
		const p = fakeP5();
		p.redraw.mockImplementation(() => new Promise<void>((r) => (finish = r)));
		invalidate(p);
		await runFrame();
		invalidate(p);
		invalidate(p);
		expect(frames).toHaveLength(0);
		finish();
		await new Promise((r) => setTimeout(r, 0));
		expect(frames).toHaveLength(1);
		p.redraw.mockImplementation(() => Promise.resolve());
		await runFrame();
		expect(p.redraw).toHaveBeenCalledTimes(2);
	});

	it('drops pending redraws once disposed', async () => {
		const p = fakeP5();
		invalidate(p);
		disposeInvalidation(p);
		await runFrame();
		expect(p.redraw).not.toHaveBeenCalled();
	});

	it('ignores a null instance', () => {
		expect(() => invalidate(null)).not.toThrow();
	});
});

describe('applyLoopMode', () => {
	it('stops the loop for demand and manual, and restarts it for always', () => {
		const p = fakeP5({ looping: true });
		applyLoopMode(p, 'demand');
		expect(p.looping).toBe(false);
		applyLoopMode(p, 'manual');
		expect(p.noLoop).toHaveBeenCalledTimes(1);
		applyLoopMode(p, 'always');
		expect(p.looping).toBe(true);
	});
});
