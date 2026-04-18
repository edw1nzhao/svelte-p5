<script lang="ts">
	import { Sparkles, Check } from '@lucide/svelte';

	let {
		title,
		slug,
		source,
		viewUrl
	}: {
		title: string;
		slug: string;
		source: string;
		viewUrl: string;
	} = $props();

	let copied = $state(false);
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let btn: HTMLButtonElement | null = $state(null);

	/**
	 * Wrap the raw markdown with a small header so when the user pastes into
	 * an LLM, the model knows what it's looking at and where it came from.
	 */
	let payload = $derived(
		[
			`# ${title}`,
			'',
			`Source: svelte-p5 documentation, ${slug}`,
			`Repository: https://github.com/edw1nzhao/svelte-p5`,
			`URL: ${viewUrl}`,
			'',
			'---',
			'',
			source
		].join('\n')
	);

	/**
	 * Fire a small confetti burst from the button. Dynamic-imported so the
	 * ~4 KB canvas-confetti library only loads on the first successful copy,
	 * not on initial page render. Respects `prefers-reduced-motion` — the
	 * confirmation state still flips, you just don't get the particles.
	 */
	async function celebrate() {
		if (!btn || typeof window === 'undefined') return;
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
		const { default: confetti } = await import('canvas-confetti');
		const rect = btn.getBoundingClientRect();
		const origin = {
			x: (rect.left + rect.width / 2) / window.innerWidth,
			y: (rect.top + rect.height / 2) / window.innerHeight
		};
		// Two quick bursts so it feels lively, not just a puff. Brand colors
		// (indigo + emerald check) + a neutral for visual variety. Small
		// particle count so it stays tasteful — no screen-wipe chaos.
		confetti({
			particleCount: 40,
			spread: 60,
			startVelocity: 35,
			scalar: 0.8,
			origin,
			colors: ['#6366f1', '#818cf8', '#10b981', '#a78bfa', '#f8fafc']
		});
		setTimeout(
			() =>
				confetti({
					particleCount: 20,
					spread: 90,
					startVelocity: 25,
					scalar: 0.7,
					origin,
					colors: ['#6366f1', '#10b981', '#f8fafc']
				}),
			120
		);
	}

	function copy() {
		navigator.clipboard
			.writeText(payload)
			.then(() => {
				copied = true;
				celebrate();
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(() => (copied = false), 2000);
			})
			.catch(() => {});
	}
</script>

<button
	bind:this={btn}
	type="button"
	onclick={copy}
	title="Copy this entire page as markdown for pasting into an LLM"
	aria-label={copied ? 'Copied for AI' : 'Copy this page for an LLM'}
	class="press inline-flex items-center gap-1.5 sm:gap-2 h-10 px-2.5 sm:px-3 rounded-md text-xs sm:text-sm font-medium border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap"
>
	{#if copied}
		<Check class="size-4 text-emerald-500" />
		<span class="hidden sm:inline">Copied for AI</span>
		<span class="sm:hidden">Copied</span>
	{:else}
		<Sparkles class="size-4 text-indigo-500" />
		<span class="hidden sm:inline">Copy for AI</span>
		<span class="sm:hidden">AI</span>
	{/if}
</button>
