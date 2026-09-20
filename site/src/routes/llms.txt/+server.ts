import { docs } from '$lib/docs/manifest';

export const prerender = true;

const SITE = 'https://svelte-p5.dev';

/**
 * llms.txt (https://llmstxt.org): a curated index for language models, so an
 * agent answering a question about this library reads the docs rather than
 * guessing an API from its training data.
 *
 * Generated from the same manifest the site navigation uses, so a new doc
 * appears here without anyone remembering to add it.
 */
export function GET() {
	const bySection = new Map<string, typeof docs>();
	for (const d of docs) {
		const list = bySection.get(d.section) ?? [];
		bySection.set(d.section, [...list, d] as typeof docs);
	}

	const sections = [...bySection.entries()]
		.map(([section, entries]) => {
			const lines = entries.map(
				(d) => `- [${d.title}](${SITE}/docs/${d.slug})${d.description ? `: ${d.description}` : ''}`
			);
			return `## ${section}\n\n${lines.join('\n')}`;
		})
		.join('\n\n');

	const body = `# svelte-p5

> A thin Svelte 5 wrapper for p5.js, plus composable canvas UI components. Three packages: \`svelte-p5\` (the canvas primitive and utilities), \`svelte-p5-components\` (layout, timeline, media and panel components), and \`svelte-p5-viz\` (panel contract and scene format).

The guiding constraint is that p5 draws pixels and Svelte owns UI and state. Components are unopinionated about your data; state lives in Svelte runes or your own stores, never inside the wrapper.

${sections}

## Packages

- [svelte-p5 on npm](https://www.npmjs.com/package/svelte-p5)
- [svelte-p5-components on npm](https://www.npmjs.com/package/svelte-p5-components)
- [svelte-p5-viz on npm](https://www.npmjs.com/package/svelte-p5-viz)

## Optional

- [Full documentation as one file](${SITE}/llms-full.txt): every page concatenated, for pasting into a context window.
- [Source](https://github.com/edw1nzhao/svelte-p5)
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
