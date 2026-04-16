/**
 * Markdown → HTML pipeline used by the docs routes.
 *
 * Reads `.md` files from the repo's `docs/` folder via `import.meta.glob`
 * (eager, raw) so they get bundled at build time. Parses with marked,
 * syntax-highlights with shiki, then post-processes the HTML to:
 *   - add heading IDs + anchor links + collect a TOC
 *   - rewrite relative `.md` links to `/docs/<slug>` and other relative
 *     paths to GitHub blob URLs
 *   - wrap each shiki code block in a `<figure class="code-block">` with a
 *     copy button (hydrated client-side by DocCopyButtons.svelte)
 *   - auto-link `p.X` and `p.X(` references to the official p5 docs
 */

import { Marked, type Tokens } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';
import { docs, type DocEntry } from './manifest';
import { p5Refs, P5_REFERENCE_BASE } from './p5-refs';

// Eagerly load every markdown file under /docs at build time. Vite's glob is
// statically analyzed, so it picks up files that exist at server-start. New
// files added during a dev session may not be hot-reloaded reliably - we add
// an fs fallback (see getSource) so adding a doc doesn't require a restart.
const sources = import.meta.glob('../../../../docs/**/*.md', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

const sourceByPath: Record<string, string> = {};
for (const [k, v] of Object.entries(sources)) {
	sourceByPath[k.replace(/^(\.\.\/)+/, '')] = v;
}

/**
 * Look up a doc's source. If the glob missed it (typically: file added
 * after `vite dev` started), fall back to reading from disk. The fallback
 * only ever runs in the dev/SSR loader where Node's `fs` is available;
 * production builds always satisfy from the eager glob.
 */
async function getSource(file: string): Promise<string | null> {
	const cached = sourceByPath[file];
	if (cached !== undefined) return cached;

	if (typeof process === 'undefined' || typeof window !== 'undefined') return null;

	try {
		const { readFile } = await import('node:fs/promises');
		const { resolve, dirname } = await import('node:path');
		const { fileURLToPath } = await import('node:url');
		const here = dirname(fileURLToPath(import.meta.url));
		// Walk up to the repo root so `docs/foo.md` resolves correctly in dev SSR.
		// In dev, `here` is the source path; in build it's the bundled output. The
		// glob already covers prod, so we only get here in dev where this works.
		const repoRoot = resolve(here, '../../../..');
		const text = await readFile(resolve(repoRoot, file), 'utf-8');
		sourceByPath[file] = text;
		return text;
	} catch {
		return null;
	}
}

const THEME = 'slack-dark';
const LANGS = ['svelte', 'typescript', 'javascript', 'bash', 'json', 'html', 'css'];

let highlighterPromise: Promise<Highlighter> | null = null;
function getHighlighter() {
	highlighterPromise ??= createHighlighter({ themes: [THEME], langs: LANGS });
	return highlighterPromise;
}

export interface TocEntry {
	level: 2 | 3;
	id: string;
	text: string;
}

export interface RenderedDoc {
	html: string;
	toc: TocEntry[];
	source: string;
}

function slugify(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Decode the basic HTML entities marked emits (apostrophes become `&#39;`,
 * ampersands `&amp;`, etc.) for plain-text uses like the TOC, where Svelte
 * renders the string as text and would otherwise show the raw entity.
 */
function decodeEntities(s: string): string {
	return s
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&'); // must run last so we don't double-decode
}

/** Resolve a relative `.md` link to a site-internal `/docs/<slug>` URL. */
function relMdToSlug(href: string, fromFile: string): string | null {
	if (!href.endsWith('.md') && !href.includes('.md#')) return null;
	const [pathPart, hash] = href.split('#');
	const stack = fromFile.split('/').slice(0, -1);
	for (const part of pathPart!.split('/')) {
		if (part === '.' || part === '') continue;
		if (part === '..') stack.pop();
		else stack.push(part);
	}
	const abs = stack.join('/');
	const entry = docs.find((d) => d.file === abs);
	return entry ? `/docs/${entry.slug}${hash ? '#' + hash : ''}` : null;
}

function relPathToGithub(href: string, fromFile: string): string {
	const stack = fromFile.split('/').slice(0, -1);
	for (const part of href.split('/')) {
		if (part === '.' || part === '') continue;
		if (part === '..') stack.pop();
		else stack.push(part);
	}
	return `https://github.com/edw1nzhao/svelte-p5/tree/main/${stack.join('/')}`;
}

/**
 * Auto-link `p.X` references in inline code to the p5.js reference.
 * Conservative: only operates inside `<code>...</code>` blocks that are
 * NOT inside a `<pre>` (i.e. inline code only - never code blocks, where
 * shiki has already produced its own markup).
 */
function linkifyP5Refs(html: string): string {
	// Match inline <code>...</code> that is NOT immediately preceded by </pre>
	// (and the contents don't include another tag - keep it simple)
	return html.replace(/<code>([^<>]+)<\/code>/g, (match, content: string) => {
		// Match `p.foo` - optionally followed by `(`, `.`, or end-of-string
		const linked = content.replace(/\bp\.([A-Za-z_][A-Za-z0-9_]*)\b/g, (m, name: string) => {
			if (!p5Refs.has(name)) return m;
			const url = `${P5_REFERENCE_BASE}${name}/`;
			return `<a href="${url}" class="p5-ref" target="_blank" rel="noopener noreferrer" title="p5.js reference: ${name}()">p.${name}</a>`;
		});
		return `<code>${linked}</code>`;
	});
}

export async function renderDoc(doc: DocEntry): Promise<RenderedDoc> {
	const source = await getSource(doc.file);
	if (!source) {
		throw new Error(
			`Doc source not found for ${doc.file}.\n` +
				`If you just added this file, restart the dev server - Vite's import.meta.glob ` +
				`only scans matching files at startup.\n` +
				`Available: ${Object.keys(sourceByPath).join(', ')}`
		);
	}

	const highlighter = await getHighlighter();

	let codeBlockId = 0;
	const m = new Marked();
	m.use({
		renderer: {
			code({ text, lang }: Tokens.Code) {
				const language = (lang ?? '').split(/\s/)[0]?.trim() || 'text';
				const safeLang = LANGS.includes(language) ? language : 'text';
				let html: string;
				try {
					html = highlighter.codeToHtml(text, { lang: safeLang, theme: THEME });
				} catch {
					html = `<pre><code>${escapeHtml(text)}</code></pre>`;
				}
				const id = `cb${++codeBlockId}`;
				const langLabel = safeLang === 'text' ? '' : safeLang;
				// Wrap in a figure so the copy button is anchored relative to the block,
				// and stash the raw source on a data-attribute for client-side copy.
				return `<figure class="code-block" data-source="${escapeHtml(text)}" data-cbid="${id}">${langLabel ? `<figcaption class="code-lang">${langLabel}</figcaption>` : ''}${html}</figure>`;
			}
		},
		async: false
	});

	let html = m.parse(source) as string;

	// --- Post-process headings: add IDs + collect TOC ---
	const toc: TocEntry[] = [];
	const usedIds = new Set<string>();

	html = html.replace(/<(h[2-3])>([\s\S]*?)<\/\1>/g, (_, tag, inner) => {
		const plain = decodeEntities(inner.replace(/<[^>]*>/g, '').trim());
		let id = slugify(plain);
		let n = 1;
		while (usedIds.has(id)) id = `${slugify(plain)}-${++n}`;
		usedIds.add(id);

		const level = tag === 'h2' ? 2 : 3;
		toc.push({ level: level as 2 | 3, id, text: plain });

		// Anchor positioned absolutely so it doesn't shift heading text.
		// `aria-label` is plain text, so it can use the decoded form too.
		return `<${tag} id="${id}" class="heading-anchor"><a href="#${id}" class="anchor" aria-label="Link to ${escapeHtml(plain)}">#</a>${inner}</${tag}>`;
	});

	// --- Post-process links ---
	html = html.replace(/<a\s+href="([^"]+)"([^>]*)>/g, (_, href, rest) => {
		const isExternal = /^https?:\/\//i.test(href);
		const isAnchor = href.startsWith('#');
		const isMail = href.startsWith('mailto:');
		const isAlreadyAbsolute = href.startsWith('/');

		if (isAnchor || isMail || isAlreadyAbsolute) return `<a href="${href}"${rest}>`;
		if (isExternal) return `<a href="${href}" target="_blank" rel="noopener noreferrer"${rest}>`;

		const docHref = relMdToSlug(href, doc.file);
		if (docHref) return `<a href="${docHref}"${rest}>`;

		const ghUrl = relPathToGithub(href, doc.file);
		return `<a href="${ghUrl}" target="_blank" rel="noopener noreferrer"${rest}>`;
	});

	// --- Auto-link p5 references in inline code ---
	html = linkifyP5Refs(html);

	return { html, toc, source };
}

export function editUrl(doc: DocEntry): string {
	return `https://github.com/edw1nzhao/svelte-p5/edit/main/${doc.file}`;
}

export function viewUrl(doc: DocEntry): string {
	return `https://github.com/edw1nzhao/svelte-p5/blob/main/${doc.file}`;
}
