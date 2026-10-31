import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportCanvas, exportFilename, resolveExport, stepFrames } from './export.js';

const canvas = { width: 320, height: 200, density: 2 };

describe('resolveExport', () => {
	it('defaults to the current density and PNG', () => {
		expect(resolveExport(canvas)).toMatchObject({
			scale: 2,
			width: 640,
			height: 400,
			type: 'image/png'
		});
	});

	it('scales by an explicit factor', () => {
		expect(resolveExport(canvas, { scale: 1 })).toMatchObject({ width: 320, height: 200 });
		expect(resolveExport(canvas, { scale: 4.5 })).toMatchObject({ width: 1440, height: 900 });
	});

	it('derives the scale from a width or height, keeping the aspect ratio', () => {
		expect(resolveExport(canvas, { width: 3200 })).toMatchObject({ scale: 10, height: 2000 });
		expect(resolveExport(canvas, { height: 1000 })).toMatchObject({ scale: 5, width: 1600 });
		expect(resolveExport(canvas, { width: 3200, height: 2000 })).toMatchObject({ scale: 10 });
	});

	it('rejects a width and height with a different aspect ratio', () => {
		expect(() => resolveExport(canvas, { width: 3200, height: 3200 })).toThrow(/aspect ratio/);
	});

	it('rejects scale together with a size, and bad numbers', () => {
		expect(() => resolveExport(canvas, { scale: 2, width: 100 })).toThrow(TypeError);
		expect(() => resolveExport(canvas, { scale: 0 })).toThrow(RangeError);
		expect(() => resolveExport(canvas, { width: -1 })).toThrow(RangeError);
		expect(() => resolveExport(canvas, { scale: Number.NaN })).toThrow(RangeError);
		expect(() => resolveExport(canvas, { quality: 2 })).toThrow(RangeError);
	});

	it('maps formats to MIME types and rejects unknown ones', () => {
		expect(resolveExport(canvas, { format: 'jpeg', quality: 0.8 })).toMatchObject({
			type: 'image/jpeg',
			quality: 0.8
		});
		expect(resolveExport(canvas, { format: 'webp' }).type).toBe('image/webp');
		expect(() => resolveExport(canvas, { format: 'gif' as 'png' })).toThrow(
			/unknown export format/
		);
	});
});

describe('exportFilename', () => {
	const date = new Date(2026, 9, 31, 9, 5, 7);

	it('stamps the date and time', () => {
		expect(exportFilename({}, date)).toBe('sketch-20261031-090507.png');
	});

	it('appends a sanitised seed and the format extension', () => {
		expect(exportFilename({ seed: 1234, format: 'jpeg' }, date)).toBe(
			'sketch-20261031-090507-1234.jpeg'
		);
		expect(exportFilename({ seed: 'a b/c' }, date)).toBe('sketch-20261031-090507-a_b_c.png');
	});
});

function fakeSketch(density = 2) {
	const log: string[] = [];
	const canvasEl = {
		width: 320 * density,
		height: 200 * density,
		toBlob: vi.fn((cb: (b: Blob | null) => void, type: string) => {
			log.push(`toBlob:${canvasEl.width}x${canvasEl.height}:${type}`);
			cb(new Blob(['x'], { type }));
		})
	};
	let d = density;
	const p = {
		width: 320,
		height: 200,
		frameCount: 10,
		deltaTime: 16,
		looping: true,
		_setupDone: true,
		drawingContext: { canvas: canvasEl },
		pixelDensity: vi.fn((v?: number) => {
			if (v === undefined) return d;
			d = v;
			canvasEl.width = Math.trunc(320 * v);
			canvasEl.height = Math.trunc(200 * v);
			log.push(`density:${v}`);
		}),
		redraw: vi.fn(() => {
			p.frameCount++;
			log.push(`redraw:${p.frameCount}:${p.deltaTime}`);
		}),
		isLooping: () => p.looping,
		loop: vi.fn(() => (p.looping = true)),
		noLoop: vi.fn(() => (p.looping = false))
	};
	return { p, log, canvasEl };
}

describe('exportCanvas', () => {
	it('snapshots without redrawing when the scale matches the density', async () => {
		const { p, log } = fakeSketch();
		const blob = await exportCanvas(p);
		expect(blob.type).toBe('image/png');
		expect(log).toEqual(['toBlob:640x400:image/png']);
	});

	it('renders at the requested scale, then restores density and frameCount', async () => {
		const { p, log, canvasEl } = fakeSketch();
		await exportCanvas(p, { width: 3508 });
		expect(log[0]).toMatch(/^density:10\.9625/);
		expect(log[2]).toBe('toBlob:3508x2192:image/png');
		expect(log.slice(3)).toEqual(['density:2', 'redraw:12:16']);
		expect(canvasEl.width).toBe(640);
		expect(p.frameCount).toBe(10);
	});

	it('restores the canvas when encoding setup throws', async () => {
		const { p, canvasEl } = fakeSketch();
		p.redraw.mockImplementationOnce(() => {
			throw new Error('draw failed');
		});
		await expect(exportCanvas(p, { scale: 4 })).rejects.toThrow('draw failed');
		expect(canvasEl.width).toBe(640);
	});

	it('refuses to run before setup has finished', async () => {
		const { p } = fakeSketch();
		p._setupDone = false;
		await expect(exportCanvas(p)).rejects.toThrow(/setup\(\) has finished/);
	});
});

describe('stepFrames', () => {
	beforeEach(() => vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0)));
	afterEach(() => vi.unstubAllGlobals());

	it('draws count frames with a fixed deltaTime and restores the loop', async () => {
		const { p, log } = fakeSketch();
		const seen: [number, number, number][] = [];
		await stepFrames(p, {
			count: 3,
			fps: 30,
			onFrame: (f) => {
				seen.push([f.index, f.frameCount, f.time]);
			}
		});
		expect(seen).toEqual([
			[0, 11, 0],
			[1, 12, 1000 / 30],
			[2, 13, 2000 / 30]
		]);
		expect(log).toEqual([
			'redraw:11:33.333333333333336',
			'redraw:12:33.333333333333336',
			'redraw:13:33.333333333333336'
		]);
		expect(p.looping).toBe(true);
	});

	it('steps at a scale and restores the density afterwards', async () => {
		const { p, canvasEl } = fakeSketch();
		const sizes: number[] = [];
		await stepFrames(p, { count: 2, scale: 3, onFrame: (f) => void sizes.push(f.canvas.width) });
		expect(sizes).toEqual([960, 960]);
		expect(canvasEl.width).toBe(640);
		expect(p.frameCount).toBe(12);
	});

	it('stops when the signal aborts', async () => {
		const { p } = fakeSketch();
		const controller = new AbortController();
		let n = 0;
		await stepFrames(p, {
			count: 10,
			signal: controller.signal,
			onFrame: () => {
				if (++n === 2) controller.abort();
			}
		});
		expect(n).toBe(2);
	});

	it('leaves a stopped sketch stopped', async () => {
		const { p } = fakeSketch();
		p.looping = false;
		await stepFrames(p, { count: 1, onFrame: () => {} });
		expect(p.loop).not.toHaveBeenCalled();
	});
});
