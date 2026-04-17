<script lang="ts">
	import { Menu, X, Package, BookOpen, FlaskConical } from '@lucide/svelte';
	import GithubIcon from './icons/GithubIcon.svelte';
	import Logo from './Logo.svelte';
	import { page } from '$app/state';

	let scrolled = $state(false);
	let drawerEl: HTMLDialogElement | null = $state(null);

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

	const externalLinks = [
		{
			href: 'https://www.npmjs.com/package/svelte-p5',
			label: 'svelte-p5',
			sub: 'npm',
			icon: Package
		},
		{
			href: 'https://www.npmjs.com/package/svelte-p5-components',
			label: 'svelte-p5-components',
			sub: 'npm',
			icon: Package
		},
		{
			href: 'https://www.npmjs.com/package/svelte-p5-viz',
			label: 'svelte-p5-viz',
			sub: 'npm',
			icon: Package
		},
		{
			href: 'https://github.com/edw1nzhao/svelte-p5',
			label: 'GitHub',
			sub: 'edw1nzhao/svelte-p5',
			icon: GithubIcon
		}
	];

	let isDocs = $derived(page.url.pathname.startsWith('/docs'));
</script>

<svelte:window onscroll={handleScroll} />

<nav
	class="fixed top-0 inset-x-0 z-40 transition-all duration-200 border-b"
	class:bg-white={scrolled || isDocs}
	class:backdrop-blur-xl={scrolled || isDocs}
	class:border-slate-200={scrolled || isDocs}
	class:border-transparent={!scrolled && !isDocs}
	style="padding-top: env(safe-area-inset-top); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);"
>
	<div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
		<a href="/" class="flex items-center gap-2.5 no-underline min-h-11" aria-label="svelte-p5 home">
			<Logo class="size-8" />
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

			<a
				href="https://www.npmjs.com/package/svelte-p5"
				target="_blank"
				rel="noopener noreferrer"
				class="px-3 h-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 no-underline transition-colors hover:text-slate-900 rounded-md hover:bg-slate-100"
				title="svelte-p5 on npm"
			>
				<Package class="size-4" />
				core
			</a>
			<a
				href="https://www.npmjs.com/package/svelte-p5-components"
				target="_blank"
				rel="noopener noreferrer"
				class="px-3 h-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 no-underline transition-colors hover:text-slate-900 rounded-md hover:bg-slate-100"
				title="svelte-p5-components on npm"
			>
				<Package class="size-4" />
				components
			</a>
			<a
				href="https://www.npmjs.com/package/svelte-p5-viz"
				target="_blank"
				rel="noopener noreferrer"
				class="px-3 h-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 no-underline transition-colors hover:text-slate-900 rounded-md hover:bg-slate-100"
				title="svelte-p5-viz on npm"
			>
				<Package class="size-4" />
				viz
			</a>
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
