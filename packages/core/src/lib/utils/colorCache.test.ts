import { describe, it, expect, vi } from 'vitest';
import { createColorCache } from './colorCache.js';

describe('createColorCache', () => {
	it('computes each key exactly once', () => {
		const cache = createColorCache<string>();
		const compute = vi.fn(() => 'hsl(200, 80%, 60%)');

		cache.get('alice', compute);
		cache.get('alice', compute);
		cache.get('alice', compute);

		expect(compute).toHaveBeenCalledTimes(1);
	});

	it('returns the cached value on repeat lookups', () => {
		const cache = createColorCache<string>();
		const first = cache.get('bob', () => '#ff0000');
		const second = cache.get('bob', () => 'never-run');

		expect(first).toBe('#ff0000');
		expect(second).toBe('#ff0000');
	});

	it('supports set and has', () => {
		const cache = createColorCache<string>();
		cache.set('carol', '#00ff00');

		expect(cache.has('carol')).toBe(true);
		expect(cache.has('dan')).toBe(false);
		expect(cache.get('carol', () => 'fallback')).toBe('#00ff00');
	});

	it('clears all entries', () => {
		const cache = createColorCache<string>();
		cache.set('a', '#111');
		cache.set('b', '#222');
		expect(cache.size).toBe(2);

		cache.clear();
		expect(cache.size).toBe(0);
		expect(cache.has('a')).toBe(false);
	});

	it('works with non-string keys', () => {
		const cache = createColorCache<number>();
		cache.set(1, '#f00');
		cache.set(2, '#0f0');
		expect(cache.get(1, () => 'fb')).toBe('#f00');
		expect(cache.get(2, () => 'fb')).toBe('#0f0');
	});
});
