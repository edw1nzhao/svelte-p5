import { describe, it, expect } from 'vitest';
import { rect, circle, ellipse } from './hitTest.js';

describe('hitTest.rect', () => {
	it('returns true for points inside', () => {
		expect(rect(50, 50, 0, 0, 100, 100)).toBe(true);
		expect(rect(0, 0, 0, 0, 100, 100)).toBe(true); // corner
		expect(rect(100, 100, 0, 0, 100, 100)).toBe(true); // opposite corner
	});

	it('returns false for points outside', () => {
		expect(rect(-1, 50, 0, 0, 100, 100)).toBe(false);
		expect(rect(101, 50, 0, 0, 100, 100)).toBe(false);
		expect(rect(50, -1, 0, 0, 100, 100)).toBe(false);
		expect(rect(50, 101, 0, 0, 100, 100)).toBe(false);
	});
});

describe('hitTest.circle', () => {
	it('returns true for points inside', () => {
		expect(circle(0, 0, 0, 0, 10)).toBe(true); // dead center
		expect(circle(3, 3, 0, 0, 10)).toBe(true); // within radius 5
	});

	it('returns false on and outside the boundary', () => {
		expect(circle(5, 0, 0, 0, 10)).toBe(false); // exactly on the edge
		expect(circle(10, 0, 0, 0, 10)).toBe(false); // outside
		expect(circle(100, 100, 0, 0, 10)).toBe(false);
	});
});

describe('hitTest.ellipse', () => {
	it('returns true for points inside', () => {
		expect(ellipse(0, 0, 0, 0, 200, 100)).toBe(true); // center
		expect(ellipse(50, 0, 0, 0, 200, 100)).toBe(true); // inside x-axis
		expect(ellipse(0, 25, 0, 0, 200, 100)).toBe(true); // inside y-axis
	});

	it('returns false outside', () => {
		expect(ellipse(101, 0, 0, 0, 200, 100)).toBe(false);
		expect(ellipse(0, 51, 0, 0, 200, 100)).toBe(false);
		expect(ellipse(80, 40, 0, 0, 200, 100)).toBe(false); // outside normalized unit
	});
});
