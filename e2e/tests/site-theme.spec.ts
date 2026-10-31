import { expect, test } from '@playwright/test';

const theme = (page: import('@playwright/test').Page) =>
	page.evaluate(() => ({
		site: document.documentElement.dataset.theme,
		search: document.documentElement.dataset.pfTheme
	}));

test('the OS dark setting applies before the app hydrates', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	// Block the app's JavaScript so only the inline head script can set the theme.
	await page.route(/\/_app\/.*\.js$/, (r) => r.abort());
	await page.goto('/docs');
	expect(await theme(page)).toEqual({ site: 'dark', search: 'dark' });
	const background = await page.evaluate(
		() => getComputedStyle(document.documentElement).backgroundColor
	);
	expect(background).not.toMatch(/^rgba?\((255, 255, 255|0, 0, 0, 0)\)$/);
});

test('the toggle switches theme and the choice survives a reload', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/docs');
	const toggle = page.getByRole('button', { name: 'Dark theme' });
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	expect(await theme(page)).toEqual({ site: 'light', search: 'light' });

	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	expect(await theme(page)).toEqual({ site: 'dark', search: 'dark' });

	await page.reload();
	await expect(page.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(await theme(page)).toEqual({ site: 'dark', search: 'dark' });
});
