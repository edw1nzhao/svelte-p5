import { error } from '@sveltejs/kit';
import { docs, findBySlug, adjacentDocs } from '$lib/docs/manifest';
import { renderDoc, editUrl, viewUrl } from '$lib/docs/render';
import type { PageServerLoad, EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => docs.map((d) => ({ slug: d.slug }));

export const load: PageServerLoad = async ({ params }) => {
	const doc = findBySlug(params.slug);
	if (!doc) throw error(404, 'Doc not found');

	const { html, toc, source } = await renderDoc(doc);
	const { prev, next } = adjacentDocs(doc.slug);

	return {
		doc: { slug: doc.slug, title: doc.title, description: doc.description, file: doc.file },
		html,
		toc,
		source,
		editUrl: editUrl(doc),
		viewUrl: viewUrl(doc),
		prev: prev ? { slug: prev.slug, title: prev.title } : null,
		next: next ? { slug: next.slug, title: next.title } : null
	};
};
