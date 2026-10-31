import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, renderer: 'p2d' | 'webgl' = 'p2d') {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto(`/?component=export&renderer=${renderer}`);
	await page.waitForFunction(() => window.__export.ready);
	await page.waitForTimeout(100);
	return errors;
}

const exportSize = (page: Page, options?: Record<string, unknown>) =>
	page.evaluate((o) => window.__export.exportSize(o), options);

for (const renderer of ['p2d', 'webgl'] as const) {
	test(`exports ${renderer} PNGs at scale 1, 2, the screen density and a print size`, async ({
		page
	}) => {
		const errors = await open(page, renderer);
		expect(await exportSize(page, { scale: 1 })).toEqual({
			width: 320,
			height: 200,
			type: 'image/png'
		});
		expect(await exportSize(page, { scale: 2 })).toMatchObject({ width: 640, height: 400 });
		expect(await exportSize(page)).toMatchObject({ width: 640, height: 400 });
		// 10 x 6.25 in at 300 ppi.
		expect(await exportSize(page, { width: 3000 })).toMatchObject({ width: 3000, height: 1875 });
		expect(await exportSize(page, { scale: 1, format: 'jpeg' })).toMatchObject({
			type: 'image/jpeg'
		});
		expect(errors).toEqual([]);
	});

	test(`a ${renderer} export leaves the live canvas unchanged and is not blank`, async ({
		page
	}) => {
		await open(page, renderer);
		await page.evaluate(() => window.__export.stop());
		await page.waitForTimeout(100);
		const before = await page.evaluate(() => window.__export.live());
		const ink = await page.evaluate(() => window.__export.exportInk({ scale: 3 }));
		const after = await page.evaluate(() => window.__export.live());
		expect(after).toEqual(before);
		expect(before.backingWidth).toBe(640);
		// The red rect covers a quarter of the canvas.
		expect(ink).toBeGreaterThan(0.2);
		expect(ink).toBeLessThan(0.3);
	});
}

test('stepFrames draws N frames with increasing frameCount at the requested scale', async ({
	page
}) => {
	await open(page);
	const frames = await page.evaluate(() => window.__export.step(5));
	expect(frames).toHaveLength(5);
	const counts = frames.map((f) => f.frameCount);
	for (let i = 1; i < counts.length; i++) expect(counts[i]).toBe(counts[i - 1]! + 1);
	expect(new Set(frames.map((f) => f.width))).toEqual(new Set([640]));
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => window.__export.live().frameCount)).toBeGreaterThan(counts[4]!);
});

test('<ExportButton> inside <Sketch> downloads through the sketch context', async ({ page }) => {
	await open(page);
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Export PNG' }).click();
	expect((await download).suggestedFilename()).toMatch(/^sketch-\d{8}-\d{6}-e2e\.png$/);
});
