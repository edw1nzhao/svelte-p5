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
	installBunSnippet
} from '$lib/snippets';

const THEME = 'slack-dark';

export async function load() {
	const highlighter = await createHighlighter({
		themes: [THEME],
		langs: ['svelte', 'bash']
	});

	const highlight = (code: string, lang: 'svelte' | 'bash') =>
		highlighter.codeToHtml(code, { lang, theme: THEME });

	const svelte = (raw: string) => ({ raw, html: highlight(raw, 'svelte') });
	const bash = (raw: string) => ({ raw, html: highlight(raw, 'bash') });

	return {
		snippets: {
			installPnpm: bash(installPnpmSnippet),
			installNpm: bash(installNpmSnippet),
			installBun: bash(installBunSnippet),
			basic: svelte(basicSnippet),
			bridge: svelte(bridgeSnippet),
			components: svelte(componentsSnippet),
			sharedState: svelte(sharedStateSnippet),
			interaction: svelte(interactionSnippet),
			draggableSketch: svelte(draggableSketchSnippet)
		}
	};
}
