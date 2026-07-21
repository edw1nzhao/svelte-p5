import type p5 from 'p5';

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
	/** Called once, synchronously, when the p5 instance has been created and the sketch function has returned. */
	onReady?: (instance: ExtendedP5<Ext>) => void;
}
