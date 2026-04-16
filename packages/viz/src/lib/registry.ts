import type { VizPanel } from './types.js';

/**
 * Typed lookup table from panel `type` strings to panel implementations.
 * A scene runner resolves a {@link PanelInstance} to a live panel through a
 * registry; the studio discovers available panel types by listing one.
 */
export interface PanelRegistry {
	/**
	 * Register a panel implementation. Throws if the `type` is already taken —
	 * duplicate types would be a silent correctness hazard in the no-code studio.
	 */
	register<TData, TConfig>(panel: VizPanel<TData, TConfig>): void;
	/** Look up a panel by its registered type. `undefined` if not registered. */
	get(type: string): VizPanel | undefined;
	/** Whether a panel with this type is registered. */
	has(type: string): boolean;
	/** Snapshot of all registered panels, in insertion order. */
	list(): readonly VizPanel[];
	/** Remove a panel implementation. Returns whether anything was removed. */
	unregister(type: string): boolean;
}

/**
 * Create an empty panel registry. A scene runner typically creates one at
 * boot, calls {@link PanelRegistry.register} for each panel the app exposes,
 * and hangs onto it for the session.
 *
 * @example
 * ```ts
 * import { createPanelRegistry } from 'svelte-p5-viz';
 * import { WordCloudPanel, TimelineTrackPanel } from './panels';
 *
 * export const registry = createPanelRegistry();
 * registry.register(WordCloudPanel);
 * registry.register(TimelineTrackPanel);
 * ```
 */
export function createPanelRegistry(): PanelRegistry {
	const panels = new Map<string, VizPanel>();
	return {
		register(panel) {
			if (panels.has(panel.type)) {
				throw new Error(`[svelte-p5-viz] panel "${panel.type}" is already registered`);
			}
			panels.set(panel.type, panel as VizPanel);
		},
		get(type) {
			return panels.get(type);
		},
		has(type) {
			return panels.has(type);
		},
		list() {
			return [...panels.values()];
		},
		unregister(type) {
			return panels.delete(type);
		}
	};
}
