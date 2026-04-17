<script lang="ts">
	import HeroSketch from '$lib/demos/HeroSketch.svelte';
	import CopyButton from './CopyButton.svelte';
	import Badges from './Badges.svelte';
	import BunIcon from './icons/BunIcon.svelte';
	import PnpmIcon from './icons/PnpmIcon.svelte';
	import NpmIcon from './icons/NpmIcon.svelte';
	import type { Component } from 'svelte';
	import { onMount } from 'svelte';
	import { staggerFadeUp } from '$lib/animations';
	import { preferences, type PkgManager } from '$lib/stores/preferences.svelte';

	type InstallSnippet = { raw: string; html: string };

	let {
		installPnpm,
		installNpm,
		installBun
	}: {
		installPnpm: InstallSnippet;
		installNpm: InstallSnippet;
		installBun: InstallSnippet;
	} = $props();

	const tabs: { id: PkgManager; label: string; icon: Component<{ class?: string }> }[] = [
		{ id: 'bun', label: 'bun', icon: BunIcon },
		{ id: 'pnpm', label: 'pnpm', icon: PnpmIcon },
		{ id: 'npm', label: 'npm', icon: NpmIcon }
	];

	let current = $derived.by(() => {
		const map: Record<PkgManager, InstallSnippet> = {
			pnpm: installPnpm,
			npm: installNpm,
			bun: installBun
		};
		return map[preferences.pkgManager];
	});

	let inner: HTMLDivElement | null = $state(null);
	onMount(() => {
		staggerFadeUp(inner, '[data-anim]', { staggerMs: 90, startDelay: 80 });
	});
</script>

<section
	class="relative min-h-[34rem] flex items-center justify-center overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-20 px-4 sm:px-6"
>
	<HeroSketch />
	<!-- Readability scrim -->
	<div
		aria-hidden="true"
		class="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-white/60 pointer-events-none"
	></div>

	<div bind:this={inner} class="relative z-10 text-center max-w-2xl">
		<h1
			data-anim
			class="font-bold leading-tight text-slate-900 tracking-tight mb-5"
			style="font-size: clamp(2rem, 1.5rem + 3vw, 3.25rem); text-wrap: balance;"
		>
			<span class="bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent"
				>p5 draws pixels.</span
			>
			<br />
			Svelte does everything else.
		</h1>
		<p
			data-anim
			class="leading-relaxed text-slate-600 mb-7 max-w-xl mx-auto"
			style="font-size: clamp(1rem, 0.95rem + 0.4vw, 1.125rem); text-wrap: pretty;"
		>
			A modern Svelte 5 toolkit for p5.js. Correct lifecycle management, reactive state bridging,
			and pre-built components for creative coding.
		</p>

		<div
			data-anim
			class="inline-flex flex-col bg-slate-900 rounded-xl overflow-hidden mb-6 max-w-full"
		>
			<div class="flex border-b border-slate-800" role="tablist" aria-label="Package manager">
				{#each tabs as tab (tab.id)}
					{@const Icon = tab.icon}
					{@const isActive = preferences.pkgManager === tab.id}
					<button
						type="button"
						role="tab"
						aria-selected={isActive}
						aria-label={tab.label}
						class="flex-1 min-h-10 px-4 border-none bg-transparent text-slate-300 font-mono text-xs font-medium cursor-pointer transition-colors duration-150 hover:text-white hover:bg-slate-800/50 inline-flex items-center justify-center gap-2"
						class:!text-white={isActive}
						class:!bg-slate-800={isActive}
						onclick={() => preferences.setPkgManager(tab.id)}
					>
						<Icon class="size-4 shrink-0" />
						<span>{tab.label}</span>
					</button>
				{/each}
			</div>
			<div class="flex items-center gap-2 py-2.5 pr-3 pl-4 sm:pl-5 overflow-hidden">
				<div class="font-mono text-sm install-code overflow-x-auto flex-1 min-w-0 install-stack">
					<!-- All three variants share one grid cell so the container sizes to
					     the widest. Only the active one is visible. -->
					{#each tabs as tab (tab.id)}
						{@const snippet =
							tab.id === 'bun' ? installBun : tab.id === 'pnpm' ? installPnpm : installNpm}
						<div
							class="install-variant"
							class:active={preferences.pkgManager === tab.id}
							aria-hidden={preferences.pkgManager !== tab.id}
						>
							{@html snippet.html}
						</div>
					{/each}
				</div>
				<CopyButton text={current.raw} />
			</div>
		</div>

		<div data-anim>
			<Badges />
		</div>

		<div data-anim class="flex flex-wrap justify-center gap-2 mt-6">
			{#each ['Svelte 5 runes', 'SSR safe', 'Tree-shakeable', 'TypeScript'] as badge (badge)}
				<span
					class="text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-500/8 text-indigo-500 border border-indigo-500/15"
					>{badge}</span
				>
			{/each}
		</div>
	</div>
</section>

<style>
	.install-code :global(pre) {
		margin: 0;
		padding: 0 !important;
		background: transparent !important;
		white-space: pre;
	}
	/* Stack all install variants into one grid cell so the container width
	   is fixed to the widest snippet (no jitter on tab switch). */
	.install-stack {
		display: grid;
	}
	.install-variant {
		grid-area: 1 / 1;
		visibility: hidden;
	}
	.install-variant.active {
		visibility: visible;
	}
</style>
