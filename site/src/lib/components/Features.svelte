<script lang="ts">
	import { onMount } from 'svelte';
	import { staggerFadeUp } from '$lib/animations';
	import { whenVisible } from '$lib/whenVisible.svelte';
	import { tilt } from '$lib/actions/tilt';

	let grid: HTMLDivElement | null = $state(null);
	onMount(() => {
		whenVisible(grid, (el) => {
			staggerFadeUp(el, '[data-anim]', { staggerMs: 110 });
		});
	});
</script>

<section class="py-20 px-6 bg-slate-50 border-y border-slate-200">
	<div bind:this={grid} class="max-w-6xl mx-auto grid grid-cols-1 gap-12 md:grid-cols-3">
		<div use:tilt data-anim>
			<div
				class="size-10 flex items-center justify-center bg-indigo-500/8 text-indigo-500 rounded-[0.625rem] mb-4"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
					<path d="m9 12 2 2 4-4" />
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-slate-900 mb-2">Correct lifecycle</h3>
			<p class="text-[0.9375rem] leading-relaxed text-slate-500">
				Mounts p5 in instance mode and calls <code
					class="font-mono text-[0.8125rem] bg-indigo-500/8 px-1.5 rounded text-indigo-700"
					>remove()</code
				>
				on unmount, so toggling
				<code class="font-mono text-[0.8125rem] bg-indigo-500/8 px-1.5 rounded text-indigo-700"
					>{`{#if}`}</code
				>
				blocks, switching routes, or HMR all release cleanly.
			</p>
		</div>

		<div use:tilt data-anim>
			<div
				class="size-10 flex items-center justify-center bg-indigo-500/8 text-indigo-500 rounded-[0.625rem] mb-4"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M8 3H5a2 2 0 0 0-2 2v3" />
					<path d="M21 8V5a2 2 0 0 0-2-2h-3" />
					<path d="M3 16v3a2 2 0 0 0 2 2h3" />
					<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
					<line x1="12" y1="8" x2="12" y2="16" />
					<line x1="8" y1="12" x2="16" y2="12" />
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-slate-900 mb-2">Reactive bridge</h3>
			<p class="text-[0.9375rem] leading-relaxed text-slate-500">
				<code class="font-mono text-[0.8125rem] bg-indigo-500/8 px-1.5 rounded text-indigo-700"
					>createP5Bridge</code
				>
				returns a
				<code class="font-mono text-[0.8125rem] bg-indigo-500/8 px-1.5 rounded text-indigo-700"
					>$state</code
				>
				proxy. UI writes flow into the draw loop. Sketch writes flow back to Svelte. No stores, no subscriptions
				- just runes.
			</p>
		</div>

		<div use:tilt data-anim>
			<div
				class="size-10 flex items-center justify-center bg-indigo-500/8 text-indigo-500 rounded-[0.625rem] mb-4"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
					<line x1="3" y1="9" x2="21" y2="9" />
					<line x1="9" y1="21" x2="9" y2="9" />
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-slate-900 mb-2">Pre-built components</h3>
			<p class="text-[0.9375rem] leading-relaxed text-slate-500">
				<code class="font-mono text-[0.8125rem] bg-indigo-500/8 px-1.5 rounded text-indigo-700"
					>&lt;Sketch&gt;</code
				>
				with ResizeObserver and HiDPI.
				<code class="font-mono text-[0.8125rem] bg-indigo-500/8 px-1.5 rounded text-indigo-700"
					>&lt;FPSMonitor&gt;</code
				>
				and
				<code class="font-mono text-[0.8125rem] bg-indigo-500/8 px-1.5 rounded text-indigo-700"
					>&lt;SketchDebug&gt;</code
				>
				overlays.
				<code class="font-mono text-[0.8125rem] bg-indigo-500/8 px-1.5 rounded text-indigo-700"
					>&lt;DraggableSketch&gt;</code
				>
				for floating panels. All composable, all optional.
			</p>
		</div>
	</div>
</section>
