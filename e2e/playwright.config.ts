import { defineConfig, devices } from '@playwright/test';

const port = 4181;

export default defineConfig({
	testDir: './tests',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? [['github'], ['list']] : 'list',
	use: {
		...devices['Desktop Chrome'],
		baseURL: `http://127.0.0.1:${port}`,
		deviceScaleFactor: 2
	},
	webServer: {
		command: `vite preview --host 127.0.0.1 --port ${port} --strictPort`,
		url: `http://127.0.0.1:${port}`,
		reuseExistingServer: !process.env.CI
	}
});
