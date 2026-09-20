#!/usr/bin/env node
/**
 * Checks the peer ranges each workspace package declares on its siblings.
 *
 * Three invariants, each of which this repo has broken at least once:
 *
 *   1. No `workspace:` protocol in peerDependencies. `pnpm pack` rewrites the
 *      protocol in dependencies but not in peerDependencies, so it reaches the
 *      registry, where it does not resolve.
 *   2. Every range has an upper bound. A range with no ceiling claims
 *      compatibility with every future major, including ones that will break it.
 *   3. The range admits the sibling's current version. Otherwise a coordinated
 *      release ships a package whose peer its own sibling does not satisfy.
 *
 * Reads only the working tree, so it is deterministic and safe to gate on.
 */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import semver from 'semver';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(ROOT, 'packages');

const dirs = await readdir(PACKAGES_DIR, { withFileTypes: true });
const manifests = [];
for (const d of dirs) {
	if (!d.isDirectory()) continue;
	const file = join(PACKAGES_DIR, d.name, 'package.json');
	try {
		manifests.push({ dir: d.name, ...JSON.parse(await readFile(file, 'utf8')) });
	} catch {
		// Not a package; skip.
	}
}

const versionOf = new Map(manifests.map((m) => [m.name, m.version]));
const problems = [];

for (const m of manifests) {
	for (const [dep, range] of Object.entries(m.peerDependencies ?? {})) {
		const where = `${m.name} -> peerDependencies["${dep}"] = "${range}"`;

		if (range.startsWith('workspace:')) {
			problems.push(`${where}\n    workspace: protocol does not survive publishing.`);
			continue;
		}

		const hasCeiling = /<\s*\d/.test(range) || range.startsWith('^') || range.startsWith('~');
		if (!hasCeiling) {
			problems.push(`${where}\n    No upper bound: claims compatibility with every future major.`);
		}

		// Only siblings can be checked for satisfaction; external peers (p5,
		// svelte) are the consumer's to resolve.
		const siblingVersion = versionOf.get(dep);
		if (siblingVersion && !semver.satisfies(siblingVersion, range, { includePrerelease: true })) {
			problems.push(
				`${where}\n    Does not admit ${dep}@${siblingVersion}, the version in this workspace.`
			);
		}
	}
}

if (problems.length > 0) {
	console.error(`Peer range problems (${problems.length}):\n`);
	for (const p of problems) console.error(`  ${p}\n`);
	console.error('Fix the ranges in the package.json files above.');
	process.exit(1);
}

console.log(`Peer ranges are consistent across ${manifests.length} workspace packages.`);
