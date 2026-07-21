import type { ExtendedP5, SketchFn } from 'svelte-p5';

/**
 * Props accepted by the `<Sketch>` component.
 */
export interface SketchProps<Ext = unknown> {
	sketch: SketchFn<Ext>;
	/**
	 * Pixel density applied on ready. `true` → `devicePixelRatio`,
	 * `false` → 1 (p5's own default is already devicePixelRatio, so this
	 * is the only way to genuinely opt out), a number → that exact
	 * density. Cap it for large WEBGL canvases, e.g.
	 * `Math.min(devicePixelRatio, 2)`. Default: true.
	 */
	hidpi?: boolean | number;
	class?: string;
	style?: string;
	/** Bindable: the p5 instance, available after mount. `null` before mount or after unmount. */
	instance?: ExtendedP5<Ext> | null;
	/** Called once after creation, pixel density, and initial container sizing. */
	onReady?: (instance: ExtendedP5<Ext>) => void;
	/**
	 * Called after the canvas has been resized to track its container
	 * (ResizeObserver path). Not called for the initial sizing — use
	 * `onReady` for that. Rebuild size-dependent state here and request
	 * a redraw if your sketch is noLoop-gated.
	 */
	onResize?: (instance: ExtendedP5<Ext>, width: number, height: number) => void;
}
