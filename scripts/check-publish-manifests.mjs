#!/usr/bin/env node
// Fails when npm would normalize a package.json on publish (e.g. drop a `./`-prefixed `bin`),
// so the published manifest always matches the one in the repo. Offline: runs `npm pkg fix` on a copy.

import { copyFile, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(ROOT, 'packages');

const problems = [];
for (const d of await readdir(PACKAGES_DIR, { withFileTypes: true })) {
	if (!d.isDirectory()) continue;
	const source = join(PACKAGES_DIR, d.name, 'package.json');
	const scratch = await mkdtemp(join(tmpdir(), 'pkg-fix-'));
	try {
		await copyFile(source, join(scratch, 'package.json'));
		const run = spawnSync('npm', ['pkg', 'fix'], { cwd: scratch, encoding: 'utf8' });
		if (run.status !== 0) {
			problems.push(`${d.name}: npm pkg fix failed\n${run.stderr}`);
			continue;
		}
		const before = JSON.parse(await readFile(source, 'utf8'));
		const after = JSON.parse(await readFile(join(scratch, 'package.json'), 'utf8'));
		for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
			if (!isDeepStrictEqual(before[key], after[key])) {
				problems.push(
					`${d.name}: "${key}" ${JSON.stringify(before[key])} -> ${JSON.stringify(after[key])}`
				);
			}
		}
	} finally {
		await rm(scratch, { recursive: true, force: true });
	}
}

if (problems.length) {
	console.error(`npm would rewrite these manifests on publish:\n  ${problems.join('\n  ')}`);
	console.error('\nRun `npm pkg fix` in the package and commit the result.');
	process.exit(1);
}
console.log('npm would not rewrite any package manifest on publish.');
