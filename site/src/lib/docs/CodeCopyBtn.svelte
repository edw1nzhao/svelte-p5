<script lang="ts">
	import { Copy, Check } from '@lucide/svelte';

	let { source }: { source: string } = $props();

	let copied = $state(false);
	let timeout: ReturnType<typeof setTimeout> | null = null;

	function copy() {
		navigator.clipboard
			.writeText(source)
			.then(() => {
				copied = true;
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(() => (copied = false), 1800);
			})
			.catch(() => {
				/* user denied or insecure context */
			});
	}
</script>

<button
	type="button"
	onclick={copy}
	title="Copy to clipboard"
	aria-label={copied ? 'Copied' : 'Copy code to clipboard'}
	class="code-copy-btn"
>
	{#if copied}
		<Check class="size-4" />
	{:else}
		<Copy class="size-4" />
	{/if}
</button>

<style>
	.code-copy-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		min-width: 2rem;
		min-height: 2rem;
		border: 0;
		border-radius: 0.375rem;
		background: rgb(30 41 59 / 0.6);
		color: rgb(203 213 225);
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 150ms,
			background 150ms,
			color 150ms;
	}
	:global(figure.code-block:hover) .code-copy-btn,
	:global(figure.code-block:focus-within) .code-copy-btn {
		opacity: 1;
	}
	.code-copy-btn:hover {
		background: rgb(51 65 85 / 0.9);
		color: white;
	}
	@media (hover: none) {
		.code-copy-btn {
			opacity: 1;
		}
	}
</style>
