#!/usr/bin/env node
// Offline link check: relative paths, #anchors, and svelte-p5.dev/docs/<slug> links. External URLs are not fetched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectMarkdown } from './lib/markdown-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = /^https:\/\/svelte-p5\.dev\/docs(?:\/([^#?]*))?(#.*)?$/;

const slugify = (s) =>
	s
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');

const githubSlug = (s) =>
	s
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s/g, '-');

const stripFences = (text) =>
	text.replace(/^([ \t]*)```[\s\S]*?^\1```[ \t]*$/gm, (m) => m.replace(/[^\n]/g, ''));

const anchorCache = new Map();
function anchorsOf(file) {
	if (anchorCache.has(file)) return anchorCache.get(file);
	const used = new Set();
	const ids = new Set();
	for (const m of stripFences(fs.readFileSync(path.join(root, file), 'utf8')).matchAll(
		/^#{1,6}\s+(.+?)\s*#*\s*$/gm
	)) {
		const text = m[1]
			.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
			.replace(/[`*_]/g, '')
			.replace(/<[^>]+>/g, '');
		let id = slugify(text);
		let n = 1;
		while (used.has(id)) id = `${slugify(text)}-${++n}`;
		used.add(id);
		ids.add(id);
		ids.add(githubSlug(text));
	}
	anchorCache.set(file, ids);
	return ids;
}

const manifest = fs.readFileSync(path.join(root, 'site/src/lib/docs/manifest.ts'), 'utf8');
const slugToFile = new Map(
	[...manifest.matchAll(/slug:\s*'([^']+)'[\s\S]*?file:\s*'([^']+)'/g)].map((m) => [m[1], m[2]])
);

const errors = [];
let checked = 0;
for (const [slug, file] of slugToFile) {
	if (!fs.existsSync(path.join(root, file)))
		errors.push(`site manifest: ${slug} -> missing ${file}`);
}

function checkAnchor(from, line, target, hash) {
	if (!hash) return;
	if (!anchorsOf(target).has(hash.slice(1)))
		errors.push(`${from}:${line}: no heading "${hash}" in ${target}`);
}

for (const file of collectMarkdown(root, { includeRoot: true })) {
	const text = stripFences(fs.readFileSync(path.join(root, file), 'utf8'));
	const links = [];
	text.split('\n').forEach((raw, i) => {
		const line = raw.replace(/`[^`]*`/g, '');
		for (const m of line.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g))
			links.push([i + 1, m[1]]);
		for (const m of line.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/g)) links.push([i + 1, m[1]]);
		for (const m of line.matchAll(/\bhref="([^"]+)"/g)) links.push([i + 1, m[1]]);
	});
	for (const [line, href] of links) {
		checked++;
		const site = SITE.exec(href);
		if (site) {
			const slug = (site[1] ?? '').replace(/\/$/, '');
			if (!slug) continue;
			const target = slugToFile.get(slug);
			if (!target) errors.push(`${file}:${line}: unknown docs page "${slug}"`);
			else checkAnchor(file, line, target, site[2]);
			continue;
		}
		if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) continue;
		const cut = href.indexOf('#');
		const rel = cut < 0 ? href : href.slice(0, cut);
		const hash = cut < 0 ? '' : href.slice(cut);
		if (!rel) {
			checkAnchor(file, line, file, hash);
			continue;
		}
		const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURI(rel)));
		if (target.startsWith('..') || !fs.existsSync(path.join(root, target))) {
			errors.push(`${file}:${line}: broken link ${href}`);
		} else if (hash && target.endsWith('.md')) {
			checkAnchor(file, line, target, hash);
		}
	}
}

console.log(`checked ${checked} links`);
if (errors.length) {
	console.error(`\n${errors.length} broken link(s):`);
	for (const e of errors) console.error(`  ${e}`);
	process.exit(1);
}
