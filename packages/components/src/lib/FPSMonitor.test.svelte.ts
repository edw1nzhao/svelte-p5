import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import type p5 from 'p5';
import FPSMonitor from './FPSMonitor.svelte';

let frames: FrameRequestCallback[] = [];
let now = 0;
async function advance(
	ms: number,
	draws: (n: number) => void,
	steps = Math.round((ms * 60) / 1000)
) {
	for (let i = 0; i < steps; i++) {
		now += ms / steps;
		draws(i);
		const queued = frames;
		frames = [];
		for (const cb of queued) cb(now);
	}
	await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
	frames = [];
	now = 0;
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal('cancelAnimationFrame', () => {});
	vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function fakeInstance() {
	// frameRate() is what p5 reports from the last two draws; it goes stale when draws stop.
	return { frameCount: 0, frameRate: () => 60 } as unknown as p5 & { frameCount: number };
}

describe('FPSMonitor', () => {
	it('reports the draw rate of a looping sketch', async () => {
		const p = fakeInstance();
		const { container } = render(FPSMonitor, { instance: p, sampleFrames: 30 });
		await advance(1000, () => p.frameCount++);
		expect(container.textContent?.trim()).toBe('60 fps');
	});

	it('reports 0 fps while an on-demand sketch is idle, not its last draw rate', async () => {
		const p = fakeInstance();
		const { container } = render(FPSMonitor, { instance: p, sampleFrames: 30 });
		await advance(1000, () => p.frameCount++);
		await advance(1000, () => {});
		expect(container.textContent?.trim()).toBe('0 fps');
	});

	it('counts the occasional redraws of an on-demand sketch', async () => {
		const p = fakeInstance();
		const { container } = render(FPSMonitor, { instance: p, sampleFrames: 60 });
		await advance(1100, (i) => {
			if (i % 20 === 0) p.frameCount++;
		});
		expect(container.textContent?.trim()).toBe('3 fps');
	});
});
