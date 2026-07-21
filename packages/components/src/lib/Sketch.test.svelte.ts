import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Sketch from './Sketch.svelte';

// P5Canvas does `await import('p5')`; give it a fake constructor that mirrors
// the bits Sketch touches. p5 calls the sketch function synchronously inside
// the constructor, and so does the fake.
vi.mock('p5', () => {
	class FakeP5 {
		width = 0;
		height = 0;
		resizeCanvas = vi.fn((w: number, h: number) => {
			this.width = w;
			this.height = h;
		});
		pixelDensity = vi.fn();
		remove = vi.fn();
		// P5Canvas passes (sketchFn, containerNode); the node is irrelevant here.
		constructor(sketch: (p: FakeP5) => void) {
			sketch(this);
		}
	}
	return { default: FakeP5 };
});

type FakeInstance = {
	width: number;
	height: number;
	resizeCanvas: ReturnType<typeof vi.fn>;
	pixelDensity: ReturnType<typeof vi.fn>;
};

// Controllable ResizeObserver stub: tests fire the captured callback directly.
let roCallback: ResizeObserverCallback | null = null;
const savedRO = globalThis.ResizeObserver;

function fireResize(width: number, height: number) {
	roCallback?.([{ contentRect: { width, height } } as ResizeObserverEntry], {} as ResizeObserver);
}

async function renderSketch(props: Record<string, unknown> = {}) {
	let ready: FakeInstance | null = null;
	const onReady = (p: unknown) => {
		ready = p as FakeInstance;
	};
	const result = render(Sketch, { sketch: () => {}, onReady, ...props });
	// P5Canvas awaits import('p5') before constructing; wait for onReady.
	await vi.waitFor(() => {
		if (!ready) throw new Error('instance not ready');
	});
	return { ...result, instance: ready! as FakeInstance };
}

beforeEach(() => {
	roCallback = null;
	globalThis.ResizeObserver = class {
		constructor(cb: ResizeObserverCallback) {
			roCallback = cb;
		}
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
});

afterEach(() => {
	globalThis.ResizeObserver = savedRO;
});

describe('<Sketch> resize', () => {
	it('calls resizeCanvas then onResize, in that order, when the container resizes', async () => {
		const calls: string[] = [];
		const onResize = vi.fn((_p: FakeInstance, w: number, h: number) => {
			calls.push(`onResize:${w}x${h}`);
		});
		const { instance } = await renderSketch({ onResize });
		instance.resizeCanvas.mockImplementation((w: number, h: number) => {
			instance.width = w;
			instance.height = h;
			calls.push(`resizeCanvas:${w}x${h}`);
		});

		fireResize(640, 480);

		expect(calls).toEqual(['resizeCanvas:640x480', 'onResize:640x480']);
		expect(onResize).toHaveBeenCalledWith(instance, 640, 480);
	});

	it('skips resizeCanvas and onResize when the size is unchanged', async () => {
		const onResize = vi.fn();
		const { instance } = await renderSketch({ onResize });
		instance.width = 300;
		instance.height = 200;
		instance.resizeCanvas.mockClear();

		fireResize(300, 200);

		expect(instance.resizeCanvas).not.toHaveBeenCalled();
		expect(onResize).not.toHaveBeenCalled();
	});

	it('does not fire onResize for the initial handleReady sizing', async () => {
		const onResize = vi.fn();
		await renderSketch({ onResize });
		expect(onResize).not.toHaveBeenCalled();
	});
});

describe('<Sketch> pixel density', () => {
	it('hidpi=true applies devicePixelRatio', async () => {
		const { instance } = await renderSketch({ hidpi: true });
		expect(instance.pixelDensity).toHaveBeenCalledWith(window.devicePixelRatio);
	});

	it('hidpi=false pins density to 1', async () => {
		const { instance } = await renderSketch({ hidpi: false });
		expect(instance.pixelDensity).toHaveBeenCalledWith(1);
	});

	it('numeric hidpi applies that exact density', async () => {
		const { instance } = await renderSketch({ hidpi: 1.5 });
		expect(instance.pixelDensity).toHaveBeenCalledWith(1.5);
	});
});
