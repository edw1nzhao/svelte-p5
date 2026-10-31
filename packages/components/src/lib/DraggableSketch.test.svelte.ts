import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { axis } from '@neodrag/svelte';
import DraggableSketch from './DraggableSketch.svelte';
import { translateOf, settle, drag, useFakeLayout } from './tests/drag.js';

vi.mock('p5', () => {
	class FakeP5 {
		width = 0;
		height = 0;
		resizeCanvas = vi.fn();
		pixelDensity = vi.fn();
		remove = vi.fn();
		constructor(sketch: (p: FakeP5) => void) {
			sketch(this);
		}
	}
	return { default: FakeP5 };
});

useFakeLayout();

function renderSketch(props: Record<string, unknown> = {}) {
	const result = render(DraggableSketch, { props: { sketch: () => {}, ...props } });
	const root = result.container.querySelector('.draggable-window') as HTMLElement;
	return { ...result, root };
}

describe('<DraggableSketch>', () => {
	it('wraps a Sketch in a DraggableWindow titled "Sketch"', () => {
		const { root } = renderSketch();
		expect(root).not.toBeNull();
		expect(root.querySelector('.dw-title-text')?.textContent).toBe('Sketch');
		expect(root.querySelector('.dw-body > div')).not.toBeNull();
	});

	it('uses 400x300 with 200x150 minimums by default', () => {
		const { root } = renderSketch();
		expect(root.style.width).toBe('400px');
		expect(root.style.height).toBe('300px');
		expect(root.style.minWidth).toBe('200px');
		expect(root.style.minHeight).toBe('150px');
	});

	it('forwards title, size and constrained to the window', () => {
		const { root } = renderSketch({
			title: 'Garden',
			width: 420,
			height: '40vh',
			minWidth: 100,
			minHeight: 80,
			constrained: 'none'
		});
		expect(root.querySelector('.dw-title-text')?.textContent).toBe('Garden');
		expect(root.style.width).toBe('420px');
		expect(root.style.height).toBe('40vh');
		expect(root.style.minWidth).toBe('100px');
		expect(root.style.minHeight).toBe('80px');
		expect(root.classList.contains('dw-fixed')).toBe(true);
	});

	it('forwards initialX/initialY', async () => {
		const { root } = renderSketch({ initialX: 80, initialY: 90 });
		await settle();
		expect(translateOf(root)).toEqual({ x: 80, y: 90 });
	});

	it('forwards onClose', async () => {
		const onClose = vi.fn();
		const { root } = renderSketch({ onClose });
		await fireEvent.click(root.querySelector('.dw-close') as HTMLElement);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('runs the sketch function', async () => {
		const sketch = vi.fn();
		renderSketch({ sketch });
		await vi.waitFor(() => expect(sketch).toHaveBeenCalledTimes(1));
	});

	it('drags from the title handle', async () => {
		const { root } = renderSketch({ initialX: 100, initialY: 100 });
		await settle();
		await drag(root.querySelector('.dw-handle') as HTMLElement, 40, 20);
		expect(translateOf(root)).toEqual({ x: 140, y: 120 });
	});

	it('forwards plugins to the window', async () => {
		const { root } = renderSketch({ initialX: 100, initialY: 100, plugins: [axis('y')] });
		await settle();
		await drag(root.querySelector('.dw-handle') as HTMLElement, 40, 20);
		expect(translateOf(root)).toEqual({ x: 100, y: 120 });
	});
});
