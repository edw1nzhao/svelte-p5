// Contract
export type { Bounds, PanelContext, PanelHit, PanelResult, VizPanel } from './types.js';

// Registry
export { createPanelRegistry, type PanelRegistry } from './registry.js';

// Scene format
export type {
	GridSceneLayout,
	PanelInstance,
	SceneConfig,
	SceneLayout,
	SingleSceneLayout,
	SplitSceneLayout
} from './scene.js';

// Reactive cross-panel state (for chrome wrappers)
export { createSceneState, type SceneState } from './scene-state.svelte.js';
