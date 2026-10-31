import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scaffold } from '../../src/scaffold.js';

const exec = promisify(execFile);
const packages = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} cwd
 */
const sh = (cmd, args, cwd) => exec(cmd, args, { cwd, maxBuffer: 64 * 1024 * 1024, shell: false });

let work = '';
/** @type {Record<string, string>} */
const tarballs = {};

beforeAll(async () => {
	work = await mkdtemp(join(tmpdir(), 'create-sp5-it-'));
	for (const pkg of ['core', 'components']) {
		const dest = join(work, 'tarballs');
		await sh('pnpm', ['pack', '--pack-destination', dest], join(packages, pkg));
	}
	for (const file of await readdir(join(work, 'tarballs'))) {
		const key = file.startsWith('svelte-p5-components-') ? 'svelte-p5-components' : 'svelte-p5';
		tarballs[key] = join(work, 'tarballs', file);
	}
});

afterAll(() => rm(work, { recursive: true, force: true }));

describe.each(['minimal', 'components'])('%s template', (template) => {
	it('installs, type-checks and builds against the local packages', async () => {
		const { targetDir } = await scaffold({ template, targetDir: join(work, template) });

		const pkgPath = join(targetDir, 'package.json');
		const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
		for (const [dep, tgz] of Object.entries(tarballs)) {
			if (pkg.dependencies[dep]) pkg.dependencies[dep] = `file:${tgz}`;
		}
		await writeFile(pkgPath, JSON.stringify(pkg, null, 2));

		await sh('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], targetDir);
		await sh('npm', ['run', 'check'], targetDir);
		await sh('npm', ['run', 'build'], targetDir);
		expect((await readdir(join(targetDir, '.svelte-kit', 'output'))).length).toBeGreaterThan(0);
	});
});
