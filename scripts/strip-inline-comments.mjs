#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { parse, compile } = createRequire(path.join(root, 'packages/core/package.json'))(
	'svelte/compiler'
);

const DIRECTIVES = [
	['ts-directive', /@ts-(expect-error|ignore|nocheck|check)\b/],
	['eslint', /\beslint(-disable|-enable)?\b|^\/\*\s*global\s/],
	['stylelint', /\bstylelint-(disable|enable)/],
	['prettier', /prettier-ignore/],
	['svelte-ignore', /svelte-ignore\b/],
	['svelte-pragma', /@sveltejs\/|@component\b/],
	['bundler', /@vite-ignore|[@#]__(PURE|NO_SIDE_EFFECTS)__|webpack[A-Z]/],
	['coverage', /\b(v8|c8|istanbul)\s+ignore\b/],
	['vitest', /@vitest-environment/],
	['triple-slash', /^\/\/\/\s*<(reference|amd)/],
	['licence', /^\/\*!|@license\b|@preserve\b/]
];

function classify(text) {
	if (text.startsWith('/**') && text !== '/**/') return 'jsdoc';
	for (const [name, re] of DIRECTIVES) if (re.test(text)) return name;
	return null;
}

function isJSDocNode(node) {
	return node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode;
}

function scriptKind(file) {
	return /\.[cm]?js$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
}

function leaves(code, kind) {
	const sf = ts.createSourceFile('x', code, ts.ScriptTarget.Latest, true, kind);
	const out = [];
	const visit = (node) => {
		if (isJSDocNode(node)) return;
		const kids = node.getChildren(sf);
		if (kids.length === 0) out.push(node);
		else kids.forEach(visit);
	};
	visit(sf);
	return { sf, leaves: out };
}

export function tokenStream(code, kind) {
	const { sf, leaves: ls } = leaves(code, kind);
	return ls.map((n) => `${ts.SyntaxKind[n.kind]}:${n.getText(sf)}`);
}

function jsComments(code, kind, offset = 0) {
	const found = new Map();
	for (const leaf of leaves(code, kind).leaves) {
		const ranges = [
			...(ts.getLeadingCommentRanges(code, leaf.pos) ?? []),
			...(ts.getTrailingCommentRanges(code, leaf.pos) ?? [])
		];
		const emptyBlock =
			leaf.kind === ts.SyntaxKind.CloseBraceToken &&
			ts.isBlock(leaf.parent) &&
			leaf.parent.statements.length === 0;
		for (const r of ranges)
			found.set(r.pos + offset, {
				pos: r.pos + offset,
				end: r.end + offset,
				lang: 'js',
				emptyBlock
			});
	}
	return [...found.values()];
}

function cssComments(code, start, end) {
	const out = [];
	let i = start;
	while (i < end) {
		const c = code[i];
		if (c === '\\') i += 2;
		else if (c === '"' || c === "'") {
			i++;
			while (i < end && code[i] !== c) i += code[i] === '\\' ? 2 : 1;
			i++;
		} else if (c === '/' && code[i + 1] === '*') {
			const close = code.indexOf('*/', i + 2);
			if (close === -1 || close + 2 > end) throw new Error(`unterminated CSS comment at ${i}`);
			out.push({ pos: i, end: close + 2, lang: 'css' });
			i = close + 2;
		} else i++;
	}
	return out;
}

function walkTemplate(node, out, skip) {
	if (!node || typeof node !== 'object' || skip.has(node)) return;
	if (Array.isArray(node)) {
		for (const n of node) walkTemplate(n, out, skip);
		return;
	}
	if (node.type === 'Comment' && typeof node.data === 'string') {
		out.push({ pos: node.start, end: node.end, lang: 'html' });
		return;
	}
	for (const [key, value] of Object.entries(node)) {
		if (key !== 'loc' && key !== 'metadata') walkTemplate(value, out, skip);
	}
}

function scriptBlocks(ast) {
	return [ast.module, ast.instance].filter(Boolean).map((s) => s.content);
}

function svelteComments(code) {
	const ast = parse(code, { modern: true });
	const blocks = scriptBlocks(ast);
	const inBlock = (pos) => blocks.some((b) => pos >= b.start && pos < b.end);
	const out = [];
	for (const b of blocks) {
		const fromTs = jsComments(code.slice(b.start, b.end), ts.ScriptKind.TS, b.start);
		const fromSvelte = ast.comments.filter((c) => c.start >= b.start && c.end <= b.end);
		const tsSet = new Set(fromTs.map((c) => `${c.pos}-${c.end}`));
		const svSet = new Set(fromSvelte.map((c) => `${c.start}-${c.end}`));
		if (tsSet.size !== svSet.size || [...tsSet].some((k) => !svSet.has(k)))
			throw new Error('TypeScript and Svelte disagree on script comments');
		out.push(...fromTs);
	}
	for (const c of ast.comments)
		if (!inBlock(c.start)) out.push({ pos: c.start, end: c.end, lang: 'js' });
	walkTemplate(ast.fragment, out, new Set());
	for (const c of out)
		if (c.lang === 'html' && !code.startsWith('<!--', c.pos))
			throw new Error(`template comment at ${c.pos} does not start with <!--`);
	if (ast.css) out.push(...cssComments(code, ast.css.content.start, ast.css.content.end));
	return out.sort((a, b) => a.pos - b.pos);
}

export function findComments(file, code) {
	const all = file.endsWith('.svelte')
		? svelteComments(code)
		: jsComments(code, scriptKind(file)).sort((a, b) => a.pos - b.pos);
	return all.map((c) => {
		const text = code.slice(c.pos, c.end);
		return { ...c, text, keep: classify(text) ?? (c.emptyBlock ? 'empty-block' : null) };
	});
}

const isBlank = (s) => /^[ \t]*$/.test(s);

function mergeSameLine(code, ranges) {
	const merged = [];
	for (const r of ranges) {
		const last = merged.at(-1);
		if (last && last.lang === r.lang && isBlank(code.slice(last.end, r.pos))) last.end = r.end;
		else merged.push({ ...r });
	}
	return merged;
}

export function strip(code, ranges) {
	let out = '';
	let cursor = 0;
	for (const r of mergeSameLine(code, ranges)) {
		out += code.slice(cursor, r.pos);
		const lineStartOut = out.lastIndexOf('\n') + 1;
		const nl = code.indexOf('\n', r.end);
		const lineEnd = nl === -1 ? code.length : nl;
		const prefixBlank = isBlank(out.slice(lineStartOut));
		const suffixBlank = isBlank(code.slice(r.end, lineEnd));
		if (prefixBlank && suffixBlank) {
			out = out.slice(0, lineStartOut);
			cursor = nl === -1 ? code.length : nl + 1;
		} else if (suffixBlank) {
			out = out.replace(/[ \t]+$/, '');
			cursor = lineEnd;
		} else if (prefixBlank) {
			cursor = r.end;
			while (code[cursor] === ' ' || code[cursor] === '\t') cursor++;
		} else {
			const before = out.at(-1);
			const after = code[r.end];
			if (r.lang === 'js' && !/\s/.test(before) && !/\s/.test(after)) out += ' ';
			cursor = r.end;
		}
	}
	return out + code.slice(cursor);
}

function walk(dir, out) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== 'node_modules' && entry.name !== 'tests') walk(full, out);
		} else if (
			/\.(ts|js|svelte)$/.test(entry.name) &&
			!/\.test\./.test(entry.name) &&
			!entry.name.endsWith('.d.ts')
		)
			out.push(full);
	}
	return out;
}

export function sourceFiles() {
	const pkgs = path.join(root, 'packages');
	return fs
		.readdirSync(pkgs)
		.map((p) => path.join(pkgs, p, 'src'))
		.filter((d) => fs.existsSync(d))
		.flatMap((d) => walk(d, []))
		.sort();
}

function gitShow(ref, rel) {
	try {
		return execFileSync('git', ['show', `${ref}:${rel}`], { cwd: root, encoding: 'utf8' });
	} catch {
		return null;
	}
}

function compileAll(file, code) {
	const out = {};
	for (const generate of ['client', 'server']) {
		const r = compile(code, { filename: file, generate, css: 'external', dev: false });
		out[`${generate}.js`] = r.js.code;
		out[`${generate}.css`] = r.css?.code ?? '';
	}
	return out;
}

function sameArray(a, b) {
	return a.length === b.length && a.every((x, i) => x === b[i]);
}

function cssWithoutComments(code) {
	return strip(code, cssComments(code, 0, code.length))
		.split('\n')
		.filter((line) => !isBlank(line));
}

function sameApartFromComments(key, before, after) {
	if (key.endsWith('.css')) return sameArray(cssWithoutComments(before), cssWithoutComments(after));
	return sameArray(tokenStream(before, ts.ScriptKind.JS), tokenStream(after, ts.ScriptKind.JS));
}

function emptyReport() {
	return { tokens: { checked: 0, identical: 0, failed: [] }, compile: [], other: [] };
}

function compareFile(report, rel, before, after) {
	if (before === after) return;
	if (!/\.(ts|js|svelte)$/.test(rel)) {
		report.other.push(rel);
		return;
	}
	const units = [];
	if (rel.endsWith('.svelte')) {
		const [b, a] = [before, after].map((c) =>
			scriptBlocks(parse(c, { modern: true })).map((s) => c.slice(s.start, s.end))
		);
		if (b.length !== a.length) report.tokens.failed.push(`${rel}: script block count`);
		b.forEach((code, i) => units.push([`${rel}#script${i}`, code, a[i] ?? '', ts.ScriptKind.TS]));
	} else units.push([rel, before, after, scriptKind(rel)]);
	for (const [name, b, a, kind] of units) {
		report.tokens.checked++;
		if (sameArray(tokenStream(b, kind), tokenStream(a, kind))) report.tokens.identical++;
		else report.tokens.failed.push(name);
	}
	if (rel.endsWith('.svelte')) {
		const [cb, ca] = [compileAll(rel, before), compileAll(rel, after)];
		const entry = { file: rel, byteIdentical: [], differs: [] };
		for (const key of Object.keys(cb)) {
			if (cb[key] === ca[key]) entry.byteIdentical.push(key);
			else
				entry.differs.push({
					output: key,
					commentOnly: sameApartFromComments(key, cb[key], ca[key])
				});
		}
		report.compile.push(entry);
	}
}

function prove(ref) {
	const report = emptyReport();
	for (const file of sourceFiles()) {
		const rel = path.relative(root, file);
		const before = gitShow(ref, rel);
		if (before !== null) compareFile(report, rel, before, fs.readFileSync(file, 'utf8'));
	}
	return report;
}

function listTree(dir, base = dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) listTree(full, base, out);
		else out.push(path.relative(base, full));
	}
	return out;
}

function compareDirs(beforeDir, afterDir) {
	const report = emptyReport();
	const [b, a] = [listTree(beforeDir), listTree(afterDir)];
	report.onlyBefore = b.filter((f) => !a.includes(f));
	report.onlyAfter = a.filter((f) => !b.includes(f));
	for (const rel of b.filter((f) => a.includes(f)))
		compareFile(
			report,
			rel,
			fs.readFileSync(path.join(beforeDir, rel), 'utf8'),
			fs.readFileSync(path.join(afterDir, rel), 'utf8')
		);
	return report;
}

function failed(report) {
	return (
		report.tokens.failed.length > 0 ||
		report.other.length > 0 ||
		(report.onlyBefore?.length ?? 0) > 0 ||
		(report.onlyAfter?.length ?? 0) > 0 ||
		report.compile.some((c) => c.differs.some((d) => !d.commentOnly))
	);
}

function main() {
	const args = process.argv.slice(2);
	const refIndex = args.indexOf('--prove');
	const dirsIndex = args.indexOf('--compare-dirs');
	if (refIndex !== -1 || dirsIndex !== -1) {
		const report =
			refIndex !== -1
				? prove(args[refIndex + 1] ?? 'HEAD')
				: compareDirs(args[dirsIndex + 1], args[dirsIndex + 2]);
		console.log(JSON.stringify(report, null, '\t'));
		process.exit(failed(report) ? 1 : 0);
	}
	const check = args.includes('--check');
	const list = args.includes('--list');
	const kept = {};
	const perFile = [];
	for (const file of sourceFiles()) {
		const code = fs.readFileSync(file, 'utf8');
		const comments = findComments(file, code);
		for (const c of comments) if (c.keep) kept[c.keep] = (kept[c.keep] ?? 0) + 1;
		const drop = comments.filter((c) => !c.keep);
		if (drop.length === 0) continue;
		const rel = path.relative(root, file);
		perFile.push([rel, drop.length]);
		if (list) for (const c of drop) console.log(`${rel}:${c.pos} [${c.lang}] ${c.text}`);
		if (!check && !list) fs.writeFileSync(file, strip(code, drop));
	}
	if (list) return;
	for (const [rel, n] of perFile) console.log(`${check ? 'has' : 'stripped'} ${n}\t${rel}`);
	console.log(`kept ${JSON.stringify(kept)}`);
	if (check && perFile.length > 0) process.exit(1);
}

main();
