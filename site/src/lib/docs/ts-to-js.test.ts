import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { stripTypes, svelteToJs, toJavaScript } from './ts-to-js';

describe('stripTypes', () => {
	it('removes parameter annotations', () => {
		expect(stripTypes('const f = (p: p5) => p.draw();')).toBe('const f = (p) => p.draw();');
	});

	it('removes variable annotations', () => {
		expect(stripTypes('let instance: p5 | null = null;')).toBe('let instance = null;');
	});

	it('removes return-type annotations', () => {
		expect(stripTypes('function f(): void {}')).toBe('function f() {}');
	});

	it('removes type arguments at call sites', () => {
		expect(stripTypes('let x = $state<p5 | null>(null);')).toBe('let x = $state(null);');
		expect(stripTypes('const c = createColorCache<string>();')).toBe(
			'const c = createColorCache();'
		);
	});

	it('removes generic parameter lists on declarations', () => {
		expect(stripTypes('export function f<T extends object>(x: T) { return x; }')).toBe(
			'export function f(x) { return x; }'
		);
	});

	it('drops type-only import lines entirely, leaving no blank line', () => {
		const src = [
			"import { P5Canvas } from 'svelte-p5';",
			"import type p5 from 'p5';",
			'',
			'f();'
		].join('\n');
		expect(stripTypes(src)).toBe(["import { P5Canvas } from 'svelte-p5';", '', 'f();'].join('\n'));
	});

	it('drops inline type specifiers but keeps value imports', () => {
		expect(stripTypes("import { P5Canvas, type SketchFn } from 'svelte-p5';")).toBe(
			"import { P5Canvas } from 'svelte-p5';"
		);
	});

	it('removes interface and type-alias declarations', () => {
		const src = ['interface Point {\n\tx: number;\n}', '', 'const a = 1;'].join('\n');
		expect(stripTypes(src)).toBe('\nconst a = 1;');
	});

	it('removes as-casts and non-null assertions', () => {
		expect(stripTypes('const ctx = p.drawingContext as CanvasRenderingContext2D;')).toBe(
			'const ctx = p.drawingContext;'
		);
		expect(stripTypes('const el = document.getElementById("x")!;')).toBe(
			'const el = document.getElementById("x");'
		);
	});

	// Regression: a type annotation nested inside a type argument used to
	// suppress the cut for the surrounding <...>, leaving `f<{ id }>(…)` —
	// which is still valid JS (comparison operators), so it slipped past the
	// output parse check.
	it('removes a type argument containing its own annotations', () => {
		expect(
			stripTypes('const ui = createP5Bridge<{ hoveredId: string | null }>({ id: null });')
		).toBe('const ui = createP5Bridge({ id: null });');
	});

	it('preserves formatting: tabs, blank lines, and comments', () => {
		const src = [
			'const sketch = (p: p5) => {',
			'\t// a comment',
			'',
			'\tp.setup = () => {',
			'\t\tp.createCanvas(400, 300);',
			'\t};',
			'};'
		].join('\n');
		expect(stripTypes(src)).toBe(src.replace('(p: p5)', '(p)'));
	});

	it('returns null when there is no TypeScript to remove', () => {
		expect(stripTypes('const f = (p) => p.draw();')).toBeNull();
	});

	it('returns null for constructs it cannot erase safely', () => {
		expect(stripTypes('enum Mode { A, B }')).toBeNull();
		expect(stripTypes('class A { constructor(private x: string) {} }')).toBeNull();
	});

	it('returns null rather than mangling code that does not parse', () => {
		expect(stripTypes('const = = = ;')).toBeNull();
	});
});

describe('svelteToJs', () => {
	it('drops lang="ts" and strips the script body, leaving markup alone', () => {
		const src = [
			'<script lang="ts">',
			"\timport { P5Canvas } from 'svelte-p5';",
			"\timport type p5 from 'p5';",
			'',
			'\tlet instance = $state<p5 | null>(null);',
			'</script>',
			'',
			'<P5Canvas {sketch} bind:instance />'
		].join('\n');

		expect(svelteToJs(src)).toBe(
			[
				'<script>',
				"\timport { P5Canvas } from 'svelte-p5';",
				'',
				'\tlet instance = $state(null);',
				'</script>',
				'',
				'<P5Canvas {sketch} bind:instance />'
			].join('\n')
		);
	});

	// The reason this module doesn't use ts.transpileModule: TypeScript sees a
	// component imported only for markup as unused and elides the import.
	it('keeps imports that are only referenced from markup', () => {
		const out = svelteToJs(
			[
				'<script lang="ts">',
				"\timport { P5Canvas } from 'svelte-p5';",
				'</script>',
				'',
				'<P5Canvas />'
			].join('\n')
		);
		expect(out).toContain("import { P5Canvas } from 'svelte-p5';");
	});

	it('returns null when there is no lang="ts" block', () => {
		expect(svelteToJs('<script>\n\tlet a = 1;\n</script>')).toBeNull();
	});
});

/**
 * Sweep every code fence in the real docs. Any block we offer a JS tab for has
 * to parse as JavaScript and contain no leftover TypeScript — this is the test
 * that would catch a transform that works on toy input but not on the corpus
 * readers actually see.
 */
describe('the docs corpus', () => {
	const root = resolve(__dirname, '../../../..');
	const docFiles: string[] = [];
	for (const dir of ['docs', 'docs/recipes']) {
		for (const f of readdirSync(join(root, dir))) {
			if (f.endsWith('.md')) docFiles.push(join(dir, f));
		}
	}

	const blocks: { file: string; lang: string; body: string }[] = [];
	for (const file of docFiles) {
		const src = readFileSync(join(root, file), 'utf8');
		for (const m of src.matchAll(/^```(\w+)\n([\s\S]*?)^```/gm)) {
			const [, lang, body] = m;
			if (lang === 'ts' || lang === 'svelte') blocks.push({ file, lang: lang!, body: body! });
		}
	}

	it('finds code blocks to check', () => {
		expect(blocks.length).toBeGreaterThan(20);
	});

	it('has no TypeScript hiding in a plain <script> block', () => {
		const offenders = blocks
			.filter((b) => b.lang === 'svelte')
			.filter((b) => /<script>[\s\S]*?(import type |: p5\b|\$state<|as [A-Z])/.test(b.body))
			.map((b) => b.file);
		expect(offenders).toEqual([]);
	});

	it('produces parseable JavaScript with no residual types', () => {
		const failures: string[] = [];

		for (const { file, lang, body } of blocks) {
			const js = toJavaScript(body, lang);
			if (js === null) continue;

			const scripts =
				lang === 'svelte'
					? [...js.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]!)
					: [js];

			for (const code of scripts) {
				const sf = ts.createSourceFile(
					'x.js',
					code,
					ts.ScriptTarget.Latest,
					true,
					ts.ScriptKind.JS
				);
				const diagnostics = (sf as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] })
					.parseDiagnostics;
				if (diagnostics && diagnostics.length > 0) {
					failures.push(`${file}: does not parse as JS`);
				}
				for (const marker of ['import type ', 'lang="ts"', ': p5)', '$state<', ' as any']) {
					if (code.includes(marker)) failures.push(`${file}: residual TypeScript (${marker})`);
				}
			}
		}

		expect(failures).toEqual([]);
	});
});
