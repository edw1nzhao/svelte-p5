<script lang="ts">
	import { ArrowRight, ExternalLink } from '@lucide/svelte';

	const facts = [
		{ label: 'p5.js', value: '1.11+ and 2.x, both tested in CI, including a real-browser test' },
		{ label: 'Svelte', value: 'Svelte 5 and SvelteKit' },
		{ label: 'Language', value: 'TypeScript types included' },
		{ label: 'License', value: 'MIT' },
		{ label: 'Releases', value: 'Published to npm with provenance' }
	];

	const apps = [
		{
			name: 'Interaction Geography Slicer',
			note: 'Space-time cube for movement and conversation. Published at CHI 2025.',
			href: 'https://github.com/BenRydal/igs'
		},
		{
			name: 'Transcript Explorer',
			note: 'Conversation visualization from transcripts.',
			href: 'https://github.com/BenRydal/transcript-explorer'
		},
		{
			name: 'Mondrian Transcription',
			note: 'Movement transcription from video onto floor plans.',
			href: 'https://github.com/BenRydal/mondrian-transcription'
		}
	];
</script>

<section class="py-16 sm:py-24 px-4 sm:px-6" aria-labelledby="compat-heading">
	<div class="max-w-6xl mx-auto grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
		<div>
			<h2
				id="compat-heading"
				class="font-bold text-slate-900 tracking-tight mb-3"
				style="font-size: clamp(1.5rem, 1.25rem + 1.5vw, 2rem); text-wrap: balance;"
			>
				Compatibility
			</h2>
			<dl class="border-t border-slate-200 mb-6">
				{#each facts as fact (fact.label)}
					<div class="grid grid-cols-[6rem_1fr] gap-4 py-3 border-b border-slate-200">
						<dt class="text-sm font-semibold text-slate-900">{fact.label}</dt>
						<dd class="text-base text-slate-600">{fact.value}</dd>
					</div>
				{/each}
			</dl>
			<a
				href="/docs/recipes/migration-from-p5-svelte"
				class="group flex items-center justify-between gap-4 rounded-xl border border-indigo-500/15 bg-indigo-500/8 px-5 py-4 no-underline"
			>
				<span>
					<span class="block text-base font-semibold text-slate-900">Coming from p5-svelte?</span>
					<span class="block text-sm text-slate-600"
						>It was last published in 2022 and supports p5 1 only. The migration guide takes about
						ten minutes per component.</span
					>
				</span>
				<ArrowRight
					class="size-5 shrink-0 text-indigo-500 transition-transform group-hover:translate-x-0.5"
				/>
			</a>
		</div>

		<div>
			<h2
				class="font-bold text-slate-900 tracking-tight mb-3"
				style="font-size: clamp(1.5rem, 1.25rem + 1.5vw, 2rem); text-wrap: balance;"
			>
				Used by
			</h2>
			<ul class="border-t border-slate-200 mb-6">
				{#each apps as app (app.href)}
					<li class="border-b border-slate-200">
						<a
							href={app.href}
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-start justify-between gap-4 py-4 no-underline"
						>
							<span>
								<span
									class="block text-base font-semibold text-slate-900 group-hover:text-indigo-500"
									>{app.name}</span
								>
								<span class="block text-sm text-slate-500">{app.note}</span>
							</span>
							<ExternalLink class="size-4 shrink-0 mt-1.5 text-slate-400" />
						</a>
					</li>
				{/each}
			</ul>
			<p class="text-sm text-slate-500">
				IGS: Shapiro, Hall, Mathur and Zhao,
				<a
					href="https://doi.org/10.1145/3706598.3713490"
					target="_blank"
					rel="noopener noreferrer"
					class="text-indigo-500 font-medium hover:underline">CHI 2025</a
				>.
			</p>
		</div>
	</div>
</section>
