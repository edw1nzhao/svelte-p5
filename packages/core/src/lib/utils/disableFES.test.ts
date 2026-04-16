import { describe, it, expect, beforeEach } from 'vitest';
import { disableFES } from './disableFES.js';

describe('disableFES', () => {
	beforeEach(() => {
		// Reset the flag between tests.
		delete (globalThis as { IS_MINIFIED?: boolean }).IS_MINIFIED;
	});

	it('sets window.IS_MINIFIED to true', () => {
		disableFES();
		expect((globalThis as { IS_MINIFIED?: boolean }).IS_MINIFIED).toBe(true);
	});

	it('is idempotent - calling twice is fine', () => {
		disableFES();
		disableFES();
		expect((globalThis as { IS_MINIFIED?: boolean }).IS_MINIFIED).toBe(true);
	});
});
