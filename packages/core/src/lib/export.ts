import { drawable, redrawBlocked } from './internals.js';

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export interface ExportOptions {
	/** Output pixels per CSS pixel of the canvas. Default: the canvas's current pixel density. */
	scale?: number;
	/** Output width in pixels; sets `scale` to `width / instance.width`. */
	width?: number;
	/** Output height in pixels; must keep the canvas's aspect ratio when `width` is also set. */
	height?: number;
	format?: ExportFormat;
	quality?: number;
	filename?: string;
	/** Appended to the default download name. */
	seed?: string | number;
}

export interface SteppedFrame {
	index: number;
	frameCount: number;
	/** `index * 1000 / fps`, in ms. */
	time: number;
	canvas: HTMLCanvasElement;
	/** With `preserveDrawingBuffer: false`, call this before awaiting anything else. */
	toBlob(format?: ExportFormat, quality?: number): Promise<Blob>;
}

export interface StepFramesOptions {
	count: number;
	/** Sets `deltaTime` to `1000 / fps` before each frame. Default 60. */
	fps?: number;
	/** Output pixels per CSS pixel while stepping. */
	scale?: number;
	onFrame: (frame: SteppedFrame) => unknown;
	signal?: AbortSignal;
}

interface ExportHost {
	width: number;
	height: number;
	drawingContext: CanvasRenderingContext2D | WebGLRenderingContext;
	pixelDensity(): number;
	pixelDensity(value: number): unknown;
}

const host = (p: unknown) => p as ExportHost;
const MIME: Record<ExportFormat, string> = {
	png: 'image/png',
	jpeg: 'image/jpeg',
	webp: 'image/webp'
};

function positive(name: string, value: number | undefined) {
	if (value !== undefined && !(Number.isFinite(value) && value > 0)) {
		throw new RangeError(`svelte-p5: ${name} must be a positive number, got ${value}`);
	}
}

/** Resolves export options against a canvas size. Exported for tests. */
export function resolveExport(
	canvas: { width: number; height: number; density: number },
	options: ExportOptions = {}
): { scale: number; width: number; height: number; type: string; quality?: number } {
	const { scale, width, height, format = 'png', quality } = options;
	positive('scale', scale);
	positive('width', width);
	positive('height', height);
	if (scale !== undefined && (width !== undefined || height !== undefined)) {
		throw new TypeError('svelte-p5: pass either scale or width/height, not both');
	}
	if (!(format in MIME)) throw new TypeError(`svelte-p5: unknown export format "${format}"`);
	if (quality !== undefined && !(quality >= 0 && quality <= 1)) {
		throw new RangeError(`svelte-p5: quality must be between 0 and 1, got ${quality}`);
	}
	let s = scale ?? canvas.density;
	if (width !== undefined) s = width / canvas.width;
	else if (height !== undefined) s = height / canvas.height;
	const out = { width: Math.round(canvas.width * s), height: Math.round(canvas.height * s) };
	if (height !== undefined && width !== undefined && Math.abs(out.height - height) > 1) {
		throw new RangeError(
			`svelte-p5: ${width}x${height} does not match the canvas aspect ratio ` +
				`(${canvas.width}x${canvas.height}); resize the sketch to that aspect first`
		);
	}
	return { scale: s, ...out, type: MIME[format], quality };
}

function encode(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) =>
				blob
					? resolve(blob)
					: reject(new Error('svelte-p5: the browser could not encode the canvas (too large?)')),
			type,
			quality
		)
	);
}

function glLimit(ctx: ExportHost['drawingContext']): number | null {
	if (!('getParameter' in ctx)) return null;
	return ctx.getParameter(ctx.MAX_TEXTURE_SIZE) as number;
}

const preservesBuffer = (ctx: ExportHost['drawingContext']) =>
	!('getParameter' in ctx) || ctx.getContextAttributes()?.preserveDrawingBuffer !== false;

function assertDrawable(p: unknown, what: string) {
	if (redrawBlocked(p)) {
		throw new Error(
			`svelte-p5: ${what} needs a sketch whose setup() has finished, called outside draw()`
		);
	}
}

// Nudges density up so a product like 3507.9999 still truncates to the intended pixel size.
const densityFor = (scale: number) => scale * (1 + 1e-9);

/** Encodes the sketch at a scale or size, re-rendering via `pixelDensity` when it differs. */
export async function exportCanvas(instance: object, options: ExportOptions = {}): Promise<Blob> {
	assertDrawable(instance, 'exportCanvas');
	const p = host(instance);
	const d = drawable(instance);
	const ctx = p.drawingContext;
	const canvas = ctx.canvas as HTMLCanvasElement;
	const current = p.pixelDensity();
	const out = resolveExport({ width: p.width, height: p.height, density: current }, options);
	const limit = glLimit(ctx);
	if (limit !== null && Math.max(out.width, out.height) > limit) {
		throw new RangeError(
			`svelte-p5: ${out.width}x${out.height} exceeds this GPU's WEBGL limit of ${limit}px per side`
		);
	}
	if (out.scale === current && preservesBuffer(ctx)) return encode(canvas, out.type, out.quality);

	const frameCount = d.frameCount;
	let blob: Promise<Blob>;
	try {
		p.pixelDensity(densityFor(out.scale));
		await d.redraw();
		blob = encode(canvas, out.type, out.quality);
	} finally {
		p.pixelDensity(current);
		await d.redraw();
		d.frameCount = frameCount;
	}
	return blob;
}

/** Default download name: `sketch-YYYYMMDD-HHMMSS[-seed].ext`. */
export function exportFilename(
	options: Pick<ExportOptions, 'format' | 'seed'> = {},
	date = new Date()
): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	const stamp =
		`${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
		`${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
	const seed =
		options.seed === undefined ? '' : `-${String(options.seed).replace(/[^\w.-]+/g, '_')}`;
	return `sketch-${stamp}${seed}.${options.format ?? 'png'}`;
}

/** `exportCanvas`, then saves the image through a temporary download link. */
export async function downloadCanvas(instance: object, options: ExportOptions = {}): Promise<Blob> {
	const blob = await exportCanvas(instance, options);
	const ext = options.format ?? 'png';
	let name = options.filename ?? exportFilename(options);
	if (!/\.\w+$/.test(name)) name += `.${ext}`;
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	a.style.display = 'none';
	document.body.append(a);
	a.click();
	a.remove();
	// Revoking at once can cancel the download before the browser reads the blob.
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
	return blob;
}

/** Draws `count` frames one at a time with a fixed `deltaTime`; `millis()` is not simulated. */
export async function stepFrames(instance: object, options: StepFramesOptions): Promise<void> {
	assertDrawable(instance, 'stepFrames');
	const { count, fps = 60, scale, onFrame, signal } = options;
	if (!(Number.isInteger(count) && count >= 0)) {
		throw new RangeError(`svelte-p5: count must be a non-negative integer, got ${count}`);
	}
	positive('fps', fps);
	positive('scale', scale);
	const p = host(instance);
	const d = drawable(instance);
	const canvas = p.drawingContext.canvas as HTMLCanvasElement;
	const wasLooping = d.isLooping();
	const density = p.pixelDensity();
	d.noLoop();
	// p5 still runs the frame it already requested after noLoop(); let it pass first.
	if (wasLooping) await new Promise((resolve) => requestAnimationFrame(resolve));
	try {
		if (scale !== undefined && scale !== density) p.pixelDensity(densityFor(scale));
		for (let index = 0; index < count && !signal?.aborted; index++) {
			d.deltaTime = 1000 / fps;
			await d.redraw();
			await onFrame({
				index,
				frameCount: d.frameCount,
				time: (index * 1000) / fps,
				canvas,
				toBlob: (format = 'png', quality) => encode(canvas, MIME[format], quality)
			});
		}
	} finally {
		if (p.pixelDensity() !== density) {
			const frameCount = d.frameCount;
			p.pixelDensity(density);
			await d.redraw();
			d.frameCount = frameCount;
		}
		if (wasLooping) d.loop();
	}
}
