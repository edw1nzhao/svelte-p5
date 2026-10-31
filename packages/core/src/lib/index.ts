export { default as P5Canvas } from './P5Canvas.svelte';
export { createP5Bridge, type P5Bridge } from './createP5Bridge.svelte.js';
export type { SketchFn, ExtendedP5, P5CanvasProps } from './types.js';
export { getSketchContext, type SketchContext } from './context.js';
export { invalidate, type LoopMode } from './render.js';
export {
	exportCanvas,
	downloadCanvas,
	exportFilename,
	stepFrames,
	type ExportFormat,
	type ExportOptions,
	type StepFramesOptions,
	type SteppedFrame
} from './export.js';

// Re-export utils from the main entry for convenience - users doing
// `import { disableFES } from 'svelte-p5'` get the same
// helpers they'd get from `.../utils`. Tree-shakeable via `sideEffects: false`.
export * from './utils/index.js';
