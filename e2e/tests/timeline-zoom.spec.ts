import { expect, test, type Page } from '@playwright/test';

async function trackBox(page: Page) {
	await page.goto('/?component=timeline');
	const box = await page.locator('.timeline-track').boundingBox();
	if (!box) throw new Error('timeline track not rendered');
	return box;
}

const at = (box: { x: number; width: number }, fraction: number) => box.x + box.width * fraction;

test('dragging the rail of a zoomable <TimelineTrack> zooms to the dragged range', async ({
	page
}) => {
	const box = await trackBox(page);
	const y = box.y + box.height / 2;
	await page.mouse.move(at(box, 0.25), y);
	await page.mouse.down();
	await page.mouse.move(at(box, 0.5), y, { steps: 5 });
	await expect(page.locator('.timeline-track__zoom-region')).toBeVisible();
	await page.mouse.move(at(box, 0.75), y, { steps: 5 });
	await page.mouse.up();

	const state = await page.evaluate(() => window.__timeline);
	expect(state.view?.start).toBeCloseTo(25, 0);
	expect(state.view?.end).toBeCloseTo(75, 0);
	expect(state.currentTime).toBe(10);
	await expect(page.locator('.timeline-track__zoom-region')).toHaveCount(0);
	await expect(page.locator('.timeline-track__playhead')).toHaveCount(0);
});

test('a click on a zoomed rail seeks in view time', async ({ page }) => {
	const box = await trackBox(page);
	const y = box.y + box.height / 2;
	await page.mouse.move(at(box, 0.25), y);
	await page.mouse.down();
	await page.mouse.move(at(box, 0.75), y, { steps: 5 });
	await page.mouse.up();
	await page.mouse.click(at(box, 0.5), y);

	const state = await page.evaluate(() => window.__timeline);
	expect(state.currentTime).toBeCloseTo(50, 0);
	expect(state.view?.start).toBeCloseTo(25, 0);
});
