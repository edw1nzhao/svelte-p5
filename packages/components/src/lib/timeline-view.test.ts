import { describe, it, expect } from 'vitest';
import {
	clampView,
	isTimeInView,
	panView,
	timeToX,
	viewZoomLevel,
	xToTime,
	zoomView,
	zoomViewToRange
} from './timeline-view.js';

describe('clampView', () => {
	it('passes a valid view through unchanged', () => {
		expect(clampView({ start: 10, end: 30 }, 100)).toEqual({ start: 10, end: 30 });
	});

	it('clamps each edge into the timeline', () => {
		expect(clampView({ start: -5, end: 150 }, 100)).toEqual({ start: 0, end: 100 });
	});

	it('falls back to the full range for an empty or inverted view', () => {
		expect(clampView({ start: 40, end: 40 }, 100)).toEqual({ start: 0, end: 100 });
		expect(clampView({ start: 60, end: 20 }, 100)).toEqual({ start: 0, end: 100 });
		expect(clampView({ start: NaN, end: 20 }, 100)).toEqual({ start: 0, end: 100 });
	});
});

describe('zoomView', () => {
	it('keeps the zoom center at the same relative position', () => {
		const v = zoomView({ start: 0, end: 100 }, 0.5, 50, 100, 1);
		expect(v.start).toBeCloseTo(25);
		expect(v.end).toBeCloseTo(75);
	});

	it('clamps a zoom-out to the full timeline', () => {
		expect(zoomView({ start: 20, end: 80 }, 10, 50, 100, 1)).toEqual({ start: 0, end: 100 });
	});

	it('stops at the minimum duration', () => {
		const v = zoomView({ start: 40, end: 60 }, 0.001, 50, 100, 1);
		expect(v.end - v.start).toBeCloseTo(1);
		expect(v.start).toBeCloseTo(49.5);
	});

	it('preserves the center ratio near an edge while staying in bounds', () => {
		const v = zoomView({ start: 0, end: 100 }, 0.5, 5, 100, 1);
		expect(v.start).toBeCloseTo(2.5);
		expect(v.end).toBeCloseTo(52.5);
	});

	it('slides back inside the timeline instead of shrinking at an edge', () => {
		const v = zoomView({ start: 80, end: 100 }, 2, 100, 100, 1);
		expect(v).toEqual({ start: 60, end: 100 });
	});

	it('never enforces a minimum wider than the timeline', () => {
		expect(zoomView({ start: 0, end: 5 }, 0.1, 2, 5, 10)).toEqual({ start: 0, end: 5 });
	});

	it('returns the full range for a degenerate view', () => {
		expect(zoomView({ start: 5, end: 5 }, 0.5, 5, 100, 1)).toEqual({ start: 0, end: 100 });
	});
});

describe('panView', () => {
	it('shifts the window by delta preserving its width', () => {
		expect(panView({ start: 10, end: 30 }, 5, 100)).toEqual({ start: 15, end: 35 });
	});

	it('clamps at the start and end without shrinking', () => {
		expect(panView({ start: 10, end: 30 }, -20, 100)).toEqual({ start: 0, end: 20 });
		expect(panView({ start: 70, end: 90 }, 20, 100)).toEqual({ start: 80, end: 100 });
	});

	it('is a no-op on the full view', () => {
		expect(panView({ start: 0, end: 100 }, 25, 100)).toEqual({ start: 0, end: 100 });
	});
});

describe('zoomViewToRange', () => {
	it('zooms to the dragged range in either direction', () => {
		expect(zoomViewToRange(20, 40, 100, 1)).toEqual({ start: 20, end: 40 });
		expect(zoomViewToRange(40, 20, 100, 1)).toEqual({ start: 20, end: 40 });
	});

	it('grows a range narrower than the minimum around its midpoint', () => {
		expect(zoomViewToRange(50, 50.5, 100, 2)).toEqual({ start: 49.25, end: 51.25 });
	});

	it('keeps a grown range inside the timeline', () => {
		expect(zoomViewToRange(0, 0.2, 100, 2)).toEqual({ start: 0, end: 2 });
	});

	it('clamps a range that runs past the edges', () => {
		expect(zoomViewToRange(-10, 120, 100, 1)).toEqual({ start: 0, end: 100 });
	});
});

describe('timeToX / xToTime', () => {
	const view = { start: 20, end: 40 };

	it('maps the view onto the pixel span', () => {
		expect(timeToX(20, view, 0, 1000)).toBe(0);
		expect(timeToX(30, view, 0, 1000)).toBe(500);
		expect(timeToX(40, view, 0, 1000)).toBe(1000);
	});

	it('honours a non-zero left edge', () => {
		expect(timeToX(30, view, 100, 300)).toBe(200);
		expect(xToTime(200, view, 100, 300)).toBe(30);
	});

	it('extrapolates outside the view (no clamping)', () => {
		expect(timeToX(10, view, 0, 1000)).toBe(-500);
		expect(timeToX(50, view, 0, 1000)).toBe(1500);
	});

	it('round-trips time -> x -> time', () => {
		expect(xToTime(timeToX(37.3, view, 12, 840), view, 12, 840)).toBeCloseTo(37.3, 10);
	});

	it('returns the left edge for an empty view and the start for an empty span', () => {
		expect(timeToX(5, { start: 3, end: 3 }, 10, 20)).toBe(10);
		expect(xToTime(5, view, 7, 7)).toBe(20);
	});
});

describe('isTimeInView', () => {
	it('includes both edges', () => {
		expect(isTimeInView(20, { start: 20, end: 40 })).toBe(true);
		expect(isTimeInView(40, { start: 20, end: 40 })).toBe(true);
		expect(isTimeInView(41, { start: 20, end: 40 })).toBe(false);
	});
});

describe('viewZoomLevel', () => {
	it('is 1 on the full view and grows as the view narrows', () => {
		expect(viewZoomLevel({ start: 0, end: 100 }, 100)).toBe(1);
		expect(viewZoomLevel({ start: 25, end: 75 }, 100)).toBe(2);
		expect(viewZoomLevel({ start: 5, end: 5 }, 100)).toBe(1);
	});
});
