import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, type Plugin } from 'vite';

const sizeEntry = process.env.SMOKE_SIZE_ENTRY;

const report: Plugin = {
	name: 'smoke-report',
	generateBundle(_, bundle) {
		const chunks = Object.values(bundle).flatMap((c) =>
			c.type === 'chunk'
				? [{ file: c.fileName, bytes: Buffer.byteLength(c.code), modules: Object.keys(c.modules) }]
				: []
		);
		this.emitFile({ type: 'asset', fileName: 'smoke-report.json', source: JSON.stringify(chunks) });
	}
};

export default defineConfig({
	plugins: [svelte(), ...(sizeEntry ? [report] : [])],
	build: sizeEntry
		? { rollupOptions: { input: `src/size/${sizeEntry}.ts` }, outDir: `dist-size/${sizeEntry}` }
		: {}
});
