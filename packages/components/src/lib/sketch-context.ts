import { getContext } from 'svelte';
import type p5 from 'p5';

const KEY = Symbol.for('svelte-p5.sketch-context');

export function sketchContext(): { readonly instance: p5 | null } | undefined {
	return getContext(KEY);
}
