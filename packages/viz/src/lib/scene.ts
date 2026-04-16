/**
 * A panel placed in a scene. The `type` maps to a {@link VizPanel} in the
 * registry; `config` is the per-instance override that gets shallow-merged
 * over the panel's `defaultConfig`.
 */
export interface PanelInstance {
	/** Scene-unique id. Layouts reference panels by this. */
	readonly id: string;
	/** Registered panel type (see {@link VizPanel.type}). */
	readonly type: string;
	/** Optional human-readable label for the no-code studio. */
	readonly label?: string;
	/** Per-instance config override. Missing keys fall back to the panel's defaultConfig. */
	readonly config?: Record<string, unknown>;
}

/**
 * Arrange panels in an equal-cell grid. `columns` fixes width; the number of
 * rows is derived from the panel count.
 */
export interface GridSceneLayout {
	readonly kind: 'grid';
	/** Number of columns. Must be ≥ 1. */
	readonly columns: number;
	/** CSS gap (px) between cells. Default: 8. */
	readonly gap?: number;
	/** CSS padding (px) inside the canvas. Default: 0. */
	readonly padding?: number;
	/** Panel instance ids in reading order (row-major). */
	readonly panels: readonly string[];
}

/**
 * Two-panel split with a draggable divider. Consumers render the divider
 * themselves (see `<SplitPane>` in svelte-p5-components); this type just
 * captures the config.
 */
export interface SplitSceneLayout {
	readonly kind: 'split';
	readonly orientation: 'horizontal' | 'vertical';
	/** Divider position as a percentage (0-100) from the top/left. */
	readonly position: number;
	/** Panel instance id in the first slot (top / left). */
	readonly first: string;
	/** Panel instance id in the second slot (bottom / right). */
	readonly second: string;
}

/** A single panel filling the entire canvas. */
export interface SingleSceneLayout {
	readonly kind: 'single';
	readonly panel: string;
}

export type SceneLayout = GridSceneLayout | SplitSceneLayout | SingleSceneLayout;

/**
 * A complete scene description — enough to reconstruct a visualization from
 * JSON on disk, a URL hash, or a no-code studio export.
 *
 * The format is versioned so future non-backward-compatible additions can
 * ship behind a migration step.
 */
export interface SceneConfig {
	readonly version: 1;
	/** Optional human-readable name (for tab titles, exports). */
	readonly name?: string;
	/** Panel definitions — referenced by id from the layout. */
	readonly panels: readonly PanelInstance[];
	/** How to arrange the panels spatially. */
	readonly layout: SceneLayout;
}
