import { drawable, redrawBlocked } from './internals.js';

/**
 * How `<P5Canvas>` drives `draw()`.
 * - `'always'`: p5's own loop, every animation frame (p5's default).
 * - `'demand'`: one frame after a change to the `bridge` state, a resize, or `invalidate()`.
 * - `'manual'`: one frame per `invalidate()` (and per resize) only.
 */
export type LoopMode = 'always' | 'demand' | 'manual';

interface Scheduler {
	invalidate(): void;
	dispose(): void;
}

const schedulers = new WeakMap<object, Scheduler>();

function createScheduler(p: object): Scheduler {
	let frame = 0;
	let running = false;
	let again = false;
	let disposed = false;

	const flush = async () => {
		frame = 0;
		if (disposed) return;
		const d = drawable(p);
		if (d.isLooping()) return;
		if (redrawBlocked(p)) return schedule();
		running = true;
		try {
			await d.redraw();
		} finally {
			running = false;
		}
		if (again) {
			again = false;
			schedule();
		}
	};

	function schedule() {
		if (disposed || frame) return;
		if (running) {
			again = true;
			return;
		}
		frame = requestAnimationFrame(() => void flush());
	}

	return {
		invalidate: schedule,
		dispose() {
			disposed = true;
			if (frame) cancelAnimationFrame(frame);
			schedulers.delete(p);
		}
	};
}

function schedulerFor(p: object): Scheduler {
	let s = schedulers.get(p);
	if (!s) {
		s = createScheduler(p);
		schedulers.set(p, s);
	}
	return s;
}

/**
 * Requests one `draw()` on the next animation frame. Calls in the same frame
 * coalesce into one redraw. Does nothing while the sketch is looping.
 */
export function invalidate(instance: object | null | undefined): void {
	if (instance) schedulerFor(instance).invalidate();
}

/** Applies a loop mode to a ready instance. */
export function applyLoopMode(instance: object, mode: LoopMode): void {
	const d = drawable(instance);
	if (mode === 'always') {
		if (!d.isLooping()) d.loop();
	} else if (d.isLooping()) {
		d.noLoop();
	}
}

/** Cancels pending invalidations for an instance that is being removed. */
export function disposeInvalidation(instance: object): void {
	schedulers.get(instance)?.dispose();
}

/** Reads every property of plain objects and arrays, so a surrounding effect tracks all of them. */
export function trackDeep(value: unknown, seen = new Set<object>()): void {
	if (typeof value !== 'object' || value === null || seen.has(value)) return;
	seen.add(value);
	if (Array.isArray(value)) {
		for (const item of value) trackDeep(item, seen);
		return;
	}
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) return;
	for (const key of Object.keys(value)) trackDeep((value as Record<string, unknown>)[key], seen);
}
