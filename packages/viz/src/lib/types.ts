import type p5 from 'p5';

/**
 * A rectangular region in canvas coordinates. Chrome slices a canvas into
 * these and hands them to panels; panels render inside them and nothing else.
 */
export interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * A hit emitted by a panel — what's currently under the pointer (or
 * otherwise "selected" by the panel). Chrome surfaces it for tooltips,
 * cross-highlighting, and scene-level selection state.
 *
 * `id` is the contract between panels: two panels agreeing on the same id
 * (e.g. a speaker name, a turn number, a timestamp) is how cross-highlighting
 * works without any bespoke event bus.
 */
export interface PanelHit {
	/** Stable identifier. Panels that want to cross-highlight should agree on the id shape. */
	readonly id: string;
	/** Optional panel-specific payload. Consumers of the hit should treat this as untrusted and narrow it themselves. */
	readonly meta?: unknown;
}

/**
 * Everything a panel is handed on each render frame. Ambient state only —
 * a panel should never need to reach outside the PanelContext for chrome
 * concerns (bounds, mouse, highlights).
 */
export interface PanelContext {
	/** Live p5 instance. Panels draw into its current renderer. */
	readonly sk: p5;
	/** The rectangle this panel owns for the frame. Don't draw outside it. */
	readonly bounds: Bounds;
	/** Pointer position in canvas coordinates, or `null` if the pointer is off-canvas. */
	readonly mouse: { x: number; y: number } | null;
	/**
	 * Ids other panels emitted as hits (or hover) this frame. A panel that
	 * renders the same domain object should visually emphasise or dim items
	 * whose id matches an entry here. Read-only — write via the returned
	 * `PanelResult.hover`.
	 */
	readonly highlights: ReadonlyArray<string>;
}

/**
 * What a panel returns after drawing one frame. Only chrome-relevant state
 * belongs here; app-specific side channels live in the panel's own instance
 * state or in the shared data layer.
 */
export interface PanelResult {
	/** What this panel is currently hovering over. `null` means nothing is under the cursor. */
	readonly hover: PanelHit | null;
	/** Signals that the panel's content overflowed its bounds — chrome can render an indicator. */
	readonly overflow?: boolean;
}

/**
 * The core contract. A panel is a stateless renderer for one kind of
 * visualization. Instantiated once, called every frame with fresh
 * data, config, and bounds.
 *
 * Panel implementations should avoid storing per-frame state on the panel
 * itself; cache-worthy state (e.g. offscreen buffers) is fine, but anything
 * time-varying belongs in the data the caller passes in.
 *
 * @template TData — the shape of data this panel renders
 * @template TConfig — user-tunable knobs (colors, thresholds, modes)
 */
export interface VizPanel<TData = unknown, TConfig = unknown> {
	/** Registry key. Must be unique across all panels a scene uses. */
	readonly type: string;
	/** Config used when a scene instance provides no override. Shallow-merged with per-instance config. */
	readonly defaultConfig: TConfig;
	/**
	 * Optional runtime schema for the config. Typed as `unknown` so the contract
	 * stays schema-library-agnostic — use zod, valibot, arktype, or plain JSON
	 * Schema. The no-code studio will inspect this to generate property panels.
	 */
	readonly schema?: unknown;
	/** Render one frame. Called from inside the p5 draw loop by a scene runner. */
	render(ctx: PanelContext, data: TData, config: TConfig): PanelResult;
	/** Optional cleanup hook — release p5.Graphics buffers or other owned resources here. */
	dispose?(): void;
}
