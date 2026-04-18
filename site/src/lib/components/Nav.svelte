<script lang="ts">
	import { Menu, X, Package, BookOpen, FlaskConical, ChevronDown } from '@lucide/svelte';
	import GithubIcon from './icons/GithubIcon.svelte';
	import Logo from './Logo.svelte';
	import { page } from '$app/state';

	let scrolled = $state(false);
	let drawerEl: HTMLDialogElement | null = $state(null);
	let packagesOpen = $state(false);
	let packagesContainer: HTMLDivElement | null = $state(null);

	function handleScroll() {
		scrolled = window.scrollY > 10;
	}

	function openDrawer() {
		drawerEl?.showModal();
	}

	function closeDrawer() {
		drawerEl?.close();
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === drawerEl) closeDrawer();
	}

	const internalLinks = [
		{ href: '/docs', label: 'Docs', icon: BookOpen },
		{ href: '/#examples', label: 'Examples', icon: FlaskConical }
	];

	// Single source of truth for the packages list. Used by the desktop
	// Packages dropdown AND the mobile drawer's externalLinks — both
	// render from this array so adding a fourth package is a one-line change.
	const packages = [
		{
			href: 'https://www.npmjs.com/package/svelte-p5',
			name: 'svelte-p5',
			label: 'core',
			description: 'Primitives: <P5Canvas>, createP5Bridge'
		},
		{
			href: 'https://www.npmjs.com/package/svelte-p5-components',
			name: 'svelte-p5-components',
			label: 'components',
			description: 'Sketch, FPSMonitor, DraggableWindow'
		},
		{
			href: 'https://www.npmjs.com/package/svelte-p5-viz',
			name: 'svelte-p5-viz',
			label: 'viz',
			description: 'Panel contract, registry, scenes'
		}
	];

	const externalLinks = [
		...packages.map((p) => ({
			href: p.href,
			label: p.name,
			sub: 'npm',
			icon: Package
		})),
		{
			href: 'https://github.com/edw1nzhao/svelte-p5',
			label: 'GitHub',
			sub: 'edw1nzhao/svelte-p5',
			icon: GithubIcon
		}
	];

	let isDocs = $derived(page.url.pathname.startsWith('/docs'));

	// Click-outside + Escape dismiss for the Packages dropdown. Only attached
	// while the menu is open so we don't burn listeners in the common state.
	$effect(() => {
		if (!packagesOpen) return;
		function onPointerDown(e: MouseEvent) {
			if (packagesContainer && !packagesContainer.contains(e.target as Node)) {
				packagesOpen = false;
			}
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') packagesOpen = false;
		}
		document.addEventListener('mousedown', onPointerDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onPointerDown);
			document.removeEventListener('keydown', onKey);
		};
	});

	// Hover-open for the Packages dropdown. A short close delay gives the
	// cursor time to traverse the small gap between button and menu without
	// the menu snapping shut. Touch/click toggling still works (handled
	// inline on the button) for platforms without a reliable hover state.
	let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;
	function openPackages() {
		if (hoverCloseTimer) {
			clearTimeout(hoverCloseTimer);
			hoverCloseTimer = null;
		}
		packagesOpen = true;
	}
	function schedulePackagesClose() {
		if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
		hoverCloseTimer = setTimeout(() => {
			packagesOpen = false;
			hoverCloseTimer = null;
		}, 140);
	}
</script>

<svelte:window onscroll={handleScroll} />

<!-- Scroll progress bar: scroll-driven CSS animation (graceful no-op on
     browsers without animation-timeline support). Renders just under the
     sticky nav — skinny, accent-colored, non-interactive. -->
<div class="scroll-progress" aria-hidden="true"></div>

<nav
	class="site-header fixed top-0 inset-x-0 z-40 transition-all duration-200 border-b"
	class:bg-white={scrolled || isDocs}
	class:backdrop-blur-xl={scrolled || isDocs}
	class:border-slate-200={scrolled || isDocs}
	class:border-transparent={!scrolled && !isDocs}
	style="padding-top: env(safe-area-inset-top); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);"
>
	<div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
		<a href="/" class="flex items-center gap-2.5 no-underline min-h-11" aria-label="svelte-p5 home">
			<Logo class="size-8" wink={!isDocs} />
			<span class="font-mono font-semibold text-lg text-slate-900">svelte-p5</span>
		</a>

		<!-- Desktop nav -->
		<div class="hidden md:flex items-center gap-1">
			{#each internalLinks as link (link.href)}
				<a
					href={link.href}
					class="px-3 h-10 inline-flex items-center text-sm font-medium text-slate-600 no-underline transition-colors hover:text-slate-900 rounded-md hover:bg-slate-100"
				>
					{link.label}
				</a>
			{/each}

			<div class="w-px h-6 bg-slate-200 mx-2"></div>

			<!-- Packages dropdown: one button replaces three inline pills so the
			     nav scales as we add packages without burning horizontal space.
			     Opens on hover (cursor crossing the 4px gap is covered by the
			     140ms close timer) and on click (for touch + keyboard). Dismissed
			     by outside click, Escape, or cursor leaving the container. Each
			     link also closes the menu on click so the next open is fresh. -->
			<!-- role="none" marks the wrapper as presentational: the button child
			     carries all interaction semantics; the wrapper's only job is to
			     host the hover zone for the dropdown bridge. -->
			<div
				bind:this={packagesContainer}
				role="none"
				class="relative"
				onmouseenter={openPackages}
				onmouseleave={schedulePackagesClose}
			>
				<button
					type="button"
					onclick={() => (packagesOpen = !packagesOpen)}
					onfocus={openPackages}
					aria-expanded={packagesOpen}
					aria-haspopup="menu"
					class="px-3 h-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 rounded-md hover:bg-slate-100"
				>
					<Package class="size-4" />
					Packages
					<ChevronDown
						class="size-3.5 transition-transform duration-150 {packagesOpen ? 'rotate-180' : ''}"
					/>
				</button>

				{#if packagesOpen}
					<div role="menu" class="absolute top-full right-0 pt-1 min-w-[16rem] z-50">
						<!-- Inner card with the visible styling; outer div provides the
						     4px hover bridge (pt-1) so the mouse can cross from button
						     to menu without triggering mouseleave on the wrapper. -->
						<!-- menu-popover class wires up the CSS `@starting-style` fade +
						     translate-up entry so the dropdown eases in instead of
						     popping. Zero JS, zero library cost. -->
						<div class="menu-popover rounded-md border border-slate-200 bg-white shadow-lg py-1">
							{#each packages as pkg (pkg.href)}
								<a
									role="menuitem"
									href={pkg.href}
									target="_blank"
									rel="noopener noreferrer"
									onclick={() => (packagesOpen = false)}
									class="flex items-start gap-3 px-3 py-2.5 no-underline transition-colors duration-150 hover:bg-slate-50"
								>
									<Package class="size-4 text-slate-400 mt-0.5 shrink-0" />
									<div class="flex flex-col leading-tight">
										<span class="font-mono text-sm font-medium text-slate-900">{pkg.name}</span>
										<span class="text-xs text-slate-500 mt-0.5">{pkg.description}</span>
									</div>
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<a
				href="https://github.com/edw1nzhao/svelte-p5"
				target="_blank"
				rel="noopener noreferrer"
				class="size-10 inline-flex items-center justify-center text-slate-600 no-underline transition-colors hover:text-slate-900 rounded-md hover:bg-slate-100"
				aria-label="GitHub repository"
			>
				<GithubIcon class="size-5" />
			</a>
		</div>

		<!-- Mobile trigger -->
		<button
			type="button"
			onclick={openDrawer}
			class="md:hidden inline-flex items-center justify-center size-11 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
			aria-label="Open menu"
		>
			<Menu class="size-6" />
		</button>
	</div>
</nav>

<!-- Mobile drawer (native dialog) -->
<dialog
	bind:this={drawerEl}
	onclick={onBackdropClick}
	class="sheet md:hidden"
	aria-label="Mobile navigation"
>
	<div
		class="bg-white text-slate-900 w-full sm:w-80 sm:rounded-2xl sm:m-4 overflow-hidden"
		style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom));"
	>
		<div
			class="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100"
			style="padding-top: max(0.75rem, env(safe-area-inset-top));"
		>
			<div class="flex items-center gap-2">
				<Logo class="size-7" />
				<span class="font-mono font-semibold text-base text-slate-900">svelte-p5</span>
			</div>
			<button
				type="button"
				onclick={closeDrawer}
				class="inline-flex items-center justify-center size-11 rounded-md text-slate-700 hover:bg-slate-100"
				aria-label="Close menu"
			>
				<X class="size-5" />
			</button>
		</div>

		<nav class="p-2">
			{#each internalLinks as link (link.href)}
				{@const Icon = link.icon}
				<a
					href={link.href}
					onclick={closeDrawer}
					class="flex items-center gap-3 px-4 min-h-12 rounded-lg text-slate-700 hover:bg-slate-100 no-underline text-base font-medium"
				>
					<Icon class="size-5 text-slate-400" />
					{link.label}
				</a>
			{/each}

			<div class="my-2 border-t border-slate-100"></div>

			{#each externalLinks as link (link.href)}
				{@const Icon = link.icon}
				<a
					href={link.href}
					target="_blank"
					rel="noopener noreferrer"
					onclick={closeDrawer}
					class="flex items-center gap-3 px-4 min-h-12 rounded-lg text-slate-700 hover:bg-slate-100 no-underline"
				>
					<Icon class="size-5 text-slate-400" />
					<div class="flex flex-col leading-tight">
						<span class="text-base font-medium">{link.label}</span>
						<span class="text-xs text-slate-400 font-mono">{link.sub}</span>
					</div>
				</a>
			{/each}
		</nav>
	</div>
</dialog>
