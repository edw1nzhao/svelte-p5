import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: false })],
	test: {
		include: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts'],
		environment: 'node'
	},
	resolve: {
		// Tell vitest to use the Svelte 5 browser entry for the `svelte`
		// package when resolving `$state` / `$effect` calls in .svelte.ts files.
		conditions: ['browser']
	}
});
