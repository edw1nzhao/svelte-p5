#!/usr/bin/env node
/**
 * Generates docs/upgrading.md.
 *
 *   node scripts/build-upgrade-doc.mjs           write the file
 *   node scripts/build-upgrade-doc.mjs --check   exit 1 if it is stale
 *
 * Everything mechanical comes from the npm registry: the version list, release
 * dates, peer ranges, the compatibility matrix, and which published versions
 * carry a broken peer. That last one is *derived*, not a hand-kept list, so a
 * range that ships wrong in future is reported without anyone noticing first.
 *
 * Judgement lives in docs/upgrade-notes.json: what a release means and what a
 * consumer has to do. That file is the only thing to edit by hand.
 */

import { readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/upgrading.md');
const NOTES = join(ROOT, 'docs/upgrade-notes.json');

const PACKAGES = ['svelte-p5', 'svelte-p5-components', 'svelte-p5-viz'];
const CORE = 'svelte-p5';

/** Collapse any run of blank lines the conditional sections leave behind. */
const tidy = (t) => t.replace(/\n{3,}/g, '\n\n');

/** "a", "a and b", "a, b and c" */
const list = (items) =>
	items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

const cmpVersion = (a, b) => {
	const pa = a.split('.').map(Number);
	const pb = b.split('.').map(Number);
	for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
	return 0;
};

async function fetchPackument(name) {
	const res = await fetch(`https://registry.npmjs.org/${name}`);
	if (!res.ok) throw new Error(`registry returned ${res.status} for ${name}`);
	return res.json();
}

/** A peer range is broken if it cannot resolve, or unbounded if it has no ceiling. */
function classifyPeer(range) {
	if (!range) return { state: 'none' };
	if (range.startsWith('workspace:')) return { state: 'broken', why: 'pnpm workspace protocol' };
	const hasCeiling = /<\s*\d/.test(range) || range.startsWith('^') || range.startsWith('~');
	if (!hasCeiling) return { state: 'unbounded', why: 'no upper bound' };
	return { state: 'ok' };
}

function collect(packument) {
	const versions = Object.keys(packument.versions).sort(cmpVersion);
	return versions.map((v) => {
		const m = packument.versions[v];
		const peer = m.peerDependencies?.[CORE];
		return {
			version: v,
			date: (packument.time?.[v] ?? '').split('T')[0],
			peer,
			p5: m.peerDependencies?.p5,
			svelte: m.peerDependencies?.svelte,
			...classifyPeer(peer)
		};
	});
}

function table(rows) {
	if (rows.length === 0) return '';
	const head = Object.keys(rows[0]);
	const line = (cells) => `| ${cells.join(' | ')} |`;
	return [
		line(head),
		line(head.map(() => '---')),
		...rows.map((r) => line(head.map((h) => r[h])))
	].join('\n');
}

function renderCompatibility(data) {
	const rows = [];
	for (const name of PACKAGES) {
		if (name === CORE) continue;
		for (const v of [...data[name]].reverse()) {
			rows.push({
				package: `\`${name}\``,
				version: v.version,
				'requires `svelte-p5`': v.state === 'broken' ? '**broken**' : `\`${v.peer}\``,
				p5: `\`${v.p5}\``,
				svelte: `\`${v.svelte}\``
			});
		}
	}
	return table(rows);
}

function renderKnownBad(data) {
	const broken = [];
	const unbounded = [];
	for (const name of PACKAGES) {
		for (const v of data[name]) {
			if (v.state === 'broken') broken.push(`\`${name}@${v.version}\``);
			if (v.state === 'unbounded') unbounded.push(`\`${name}@${v.version}\``);
		}
	}

	const parts = [];
	if (broken.length) {
		parts.push(
			`### Unresolvable peer range\n\n${broken.join(', ')}\n\nThese were published with \`"${CORE}": "workspace:^"\` in \`peerDependencies\`. \`workspace:\` is a pnpm-internal protocol that \`pnpm pack\` rewrites in \`dependencies\` but not in \`peerDependencies\`, so it reached the registry, where it does not resolve. Yarn 4 fails hardest, crashing during post-resolution validation.\n\nIf you are on any of these, upgrade. There is no workaround short of overriding the peer yourself.`
		);
	}
	if (unbounded.length) {
		parts.push(
			`### Peer range with no upper bound\n\n${unbounded.join(', ')}\n\nThese declare a \`${CORE}\` peer with no ceiling, so they claim compatibility with every future major. Harmless while no incompatible major exists, and worth upgrading away from.`
		);
	}
	return parts.length
		? parts.join('\n\n')
		: '_None. Every published version declares a resolvable, bounded peer range._';
}

function renderNotes(data, notes) {
	const byKey = new Map(notes.map((n) => [`${n.package}@${n.version}`, n]));
	const all = [];
	for (const name of PACKAGES) {
		for (const v of data[name]) all.push({ name, ...v });
	}
	all.sort((a, b) =>
		a.date === b.date ? cmpVersion(b.version, a.version) : b.date.localeCompare(a.date)
	);

	const out = [];
	for (const v of all) {
		const note = byKey.get(`${v.name}@${v.version}`);
		const heading = `### \`${v.name}\` ${v.version} — ${v.date}`;
		if (!note) {
			const flag =
				v.state === 'broken' ? ' Carries the unresolvable peer range described above.' : '';
			out.push(`${heading}\n\nNo consumer-facing change.${flag}`);
			continue;
		}
		const breaking = note.breaking ? '**Breaking.** ' : '';
		out.push(`${heading}\n\n${breaking}${note.summary}\n\n**Action:** ${note.action}`);
	}
	return out.join('\n\n');
}

function render(data, notes) {
	const latest = Object.fromEntries(PACKAGES.map((p) => [p, data[p][data[p].length - 1].version]));
	const stable = PACKAGES.filter((p) => cmpVersion(latest[p], '1.0.0') >= 0);
	const preRelease = PACKAGES.filter((p) => cmpVersion(latest[p], '1.0.0') < 0);

	const current = PACKAGES.map((p) => `**\`${p}\` ${latest[p]}**`).join(', ');

	const caretRule =
		preRelease.length > 0
			? `## The rule that catches everyone

${list(preRelease.map((p) => `\`${p}\``))} ${preRelease.length === 1 ? 'is' : 'are'} still below \`1.0.0\`, and a caret range on a \`0.x\` package pins the **minor**, not the major:

| your range | actually allows | gets the next minor? |
| --- | --- | --- |
| \`^0.2.0\` | \`>=0.2.0 <0.3.0\` | no |
| \`~0.2.0\` | \`>=0.2.0 <0.3.0\` | patches only |

This is correct npm behaviour, not a bug, and it is why an app can sit several releases behind without a single warning. \`npm outdated\` and \`pnpm outdated\` will tell you; \`npm update\` will not move you.

**Every minor release of a 0.x package needs an explicit bump in your \`package.json\`.**

${stable.length ? `\n${list(stable.map((p) => `\`${p}\``))} ${stable.length === 1 ? 'is' : 'are'} at 1.0.0 or above, where a caret range does what you expect and can be left in place.` : ''}`
			: `## Semantic versioning

Every package is at 1.0.0 or above. A caret range does what you expect: minor and patch releases never break a documented API, so \`^1.0.0\` can be left in place and \`pnpm update\` picks up fixes.`;

	return `<!-- GENERATED FILE. Do not edit by hand.
     Run \`pnpm docs:upgrade\` to regenerate.
     Mechanical data comes from the npm registry; prose lives in docs/upgrade-notes.json. -->

# Upgrading

What changed in each release, what you have to do about it, and how to get from any published version to the current one.

Current releases: ${current}.

${caretRule}

## Compatibility

${list(PACKAGES.filter((p) => p !== CORE).map((p) => `\`${p}\``))} declare \`${CORE}\` as a **peer** dependency, so you install it yourself and your package manager will not pick it for you.

${renderCompatibility(data)}

## Known-bad published versions

${renderKnownBad(data)}

## Upgrade notes by version

Newest first. **Action** is what you have to do; anything marked **Breaking** needs a code change.

${renderNotes(data, notes)}

## Getting from where you are to current

There are no required intermediate versions. Unlike a stateful server, a library has no migrations to step through, so you can jump straight to the current release from any earlier one. What you do need is to read every **Breaking** and **Action** note between your version and the target, because they compound.

\`\`\`sh
pnpm add ${PACKAGES.map((p) => `${p}@^${latest[p]}`).join(' ')}
\`\`\`

## Checking what you are on

\`\`\`sh
pnpm ls ${PACKAGES.join(' ')}
pnpm outdated
\`\`\`

If \`pnpm ls\` reports an unmet peer for \`${CORE}\`, you are on one of the broken-peer versions listed above.
`;
}

const check = process.argv.includes('--check');

const notes = JSON.parse(await readFile(NOTES, 'utf8')).notes;
const data = {};
for (const name of PACKAGES) data[name] = collect(await fetchPackument(name));

// Format with the repo's own config so `prettier --check` stays green on a
// generated file.
const raw = tidy(render(data, notes));
const config = await prettier.resolveConfig(OUT);
const body = await prettier.format(raw, { ...config, filepath: OUT });

if (check) {
	const existing = await readFile(OUT, 'utf8').catch(() => '');
	if (existing.trim() !== body.trim()) {
		console.error('docs/upgrading.md is stale. Run `pnpm docs:upgrade` and commit the result.');
		process.exit(1);
	}
	console.log('docs/upgrading.md is up to date.');
} else {
	await writeFile(OUT, body);
	console.log(`Wrote ${OUT}`);
	for (const name of PACKAGES) {
		const bad = data[name].filter((v) => v.state === 'broken' || v.state === 'unbounded');
		if (bad.length) console.log(`  ${name}: ${bad.length} version(s) with a peer-range problem`);
	}
}
