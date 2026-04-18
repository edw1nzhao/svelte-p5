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
							class="sidebar-link block px-3 min-h-9 leading-9 text-sm rounded-md no-underline"
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

<style>
	/* Smooth active-link transition: background + color shift together so
	   clicking a sibling feels like the highlight slides rather than hard-swaps.
	   Inset translate hint on hover gives a subtle "affordance". */
	.sidebar-link {
		transition:
			background-color 180ms cubic-bezier(0.4, 0, 0.2, 1),
			color 180ms cubic-bezier(0.4, 0, 0.2, 1),
			transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	.sidebar-link:hover:not([aria-current='page']) {
		background-color: rgb(241 245 249);
		color: rgb(15 23 42);
	}
	.sidebar-link:active {
		transform: translateX(1px);
	}
</style>
