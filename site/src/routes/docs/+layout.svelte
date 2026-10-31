<script lang="ts">
	import { Menu, X, BookOpen } from '@lucide/svelte';
	import DocSidebar from '#lib/docs/DocSidebar.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	let drawerEl: HTMLDialogElement | null = $state(null);

	function openDrawer() {
		drawerEl?.showModal();
	}
	function closeDrawer() {
		drawerEl?.close();
	}
	function onBackdropClick(e: MouseEvent) {
		if (e.target === drawerEl) closeDrawer();
	}
</script>

<div class="docs-root bg-page" style="padding-top: var(--header-h);">
	<!-- Mobile sidebar trigger -->
	<div
		class="lg:hidden sticky z-30 bg-page/85 backdrop-blur-md border-b border-line"
		style="top: var(--header-h);"
	>
		<div class="px-4 sm:px-6 h-12 flex items-center gap-2">
			<button
				type="button"
				onclick={openDrawer}
				class="inline-flex items-center gap-2 h-9 px-3 -ml-2 rounded-md text-sm font-medium text-fg-secondary hover:bg-panel-2"
			>
				<Menu class="size-4" />
				Docs menu
			</button>
		</div>
	</div>

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10">
		<!-- Desktop sidebar -->
		<aside
			class="hidden lg:block sticky overflow-y-auto py-10 pr-4"
			style="top: var(--header-h); height: calc(100dvh - var(--header-h));"
		>
			<DocSidebar />
		</aside>

		<main id="main" class="min-w-0 py-8 lg:py-12">
			{@render children()}
		</main>
	</div>
</div>

<!-- Mobile sidebar drawer -->
<dialog
	bind:this={drawerEl}
	onclick={onBackdropClick}
	class="sheet lg:hidden"
	aria-label="Documentation menu"
>
	<div
		class="bg-page text-fg w-full sm:w-80 sm:rounded-2xl sm:m-4 overflow-hidden flex flex-col"
		style="padding-bottom: max(1rem, env(safe-area-inset-bottom)); max-height: 85dvh;"
	>
		<div
			class="flex items-center justify-between px-5 py-3 border-b border-line-soft shrink-0"
			style="padding-top: max(0.75rem, env(safe-area-inset-top));"
		>
			<div class="flex items-center gap-2">
				<BookOpen class="size-5 text-fg-secondary" />
				<span class="font-semibold text-base text-fg">Documentation</span>
			</div>
			<button
				type="button"
				onclick={closeDrawer}
				class="inline-flex items-center justify-center size-11 rounded-md text-fg-secondary hover:bg-panel-2"
				aria-label="Close menu"
			>
				<X class="size-5" />
			</button>
		</div>
		<div class="overflow-y-auto p-3 flex-1">
			<DocSidebar onLinkClick={closeDrawer} />
		</div>
	</div>
</dialog>

<style>
	/* Anchor jumps on docs pages must clear nav + the mobile sticky docs bar */
	@media (max-width: 1023px) {
		.docs-root {
			--anchor-offset: calc(var(--header-h) + 3rem);
		}
	}
</style>
