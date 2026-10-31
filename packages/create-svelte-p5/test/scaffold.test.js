import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../src/cli.js';
import { listFiles, scaffold, toPackageName } from '../src/scaffold.js';

let tmp = '';
beforeEach(async () => {
	tmp = await mkdtemp(join(tmpdir(), 'create-sp5-'));
});
afterEach(() => rm(tmp, { recursive: true, force: true }));

const sink = () => {
	const chunks = /** @type {string[]} */ ([]);
	const stream = new Writable({
		write(chunk, _enc, cb) {
			chunks.push(String(chunk));
			cb();
		}
	});
	return { stream, text: () => chunks.join('') };
};

describe('toPackageName', () => {
	it.each([
		['My Sketch', 'my-sketch'],
		['  ..hidden', 'hidden'],
		['UPPER_case.v2', 'upper_case.v2'],
		['@scope/pkg', 'scope-pkg'],
		['', 'svelte-p5-app'],
		['///', 'svelte-p5-app']
	])('%j -> %j', (input, expected) => {
		expect(toPackageName(input)).toBe(expected);
	});
});

describe('scaffold', () => {
	const common = [
		'.gitignore',
		'README.md',
		'package.json',
		'src/app.d.ts',
		'src/app.html',
		'src/routes/+page.svelte',
		'tsconfig.json',
		'vite.config.ts'
	];

	it.each(['minimal', 'components'])('writes the %s template', async (template) => {
		const dir = join(tmp, 'My App');
		const { name } = await scaffold({ template, targetDir: dir });
		expect(name).toBe('my-app');
		expect(await listFiles(dir)).toEqual(common);

		const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
		expect(pkg.name).toBe('my-app');
		expect('svelte-p5-components' in pkg.dependencies).toBe(template === 'components');

		const readme = await readFile(join(dir, 'README.md'), 'utf8');
		expect(readme).toContain('# my-app');
		expect(readme).not.toMatch(/stackblitz|\{\{name\}\}/i);
		expect(await readFile(join(dir, '.gitignore'), 'utf8')).toContain('node_modules/');
	});

	it('refuses a non-empty directory unless forced', async () => {
		await writeFile(join(tmp, 'keep.txt'), 'x');
		await expect(scaffold({ template: 'minimal', targetDir: tmp })).rejects.toThrow(/not empty/);
		await scaffold({ template: 'minimal', targetDir: tmp, force: true });
		expect(await readFile(join(tmp, 'keep.txt'), 'utf8')).toBe('x');
	});

	it('treats a lone .git directory as empty', async () => {
		await mkdir(join(tmp, '.git'));
		await expect(scaffold({ template: 'minimal', targetDir: tmp })).resolves.toBeDefined();
	});
});

describe('run', () => {
	it('scaffolds non-interactively and prints next steps for the detected manager', async () => {
		const out = sink();
		const code = await run(['demo', '--yes', '-t', 'components'], {
			cwd: tmp,
			env: { npm_config_user_agent: 'pnpm/10.0.0 npm/? node/v24 linux x64' },
			output: out.stream,
			interactive: false
		});
		expect(code).toBe(0);
		expect(out.text()).toMatch(/cd demo\n\s+pnpm install\n\s+pnpm dev/);
		expect(await listFiles(join(tmp, 'demo'))).toContain('src/routes/+page.svelte');
	});

	it('uses defaults when not interactive and no arguments are given', async () => {
		const out = sink();
		expect(await run([], { cwd: tmp, env: {}, output: out.stream, interactive: false })).toBe(0);
		expect(await listFiles(join(tmp, 'svelte-p5-app'))).toContain('package.json');
	});

	it('prompts for a name and template when interactive', async () => {
		const input = new PassThrough();
		const out = sink();
		const done = run([], { cwd: tmp, env: {}, input, output: out.stream, interactive: true });
		input.write('asked\n');
		await new Promise((r) => setTimeout(r, 50));
		input.write('2\n');
		expect(await done).toBe(0);
		const pkg = JSON.parse(await readFile(join(tmp, 'asked', 'package.json'), 'utf8'));
		expect(pkg.dependencies['svelte-p5-components']).toBeDefined();
	});

	it('returns 1 with a message for bad input', async () => {
		const out = sink();
		expect(await run(['-t', 'nope'], { cwd: tmp, output: out.stream, interactive: false })).toBe(1);
		expect(out.text()).toMatch(/Unknown template/);
	});

	it('prints help and version', async () => {
		const out = sink();
		expect(await run(['--help'], { output: out.stream })).toBe(0);
		expect(await run(['--version'], { output: out.stream })).toBe(0);
		expect(out.text()).toMatch(/Usage: create-svelte-p5[\s\S]*\d+\.\d+\.\d+/);
	});
});
