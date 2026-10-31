// Renders site/static/og.svg to og.png with the site's own fonts.
// Run: pnpm --filter @svelte-p5/e2e exec node scripts/render-og.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const site = fileURLToPath(new URL('../../site/', import.meta.url));
const font = (pkg, file) =>
	readFileSync(`${site}node_modules/@fontsource-variable/${pkg}/files/${file}`).toString('base64');

const html = `<!doctype html><style>
@font-face { font-family: Inter; font-weight: 100 900;
  src: url(data:font/woff2;base64,${font('inter', 'inter-latin-wght-normal.woff2')}) format('woff2'); }
@font-face { font-family: SFMono-Regular; font-weight: 100 900;
  src: url(data:font/woff2;base64,${font('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2')}) format('woff2'); }
body { margin: 0; }
</style>${readFileSync(`${site}static/og.svg`, 'utf8').replace(/^<\?xml[^>]*>/, '')}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${site}static/og.png` });
await browser.close();
