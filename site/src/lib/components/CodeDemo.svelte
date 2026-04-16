<script lang="ts">
	import CopyButton from './CopyButton.svelte';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { staggerFadeUp } from '$lib/animations';
	import { whenVisible } from '$lib/whenVisible.svelte';
	import { preferences, type CodeLang } from '$lib/stores/preferences.svelte';

	type RenderedCode = { raw: string; html: string };

	let {
		title,
		description,
		code,
		demo
	}: {
		title: string;
		description: string;
		code: { ts: RenderedCode; js: RenderedCode };
		demo: Snippet;
	} = $props();

	const langs: { id: CodeLang; label: string }[] = [
		{ id: 'ts', label: 'TS' },
		{ id: 'js', label: 'JS' }
	];

	let current = $derived(code[preferences.codeLang]);

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
			<div class="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-800">
				<div class="flex items-center gap-3 min-w-0">
					<span
						class="font-mono text-[0.6875rem] font-medium text-slate-500 uppercase tracking-wider"
						>Svelte</span
					>
					<div
						class="inline-flex rounded-md overflow-hidden border border-slate-700/60"
						role="tablist"
						aria-label="Code language"
					>
						{#each langs as lang (lang.id)}
							{@const isActive = preferences.codeLang === lang.id}
							<button
								type="button"
								role="tab"
								aria-selected={isActive}
								class="lang-tab"
								class:active={isActive}
								onclick={() => preferences.setCodeLang(lang.id)}
							>
								{lang.label}
							</button>
						{/each}
					</div>
				</div>
				<CopyButton text={current.raw} />
			</div>
			<div class="code-scroll">
				{#each langs as lang (lang.id)}
					<div class="code-variant" class:active={preferences.codeLang === lang.id}>
						{#if lang.id === 'ts'}
							{@html code.ts.html}
						{:else}
							{@html code.js.html}
						{/if}
					</div>
				{/each}
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

	/* Show only the active language variant. Height adjusts naturally —
	   stacking would waste vertical space since TS/JS differ in line count. */
	.code-variant {
		display: none;
	}
	.code-variant.active {
		display: block;
	}

	/* TS/JS toggle pills */
	.lang-tab {
		padding: 0.1rem 0.55rem;
		border: 0;
		background: transparent;
		color: rgb(148 163 184);
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition:
			color 150ms,
			background 150ms;
	}
	.lang-tab:hover {
		color: rgb(226 232 240);
		background: rgb(30 41 59 / 0.6);
	}
	.lang-tab.active {
		color: white;
		background: rgb(30 41 59);
	}
</style>
