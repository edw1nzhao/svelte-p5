import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Ctrl+K opens search and a result leads to the matching docs page', async ({ page }) => {
	await page.goto('/playground');
	await expect(page.locator('pagefind-modal-trigger button')).toBeVisible();
	await page.keyboard.press('ControlOrMeta+k');

	const input = page.getByRole('searchbox').or(page.getByRole('combobox')).first();
	await expect(input).toBeFocused();
	await input.fill('createP5Bridge');

	const result = page.locator('pagefind-results a[href*="/docs/"]').first();
	await expect(result).toBeVisible();
	await result.click();
	await expect(page).toHaveURL(/\/docs\/[a-z-]+$/);
	await expect(page.locator('article')).toContainText('createP5Bridge');
});

test('the search trigger is usable at phone width', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 740 });
	await page.goto('/');
	const trigger = page.locator('pagefind-modal-trigger');
	await expect(trigger).toBeVisible();
	await trigger.click();
	await expect(page.getByRole('dialog')).toBeVisible();
});

test('the open search modal has no WCAG 2.2 A/AA violations', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/docs');
	await expect(page.locator('pagefind-modal-trigger button')).toBeVisible();
	await page.keyboard.press('ControlOrMeta+k');
	await page.getByRole('searchbox').or(page.getByRole('combobox')).first().fill('sketch');
	await expect(page.locator('pagefind-results a').first()).toBeVisible();
	const { violations } = await new AxeBuilder({ page })
		.include('pagefind-modal')
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(
		violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) }))
	).toEqual([]);
});
