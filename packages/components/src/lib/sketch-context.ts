import { getContext } from 'svelte';
import type p5 from 'p5';

// The key svelte-p5's getSketchContext() uses. Read here directly so these
// components still load against svelte-p5 releases that predate it.
const KEY = Symbol.for('svelte-p5.sketch-context');

/** The enclosing `<P5Canvas>`'s context, or `undefined` outside one. */
export function sketchContext(): { readonly instance: p5 | null } | undefined {
	return getContext(KEY);
}
