import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { HELP, parseCliArgs } from './args.js';
import { detectPackageManager, nextSteps } from './pm.js';
import { askTemplate, askText } from './prompt.js';
import { scaffold } from './scaffold.js';
import { DEFAULT_NAME, DEFAULT_TEMPLATE } from './templates.js';

/**
 * @param {string[]} argv
 * @param {{
 *   cwd?: string,
 *   env?: NodeJS.ProcessEnv,
 *   input?: NodeJS.ReadableStream,
 *   output?: NodeJS.WritableStream,
 *   interactive?: boolean
 * }} [ctx]
 * @returns {Promise<number>} exit code
 */
export async function run(argv, ctx = {}) {
	const cwd = ctx.cwd ?? process.cwd();
	const env = ctx.env ?? process.env;
	const input = ctx.input ?? process.stdin;
	const output = ctx.output ?? process.stdout;
	const interactive = ctx.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY);
	const io = { input, output };

	try {
		const opts = parseCliArgs(argv);
		if (opts.help) {
			output.write(HELP);
			return 0;
		}
		if (opts.version) {
			const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
			output.write(`${pkg.version}\n`);
			return 0;
		}

		const prompt = interactive && !opts.yes;
		const dir =
			opts.dir ?? (prompt ? await askText('Project name', DEFAULT_NAME, io) : DEFAULT_NAME);
		const template =
			opts.template ?? (prompt ? await askTemplate(DEFAULT_TEMPLATE, io) : DEFAULT_TEMPLATE);

		const { targetDir } = await scaffold({
			template,
			targetDir: resolve(cwd, dir),
			force: opts.force
		});

		const pm = detectPackageManager(env.npm_config_user_agent);
		const rel = relative(cwd, targetDir);
		const steps = nextSteps(pm, rel || null);
		output.write(`\nCreated ${rel || '.'} from the ${template} template.\n\nNext steps:\n`);
		for (const step of steps) output.write(`  ${step}\n`);
		return 0;
	} catch (err) {
		output.write(`${err instanceof Error ? err.message : String(err)}\n`);
		return 1;
	}
}
