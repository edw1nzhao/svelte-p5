import { describe, it, expect } from 'vitest';
import { createP5Bridge } from './createP5Bridge.svelte.js';

describe('createP5Bridge', () => {
	it('returns the initial state as a reactive proxy', () => {
		const bridge = createP5Bridge({ radius: 40, color: '#336699' });
		expect(bridge.state.radius).toBe(40);
		expect(bridge.state.color).toBe('#336699');
	});

	it('reflects mutations back through the same object', () => {
		const bridge = createP5Bridge({ count: 0 });
		bridge.state.count = 5;
		expect(bridge.state.count).toBe(5);

		bridge.state.count += 1;
		expect(bridge.state.count).toBe(6);
	});

	it('supports nested fields via a plain object', () => {
		const bridge = createP5Bridge({
			panels: { orbit: true, grid: false }
		});
		bridge.state.panels.orbit = false;
		bridge.state.panels.grid = true;
		expect(bridge.state.panels.orbit).toBe(false);
		expect(bridge.state.panels.grid).toBe(true);
	});

	it('keeps different bridge instances isolated', () => {
		const a = createP5Bridge({ x: 1 });
		const b = createP5Bridge({ x: 1 });
		a.state.x = 99;
		expect(a.state.x).toBe(99);
		expect(b.state.x).toBe(1);
	});
});
