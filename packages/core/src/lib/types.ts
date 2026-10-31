import type p5 from 'p5';
import type { Snippet } from 'svelte';
import type { LoopMode } from './render.js';
import type { P5Addon } from './addons.js';

/**
 * A p5 sketch function in instance mode. Called with the p5 instance;
 * the function should assign `p.setup`, `p.draw`, etc. on it.
 *
 * `Ext` types the members your sketch installs onto the instance
 * (`p.myHelper = ...`). Inside the sketch the instance is typed as
 * already-extended, because the sketch itself is what installs those
 * members before anyone else can observe them:
 *
 * ```ts
 * interface MyExt {
 * 	resetView(): void;
 * }
 * const sketch: SketchFn<MyExt> = (p) => {
 * 	p.resetView = () => { ... };
 * 	p.draw = () => { ... };
 * };
 * ```
 */
export type SketchFn<Ext = unknown> = (p: p5 & Ext) => void;

/**
 * A p5 instance decorated with app-specific members (see {@link SketchFn}).
 * Useful for typing stores or variables that hold the bound instance:
 * `let instance: ExtendedP5<MyExt> | null`.
 */
export type ExtendedP5<Ext> = p5 & Ext;

/**
 * Props accepted by the `<P5Canvas>` component.
 */
export interface P5CanvasProps<Ext = unknown> {
	/** Your sketch function - assigns p.setup, p.draw, etc. */
	sketch: SketchFn<Ext>;
	/** Bindable: the p5 instance, available after mount. `null` before mount or after unmount. */
	instance?: ExtendedP5<Ext> | null;
	/** Optional class applied to the container div. */
	class?: string;
	/** Optional inline style on the container div. Defaults to `display: block; width: 100%; height: 100%;`. */
	style?: string;
	/** Called once, after `instance` is bound and `setup()` has finished (awaited if async), or right after construction if there is no `setup()`. */
	onReady?: (instance: ExtendedP5<Ext>) => void;
	/** `'always'` (default) keeps p5's loop; `'demand'` and `'manual'` redraw only when asked. */
	loop?: LoopMode;
	/** Bridges whose state the sketch reads; in `'demand'` mode any change to them redraws. */
	bridge?: { state: object } | readonly { state: object }[];
	/** p5 2 add-ons, registered once each before the sketch is created. Throws on p5 1.x. */
	addons?: readonly P5Addon[];
	/** Text for p5's `describe()`, the canvas's screen-reader description; re-applied when it changes. */
	description?: string;
	/** Overlays rendered in the container, which gets `position: relative`. */
	children?: Snippet;
}
