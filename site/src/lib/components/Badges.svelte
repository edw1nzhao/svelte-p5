<script lang="ts">
	const REPO = 'edw1nzhao/svelte-p5';
	// `flat` has slightly rounded corners (default shields.io look).
	// `flat-square` is sharp; `for-the-badge` is pill-shaped - too loud.
	const STYLE = 'flat';

	const npmVersion = (pkg: string, label: string) =>
		`https://img.shields.io/npm/v/${pkg}?style=${STYLE}&label=${label}&labelColor=1e293b&color=6366f1`;

	const badges = [
		{
			alt: 'CI status',
			href: `https://github.com/${REPO}/actions/workflows/ci.yml`,
			src: `https://img.shields.io/github/actions/workflow/status/${REPO}/ci.yml?branch=main&style=${STYLE}&label=CI&labelColor=1e293b&color=10b981`
		},
		{
			// The site now deploys via the Cloudflare Workers GitHub App, not a
			// GitHub Actions workflow. CF doesn't create GitHub Deployment
			// records, so there's nothing for a shields.io status badge to
			// query — static "hosted on" badge instead of a broken workflow
			// status. Links to the live production site.
			alt: 'Hosted on Cloudflare Workers',
			href: 'https://svelte-p5.dev',
			src: `https://img.shields.io/badge/hosted_on-Cloudflare_Workers-f38020?style=${STYLE}&labelColor=1e293b&logo=cloudflare&logoColor=white`
		},
		{
			alt: 'svelte-p5 npm version',
			href: 'https://www.npmjs.com/package/svelte-p5',
			src: npmVersion('svelte-p5', 'svelte-p5')
		},
		{
			alt: 'svelte-p5-components npm version',
			href: 'https://www.npmjs.com/package/svelte-p5-components',
			src: npmVersion('svelte-p5-components', 'components')
		},
		{
			alt: 'License',
			href: `https://github.com/${REPO}/blob/main/LICENSE`,
			src: `https://img.shields.io/npm/l/svelte-p5?style=${STYLE}&label=license&labelColor=1e293b&color=64748b`
		}
	];
</script>

<div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
	{#each badges as badge (badge.src)}
		<a
			href={badge.href}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-block min-h-6 leading-none"
			aria-label={badge.alt}
		>
			<img src={badge.src} alt={badge.alt} loading="lazy" decoding="async" height="20" />
		</a>
	{/each}
</div>
