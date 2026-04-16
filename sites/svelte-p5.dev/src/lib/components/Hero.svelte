<script lang="ts">
	import HeroSketch from '$lib/demos/HeroSketch.svelte';
	import CopyButton from './CopyButton.svelte';

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

	let active: 'bun' | 'pnpm' | 'npm' = $state('bun');

	const tabs = ['bun', 'pnpm', 'npm'] as const;

	let current = $derived(
		active === 'pnpm' ? installPnpm : active === 'npm' ? installNpm : installBun
	);
</script>

<section
	class="relative min-h-[34rem] flex items-center justify-center overflow-hidden pt-32 pb-20 px-6"
>
	<HeroSketch />
	<div class="relative z-10 text-center max-w-2xl">
		<h1 class="text-5xl font-bold leading-tight text-slate-900 tracking-tight mb-5 sm:text-3xl">
			<span class="bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent"
				>p5 draws pixels.</span
			>
			<br />
			Svelte does everything else.
		</h1>
		<p class="text-lg leading-relaxed text-slate-600 mb-8 max-w-xl mx-auto">
			A modern Svelte 5 toolkit for p5.js. Correct lifecycle management, reactive state bridging,
			and pre-built components for creative coding.
		</p>
		<div class="inline-flex flex-col bg-slate-900 rounded-xl overflow-hidden mb-8">
			<div class="flex border-b border-slate-800">
				{#each tabs as tab (tab)}
					<button
						class="flex-1 px-4 py-2 border-none bg-transparent text-slate-500 font-mono text-xs font-medium cursor-pointer transition-all duration-150 hover:text-slate-400"
						class:!text-slate-200={active === tab}
						class:!bg-slate-800={active === tab}
						onclick={() => (active = tab)}
					>
						{tab}
					</button>
				{/each}
			</div>
			<div class="flex items-center gap-2 py-2.5 pr-3 pl-5">
				<div class="font-mono text-sm install-code">
					{@html current.html}
				</div>
				<CopyButton text={current.raw} />
			</div>
		</div>
		<div class="flex flex-wrap justify-center gap-2">
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
	/* Override shiki's pre styling inside the install bar */
	.install-code :global(pre) {
		margin: 0;
		padding: 0 !important;
		background: transparent !important;
	}
</style>
