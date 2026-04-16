<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import Features from '$lib/components/Features.svelte';
	import CodeDemo from '$lib/components/CodeDemo.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import BasicDemo from '$lib/demos/BasicDemo.svelte';
	import BridgeDemo from '$lib/demos/BridgeDemo.svelte';
	import ComponentsDemo from '$lib/demos/ComponentsDemo.svelte';
	import SharedStateDemo from '$lib/demos/SharedStateDemo.svelte';
	import InteractionDemo from '$lib/demos/InteractionDemo.svelte';
	import DraggableSketchDemo from '$lib/demos/DraggableSketchDemo.svelte';

	let { data } = $props();
</script>

<main id="main">
	<Hero
		installPnpm={data.snippets.installPnpm}
		installNpm={data.snippets.installNpm}
		installBun={data.snippets.installBun}
	/>

	<Features />

	<section
		id="examples"
		class="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-200 scroll-mt-20"
	>
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-10 sm:mb-14">
				<h2
					class="font-bold text-slate-900 tracking-tight mb-3"
					style="font-size: clamp(1.5rem, 1.25rem + 1.5vw, 2rem); text-wrap: balance;"
				>
					See it in action
				</h2>
				<p class="text-base text-slate-500 max-w-xl mx-auto" style="text-wrap: pretty;">
					Every example below is running live. The code on the right is all you need - copy, paste,
					done.
				</p>
			</div>

			<div class="flex flex-col gap-16 sm:gap-24">
				<CodeDemo
					title="The basics"
					description="A minimal sketch. The wrapper handles lifecycle and cleanup."
					codeHtml={data.snippets.basic.html}
					codeRaw={data.snippets.basic.raw}
				>
					{#snippet demo()}
						<BasicDemo />
					{/snippet}
				</CodeDemo>

				<CodeDemo
					title="Reactive state bridge"
					description="Svelte UI and p5 sketch share state through a $state proxy. Move the sliders."
					codeHtml={data.snippets.bridge.html}
					codeRaw={data.snippets.bridge.raw}
				>
					{#snippet demo()}
						<BridgeDemo />
					{/snippet}
				</CodeDemo>

				<CodeDemo
					title="Pre-built components"
					description="Responsive canvas with HiDPI and FPS monitoring - one import away."
					codeHtml={data.snippets.components.html}
					codeRaw={data.snippets.components.raw}
				>
					{#snippet demo()}
						<ComponentsDemo />
					{/snippet}
				</CodeDemo>

				<CodeDemo
					title="Shared state across sketches"
					description="One bridge, two canvases. Both sketches read the same $state every frame, so a single slider drives them in sync."
					codeHtml={data.snippets.sharedState.html}
					codeRaw={data.snippets.sharedState.raw}
				>
					{#snippet demo()}
						<SharedStateDemo />
					{/snippet}
				</CodeDemo>

				<CodeDemo
					title="Mouse interaction & hit-testing"
					description="Click to spawn particles. Hover the labeled circles - the hit-test result flows back into Svelte UI through the bridge."
					codeHtml={data.snippets.interaction.html}
					codeRaw={data.snippets.interaction.raw}
				>
					{#snippet demo()}
						<InteractionDemo />
					{/snippet}
				</CodeDemo>

				<CodeDemo
					title="Floating draggable sketches"
					description="DraggableSketch wraps a sketch in a movable, resizable window. constrained='parent' keeps it inside its container."
					codeHtml={data.snippets.draggableSketch.html}
					codeRaw={data.snippets.draggableSketch.raw}
				>
					{#snippet demo()}
						<DraggableSketchDemo />
					{/snippet}
				</CodeDemo>
			</div>
		</div>
	</section>

	<section class="py-16 sm:py-20 px-4 sm:px-6 text-center">
		<div class="max-w-lg mx-auto">
			<h2
				class="font-bold text-slate-900 mb-3"
				style="font-size: clamp(1.25rem, 1rem + 1vw, 1.625rem);"
			>
				Ready to build?
			</h2>
			<p class="text-base text-slate-500 leading-relaxed">
				Check the
				<a href="/docs" class="text-indigo-500 font-medium hover:underline">documentation</a>
				or dive into the
				<a
					href="https://github.com/edw1nzhao/svelte-p5/tree/main/docs/examples"
					target="_blank"
					rel="noopener noreferrer"
					class="text-indigo-500 font-medium hover:underline">runnable examples</a
				>.
			</p>
		</div>
	</section>
</main>

<Footer />
