import type { PanelHit } from './types.js';

/**
 * Reactive chrome-level state shared across all panels in a scene. Chrome
 * wrappers read/write this; panels receive a read view via {@link PanelContext.highlights}.
 *
 * The ergonomics match Svelte 5's rune model — the returned object is a
 * `$state` proxy; mutate it directly from chrome code.
 */
export interface SceneState {
	/** The most-recently-reported hit across all panels this frame. */
	hover: PanelHit | null;
	/**
	 * Ids other panels should highlight. Populated by chrome when `hover`
	 * changes, cleared when `hover` goes null. Panels read a read-only snapshot
	 * via {@link PanelContext.highlights}.
	 */
	highlights: string[];
}

/**
 * Create a fresh reactive scene-state store. Call once per scene instance
 * (typically inside a chrome wrapper's `$effect`).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createSceneState } from 'svelte-p5-viz';
 *
 *   const scene = createSceneState();
 *
 *   function onPanelHit(hit) {
 *     scene.hover = hit;
 *     scene.highlights = hit ? [hit.id] : [];
 *   }
 * </script>
 * ```
 */
export function createSceneState(): SceneState {
	const state = $state<SceneState>({
		hover: null,
		highlights: []
	});
	return state;
}
