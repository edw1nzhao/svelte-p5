<script lang="ts">
	import type p5 from 'p5';
	import type { Snippet } from 'svelte';
	import { downloadCanvas, getSketchContext, type ExportOptions } from 'svelte-p5';

	type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

	interface Props {
		/** Defaults to the instance of the enclosing `<Sketch>` or `<P5Canvas>`. */
		instance?: p5 | null;
		/** Passed to `downloadCanvas`: scale, size, format, quality, filename, seed. */
		options?: ExportOptions;
		/** Overlay corner inside a canvas, or `'static'` for an ordinary inline button. */
		position?: Position | 'static';
		class?: string;
		/** Button content. Default: "Export PNG" (or the chosen format). */
		children?: Snippet;
		onExport?: (blob: Blob) => void;
		onError?: (error: unknown) => void;
	}

	let {
		instance,
		options = {},
		position = 'bottom-left',
		class: className = '',
		children,
		onExport,
		onError
	}: Props = $props();

	const context = getSketchContext();
	const target = $derived(instance ?? context?.instance ?? null);
	let busy = $state(false);

	async function save() {
		if (!target || busy) return;
		busy = true;
		try {
			const blob = await downloadCanvas(target, options);
			onExport?.(blob);
		} catch (error) {
			if (onError) onError(error);
			else throw error;
		} finally {
			busy = false;
		}
	}

	const positionStyles: Record<Position | 'static', string> = {
		'top-left': 'position: absolute; top: 8px; left: 8px;',
		'top-right': 'position: absolute; top: 8px; right: 8px;',
		'bottom-left': 'position: absolute; bottom: 8px; left: 8px;',
		'bottom-right': 'position: absolute; bottom: 8px; right: 8px;',
		static: ''
	};
</script>

<button
	type="button"
	class="export-button {className}"
	style={positionStyles[position]}
	disabled={!target || busy}
	aria-busy={busy}
	onclick={save}
>
	{#if children}
		{@render children()}
	{:else}
		Export {(options.format ?? 'png').toUpperCase()}
	{/if}
</button>

<style>
	.export-button {
		padding: 4px 8px;
		font:
			12px/1.2 system-ui,
			sans-serif;
		color: #fff;
		background: rgba(0, 0, 0, 0.65);
		border: 0;
		border-radius: 4px;
		cursor: pointer;
		z-index: 10;
	}
	.export-button:disabled {
		cursor: default;
		opacity: 0.6;
	}
	.export-button:focus-visible {
		outline: 2px solid #6366f1;
		outline-offset: 2px;
	}
</style>
