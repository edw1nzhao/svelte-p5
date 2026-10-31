import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const paths = ['/', '/docs', '/docs/getting-started', '/docs/perf-comparison', '/playground'];
const widths = { desktop: 1280, phone: 375 };

for (const colorScheme of ['light', 'dark'] as const) {
	for (const [name, width] of Object.entries(widths)) {
		for (const path of paths) {
			test(`${path} has no WCAG 2.2 A/AA violations (${name}, ${colorScheme})`, async ({
				page
			}) => {
				// The site's fade-ins skip under reduced motion; otherwise axe sees invisible content.
				await page.emulateMedia({ reducedMotion: 'reduce', colorScheme });
				await page.setViewportSize({ width, height: 800 });
				await page.goto(path);
				await page.evaluate(() => document.fonts.ready);
				const { violations } = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
					.analyze();
				expect(
					violations.map((v) => ({
						id: v.id,
						nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' '))
					}))
				).toEqual([]);
			});
		}
	}
}
