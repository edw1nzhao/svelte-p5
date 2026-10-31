<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';

	// Built by `pagefind` after `vite build`, so neither exists under `vite dev` or at prerender.
	const UI_SCRIPT = '/pagefind/pagefind-component-ui.js';
	const UI_STYLES = '/pagefind/pagefind-component-ui.css';
	const narrow = new MediaQuery('max-width: 767px');

	onMount(() => {
		if (!document.querySelector(`link[href="${UI_STYLES}"]`)) {
			const link = Object.assign(document.createElement('link'), {
				rel: 'stylesheet',
				href: UI_STYLES
			});
			document.head.append(link);
		}
		import(/* @vite-ignore */ UI_SCRIPT).catch(() => {});
	});
</script>

<div class="site-search">
	<pagefind-modal-trigger
		hide-shortcut
		placeholder="Search docs"
		compact={narrow.current || undefined}
	></pagefind-modal-trigger>
	<pagefind-modal reset-on-close></pagefind-modal>
</div>

<style>
	.site-search {
		--pf-font: var(--font-sans);
		--pf-outline-focus: rgb(79 70 229);
	}
	.site-search :global(pagefind-modal-trigger:not(:defined)) {
		visibility: hidden;
	}
</style>
