<script lang="ts">
	import { Copy, Check } from '@lucide/svelte';
	import BunIcon from '$lib/components/icons/BunIcon.svelte';
	import PnpmIcon from '$lib/components/icons/PnpmIcon.svelte';
	import NpmIcon from '$lib/components/icons/NpmIcon.svelte';
	import { preferences, type PkgManager } from '$lib/stores/preferences.svelte';
	import type { Component } from 'svelte';

	let {
		figure,
		sources
	}: {
		figure: HTMLElement;
		sources: Record<PkgManager, string>;
	} = $props();

	const tabs: { id: PkgManager; label: string; icon: Component<{ class?: string }> }[] = [
		{ id: 'bun', label: 'bun', icon: BunIcon },
		{ id: 'pnpm', label: 'pnpm', icon: PnpmIcon },
		{ id: 'npm', label: 'npm', icon: NpmIcon }
	];

	// Toggle visibility of pre-rendered .pm-block children whenever the
	// active package manager preference changes.
	$effect(() => {
		const active = preferences.pkgManager;
		const blocks = figure.querySelectorAll<HTMLElement>('.pm-block');
		blocks.forEach((b) => {
			if (b.dataset.pm === active) b.removeAttribute('hidden');
			else b.setAttribute('hidden', '');
		});
	});

	let copied = $state(false);
	let timeout: ReturnType<typeof setTimeout> | null = null;
	function copy() {
		const src = sources[preferences.pkgManager];
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

<div class="pm-tabs-bar" role="tablist" aria-label="Package manager">
	{#each tabs as tab (tab.id)}
		{@const Icon = tab.icon}
		{@const isActive = preferences.pkgManager === tab.id}
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			aria-label={tab.label}
			class="pm-tab"
			class:active={isActive}
			onclick={() => preferences.setPkgManager(tab.id)}
		>
			<Icon class="size-3.5 shrink-0" />
			<span>{tab.label}</span>
		</button>
	{/each}
	<button
		type="button"
		onclick={copy}
		title="Copy to clipboard"
		aria-label={copied ? 'Copied' : 'Copy code to clipboard'}
		class="pm-copy"
	>
		{#if copied}
			<Check class="size-4" />
		{:else}
			<Copy class="size-4" />
		{/if}
	</button>
</div>

<style>
	.pm-tabs-bar {
		display: flex;
		align-items: stretch;
		background: rgb(15 23 42);
		border-bottom: 1px solid rgb(30 41 59);
		border-top-left-radius: 0.5rem;
		border-top-right-radius: 0.5rem;
	}
	.pm-tab {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
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
	.pm-tab:hover {
		color: white;
		background: rgb(30 41 59 / 0.6);
	}
	.pm-tab.active {
		color: white;
		background: rgb(30 41 59);
	}
	.pm-copy {
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
	.pm-copy:hover {
		color: white;
		background: rgb(30 41 59 / 0.6);
	}
</style>
