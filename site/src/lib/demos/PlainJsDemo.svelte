<script lang="ts">
	import { whenVisible } from '$lib/whenVisible.svelte';

	// The example file itself, verbatim — one source of truth, so the demo
	// can't drift from the file readers are told to download.
	import plainHtml from '../../../../docs/examples/00-plain-js/index.html?raw';

	const SOURCE_URL =
		'https://github.com/edw1nzhao/svelte-p5/blob/main/docs/examples/00-plain-js/index.html';

	let container: HTMLElement | null = $state(null);
	let srcdoc = $state('');

	// The iframe pulls p5 from a CDN, so don't pay for it until it's on screen.
	$effect(() => {
		if (!container) return;
		return whenVisible(container, () => {
			srcdoc = plainHtml;
		});
	});
</script>

<figure bind:this={container} class="plain-js-demo">
	<div class="frame">
		{#if srcdoc}
			<iframe {srcdoc} title="A p5 sketch running with no build step" sandbox="allow-scripts"
			></iframe>
		{:else}
			<div class="placeholder">Loading the example…</div>
		{/if}
	</div>
	<figcaption>
		Running live: <code>docs/examples/00-plain-js/index.html</code>, unmodified. One script tag from
		a CDN, no npm and no bundler —
		<a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">read the file</a>.
	</figcaption>
</figure>

<style>
	.plain-js-demo {
		margin: 0 0 2rem;
	}
	.frame {
		border: 1px solid rgb(226 232 240);
		border-radius: 0.5rem;
		overflow: hidden;
		background: rgb(248 250 252);
	}
	iframe {
		display: block;
		width: 100%;
		height: 22rem;
		border: 0;
	}
	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 22rem;
		font-size: 0.875rem;
		color: rgb(100 116 139);
	}
	figcaption {
		margin-top: 0.625rem;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: rgb(100 116 139);
		text-wrap: pretty;
	}
	figcaption code {
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}
</style>
