import { getContext, setContext } from 'svelte';
import type { LoopMode } from './render.js';
import type { ExtendedP5 } from './types.js';

/** What `<P5Canvas>` (and `<Sketch>`) share with the components rendered inside them. */
export interface SketchContext<Ext = unknown> {
	/** The p5 instance once `setup()` has finished; `null` before that and after unmount. Reactive. */
	readonly instance: ExtendedP5<Ext> | null;
	/** `true` while `instance` is set. Reactive. */
	readonly ready: boolean;
	/** The canvas's loop mode. Reactive. */
	readonly loop: LoopMode;
	/** Requests one redraw on the next frame; a no-op while the sketch loops. */
	invalidate(): void;
}

// Symbol.for, so two bundled copies of svelte-p5 still share one key.
const KEY = Symbol.for('svelte-p5.sketch-context');

export function setSketchContext(context: SketchContext<any>): void {
	setContext(KEY, context);
}

/**
 * Reads the sketch context of the nearest enclosing `<P5Canvas>` or `<Sketch>`.
 * Call it during component initialisation. Returns `undefined` outside a canvas.
 */
export function getSketchContext<Ext = unknown>(): SketchContext<Ext> | undefined {
	return getContext<SketchContext<Ext> | undefined>(KEY);
}
