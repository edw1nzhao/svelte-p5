import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './examples.js';

describe('playground examples', () => {
	it.each(EXAMPLES)('$label describes its canvas for screen readers', ({ code }) => {
		expect(code).toMatch(/\bp\.describe\(\s*(['"]).{10,}?\1\s*\)/);
	});
});
