import type { Handle } from '@sveltejs/kit';

// Preload CSS/JS (SvelteKit default) plus the Latin woff2 variants only.
// fontsource ships a dozen subsets per family (Cyrillic, Greek, Vietnamese…),
// and <link rel="preload"> bypasses the unicode-range lazy-load trick —
// preloading "font" without filtering would download ~300 KiB of fonts the
// page will never render. Narrowing to Latin keeps this to ~88 KiB.
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		preload: ({ type, path }) => {
			if (type === 'js' || type === 'css') return true;
			if (type === 'font') return /-latin-wght-normal\.[\w-]+\.woff2$/.test(path);
			return false;
		}
	});
