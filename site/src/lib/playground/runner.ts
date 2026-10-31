import type p5 from 'p5';

export interface SketchError {
	kind: 'syntax' | 'runtime';
	message: string;
	line?: number;
}

export type SketchBody<B> = (p: p5, bridge: B) => void;

export type CompileResult<B> = { ok: true; fn: SketchBody<B> } | { ok: false; error: SketchError };

const SOURCE_URL = 'playground-sketch.js';
// V8 and SpiderMonkey wrap a Function body as `function anonymous(p,bridge\n) {\n`.
const HEADER_LINES = 2;

export const HANDLERS = [
	'setup',
	'draw',
	'windowResized',
	'mousePressed',
	'mouseReleased',
	'mouseClicked',
	'doubleClicked',
	'mouseMoved',
	'mouseDragged',
	'mouseWheel',
	'keyPressed',
	'keyReleased',
	'keyTyped',
	'touchStarted',
	'touchMoved',
	'touchEnded'
] as const;

function errorLine(err: unknown): number | undefined {
	const stack = err instanceof Error ? (err.stack ?? '') : '';
	const match = stack.match(new RegExp(`${SOURCE_URL.replace('.', '\\.')}:(\\d+):\\d+`));
	if (!match) return undefined;
	const line = Number(match[1]) - HEADER_LINES;
	return line > 0 ? line : undefined;
}

/** True when an uncaught error was thrown from code compiled by `compileSketch`. */
export function fromUserCode(err: unknown): boolean {
	return err instanceof Error && (err.stack ?? '').includes(SOURCE_URL);
}

export function toSketchError(err: unknown, kind: SketchError['kind'] = 'runtime'): SketchError {
	const message = err instanceof Error ? `${err.name}: ${err.message}` : `Uncaught: ${String(err)}`;
	return { kind, message, line: errorLine(err) };
}

export function compileSketch<B>(body: string): CompileResult<B> {
	try {
		const fn = new Function('p', 'bridge', `${body}\n//# sourceURL=${SOURCE_URL}`);
		return { ok: true, fn: fn as SketchBody<B> };
	} catch (err) {
		return { ok: false, error: toSketchError(err, 'syntax') };
	}
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
	return typeof (value as PromiseLike<unknown> | null)?.then === 'function';
}

/** Wraps a user sketch so errors from its body and p5 callbacks are reported and halt the loop. */
export function instrument<B>(
	fn: SketchBody<B>,
	bridge: B,
	report: (error: SketchError) => void
): (p: p5) => void {
	return (p) => {
		const fail = (err: unknown) => {
			report(toSketchError(err));
			try {
				p.noLoop();
			} catch {
				// The instance may be half-constructed; nothing left to stop.
			}
		};
		try {
			fn(p, bridge);
		} catch (err) {
			fail(err);
			return;
		}
		const host = p as unknown as Record<string, unknown>;
		for (const name of HANDLERS) {
			const handler = host[name];
			if (typeof handler !== 'function') continue;
			host[name] = function (this: unknown, ...args: unknown[]) {
				try {
					const result: unknown = handler.apply(this, args);
					return isThenable(result) ? Promise.resolve(result).catch(fail) : result;
				} catch (err) {
					fail(err);
				}
			};
		}
	};
}
