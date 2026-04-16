/**
 * Disable p5's Friendly Error System (FES) for production.
 *
 * FES validates arguments on every p5 API call (map, fill, stroke, text, etc.)
 * via deep parameter checking + Levenshtein-distance typo detection. For
 * sketches that make thousands of calls per frame, this adds 1-5% CPU overhead.
 *
 * Call this once, before instantiating any p5 sketch. The flag is read by
 * p5's FES bootstrap as a bare global (`typeof IS_MINIFIED`), which in a
 * browser means any property on `globalThis`/`window`.
 *
 * @see https://github.com/processing/p5.js/blob/main/src/core/friendly_errors/fes_core.js
 */
export function disableFES(): void {
	(globalThis as { IS_MINIFIED?: boolean }).IS_MINIFIED = true;
}
