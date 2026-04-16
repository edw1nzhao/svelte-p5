/**
 * Minimal hit-test helpers. These are tree-shakeable drop-ins for p5's
 * built-in equivalents, with stricter types and no validation overhead.
 */

/** Is (px, py) inside the axis-aligned rectangle at (x, y, w, h)? */
export const rect = (px: number, py: number, x: number, y: number, w: number, h: number): boolean =>
	px >= x && px <= x + w && py >= y && py <= y + h;

/** Is (px, py) inside the circle centered at (cx, cy) with diameter d? */
export const circle = (px: number, py: number, cx: number, cy: number, d: number): boolean =>
	Math.hypot(px - cx, py - cy) < d / 2;

/** Is (px, py) inside the axis-aligned ellipse at (cx, cy) with width w and height h? */
export const ellipse = (
	px: number,
	py: number,
	cx: number,
	cy: number,
	w: number,
	h: number
): boolean => {
	const dx = (px - cx) / (w / 2);
	const dy = (py - cy) / (h / 2);
	return dx * dx + dy * dy < 1;
};
