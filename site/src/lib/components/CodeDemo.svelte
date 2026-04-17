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
	let demoSlot: HTMLDivElement | null = $state(null);
	let demoVisible = $state(false);

	onMount(() => {
		whenVisible(root, (el) => {
			staggerFadeUp(el, '[data-anim]', { staggerMs: 90 });
		});

		// Mount the p5 sketch only once its slot is close to the viewport.
		// Larger rootMargin so the sketch is running by the time the user scrolls to it.
		whenVisible(
			demoSlot,
			() => {
				demoVisible = true;
			},
			{ rootMargin: '300px 0px', threshold: 0 }
		);
	});
</script>

<!--
  Grid layout on md+: 2 columns × 2 rows.
    row 1: [title + desc] | (empty)
    row 2: [code card]    | [demo]
  Row 2's height comes from the code card (demo is h-full, contributes no
  intrinsic height), so the demo aligns top+bottom with the card specifically
  — not with the full left column. Mobile collapses to a single column and
  the three cells (title, card, demo) stack in source order.
-->
<div
	bind:this={root}
	class="code-demo-root grid grid-cols-1 gap-8 md:grid-cols-2 md:grid-rows-[auto_auto] md:gap-x-8 md:gap-y-4"
>
	<!-- Row 1, col 1: title + description -->
	<div data-anim class="min-w-0 md:col-start-1 md:row-start-1">
		<h3 class="text-xl font-semibold text-slate-900 mb-1">{title}</h3>
		<p class="text-sm text-slate-500 leading-relaxed">{description}</p>
	</div>

	<!-- Row 2, col 1: code card -->
	<div
		data-anim
		class="min-w-0 md:col-start-1 md:row-start-2 border border-slate-800 rounded-xl overflow-hidden bg-[var(--color-code-bg)]"
	>
		<div class="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-800">
			<div class="flex items-center gap-3 min-w-0">
				<span class="font-mono text-[0.6875rem] font-medium text-slate-500 uppercase tracking-wider"
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

	<!-- Row 2, col 2: demo. md:row-start-2 keeps it out of row 1 so it
	     references only the code card's height, not title + card combined. -->
	<div data-anim class="flex md:col-start-2 md:row-start-2">
		<div
			bind:this={demoSlot}
			class="w-full h-full border border-slate-200 rounded-xl overflow-hidden demo-container bg-slate-100"
		>
			{#if demoVisible}
				{@render demo()}
			{:else}
				<div class="demo-placeholder" aria-hidden="true"></div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Skip rendering work for off-screen demos. The intrinsic-size hint matches
	   the typical rendered height so scrollbar position stays stable. */
	.code-demo-root {
		content-visibility: auto;
		contain-intrinsic-size: auto 480px;
	}

	.demo-container > :global(*) {
		width: 100%;
		height: 100%;
	}

	/* Reserve space for the sketch before it lazy-mounts so scrolling is stable. */
	.demo-placeholder {
		width: 100%;
		aspect-ratio: 4 / 3;
		background: repeating-linear-gradient(
			45deg,
			rgb(241 245 249),
			rgb(241 245 249) 12px,
			rgb(226 232 240) 12px,
			rgb(226 232 240) 24px
		);
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
