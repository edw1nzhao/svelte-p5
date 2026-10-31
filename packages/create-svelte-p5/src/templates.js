export const TEMPLATES = [
	{
		id: 'minimal',
		label: 'minimal',
		hint: 'P5Canvas and one sketch'
	},
	{
		id: 'components',
		label: 'components',
		hint: 'Sketch, FPSMonitor and a createP5Bridge control'
	}
];

export const DEFAULT_TEMPLATE = 'minimal';
export const DEFAULT_NAME = 'svelte-p5-app';

/** @param {string} id */
export const isTemplate = (id) => TEMPLATES.some((t) => t.id === id);
