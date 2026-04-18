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

<!--
  Hero vertical sizing strategy:

  - Mobile: fixed `min-h-[42rem]` (~672px). Viewport-based units on mobile
    cause layout jumps when the URL bar collapses/expands; a rem value is
    stable and tall enough to feel substantial without overwhelming small
    screens.

  - sm+ (tablets and up): `sm:min-h-[85svh]`. The `svh` unit is the
    "small viewport height" — it pins to the viewport with collapsed
    browser chrome, so no reflow as the user scrolls. 85% leaves a
    sliver of the next section peeking so visitors know to keep scrolling
    (the "content is below" affordance top sites use).

  - Extra vertical padding (sm:pt-24 sm:pb-28) creates breathing room
    around the hero content so the taller section doesn't feel like
    a column of text stretched to fill empty space.
-->
<section
	class="relative min-h-[42rem] sm:min-h-[85svh] flex items-center justify-center overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6"
>
	<HeroSketch />
	<!-- Glassy readability backdrop. Tight radial ellipse behind the text
	     column with a sharp mask edge — fully opaque in the middle (crisp
	     glass), narrow transition band, transparent outside. Keeps the
	     animated dots fully sharp in the outer ⅔ of the hero while giving
	     the text a real frosted-glass backdrop instead of a flat white scrim. -->
	<div aria-hidden="true" class="hero-glass absolute inset-0 pointer-events-none"></div>

	<div bind:this={inner} class="relative z-10 text-center max-w-2xl">
		<h1
			data-anim
			class="font-bold leading-tight text-slate-900 tracking-tight mb-5"
			style="font-size: clamp(2rem, 1.5rem + 3vw, 3.25rem); text-wrap: balance;"
		>
			<span class="bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent"
				>Creative coding,</span
			>
			<br />
			reactively.
		</h1>
		<p
			data-anim
			class="leading-relaxed text-slate-600 mb-7 max-w-xl mx-auto"
			style="font-size: clamp(1rem, 0.95rem + 0.4vw, 1.125rem); text-wrap: pretty;"
		>
			A Svelte 5 toolkit for p5.js: clean lifecycles, a reactive <code
				class="font-mono text-[0.92em] text-indigo-600 bg-indigo-50/60 px-1.5 py-0.5 rounded"
				>$state</code
			> bridge between sketch and UI, and pre-built components. Pre-1.0 and evolving.
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

		<!-- Feature pills picked to carry weight for both primary audiences:
		     creative product devs (reactive bridge, HiDPI pain-point, lifecycle
		     correctness) and educators/learners (clean unmount for HMR-heavy
		     classrooms, Svelte 5 as the target stack). Previous pills
		     (SSR safe / Tree-shakeable / TypeScript) were bundler-centric and
		     didn't speak to the audience this library actually serves. -->
		<div data-anim class="flex flex-wrap justify-center gap-2 mt-6">
			{#each ['Reactive $state bridge', 'HiDPI + auto-resize', 'Clean unmount', 'Svelte 5 runes'] as badge (badge)}
				<span
					class="text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-500/8 text-indigo-500 border border-indigo-500/15"
					>{badge}</span
				>
			{/each}
		</div>
	</div>
</section>

<style>
	/* Hero glassy backdrop. Two stacked layers — a radial white tint and a
	   backdrop-filter blur — both shaped by the same radial mask so they
	   fade together.

	   Tuning notes from iteration:
	   - Ellipse is taller than wide (38% × 58%) because text column is
	     narrow vertically (h1 + paragraph + install widget + badges
	     stacks ~22rem) and the glass needs to cover all of it without
	     spilling into the outer thirds horizontally.
	   - Blur reduced to 6px (was 10px) so even the center doesn't feel
	     smeared, just softly frosted.
	   - Mask uses a LONG ease-out: opaque through 30% of the ellipse,
	     then fades gradually to transparent by 85%. That 55% transition
	     band makes the glass blend into the sketch instead of having a
	     visible hard edge — previous iteration's narrow 15% band felt
	     abrupt.
	   - Tint at 0.52 opacity carries text readability on its own, so the
	     blur is purely aesthetic — readers don't depend on it for contrast.

	   Webkit-prefixed variants for Safari support. Browsers without
	   backdrop-filter still get the tint, which alone keeps text readable. */
	.hero-glass {
		background: radial-gradient(
			ellipse 38% 72% at 50% 50%,
			rgb(255 255 255 / 0.52),
			rgb(255 255 255 / 0) 90%
		);
		backdrop-filter: blur(6px) saturate(1.15);
		-webkit-backdrop-filter: blur(6px) saturate(1.15);
		mask-image: radial-gradient(ellipse 38% 72% at 50% 50%, black 0%, black 30%, transparent 85%);
		-webkit-mask-image: radial-gradient(
			ellipse 38% 72% at 50% 50%,
			black 0%,
			black 30%,
			transparent 85%
		);
	}

	/* Reduced-motion: skip GPU-heavy backdrop-filter, keep the tint alone
	   so text readability is preserved without GPU compositing jitter. */
	@media (prefers-reduced-motion: reduce) {
		.hero-glass {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
	}

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
