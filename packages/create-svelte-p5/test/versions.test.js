import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import semver from 'semver';
import { describe, expect, it } from 'vitest';

/** @param {string} rel */
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
/** @param {string} rel */
const json = (rel) => JSON.parse(read(rel));

const core = json('../../core/package.json');
const components = json('../../components/package.json');
const site = json('../../../site/package.json');
const catalog = Object.fromEntries(
	[...read('../../../pnpm-workspace.yaml').matchAll(/^ {2}'?([^':\s]+)'?:\s*(\S+)\s*$/gm)].map(
		(m) => [m[1], m[2]]
	)
);

const templatesDir = new URL('../templates/', import.meta.url);
const templates = readdirSync(templatesDir);

describe.each(templates)('template %s', (name) => {
	const pkg = json(`../templates/${name}/package.json`);
	const deps = { ...pkg.dependencies, ...pkg.devDependencies };

	it('has no workspace: or catalog: specifiers', () => {
		for (const [dep, range] of Object.entries(deps)) {
			expect(range, dep).not.toMatch(/^(workspace|catalog):/);
		}
	});

	it('has a dev script', () => {
		expect(pkg.scripts.dev).toBeTruthy();
	});

	it('tracks the current svelte-p5 packages', () => {
		for (const [dep, current] of [
			['svelte-p5', core.version],
			['svelte-p5-components', components.version]
		]) {
			if (!deps[dep]) continue;
			expect(semver.satisfies(current, deps[dep]), `${dep} ${deps[dep]} vs ${current}`).toBe(true);
			expect(semver.minVersion(deps[dep])?.major, dep).toBe(semver.major(current));
		}
	});

	it('uses a p5 inside the range svelte-p5 supports', () => {
		expect(semver.subset(deps.p5, core.peerDependencies.p5), deps.p5).toBe(true);
		expect(semver.satisfies(semver.minVersion(catalog.p5) ?? '', deps.p5)).toBe(true);
	});

	it('matches the toolchain versions the workspace builds with', () => {
		for (const dep of [
			'svelte',
			'vite',
			'svelte-check',
			'typescript',
			'@sveltejs/vite-plugin-svelte'
		]) {
			expect(
				semver.intersects(deps[dep], catalog[dep]),
				`${dep} ${deps[dep]} vs ${catalog[dep]}`
			).toBe(true);
		}
		const kit = site.devDependencies['@sveltejs/kit'];
		expect(semver.intersects(deps['@sveltejs/kit'], kit), '@sveltejs/kit').toBe(true);
	});
});

describe.each(templates)('StackBlitz link for %s', (name) => {
	it('points at this template directory', () => {
		const url = `https://stackblitz.com/github/edw1nzhao/svelte-p5/tree/main/packages/create-svelte-p5/templates/${name}`;
		expect(read(`../templates/${name}/README.md`)).toContain(`(${url})`);
		expect(read('../../../docs/getting-started.md')).toContain(`(${url})`);
	});
});
