<script lang="ts">
	import { Sparkles, Check } from '@lucide/svelte';

	let {
		title,
		slug,
		source,
		viewUrl
	}: {
		title: string;
		slug: string;
		source: string;
		viewUrl: string;
	} = $props();

	let copied = $state(false);
	let timeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Wrap the raw markdown with a small header so when the user pastes into
	 * an LLM, the model knows what it's looking at and where it came from.
	 */
	let payload = $derived(
		[
			`# ${title}`,
			'',
			`Source: svelte-p5 documentation, ${slug}`,
			`Repository: https://github.com/edw1nzhao/svelte-p5`,
			`URL: ${viewUrl}`,
			'',
			'---',
			'',
			source
		].join('\n')
	);

	function copy() {
		navigator.clipboard
			.writeText(payload)
			.then(() => {
				copied = true;
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(() => (copied = false), 2000);
			})
			.catch(() => {});
	}
</script>

<button
	type="button"
	onclick={copy}
	title="Copy this entire page as markdown for pasting into an LLM"
	aria-label={copied ? 'Copied for AI' : 'Copy this page for an LLM'}
	class="inline-flex items-center gap-1.5 sm:gap-2 h-10 px-2.5 sm:px-3 rounded-md text-xs sm:text-sm font-medium border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap"
>
	{#if copied}
		<Check class="size-4 text-emerald-500" />
		<span class="hidden sm:inline">Copied for AI</span>
		<span class="sm:hidden">Copied</span>
	{:else}
		<Sparkles class="size-4 text-indigo-500" />
		<span class="hidden sm:inline">Copy for AI</span>
		<span class="sm:hidden">AI</span>
	{/if}
</button>
