/**
 * Specific route for /docs/perf-comparison so the page can render the
 * markdown content AND inject SVG charts on top. The dynamic [...slug]
 * route handles every other doc; this one needs the bench data too.
 */
import { error } from '@sveltejs/kit';
import { findBySlug, adjacentDocs } from '$lib/docs/manifest';
import { renderDoc, editUrl, viewUrl } from '$lib/docs/render';
import results from '../../../../../bench/results.json';
import type { PageServerLoad } from './$types';
import type { PerfResults } from '$lib/charts/PerfCharts.svelte';

export const prerender = true;

export const load: PageServerLoad = async () => {
	const doc = findBySlug('perf-comparison');
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
		next: next ? { slug: next.slug, title: next.title } : null,
		results: results as unknown as PerfResults
	};
};
