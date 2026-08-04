<script lang="ts">
	import { Copy, Check } from '@lucide/svelte';
	import { preferences, CODE_LANGS, type CodeLang } from '$lib/stores/preferences.svelte';

	let {
		figure,
		sources
	}: {
		figure: HTMLElement;
		sources: Record<CodeLang, string>;
	} = $props();

	const labels: Record<CodeLang, string> = { ts: 'TS', js: 'JS' };

	// Both variants are pre-rendered into the figure at build time; switching
	// languages just toggles which one is visible.
	$effect(() => {
		const active = preferences.codeLang;
		const blocks = figure.querySelectorAll<HTMLElement>('.lang-block');
		blocks.forEach((b) => {
			if (b.dataset.lang === active) b.removeAttribute('hidden');
			else b.setAttribute('hidden', '');
		});
	});

	let copied = $state(false);
	let timeout: ReturnType<typeof setTimeout> | null = null;
	function copy() {
		const src = sources[preferences.codeLang];
		navigator.clipboard
			.writeText(src)
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

<div class="lang-tabs-bar" role="tablist" aria-label="Code language">
	{#each CODE_LANGS as lang (lang)}
		{@const isActive = preferences.codeLang === lang}
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			aria-label={lang === 'ts' ? 'TypeScript' : 'JavaScript'}
			class="lang-tab"
			class:active={isActive}
			onclick={() => preferences.setCodeLang(lang)}
		>
			{labels[lang]}
		</button>
	{/each}
	<button
		type="button"
		onclick={copy}
		title="Copy to clipboard"
		aria-label={copied ? 'Copied' : 'Copy code to clipboard'}
		class="lang-copy"
	>
		{#if copied}
			<Check class="size-4" />
		{:else}
			<Copy class="size-4" />
		{/if}
	</button>
</div>

<style>
	.lang-tabs-bar {
		display: flex;
		align-items: stretch;
		background: rgb(15 23 42);
		border-bottom: 1px solid rgb(30 41 59);
		border-top-left-radius: 0.5rem;
		border-top-right-radius: 0.5rem;
	}
	.lang-tab {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.85rem;
		min-height: 2.25rem;
		border: 0;
		background: transparent;
		color: rgb(203 213 225);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			color 150ms,
			background 150ms;
	}
	.lang-tab:hover {
		color: white;
		background: rgb(30 41 59 / 0.6);
	}
	.lang-tab.active {
		color: white;
		background: rgb(30 41 59);
	}
	.lang-copy {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: auto;
		border: 0;
		background: transparent;
		color: rgb(203 213 225);
		cursor: pointer;
		transition:
			color 150ms,
			background 150ms;
	}
	.lang-copy:hover {
		color: white;
		background: rgb(30 41 59 / 0.6);
	}
</style>
