/** The visible slice of a timeline, in the same units as its `duration`. */
export interface TimelineView {
	start: number;
	end: number;
}

/** Clamp a view into `[0, duration]`; an empty or inverted view becomes the full range. */
export function clampView(view: TimelineView, duration: number): TimelineView {
	const max = Math.max(0, duration);
	const start = clamp(view.start, 0, max);
	const end = clamp(view.end, 0, max);
	if (!(end > start)) return { start: 0, end: max };
	return { start, end };
}

/** Scale the view by `factor` (< 1 zooms in) around `center`, at least `minDuration` wide. */
export function zoomView(
	view: TimelineView,
	factor: number,
	center: number,
	duration: number,
	minDuration: number
): TimelineView {
	const width = view.end - view.start;
	if (!(width > 0) || !(duration > 0)) return { start: 0, end: Math.max(0, duration) };
	const nextWidth = clamp(width * factor, Math.min(minDuration, duration), duration);
	const ratio = (center - view.start) / width;
	return place(center - nextWidth * ratio, nextWidth, duration);
}

/** Shift the view by `delta`, keeping its width and stopping at the timeline edges. */
export function panView(view: TimelineView, delta: number, duration: number): TimelineView {
	return place(view.start + delta, view.end - view.start, duration);
}

/** The view for a drag-to-zoom from `a` to `b`, grown to `minDuration` around its midpoint. */
export function zoomViewToRange(
	a: number,
	b: number,
	duration: number,
	minDuration: number
): TimelineView {
	const lo = clamp(Math.min(a, b), 0, duration);
	const hi = clamp(Math.max(a, b), 0, duration);
	const width = Math.min(duration, Math.max(hi - lo, minDuration));
	return place((lo + hi) / 2 - width / 2, width, duration);
}

/** Map a time to an x coordinate where `left`..`right` spans the view. Extrapolates outside it. */
export function timeToX(time: number, view: TimelineView, left: number, right: number): number {
	return mapRange(time, view.start, view.end, left, right);
}

/** Map an x coordinate back to a time. The inverse of `timeToX`. */
export function xToTime(x: number, view: TimelineView, left: number, right: number): number {
	return mapRange(x, left, right, view.start, view.end);
}

/** Whether `time` falls inside the view, edges included. */
export function isTimeInView(time: number, view: TimelineView): boolean {
	return time >= view.start && time <= view.end;
}

/** How far the view is zoomed in: 1 shows everything, 2 shows half. */
export function viewZoomLevel(view: TimelineView, duration: number): number {
	const width = view.end - view.start;
	return width > 0 ? duration / width : 1;
}

function place(start: number, width: number, duration: number): TimelineView {
	const s = clamp(start, 0, Math.max(0, duration - width));
	return { start: s, end: s + width };
}

function mapRange(v: number, inA: number, inB: number, outA: number, outB: number): number {
	if (inB === inA) return outA;
	return ((v - inA) / (inB - inA)) * (outB - outA) + outA;
}

function clamp(n: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, n));
}
