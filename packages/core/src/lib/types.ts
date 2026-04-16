import type p5 from 'p5';

/**
 * A p5 sketch function in instance mode. Called with the p5 instance;
 * the function should assign `p.setup`, `p.draw`, etc. on it.
 */
export type SketchFn = (p: p5) => void;

/**
 * Props accepted by the `<P5Canvas>` component.
 */
export interface P5CanvasProps {
	/** Your sketch function - assigns p.setup, p.draw, etc. */
	sketch: SketchFn;
	/** Bindable: the p5 instance, available after mount. `null` before mount or after unmount. */
	instance?: p5 | null;
	/** Optional class applied to the container div. */
	class?: string;
	/** Optional inline style on the container div. Defaults to `display: block; width: 100%; height: 100%;`. */
	style?: string;
	/** Called once, synchronously, when the p5 instance has been created and the sketch function has returned. */
	onReady?: (instance: p5) => void;
}
