import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: false })],
	test: {
		include: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts'],
		environment: 'happy-dom',
		setupFiles: ['./src/lib/tests/setup.ts']
	},
	resolve: {
		// Svelte 5's `$state` and friends compile against the browser entry;
		// happy-dom is a browser-like env, so tell vitest to use those conditions.
		conditions: ['browser']
	}
});
