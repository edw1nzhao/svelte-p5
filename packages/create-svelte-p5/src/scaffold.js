import { cp, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_NAME } from './templates.js';

export const TEMPLATES_DIR = fileURLToPath(new URL('../templates/', import.meta.url));

const STACKBLITZ_BLOCK = /<!-- stackblitz:start -->[\s\S]*?<!-- stackblitz:end -->\n*/g;

/** @param {string} input */
export function toPackageName(input) {
	const name = input
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-._~]/g, '-')
		.replace(/^[._-]+/, '')
		.replace(/-+/g, '-')
		.replace(/-$/, '');
	return name || DEFAULT_NAME;
}

/** @param {string} dir */
export async function isEmptyDir(dir) {
	try {
		const entries = await readdir(dir);
		return entries.every((e) => e === '.git');
	} catch (err) {
		if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') return true;
		throw err;
	}
}

/**
 * Copies a template into `targetDir`, restores dotfiles that npm will not
 * publish, and fills in the project name.
 *
 * @param {{ template: string, targetDir: string, force?: boolean }} opts
 * @returns {Promise<{ name: string, targetDir: string }>}
 */
export async function scaffold({ template, targetDir, force = false }) {
	const target = resolve(targetDir);
	if (!force && !(await isEmptyDir(target))) {
		throw new Error(`Directory ${target} is not empty. Pick another name or pass --force.`);
	}
	const name = toPackageName(basename(target));

	await mkdir(target, { recursive: true });
	await cp(join(TEMPLATES_DIR, template), target, { recursive: true });
	await rename(join(target, '_gitignore'), join(target, '.gitignore'));

	const pkgPath = join(target, 'package.json');
	const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
	await writeFile(pkgPath, `${JSON.stringify({ ...pkg, name }, null, 2)}\n`);

	const readmePath = join(target, 'README.md');
	const readme = await readFile(readmePath, 'utf8');
	await writeFile(readmePath, readme.replaceAll('{{name}}', name).replace(STACKBLITZ_BLOCK, ''));

	return { name, targetDir: target };
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>} relative file paths, sorted
 */
export async function listFiles(dir) {
	const entries = await readdir(dir, { recursive: true, withFileTypes: true });
	return entries
		.filter((e) => e.isFile())
		.map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
		.sort();
}
