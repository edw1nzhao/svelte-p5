import type p5 from 'p5';

export interface FontAtlasOptions {
	/** Font size in px. Default: 14 */
	fontSize?: number;
	/** Fill color (any CSS color string). Default: black */
	fill?: string;
	/** Padding around each glyph cell. Default: 4 */
	padding?: number;
}

export interface FontAtlas {
	/** The offscreen p5.Graphics buffer the strings are rendered into. */
	readonly buffer: p5.Graphics;
	/** Composite the pre-rendered string at (x, y). Returns false if the string wasn't in the atlas. */
	draw(str: string, x: number, y: number): boolean;
	/** Release the underlying buffer. Call in cleanup. */
	dispose(): void;
}

/**
 * Pre-render a fixed set of strings to an offscreen buffer **once**, then
 * composite them each frame with `p5.image()`. This bypasses the OpenType.js
 * path-rendering slow path that fires for every `p5.text()` call when you've
 * `loadFont()`'d an OTF/TTF file - typically a 10-100× speedup for text-heavy
 * sketches (word clouds, axis labels, small-multiples titles).
 *
 * Use for a fixed vocabulary (speaker names, category labels, axis ticks).
 * Don't use for per-frame dynamic text - that defeats the point.
 *
 * @see https://github.com/processing/p5.js/blob/main/src/core/p5.Renderer2D.js
 */
export function createFontAtlas(
	sk: p5,
	strings: readonly string[],
	options: FontAtlasOptions = {}
): FontAtlas {
	const { fontSize = 14, fill = '#000', padding = 4 } = options;

	sk.textSize(fontSize);
	const cellHeight = fontSize + padding * 2;

	const widths: number[] = [];
	let maxWidth = 0;
	for (const s of strings) {
		const w = sk.textWidth(s);
		widths.push(w);
		if (w > maxWidth) maxWidth = w;
	}

	const atlasWidth = Math.max(1, Math.ceil(maxWidth + padding * 2));
	const atlasHeight = Math.max(1, cellHeight * strings.length);
	const buffer = sk.createGraphics(atlasWidth, atlasHeight);
	buffer.clear();
	buffer.textSize(fontSize);
	buffer.fill(fill);
	buffer.noStroke();
	buffer.textAlign(sk.LEFT, sk.TOP);

	interface Cell {
		readonly y: number;
		readonly w: number;
		readonly h: number;
	}
	const positions = new Map<string, Cell>();

	strings.forEach((s, i) => {
		const y = i * cellHeight;
		const w = (widths[i] ?? 0) + padding * 2;
		buffer.text(s, padding, y + padding);
		positions.set(s, { y, w, h: cellHeight });
	});

	return {
		buffer,
		draw(str, x, y) {
			const cell = positions.get(str);
			if (!cell) return false;
			sk.image(buffer, x, y, cell.w, cell.h, 0, cell.y, cell.w, cell.h);
			return true;
		},
		dispose() {
			buffer.remove();
		}
	};
}
