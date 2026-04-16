import { createHighlighter } from 'shiki';
import {
	basicSnippet,
	bridgeSnippet,
	componentsSnippet,
	sharedStateSnippet,
	interactionSnippet,
	draggableSketchSnippet,
	installPnpmSnippet,
	installNpmSnippet,
	installBunSnippet,
	type CodeSnippet
} from '$lib/snippets';

const THEME = 'slack-dark';

export async function load() {
	const highlighter = await createHighlighter({
		themes: [THEME],
		langs: ['svelte', 'bash']
	});

	const highlight = (code: string, lang: 'svelte' | 'bash') =>
		highlighter.codeToHtml(code, { lang, theme: THEME });

	const bash = (raw: string) => ({ raw, html: highlight(raw, 'bash') });
	const svelteVariants = (snippet: CodeSnippet) => ({
		ts: { raw: snippet.ts, html: highlight(snippet.ts, 'svelte') },
		js: { raw: snippet.js, html: highlight(snippet.js, 'svelte') }
	});

	return {
		snippets: {
			installPnpm: bash(installPnpmSnippet),
			installNpm: bash(installNpmSnippet),
			installBun: bash(installBunSnippet),
			basic: svelteVariants(basicSnippet),
			bridge: svelteVariants(bridgeSnippet),
			components: svelteVariants(componentsSnippet),
			sharedState: svelteVariants(sharedStateSnippet),
			interaction: svelteVariants(interactionSnippet),
			draggableSketch: svelteVariants(draggableSketchSnippet)
		}
	};
}
