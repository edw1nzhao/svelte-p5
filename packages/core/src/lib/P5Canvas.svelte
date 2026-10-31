<script lang="ts" generics="Ext = unknown">
	import { onMount } from 'svelte';
	import type p5Type from 'p5';
	import type { ExtendedP5, P5CanvasProps } from './types.js';
	import { mountSketch, type SketchCtor, type SketchHost } from './mountSketch.js';
	import { setSketchContext } from './context.js';

	let {
		sketch,
		instance = $bindable(null),
		class: className = '',
		style = 'display: block; width: 100%; height: 100%;',
		onReady,
		children
	}: P5CanvasProps<Ext> = $props();

	let container: HTMLDivElement | null = null;
	let readyInstance: ExtendedP5<Ext> | null = $state(null);

	setSketchContext({
		get instance() {
			return readyInstance;
		},
		get ready() {
			return readyInstance !== null;
		}
	});

	onMount(() => {
		let destroy: (() => void) | null = null;
		let cancelled = false;

		(async () => {
			const mod = await import('p5');
			if (cancelled || !container) return;

			// The sketch installs its Ext members during construction, so the
			// instance is already the extended type when it becomes observable.
			destroy = mountSketch(
				mod.default as unknown as SketchCtor<p5Type & SketchHost>,
				(p) => sketch(p as ExtendedP5<Ext>),
				container,
				(p) => (instance = p as ExtendedP5<Ext>),
				(p) => {
					readyInstance = p as ExtendedP5<Ext>;
					onReady?.(p as ExtendedP5<Ext>);
				}
			);
		})();

		return () => {
			cancelled = true;
			try {
				destroy?.();
			} catch {
				// p5.remove() can throw if the DOM is already gone during HMR; ignore.
			}
			destroy = null;
			instance = null;
			readyInstance = null;
		};
	});
</script>

<div
	bind:this={container}
	class={className}
	style={children ? `position: relative; ${style}` : style}
>
	{@render children?.()}
</div>
