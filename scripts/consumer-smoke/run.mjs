#!/usr/bin/env node
// Installs packed tarballs into fresh apps outside the workspace, then checks, builds and SSRs them.
// Flags: --app kit|vite|all  --p5 2|1.11  --pm npm|bun  --no-size
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const arg = (name, fallback) => {
	const i = process.argv.indexOf(`--${name}`);
	return i === -1 ? fallback : process.argv[i + 1];
};
const apps = arg('app', 'all') === 'all' ? ['kit', 'vite'] : [arg('app')];
const p5 = arg('p5', '2');
const pm = arg('pm', 'npm');
const measureSize = !process.argv.includes('--no-size');
const label = `${apps.join('+')} / p5 ${p5} / ${pm}`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp5-smoke-'));
const t0 = Date.now();
const lap = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
const log = (msg) => console.log(`[smoke ${label}] ${lap()} ${msg}`);

function run(cmd, args, cwd, env = {}) {
	const r = spawnSync(cmd, args, {
		cwd,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
		env: { ...process.env, ...env }
	});
	if (r.status !== 0) {
		console.error(r.stdout, r.stderr);
		throw new Error(`${cmd} ${args.join(' ')} failed in ${cwd}`);
	}
	return r.stdout;
}

const tarballs = {};
const packDir = path.join(tmp, 'tarballs');
for (const [name, dir] of [
	['svelte-p5', 'core'],
	['svelte-p5-components', 'components'],
	['svelte-p5-viz', 'viz']
]) {
	const out = run(
		'pnpm',
		['pack', '--pack-destination', packDir],
		path.join(root, 'packages', dir)
	);
	void out;
	const file = fs
		.readdirSync(packDir)
		.find((f) => f.startsWith(`${name}-`) && /^\d/.test(f.slice(name.length + 1)));
	tarballs[name] = path.join(packDir, file);
}
log(`packed ${Object.keys(tarballs).join(', ')}`);

function scaffold(app) {
	const dir = path.join(tmp, `${app}-p5-${p5}`);
	fs.cpSync(path.join(here, app), dir, { recursive: true });
	const smoke = app === 'kit' ? 'src/lib/smoke' : 'src/smoke';
	fs.cpSync(path.join(here, 'shared'), path.join(dir, smoke), { recursive: true });
	const pkgPath = path.join(dir, 'package.json');
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
	for (const [name, tgz] of Object.entries(tarballs)) pkg.dependencies[name] = `file:${tgz}`;
	if (p5 === '1.11') {
		pkg.dependencies.p5 = '~1.11.0';
		pkg.devDependencies['@types/p5'] = '^1.7.7';
	}
	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
	return dir;
}

const install =
	pm === 'bun'
		? ['bun', ['install']]
		: ['npm', ['install', '--no-audit', '--no-fund', '--loglevel=error']];
const script = (name) => (pm === 'bun' ? ['bun', ['run', name]] : ['npm', ['run', name]]);

function assertSurface(html, where) {
	const m = /data-surface="([^"]*)"/.exec(html);
	if (!m) throw new Error(`${where}: SSR output has no surface JSON`);
	const surface = JSON.parse(m[1].replaceAll('&quot;', '"').replaceAll('&#34;', '"'));
	const must = {
		'svelte-p5': ['P5Canvas', 'createP5Bridge', 'disableFES'],
		'svelte-p5/utils': ['disableFES', 'createColorCache'],
		'svelte-p5-components': ['Sketch', 'FPSMonitor', 'DraggableWindow'],
		'svelte-p5-components/youtube': ['youTubePort'],
		'svelte-p5-viz': ['createPanelRegistry', 'createSceneState']
	};
	for (const [entry, names] of Object.entries(must))
		for (const n of names)
			if (!surface[entry]?.includes(n)) throw new Error(`${where}: ${entry} lacks ${n}`);
	if (!html.includes('data-testid="smoke"')) throw new Error(`${where}: page markup missing`);
}

async function kitSsr(dir) {
	const port = 4300 + Math.floor(Math.random() * 500);
	const [cmd, args] = script('preview');
	const server = spawn(
		cmd,
		[...args, '--', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
		{
			cwd: dir,
			detached: true,
			stdio: ['ignore', 'pipe', 'pipe']
		}
	);
	let output = '';
	server.stdout.on('data', (d) => (output += d));
	server.stderr.on('data', (d) => (output += d));
	try {
		for (let i = 0; i < 60; i++) {
			try {
				const res = await fetch(`http://127.0.0.1:${port}/`);
				const html = await res.text();
				if (res.status !== 200) throw new Error(`SSR returned ${res.status}\n${output}`);
				assertSurface(html, 'kit');
				return;
			} catch (e) {
				if (!String(e.cause?.code ?? e).includes('ECONNREFUSED') && !/fetch failed/.test(String(e)))
					throw e;
				await new Promise((r) => setTimeout(r, 500));
			}
		}
		throw new Error(`preview never came up\n${output}`);
	} finally {
		process.kill(-server.pid);
	}
}

const gz = (s) => zlib.gzipSync(s).length;

function sizeReport(dir) {
	const rows = {};
	const entries = ['disable-fes', 'disable-fes-utils', 'p5canvas', 'fps-monitor', 'all'];
	for (const entry of entries) {
		run('npx', ['vite', 'build', '--logLevel', 'error'], dir, { SMOKE_SIZE_ENTRY: entry });
		const out = path.join(dir, 'dist-size', entry);
		const chunks = JSON.parse(fs.readFileSync(path.join(out, 'smoke-report.json'), 'utf8'));
		const app = chunks.filter((c) => !c.modules.some((m) => /node_modules\/p5\//.test(m)));
		const modules = app.flatMap((c) => c.modules).filter((m) => /node_modules\/svelte-p5/.test(m));
		const bytes = app.reduce((n, c) => n + c.bytes, 0);
		const gzip = app.reduce((n, c) => n + gz(fs.readFileSync(path.join(out, c.file))), 0);
		rows[entry] = {
			bytes,
			gzip,
			p5Chunk: chunks.length > app.length,
			modules: modules.map((m) => m.replace(/^.*node_modules\//, ''))
		};
	}
	return rows;
}

function assertTreeShaking(rows) {
	const has = (entry, re) => rows[entry].modules.some((m) => re.test(m));
	const fail = (msg) => {
		throw new Error(`tree-shaking: ${msg}\n${JSON.stringify(rows, null, 2)}`);
	};
	for (const entry of ['disable-fes', 'disable-fes-utils']) {
		const extra = rows[entry].modules.filter((m) => !/dist\/utils\/disableFES\.js$/.test(m));
		if (extra.length) fail(`${entry} pulled in ${extra.join(', ')}`);
		if (rows[entry].p5Chunk) fail(`${entry} bundled p5`);
	}
	if (has('p5canvas', /fontAtlas|colorCache|hitTest|createP5Bridge/))
		fail('P5Canvas pulled in unrelated utils');
	if (has('fps-monitor', /DraggableWindow|neodrag|Timeline/)) fail('FPSMonitor pulled in windows');
	if (has('fps-monitor', /neodrag/) || rows['fps-monitor'].p5Chunk)
		fail('FPSMonitor pulled in p5/neodrag');
}

const results = [];
for (const app of apps) {
	const start = Date.now();
	const dir = scaffold(app);
	log(`${app}: installing`);
	run(...install, dir);
	const installed = JSON.parse(
		fs.readFileSync(path.join(dir, 'node_modules/p5/package.json'), 'utf8')
	).version;
	const hasTypes = fs.existsSync(path.join(dir, 'node_modules/@types/p5'));
	if (hasTypes !== (p5 === '1.11')) throw new Error(`unexpected @types/p5 state for p5 ${p5}`);
	log(`${app}: p5 ${installed}${hasTypes ? ' + @types/p5' : ''}; check`);
	run(...script('check'), dir);
	log(`${app}: build`);
	run(...script('build'), dir);
	log(`${app}: server render`);
	if (app === 'kit') await kitSsr(dir);
	else assertSurface(run('node', ['ssr-check.mjs'], dir), 'vite');
	let size;
	if (app === 'vite' && measureSize && p5 === '2') {
		log('vite: bundle size');
		size = sizeReport(dir);
		assertTreeShaking(size);
	}
	results.push({ app, p5: installed, seconds: (Date.now() - start) / 1000, size });
}

const lines = [`### Consumer smoke (${label})`, '', '| app | p5 | seconds |', '|---|---|---|'];
for (const r of results) lines.push(`| ${r.app} | ${r.p5} | ${r.seconds.toFixed(0)} |`);
for (const r of results.filter((x) => x.size)) {
	lines.push('', '| import | bytes | gzip | svelte-p5 modules |', '|---|---|---|---|');
	for (const [k, v] of Object.entries(r.size))
		lines.push(`| ${k} | ${v.bytes} | ${v.gzip} | ${v.modules.length} |`);
}
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY)
	fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');

if (!process.env.KEEP_SMOKE) fs.rmSync(tmp, { recursive: true, force: true });
else console.log(`kept ${tmp}`);
log('done');
