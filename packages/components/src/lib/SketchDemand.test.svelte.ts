import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { createP5Bridge, invalidate } from 'svelte-p5';
import Sketch from './Sketch.svelte';

vi.mock('p5', () => {
	class FakeP5 {
		width = 0;
		height = 0;
		frameCount = 0;
		_setupDone = true;
		looping = true;
		resizeCanvas = vi.fn();
		pixelDensity = vi.fn();
		remove = vi.fn();
		redraw = vi.fn(() => {
			this.frameCount++;
		});
		isLooping = () => this.looping;
		loop = vi.fn(() => (this.looping = true));
		noLoop = vi.fn(() => (this.looping = false));
		constructor(sketch: (p: FakeP5) => void) {
			sketch(this);
		}
	}
	return { default: FakeP5 };
});

interface Fake {
	frameCount: number;
	looping: boolean;
	redraw: ReturnType<typeof vi.fn>;
	loop: ReturnType<typeof vi.fn>;
	noLoop: ReturnType<typeof vi.fn>;
}

let frames: FrameRequestCallback[] = [];
const nextFrame = async () => {
	const queued = frames;
	frames = [];
	for (const cb of queued) cb(0);
	await new Promise((r) => setTimeout(r, 0));
};

beforeEach(() => {
	frames = [];
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => vi.unstubAllGlobals());

async function mount(props: Record<string, unknown>) {
	let ready: Fake | null = null;
	const result = render(Sketch, {
		sketch: () => {},
		onReady: (p) => (ready = p as unknown as Fake),
		...props
	});
	await vi.waitFor(() => expect(ready).not.toBeNull());
	flushSync();
	return { ...result, p: ready! as Fake };
}

describe('<Sketch loop>', () => {
	it("leaves p5's loop alone by default", async () => {
		const { p } = await mount({});
		expect(p.noLoop).not.toHaveBeenCalled();
		expect(p.loop).not.toHaveBeenCalled();
	});

	it("stops the loop in 'demand' and redraws once per bridge change", async () => {
		const bridge = createP5Bridge({ radius: 10, nested: { list: [1, 2] } });
		const { p } = await mount({ loop: 'demand', bridge });
		expect(p.looping).toBe(false);
		await nextFrame();
		expect(p.redraw).not.toHaveBeenCalled();

		bridge.state.radius = 20;
		bridge.state.radius = 30;
		flushSync();
		await nextFrame();
		expect(p.redraw).toHaveBeenCalledTimes(1);

		bridge.state.nested.list.push(3);
		flushSync();
		await nextFrame();
		expect(p.redraw).toHaveBeenCalledTimes(2);
	});

	it("ignores bridge changes in 'manual' but honours invalidate()", async () => {
		const bridge = createP5Bridge({ radius: 10 });
		const { p } = await mount({ loop: 'manual', bridge });
		bridge.state.radius = 20;
		flushSync();
		await nextFrame();
		expect(p.redraw).not.toHaveBeenCalled();
		invalidate(p);
		await nextFrame();
		expect(p.redraw).toHaveBeenCalledTimes(1);
	});

	it("restarts the loop when switched back to 'always'", async () => {
		const { p, rerender } = await mount({ loop: 'demand' });
		await rerender({ loop: 'always' });
		flushSync();
		expect(p.looping).toBe(true);
	});
});
