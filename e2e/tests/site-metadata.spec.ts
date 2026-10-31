import { expect, test } from '@playwright/test';

const SITE = 'https://svelte-p5.dev';
const paths = ['/', '/docs', '/docs/getting-started', '/docs/perf-comparison', '/playground'];

for (const path of paths) {
	test(`${path} declares its own canonical URL, title and share card`, async ({ page }) => {
		await page.goto(path);
		const head = page.locator('head');

		await expect(head.locator('title')).toHaveCount(1);
		await expect(head.locator('link[rel="canonical"]')).toHaveCount(1);
		await expect(head.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE + path);
		await expect(head.locator('meta[property="og:url"]')).toHaveAttribute('content', SITE + path);
		await expect(head.locator('meta[property="og:title"]')).toHaveAttribute(
			'content',
			await page.title()
		);
		await expect(head.locator('meta[name="description"]')).toHaveCount(1);
		await expect(head.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			`${SITE}/og.png`
		);
	});
}

test('the share card image is a 1200x630 PNG', async ({ request }) => {
	const res = await request.get('/og.png');
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toBe('image/png');
	const png = await res.body();
	expect(png.readUInt32BE(16)).toBe(1200);
	expect(png.readUInt32BE(20)).toBe(630);
});
