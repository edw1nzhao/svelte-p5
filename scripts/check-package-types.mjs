#!/usr/bin/env node
// Runs attw on each packed tarball. internal-resolution-error is ignored: node16 cannot
// follow the './X.svelte' imports in any Svelte library's declarations; the smoke test covers it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'sp5-attw-'));
let failed = false;

for (const dir of ['core', 'components', 'viz']) {
	const cwd = path.join(root, 'packages', dir);
	const pack = spawnSync('pnpm', ['pack', '--pack-destination', dest], { cwd, encoding: 'utf8' });
	if (pack.status !== 0) throw new Error(pack.stderr);
	const name = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')).name;
	const tarball = fs
		.readdirSync(dest)
		.find((f) => f.startsWith(`${name}-`) && /^\d/.test(f.slice(name.length + 1)));
	const attw = spawnSync(
		path.join(root, 'node_modules/.bin/attw'),
		[
			path.join(dest, tarball),
			'--profile',
			'esm-only',
			'--ignore-rules',
			'internal-resolution-error'
		],
		{ stdio: 'inherit' }
	);
	if (attw.status !== 0) failed = true;
}

fs.rmSync(dest, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
