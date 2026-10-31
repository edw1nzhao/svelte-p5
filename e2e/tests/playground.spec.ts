import { expect, test, type Page } from '@playwright/test';

async function shareToken(code: string): Promise<string> {
	const stream = new Blob([code]).stream().pipeThrough(new CompressionStream('deflate-raw'));
	const bytes = Buffer.from(await new Response(stream).arrayBuffer());
	return bytes.toString('base64url');
}

const stage = (page: Page) => page.getByTestId('pg-stage');

async function openPlayground(page: Page, hash = '') {
	await page.goto(`/playground${hash}`);
	await expect(page.locator('.cm-content')).toBeVisible();
}

test('runs the default sketch and reports a syntax error', async ({ page }) => {
	await openPlayground(page);
	await page.getByRole('button', { name: /^Run/ }).click();
	await expect(stage(page).locator('canvas')).toBeVisible();
	await expect(page.getByTestId('pg-status')).toHaveText('Running');

	await page.locator('.cm-content').click();
	await page.keyboard.press('ControlOrMeta+End');
	await page.keyboard.type('\nlet broken = ;');
	await page.keyboard.press('ControlOrMeta+Enter');

	const alert = page.getByRole('alert');
	await expect(alert).toContainText('Syntax error');
	await expect(page.getByTestId('pg-error')).toContainText('SyntaxError');
	await expect(stage(page).locator('canvas')).toBeVisible();
});

test('reports runtime errors with the editor line number', async ({ page }) => {
	const token = await shareToken(
		'p.setup = () => p.createCanvas(50, 50);\np.draw = () => {\n  nope();\n};'
	);
	await openPlayground(page, `#code=${token}`);
	await page.getByRole('button', { name: 'Run shared sketch' }).click();
	await expect(page.getByRole('alert')).toContainText('Runtime error on line 3');
	await expect(page.getByTestId('pg-error')).toContainText('ReferenceError: nope is not defined');
});

test('a shared link loads the sketch but runs it only after Run', async ({ page }) => {
	const code = [
		'window.__playgroundRuns = (window.__playgroundRuns ?? 0) + 1;',
		'p.setup = () => p.createCanvas(100, 100);',
		'p.draw = () => p.background(200);'
	].join('\n');
	await openPlayground(page, `#code=${await shareToken(code)}`);

	await expect(page.getByText('Loaded a shared sketch')).toBeVisible();
	await expect(page.locator('.cm-content')).toContainText('__playgroundRuns');
	await expect(stage(page).locator('canvas')).toHaveCount(0);
	expect(
		await page.evaluate(() => (window as { __playgroundRuns?: number }).__playgroundRuns)
	).toBe(undefined);

	await page.getByRole('button', { name: 'Run shared sketch' }).click();
	await expect(stage(page).locator('canvas')).toBeVisible();
	expect(
		await page.evaluate(() => (window as { __playgroundRuns?: number }).__playgroundRuns)
	).toBe(1);
});

test('Copy link reproduces the current sketch', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await openPlayground(page);
	await page.getByLabel('Example').selectOption('tree');
	await page.getByRole('button', { name: 'Copy link' }).click();
	await expect(page).toHaveURL(/#code=/);
	const url = await page.evaluate(() => navigator.clipboard.readText());
	expect(url).toBe(page.url());

	const fresh = await context.newPage();
	await openPlayground(fresh, new URL(url).hash);
	await expect(fresh.locator('.cm-content')).toContainText('function branch(len, depth)');
	await expect(stage(fresh).locator('canvas')).toHaveCount(0);
	await fresh.getByRole('button', { name: 'Run shared sketch' }).click();
	await expect(stage(fresh).locator('canvas')).toBeVisible();
});

test('?example= opens that example and runs it', async ({ page }) => {
	await page.goto('/playground?example=size-cache');
	await expect(page.locator('.cm-content')).toContainText('caching them in locals');
	await expect(page.getByLabel('Example')).toHaveValue('size-cache');
	await expect(stage(page).locator('canvas')).toBeVisible();
	await expect(page.getByTestId('pg-status')).toHaveText('Running');
});

test('the on-demand example draws only when a control changes, and exports a PNG', async ({
	page
}) => {
	await page.goto('/playground?example=demand');
	await expect(stage(page).locator('canvas')).toBeVisible();
	const frames = page.getByTestId('pg-frames');
	await expect(frames).not.toHaveText('0');
	await page.waitForTimeout(600);
	const idle = await frames.textContent();
	await page.waitForTimeout(1000);
	await expect(frames).toHaveText(idle!);

	await page.getByRole('slider').first().fill('60');
	await expect(frames).toHaveText(String(Number(idle) + 1));

	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Export PNG' }).click();
	expect((await download).suggestedFilename()).toBe('playground-sketch.png');
});

test('a shared on-demand sketch keeps its loop mode and control values', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/playground?example=demand');
	await page.getByRole('slider').first().fill('60');
	await page.getByRole('button', { name: 'Copy link' }).click();
	await expect(page).toHaveURL(/&size=60/);

	const fresh = await context.newPage();
	await openPlayground(fresh, new URL(page.url()).hash);
	await expect(fresh.getByRole('slider').first()).toHaveValue('60');
	await fresh.getByRole('button', { name: 'Run shared sketch' }).click();
	await expect(fresh.getByText('(loop="demand")')).toBeVisible();
	const frames = fresh.getByTestId('pg-frames');
	await expect(frames).not.toHaveText('0');
	await fresh.waitForTimeout(600);
	const idle = await frames.textContent();
	await fresh.waitForTimeout(800);
	await expect(frames).toHaveText(idle!);
});

test('example sketches describe their canvas for screen readers', async ({ page }) => {
	await page.goto('/playground?example=tree');
	await expect(
		stage(page).locator('canvas [role="region"][aria-label="Canvas Description"]')
	).toHaveText('A recursive branching tree whose branches bend with the mouse position.');
});
