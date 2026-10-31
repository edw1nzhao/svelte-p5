import { expect, test, type Page } from '@playwright/test';

const examplesInView = (page: Page) =>
	page.evaluate(() => {
		const top = document.getElementById('examples')?.getBoundingClientRect().top ?? Infinity;
		return top >= 0 && top < window.innerHeight / 2;
	});

test('Examples link from a docs page lands on the examples section', async ({ page }) => {
	await page.goto('/docs/getting-started');
	await page.locator('nav').getByRole('link', { name: 'Examples' }).first().click();
	await expect(page).toHaveURL(/\/#examples$/);
	await expect.poll(() => examplesInView(page)).toBe(true);
});

test('a new page starts at the top and Back restores the previous position', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => window.scrollTo(0, 1200));
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

	await page.locator('nav').getByRole('link', { name: 'Docs' }).first().click();
	await expect(page).toHaveURL(/\/docs/);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

	await page.goBack();
	await expect(page).toHaveURL(/\/$/);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
});
