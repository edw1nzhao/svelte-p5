#!/usr/bin/env node
// Extracts ts/js/svelte fences from the docs and type-checks them with svelte-check.
// Markers go on the last non-blank line before a fence:
//   <!-- snippet: skip (reason) -->   do not check this fence
//   <!-- snippet: declare <ts> -->    stubs for names the fragment assumes, e.g.
//                                     const sketch = stub<(p: P5) => void>();
// A first line `// name.ext` saves the fence as that file so later fences can import it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectMarkdown } from './lib/markdown-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = { ts: 'ts', typescript: 'ts', js: 'js', javascript: 'js', svelte: 'svelte' };
const SKIP = /^<!--\s*snippet:\s*skip\s*\((.+)\)\s*-->$/;
const DECLARE = /^<!--\s*snippet:\s*declare\s+(.+?)\s*-->$/;
const HELPERS = "type P5 = import('p5').default; const stub = <T,>() => undefined as unknown as T;";
// Minimal stand-ins for third-party packages the docs mention but the repo does not install.
const AMBIENT = `declare namespace YT {
	class Player {
		getCurrentTime(): number;
		getDuration(): number;
		seekTo(seconds: number, allowSeekAhead: boolean): void;
		playVideo(): void;
		pauseVideo(): void;
		addEventListener(event: string, listener: (e: { data: number }) => void): void;
		removeEventListener(event: string, listener: (e: { data: number }) => void): void;
	}
}
declare module 'd3-scale' {
	interface Scale<D> { (v: D): number; domain(d: D[]): this; range(r: number[]): this }
	export function scaleLinear(): Scale<number>;
	export function scaleTime(): Scale<Date>;
}
`;
const keep = process.argv.includes('--keep');

const snippets = [];
const skipped = [];
// The root README joins this check once its p5 2 setup() arrow is fixed.
for (const file of collectMarkdown(root)) {
	const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
	for (let i = 0; i < lines.length; i++) {
		const open = /^(\s*)```(\w+)/.exec(lines[i]);
		if (!open) continue;
		let end = i + 1;
		while (end < lines.length && !/^\s*```\s*$/.test(lines[end])) end++;
		const lang = LANGS[open[2]];
		let before = i - 1;
		while (before > 0 && !lines[before].trim()) before--;
		const prev = before >= 0 ? lines[before].trim() : '';
		const marker = SKIP.exec(prev);
		const declare = DECLARE.exec(prev)?.[1] ?? '';
		if (lang) {
			const where = `${file}:${i + 1}`;
			if (marker) skipped.push({ where, reason: marker[1] });
			else {
				const code = lines.slice(i + 1, end).join('\n');
				snippets.push({ file, line: i + 1, lang, code, declare });
			}
		}
		i = end;
	}
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-snippets-'));
const resolveFrom = (pkg, dep) =>
	fs.realpathSync(path.join(root, 'packages', pkg, 'node_modules', dep));
fs.mkdirSync(path.join(tmp, 'node_modules', '@testing-library'), { recursive: true });
const links = {
	'svelte-p5': path.join(root, 'packages/core'),
	'svelte-p5-components': path.join(root, 'packages/components'),
	'svelte-p5-viz': path.join(root, 'packages/viz'),
	p5: resolveFrom('core', 'p5'),
	svelte: resolveFrom('core', 'svelte'),
	vitest: resolveFrom('components', 'vitest'),
	'@testing-library/svelte': resolveFrom('components', '@testing-library/svelte')
};
for (const [name, target] of Object.entries(links)) {
	fs.symlinkSync(target, path.join(tmp, 'node_modules', name), 'dir');
}

// JS fences cannot annotate parameters, so they skip noImplicitAny; ts and svelte stay strict.
const projects = { strict: { noImplicitAny: true }, js: { noImplicitAny: false } };
for (const [name, extra] of Object.entries(projects)) {
	fs.mkdirSync(path.join(tmp, name, 'src'), { recursive: true });
	fs.writeFileSync(path.join(tmp, name, 'src', 'ambient.d.ts'), AMBIENT);
	fs.writeFileSync(
		path.join(tmp, name, 'tsconfig.json'),
		JSON.stringify({
			extends: path.join(root, 'tsconfig.base.json'),
			compilerOptions: {
				allowJs: true,
				checkJs: true,
				noEmit: true,
				types: ['p5'],
				verbatimModuleSyntax: false,
				noUncheckedIndexedAccess: false,
				allowImportingTsExtensions: true,
				...extra
			},
			include: ['src/**/*']
		})
	);
}

const byGenerated = new Map();
snippets.forEach((s, n) => {
	let ext = s.lang;
	let code = s.code;
	const named = /^\/\/ ([\w.-]+\.(?:svelte\.ts|ts|js))\s*$/.exec(code.split('\n')[0] ?? '');
	if (ext !== 'svelte') {
		if (/\$(state|derived|effect|props)\b/.test(code) && ext === 'ts') ext = 'svelte.ts';
		if (!/^\s*(import|export)\b/m.test(code)) code += '\nexport {};';
	}
	if (s.declare) {
		code =
			ext === 'svelte'
				? `<script module lang="ts">${HELPERS} ${s.declare}</script>${code}`
				: `${HELPERS} ${s.declare} ${code}`;
	}
	const dir = path.join(tmp, ext === 'js' ? 'js' : 'strict', 'src', s.file.replace(/[^\w]/g, '_'));
	fs.mkdirSync(dir, { recursive: true });
	const file = named ? named[1] : `s${String(n).padStart(3, '0')}.${ext}`;
	fs.writeFileSync(path.join(dir, file), code);
	byGenerated.set(path.join(dir, file), s);
});

const problems = [];
let broken = false;
for (const name of Object.keys(projects)) {
	const workspace = path.join(tmp, name);
	const run = spawnSync(
		'pnpm',
		[
			'--filter',
			'svelte-p5',
			'exec',
			'svelte-check',
			'--workspace',
			workspace,
			'--tsconfig',
			path.join(workspace, 'tsconfig.json'),
			'--output',
			'machine'
		],
		{ cwd: root, encoding: 'utf8' }
	);
	for (const line of (run.stdout || '').split('\n')) {
		const m = /^\d+ ERROR "([^"]+)" (\d+):(\d+) "(.*)"$/.exec(line);
		if (!m) continue;
		const snippet = byGenerated.get(path.resolve(workspace, m[1]));
		const where = snippet ? `${snippet.file}:${snippet.line + Number(m[2])}` : `${m[1]}:${m[2]}`;
		problems.push(`${where}: ${m[4]}`);
	}
	if (run.status !== 0 && !problems.length) {
		console.error(run.stdout, run.stderr);
		broken = true;
	}
}

if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
else console.log(`kept ${tmp}`);

console.log(`checked ${snippets.length} snippets, skipped ${skipped.length}`);
for (const s of skipped) console.log(`  skip ${s.where}: ${s.reason}`);
if (broken) process.exit(1);
if (problems.length) {
	console.error(`\n${problems.length} snippet error(s):`);
	for (const p of problems) console.error(`  ${p}`);
	process.exit(1);
}
