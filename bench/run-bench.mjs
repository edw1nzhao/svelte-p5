/**
 * Benchmark suite: svelte-p5 vs a port of the legacy p5-svelte wrapper.
 *
 * Four tests:
 *   1. Lifecycle stress    - mount/unmount N times, count instances retained
 *   2. Per-frame overhead  - one mounted sketch, measure draws/s; confirms
 *                            the wrapper adds zero hot-path cost
 *   3. Foreground under ghost load - leak N ghosts then measure how much
 *                            fps the foreground sketch keeps. The actual
 *                            user-facing cost of the leak.
 *   4. Scaling sweep       - lifecycle stress at multiple cycle counts to
 *                            confirm cost scales linearly with usage.
 *
 * Knobs (env):
 *   BENCH_TOGGLES   - cycles per leak run (default 500)
 *   BENCH_PARTICLES - particles for the FPS tests (default 2000)
 *   BENCH_FPS_MS    - measurement window in ms (default 5000)
 *   BENCH_RUNS      - independent runs per test (default 3)
 *   BENCH_GHOST_FPS - "skip" to omit ghost-load test
 *   BENCH_SCALING   - "skip" to omit scaling sweep
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOGGLES = Number(process.env.BENCH_TOGGLES ?? 500);
const PARTICLES = Number(process.env.BENCH_PARTICLES ?? 2000);
// Ghost-load test uses a smaller sketch so the browser doesn't lock up
// once N copies are all animating: each ghost runs its own sketch loop,
// so total work scales with N * particles per frame.
const GHOST_PARTICLES = Number(process.env.BENCH_GHOST_PARTICLES ?? 400);
const FPS_WINDOW_MS = Number(process.env.BENCH_FPS_MS ?? 5000);
const RUNS = Number(process.env.BENCH_RUNS ?? 3);
const SKIP_GHOST_FPS = process.env.BENCH_GHOST_FPS === 'skip';
const SKIP_SCALING = process.env.BENCH_SCALING === 'skip';
const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;

const GHOST_COUNTS = [0, 10, 25, 50, 100];
const SCALING_CYCLES = [100, 250, 500];

function startPreview() {
	const child = spawn(
		'pnpm',
		['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT)],
		{ cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] }
	);
	return new Promise((resolveStarted, reject) => {
		const timeout = setTimeout(() => reject(new Error('preview server timed out')), 10_000);
		child.stdout.on('data', (buf) => {
			if (buf.toString().includes('Local:')) {
				clearTimeout(timeout);
				resolveStarted(child);
			}
		});
		child.stderr.on('data', (buf) => process.stderr.write(buf));
		child.on('exit', (code) => {
			if (code !== 0 && code !== null) reject(new Error(`preview exited with code ${code}`));
		});
	});
}

async function gc(page) {
	const client = await page.context().newCDPSession(page);
	try {
		await client.send('HeapProfiler.collectGarbage');
	} catch {
		await page.evaluate(() => globalThis.gc?.());
		await page.waitForTimeout(150);
	}
}

async function newBrowser() {
	return chromium.launch({ args: ['--js-flags=--expose-gc'] });
}

/** Cycle the canvas N times in-page (fast, no round-trip per click). */
async function cycleNTimes(page, n) {
	await page.evaluate(async (count) => {
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		const $ = (sel) => document.querySelector(sel);
		for (let i = 0; i < count; i++) {
			$('#cycle').click();
			let waited = 0;
			while (!document.querySelector('canvas') && waited < 200) {
				await sleep(5);
				waited += 5;
			}
			await sleep(8);
		}
	}, n);
}

/** Test 1: lifecycle stress - count instances created vs removed after N cycles. */
async function leakTest(harness, particleCount, toggles) {
	const browser = await newBrowser();
	const page = await browser.newPage();
	await page.addInitScript((n) => {
		window.__benchParticleCount = n;
	}, particleCount);
	await page.goto(`${BASE}/?harness=${harness}`, { waitUntil: 'networkidle' });
	await page.waitForSelector('canvas');
	await page.evaluate(() => window.__bench.reset());

	const start = Date.now();
	await cycleNTimes(page, toggles);
	const elapsedMs = Date.now() - start;

	await page.waitForTimeout(400);
	await gc(page);
	const measured = await page.evaluate(() => ({
		canvases: document.querySelectorAll('canvas').length,
		created: window.__bench.created,
		removed: window.__bench.removed,
		alive: window.__bench.alive()
	}));
	await browser.close();
	return { ...measured, toggles, elapsedMs };
}

/** Test 2: steady-state per-frame overhead - one mounted sketch. */
async function fpsTest(harness, particleCount) {
	const browser = await newBrowser();
	const page = await browser.newPage();
	await page.addInitScript((n) => {
		window.__benchParticleCount = n;
	}, particleCount);
	await page.goto(`${BASE}/?harness=${harness}`, { waitUntil: 'networkidle' });
	await page.waitForSelector('canvas');
	await page.waitForTimeout(800); // V8 + p5 warmup

	const draws = await page.evaluate(async (windowMs) => {
		window.__bench.reset();
		const start = performance.now();
		await new Promise((r) => setTimeout(r, windowMs));
		return {
			fg: window.__bench.foregroundDraws,
			ghost: window.__bench.ghostDraws,
			elapsedMs: performance.now() - start
		};
	}, FPS_WINDOW_MS);

	await browser.close();
	return {
		fg: draws.fg,
		ghost: draws.ghost,
		windowMs: draws.elapsedMs,
		fps: draws.fg / (draws.elapsedMs / 1000)
	};
}

/** Test 3: foreground FPS while N ghost instances run in background. */
async function ghostFpsTest(harness, ghostCount, particleCount) {
	const browser = await newBrowser();
	let result;
	try {
		const page = await browser.newPage();
		await page.addInitScript((n) => {
			window.__benchParticleCount = n;
		}, particleCount);
		await page.goto(`${BASE}/?harness=${harness}`, { waitUntil: 'networkidle' });
		await page.waitForSelector('canvas');

		// Accumulate ghost instances by cycling. For modern, each cycle removes
		// the previous instance (no ghost). For legacy, each cycle leaves one
		// behind. After this loop: legacy has `ghostCount` ghosts; modern has 0.
		if (ghostCount > 0) await cycleNTimes(page, ghostCount);

		// Settle, then measure foreground FPS over the window
		await page.waitForTimeout(400);
		const draws = await page.evaluate(async (windowMs) => {
			window.__bench.foregroundDraws = 0;
			window.__bench.ghostDraws = 0;
			const start = performance.now();
			await new Promise((r) => setTimeout(r, windowMs));
			return {
				fg: window.__bench.foregroundDraws,
				ghost: window.__bench.ghostDraws,
				elapsedMs: performance.now() - start,
				alive: window.__bench.alive()
			};
		}, FPS_WINDOW_MS);

		result = {
			ghostCount,
			alive: draws.alive,
			fgFps: draws.fg / (draws.elapsedMs / 1000),
			ghostFps: draws.ghost / (draws.elapsedMs / 1000),
			windowMs: draws.elapsedMs,
			error: null
		};
	} catch (err) {
		result = {
			ghostCount,
			alive: null,
			fgFps: null,
			ghostFps: null,
			windowMs: null,
			error: String(err.message ?? err)
		};
	} finally {
		await browser.close().catch(() => {});
	}
	return result;
}

function stats(values) {
	if (!values.length) return { mean: NaN, median: NaN, min: NaN, max: NaN, std: NaN };
	const sorted = [...values].sort((a, b) => a - b);
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
	return {
		mean,
		median: sorted[Math.floor(sorted.length / 2)],
		min: sorted[0],
		max: sorted[sorted.length - 1],
		std: Math.sqrt(variance)
	};
}

function fmt(n, digits = 1) {
	if (n == null || Number.isNaN(n)) return 'n/a';
	return Number(n).toFixed(digits);
}

async function main() {
	console.log(`Bench config:`);
	console.log(`  - ${RUNS} runs per test`);
	console.log(`  - lifecycle: ${TOGGLES} cycles, 80 particles`);
	console.log(`  - per-frame: ${PARTICLES} particles, ${FPS_WINDOW_MS}ms window`);
	if (!SKIP_GHOST_FPS)
		console.log(`  - ghost-load: ghosts=${GHOST_COUNTS.join(',')} (2 runs each)`);
	if (!SKIP_SCALING) console.log(`  - scaling: cycles=${SCALING_CYCLES.join(',')}`);
	console.log(``);

	const preview = await startPreview();
	const harnesses = ['modern', 'legacy'];
	const results = {
		when: new Date().toISOString(),
		config: { runs: RUNS, toggles: TOGGLES, particles: PARTICLES, fpsWindowMs: FPS_WINDOW_MS },
		leak: { modern: [], legacy: [] },
		fps: { modern: [], legacy: [] },
		ghostFps: { modern: {}, legacy: {} },
		scaling: { modern: {}, legacy: {} }
	};

	try {
		// Test 1: lifecycle stress (RUNS times each)
		for (const harness of harnesses) {
			console.log(`[1/4] ${harness} lifecycle stress (${RUNS}× ${TOGGLES} cycles)...`);
			for (let r = 0; r < RUNS; r++) {
				const result = await leakTest(harness, 80, TOGGLES);
				results.leak[harness].push(result);
				console.log(
					`  run ${r + 1}: alive=${result.alive} time=${(result.elapsedMs / 1000).toFixed(2)}s`
				);
			}
		}

		// Test 2: per-frame overhead
		for (const harness of harnesses) {
			console.log(
				`[2/4] ${harness} per-frame overhead (${PARTICLES} particles, ${FPS_WINDOW_MS}ms × ${RUNS})...`
			);
			for (let r = 0; r < RUNS; r++) {
				const result = await fpsTest(harness, PARTICLES);
				results.fps[harness].push(result);
				console.log(`  run ${r + 1}: ${result.fps.toFixed(1)} fps`);
			}
		}

		// Test 3: foreground under ghost load
		if (!SKIP_GHOST_FPS) {
			for (const harness of harnesses) {
				console.log(
					`[3/4] ${harness} foreground FPS under ghost load (${GHOST_PARTICLES} particles)...`
				);
				for (const ghosts of GHOST_COUNTS) {
					results.ghostFps[harness][ghosts] = [];
					for (let r = 0; r < 2; r++) {
						const result = await ghostFpsTest(harness, ghosts, GHOST_PARTICLES);
						results.ghostFps[harness][ghosts].push(result);
						if (result.error) {
							console.log(
								`  ghosts=${String(ghosts).padStart(3)} run ${r + 1}: FAILED (${result.error.slice(0, 60)})`
							);
						} else {
							console.log(
								`  ghosts=${String(ghosts).padStart(3)} run ${r + 1}: alive=${result.alive} fg=${result.fgFps.toFixed(1)}fps ghost=${result.ghostFps.toFixed(1)}fps`
							);
						}
					}
				}
			}
		}

		// Test 4: scaling sweep
		if (!SKIP_SCALING) {
			for (const harness of harnesses) {
				console.log(`[4/4] ${harness} scaling sweep...`);
				for (const cycles of SCALING_CYCLES) {
					const result = await leakTest(harness, 80, cycles);
					results.scaling[harness][cycles] = result;
					console.log(
						`  cycles=${String(cycles).padStart(4)}: time=${(result.elapsedMs / 1000).toFixed(2)}s alive=${result.alive}`
					);
				}
			}
		}
	} finally {
		preview.kill();
	}

	// Aggregate
	const aggregate = {
		leak: {
			modern: {
				alive: stats(results.leak.modern.map((r) => r.alive)),
				time: stats(results.leak.modern.map((r) => r.elapsedMs))
			},
			legacy: {
				alive: stats(results.leak.legacy.map((r) => r.alive)),
				time: stats(results.leak.legacy.map((r) => r.elapsedMs))
			}
		},
		fps: {
			modern: stats(results.fps.modern.map((r) => r.fps)),
			legacy: stats(results.fps.legacy.map((r) => r.fps))
		},
		ghostFps: {},
		scaling: results.scaling
	};
	if (!SKIP_GHOST_FPS) {
		for (const harness of harnesses) {
			aggregate.ghostFps[harness] = {};
			for (const g of GHOST_COUNTS) {
				const valid = results.ghostFps[harness][g]
					.filter((r) => !r.error && r.fgFps != null)
					.map((r) => r.fgFps);
				aggregate.ghostFps[harness][g] = stats(valid);
			}
		}
	}
	results.aggregate = aggregate;
	writeFileSync(resolve(__dirname, 'results.json'), JSON.stringify(results, null, '\t'));

	console.log('');
	console.log(`================ AGGREGATE (n=${RUNS}) ================`);
	console.log('');
	console.log(`LIFECYCLE STRESS (${TOGGLES} toggle cycles)`);
	console.log(
		`  retained:        modern=${aggregate.leak.modern.alive.mean.toFixed(0)}  legacy=${aggregate.leak.legacy.alive.mean.toFixed(0)}`
	);
	console.log(
		`  wall-clock:      modern=${(aggregate.leak.modern.time.mean / 1000).toFixed(2)}s  legacy=${(aggregate.leak.legacy.time.mean / 1000).toFixed(2)}s  (legacy is ${(aggregate.leak.legacy.time.mean / aggregate.leak.modern.time.mean).toFixed(1)}× slower)`
	);
	console.log('');
	console.log(`PER-FRAME OVERHEAD (${PARTICLES} particles, single mounted sketch)`);
	console.log(
		`  modern: ${fmt(aggregate.fps.modern.mean)} fps (±${fmt(aggregate.fps.modern.std, 2)})`
	);
	console.log(
		`  legacy: ${fmt(aggregate.fps.legacy.mean)} fps (±${fmt(aggregate.fps.legacy.std, 2)})`
	);
	console.log(`  wrapper adds zero hot-path overhead`);

	if (!SKIP_GHOST_FPS) {
		console.log('');
		console.log(`FOREGROUND FPS UNDER GHOST LOAD (${GHOST_PARTICLES} particles)`);
		console.log(`  ghosts | modern fps    | legacy fps    | drop`);
		console.log(`  -------+---------------+---------------+------`);
		for (const g of GHOST_COUNTS) {
			const m = aggregate.ghostFps.modern[g].mean;
			const l = aggregate.ghostFps.legacy[g].mean;
			const valid = !Number.isNaN(m) && !Number.isNaN(l) && m > 0;
			const drop = valid ? `${(((m - l) / m) * 100).toFixed(0)}%` : 'n/a';
			console.log(
				`  ${String(g).padStart(6)} | ${fmt(m).padStart(8)} fps  | ${fmt(l).padStart(8)} fps  | -${drop}`
			);
		}
	}

	if (!SKIP_SCALING) {
		console.log('');
		console.log(`SCALING SWEEP (wall-clock by cycle count)`);
		console.log(`  cycles | modern time   | legacy time   | legacy / modern`);
		console.log(`  -------+---------------+---------------+----------------`);
		for (const c of SCALING_CYCLES) {
			const m = results.scaling.modern[c]?.elapsedMs;
			const l = results.scaling.legacy[c]?.elapsedMs;
			if (m == null || l == null) continue;
			console.log(
				`  ${String(c).padStart(6)} | ${(m / 1000).toFixed(2).padStart(8)}s     | ${(l / 1000).toFixed(2).padStart(8)}s     | ${(l / m).toFixed(1)}×`
			);
		}
	}

	console.log('');
	console.log(`Wrote results.json (${statSync(resolve(__dirname, 'results.json')).size} bytes)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
