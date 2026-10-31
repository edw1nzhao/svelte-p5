import { describe, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { compileSketch, instrument, type SketchError } from './runner.js';

function fakeP5() {
	return { noLoop: vi.fn() } as unknown as p5 & Record<string, () => unknown>;
}

describe('compileSketch', () => {
	it('reports syntax errors instead of throwing', () => {
		const result = compileSketch('p.draw = () => {');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.kind).toBe('syntax');
			expect(result.error.message).toMatch(/^SyntaxError/);
		}
	});
});

describe('instrument', () => {
	function run(body: string) {
		const compiled = compileSketch<{ state: { n: number } }>(body);
		if (!compiled.ok) throw new Error(compiled.error.message);
		const errors: SketchError[] = [];
		const p = fakeP5();
		instrument(compiled.fn, { state: { n: 3 } }, (e) => errors.push(e))(p);
		return { p, errors };
	}

	it('passes the bridge to the sketch body', () => {
		const { p } = run('p.draw = () => bridge.state.n * 2;');
		expect(p.draw!()).toBe(6);
	});

	it('reports a draw error with its line in the editor and stops the loop', () => {
		const { p, errors } = run('let a = 1;\n\np.draw = () => {\n  missing();\n};');
		p.draw!();
		expect(errors).toEqual([
			{ kind: 'runtime', message: 'ReferenceError: missing is not defined', line: 4 }
		]);
		expect(p.noLoop).toHaveBeenCalled();
	});

	it('reports errors thrown by the body itself', () => {
		const { errors } = run('throw new TypeError("boom");');
		expect(errors[0]).toMatchObject({ kind: 'runtime', message: 'TypeError: boom', line: 1 });
	});

	it('reports a rejected async setup', async () => {
		const { p, errors } = run('p.setup = async () => { throw new Error("late"); };');
		await p.setup!();
		expect(errors[0]?.message).toBe('Error: late');
	});
});
