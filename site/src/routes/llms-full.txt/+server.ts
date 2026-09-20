import { docs } from '$lib/docs/manifest';
import { getSource } from '$lib/docs/render';

export const prerender = true;

const SITE = 'https://svelte-p5.dev';

/**
 * Every doc concatenated as one plain-text file, for pasting into a context
 * window. The curated index lives at /llms.txt.
 */
export async function GET() {
	const rule = '='.repeat(72);
	const parts: string[] = [
		'# svelte-p5 documentation',
		'',
		'> Complete documentation for svelte-p5, svelte-p5-components and svelte-p5-viz,',
		`> concatenated from ${SITE}/docs. The curated index is at ${SITE}/llms.txt.`,
		'',
		`Generated ${new Date().toISOString().split('T')[0]}.`
	];

	for (const doc of docs) {
		const source = await getSource(doc.file);
		if (!source) continue;
		parts.push(
			'',
			rule,
			`# ${doc.title}`,
			`Source: ${SITE}/docs/${doc.slug}`,
			rule,
			'',
			source.trim()
		);
	}

	return new Response(parts.join('\n') + '\n', {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
