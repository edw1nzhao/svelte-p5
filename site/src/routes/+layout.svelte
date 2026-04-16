<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import Nav from '$lib/components/Nav.svelte';
	import FeedbackButton from '$lib/components/FeedbackButton.svelte';

	let { children }: { children: Snippet } = $props();

	/**
	 * SvelteKit's default scroll-to-top inherits the document's
	 * `scroll-behavior: smooth`, which makes navigation feel sluggish on long
	 * pages. Force an instant jump by toggling the property around the navigation,
	 * leaving smooth scrolling intact for in-page anchor links.
	 */
	beforeNavigate(({ to, from }) => {
		if (typeof document === 'undefined') return;
		// Only kill smooth-scroll for actual page changes (not hash-only navigation)
		if (to && from && to.url.pathname === from.url.pathname) return;
		document.documentElement.style.scrollBehavior = 'auto';
	});

	afterNavigate(({ to, from }) => {
		if (typeof window === 'undefined') return;
		const isHashOnly = to && from && to.url.pathname === from.url.pathname;
		if (!isHashOnly) {
			window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
		}
		// Restore the CSS smooth-scroll for subsequent in-page anchor jumps
		requestAnimationFrame(() => {
			document.documentElement.style.scrollBehavior = '';
		});
	});
</script>

<Nav />

{@render children()}

<FeedbackButton />
