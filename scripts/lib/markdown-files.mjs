import fs from 'node:fs';
import path from 'node:path';

const walk = (root, dir) =>
	fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
		const rel = path.posix.join(dir, e.name);
		if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(root, rel);
		return e.name.endsWith('.md') ? [rel] : [];
	});

export function collectMarkdown(root, { includeRoot = true } = {}) {
	const pkgs = fs.readdirSync(path.join(root, 'packages')).map((p) => `packages/${p}/README.md`);
	return [
		...(includeRoot ? ['README.md'] : []),
		...pkgs.filter((f) => fs.existsSync(path.join(root, f))),
		...walk(root, 'docs')
	];
}
