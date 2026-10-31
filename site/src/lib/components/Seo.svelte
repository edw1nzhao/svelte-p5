<script lang="ts">
	import { page } from '$app/state';

	const SITE = 'https://svelte-p5.dev';
	const FALLBACK =
		'A Svelte 5 toolkit for p5.js creative coding. Reactive $state bridge, clean lifecycles, HiDPI components. Successor to p5-svelte, built for Svelte 5 runes.';

	let { title, description }: { title: string; description?: string } = $props();

	const url = $derived(SITE + page.url.pathname);
	const desc = $derived(description || FALLBACK);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="svelte-p5" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={desc} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content="{SITE}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
