import { expect, test, type Locator, type Page } from '@playwright/test';

const outlineStyle = (target: Locator) =>
	target.evaluate((element) => getComputedStyle(element).outlineStyle);

async function centre(target: Locator) {
	const box = await target.boundingBox();
	if (!box) throw new Error('target not rendered');
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function open(page: Page) {
	await page.goto('/?component=timeline&selection');
	return {
		track: page.locator('.timeline-track'),
		endHandle: page.locator('.timeline-track__handle--end')
	};
}

test('a key press after dragging a selection handle with the mouse shows no focus outline', async ({
	page
}) => {
	const { endHandle } = await open(page);
	const { x, y } = await centre(endHandle);
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + 30, y, { steps: 4 });
	await page.mouse.up();
	await expect(endHandle).toBeFocused();

	await page.keyboard.press('m');

	expect(await outlineStyle(endHandle)).toBe('none');
});

test('a key press after clicking the rail with the mouse shows no focus outline', async ({
	page
}) => {
	const { track } = await open(page);
	const box = await track.boundingBox();
	if (!box) throw new Error('track not rendered');
	await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
	await expect(track).toBeFocused();

	await page.keyboard.press('m');

	expect(await outlineStyle(track)).toBe('none');
});

test('focus that arrives from the keyboard keeps its outline on the rail and on a handle', async ({
	page
}) => {
	const { track, endHandle } = await open(page);

	await page.keyboard.press('Tab');
	await expect(track).toBeFocused();
	expect(await outlineStyle(track)).toBe('solid');

	await endHandle.focus();
	await page.keyboard.press('Shift+Tab');
	await page.keyboard.press('Tab');
	await expect(endHandle).toBeFocused();
	expect(await outlineStyle(endHandle)).toBe('solid');
});
