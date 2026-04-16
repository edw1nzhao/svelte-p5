import { docs } from '$lib/docs/manifest';

export const prerender = true;

const SITE = 'https://svelte-p5.dev';

export function GET() {
	const lastmod = new Date().toISOString().split('T')[0];

	const urls = [
		{ loc: `${SITE}/`, priority: '1.0', changefreq: 'weekly' },
		{ loc: `${SITE}/docs`, priority: '0.9', changefreq: 'weekly' },
		...docs.map((d) => ({
			loc: `${SITE}/docs/${d.slug}`,
			priority: '0.8',
			changefreq: 'monthly'
		}))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) => `	<url>
		<loc>${u.loc}</loc>
		<lastmod>${lastmod}</lastmod>
		<changefreq>${u.changefreq}</changefreq>
		<priority>${u.priority}</priority>
	</url>`
	)
	.join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
