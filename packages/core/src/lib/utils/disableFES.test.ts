import { describe, it, expect, beforeEach } from 'vitest';
import { disableFES, fesDisableRequested } from './disableFES.js';

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

	it('records the request for P5Canvas to apply on p5 2', () => {
		expect(fesDisableRequested()).toBe(false);
		disableFES();
		expect(fesDisableRequested()).toBe(true);
	});
});
