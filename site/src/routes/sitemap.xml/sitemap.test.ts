import { describe, expect, it } from 'vitest';
import { docs } from '#lib/docs/manifest.js';
import { GET } from './+server.js';

describe('sitemap.xml', () => {
	it('lists every docs page', async () => {
		const xml = await GET().text();
		for (const d of docs) expect(xml).toContain(`<loc>https://svelte-p5.dev/docs/${d.slug}</loc>`);
	});

	it('does not stamp every page with the build date as lastmod', async () => {
		expect(await GET().text()).not.toContain('<lastmod>');
	});
});
