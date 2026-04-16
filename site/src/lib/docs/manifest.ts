/**
 * Docs manifest. Each entry maps a URL slug to a markdown file in the repo's
 * `docs/` folder. Order here is the order in the sidebar.
 *
 * Add new docs by dropping a `.md` file into `/docs` and adding an entry below.
 */

export interface DocEntry {
	slug: string;
	title: string;
	description?: string;
	file: string;
	section: string;
}

export const docs: readonly DocEntry[] = [
	{
		slug: 'getting-started',
		title: 'Getting started',
		description: 'Install and use the three layers.',
		file: 'docs/getting-started.md',
		section: 'Start'
	},
	{
		slug: 'architecture',
		title: 'Three layers',
		description: 'Primitives, components, composition.',
		file: 'docs/architecture.md',
		section: 'Concepts'
	},
	{
		slug: 'bridges',
		title: 'State bridges',
		description: 'When to use $state, createP5Bridge, or a reactive class.',
		file: 'docs/bridges.md',
		section: 'Concepts'
	},
	{
		slug: 'perf-comparison',
		title: 'Wrapper behavior comparison',
		description:
			'Measurable differences between this wrapper and p5-svelte, with the data and when it matters.',
		file: 'docs/perf-comparison.md',
		section: 'Concepts'
	},
	{
		slug: 'recipes/migration-from-p5-svelte',
		title: 'Migrate from p5-svelte',
		description: 'API mapping and ten-minute port.',
		file: 'docs/recipes/migration-from-p5-svelte.md',
		section: 'Recipes'
	},
	{
		slug: 'recipes/shared-state',
		title: 'Shared state across sketches',
		description: 'A reactive class as the single source of truth for a dashboard.',
		file: 'docs/recipes/shared-state.md',
		section: 'Recipes'
	},
	{
		slug: 'recipes/interaction',
		title: 'Mouse, touch, and hit-testing',
		description: 'Event handlers, hit-tests, and syncing hover with UI.',
		file: 'docs/recipes/interaction.md',
		section: 'Recipes'
	},
	{
		slug: 'recipes/data-driven-viz',
		title: 'Data-driven visualizations',
		description: 'Loading data, master clocks, scales, and on-demand redraws.',
		file: 'docs/recipes/data-driven-viz.md',
		section: 'Recipes'
	},
	{
		slug: 'recipes/cleanup',
		title: 'Cleanup & lifecycle',
		description:
			'How p5 instances persist across mount/unmount and what the wrapper does about it.',
		file: 'docs/recipes/cleanup.md',
		section: 'Recipes'
	},
	{
		slug: 'recipes/performance',
		title: 'Performance',
		description: 'FES, font atlases, color caches.',
		file: 'docs/recipes/performance.md',
		section: 'Recipes'
	},
	{
		slug: 'recipes/hidpi',
		title: 'HiDPI',
		description: 'Sharp canvases on retina displays.',
		file: 'docs/recipes/hidpi.md',
		section: 'Recipes'
	}
] as const;

export const sections = Array.from(new Set(docs.map((d) => d.section)));

export function findBySlug(slug: string): DocEntry | undefined {
	return docs.find((d) => d.slug === slug);
}

export function adjacentDocs(slug: string): { prev?: DocEntry; next?: DocEntry } {
	const idx = docs.findIndex((d) => d.slug === slug);
	if (idx === -1) return {};
	return {
		prev: idx > 0 ? docs[idx - 1] : undefined,
		next: idx < docs.length - 1 ? docs[idx + 1] : undefined
	};
}
