<script lang="ts">
	import CopyButton from './CopyButton.svelte';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { staggerFadeUp } from '$lib/animations';
	import { whenVisible } from '$lib/whenVisible.svelte';

	let {
		title,
		description,
		codeHtml,
		codeRaw,
		demo
	}: {
		title: string;
		description: string;
		codeHtml: string;
		codeRaw: string;
		demo: Snippet;
	} = $props();

	let root: HTMLDivElement | null = $state(null);
	onMount(() => {
		whenVisible(root, (el) => {
			staggerFadeUp(el, '[data-anim]', { staggerMs: 90 });
		});
	});
</script>

<div bind:this={root} class="grid grid-cols-1 gap-8 md:grid-cols-2">
	<!-- Left: title, description, code -->
	<div data-anim class="min-w-0">
		<div class="mb-4">
			<h3 class="text-xl font-semibold text-slate-900 mb-1">{title}</h3>
			<p class="text-sm text-slate-500 leading-relaxed">{description}</p>
		</div>
		<div class="border border-slate-800 rounded-xl overflow-hidden bg-[var(--color-code-bg)]">
			<div class="flex items-center justify-between px-4 py-2 border-b border-slate-800">
				<span class="font-mono text-[0.6875rem] font-medium text-slate-500 uppercase tracking-wider"
					>Svelte</span
				>
				<CopyButton text={codeRaw} />
			</div>
			<div class="code-scroll">
				{@html codeHtml}
			</div>
		</div>
	</div>

	<!-- Right: demo, stretches to match code height -->
	<div data-anim class="flex items-end">
		<div
			class="w-full border border-slate-200 rounded-xl overflow-hidden demo-container bg-slate-100"
		>
			{@render demo()}
		</div>
	</div>
</div>

<style>
	.demo-container > :global(*) {
		width: 100%;
		height: 100%;
	}

	/* Canvas fills container but preserves aspect ratio - no stretching */
	.demo-container :global(canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
		object-fit: contain;
	}

	/* Scrollable code with custom scrollbar */
	.code-scroll :global(pre) {
		margin: 0;
		max-height: 28rem;
		overflow-y: auto;
	}

	.code-scroll :global(pre::-webkit-scrollbar) {
		width: 6px;
	}

	.code-scroll :global(pre::-webkit-scrollbar-track) {
		background: transparent;
	}

	.code-scroll :global(pre::-webkit-scrollbar-thumb) {
		background: #334155;
		border-radius: 3px;
	}
</style>
