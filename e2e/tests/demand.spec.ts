import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, query: Record<string, string>) {
	await page.goto(`/?component=demand&${new URLSearchParams(query)}`);
	await page.waitForFunction(() => window.__demand.ready && window.__demand.frames > 0);
	await page.waitForTimeout(200);
}

const frames = (page: Page) => page.evaluate(() => window.__demand.frames);

async function framesDuring(page: Page, ms: number) {
	const before = await frames(page);
	await page.waitForTimeout(ms);
	return (await frames(page)) - before;
}

async function settledDelta(page: Page, act: () => Promise<unknown>) {
	const before = await frames(page);
	await act();
	await page.waitForTimeout(300);
	return (await frames(page)) - before;
}

test("'always' keeps drawing while idle", async ({ page }) => {
	await open(page, { loop: 'always' });
	const idle = await framesDuring(page, 1000);
	console.log(`[measure] always: ${idle} draw() calls in 1s idle`);
	expect(idle).toBeGreaterThan(30);
});

for (const kind of ['canvas', 'sketch']) {
	test(`'demand' <${kind}> draws nothing while idle and once per bridge change`, async ({
		page
	}) => {
		await open(page, { loop: 'demand', kind });
		const idle = await framesDuring(page, 1000);
		console.log(`[measure] demand (${kind}): ${idle} draw() calls in 1s idle`);
		expect(idle).toBe(0);

		expect(await settledDelta(page, () => page.evaluate(() => window.__demand.setRadius(40)))).toBe(
			1
		);
		const burst = () =>
			page.evaluate(() => {
				for (let r = 41; r < 60; r++) window.__demand.setRadius(r);
			});
		expect(await settledDelta(page, burst)).toBe(1);
		expect(await framesDuring(page, 500)).toBe(0);
	});
}

test("'demand' coalesces invalidate() calls and redraws on resize", async ({ page }) => {
	await open(page, { loop: 'demand' });
	const many = () =>
		page.evaluate(() => {
			for (let i = 0; i < 5; i++) window.__demand.invalidate();
		});
	expect(await settledDelta(page, many)).toBe(1);
	expect(await settledDelta(page, () => page.evaluate(() => window.__demand.resize(260)))).toBe(1);
});

test("'manual' ignores bridge changes and draws on invalidate()", async ({ page }) => {
	await open(page, { loop: 'manual' });
	expect(await settledDelta(page, () => page.evaluate(() => window.__demand.setRadius(40)))).toBe(
		0
	);
	expect(await settledDelta(page, () => page.evaluate(() => window.__demand.invalidate()))).toBe(1);
});
