<script lang="ts">
	import { Edit, ExternalLink, ArrowLeft, ArrowRight } from '@lucide/svelte';
	import DocToc from '$lib/docs/DocToc.svelte';
	import DocCopyButtons from '$lib/docs/DocCopyButtons.svelte';
	import CopyForAI from '$lib/docs/CopyForAI.svelte';
	import PerfCharts from '$lib/charts/PerfCharts.svelte';
	import { staggerFadeUp } from '$lib/animations';
	import { onMount } from 'svelte';

	let { data } = $props();

	let header: HTMLElement | null = $state(null);
	onMount(() => {
		staggerFadeUp(header, '[data-anim]', { staggerMs: 60, startDelay: 30 });
	});
</script>

<svelte:head>
	<title>{data.doc.title} - svelte-p5 docs</title>
	{#if data.doc.description}
		<meta name="description" content={data.doc.description} />
	{/if}
</svelte:head>

<div class="lg:grid lg:grid-cols-[1fr_14rem] lg:gap-10">
	<article class="min-w-0">
		<header bind:this={header} class="mb-6 sm:mb-8">
			<div data-anim class="flex items-start justify-between gap-4 mb-2">
				<h1
					class="font-bold text-slate-900 tracking-tight min-w-0 flex-1"
					style="font-size: clamp(1.75rem, 1.5rem + 1.5vw, 2.5rem); text-wrap: balance;"
				>
					{data.doc.title}
				</h1>
				<div class="shrink-0 pt-1">
					<CopyForAI
						title={data.doc.title}
						slug={data.doc.slug}
						source={data.source}
						viewUrl={data.viewUrl}
					/>
				</div>
			</div>
			{#if data.doc.description}
				<p data-anim class="text-base text-slate-500" style="text-wrap: pretty;">
					{data.doc.description}
				</p>
			{/if}
		</header>

		<!-- Charts at a glance, above the prose -->
		<PerfCharts results={data.results} />

		<DocCopyButtons html={data.html} />

		<!-- Edit & view links -->
		<div class="mt-12 pt-6 border-t border-slate-200 flex flex-wrap gap-3">
			<a
				href={data.editUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 no-underline"
			>
				<Edit class="size-4" />
				Edit this page on GitHub
			</a>
			<a
				href={data.viewUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 no-underline"
			>
				<ExternalLink class="size-4" />
				View source ({data.doc.file})
			</a>
		</div>

		{#if data.prev || data.next}
			<nav class="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Doc pagination">
				{#if data.prev}
					<a
						href={`/docs/${data.prev.slug}`}
						class="group p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors no-underline"
					>
						<div class="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
							<ArrowLeft class="size-3" />
							Previous
						</div>
						<div class="text-sm font-medium text-slate-900">{data.prev.title}</div>
					</a>
				{:else}
					<div></div>
				{/if}
				{#if data.next}
					<a
						href={`/docs/${data.next.slug}`}
						class="group p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors no-underline text-right"
					>
						<div
							class="flex items-center justify-end gap-2 text-xs font-medium text-slate-400 mb-1"
						>
							Next
							<ArrowRight class="size-3" />
						</div>
						<div class="text-sm font-medium text-slate-900">{data.next.title}</div>
					</a>
				{/if}
			</nav>
		{/if}
	</article>

	<aside
		class="hidden lg:block sticky overflow-y-auto py-2"
		style="top: calc(var(--header-h) + 2rem); max-height: calc(100dvh - var(--header-h) - 2rem);"
	>
		<DocToc toc={data.toc} />
	</aside>
</div>
