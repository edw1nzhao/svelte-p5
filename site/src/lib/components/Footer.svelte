<script lang="ts">
	import { Package, BookOpen, Heart, Scale, ExternalLink } from '@lucide/svelte';
	import GithubIcon from './icons/GithubIcon.svelte';
	import Logo from './Logo.svelte';

	const year = new Date().getFullYear();

	const sections = [
		{
			title: 'Project',
			links: [
				{
					href: 'https://github.com/edw1nzhao/svelte-p5',
					label: 'GitHub',
					icon: GithubIcon,
					ext: true
				},
				{
					href: 'https://github.com/edw1nzhao/svelte-p5/blob/main/.github/CONTRIBUTING.md',
					label: 'Contributing',
					icon: Heart,
					ext: true
				},
				{
					href: 'https://github.com/edw1nzhao/svelte-p5/blob/main/LICENSE',
					label: 'MIT License',
					icon: Scale,
					ext: true
				}
			]
		},
		{
			title: 'Packages',
			links: [
				{
					href: 'https://www.npmjs.com/package/svelte-p5',
					label: 'svelte-p5',
					icon: Package,
					ext: true
				},
				{
					href: 'https://www.npmjs.com/package/svelte-p5-components',
					label: 'svelte-p5-components',
					icon: Package,
					ext: true
				}
			]
		},
		{
			title: 'Resources',
			links: [
				{ href: '/docs', label: 'Documentation', icon: BookOpen, ext: false },
				{
					href: 'https://github.com/edw1nzhao/svelte-p5/tree/main/docs/examples',
					label: 'Examples',
					icon: ExternalLink,
					ext: true
				},
				{
					href: 'https://github.com/edw1nzhao/svelte-p5/issues',
					label: 'Issue tracker',
					icon: ExternalLink,
					ext: true
				}
			]
		}
	];
</script>

<footer
	class="border-t border-slate-200 bg-slate-50"
	style="padding-bottom: max(2rem, env(safe-area-inset-bottom));"
>
	<div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12 mb-10">
			<!-- Brand column -->
			<div class="col-span-2 sm:col-span-1">
				<a
					href="/"
					class="inline-flex items-center gap-2 no-underline mb-3"
					aria-label="svelte-p5 home"
				>
					<Logo class="size-7" />
					<span class="font-mono font-semibold text-base text-slate-900">svelte-p5</span>
				</a>
				<p class="text-sm text-slate-500 leading-relaxed max-w-xs">
					Svelte 5 + p5.js. Correct lifecycle, reactive bridge, components.
				</p>
			</div>

			{#each sections as section (section.title)}
				<div>
					<h3 class="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
						{section.title}
					</h3>
					<ul class="flex flex-col gap-1">
						{#each section.links as link (link.href)}
							{@const Icon = link.icon}
							<li>
								<a
									href={link.href}
									target={link.ext ? '_blank' : undefined}
									rel={link.ext ? 'noopener noreferrer' : undefined}
									class="inline-flex items-center gap-2 min-h-9 text-sm text-slate-600 hover:text-slate-900 no-underline transition-colors"
								>
									<Icon class="size-4 text-slate-400" />
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div
			class="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500"
		>
			<div>
				&copy; {year} Edwin Zhao &middot; MIT License
			</div>
			<div class="font-mono">
				Built with <a
					href="https://svelte.dev"
					target="_blank"
					rel="noopener noreferrer"
					class="text-slate-600 hover:text-slate-900">Svelte</a
				>
				&middot;
				<a
					href="https://p5js.org"
					target="_blank"
					rel="noopener noreferrer"
					class="text-slate-600 hover:text-slate-900">p5.js</a
				>
			</div>
		</div>
	</div>
</footer>
