import { expect, test, type Page } from '@playwright/test';
import type { E2EState } from '../src/state.js';

const CONTAINER = { width: 320, height: 200 };
const DEVICE_SCALE = 2;

async function load(page: Page, query: Record<string, string>): Promise<E2EState> {
	await page.goto(`/?${new URLSearchParams(query)}`);
	await page.waitForFunction(() => window.__e2e?.frames >= 5);
	const state = await page.evaluate(() => window.__e2e);
	test.skip(
		query.setup === 'async' && p5Major(state) < 2,
		'p5 1.x does not await an async setup()'
	);
	return state;
}

function p5Major(state: E2EState): number {
	return Number(state.p5Version.split('.')[0]);
}

const setups = ['sync', 'async', 'none'] as const;
const densities = [
	{ hidpi: 'true', density: DEVICE_SCALE },
	{ hidpi: '3', density: 3 },
	{ hidpi: 'false', density: 1 }
];

for (const setup of setups) {
	for (const { hidpi, density } of densities) {
		test(`<Sketch> setup=${setup} hidpi=${hidpi} fills its container on the first frame`, async ({
			page
		}) => {
			const state = await load(page, { component: 'sketch', setup, hidpi });
			expect(state.firstFrame).toEqual({
				cssWidth: CONTAINER.width,
				cssHeight: CONTAINER.height,
				backingWidth: CONTAINER.width * density,
				backingHeight: CONTAINER.height * density,
				density
			});
			expect(state.readyCount).toBe(1);
			const expected = setup === 'none' ? ['ready', 'draw'] : ['setup', 'ready', 'draw'];
			expect(state.events).toEqual(expected);
		});
	}

	test(`<P5Canvas> setup=${setup} fires onReady once, after setup`, async ({ page }) => {
		const state = await load(page, { component: 'canvas', setup });
		expect(state.readyCount).toBe(1);
		const expected = setup === 'none' ? ['ready', 'draw'] : ['setup', 'ready', 'draw'];
		expect(state.events).toEqual(expected);
		expect(state.firstFrame?.cssWidth).toBe(100);
		expect(state.firstFrame?.cssHeight).toBe(100);
	});
}

for (const fes of ['on', 'off'] as const) {
	test(`friendly errors are ${fes === 'off' ? 'silenced by' : 'reported without'} disableFES()`, async ({
		page
	}) => {
		const messages: string[] = [];
		page.on('console', (msg) => messages.push(msg.text()));
		const state = await load(page, { component: 'canvas', setup: 'sync', fes });
		test.skip(p5Major(state) < 2, 'the p5 1.x npm build ships without the FES');
		const friendly = messages.filter((m) => m.includes('p5.js says'));
		if (fes === 'off') {
			expect(state.disableFriendlyErrors).toBe(true);
			expect(friendly).toEqual([]);
		} else {
			expect(friendly.length).toBeGreaterThan(0);
		}
	});
}
