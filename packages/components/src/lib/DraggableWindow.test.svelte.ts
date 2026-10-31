import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import DraggableWindow from './DraggableWindow.svelte';
import {
	WIN_W,
	WIN_H,
	PARENT,
	translateOf,
	setViewport,
	settle,
	pointer,
	drag,
	useFakeLayout
} from './tests/drag.js';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

useFakeLayout();

function renderWindow(props: Record<string, unknown> = {}) {
	const result = render(DraggableWindow, {
		props: { title: 'Inspector', children: snippet('<p class="content">BODY</p>'), ...props }
	});
	const root = result.container.querySelector('.draggable-window') as HTMLElement;
	return { ...result, root };
}

function renderInParent(props: Record<string, unknown> = {}) {
	const parent = document.createElement('div');
	parent.className = 'dw-parent';
	document.body.appendChild(parent);
	const result = render(DraggableWindow, {
		target: parent,
		props: { title: 'Inspector', constrained: 'parent', ...props }
	});
	const root = parent.querySelector('.draggable-window') as HTMLElement;
	return { ...result, root };
}

const q = (root: Element, sel: string) => root.querySelector(sel) as HTMLElement;

describe('<DraggableWindow> structure', () => {
	it('renders the titlebar, handle, title and body', () => {
		const { root } = renderWindow();
		expect(root).not.toBeNull();
		expect(q(root, ':scope > .dw-titlebar > .dw-handle > .dw-title-text').textContent).toBe(
			'Inspector'
		);
		expect(q(root, ':scope > .dw-body > p.content').textContent).toBe('BODY');
	});

	it('defaults the title to "Window"', () => {
		const { root } = renderWindow({ title: undefined });
		expect(q(root, '.dw-title-text').textContent).toBe('Window');
	});

	it('renders a header snippet in place of the title text', () => {
		const { root } = renderWindow({ header: snippet('<b class="custom">HEAD</b>') });
		expect(q(root, '.dw-handle > b.custom').textContent).toBe('HEAD');
		expect(root.querySelector('.dw-title-text')).toBeNull();
	});

	it('applies size props as inline styles, numbers as px', () => {
		const { root } = renderWindow({ width: 300, height: '50vh', minWidth: 150, minHeight: '4rem' });
		expect(root.style.width).toBe('300px');
		expect(root.style.height).toBe('50vh');
		expect(root.style.minWidth).toBe('150px');
		expect(root.style.minHeight).toBe('4rem');
	});

	it('uses 480x320 with 200x120 minimums by default', () => {
		const { root } = renderWindow();
		expect(root.style.width).toBe('480px');
		expect(root.style.height).toBe('320px');
		expect(root.style.minWidth).toBe('200px');
		expect(root.style.minHeight).toBe('120px');
	});

	it('is fixed-positioned unless constrained to the parent', () => {
		for (const constrained of ['viewport', 'none', undefined]) {
			const { root, unmount } = renderWindow({ constrained });
			expect(root.classList.contains('dw-fixed')).toBe(true);
			expect(root.classList.contains('dw-absolute')).toBe(false);
			unmount();
		}
		const { root } = renderInParent();
		expect(root.classList.contains('dw-absolute')).toBe(true);
		expect(root.classList.contains('dw-fixed')).toBe(false);
	});

	it('marks the root as a neodrag node in the idle state', async () => {
		const { root } = renderWindow();
		await settle();
		expect(root.hasAttribute('data-neodrag')).toBe(true);
		expect(root.getAttribute('data-neodrag-state')).toBe('idle');
	});
});

describe('<DraggableWindow> close button', () => {
	it('is hidden without onClose', () => {
		const { root } = renderWindow();
		expect(root.querySelector('.dw-close')).toBeNull();
	});

	it('calls onClose when clicked', async () => {
		const onClose = vi.fn();
		const { root } = renderWindow({ onClose });
		const btn = q(root, '.dw-titlebar > .dw-close');
		expect(btn.getAttribute('aria-label')).toBe('Close window');
		await fireEvent.click(btn);
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});

describe('<DraggableWindow> position', () => {
	it('starts at initialX/initialY', async () => {
		const { root } = renderWindow({ initialX: 120, initialY: 70 });
		await settle();
		expect(translateOf(root)).toEqual({ x: 120, y: 70 });
	});

	it('defaults to (40, 40)', async () => {
		const { root } = renderWindow();
		await settle();
		expect(translateOf(root)).toEqual({ x: 40, y: 40 });
	});

	it('ignores later initialX/initialY changes', async () => {
		const { root, rerender } = renderWindow({ initialX: 100, initialY: 100 });
		await settle();
		await rerender({ initialX: 300, initialY: 300 });
		await settle();
		expect(translateOf(root)).toEqual({ x: 100, y: 100 });
	});
});

describe('<DraggableWindow> dragging', () => {
	it('moves by the pointer delta when dragged from the title handle', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100 });
		await settle();
		await drag(q(root, '.dw-handle'), 50, 30);
		expect(translateOf(root)).toEqual({ x: 150, y: 130 });
	});

	it('accumulates across consecutive drags', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100 });
		await settle();
		await drag(q(root, '.dw-handle'), 50, 30);
		await drag(q(root, '.dw-handle'), -20, 10);
		expect(translateOf(root)).toEqual({ x: 130, y: 140 });
	});

	it('does not drag from the body', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100 });
		await settle();
		await drag(q(root, '.dw-body'), 50, 30);
		expect(translateOf(root)).toEqual({ x: 100, y: 100 });
	});

	it('does not drag from the close button', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100, onClose: () => {} });
		await settle();
		await drag(q(root, '.dw-close'), 50, 30);
		expect(translateOf(root)).toEqual({ x: 100, y: 100 });
	});

	it('marks the root as dragging only while a drag is in progress', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100 });
		await settle();
		const handle = q(root, '.dw-handle');
		const r = handle.getBoundingClientRect();
		pointer('pointerdown', handle, r.left + 5, r.top + 5);
		pointer('pointermove', handle, r.left + 25, r.top + 5);
		await settle();
		expect(root.getAttribute('data-neodrag-state')).toBe('dragging');
		pointer('pointerup', handle, r.left + 25, r.top + 5);
		await settle();
		expect(root.getAttribute('data-neodrag-state')).toBe('idle');
	});

	it('ignores movements of 3px or less', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100 });
		await settle();
		await drag(q(root, '.dw-handle'), 2, 2);
		expect(translateOf(root)).toEqual({ x: 100, y: 100 });
	});

	it('locks movement to the x axis', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100, axis: 'x' });
		await settle();
		await drag(q(root, '.dw-handle'), 50, 30);
		expect(translateOf(root)).toEqual({ x: 150, y: 100 });
	});

	it('snaps the position to the grid', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100, grid: [20, 20] });
		await settle();
		await drag(q(root, '.dw-handle'), 50, 30);
		expect(translateOf(root)).toEqual({ x: 160, y: 140 });
	});

	it('combines axis and grid', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100, axis: 'x', grid: [20, 20] });
		await settle();
		await drag(q(root, '.dw-handle'), 50, 30);
		expect(translateOf(root)).toEqual({ x: 160, y: 100 });
	});

	// next.8 started only past 3px; next.12 starts at exactly the threshold.
	it('starts a drag once the pointer travels the threshold', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100 });
		await settle();
		await drag(q(root, '.dw-handle'), 3, 0);
		expect(translateOf(root)).toEqual({ x: 103, y: 100 });
	});

	it('honours a custom threshold', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100, threshold: 20 });
		await settle();
		await drag(q(root, '.dw-handle'), 12, 12);
		expect(translateOf(root)).toEqual({ x: 100, y: 100 });
		await drag(q(root, '.dw-handle'), 30, 0);
		expect(translateOf(root)).toEqual({ x: 130, y: 100 });
	});
});

describe('<DraggableWindow> bounds', () => {
	it('keeps the whole window inside the viewport while dragging (viewport mode)', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100 });
		await settle();
		await drag(q(root, '.dw-handle'), 3000, 3000);
		expect(translateOf(root)).toEqual({ x: 1024 - WIN_W, y: 768 - WIN_H });
		await drag(q(root, '.dw-handle'), -3000, -3000);
		expect(translateOf(root)).toEqual({ x: 0, y: 0 });
	});

	it('keeps the window inside its parent (parent mode)', async () => {
		const { root } = renderInParent({ initialX: 20, initialY: 20 });
		await settle();
		await drag(q(root, '.dw-handle'), 3000, 3000);
		expect(translateOf(root)).toEqual({ x: PARENT.width - WIN_W, y: PARENT.height - WIN_H });
	});

	it('does not clamp when constrained="none"', async () => {
		const { root } = renderWindow({ initialX: 100, initialY: 100, constrained: 'none' });
		await settle();
		await drag(q(root, '.dw-handle'), 3000, 2000);
		expect(translateOf(root)).toEqual({ x: 3100, y: 2100 });
	});

	it('snaps back to keep minVisible px on screen when the viewport shrinks', async () => {
		const { root } = renderWindow({ initialX: 500, initialY: 400, minVisible: 60 });
		await settle();
		setViewport(400, 300);
		window.dispatchEvent(new Event('resize'));
		await settle();
		expect(translateOf(root)).toEqual({ x: 400 - 60, y: 300 - 60 });
	});

	it('honours a custom minVisible on viewport resize', async () => {
		const { root } = renderWindow({ initialX: 500, initialY: 400, minVisible: 100 });
		await settle();
		setViewport(400, 300);
		window.dispatchEvent(new Event('resize'));
		await settle();
		expect(translateOf(root)).toEqual({ x: 300, y: 200 });
	});

	it('does not clamp on viewport resize when constrained="none"', async () => {
		const { root } = renderWindow({ initialX: 500, initialY: 400, constrained: 'none' });
		await settle();
		setViewport(400, 300);
		window.dispatchEvent(new Event('resize'));
		await settle();
		expect(translateOf(root)).toEqual({ x: 500, y: 400 });
	});

	it('snaps back inside the parent on resize (parent mode)', async () => {
		const { root } = renderInParent({ initialX: 500, initialY: 300 });
		await settle();
		window.dispatchEvent(new Event('resize'));
		await settle();
		expect(translateOf(root)).toEqual({ x: PARENT.width - WIN_W, y: PARENT.height - WIN_H });
	});
});

describe('<DraggableWindow> focus', () => {
	it('raises a window above the others on pointerdown', async () => {
		const a = renderWindow({ title: 'A' });
		const b = renderWindow({ title: 'B' });
		const za = () => Number(a.root.style.zIndex);
		const zb = () => Number(b.root.style.zIndex);
		expect(zb()).toBeGreaterThan(za());
		await fireEvent.pointerDown(q(a.root, '.dw-body'));
		expect(za()).toBeGreaterThan(zb());
	});

	it('raises a window when a drag starts from its handle', async () => {
		const a = renderWindow({ title: 'A', initialX: 100, initialY: 100 });
		const b = renderWindow({ title: 'B' });
		await settle();
		await drag(q(a.root, '.dw-handle'), 20, 0);
		expect(Number(a.root.style.zIndex)).toBeGreaterThan(Number(b.root.style.zIndex));
	});
});
