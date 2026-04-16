import { createHighlighter } from 'shiki';
import {
	basicSnippet,
	bridgeSnippet,
	componentsSnippet,
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

	return {
		snippets: {
			installPnpm: {
				raw: installPnpmSnippet,
				html: highlight(installPnpmSnippet, 'bash')
			},
			installNpm: {
				raw: installNpmSnippet,
				html: highlight(installNpmSnippet, 'bash')
			},
			installBun: {
				raw: installBunSnippet,
				html: highlight(installBunSnippet, 'bash')
			},
			basic: {
				raw: basicSnippet,
				html: highlight(basicSnippet, 'svelte')
			},
			bridge: {
				raw: bridgeSnippet,
				html: highlight(bridgeSnippet, 'svelte')
			},
			components: {
				raw: componentsSnippet,
				html: highlight(componentsSnippet, 'svelte')
			}
		}
	};
}
