import type { Snippet } from 'svelte';
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
	/** `P5Canvas`'s loop mode. Needs svelte-p5 1.2. */
	loop?: 'always' | 'demand' | 'manual';
	/** Bridges whose changes redraw a `'demand'` sketch. Needs svelte-p5 1.2. */
	bridge?: { state: object } | readonly { state: object }[];
	/** p5 2 add-ons registered before the sketch is created. Needs svelte-p5 1.2. */
	addons?: readonly ((p5: any, fn: any, lifecycles: any) => void)[];
	/** Screen-reader description passed to p5's `describe()`. Needs svelte-p5 1.3. */
	description?: string;
	/** Absolutely positioned overlays, e.g. `<FPSMonitor />`; they get the sketch context. */
	children?: Snippet;
}
