import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: false })],
	test: {
		include: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts'],
		environment: 'node'
	},
	resolve: {
		// Use Svelte's browser entry so $state calls in .svelte.ts files
		// resolve without failing at import time in Node.
		conditions: ['browser']
	}
});
