<script lang="ts">
	import { docs, sections } from '#lib/docs/manifest.js';
	import { ArrowRight, BookOpen } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
</script>

<Seo
	title="Documentation - svelte-p5"
	description="Documentation for svelte-p5: Svelte 5 + p5.js integration toolkit."
/>

<div class="max-w-3xl">
	<header class="mb-10">
		<div
			class="inline-flex items-center justify-center size-12 rounded-xl bg-brand/10 text-brand mb-4"
		>
			<BookOpen class="size-6" />
		</div>
		<h1
			class="font-bold text-fg tracking-tight mb-3"
			style="font-size: clamp(1.75rem, 1.5rem + 1.5vw, 2.5rem); text-wrap: balance;"
		>
			Documentation
		</h1>
		<p class="text-base text-fg-subtle leading-relaxed" style="text-wrap: pretty;">
			Everything you need to use svelte-p5: install, three layers, recipes for common patterns, and
			migration from p5-svelte.
		</p>
	</header>

	{#each sections as section (section)}
		<section class="mb-10">
			<h2 class="text-lg font-semibold text-fg mb-3">{section}</h2>
			<ul class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{#each docs.filter((d) => d.section === section) as doc (doc.slug)}
					<li>
						<a
							href={`/docs/${doc.slug}`}
							class="group block p-4 rounded-lg border border-line hover:border-brand-line hover:bg-brand-soft/30 transition-colors no-underline h-full min-h-20"
						>
							<div class="flex items-start justify-between gap-2 mb-1">
								<span class="text-base font-semibold text-fg">{doc.title}</span>
								<ArrowRight
									class="size-4 text-fg-ghost group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
								/>
							</div>
							{#if doc.description}
								<p class="text-sm text-fg-subtle leading-snug">{doc.description}</p>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
