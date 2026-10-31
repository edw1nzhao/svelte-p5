import { expect, test, type Page } from '@playwright/test';

const canvases = (page: Page) => page.locator('canvas').count();
const away = (page: Page) => page.evaluate(() => (window.location.hash = '#/other'));
const back = (page: Page) => page.goBack();

function trackErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
	return errors;
}

async function open(page: Page, query: Record<string, string>) {
	await page.goto(`/?component=lifecycle&${new URLSearchParams(query)}#/other`);
	expect(await canvases(page)).toBe(0);
}

async function settle(page: Page) {
	await page.waitForTimeout(300);
	return page.evaluate(() => window.__lifecycle);
}

for (const kind of ['canvas', 'sketch']) {
	test(`<${kind === 'canvas' ? 'P5Canvas' : 'Sketch'}> unmounted during a pending async setup stays clean`, async ({
		page
	}) => {
		const errors = trackErrors(page);
		await open(page, { kind, gated: '1' });
		await page.evaluate(() => (window.location.hash = ''));
		await page.waitForFunction(() => window.__lifecycle.setupStarted === 1);

		await away(page);
		expect(await canvases(page)).toBe(0);
		await page.evaluate(() => window.__lifecycle.release());
		const after = await settle(page);

		expect(after.ready).toBe(0);
		expect({ created: after.created, removed: after.removed }).toEqual({ created: 1, removed: 1 });
		expect(await canvases(page)).toBe(0);
		const frames = after.frames;
		expect((await settle(page)).frames).toBe(frames);
		expect(errors).toEqual([]);
	});
}

for (const kind of ['canvas', 'sketch']) {
	test(`four <${kind}> sketches mounted and unmounted repeatedly leave no canvases or instances behind`, async ({
		page
	}) => {
		const errors = trackErrors(page);
		await open(page, { kind, count: '4' });
		const cycles = 8;

		for (let cycle = 1; cycle <= cycles; cycle++) {
			await page.evaluate(() => (window.location.hash = ''));
			await page.waitForFunction((n) => window.__lifecycle.ready === 4 * n, cycle);
			expect(await canvases(page)).toBe(4);
			await away(page);
			expect(await canvases(page)).toBe(0);
		}

		const end = await settle(page);
		expect({ created: end.created, removed: end.removed }).toEqual({
			created: 4 * cycles,
			removed: 4 * cycles
		});
		expect((await settle(page)).frames).toBe(end.frames);
		expect(errors).toEqual([]);
	});
}

test('navigating away and back with browser history re-creates exactly one canvas per sketch', async ({
	page
}) => {
	const errors = trackErrors(page);
	await page.goto('/?component=lifecycle&count=2');
	await page.waitForFunction(() => window.__lifecycle.ready === 2);

	for (let round = 1; round <= 3; round++) {
		await away(page);
		expect(await canvases(page)).toBe(0);
		await back(page);
		await page.waitForFunction((n) => window.__lifecycle.ready === 2 * (n + 1), round);
		expect(await canvases(page)).toBe(2);
	}

	await away(page);
	const end = await settle(page);
	expect({ created: end.created, removed: end.removed }).toEqual({ created: 8, removed: 8 });
	expect(errors).toEqual([]);
});
