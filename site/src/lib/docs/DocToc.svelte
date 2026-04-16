<script lang="ts">
	import type { TocEntry } from './render';

	let { toc }: { toc: TocEntry[] } = $props();
</script>

{#if toc.length}
	<nav aria-label="On this page">
		<h3 class="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">On this page</h3>
		<ul class="flex flex-col gap-0.5 border-l border-slate-200">
			{#each toc as entry (entry.id)}
				<li>
					<a
						href={`#${entry.id}`}
						class="block py-1 text-sm text-slate-500 hover:text-slate-900 no-underline border-l-2 border-transparent hover:border-slate-300 -ml-px transition-colors"
						class:pl-3={entry.level === 2}
						class:pl-6={entry.level === 3}
					>
						{entry.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
