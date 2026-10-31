import { expect, test } from '@playwright/test';

test('the addons prop registers once per p5 constructor, or fails clearly on p5 1', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/?component=addon');
	const version = await page.evaluate(() => window.__addon.version);

	if (version.startsWith('1.')) {
		await expect.poll(() => errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain('needs p5.registerAddon');
		expect(await page.locator('canvas').count()).toBe(0);
		return;
	}

	await page.waitForFunction(() => window.__addon.ready === 1);
	for (let n = 2; n <= 4; n++) {
		await page.evaluate(() => window.__addon.remount());
		await page.waitForFunction((count) => window.__addon.ready === count, n);
	}
	const state = await page.evaluate(() => window.__addon);
	expect(state.registrations).toBe(1);
	expect(state.log.slice(0, 2)).toEqual(['presetup canvas=false', 'setup greeting=hi']);
	await expect
		.poll(() => page.evaluate(() => window.__addon.postdrawFrames ?? 0))
		.toBeGreaterThan(0);
	expect(await page.locator('canvas').count()).toBe(1);
	expect(errors).toEqual([]);
});
