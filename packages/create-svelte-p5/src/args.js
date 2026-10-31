import { parseArgs } from 'node:util';
import { TEMPLATES, isTemplate } from './templates.js';

export const HELP = `Usage: create-svelte-p5 [directory] [options]

Options:
  -t, --template <name>  ${TEMPLATES.map((t) => t.id).join(' | ')}
  -f, --force            scaffold into a directory that is not empty
  -y, --yes              accept defaults and never prompt
  -h, --help             show this help
  -v, --version          show the version
`;

/**
 * @typedef {object} CliOptions
 * @property {string | undefined} dir
 * @property {string | undefined} template
 * @property {boolean} force
 * @property {boolean} yes
 * @property {boolean} help
 * @property {boolean} version
 */

/**
 * @param {string[]} argv
 * @returns {CliOptions}
 */
export function parseCliArgs(argv) {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			template: { type: 'string', short: 't' },
			force: { type: 'boolean', short: 'f', default: false },
			yes: { type: 'boolean', short: 'y', default: false },
			help: { type: 'boolean', short: 'h', default: false },
			version: { type: 'boolean', short: 'v', default: false }
		}
	});

	if (positionals.length > 1) {
		throw new Error(`Expected at most one directory, got ${positionals.length}.`);
	}
	if (values.template !== undefined && !isTemplate(values.template)) {
		const names = TEMPLATES.map((t) => t.id).join(', ');
		throw new Error(`Unknown template "${values.template}". Choose one of: ${names}.`);
	}

	return {
		dir: positionals[0],
		template: values.template,
		force: values.force,
		yes: values.yes,
		help: values.help,
		version: values.version
	};
}
