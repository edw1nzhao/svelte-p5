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
	aria-label={copied ? 'Copied' : 'Copy to clipboard'}
	class="press flex items-center justify-center size-8 rounded-md border-none bg-transparent cursor-pointer hover:bg-white/10"
	class:text-emerald-300={copied}
	class:text-slate-400={!copied}
>
	{#if copied}
		<!-- Pop-in check: scale + opacity via @starting-style so the confirmation
		     feels punchier than a plain swap. Zero JS. -->
		<svg
			class="copy-check"
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
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

<style>
	.copy-check {
		transition:
			transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 120ms ease-out;
		transform: scale(1);
		opacity: 1;
	}
	@starting-style {
		.copy-check {
			transform: scale(0.4);
			opacity: 0;
		}
	}
</style>
