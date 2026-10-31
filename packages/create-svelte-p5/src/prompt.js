import { createInterface } from 'node:readline/promises';
import { TEMPLATES } from './templates.js';

/**
 * @param {string} question
 * @param {string} fallback
 * @param {{ input: NodeJS.ReadableStream, output: NodeJS.WritableStream }} io
 */
export async function askText(question, fallback, io) {
	const rl = createInterface(io);
	try {
		const answer = (await rl.question(`${question} (${fallback}) `)).trim();
		return answer || fallback;
	} finally {
		rl.close();
	}
}

/**
 * @param {string} fallback
 * @param {{ input: NodeJS.ReadableStream, output: NodeJS.WritableStream }} io
 */
export async function askTemplate(fallback, io) {
	const rl = createInterface(io);
	try {
		TEMPLATES.forEach((t, i) => io.output.write(`  ${i + 1}) ${t.label}: ${t.hint}\n`));
		for (;;) {
			const answer = (await rl.question(`Template (${fallback}) `)).trim();
			if (!answer) return fallback;
			const byIndex = TEMPLATES[Number(answer) - 1];
			const match = byIndex ?? TEMPLATES.find((t) => t.id === answer);
			if (match) return match.id;
			io.output.write(`Enter a number or one of: ${TEMPLATES.map((t) => t.id).join(', ')}\n`);
		}
	} finally {
		rl.close();
	}
}
