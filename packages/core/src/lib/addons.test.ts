import { describe, expect, it, vi } from 'vitest';
import { registerAddons, type P5Addon } from './addons.js';

function fakeP5v2() {
	return { VERSION: '2.3.4', registerAddon: vi.fn() };
}

describe('registerAddons', () => {
	it('registers each add-on once per constructor, across calls', () => {
		const P = fakeP5v2();
		const a: P5Addon = () => {};
		const b: P5Addon = () => {};
		registerAddons(P, [a, b]);
		registerAddons(P, [a]);
		registerAddons(P, [b, a]);
		expect(P.registerAddon.mock.calls).toEqual([[a], [b]]);
	});

	it('tracks constructors separately', () => {
		const P1 = fakeP5v2();
		const P2 = fakeP5v2();
		const a: P5Addon = () => {};
		registerAddons(P1, [a]);
		registerAddons(P2, [a]);
		expect(P1.registerAddon).toHaveBeenCalledTimes(1);
		expect(P2.registerAddon).toHaveBeenCalledTimes(1);
	});

	it('throws a clear error on p5 1.x, which has no registerAddon', () => {
		expect(() => registerAddons({ VERSION: '1.11.13' }, [() => {}])).toThrow(
			/p5\.registerAddon, which p5 1\.11\.13 does not have/
		);
	});

	it('does nothing without add-ons, even on p5 1.x', () => {
		expect(() => registerAddons({ VERSION: '1.11.13' }, [])).not.toThrow();
		expect(() => registerAddons({ VERSION: '1.11.13' }, undefined)).not.toThrow();
	});
});
