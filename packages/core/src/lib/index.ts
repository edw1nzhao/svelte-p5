export { default as P5Canvas } from './P5Canvas.svelte';
export { createP5Bridge, type P5Bridge } from './createP5Bridge.svelte.js';
export type { SketchFn, ExtendedP5, P5CanvasProps } from './types.js';
export { getSketchContext, type SketchContext } from './context.js';
export { invalidate, type LoopMode } from './render.js';
export type { P5Addon, P5AddonLifecycles } from './addons.js';
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

export * from './utils/index.js';
