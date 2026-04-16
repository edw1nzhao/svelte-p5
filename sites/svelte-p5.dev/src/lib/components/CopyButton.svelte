<script lang="ts">
	let { text }: { text: string } = $props();

	let copied = $state(false);
	let timeout: ReturnType<typeof setTimeout>;

	function copy() {
		navigator.clipboard.writeText(text);
		copied = true;
		clearTimeout(timeout);
		timeout = setTimeout(() => (copied = false), 2000);
	}
</script>

<button
	onclick={copy}
	title="Copy to clipboard"
	class="flex items-center justify-center size-8 rounded-md border-none bg-transparent text-slate-400 cursor-pointer transition-all duration-150 hover:bg-white/10 hover:text-slate-200"
>
	{#if copied}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	{:else}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
			<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
		</svg>
	{/if}
</button>
