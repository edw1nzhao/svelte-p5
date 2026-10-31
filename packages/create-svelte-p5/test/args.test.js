import { describe, expect, it } from 'vitest';
import { parseCliArgs } from '../src/args.js';
import { detectPackageManager, nextSteps } from '../src/pm.js';

describe('parseCliArgs', () => {
	it('reads the directory and flags', () => {
		expect(parseCliArgs(['my-app', '-t', 'components', '--force', '-y'])).toMatchObject({
			dir: 'my-app',
			template: 'components',
			force: true,
			yes: true
		});
	});

	it('leaves everything undefined or false by default', () => {
		expect(parseCliArgs([])).toEqual({
			dir: undefined,
			template: undefined,
			force: false,
			yes: false,
			help: false,
			version: false
		});
	});

	it('rejects an unknown template', () => {
		expect(() => parseCliArgs(['--template', 'nope'])).toThrow(/Unknown template "nope"/);
	});

	it('rejects a second directory', () => {
		expect(() => parseCliArgs(['a', 'b'])).toThrow(/at most one directory/);
	});

	it('rejects unknown flags', () => {
		expect(() => parseCliArgs(['--bogus'])).toThrow();
	});
});

describe('detectPackageManager', () => {
	it.each([
		['pnpm/10.0.0 npm/? node/v24.0.0 linux x64', 'pnpm'],
		['yarn/4.1.0 npm/? node/v24.0.0 linux x64', 'yarn'],
		['bun/1.2.0 npm/? node/v24.0.0 linux x64', 'bun'],
		['npm/11.0.0 node/v24.0.0 linux x64', 'npm'],
		['deno/2.0.0', 'npm'],
		[undefined, 'npm']
	])('%s -> %s', (ua, expected) => {
		expect(detectPackageManager(ua)).toBe(expected);
	});
});

describe('nextSteps', () => {
	it('prints install and dev per manager', () => {
		expect(nextSteps('npm', 'app')).toEqual(['cd app', 'npm install', 'npm run dev']);
		expect(nextSteps('pnpm', 'app')).toEqual(['cd app', 'pnpm install', 'pnpm dev']);
		expect(nextSteps('yarn', null)).toEqual(['yarn', 'yarn dev']);
		expect(nextSteps('bun', null)).toEqual(['bun install', 'bun run dev']);
	});

	it('quotes directories with spaces', () => {
		expect(nextSteps('npm', 'my app')[0]).toBe('cd "my app"');
	});
});
