import { beforeEach, afterEach } from 'vitest';
import { tick } from 'svelte';

export const WIN_W = 480;
export const WIN_H = 320;
export const TITLE_H = 24;
export const PARENT = { left: 0, top: 0, width: 600, height: 400 };

// happy-dom has no layout, so derive rects from the window's translate the way a
// browser would for a `top: 0; left: 0` fixed or absolute element.
export function translateOf(el: Element): { x: number; y: number } {
	const raw = (el as HTMLElement).style.getPropertyValue('translate');
	const [x = '0', y = '0'] = raw.trim().split(/\s+/);
	return { x: parseFloat(x) || 0, y: parseFloat(y) || 0 };
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
	return {
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
		toJSON() {}
	} as DOMRect;
}

function fakeRect(this: HTMLElement): DOMRect {
	const root = this.closest('.draggable-window');
	if (this.classList.contains('dw-parent')) {
		return rect(PARENT.left, PARENT.top, PARENT.width, PARENT.height);
	}
	if (!root) return rect(0, 0, 0, 0);
	const { x, y } = translateOf(root);
	if (this === root) return rect(x, y, WIN_W, WIN_H);
	if (this.classList.contains('dw-titlebar')) return rect(x, y, WIN_W, TITLE_H);
	if (this.classList.contains('dw-handle')) return rect(x + 10, y, WIN_W - 50, TITLE_H);
	if (this.classList.contains('dw-close')) return rect(x + WIN_W - 36, y + 2, 32, 20);
	if (this.classList.contains('dw-body')) return rect(x, y + TITLE_H, WIN_W, WIN_H - TITLE_H);
	return rect(x, y + TITLE_H, 10, 10);
}

const savedRect = HTMLElement.prototype.getBoundingClientRect;
const savedInnerWidth = window.innerWidth;
const savedInnerHeight = window.innerHeight;

export function setViewport(width: number, height: number) {
	Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
	Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

export function useFakeLayout() {
	beforeEach(() => {
		HTMLElement.prototype.getBoundingClientRect = fakeRect;
		setViewport(1024, 768);
	});

	afterEach(() => {
		HTMLElement.prototype.getBoundingClientRect = savedRect;
		setViewport(savedInnerWidth, savedInnerHeight);
		document.body.innerHTML = '';
	});
}

// Effects (callbacks, transforms) may be deferred to a microtask or a frame.
export async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 32));
	await tick();
}

export function pointer(type: string, target: Element, x: number, y: number) {
	target.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			composed: true,
			clientX: x,
			clientY: y,
			pointerId: 1,
			pointerType: 'mouse',
			button: 0,
			buttons: type === 'pointerup' ? 0 : 1,
			isPrimary: true
		})
	);
}

/** Press on `from`, move by (dx, dy) in steps, release. Starts at the element's centre. */
export async function drag(from: Element, dx: number, dy: number) {
	const r = from.getBoundingClientRect();
	const sx = r.left + r.width / 2;
	const sy = r.top + r.height / 2;
	pointer('pointerdown', from, sx, sy);
	await settle();
	const steps = 4;
	for (let i = 1; i <= steps; i++) {
		pointer('pointermove', from, sx + (dx * i) / steps, sy + (dy * i) / steps);
		await settle();
	}
	pointer('pointerup', from, sx + dx, sy + dy);
	await settle();
}
