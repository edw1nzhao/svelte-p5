<script lang="ts">
	import { Edit, ExternalLink, ArrowLeft, ArrowRight } from '@lucide/svelte';
	import DocToc from '$lib/docs/DocToc.svelte';
	import DocCopyButtons from '$lib/docs/DocCopyButtons.svelte';
	import CopyForAI from '$lib/docs/CopyForAI.svelte';
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

		<!-- Prev / Next -->
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

	<!-- TOC: only on lg+ screens -->
	<aside
		class="hidden lg:block sticky overflow-y-auto py-2"
		style="top: calc(var(--header-h) + 2rem); max-height: calc(100dvh - var(--header-h) - 2rem);"
	>
		<DocToc toc={data.toc} />
	</aside>
</div>

<style>
	/* Heading anchor: positioned absolute so heading text starts at the
	   document's left margin (no shift). On screens narrow enough that
	   we don't have a left gutter, hide the anchor entirely (the heading
	   itself remains a tap target via its `id` for direct linking). */
	:global(.prose-doc h2.heading-anchor),
	:global(.prose-doc h3.heading-anchor) {
		position: relative;
	}
	:global(.prose-doc h2 .anchor),
	:global(.prose-doc h3 .anchor) {
		position: absolute;
		left: -1.25rem;
		top: 0;
		bottom: 0;
		display: inline-flex;
		align-items: center;
		color: rgb(203 213 225);
		text-decoration: none;
		font-weight: 400;
		opacity: 0;
		transition: opacity 150ms;
		padding-right: 0.25rem;
	}
	:global(.prose-doc h2:hover .anchor),
	:global(.prose-doc h3:hover .anchor),
	:global(.prose-doc h2 .anchor:focus),
	:global(.prose-doc h3 .anchor:focus) {
		opacity: 1;
		color: rgb(99 102 241);
	}
	@media (max-width: 767px) {
		:global(.prose-doc h2 .anchor),
		:global(.prose-doc h3 .anchor) {
			display: none;
		}
	}

	/* Code blocks wrapped in figure for the copy-button overlay */
	:global(.prose-doc figure.code-block) {
		position: relative;
		margin: 1.25rem 0;
	}
	:global(.prose-doc figure.code-block .code-lang) {
		position: absolute;
		top: 0.5rem;
		left: 1rem;
		z-index: 1;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 500;
		color: rgb(100 116 139);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		pointer-events: none;
	}
	:global(.prose-doc figure.code-block pre.shiki) {
		margin: 0;
		padding-top: 2rem;
	}

	/* p5 reference autolinks: subtle dotted underline */
	:global(.prose-doc a.p5-ref) {
		text-decoration: underline dotted;
		text-decoration-color: rgb(199 210 254);
		text-underline-offset: 3px;
	}

	/* Prose styles tuned for docs */
	:global(.prose-doc h2) {
		font-size: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
		font-weight: 700;
		color: rgb(15 23 42);
		margin-top: 2.5rem;
		margin-bottom: 0.75rem;
		letter-spacing: -0.01em;
	}
	:global(.prose-doc h3) {
		font-size: clamp(1.0625rem, 1rem + 0.3vw, 1.25rem);
		font-weight: 600;
		color: rgb(15 23 42);
		margin-top: 2rem;
		margin-bottom: 0.5rem;
	}
	:global(.prose-doc p),
	:global(.prose-doc li) {
		color: rgb(51 65 85);
		line-height: 1.7;
		margin-bottom: 1rem;
	}
	:global(.prose-doc ul),
	:global(.prose-doc ol) {
		padding-left: 1.5rem;
		margin-bottom: 1.25rem;
	}
	:global(.prose-doc ul) {
		list-style: disc;
	}
	:global(.prose-doc ol) {
		list-style: decimal;
	}
	:global(.prose-doc li) {
		margin-bottom: 0.375rem;
	}
	:global(.prose-doc a) {
		color: rgb(99 102 241);
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-thickness: 1px;
		text-decoration-color: rgb(199 210 254);
	}
	:global(.prose-doc a:hover) {
		text-decoration-color: rgb(99 102 241);
	}
	:global(.prose-doc :not(pre) > code) {
		font-family: var(--font-mono);
		font-size: 0.875em;
		background: rgb(238 242 255);
		color: rgb(67 56 202);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		word-break: break-word;
	}
	:global(.prose-doc :not(pre) > code a) {
		color: inherit;
	}
	:global(.prose-doc pre.shiki) {
		border: 1px solid rgb(30 41 59);
	}
	:global(.prose-doc blockquote) {
		border-left: 3px solid rgb(199 210 254);
		padding-left: 1rem;
		margin: 1.25rem 0;
		color: rgb(71 85 105);
		font-style: italic;
	}
	:global(.prose-doc table) {
		display: block;
		width: 100%;
		max-width: 100%;
		overflow-x: auto;
		border-collapse: collapse;
		margin: 1.25rem 0;
		font-size: 0.875rem;
		-webkit-overflow-scrolling: touch;
	}
	:global(.prose-doc th),
	:global(.prose-doc td) {
		border: 1px solid rgb(226 232 240);
		padding: 0.5rem 0.75rem;
		text-align: left;
		vertical-align: top;
	}
	:global(.prose-doc th) {
		background: rgb(248 250 252);
		font-weight: 600;
		color: rgb(15 23 42);
	}
	:global(.prose-doc hr) {
		border: 0;
		border-top: 1px solid rgb(226 232 240);
		margin: 2rem 0;
	}
</style>
