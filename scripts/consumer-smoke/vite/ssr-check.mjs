import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
	const { render } = await server.ssrLoadModule('svelte/server');
	const { default: Smoke } = await server.ssrLoadModule('/src/smoke/Smoke.svelte');
	console.log(render(Smoke).body);
} finally {
	await server.close();
}
