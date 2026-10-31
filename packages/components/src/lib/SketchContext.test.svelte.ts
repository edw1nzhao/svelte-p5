import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import type { SketchContext } from 'svelte-p5';
import Sketch from './Sketch.svelte';
import SketchOverlay from './tests/SketchOverlay.svelte';

vi.mock('p5', () => {
	class FakeP5 {
		width = 0;
		height = 0;
		resizeCanvas = vi.fn();
		pixelDensity = vi.fn();
		draws = 0;
		get frameCount() {
			return ++this.draws;
		}
		remove = vi.fn();
		constructor(sketch: (p: FakeP5) => void) {
			sketch(this);
		}
	}
	return { default: FakeP5 };
});

async function renderOverlay() {
	const contexts: (SketchContext | undefined)[] = [];
	const outside: (SketchContext | undefined)[] = [];
	const atInit: unknown[] = [];
	let ready: unknown = null;
	const result = render(SketchOverlay, {
		onContext: (c) => {
			contexts.push(c);
			atInit.push(c ? c.instance : 'no context');
		},
		onOutside: (c) => outside.push(c),
		onReady: (p) => (ready = p)
	});
	await vi.waitFor(() => expect(ready).not.toBeNull());
	return { ...result, contexts, outside, atInit, ready };
}

describe('sketch context', () => {
	it('gives children of <Sketch> the instance once ready, and null before', async () => {
		const { contexts, atInit, ready } = await renderOverlay();
		expect(atInit).toEqual([null]);
		expect(contexts).toHaveLength(1);
		const context = contexts[0]!;
		expect(context.instance).toBe(ready);
		expect(context.ready).toBe(true);
	});

	it('is undefined outside a canvas', async () => {
		const { outside } = await renderOverlay();
		expect(outside).toEqual([undefined]);
	});

	it('resets the instance to null on unmount', async () => {
		const { contexts, unmount } = await renderOverlay();
		unmount();
		expect(contexts[0]!.instance).toBeNull();
		expect(contexts[0]!.ready).toBe(false);
	});

	it('lets FPSMonitor find the instance without an instance prop', async () => {
		const { container, ready } = await renderOverlay();
		expect(ready).not.toBeNull();
		// An unconnected monitor stays at 0 fps; the fake counts a draw on every read.
		await vi.waitFor(
			() =>
				expect(container.querySelector('.fps-monitor')?.textContent).toMatch(/^\s*[1-9]\d* fps/),
			{ timeout: 3000 }
		);
	});

	it('renders children inside a positioned canvas container', async () => {
		const { container } = await renderOverlay();
		const monitor = container.querySelector('.fps-monitor')!;
		expect(monitor.parentElement!.getAttribute('style')).toMatch(/^position: relative;/);
	});

	it('keeps the container markup unchanged when there are no children', async () => {
		let ready: unknown = null;
		const { container } = render(Sketch, { sketch: () => {}, onReady: (p) => (ready = p) });
		await vi.waitFor(() => expect(ready).not.toBeNull());
		const inner = container.querySelector('div > div > div')!;
		expect(inner.getAttribute('style')).toBe('display: block; width: 100%; height: 100%;');
		expect(inner.childElementCount).toBe(0);
	});
});
