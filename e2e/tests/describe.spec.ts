import { expect, test } from '@playwright/test';

for (const kind of ['canvas', 'sketch']) {
	test(`<${kind}> description reaches assistive tech and follows the prop`, async ({ page }) => {
		await page.goto(`/?component=describe&kind=${kind}`);
		await page.waitForFunction(() => window.__describe.ready);

		const canvas = page.locator('canvas');
		// Canvas fallback content is not rendered, so role queries treat it as hidden.
		const region = canvas.locator('[role="region"][aria-label="Canvas Description"]');
		await expect(region).toHaveText('A grey circle in the middle of the canvas.');

		await page.evaluate(() => window.__describe.set('An empty canvas'));
		await expect(region).toHaveText('An empty canvas.');
	});
}
