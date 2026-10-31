import { defineConfig, devices } from '@playwright/test';

const port = 4181;
const sitePort = 4182;
const siteSpec = /playground\.spec\.ts/;

export default defineConfig({
	testDir: './tests',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? [['github'], ['list']] : 'list',
	projects: [
		{
			name: 'harness',
			testIgnore: siteSpec,
			use: {
				...devices['Desktop Chrome'],
				baseURL: `http://127.0.0.1:${port}`,
				deviceScaleFactor: 2
			}
		},
		{
			name: 'site',
			testMatch: siteSpec,
			use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${sitePort}` }
		}
	],
	webServer: [
		{
			command: `vite preview --host 127.0.0.1 --port ${port} --strictPort`,
			url: `http://127.0.0.1:${port}`,
			reuseExistingServer: !process.env.CI
		},
		{
			command: `pnpm exec vite preview --host 127.0.0.1 --port ${sitePort} --strictPort`,
			cwd: '../site',
			url: `http://127.0.0.1:${sitePort}/playground`,
			reuseExistingServer: !process.env.CI
		}
	]
});
