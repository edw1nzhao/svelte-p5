<script lang="ts" generics="Ext = unknown">
	import { onMount, untrack } from 'svelte';
	import type p5Type from 'p5';
	import type { ExtendedP5, P5CanvasProps } from './types.js';
	import { mountSketch, type SketchCtor, type SketchHost } from './mountSketch.js';
	import { setSketchContext } from './context.js';
	import {
		applyLoopMode,
		disposeInvalidation,
		invalidate,
		trackDeep,
		type LoopMode
	} from './render.js';

	let {
		sketch,
		instance = $bindable(null),
		class: className = '',
		style = 'display: block; width: 100%; height: 100%;',
		onReady,
		loop = 'always',
		bridge,
		children
	}: P5CanvasProps<Ext> = $props();

	let container: HTMLDivElement | null = null;
	let readyInstance: ExtendedP5<Ext> | null = $state(null);
	// Only transitions are applied, so 'always' never undoes a noLoop() from setup().
	let appliedLoop: LoopMode = 'always';

	function syncLoop(p: object, mode: LoopMode) {
		if (mode === appliedLoop) return;
		appliedLoop = mode;
		applyLoopMode(p, mode);
	}

	setSketchContext({
		get instance() {
			return readyInstance;
		},
		get ready() {
			return readyInstance !== null;
		},
		get loop() {
			return loop;
		},
		invalidate() {
			invalidate(readyInstance);
		}
	});

	$effect(() => {
		const mode = loop;
		if (readyInstance) untrack(() => syncLoop(readyInstance!, mode));
	});

	$effect(() => {
		const p = readyInstance;
		if (!p || loop !== 'demand' || !bridge) return;
		const bridges = Array.isArray(bridge) ? bridge : [bridge];
		let primed = false;
		$effect(() => {
			for (const b of bridges) trackDeep(b.state);
			if (primed) untrack(() => invalidate(p));
			primed = true;
		});
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
					appliedLoop = 'always';
					syncLoop(p, loop);
					readyInstance = p as ExtendedP5<Ext>;
					onReady?.(p as ExtendedP5<Ext>);
				}
			);
		})();

		return () => {
			cancelled = true;
			if (instance) disposeInvalidation(instance);
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
