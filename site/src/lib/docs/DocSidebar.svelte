<script lang="ts">
	import { docs, sections } from './manifest';
	import { page } from '$app/state';

	let { onLinkClick }: { onLinkClick?: () => void } = $props();

	let currentSlug = $derived(page.url.pathname.replace(/^\/docs\/?/, ''));
</script>

<nav aria-label="Documentation">
	{#each sections as section (section)}
		<div class="mb-6 last:mb-0">
			<h3 class="px-3 text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1.5">
				{section}
			</h3>
			<ul class="flex flex-col">
				{#each docs.filter((d) => d.section === section) as doc (doc.slug)}
					<li>
						<a
							href={`/docs/${doc.slug}`}
							onclick={onLinkClick}
							class="block px-3 min-h-9 leading-9 text-sm rounded-md no-underline transition-colors"
							class:text-indigo-700={currentSlug === doc.slug}
							class:bg-indigo-500={false}
							class:bg-indigo-50={currentSlug === doc.slug}
							class:font-medium={currentSlug === doc.slug}
							class:text-slate-600={currentSlug !== doc.slug}
							aria-current={currentSlug === doc.slug ? 'page' : undefined}
						>
							{doc.title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>
