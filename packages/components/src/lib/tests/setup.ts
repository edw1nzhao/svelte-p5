import '@testing-library/jest-dom/vitest';

// happy-dom doesn't ship a ResizeObserver stub out of the box — components
// that use it (Sketch, HoverTooltip) expect the constructor to exist.
// Provide a no-op implementation so mounts don't throw; tests that care
// about resize behavior replace it per-case.
if (typeof globalThis.ResizeObserver === 'undefined') {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
}

// Same story for PointerEvent — happy-dom implements it partially in some
// releases. Ensure constructor works so pointer-driven tests (SplitPane drag,
// TimelineTrack seek) can dispatch events.
if (typeof globalThis.PointerEvent === 'undefined') {
	globalThis.PointerEvent = class extends MouseEvent {
		pointerId: number;
		pointerType: string;
		constructor(type: string, init: PointerEventInit = {}) {
			super(type, init);
			this.pointerId = init.pointerId ?? 0;
			this.pointerType = init.pointerType ?? 'mouse';
		}
	} as unknown as typeof PointerEvent;
}
